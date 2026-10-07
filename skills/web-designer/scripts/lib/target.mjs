// Turns what the user passed (a URL, an .html file, or a folder) into a URL.
// Local files are served over http from their folder, so ES modules, fetch()
// and root-relative paths behave as they will in production. file:// would
// hide those bugs on one OS and show them on another.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8", ".htm": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".avif": "image/avif", ".gif": "image/gif", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff",
  ".ttf": "font/ttf", ".otf": "font/otf", ".mp4": "video/mp4", ".webm": "video/webm", ".txt": "text/plain; charset=utf-8",
};

export async function resolveTarget(input) {
  if (!input) throw new Error("No target. Pass a URL, an .html file, or a folder.");
  if (/^https?:\/\//i.test(input)) return { url: input, close: async () => {}, local: false };
  const abs = path.resolve(input);
  if (!fs.existsSync(abs)) throw new Error(`Not found: ${abs}`);
  const isDir = fs.statSync(abs).isDirectory();
  const root = isDir ? abs : path.dirname(abs);
  const entry = isDir ? "index.html" : path.basename(abs);
  const server = http.createServer((req, res) => {
    let rel;
    try { rel = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400).end(); return; }
    let file = path.join(root, rel);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file) && !path.extname(file) && fs.existsSync(file + ".html")) file += ".html";
    if (!fs.existsSync(file)) { res.writeHead(404, { "content-type": "text/plain" }).end("404 " + rel); return; }
    res.writeHead(200, { "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "cache-control": "no-store" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}/${entry.split(path.sep).map(encodeURIComponent).join("/")}`,
    close: () => new Promise((r) => server.close(r)),
    local: true,
    root,
  };
}

// Load the page, wait for fonts, walk the whole page so scroll-triggered
// content and lazy images appear, then land finite animations on their end.
export async function settle(page, { wait = 0 } = {}) {
  await page.evaluate(async () => { try { await document.fonts.ready; } catch {} });
  await page.evaluate(async () => {
    // Scroll like a person: frame by frame, so IntersectionObserver reveals fire.
    const step = Math.max(200, innerHeight * 0.4);
    const max = () => document.scrollingElement.scrollHeight;
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (let y = 0; y < max() && y < 60000; y += step) { scrollTo({ top: y, behavior: "instant" }); await frame(); await new Promise((r) => setTimeout(r, 90)); }
    scrollTo({ top: max(), behavior: "instant" }); await new Promise((r) => setTimeout(r, 200));
    scrollTo({ top: 0, behavior: "instant" }); await new Promise((r) => setTimeout(r, 150));
    for (const img of document.images) { if (img.loading === "lazy") img.loading = "eager"; }
    await Promise.race([
      Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; }))),
      new Promise((r) => setTimeout(r, 4000)),
    ]);
    for (const a of document.getAnimations()) {
      try { const t = a.effect?.getComputedTiming?.(); if (t && t.endTime !== Infinity) a.finish(); } catch {}
    }
    await new Promise((r) => setTimeout(r, 120));
  });
  if (wait) await page.waitForTimeout(wait);
}
