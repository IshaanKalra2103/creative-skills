#!/usr/bin/env node
/**
 * Web Designer filmstrip: the signature moment as frames, so it can be judged
 * from a still (by you and by the critic).
 *
 *   node filmstrip.mjs site/index.html --selector ".deck"                       the load animation
 *   node filmstrip.mjs site/ --scroll-to "#how" --selector "#how"              a scroll-triggered entrance
 *   node filmstrip.mjs site/ --click ".assign" --selector ".board" --at 0,120,240,480,900
 *   node filmstrip.mjs site/ --hover ".project" --selector ".work"
 *
 *   --at 0,150,300,600,1200   moments in ms after the trigger (default)
 *   --width 1440 --height 900 viewport (390 for a phone strip)
 *   --live                    real-time capture, for JavaScript-driven motion
 *                             (requestAnimationFrame, canvas, timers). Default is
 *                             exact: CSS and Web Animations are paused and seeked.
 *   --out shots/film
 *
 * Writes one PNG per moment, the reduced-motion end state, and strip.png.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch } from "./lib/browser.mjs";
import { resolveTarget } from "./lib/target.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i > -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; };
const has = (n) => argv.includes(n);
const VALUED = ["--selector", "--scroll-to", "--click", "--hover", "--at", "--width", "--height", "--out"];
const input = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && VALUED.includes(argv[i - 1])));
if (!input) { console.error("usage: node filmstrip.mjs <file | folder | url> [--selector css] [--scroll-to css | --click css | --hover css] [--at 0,150,300] [--width 1440] [--live]"); process.exit(2); }

const AT = arg("--at", "0,150,300,600,1200").split(",").map(Number);
const W = +arg("--width", "1440"), H = +arg("--height", W <= 520 ? "844" : "900");
const SEL = arg("--selector"), SCROLL = arg("--scroll-to"), CLICK = arg("--click"), HOVER = arg("--hover");
const OUT = path.resolve(arg("--out", "shots/film"));
fs.mkdirSync(OUT, { recursive: true });

const target = await resolveTarget(input);
const { browser } = await launch("chromium");

async function open(reduced) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, reducedMotion: reduced ? "reduce" : "no-preference", isMobile: W <= 520, hasTouch: W <= 520 });
  const page = await ctx.newPage();
  await page.goto(target.url, { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => { try { await document.fonts.ready; } catch {} });
  return { ctx, page };
}
const shotOf = async (page, file) => {
  const el = SEL ? await page.$(SEL) : null;
  if (SEL && !el) throw new Error(`No element matches ${SEL}`);
  return el ? el.screenshot({ path: file, animations: "allow" }) : page.screenshot({ path: file, animations: "allow" });
};
const trigger = async (page) => {
  if (SCROLL) await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "center", behavior: "instant" }), SCROLL);
  else if (SEL) await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "center", behavior: "instant" }), SEL);
  if (CLICK) await page.click(CLICK);
  if (HOVER) await page.hover(HOVER);
};

const frames = [];
const { ctx, page } = await open(false);
const loadMode = !SCROLL && !CLICK && !HOVER;
if (!loadMode) { await page.waitForTimeout(400); await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch {} })); }
await trigger(page);
if (has("--live")) {
  const t0 = Date.now();
  for (const t of AT) {
    const wait = t - (Date.now() - t0); if (wait > 0) await page.waitForTimeout(wait);
    const f = path.join(OUT, `${String(t).padStart(5, "0")}ms.png`); await shotOf(page, f); frames.push([`${t} ms`, f]);
  }
} else {
  await page.waitForTimeout(loadMode ? 30 : 60);
  // Freeze every running animation where it is, then seek each moment exactly.
  const n = await page.evaluate((load) => {
    window.__wdFilm = document.getAnimations().map((a) => ({ a, c0: load ? 0 : (a.currentTime || 0) }));
    window.__wdFilm.forEach(({ a }) => a.pause());
    return window.__wdFilm.length;
  }, loadMode);
  if (!n) console.log("note: no CSS or Web Animations were running after the trigger. If the motion is JavaScript-driven, add --live.");
  for (const t of AT) {
    await page.evaluate((t) => window.__wdFilm.forEach(({ a, c0 }) => { try { a.currentTime = c0 + t; } catch {} }), t);
    await page.waitForTimeout(40);
    const f = path.join(OUT, `${String(t).padStart(5, "0")}ms.png`); await shotOf(page, f); frames.push([`${t} ms`, f]);
  }
}
await ctx.close();

// The same moment for someone who asked for reduced motion: it must be complete and calm.
const r = await open(true);
await trigger(r.page);
await r.page.waitForTimeout(Math.max(...AT) + 200);
const rf = path.join(OUT, "reduced-motion.png"); await shotOf(r.page, rf); frames.push(["reduced motion", rf]);
await r.ctx.close();

// A wide, short element (a banner, a board row) reads better stacked than in a row.
const firstSize = (() => { const b = fs.readFileSync(frames[0][1]); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; })();
const stack = firstSize.w / firstSize.h > 2.2;
const img = stack ? "width:1200px" : "height:320px";
const html = `<html><body style="margin:0"><div id="strip" style="display:inline-flex;flex-direction:${stack ? "column" : "row"};flex-wrap:nowrap;padding:24px;background:#d6d6d2;gap:16px;align-items:flex-start;font:500 13px system-ui,sans-serif;color:#333">${frames
  .map(([l, f]) => `<figure style="margin:0"><img src="${pathToFileURL(f).href}" style="${img};display:block;outline:1px solid rgba(0,0,0,.12)"><figcaption style="padding-top:8px">${l}</figcaption></figure>`).join("")}</div></body></html>`;
const sf = path.join(OUT, "_strip.html"); fs.writeFileSync(sf, html);
const sp = await browser.newPage({ viewport: { width: 12000, height: 600 } });
await sp.goto(pathToFileURL(sf).href);
await sp.evaluate(() => Promise.all([...document.images].map((i) => i.complete || new Promise((r) => (i.onload = r)))));
await (await sp.$("#strip")).screenshot({ path: path.join(OUT, "strip.png") });
fs.unlinkSync(sf);
console.log(`Filmstrip: ${frames.length} frames -> ${path.join(OUT, "strip.png")}`);
await browser.close();
await target.close();
