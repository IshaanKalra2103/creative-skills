#!/usr/bin/env node
// Screenshot a sketchbook-portfolio page at several scroll positions (and optionally each nav hover),
// tile the frames into one contact sheet and print any console errors. No npm deps: Node 22+, Chrome, ffmpeg.
//
//   node shot.mjs <index.html> <out.png> [scrollY...]      default: 0 450 900 1350 1800 2300 2800 3300 3800 4300
//   node shot.mjs <index.html> <out.png> --nav             hover each nav link (frames of the top of the page)
//   WIDTH=390 HEIGHT=844 node shot.mjs ...                 phone size (the static layout, no 3D)
//   CLIP=420,20,600,240 node shot.mjs ... --nav             capture only that viewport rect, at full size
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [file, out, ...rest] = process.argv.slice(2);
if (!file || !out) { console.error("usage: node shot.mjs <index.html> <out.png> [scrollY... | --nav]"); process.exit(1); }
const W = +(process.env.WIDTH || 1440), H = +(process.env.HEIGHT || 900);
const navMode = rest.includes("--nav");
const CLIP = process.env.CLIP?.split(",").map(Number);
const ys = rest.filter((a) => a !== "--nav").map(Number);
if (!ys.length && !navMode) ys.push(0, 450, 900, 1350, 1800, 2300, 2800, 3300, 3800, 4300);

const CHROME = process.env.CHROME || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync);
const tmp = mkdtempSync(join(tmpdir(), "sketchbook-shot-"));
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${tmp}/profile`, "--hide-scrollbars", `--window-size=${W},${H}`, "about:blank"]);
const wsUrl = await new Promise((ok, fail) => {
  let buf = "";
  chrome.stderr.on("data", (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) ok(m[1]); });
  setTimeout(() => fail(new Error("Chrome did not start")), 15000);
});
const port = new URL(wsUrl).port;
const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((ok) => ws.addEventListener("open", ok));
let id = 0; const waiting = new Map(); const errors = [];
ws.addEventListener("message", ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg.result); waiting.delete(msg.id); }
  if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
  if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") errors.push(msg.params.args.map((a) => a.value ?? a.description).join(" "));
});
const send = (method, params = {}) => new Promise((ok) => { const i = ++id; waiting.set(i, ok); ws.send(JSON.stringify({ id: i, method, params })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.value;

await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: W < 800 });
const url = pathToFileURL(resolve(file)).href + "?y=0"; // screenshot mode: no smooth scroll, reveals on
await send("Page.navigate", { url });
await sleep(1500);
await evaluate("document.fonts.ready.then(() => new Promise(r => setTimeout(r, 600)))");

const frames = [];
const snap = async () => {
  const clip = CLIP && { x: CLIP[0], y: CLIP[1], width: CLIP[2], height: CLIP[3], scale: 1 };
  const { data } = await send("Page.captureScreenshot", { format: "png", ...(clip && { clip }) });
  const p = join(tmp, `${String(frames.length).padStart(3, "0")}.png`);
  writeFileSync(p, Buffer.from(data, "base64"));
  frames.push(p);
};
for (const y of ys) {
  await evaluate(`scrollTo(0, ${y}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
  await sleep(350);
  await snap();
}
if (navMode) {
  await evaluate("scrollTo(0, 0)");
  const links = await evaluate("[...document.querySelectorAll('.nav__link')].map(a => { const r = a.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })");
  for (const [x, y] of links) {
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await sleep(900);
    await snap();
  }
}
ws.close(); chrome.kill();

const cols = 2, rows = Math.ceil(frames.length / cols);
await new Promise((ok, fail) => {
  const ff = spawn("ffmpeg", ["-loglevel", "error", "-y", "-i", join(tmp, "%03d.png"), "-vf", `${CLIP ? "" : "scale=iw/2:-1,"}tile=${cols}x${rows}:padding=8:color=white`, out], { stdio: "inherit" });
  ff.on("exit", (c) => (c === 0 ? ok() : fail(new Error("ffmpeg failed"))));
});
rmSync(tmp, { recursive: true, force: true });
console.log(out);
if (errors.length) { console.log("console errors:"); errors.forEach((e) => console.log("  " + e)); process.exitCode = 1; }
else console.log("no console errors");
