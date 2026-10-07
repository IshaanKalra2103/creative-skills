#!/usr/bin/env node
/**
 * Web Designer doctor: checks that the skill can render on this machine
 * (macOS, Windows or Linux) and fixes what it can.
 *
 *   node doctor.mjs            check only
 *   node doctor.mjs --fix      install playwright-core, and Chromium if no Chrome/Edge is found
 *   node doctor.mjs --engines  also install Firefox and WebKit for the matrix (about 250 MB)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIX = process.argv.includes("--fix") || process.argv.includes("--engines");
const ENGINES = process.argv.includes("--engines");
const WIN = process.platform === "win32";
let ok = true;
const say = (good, msg) => { console.log(`${good ? "  ok  " : "  !!  "} ${msg}`); if (!good) ok = false; };
const run = (cmd, args) => {
  console.log(`\n  > ${cmd} ${args.join(" ")}`);
  const r = spawnSync(WIN ? `${cmd}.cmd` : cmd, args, { cwd: SKILL, stdio: "inherit", shell: WIN });
  return r.status === 0;
};

console.log(`Web Designer doctor · ${os.type()} ${os.release()} · node ${process.versions.node}\n`);
const major = +process.versions.node.split(".")[0];
say(major >= 18, `Node ${process.versions.node}${major >= 18 ? "" : " (need 18 or newer: https://nodejs.org)"}`);

const load = () => { try { return createRequire(path.join(SKILL, "package.json"))("playwright-core"); } catch { return null; } };
let pw = load();
if (!pw && FIX) { run("npm", ["install", "--no-audit", "--no-fund"]); pw = load(); }
say(!!pw, pw ? "playwright-core installed" : `playwright-core missing. Run: node "${path.join(SKILL, "scripts", "doctor.mjs")}" --fix`);
if (!pw) process.exit(1);

const tryLaunch = async (type, opts) => { try { const b = await type.launch({ headless: true, ...opts }); await b.close(); return true; } catch { return false; } };
const found = [];
for (const [label, opts] of [["Google Chrome", { channel: "chrome" }], ["Microsoft Edge", { channel: "msedge" }], ["Playwright Chromium", {}]]) {
  if (await tryLaunch(pw.chromium, opts)) found.push(label);
}
if (!found.length && FIX) {
  const args = ["playwright-core", "install", "chromium"];
  if (process.platform === "linux") console.log("  On Linux, if Chromium then fails to start, run: npx playwright-core install-deps chromium  (needs sudo)");
  run("npx", ["--yes", ...args]);
  if (await tryLaunch(pw.chromium, {})) found.push("Playwright Chromium");
}
say(found.length > 0, found.length ? `Chromium-family browser: ${found.join(", ")}` : "No Chrome, Edge or Chromium could start. Install Google Chrome, or run doctor.mjs --fix");

// The video recorder (record.mjs) needs Playwright's small ffmpeg build.
if (FIX) run("npx", ["--yes", "playwright-core", "install", "ffmpeg"]);
if (ENGINES) run("npx", ["--yes", "playwright-core", "install", "firefox", "webkit"]);
for (const [name, type] of [["Firefox", pw.firefox], ["WebKit (Safari)", pw.webkit]]) {
  const has = await tryLaunch(type, {});
  console.log(`  ${has ? "ok  " : "--  "}  ${name}${has ? "" : " not installed (optional, for the matrix: doctor.mjs --engines)"}`);
}

const fonts = fs.existsSync(path.join(SKILL, "assets", "fonts")) ? fs.readdirSync(path.join(SKILL, "assets", "fonts")).filter((f) => f.endsWith(".woff2")).length : 0;
say(fonts >= 20, `${fonts} stand-in fonts for Windows/Linux/Android emulation`);

const hist = path.join(os.homedir(), ".web-designer", "history.md");
console.log(`  ${fs.existsSync(hist) ? "ok  " : "--  "}  history: ${hist}${fs.existsSync(hist) ? "" : " (created on first use)"}`);

if (ok && found.length) {
  // Smoke test: render and scan a tiny page.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wd-"));
  fs.writeFileSync(path.join(tmp, "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Doctor</title></head><body style="font:18px/1.5 Georgia,serif;margin:48px"><h1 style="font-size:56px;letter-spacing:-0.02em">Doctor</h1><p>If you can read this in a PNG, rendering works.</p></body></html>`);
  const r = spawnSync(process.execPath, [path.join(SKILL, "scripts", "shoot.mjs"), path.join(tmp, "index.html"), "--widths", "390", "--out", path.join(tmp, "shots")], { encoding: "utf8" });
  const png = fs.existsSync(path.join(tmp, "shots", "390.png"));
  say(png, png ? "smoke test: rendered and scanned a page" : "smoke test failed:\n" + (r.stderr || r.stdout).slice(0, 600));
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(ok ? "\nReady." : "\nNot ready yet: fix the !! lines above.");
process.exit(ok ? 0 : 1);
