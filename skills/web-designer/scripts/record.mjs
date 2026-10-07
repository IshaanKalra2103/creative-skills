#!/usr/bin/env node
/**
 * Web Designer record: a short video loop of a page or a component in motion,
 * for the critic, for a portfolio, for a launch post.
 *
 *   node record.mjs piece.html                         8 s of the first screen at 1440 x 900
 *   node record.mjs piece.html --selector ".cards"     crop to one element
 *   node record.mjs site/ --seconds 6 --width 390      a phone loop
 *   node record.mjs site/ --hover ".card:nth-child(2)" --scroll 1200
 *
 *   --seconds 8          length (default 8)
 *   --width 1440 --height 900
 *   --hover <css>        move the pointer onto it halfway through (hover states, tilt)
 *   --move               sweep the pointer across the frame (pointer-reactive pieces)
 *   --scroll <px>        scroll down this far over the recording (scroll-driven pieces)
 *   --poster-at 800      ms to wait before the poster frame and the loop start
 *                        (longer for pieces that draw themselves in)
 *   --out shots/video
 *
 * Writes loop.webm, plus loop.mp4 and poster.jpg when ffmpeg is installed
 * (MP4 is what Safari and iPhone play best). Video needs Playwright's
 * recorder: if it is missing, run  node doctor.mjs --fix
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { launch } from "./lib/browser.mjs";
import { resolveTarget } from "./lib/target.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i > -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; };
const has = (n) => argv.includes(n);
const VALUED = ["--seconds", "--width", "--height", "--selector", "--hover", "--scroll", "--out", "--poster-at"];
const input = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && VALUED.includes(argv[i - 1])));
if (!input) { console.error("usage: node record.mjs <file | folder | url> [--seconds 8] [--selector css] [--hover css] [--move] [--scroll px]"); process.exit(2); }

const SECONDS = +arg("--seconds", "8"), W = +arg("--width", "1440"), H = +arg("--height", W <= 520 ? "844" : "900");
const OUT = path.resolve(arg("--out", "shots/video"));
fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(OUT, ".rec-"));

const target = await resolveTarget(input);
const { browser } = await launch("chromium");
// With ffmpeg: Chrome's own screencast frames at high JPEG quality, assembled
// straight to MP4 (Playwright's built-in recorder is low-bitrate VP8, which
// smears dark tinted grounds and fine dot work). Without ffmpeg: that recorder.
const ff = spawnSync(process.platform === "win32" ? "where" : "which", ["ffmpeg"], { encoding: "utf8" }).stdout.trim().split(/\r?\n/)[0];
let ctx;
try {
  ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: W <= 520, ...(ff ? {} : { recordVideo: { dir: tmp, size: { width: W, height: H } } }) });
} catch (e) {
  console.error("Video recording is not available: " + String(e.message).split("\n")[0] + "\nRun: node doctor.mjs --fix");
  process.exit(2);
}
const page = await ctx.newPage();
const frames = [];
let cdp = null;
const recStart = Date.now();
await page.goto(target.url, { waitUntil: "networkidle" }).catch(() => {});
await page.evaluate(async () => { try { await document.fonts.ready; } catch {} });
const sel = arg("--selector");
if (sel) await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "center", behavior: "instant" }), sel);
// Let canvas and WebGL draw, and draw-in animations finish (--poster-at ms).
await page.waitForTimeout(+arg("--poster-at", "800"));
// The poster is the resting composition: pointer away, nothing hovered.
await page.mouse.move(2, 2); // a corner: the centre of a two-column hero can trigger pointer handlers
await page.waitForTimeout(300);
const posterBuf = await (sel ? page.locator(sel).first().screenshot({ type: "jpeg", quality: 88 }) : page.screenshot({ type: "jpeg", quality: 88 }));
const sweepBox = sel ? await page.locator(sel).first().boundingBox() : null;
if (ff) {
  cdp = await ctx.newCDPSession(page);
  cdp.on("Page.screencastFrame", async (f) => { frames.push({ t: f.metadata.timestamp, data: f.data }); try { await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch {} });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 95, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
}
const videoStart = (Date.now() - recStart) / 1000; // seconds of load to trim off the front
const t0 = Date.now();
const steps = Math.max(1, Math.round(SECONDS * 10));
const scroll = +arg("--scroll", "0"), hover = arg("--hover"), move = has("--move");
for (let i = 0; i < steps; i++) {
  const f = i / steps;
  if (scroll) await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), Math.round(scroll * f));
  // There and back on a closed path over the piece (or the frame), so the
  // last frame meets the first.
  if (move) {
    const b = sweepBox || { x: 0, y: 0, width: W, height: H };
    await page.mouse.move(b.x + b.width * (0.5 + 0.42 * Math.sin(f * Math.PI * 2)), b.y + b.height * (0.5 + 0.3 * Math.sin(f * Math.PI * 4)));
  }
  if (hover && i === Math.floor(steps / 2)) await page.hover(hover).catch(() => {});
  await page.waitForTimeout(Math.max(0, (i + 1) * 100 - (Date.now() - t0)));
}
const box = sel ? await page.locator(sel).first().boundingBox() : null;
fs.writeFileSync(path.join(OUT, "poster.jpg"), posterBuf);
if (cdp) {
  await cdp.send("Page.stopScreencast").catch(() => {});
  await ctx.close();
  // Frames arrive when something changes; give each its real duration.
  const list = [];
  frames.forEach((f, i) => {
    const file = path.join(tmp, `f${String(i).padStart(5, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, "base64"));
    const next = frames[i + 1] ? frames[i + 1].t : frames[0].t + SECONDS;
    list.push(`file '${file.replace(/\\/g, "/")}'\nduration ${Math.max(0.001, next - f.t).toFixed(4)}`);
  });
  if (frames.length) list.push(`file '${path.join(tmp, `f${String(frames.length - 1).padStart(5, "0")}.jpg`).replace(/\\/g, "/")}'`);
  fs.writeFileSync(path.join(tmp, "list.txt"), list.join("\n"));
  const crop = box ? `crop=${Math.round(box.width) - (Math.round(box.width) % 2)}:${Math.round(box.height) - (Math.round(box.height) % 2)}:${Math.round(box.x)}:${Math.round(box.y)},` : "";
  spawnSync(ff, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(tmp, "list.txt"), "-t", String(SECONDS), "-vf", `${crop}fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "slow", "-movflags", "+faststart", "-an", path.join(OUT, "loop.mp4")], { stdio: "inherit" });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`Recorded ${SECONDS}s (${frames.length} frames) -> ${path.join(OUT, "loop.mp4")} + poster.jpg`);
  await browser.close(); await target.close(); process.exit(0);
}
const video = page.video();
await ctx.close();
const raw = await video.path();
const webm = path.join(OUT, "loop.webm");
fs.renameSync(raw, webm);
fs.rmSync(tmp, { recursive: true, force: true });

if (ff) {
  // Trim the first half second (the page settling), crop to the element if asked.
  const crop = box ? `,crop=${Math.round(box.width) - (Math.round(box.width) % 2)}:${Math.round(box.height) - (Math.round(box.height) % 2)}:${Math.round(box.x)}:${Math.round(box.y)}` : "";
  const vf = `fps=30${crop},scale=trunc(iw/2)*2:trunc(ih/2)*2`;
  // Exactly the recorded loop: page load trimmed off the front, cut to length.
  spawnSync(ff, ["-y", "-loglevel", "error", "-ss", videoStart.toFixed(2), "-t", String(SECONDS), "-i", webm, "-vf", vf, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22", "-movflags", "+faststart", "-an", path.join(OUT, "loop.mp4")], { stdio: "inherit" });
  console.log(`Recorded ${SECONDS}s -> ${path.join(OUT, "loop.mp4")} (+ loop.webm, poster.jpg)`);
} else {
  console.log(`Recorded ${SECONDS}s -> ${webm} + poster.jpg  (install ffmpeg for a trimmed loop.mp4)`);
}
await browser.close();
await target.close();
