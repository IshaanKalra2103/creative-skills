#!/usr/bin/env node
// Screenshot a painting in headless Chrome with the GPU on, run JS between frames,
// tile the frames into one contact sheet, and print the page's console output. No npm deps: Node 22+, Chrome, ffmpeg.
//
//   node shot.mjs <painting-dir> <out.png> [frameJS ...]
//     each frameJS runs in the page before its capture ('' = just capture). Return values are printed.
//     e.g.  node shot.mjs ./my-painting /tmp/s.png '' 'scene.focus(1)' 'scene.focus(0); scene.glitch()'
//
//   env: PAGE=index.html (may carry a ?query)  SIZE=900x1300  DPR=1  WAIT=450 (ms after each frameJS)
//        FULL=1 (whole viewport, not just the canvas)  COLS=3  FPS=1 (print frames/sec)  CHROME=/path/to/chrome
import {spawn} from 'node:child_process';
import {mkdtempSync, writeFileSync, rmSync, existsSync, copyFileSync} from 'node:fs';
import {tmpdir, platform} from 'node:os';
import {join} from 'node:path';
import {serve} from './serve.mjs';

const [dir, out, ...frames] = process.argv.slice(2);
if (!dir || !out) { console.error('usage: node shot.mjs <painting-dir> <out.png> [frameJS ...]'); process.exit(1); }
if (!frames.length) frames.push('');
const [W, H] = (process.env.SIZE || '900x1300').split('x').map(Number);
const DPR = +(process.env.DPR || 1), WAIT = +(process.env.WAIT || 450), COLS = +(process.env.COLS || 3);

const server = await serve(dir, 0);
const url = `http://127.0.0.1:${server.address().port}/${process.env.PAGE || 'index.html'}`;
const CHROME = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const tmp = mkdtempSync(join(tmpdir(), 'sv-shot-'));
const gpu = platform() === 'darwin' ? ['--use-angle=metal'] : ['--enable-unsafe-swiftshader'];
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${tmp}/profile`, '--hide-scrollbars',
  '--enable-gpu', '--ignore-gpu-blocklist', ...gpu, '--autoplay-policy=no-user-gesture-required', `--window-size=${W},${H}`, 'about:blank']);
const wsUrl = await new Promise((ok, fail) => {
  let buf = '';
  chrome.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) ok(m[1]); });
  setTimeout(() => fail(new Error('Chrome did not start')), 15000);
});
const port = new URL(wsUrl).port;
const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((ok) => ws.addEventListener('open', ok));
let id = 0; const waiting = new Map();
ws.addEventListener('message', ({data}) => {
  const msg = JSON.parse(data);
  if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg.result || msg.error); waiting.delete(msg.id); }
  if (msg.method === 'Runtime.exceptionThrown') console.log('[page error]', msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
  if (msg.method === 'Runtime.consoleAPICalled') {
    const text = msg.params.args.map((a) => a.value ?? a.description).join(' ');
    if (!/favicon|DevTools/.test(text)) console.log(`[page ${msg.params.type}]`, text);
  }
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error' && !/favicon/.test(msg.params.entry.url || '')) console.log('[page net]', msg.params.entry.text, msg.params.entry.url || '');
});
const send = (method, params = {}) => new Promise((ok) => { const i = ++id; waiting.set(i, ok); ws.send(JSON.stringify({id: i, method, params})); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
  if (r?.exceptionDetails) console.log('[eval error]', r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r?.result?.value;
};

await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', {width: W, height: H, deviceScaleFactor: DPR, mobile: W < 600});
await send('Page.navigate', {url});
const t0 = Date.now();
while (!(await evaluate('window.__ready === true'))) {
  if (Date.now() - t0 > 60000) { console.log('[shot] timed out waiting for window.__ready'); break; }
  await sleep(200);
}
await sleep(700);
if (process.env.FPS) console.log('[shot] fps', await evaluate('new Promise(r => { let n = 0; const t = performance.now(); (function f() { n++; performance.now() - t < 1000 ? requestAnimationFrame(f) : r(n); })(); })'));

const shots = [];
for (const js of frames) {
  if (js) {
    const v = await evaluate(js);
    if (v !== undefined) console.log(`[frame ${shots.length}]`, typeof v === 'string' ? v : JSON.stringify(v));
    await sleep(WAIT);
  }
  let clip;
  if (!process.env.FULL) {
    const r = await evaluate('(() => { const e = document.querySelector("#cover") || document.querySelector("canvas"); if (!e) return null; const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; })()');
    if (r) clip = {x: r[0], y: r[1], width: r[2], height: r[3], scale: 1};
  }
  const {data} = await send('Page.captureScreenshot', {format: 'png', ...(clip && {clip})});
  const p = join(tmp, `${String(shots.length).padStart(3, '0')}.png`);
  writeFileSync(p, Buffer.from(data, 'base64'));
  shots.push(p);
}
ws.close(); server.close();
const exited = new Promise((ok) => chrome.on('exit', ok));
chrome.kill();
await Promise.race([exited, sleep(3000)]);

if (shots.length === 1) copyFileSync(shots[0], out);
else {
  const cols = Math.min(COLS, shots.length), rows = Math.ceil(shots.length / cols);
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-i', join(tmp, '%03d.png'), '-vf', `scale=560:-2,tile=${cols}x${rows}:padding=8:color=0x16121b`, '-frames:v', '1', out]);
  await new Promise((ok) => ff.on('close', ok));
}
try { rmSync(tmp, {recursive: true, force: true, maxRetries: 5, retryDelay: 100}); } catch {}
console.log(out);
