#!/usr/bin/env node
// Screenshot a film at points on its timeline in headless Chrome with the GPU on, tile them into one
// contact sheet, and print the page's console output. No npm deps: Node 22+, Chrome, ffmpeg.
//
//   node shot.mjs <film-dir> <out.png> [p ...]      p = 0..100 (opens index.html?p=N, an unsmoothed scroll there)
//     e.g.  node shot.mjs ./my-film /tmp/sheet.png 1 8 20 30 38 49 58 71 78 95
//
//   env: PAGE=index.html (may carry a ?query, e.g. index.html?parts)  SIZE=1440x900  DPR=1  WAIT=700 (ms per shot)
//        COLS=4  FPS=1 (measure frames/sec on the smooth-scroll page first)  CHROME=/path/to/chrome
import {spawn} from 'node:child_process';
import {mkdtempSync, writeFileSync, rmSync, existsSync, copyFileSync} from 'node:fs';
import {tmpdir, platform} from 'node:os';
import {join} from 'node:path';
import {serve} from './serve.mjs';

const [dir, out, ...points] = process.argv.slice(2);
if (!dir || !out) { console.error('usage: node shot.mjs <film-dir> <out.png> [p ...]'); process.exit(1); }
if (!points.length) points.push('1');
const [W, H] = (process.env.SIZE || '1440x900').split('x').map(Number);
const DPR = +(process.env.DPR || 1), WAIT = +(process.env.WAIT || 700), COLS = +(process.env.COLS || 4);
const PAGE = process.env.PAGE || 'index.html';

const server = await serve(dir, 0);
const base = `http://127.0.0.1:${server.address().port}/${PAGE}`;
const CHROME = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const tmp = mkdtempSync(join(tmpdir(), 'xray-shot-'));
const gpu = platform() === 'darwin' ? ['--use-angle=metal'] : ['--enable-unsafe-swiftshader'];
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${tmp}/profile`, '--hide-scrollbars',
  '--enable-gpu', '--ignore-gpu-blocklist', ...gpu, `--window-size=${W},${H}`, 'about:blank']);
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
    if (!/favicon|DevTools/.test(text)) log(`[page ${msg.params.type}] ${text}`);
  }
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error' && !/favicon/.test(msg.params.entry.url || '')) log(`[page net] ${msg.params.entry.text} ${msg.params.entry.url || ''}`);
});
const send = (method, params = {}) => new Promise((ok) => { const i = ++id; waiting.set(i, ok); ws.send(JSON.stringify({id: i, method, params})); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
  if (r?.exceptionDetails) log(`[eval error] ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
  return r?.result?.value;
};
const open = async (url) => {
  await send('Page.navigate', {url});
  const t0 = Date.now();
  await sleep(300);
  while (!(await evaluate('window.__ready === true'))) {
    if (Date.now() - t0 > 60000) { log('[shot] timed out waiting for window.__ready'); break; }
    await sleep(200);
  }
};

await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', {width: W, height: H, deviceScaleFactor: DPR, mobile: W < 600});

if (process.env.FPS) {
  await open(base);
  await sleep(800);
  log(`[shot] fps ${await evaluate('new Promise(r => { let n = 0; const t = performance.now(); (function f() { n++; performance.now() - t < 1000 ? requestAnimationFrame(f) : r(n); })(); })')}`);
}

const shots = [];
for (const p of points) {
  await open(`${base}${base.includes('?') ? '&' : '?'}p=${p}`);
  await sleep(WAIT);
  const {data} = await send('Page.captureScreenshot', {format: 'png'});
  const file = join(tmp, `${String(shots.length).padStart(3, '0')}.png`);
  writeFileSync(file, Buffer.from(data, 'base64'));
  shots.push(file);
}
ws.close(); server.close();
const exited = new Promise((ok) => chrome.on('exit', ok));
chrome.kill();
await Promise.race([exited, sleep(3000)]);

if (shots.length === 1) copyFileSync(shots[0], out);
else {
  const cols = Math.min(COLS, shots.length), rows = Math.ceil(shots.length / cols);
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-i', join(tmp, '%03d.png'), '-vf', `scale=${W > H ? 560 : 300}:-2,tile=${cols}x${rows}:padding=6:color=0x111111`, '-frames:v', '1', out]);
  await new Promise((ok) => ff.on('close', ok));
}
try { rmSync(tmp, {recursive: true, force: true, maxRetries: 5, retryDelay: 100}); } catch {}
console.log(out);
