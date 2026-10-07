#!/usr/bin/env node
/**
 * Web Designer shoot: render a page at several widths, tile a contact sheet,
 * and run the slop scan on the rendered DOM at every width.
 *
 *   node shoot.mjs site/index.html                 a file (served over http from its folder)
 *   node shoot.mjs site/                           a folder with an index.html
 *   node shoot.mjs http://localhost:3000/pricing   a dev server or a live URL
 *
 *   --out shots/r1           output folder (default ./shots next to a file, ./shots otherwise)
 *   --widths 390,768,1440    viewport widths (default 390,768,1280,1440)
 *   --height 900             desktop viewport height (phones use 844, tablets 1024)
 *   --dark                   prefers-color-scheme: dark
 *   --app                    web-app thresholds (dense UI, no hero rules)
 *   --full                   full pages at every width (default: at 390 and the widest), each also
 *                            sliced into numbered screens (390-full-01.png ...) that a viewer can read
 *   --scale 2                device pixel ratio (default 2)
 *   --wait 500               extra ms after load (charts, maps)
 *   --no-scan                screenshots only
 *
 * Exit code 1 if the scan finds any FAIL. Warnings never fail the run.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch, SKILL } from "./lib/browser.mjs";
import { resolveTarget, settle } from "./lib/target.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i > -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; };
const has = (n) => argv.includes(n);
const input = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--") && !["--dark", "--app", "--full", "--no-scan"].includes(argv[i - 1])));
if (!input) { console.error("usage: node shoot.mjs <file.html | folder | url> [--out dir] [--widths 390,768,1280,1440] [--height 900] [--scale 2] [--full] [--dark] [--app] [--wait ms] [--no-scan]"); process.exit(2); }

const WIDTHS = arg("--widths", "390,768,1280,1440").split(",").map(Number).filter(Boolean);
const SCALE = parseFloat(arg("--scale", "2"));
const DESK_H = parseInt(arg("--height", "900"));
const WAIT = parseInt(arg("--wait", "0"));
const APP = has("--app"), DARK = has("--dark"), FULL = has("--full");
const isUrl = /^https?:/i.test(input);
const OUT = path.resolve(arg("--out", isUrl ? "shots" : path.join(fs.statSync(path.resolve(input)).isDirectory() ? input : path.dirname(input), "shots")));
fs.mkdirSync(OUT, { recursive: true });
const INPAGE = fs.readFileSync(path.join(SKILL, "scripts", "lib", "inpage.js"), "utf8");
// An explicit --height wins at every width (an icon at 512 x 512, a card at 1200 x 630).
const heightFor = (w) => (argv.includes("--height") ? DESK_H : w <= 520 ? 844 : w <= 1024 ? 1024 : DESK_H);

const target = await resolveTarget(input);
const { browser, label } = await launch("chromium");
const results = [], shots = [], errors = new Set();

for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: heightFor(w) }, deviceScaleFactor: SCALE, colorScheme: DARK ? "dark" : "light", isMobile: w <= 520, hasTouch: w <= 520 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.add("page error: " + e.message.split("\n")[0]));
  // "Failed to load resource" is already reported, with its URL, by the response handler.
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.add("console: " + m.text().slice(0, 160)); });
  page.on("requestfailed", (r) => { if (!/favicon/.test(r.url())) errors.add(`request failed: ${r.url().slice(0, 120)} (${r.failure()?.errorText})`); });
  page.on("response", (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.add(`HTTP ${r.status()}: ${r.url().slice(0, 120)}`); });
  try { await page.goto(target.url, { waitUntil: "networkidle", timeout: 45000 }); }
  catch { await page.goto(target.url, { waitUntil: "load", timeout: 45000 }).catch((e) => errors.add("load: " + e.message)); }
  await settle(page, { wait: WAIT });

  const fold = path.join(OUT, `${w}${DARK ? "-dark" : ""}.png`);
  await page.screenshot({ path: fold });
  shots.push({ w, file: fold });
  if (FULL || w === Math.max(...WIDTHS) || w === 390) {
    const full = path.join(OUT, `${w}${DARK ? "-dark" : ""}-full.png`);
    // Chrome cannot paint a bitmap taller than about 16,000px: a long phone page
    // at 2x would come back corrupt, so very tall pages are captured at 1x.
    const tall = (await page.evaluate(() => document.scrollingElement.scrollHeight)) * SCALE > 15500;
    await page.screenshot({ path: full, fullPage: true, scale: w > 520 || tall ? "css" : "device" });
    // A 12,000px strip is unreadable once a viewer shrinks it. Slice it into
    // screens of 1.6 viewports each, numbered top to bottom.
    const total = await page.evaluate(() => document.scrollingElement.scrollHeight);
    const sliceH = Math.round(heightFor(w) * 1.6);
    const n = Math.min(14, Math.ceil(total / sliceH));
    for (let k = 0; k < n; k++) {
      const y = k * sliceH, h = Math.min(sliceH, total - y);
      if (h < 40) break;
      await page.screenshot({ path: path.join(OUT, `${w}${DARK ? "-dark" : ""}-full-${String(k + 1).padStart(2, "0")}.png`), fullPage: true, clip: { x: 0, y, width: w, height: h }, scale: w > 520 ? "css" : "device" });
    }
  }

  if (!has("--no-scan")) {
    await page.evaluate(INPAGE);
    const r = await page.evaluate((o) => window.__wd.scan(o), { app: APP });
    const lc = r.fails.findIndex((m) => m.startsWith("Contrast below WCAG AA"));
    if (lc > -1) {
      const { still, px, total } = await page.evaluate(() => window.__wd.recheckContrast());
      r.pxJobs.push(...px);
      if (!still.length) r.fails.splice(lc, 1);
      else r.fails[lc] = `Contrast below WCAG AA: ${still.slice(0, 5).join("; ")}${total > 5 ? ` (${total} elements in all)` : ""}`;
    }
    // Text over images and gradients: hide the ink, photograph its ground,
    // and measure against the darkest/lightest 12% of what is really there.
    for (const j of r.pxJobs.slice(0, 40)) {
      const h = await page.$(`[data-wd-px="${j.i}"]`); if (!h) continue;
      try {
        await h.evaluate((e) => { e.style.setProperty("color", "transparent", "important"); e.style.setProperty("text-shadow", "none", "important"); e.style.setProperty("-webkit-text-fill-color", "transparent", "important"); });
        const buf = await h.screenshot({ scale: "css", animations: "disabled" });
        await h.evaluate((e) => { e.style.removeProperty("color"); e.style.removeProperty("text-shadow"); e.style.removeProperty("-webkit-text-fill-color"); });
        const ratio = await page.evaluate(async ({ b64, fg }) => {
          const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
          const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
          const x = c.getContext("2d"); x.drawImage(img, 0, 0);
          const d = x.getImageData(0, 0, c.width, c.height).data, ratios = [];
          for (let i = 0; i < d.length; i += 16) ratios.push(window.__wd.contrast(fg, { r: d[i], g: d[i + 1], b: d[i + 2] }));
          ratios.sort((a, b) => a - b);
          return ratios[Math.floor(ratios.length * 0.12)] || 21;
        }, { b64: buf.toString("base64"), fg: j.fg });
        if (ratio < j.need) r.fails.push(`Text over an image or gradient fails contrast on part of its ground (${ratio.toFixed(2)}:1, needs ${j.need}): "${j.t}". Add a scrim, move it, or change the ink.`);
      } catch {}
    }
    // Keyboard focus: Tab through the page and photograph every stop focused
    // and unfocused. If the pixels do not change, a keyboard user is lost.
    if (w === Math.max(...WIDTHS)) {
      const invisible = [], coveredStops = [];
      await page.addStyleTag({ content: "*,*::before,*::after{transition-duration:0s!important;transition-delay:0s!important}" });
      await page.evaluate(() => { scrollTo({ top: 0, behavior: "instant" }); document.activeElement?.blur?.(); });
      await page.evaluate(() => document.body.focus());
      let total = 0;
      const diff = (a, b) => page.evaluate(async ([a, b]) => {
        const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = "data:image/png;base64," + s; });
        const [A, B] = await Promise.all([load(a), load(b)]);
        const c = document.createElement("canvas"); c.width = A.width; c.height = A.height;
        const x = c.getContext("2d", { willReadFrequently: true });
        x.drawImage(A, 0, 0); const da = x.getImageData(0, 0, c.width, c.height).data;
        x.clearRect(0, 0, c.width, c.height); x.drawImage(B, 0, 0); const db = x.getImageData(0, 0, c.width, c.height).data;
        let n = 0; for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 40) n++;
        return n;
      }, [a.toString("base64"), b.toString("base64")]);
      for (let i = 0; i < 45; i++) {
        await page.keyboard.press("Tab");
        const info = await page.evaluate(() => {
          const e = document.activeElement;
          if (!e || e === document.body || e === document.documentElement) return null;
          e.scrollIntoView({ block: "center", behavior: "instant" });
          const r = e.getBoundingClientRect();
          const label = (e.getAttribute("aria-label") || e.textContent || e.tagName).replace(/\s+/g, " ").trim().slice(0, 30);
          const top = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
          const covered = !!top && top !== e && !e.contains(top) && !top.contains(e);
          return { x: r.left, y: r.top, w: r.width, h: r.height, label, covered, vw: innerWidth, vh: innerHeight };
        });
        if (!info) break;
        total++;
        if (info.w < 1 || info.h < 1) continue;
        if (info.covered) { coveredStops.push(`"${info.label}"`); continue; }
        // 12px around it: focus rings are often drawn with an outline-offset of 4 to 8px.
        const clip = { x: Math.max(0, info.x - 12), y: Math.max(0, info.y - 12) };
        clip.width = Math.min(info.vw - clip.x, info.w + 24); clip.height = Math.min(info.vh - clip.y, info.h + 24);
        if (clip.width < 2 || clip.height < 2) continue;
        try {
          const on = await page.screenshot({ clip, scale: "css" });
          await page.evaluate(() => { window.__wdFocused = document.activeElement; document.activeElement.blur(); });
          const off = await page.screenshot({ clip, scale: "css" });
          await page.evaluate(() => window.__wdFocused?.focus({ preventScroll: true }));
          if ((await diff(on, off)) < 3) invisible.push(`"${info.label}"`);
        } catch {}
      }
      if (invisible.length) r.fails.push(`${invisible.length} of ${total} keyboard stops show no visible focus: ${[...new Set(invisible)].slice(0, 4).join("; ")}. Keyboard users cannot see where they are.`);
      if (coveredStops.length) r.fails.push(`${coveredStops.length} keyboard stop(s) are covered by other content when focused: ${[...new Set(coveredStops)].slice(0, 4).join("; ")}. A focused element must be on top and on screen (a footer fixed behind the page, a closed menu still in the tab order).`);
      r.facts.focusStops = total;
      if (!total && (await page.evaluate(() => document.querySelectorAll("a[href],button").length)) >= 3) r.warns.push("The keyboard walk reached no stop at all, though the page has links and buttons. Is the page trapping focus, or are its controls not focusable?");
    }
    // Pictures: their size at this width (to catch ones that collapse on a
    // phone), and at the widest width whether any renders as a flat block.
    r.media = await page.evaluate(() => [...document.querySelectorAll("img,svg,canvas,video,picture,[data-wd-art]")]
      .filter((e) => !e.closest("svg *") && !(e.tagName === "svg" && e.closest("button,a")) && (e.checkVisibility ? e.checkVisibility({ visibilityProperty: true }) : getComputedStyle(e).display !== "none"))
      .map((e, i) => { const q = e.getBoundingClientRect(); e.setAttribute("data-wd-m", i); return { i, key: (e.getAttribute("src") || e.getAttribute("aria-label") || e.id || e.className?.baseVal || e.className || e.tagName).toString().slice(0, 60), w: q.width, h: q.height }; }));
    if (w === Math.max(...WIDTHS)) {
      const flat = [];
      for (const m of r.media.filter((m) => m.w >= 120 && m.h >= 80).slice(0, 16)) {
        const h = await page.$(`[data-wd-m="${m.i}"]`); if (!h) continue;
        try {
          const buf = await h.screenshot({ scale: "css", animations: "disabled" });
          const spread = await page.evaluate(async (b64) => {
            const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
            const c = document.createElement("canvas"); c.width = 48; c.height = 48;
            const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0, 48, 48);
            const d = x.getImageData(0, 0, 48, 48).data; let min = 765, max = 0;
            for (let i = 0; i < d.length; i += 4) { const v = d[i] + d[i + 1] + d[i + 2]; if (v < min) min = v; if (v > max) max = v; }
            return max - min;
          }, buf.toString("base64"));
          if (spread < 24) flat.push(`${m.key} (${Math.round(m.w)}×${Math.round(m.h)})`);
        } catch {}
      }
      if (flat.length) r.warns.push(`Picture renders as a flat block of one colour: ${flat.slice(0, 3).join("; ")}. A failed load, a broken SVG, or a fill that went wrong?`);
    }
    results.push({ w, ...r });
  }
  await ctx.close();
}

// Pictures that are real at the widest width and collapse to nothing at a narrower one.
if (results.length > 1) {
  const wide = results[results.length - 1];
  for (const r of results.slice(0, -1)) {
    const gone = wide.media.filter((m) => m.w >= 60 && m.h >= 40).filter((m) => { const n = r.media.find((x) => x.key === m.key); return n && (n.w < 2 || n.h < 2); });
    if (gone.length) r.fails.push(`${gone.length} picture(s) visible at ${wide.w}px collapse to nothing at ${r.w}px: ${gone.slice(0, 3).map((m) => m.key).join("; ")}. Often an implicit grid column or a flex child with no width.`);
  }
}

// Contact sheet: every width's first screen, side by side at one height.
const sheetH = 720;
const sheet = `<html><body style="margin:0"><div id="sheet" style="display:inline-flex;flex-wrap:nowrap;padding:32px;background:#d6d6d2;gap:28px;align-items:flex-start;font:500 13px system-ui,sans-serif;color:#444">${shots
  .map((s) => `<figure style="margin:0"><img src="${pathToFileURL(s.file).href}" style="height:${sheetH}px;display:block;box-shadow:0 1px 0 rgba(0,0,0,.08),0 8px 24px rgba(0,0,0,.08)"><figcaption style="padding-top:10px">${s.w}px</figcaption></figure>`).join("")}</div></body></html>`;
const sheetFile = path.join(OUT, "_sheet.html");
fs.writeFileSync(sheetFile, sheet);
const sp = await browser.newPage({ viewport: { width: 12000, height: sheetH + 200 }, deviceScaleFactor: 1 });
await sp.goto(pathToFileURL(sheetFile).href);
await sp.evaluate(() => Promise.all([...document.images].map((i) => i.complete || new Promise((r) => (i.onload = r)))));
await (await sp.$("#sheet")).screenshot({ path: path.join(OUT, "sheet.png") });
fs.unlinkSync(sheetFile);

console.log(`\nShot ${input} at ${WIDTHS.join(", ")}px with ${label} -> ${OUT}`);
for (const s of shots) console.log("  " + s.file);
console.log("  " + path.join(OUT, "sheet.png"));
if (errors.size) { console.log("\nPage problems:"); for (const e of [...errors].slice(0, 12)) console.log("  " + e); }

let failed = 0;
if (results.length) {
  // Merge findings across widths: one line per message, tagged with where it happened.
  const merge = (kind) => {
    const m = new Map();
    for (const r of results) for (const msg of r[kind]) {
      const k = msg.replace(/\d+(\.\d+)?(px|:1| of \d+| text| element| distinct)/g, "#").slice(0, 70);
      if (!m.has(k)) m.set(k, { msg, ws: [] });
      if (!m.get(k).ws.includes(r.w)) m.get(k).ws.push(r.w);
    }
    return [...m.values()];
  };
  const fails = merge("fails"), warns = merge("warns");
  const f0 = results[results.length - 1].facts;
  console.log(`\nfonts ${JSON.stringify(f0.fonts)}  body ${f0.body ?? "?"}px  sizes [${f0.sizes.slice(0, 12).join(", ")}]  hues [${f0.hues.join(", ")}]  boxes ${f0.boxes}  card grids ${f0.cardGrids}  focus stops ${f0.focusStops ?? "-"}`);
  for (const f of fails) console.log(`  FAIL  [${f.ws.join(",")}] ${f.msg}`);
  for (const x of warns) console.log(`  warn  [${x.ws.join(",")}] ${x.msg}`);
  if (!fails.length && !warns.length) console.log("  clean");
  failed = fails.length;
  fs.writeFileSync(path.join(OUT, "scan.json"), JSON.stringify(results.map(({ pxJobs, media, ...r }) => r), null, 2));
  console.log(`\n${failed ? failed + " FAIL(s)." : "No FAILs."} The scan only catches mechanical tells. Now open every PNG with your own eyes.`);
}
await browser.close();
await target.close();
process.exit(failed ? 1 : 0);
