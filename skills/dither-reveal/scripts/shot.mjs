#!/usr/bin/env node
// Drive a dither-reveal page with real mouse events in headless Chrome (GPU on), screenshot each beat,
// tile them into one contact sheet, and print the page console + engine stats. No npm deps:
// Node 22+, Chrome, ffmpeg.
//
//   node shot.mjs <page-dir> <out.png>
//
// Beats: idle · sweeping (an S across the left of the image) · parked · tap · tap+0.4s · 2.5s after leaving.
//   env: SIZE=1280x820  DPR=1  COLS=3  PAGE=index.html  CHROME=/path/to/chrome
import {spawn} from 'node:child_process';
import {mkdtempSync, writeFileSync, rmSync, existsSync, copyFileSync} from 'node:fs';
import {tmpdir, platform} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const [dir, out] = process.argv.slice(2);
if (!dir || !out) { console.error('usage: node shot.mjs <page-dir> <out.png>'); process.exit(1); }
const [W, H] = (process.env.SIZE || '1280x820').split('x').map(Number);
const DPR = +(process.env.DPR || 1), COLS = +(process.env.COLS || 3);
const url = pathToFileURL(join(resolve(dir), process.env.PAGE || 'index.html')).href;
const CHROME = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const tmp = mkdtempSync(join(tmpdir(), 'dither-shot-'));
const gpu = platform() === 'darwin' ? ['--use-angle=metal'] : ['--enable-unsafe-swiftshader'];
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${tmp}/profile`, '--hide-scrollbars',
  '--enable-gpu', '--ignore-gpu-blocklist', '--allow-file-access-from-files', ...gpu, `--window-size=${W},${H}`, 'about:blank']);
const wsUrl = await new Promise((ok, fail) => {
  let buf = '';
  chrome.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) ok(m[1]); });
  setTimeout(() => fail(new Error('Chrome did not start')), 15000);
});
const port = new URL(wsUrl).port;
const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((ok) => ws.addEventListener('open', ok));
let id = 0; const waiting = new Map(); const seen = new Set();
const log = (line) => { if (!seen.has(line)) { seen.add(line); console.log(line); } };
ws.addEventListener('message', ({data}) => {
  const msg = JSON.parse(data);
  if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg.result || msg.error); waiting.delete(msg.id); }
  if (msg.method === 'Runtime.exceptionThrown') log(`[page error] ${msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text}`);
  if (msg.method === 'Runtime.consoleAPICalled') {
    const text = msg.params.args.map((a) => a.value ?? a.description).join(' ');
    if (!/GPU stall|DevTools/.test(text)) log(`[page ${msg.params.type}] ${text}`);
  }
});
const send = (method, params = {}) => new Promise((ok) => { const i = ++id; waiting.set(i, ok); ws.send(JSON.stringify({id: i, method, params})); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evaluate = async (expression) => (await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true}))?.result?.value;
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', {type, x, y, ...extra});

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {width: W, height: H, deviceScaleFactor: DPR, mobile: false});
await send('Page.navigate', {url});
for (let t = 0; !(await evaluate('window.__ready === true')); t += 200) {
  if (t > 30000) { log('[shot] timed out waiting for window.__ready'); break; }
  await sleep(200);
}
const shots = [];
const snap = async (label) => {
  const {data} = await send('Page.captureScreenshot', {format: 'png'});
  const file = join(tmp, `${String(shots.length).padStart(3, '0')}.png`);
  writeFileSync(file, Buffer.from(data, 'base64'));
  shots.push(file);
  log(`[shot] ${label.padEnd(10)} ${JSON.stringify(await evaluate('window.dither?.stats()'))}`);
};

// Standalone pages without the engine (examples/geode) get the middle of the viewport.
const r = (await evaluate('window.dither && ({...window.dither.rect})')) || {x: W * 0.2, y: H * 0.2, w: W * 0.6, h: H * 0.6};
await sleep(300);
await snap('idle');
const path = Array.from({length: 28}, (_, i) => [r.x + r.w * (0.1 + 0.3 * i / 27), r.y + r.h * (0.35 + 0.18 * Math.sin(i / 4.5))]);
for (const [x, y] of path) { await mouse('mouseMoved', x, y); await sleep(33); }
await snap('sweeping');
log(`[shot] fps ${await evaluate('new Promise(r => { let n = 0; const t = performance.now(); (function f() { n++; performance.now() - t < 1000 ? requestAnimationFrame(f) : r(n); })(); })')}`);
await snap('parked');
const [tx, ty] = path.at(-1);
await mouse('mousePressed', tx, ty, {button: 'left', clickCount: 1});
await mouse('mouseReleased', tx, ty, {button: 'left', clickCount: 1});
await sleep(100);
await snap('tap');
await sleep(400);
await snap('tap+0.5s');
await mouse('mouseMoved', W - 2, H - 2);
await sleep(2500);
await snap('healed');

ws.close();
const exited = new Promise((ok) => chrome.on('exit', ok));
chrome.kill();
await Promise.race([exited, sleep(3000)]);
const cols = Math.min(COLS, shots.length), rows = Math.ceil(shots.length / cols);
const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-i', join(tmp, '%03d.png'), '-vf', `scale=${Math.round(1680 / cols)}:-2,tile=${cols}x${rows}:padding=6:color=0x111111`, '-frames:v', '1', out]);
await new Promise((ok) => ff.on('close', ok));
if (!existsSync(out)) copyFileSync(shots[0], out);
try { rmSync(tmp, {recursive: true, force: true, maxRetries: 5, retryDelay: 100}); } catch {}
console.log(out);
