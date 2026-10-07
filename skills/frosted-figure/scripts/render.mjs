#!/usr/bin/env node
// Render a person photo through the frosted-figure effect in headless Chrome. No npm deps
// (Node 22+, Chrome or Playwright's Chromium). The person cutout is MediaPipe's selfie segmenter
// running in the page; its runtime + model are downloaded once to ~/.cache/frosted-figure and
// served locally after that, so repeat runs work offline.
//
//   node render.mjs <photo> [out] [--palette green,pink,#7b5cff] [--size 1600]
//                   [--cutout auto|ml|key] [--mask] [--<frost option> <value> ...]
//
//   out        a .png path (one palette) or a prefix -> <prefix>-<palette>.png (default: next to
//              the photo, <photo>-frost)
//   --palette  comma list of names (green gold yellow pink blue) and/or #rrggbb colours
//   --size     long side of the output in px (default 1600)
//   --cutout   auto (default: ML, colour key if the model can't load) | ml | key (plain or
//              graded studio backdrop, no network)
//   --mask     also write <prefix>-mask.png, the cutout the effect used
//   any key of FROST_DEFAULTS in template/frost.js, e.g. --blurNear 0.008 --shadow 0.3
//
//   env: CHROME=/path/to/chrome
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const template = resolve(here, '../template');
const MP = '1.0.1';
const MP_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP}`;
const MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';

// ---------- args ----------
const pos = [], flags = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) { pos.push(a); continue; }
  const [k, inline] = a.slice(2).split('=');
  if (k === 'mask') { flags.mask = true; continue; }
  flags[k] = inline ?? argv[++i];
}
const [photo, outArg] = pos;
if (!photo || !existsSync(photo)) {
  console.error('usage: node render.mjs <photo> [out.png | out-prefix] [--palette green,pink,#7b5cff] [--size 1600] [--cutout auto|ml|key] [--mask] [--<option> value]');
  process.exit(1);
}
const palettes = (flags.palette || 'green').split(',').map(s => s.trim()).filter(Boolean);
const cutout = flags.cutout || 'auto';
const size = +(flags.size || 1600);
const opts = {};
for (const [k, v] of Object.entries(flags)) if (!['palette', 'cutout', 'size', 'mask'].includes(k)) opts[k] = isNaN(+v) ? v : +v;
const single = outArg?.endsWith('.png') && palettes.length === 1 && !flags.mask;
const prefix = outArg ? outArg.replace(/\.png$/, '') : join(dirname(photo), basename(photo, extname(photo)) + '-frost');
const fileFor = name => (single ? outArg : `${prefix}-${name.replace('#', '')}.png`);

// ---------- MediaPipe cache ----------
const cache = join(homedir(), '.cache', 'frosted-figure', `mp-${MP}`);
async function ensureMediaPipe() {
  const want = [
    ['vision_bundle.mjs', `${MP_CDN}/vision_bundle.mjs`, true],
    ['selfie_multiclass_256x256.tflite', MODEL, true],
    ...['vision_wasm_internal', 'vision_wasm_nosimd_internal', 'vision_wasm_module_internal'].flatMap(n =>
      ['.js', '.wasm'].map(ext => [`wasm/${n}${ext}`, `${MP_CDN}/wasm/${n}${ext}`, n === 'vision_wasm_internal'])),
  ];
  for (const [rel, url, required] of want) {
    const dest = join(cache, rel);
    if (existsSync(dest)) continue;
    mkdirSync(dirname(dest), { recursive: true });
    process.stdout.write(`[frost] fetching ${rel} … `);
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
      console.log('ok');
    } catch (e) {
      console.log(e.message);
      if (required) throw new Error(`could not fetch ${url}: ${e.message}`);
    }
  }
}
let mpLocal = false;
if (cutout !== 'key') {
  try { await ensureMediaPipe(); mpLocal = true; } catch (e) { console.warn(`[frost] ${e.message}; the page will try the CDN`); }
}

// ---------- static server: template at /, the photo at /input, MediaPipe at /mp ----------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm',
  '.tflite': 'application/octet-stream', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file;
  if (p === '/input') file = resolve(photo);
  else if (p.startsWith('/mp/')) file = join(cache, p.slice(4));
  else file = join(template, p === '/' ? 'index.html' : p);
  if (!file.startsWith(cache) && !file.startsWith(template) && file !== resolve(photo)) { res.writeHead(403).end(); return; }
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const port = server.address().port;

// ---------- Chrome over CDP ----------
const pw = join(homedir(), process.platform === 'darwin' ? 'Library/Caches/ms-playwright' : '.cache/ms-playwright');
const pwChromes = existsSync(pw) ? readdirSync(pw).sort().reverse().flatMap(d => [
  join(pw, d, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  join(pw, d, 'chrome-mac/Chromium.app/Contents/MacOS/Chromium'),
  join(pw, d, 'chrome-linux/chrome'),
  join(pw, d, 'chrome-headless-shell-mac-arm64/chrome-headless-shell'),
  join(pw, d, 'chrome-headless-shell-linux64/chrome-headless-shell'),
]) : [];
const CHROME = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', ...pwChromes].find(existsSync);
if (!CHROME) { console.error('[frost] no Chrome found; set CHROME=/path/to/chrome'); process.exit(1); }
const profile = mkdtempSync(join(tmpdir(), 'frost-'));
const chrome = spawn(CHROME, [...(CHROME.includes('headless-shell') ? [] : ['--headless=new']), '--remote-debugging-port=0',
  `--user-data-dir=${profile}`, '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', 'about:blank']);
process.on('exit', () => { try { chrome.kill('SIGKILL'); } catch {} try { rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch {} });

const wsUrl = await new Promise((ok, fail) => {
  let buf = '';
  chrome.stderr.on('data', d => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) ok(m[1]); });
  setTimeout(() => fail(new Error('Chrome did not start')), 20000);
});
const target = (await (await fetch(`http://127.0.0.1:${new URL(wsUrl).port}/json/list`)).json()).find(t => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(ok => ws.addEventListener('open', ok));
let id = 0;
const waiting = new Map();
ws.addEventListener('message', ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id); }
  if (msg.method === 'Runtime.consoleAPICalled' && ['warning', 'error'].includes(msg.params.type)) {
    const text = msg.params.args.map(a => a.value ?? a.description).join(' ');
    if (!/^[WI]\d{4} |^INFO: /.test(text)) console.log(`[page ${msg.params.type}] ${text}`); // MediaPipe's own glog lines
  }
  if (msg.method === 'Runtime.exceptionThrown') console.log(`[page error] ${msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text}`);
});
const send = (method, params = {}) => new Promise(ok => { const i = ++id; waiting.set(i, ok); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
  return r.result?.result?.value;
};

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html?driven=1${mpLocal ? '&mp=local' : ''}` });
for (let t = 0; !(await evaluate('window.__frostReady === true').catch(() => false)); t += 100) {
  if (t > 20000) throw new Error('page never became ready');
  await new Promise(r => setTimeout(r, 100));
}

const t0 = Date.now();
const info = await evaluate(`runFrost(${JSON.stringify({ src: '/input', size, cutout, palettes, mask: !!flags.mask, opts })})`);
mkdirSync(dirname(resolve(fileFor(info.names[0]))), { recursive: true });
for (const name of info.names) {
  const url = await evaluate(`window.__frostOut[${JSON.stringify(name)}]`);
  writeFileSync(fileFor(name), Buffer.from(url.split(',')[1], 'base64'));
  console.log(`${fileFor(name)}  (${info.width}x${info.height})`);
}
console.log(`[frost] cutout: ${info.cutout === 'ml' ? 'MediaPipe person segmentation' : 'backdrop colour key'} · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log(`[frost] resolved: ${Object.entries(info.used).map(([k, v]) => `--${k} ${v}`).join(' ')}`);
// close the browser before the profile is deleted (it keeps writing to it until it exits)
await Promise.race([new Promise(ok => chrome.once('exit', ok)), send('Browser.close'), new Promise(ok => setTimeout(ok, 3000))]);
await Promise.race([new Promise(ok => chrome.once('exit', ok)), new Promise(ok => setTimeout(ok, 3000))]);
server.close();
process.exit(0);
