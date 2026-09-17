// Render a hand-drawn canvas film to PNG frames, an mp4 and a contact sheet.
//
// The HTML file must expose window.__drawFrame(i) and window.__NDRAW and accept
// ?bare=1 (UI hidden). Every film built on assets/core.js does.
//
// Usage:
//   node render.mjs film.html                 all drawn frames -> mp4 + contact sheet, and <film>-final.mp4 with the score if the film has one
//   node render.mjs film.html --grid 24       a sheet of 24 evenly spaced frames, nothing else (look at this first)
//   node render.mjs film.html --only 0,24,47  just these frames, PNG only (spot check)
//   node render.mjs film.html --ar 9:16 --width 1080   format and output width (default 1:1, short side 1080)
//   node render.mjs film.html --out renders   output dir (default: <html dir>/out)
// Frames come from the page's own canvas (toDataURL), not from a screenshot, so CSS and DPR never matter.
//
// Env: CHROME=/path/to/chrome (default: macOS Google Chrome, then chrome/chromium on PATH)
// Needs: puppeteer-core next to this script (npm i), ffmpeg on PATH for the full render.
import puppeteer from 'puppeteer-core';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const argv = process.argv.slice(2);
const file = argv.find(a => a.endsWith('.html'));
if (!file) { console.error('usage: node render.mjs film.html [--only 0,12,24] [--out dir]'); process.exit(2); }
const flag = name => { const k = argv.indexOf(name); return k >= 0 ? argv[k + 1] : undefined; };
const only = flag('--only')?.split(',').map(Number).filter(Number.isFinite);
const grid = flag('--grid') ? +flag('--grid') || 24 : 0;
const ar = flag('--ar') || '1:1', width = flag('--width') ? +flag('--width') : 0;
const name = path.basename(file, '.html');
const outDir = path.resolve(flag('--out') || path.join(path.dirname(file), 'out'));
const frames = path.join(outDir, `${name}-frames`);
mkdirSync(frames, {recursive: true});

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const mac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (existsSync(mac)) return mac;
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try { return execFileSync('which', [bin]).toString().trim(); } catch {}
  }
  throw new Error('No Chrome found. Set CHROME=/path/to/chrome');
}

const url = pathToFileURL(path.resolve(file)).href + `?bare=1&frame=0&ar=${encodeURIComponent(ar)}` + (width ? `&w=${width}` : '');
const browser = await puppeteer.launch({executablePath: findChrome(), headless: true});
const save = (file, dataUrl) => writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
const errors = [];
let total = 0, wavFile = null;
try {
  const page = await browser.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, {waitUntil: 'load'});
  await page.waitForFunction('window.__ready === true', {timeout: 120000});
  const N = await page.evaluate(() => window.__NDRAW), size = await page.evaluate(() => window.__size);
  if (!Number.isInteger(N) || N <= 0) throw new Error('window.__NDRAW missing: the page did not load or is not built on film-template.html');
  total = N; console.log(`${name}: ${N} drawn frames, logical ${size.W}x${size.H}, output ${size.w}x${size.h}`);
  if (grid) { const sheet = path.join(outDir, `${name}-grid.jpg`); save(sheet, await page.evaluate(n => window.__grid(n, 240), grid)); console.log(`grid: ${sheet}`); }
  const list = grid ? [] : only ? only.filter(i => i >= 0 && i < N) : [...Array(N).keys()];
  const t0 = Date.now();
  let done = 0;
  for (const [k, i] of list.entries()) {
    try {
      save(path.join(frames, `${String(i).padStart(4, '0')}.png`), await page.evaluate(i => window.__frame(i), i));
    } catch (e) {
      errors.push(`drawn frame ${i} (t=${(i / 12).toFixed(2)} s): ${String(e.message || e).split('\n')[0]}`);
      continue;
    }
    done++;
    process.stdout.write(`\rframe ${k + 1}/${list.length}`);
  }
  if (!only && !grid && !errors.length) { const b64 = await page.evaluate(() => window.__wav ? window.__wav() : null); if (b64) { wavFile = path.join(outDir, `${name}-score.wav`); writeFileSync(wavFile, Buffer.from(b64, 'base64')); } }   // the score, rendered offline by the page
  if (list.length) console.log(`\nrendered ${done} of ${list.length} requested (${N} drawn frames in the film) in ${((Date.now() - t0) / 1000).toFixed(1)} s -> ${frames}`);
} finally {
  await browser.close();
}
if (errors.length) {
  console.error('page errors (no mp4 built):\n  ' + [...new Set(errors)].join('\n  '));
  process.exit(1);
}
if (only || grid) process.exit();

const ff = args => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], {stdio: 'inherit'});
const mp4 = path.join(outDir, `${name}.mp4`), sheet = path.join(outDir, `${name}-contact.jpg`);
// drawn at 12 fps, duplicated to 24 fps: the "on twos" cadence
ff(['-framerate', '12', '-i', path.join(frames, '%04d.png'), '-r', '24', '-pix_fmt', 'yuv420p', '-crf', '18', mp4]);
// two tiles per second of film (every 6th drawn frame = every 12th output frame), 6 across
const rows = Math.ceil(total / 6 / 6);
ff(['-i', mp4, '-vf', `select=not(mod(n\\,12)),scale=240:-1,tile=6x${rows}`, '-frames:v', '1', sheet]);
console.log(`mp4: ${mp4}\ncontact sheet: ${sheet}`);
if (wavFile) { const fin = path.join(outDir, `${name}-final.mp4`); ff(['-i', mp4, '-i', wavFile, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', fin]); console.log(`with sound: ${fin}`); }
