// Finds and launches a browser on macOS, Windows and Linux.
//
// Chromium: an installed Google Chrome, then Microsoft Edge (every Windows
// machine has it), then Playwright's own Chromium, then common Linux paths.
// Firefox and WebKit: Playwright's builds only (node doctor.mjs --engines).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

export const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

let pw;
export function playwright() {
  if (pw) return pw;
  for (const base of [process.cwd(), SKILL]) {
    try { pw = createRequire(path.join(base, "package.json"))("playwright-core"); return pw; } catch {}
  }
  console.error(`playwright-core is not installed. Run once:\n  node "${path.join(SKILL, "scripts", "doctor.mjs")}" --fix`);
  process.exit(2);
}

const LINUX_CHROMIUM = ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/snap/bin/chromium", "/usr/bin/google-chrome-stable", "/usr/bin/microsoft-edge"];

// Returns { browser, label } or { browser: null, why }.
export async function launch(engine = "chromium", { scrollbars = false } = {}) {
  const { chromium, firefox, webkit } = playwright();
  if (engine === "firefox" || engine === "webkit") {
    const type = engine === "firefox" ? firefox : webkit;
    try { return { browser: await type.launch({ headless: true }), label: `${engine} (Playwright)` }; }
    catch (e) { return { browser: null, why: `${engine} is not installed. Optional: node "${path.join(SKILL, "scripts", "doctor.mjs")}" --engines` }; }
  }
  // --hide-scrollbars is Playwright's default; a Windows pass needs the bars.
  const base = { headless: true, ...(scrollbars ? { ignoreDefaultArgs: ["--hide-scrollbars"] } : {}) };
  const tries = [];
  if (process.env.WEB_DESIGNER_BROWSER) tries.push({ executablePath: process.env.WEB_DESIGNER_BROWSER, label: process.env.WEB_DESIGNER_BROWSER });
  tries.push({ channel: "chrome", label: "Google Chrome" }, { channel: "msedge", label: "Microsoft Edge" }, { label: "Playwright Chromium" });
  for (const p of LINUX_CHROMIUM) if (fs.existsSync(p)) tries.push({ executablePath: p, label: p });
  const errors = [];
  for (const { label, ...opts } of tries) {
    try { return { browser: await chromium.launch({ ...base, ...opts }), label }; }
    catch (e) { errors.push(`${label}: ${String(e.message).split("\n")[0]}`); }
  }
  console.error("No Chromium-family browser could start:\n  " + errors.join("\n  ") +
    `\nInstall Google Chrome, or run: node "${path.join(SKILL, "scripts", "doctor.mjs")}" --fix`);
  process.exit(2);
}
