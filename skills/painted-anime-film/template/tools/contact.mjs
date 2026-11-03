// Contact sheet: render chosen frames and tile them into one labelled PNG (built in the page, no ffmpeg).
// usage:
//   node tools/contact.mjs out.png --shots [cols]        every shot at 10% / 50% / 90% (one row per shot)
//   node tools/contact.mjs out.png --shot <name> [n]     n frames spread through one shot
//   node tools/contact.mjs out.png --range a b n         n frames from a to b seconds
//   node tools/contact.mjs out.png t1 t2 ...             exact times
// env: PAGE (default dev.html), TILE (tile width px, default 592), RANDOM=n adds n random frames
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path';
const puppeteer = createRequire(import.meta.url)('puppeteer-core');
const args = process.argv.slice(2);
const out = path.resolve(args.shift());
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 1776, height: 960, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('[pageerror]', (e.stack || e.message).split('\n').slice(0, 4).join(' | ')));
page.on('console', m => { const t = m.text(); if (/error|warn/i.test(t)) console.log('[page]', t); });
const t0 = Date.now();
await page.goto('file://' + path.resolve(process.env.PAGE || 'dev.html'));
await page.waitForFunction('window.__ready === true', { timeout: 600000 });
const shots = await page.evaluate(() => { let a = 0; return SHOTS.map(s => { const r = { name: s.name, t0: a, dur: s.dur }; a += s.dur; return r; }); });
let times = [], cols = 4;
if (args[0] === '--shots') { cols = +(args[1] || 3); for (const s of shots) for (const u of cols === 3 ? [0.1, 0.5, 0.9] : Array.from({ length: cols }, (_, i) => (i + 0.5) / cols)) times.push(s.t0 + s.dur * u); }
else if (args[0] === '--shot') { const s = shots.find(x => x.name === args[1]); if (!s) throw new Error('no shot ' + args[1] + '; have ' + shots.map(x => x.name)); const n = +(args[2] || 8); for (let i = 0; i < n; i++) times.push(s.t0 + s.dur * (i + 0.5) / n); }
else if (args[0] === '--range') { const a = +args[1], b = +args[2], n = +args[3]; for (let i = 0; i < n; i++) times.push(a + (b - a) * i / Math.max(1, n - 1)); }
else times = args.map(Number);
const total = shots.reduce((a, s) => a + s.dur, 0);
for (let i = 0; i < +(process.env.RANDOM || 0); i++) times.push(Math.random() * total);
const TW = +(process.env.TILE || 592), TH = Math.round(TW * 960 / 1776);
const png = await page.evaluate(async (times, cols, TW, TH, shots) => {
  const rows = Math.ceil(times.length / cols), pad = 6, lab = 18;
  const c = document.createElement('canvas'); c.width = cols * (TW + pad) + pad; c.height = rows * (TH + pad + lab) + pad;
  const g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height);
  const film = document.getElementById('film');
  times.forEach((t, i) => {
    window.__seek(t);
    const x = pad + (i % cols) * (TW + pad), y = pad + Math.floor(i / cols) * (TH + pad + lab);
    g.drawImage(film, x, y + lab, TW, TH);
    const s = shots.filter(s => s.t0 <= t + 1e-6).pop();
    g.fillStyle = '#ddd'; g.font = '12px Menlo, monospace';
    g.fillText(`${s ? s.name : ''}  t=${t.toFixed(2)}  f=${Math.floor(t * 24 + 1e-6)}`, x + 2, y + 13);
  });
  return c.toDataURL('image/png').split(',')[1];
}, times, cols, TW, TH, shots);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(png, 'base64'));
console.log(`wrote ${out}: ${times.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
await browser.close();
