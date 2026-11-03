// usage: node tools/eval.mjs "<js expression>"  (runs in dev.html after load)
import { createRequire } from 'module';
const puppeteer = createRequire(import.meta.url)('puppeteer-core'); import path from 'path';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal','--enable-gpu','--ignore-gpu-blocklist','--allow-file-access-from-files'] });
const page = await browser.newPage();
page.on('pageerror', e => console.log('[pageerror]', (e.stack || e.message).split('\n').slice(0, 4).join(' | ')));
await page.goto('file://' + path.resolve(process.env.PAGE || 'dev.html'));
await page.waitForFunction('window.__ready === true', { timeout: 300000 });
console.log(JSON.stringify(await page.evaluate(process.argv[2]), null, 0));
await browser.close();
