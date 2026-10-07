#!/usr/bin/env node
/**
 * Web Designer matrix: does the page survive other people's computers?
 *
 *   node matrix.mjs site/index.html [--out shots/matrix] [--only windows-125,linux] [--app]
 *
 * Passes (each a screenshot plus checks):
 *   windows-125   1920x1080 laptop at 125% scaling: 1536px viewport, DPR 1.25,
 *                 Segoe UI / Arial / Consolas metrics, classic 15px scrollbars
 *   windows-150   15" laptop at 150%: 1280px viewport, DPR 1.5, same fonts
 *   windows-hc    Windows High Contrast (forced-colors: active, dark theme)
 *   linux         Ubuntu: DejaVu / Ubuntu fonts, classic scrollbars, DPR 1
 *   mac           macOS fonts (SF Pro, Helvetica, Menlo), when not on a Mac
 *   android       Pixel-size phone, Roboto
 *   firefox       Gecko, if installed (node doctor.mjs --engines)
 *   safari        WebKit desktop and iPhone, if installed
 *   reflow-320    320px wide: WCAG 1.4.10, the same as 400% zoom
 *   motion        prefers-reduced-motion: reduce. Is anything still moving?
 *   l10n          every word ~35% longer with accents (German, Finnish), at 1280 and 390
 *
 * Fonts are emulated with metric-compatible stand-ins (Selawik for Segoe UI,
 * Arimo for Arial and Helvetica, Tinos for Times, Carlito for Calibri, DejaVu,
 * Ubuntu, Cantarell), so line breaks and widths match the real thing; the
 * glyph shapes and the ClearType rendering do not. On the matching OS the
 * real fonts are used. Exit code 1 if any pass FAILs.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch, SKILL } from "./lib/browser.mjs";
import { resolveTarget, settle } from "./lib/target.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i > -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; };
const has = (n) => argv.includes(n);
const input = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && ["--out", "--only", "--wait"].includes(argv[i - 1])));
if (!input) { console.error("usage: node matrix.mjs <file.html | folder | url> [--out dir] [--only windows-125,linux,...] [--app]"); process.exit(2); }
const isUrl = /^https?:/i.test(input);
const OUT_BASE = path.resolve(arg("--out", isUrl ? "shots/matrix" : path.join(fs.statSync(path.resolve(input)).isDirectory() ? input : path.dirname(input), "shots", "matrix")));
// A partial re-run (--only) writes beside the full one, so the full sheet survives.
const OUT = arg("--only") ? path.join(OUT_BASE, "only-" + arg("--only").replace(/[^a-z0-9,-]/gi, "").replace(/,/g, "+")) : OUT_BASE;
fs.mkdirSync(OUT, { recursive: true });
const WAIT = parseInt(arg("--wait", "0"));
const INPAGE = fs.readFileSync(path.join(SKILL, "scripts", "lib", "inpage.js"), "utf8");
const FONTS = path.join(SKILL, "assets", "fonts");
const HOST = { darwin: "mac", win32: "windows", linux: "linux" }[process.platform] || "linux";

const SCROLLBAR = `::-webkit-scrollbar{width:15px;height:15px;background:#f0f0f0}::-webkit-scrollbar-thumb{background:#c2c2c2;border:4px solid #f0f0f0;border-radius:8px}::-webkit-scrollbar-corner{background:#f0f0f0}`;
const PASSES = [
  { id: "windows-125", engine: "chromium", vp: [1536, 730], dpr: 1.25, fonts: "windows", bars: true },
  { id: "windows-150", engine: "chromium", vp: [1280, 610], dpr: 1.5, fonts: "windows", bars: true },
  { id: "windows-hc", engine: "chromium", vp: [1536, 730], dpr: 1.25, fonts: "windows", bars: true, forced: true, scheme: "dark" },
  { id: "linux", engine: "chromium", vp: [1920, 960], dpr: 1, fonts: "linux", bars: true },
  { id: "mac", engine: "chromium", vp: [1440, 820], dpr: 2, fonts: "mac" },
  { id: "android", engine: "chromium", vp: [412, 840], dpr: 2.625, fonts: "android", mobile: true },
  { id: "firefox", engine: "firefox", vp: [1440, 900], dpr: 1 },
  { id: "safari", engine: "webkit", vp: [1440, 900], dpr: 2 },
  { id: "safari-iphone", engine: "webkit", vp: [390, 844], dpr: 3, mobile: true },
  { id: "reflow-320", engine: "chromium", vp: [320, 640], dpr: 2, mobile: true },
  { id: "motion", engine: "chromium", vp: [1440, 900], dpr: 1, motion: true },
  { id: "l10n", engine: "chromium", vp: [1280, 800], dpr: 1, l10n: true },
  { id: "l10n-phone", engine: "chromium", vp: [390, 844], dpr: 2, l10n: true, mobile: true },
].filter((p) => !(p.fonts && p.fonts === HOST && p.id === "mac"));
const only = arg("--only");
const passes = only ? PASSES.filter((p) => only.split(",").some((o) => p.id.startsWith(o))) : PASSES;

const target = await resolveTarget(input);
const browsers = {};
const results = [];

async function shootPass(p) {
  const key = p.engine + (p.bars ? "+bars" : "");
  if (!(key in browsers)) browsers[key] = await launch(p.engine, { scrollbars: !!p.bars });
  const b = browsers[key];
  if (!b.browser) return { id: p.id, skipped: b.why };
  const ctx = await b.browser.newContext({
    viewport: { width: p.vp[0], height: p.vp[1] }, deviceScaleFactor: p.dpr,
    isMobile: p.engine !== "firefox" && !!p.mobile, hasTouch: !!p.mobile,
    colorScheme: p.scheme || "light", reducedMotion: p.motion ? "reduce" : "no-preference",
    forcedColors: p.forced ? "active" : "none",
  });
  const page = await ctx.newPage();
  // Stand-in fonts are served from the skill folder on a fake origin, so any page (http or https) can load them.
  await page.route("https://wd-fonts.invalid/**", (route) => {
    const f = path.join(FONTS, path.basename(new URL(route.request().url()).pathname));
    if (!fs.existsSync(f)) return route.fulfill({ status: 404 });
    route.fulfill({ status: 200, body: fs.readFileSync(f), headers: { "content-type": "font/woff2", "access-control-allow-origin": "*" } });
  });
  if (p.bars && HOST !== "windows") {
    await page.addInitScript((css) => {
      const add = () => { const s = document.createElement("style"); s.id = "__wd-bars"; s.textContent = css; document.head.prepend(s); };
      if (document.head) add(); else document.addEventListener("DOMContentLoaded", add, { once: true });
    }, SCROLLBAR);
  }
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.split("\n")[0]));
  try { await page.goto(target.url, { waitUntil: "networkidle", timeout: 45000 }); }
  catch { await page.goto(target.url, { waitUntil: "load", timeout: 45000 }).catch((e) => errors.push(e.message)); }
  if (p.l10n) { await page.evaluate(INPAGE); await page.evaluate(() => window.__wd.pseudoLocalize()); }
  await settle(page, { wait: WAIT });
  await page.evaluate(INPAGE);
  const out = { id: p.id, label: `${p.id} · ${p.vp[0]}×${p.vp[1]} @${p.dpr}x · ${b.label}`, fails: [], warns: [], notes: [] };
  if (p.fonts && p.fonts !== HOST) {
    const f = await page.evaluate(([prof, base]) => window.__wd.emulateFonts(prof, base), [p.fonts, "https://wd-fonts.invalid"]);
    const stacks = Object.entries(f.stacks || {});
    if (stacks.length) out.notes.push(`Text in system-font stacks renders as: ${stacks.slice(0, 4).map(([k, v]) => `${k} → ${v}`).join("; ")}`);
    if (f.grew?.length > 2) out.warns.push(`${f.grew.length} text blocks wrap onto more lines with ${p.fonts} fonts: ${f.grew.slice(0, 4).join("; ")}`);
    if (f.overflow?.length) out.fails.push(`Text overflows its box with ${p.fonts} fonts: ${f.overflow.slice(0, 4).join("; ")}`);
  }
  if ((p.id.startsWith("windows-1") || p.id === "linux") && !has("--app")) {
    const acts = await page.evaluate(() => { scrollTo({ top: 0, behavior: "instant" }); return window.__wd.firstScreenAction(); });
    if (!acts.length) out.warns.push(`No action in the first screen at ${p.vp[0]}×${p.vp[1]}: the most common Windows laptop viewport is short. Bring the action up.`);
  }
  const d = await page.evaluate(() => window.__wd.defects());
  out.fails.push(...d.fails); out.warns.push(...d.warns);
  const over = await page.evaluate(() => { const s = document.scrollingElement; return s.scrollWidth > s.clientWidth + 1 ? [s.scrollWidth, s.clientWidth] : null; });
  if (over) {
    const who = await page.evaluate(() => window.__wd.overflowCulprits());
    out.fails.push(`Page scrolls sideways (content ${over[0]}px in a ${over[1]}px viewport)${who.length ? ". Sticking out: " + who.join("; ") : ""}${p.bars ? ". With a real scrollbar, 100vw is wider than the page." : ""}`);
  }
  if (p.forced) {
    // Lay the page out without forced colours, then with, and compare every text box.
    await page.emulateMedia({ forcedColors: "none" });
    await page.waitForTimeout(150);
    const before = await page.evaluate(() => window.__wd.textBoxes());
    await page.emulateMedia({ forcedColors: "active" });
    await page.waitForTimeout(250);
    const broke = await page.evaluate((b) => window.__wd.compareTextBoxes(b), before);
    if (broke.length) out.fails.push(`Text changes shape in High Contrast (${broke.length} element${broke.length > 1 ? "s" : ""}): ${broke.slice(0, 4).join("; ")}. Something depended on a background, a box-shadow or a colour that forced colours removed.`);
    // Pictures drawn in canvas or SVG can go blank when forced colours take over.
    const blank = [];
    for (const h of (await page.$$("canvas, svg")).slice(0, 12)) {
      const box = await h.boundingBox(); if (!box || box.width < 100 || box.height < 80) continue;
      try {
        const buf = await h.screenshot({ scale: "css" });
        const spread = await page.evaluate(async (b64) => {
          const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
          const c = document.createElement("canvas"); c.width = 40; c.height = 40;
          const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0, 40, 40);
          const d = x.getImageData(0, 0, 40, 40).data; let lo = 765, hi = 0;
          for (let i = 0; i < d.length; i += 4) { const v = d[i] + d[i + 1] + d[i + 2]; lo = Math.min(lo, v); hi = Math.max(hi, v); }
          return hi - lo;
        }, buf.toString("base64"));
        if (spread < 24) blank.push(`${await h.evaluate((e) => e.tagName.toLowerCase() + (e.id ? "#" + e.id : ""))} ${Math.round(box.width)}×${Math.round(box.height)}`);
      } catch {}
    }
    if (blank.length) out.warns.push(`Drawn picture renders blank in High Contrast: ${blank.slice(0, 3).join("; ")}. Use forced-color-adjust: none on art that must keep its colours, or give it a High Contrast version.`);
    const lost = await page.evaluate(() => window.__wd.forcedColorsCheck());
    if (lost.length) out.fails.push(`In High Contrast these controls lose their shape (backgrounds are removed; give them a border or outline, transparent is fine): ${lost.slice(0, 5).join("; ")}`);
  }
  if (p.motion) {
    const moving = await page.evaluate(() => window.__wd.motionCheck());
    if (moving.length) out.fails.push(`Still moving with reduced motion requested: ${moving.slice(0, 4).join("; ")}. Wrap it in @media (prefers-reduced-motion: no-preference).`);
  }
  if (errors.length) out.warns.push(`Script errors in ${p.engine}: ${errors.slice(0, 2).join("; ")}`);
  out.file = path.join(OUT, `${p.id}.png`);
  await page.screenshot({ path: out.file });
  await ctx.close();
  return out;
}

for (const p of passes) {
  try { results.push(await shootPass(p)); }
  catch (e) { results.push({ id: p.id, fails: [], warns: [`pass crashed: ${String(e.message).split("\n")[0]}`], notes: [] }); }
  const r = results[results.length - 1];
  process.stdout.write(r.skipped ? `  ${p.id}: skipped\n` : `  ${p.id}: ${r.fails.length} fail, ${r.warns.length} warn\n`);
}

// Engine differences: how much of the first screen changed against Chromium at the same size?
const anyChromium = Object.entries(browsers).find(([k, v]) => k.startsWith("chromium") && v.browser)?.[1].browser || (await launch("chromium")).browser;
const cmpRef = results.find((r) => r.id === "safari" && r.file) || results.find((r) => r.id === "firefox" && r.file);
if (cmpRef) {
  const ctx = await anyChromium.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  await pg.goto(target.url, { waitUntil: "networkidle" }).catch(() => {});
  await settle(pg);
  const ref = path.join(OUT, "_chromium-1440.png");
  await pg.screenshot({ path: ref });
  const bp = await ctx.newPage();
  for (const r of results.filter((x) => (x.id === "safari" || x.id === "firefox") && x.file)) {
    const pct = await bp.evaluate(async ([a, b]) => {
      const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = s; });
      const [A, B] = await Promise.all([load(a), load(b)]);
      const w = 360, h = 225, c = document.createElement("canvas"); c.width = w; c.height = h;
      const x = c.getContext("2d", { willReadFrequently: true });
      x.drawImage(A, 0, 0, w, h); const da = x.getImageData(0, 0, w, h).data;
      x.clearRect(0, 0, w, h); x.drawImage(B, 0, 0, w, h); const db = x.getImageData(0, 0, w, h).data;
      let diff = 0; for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 60) diff++;
      return Math.round((diff / (w * h)) * 100);
    }, ["data:image/png;base64," + fs.readFileSync(ref).toString("base64"), "data:image/png;base64," + fs.readFileSync(r.file).toString("base64")]);
    r.notes.push(`${pct}% of the first screen differs from Chromium.`);
    if (pct > 12) r.warns.push(`${pct}% of the first screen renders differently from Chromium. Compare ${path.basename(r.file)} with _chromium-1440.png: usually an unsupported CSS feature or a font that did not load.`);
  }
  await ctx.close();
}

// Sheet: every pass at one height, labelled.
const shot = results.filter((r) => r.file);
const H = 360;
const html = `<html><body style="margin:0;padding:28px;background:#d6d6d2;display:flex;flex-wrap:wrap;gap:24px;font:500 12px system-ui,sans-serif;color:#333;width:2200px">${shot
  .map((r) => `<figure style="margin:0"><img src="${pathToFileURL(r.file).href}" style="height:${H}px;display:block;outline:${r.fails.length ? "3px solid #d92d20" : "1px solid rgba(0,0,0,.12)"}"><figcaption style="padding-top:8px">${r.id}${r.fails.length ? ` · ${r.fails.length} fail` : ""}</figcaption></figure>`).join("")}</body></html>`;
const sf = path.join(OUT, "_sheet.html"); fs.writeFileSync(sf, html);
const sp = await anyChromium.newPage({ viewport: { width: 2256, height: 800 } });
await sp.goto(pathToFileURL(sf).href);
await sp.screenshot({ path: path.join(OUT, "sheet.png"), fullPage: true });
fs.unlinkSync(sf);

// Report
let failed = 0;
const md = [`# Matrix: ${input}`, "", `Host: ${HOST} (${os.release()}). Fonts on other OSes are metric-compatible stand-ins.`, ""];
console.log(`\nMatrix for ${input} -> ${OUT}`);
for (const r of results) {
  if (r.skipped) { console.log(`\n── ${r.id}: skipped. ${r.skipped}`); md.push(`## ${r.id}`, "", `Skipped: ${r.skipped}`, ""); continue; }
  console.log(`\n── ${r.label || r.id}`);
  md.push(`## ${r.label || r.id}`, "", `![${r.id}](${path.basename(r.file || "")})`, "");
  for (const n of r.notes) { console.log("  note  " + n); md.push(`- note: ${n}`); }
  for (const f of r.fails) { console.log("  FAIL  " + f); md.push(`- **FAIL** ${f}`); }
  for (const w of r.warns) { console.log("  warn  " + w); md.push(`- warn: ${w}`); }
  if (!r.fails.length && !r.warns.length) console.log("  clean");
  md.push("");
  failed += r.fails.length;
}
fs.writeFileSync(path.join(OUT, "matrix.md"), md.join("\n"));
console.log(`\n  ${path.join(OUT, "sheet.png")}\n  ${path.join(OUT, "matrix.md")}`);
console.log(`\n${failed ? failed + " FAIL(s)." : "No FAILs."} Open sheet.png, then every pass with a FAIL.`);
for (const b of Object.values(browsers)) await b.browser?.close();
await target.close();
process.exit(failed ? 1 : 0);
