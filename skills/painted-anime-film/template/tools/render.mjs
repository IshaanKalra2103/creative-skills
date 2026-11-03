// usage: node tools/render.mjs <outdir> t1 t2 ... | --range a b step
import { createRequire } from 'module';
const puppeteer = createRequire(import.meta.url)('puppeteer-core');
import fs from 'fs'; import path from 'path';
const args = process.argv.slice(2);
const out = args.shift(); fs.mkdirSync(out, {recursive:true});
let times = [];
if (args[0] === '--range') { const a=+args[1], b=+args[2], s=+args[3]; for (let t=a; t<b-1e-9; t+=s) times.push(+t.toFixed(4)); }
else times = args.map(Number);
const file = 'file://' + path.resolve(process.env.PAGE || 'dev.html') + (process.env.QS || '');
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new',
  args: ['--use-angle=metal','--enable-gpu','--ignore-gpu-blocklist','--allow-file-access-from-files','--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1776, height: 960, deviceScaleFactor: 1 });
page.on('console', m => { const t=m.text(); if (!t.includes('GPU stall')) console.log('[page]', t); });
page.on('pageerror', e => console.log('[pageerror]', (e.stack || e.message).split('\n').slice(0, 4).join(' | ')));
const t0 = Date.now();
await page.goto(file);
await page.waitForFunction('window.__ready === true', { timeout: 300000 });
console.log('loaded in', ((Date.now()-t0)/1000).toFixed(1)+'s', 'total', await page.evaluate('window.__total'));
await page.evaluate(() => { document.getElementById('ui').style.display='none'; });
let i = 0;
for (const t of times) {
  await page.evaluate((t) => window.__seek(t), t);
  const data = await page.evaluate(() => document.getElementById('film').toDataURL('image/png'));
  fs.writeFileSync(path.join(out, `f_${String(i).padStart(4,'0')}_${t.toFixed(3)}.png`), Buffer.from(data.split(',')[1], 'base64'));
  i++;
}
console.log('rendered', times.length, 'in', ((Date.now()-t0)/1000).toFixed(1)+'s');
await browser.close();
