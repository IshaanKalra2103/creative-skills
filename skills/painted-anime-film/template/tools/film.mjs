// Render every frame of guardian.html and pipe it straight into ffmpeg (no PNGs on disk).
// usage: node tools/film.mjs <out.mp4> [fromSec] [toSec]
// Output is the silent picture master; tools/mux.sh adds the soundtrack.
import { createRequire } from 'module';
import { spawn } from 'child_process';
import path from 'path';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const out = path.resolve(process.argv[2] || 'render/picture.mp4');
const from = +(process.argv[3] ?? 0);
const page_ = 'file://' + path.resolve(process.env.PAGE || 'film.html');

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--allow-file-access-from-files'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1776, height: 960, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('[pageerror]', (e.stack || e.message).split('\n').slice(0, 4).join(' | ')));
const t0 = Date.now();
await page.goto(page_);
await page.waitForFunction('window.__ready === true', { timeout: 600000 });
const total = await page.evaluate('window.__total');
const fps = await page.evaluate('FPS');
const to = +(process.argv[4] ?? total);
const f0 = Math.round(from * fps), f1 = Math.round(to * fps);
console.log(`loaded in ${((Date.now() - t0) / 1000).toFixed(1)}s; total ${total}s; frames ${f0}..${f1 - 1} @ ${fps}`);

const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-tune', 'grain',
  '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));

const t1 = Date.now();
for (let f = f0; f < f1; f++) {
  const b64 = await page.evaluate((t) => { window.__seek(t); return document.getElementById('film').toDataURL('image/png').split(',')[1]; }, f / fps);
  if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
  if ((f - f0) % 120 === 0) console.log(`frame ${f}/${f1} ${((Date.now() - t1) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await done;
await browser.close();
console.log(`wrote ${out} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
