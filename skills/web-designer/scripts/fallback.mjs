#!/usr/bin/env node
/**
 * Metric-matched fallback for a web font, so the page does not jump when the
 * font arrives, and Windows and Linux visitors see the same line breaks while
 * it loads.
 *
 *   node fallback.mjs site/fonts/display.woff2                 against Arial (sans)
 *   node fallback.mjs site/fonts/text.woff2 --serif            against Times New Roman
 *   node fallback.mjs site/fonts/display.woff2 --name "Display Fallback"
 *
 * Measures in a real browser: average advance width on English text (for
 * size-adjust) and the font's ascent and descent (for the overrides). Arial
 * and Times are measured through their metric-identical open twins, Arimo and
 * Tinos, so the numbers are the same on every OS.
 */
import fs from "node:fs";
import path from "node:path";
import { launch, SKILL } from "./lib/browser.mjs";

const argv = process.argv.slice(2);
const file = argv.find((a) => /\.(woff2?|ttf|otf)$/i.test(a));
if (!file || !fs.existsSync(file)) { console.error("usage: node fallback.mjs <font.woff2|.ttf|.otf> [--serif] [--name \"X Fallback\"]"); process.exit(2); }
const serif = argv.includes("--serif");
const nameIdx = argv.indexOf("--name");
const NAME = nameIdx > -1 ? argv[nameIdx + 1] : `${path.basename(file).replace(/\.[^.]+$/, "")} Fallback`;
const twin = path.join(SKILL, "assets", "fonts", serif ? "tinos-400-latin.woff2" : "arimo-400-latin.woff2");
const mime = (f) => (/\.woff2$/i.test(f) ? "font/woff2" : /\.woff$/i.test(f) ? "font/woff" : /\.otf$/i.test(f) ? "font/otf" : "font/ttf");

const { browser } = await launch("chromium");
const page = await browser.newPage();
await page.setContent("<!doctype html><html><body></body></html>");
const m = await page.evaluate(async ({ target, twin }) => {
  const load = async (name, src) => { const f = new FontFace(name, `url(${src})`); await f.load(); document.fonts.add(f); };
  await load("WDTarget", target); await load("WDTwin", twin);
  const c = document.createElement("canvas").getContext("2d");
  // Weighted toward real text: letters at English frequency, a space every six.
  const sample = "the quick brown fox jumps over the lazy dog etaoin shrdlu cmfwyp vbgkqj xz THE QUICK BROWN FOX 0123456789 , . ";
  const metrics = (fam) => { c.font = `100px ${fam}`; const t = c.measureText(sample); const a = c.measureText("Hxgjp"); return { w: t.width, asc: a.fontBoundingBoxAscent, desc: a.fontBoundingBoxDescent }; };
  return { t: metrics("WDTarget"), f: metrics("WDTwin") };
}, { target: `data:${mime(file)};base64,${fs.readFileSync(file).toString("base64")}`, twin: `data:font/woff2;base64,${fs.readFileSync(twin).toString("base64")}` });
await browser.close();

const size = m.t.w / m.f.w;
const pct = (v) => `${(v * 100).toFixed(2)}%`;
const local = serif ? `local("Times New Roman"), local("Liberation Serif"), local("Tinos")` : `local("Arial"), local("Liberation Sans"), local("Arimo"), local("Helvetica")`;
console.log(`/* Metric-matched fallback for ${path.basename(file)}: measured against ${serif ? "Times New Roman" : "Arial"}. */
@font-face {
  font-family: "${NAME}";
  src: ${local};
  size-adjust: ${pct(size)};
  ascent-override: ${pct(m.t.asc / 100 / size)};
  descent-override: ${pct(m.t.desc / 100 / size)};
  line-gap-override: 0%;
}
/* Then: font-family: "<Your Face>", "${NAME}", ${serif ? "Georgia, serif" : "system-ui, sans-serif"}; */`);
