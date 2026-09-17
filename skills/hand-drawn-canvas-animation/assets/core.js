'use strict';
// ============================================================
// hand-drawn canvas core
// Everything a film needs except the film itself: palettes and colour
// maths, four surface finishes (ink, riso, screen, pencil), the marks,
// lattices, reveals, camera, timeline, score plumbing and the player.
//
// A film is an HTML file that loads this script, then defines puppets,
// scenes and a timeline and calls defineFilm({...}). See film-template.html.
//
// Sections: CONFIG · COLOUR · PALETTES · RANDOM & EASING · GEOMETRY ·
// MARKS · FINISHES · LATTICES & PARTICLES · MOTIFS · REVEALS & COMPOSITION ·
// STYLE SHEETS · TIMELINE & RUNTIME
// ============================================================

// ===================== CONFIG =====================
// Logical frame: the short side is always 1080 units, the long side follows the aspect ratio.
// Scenes draw in logical units. S scales them to the output width chosen at render time.
const SHORT = 1080;
let W = 1080, H = 1080, S = 1, CX = 540, CY = 540, OUT_W = 1080, OUT_H = 1080;
const _layers = [];   // every layer() canvas, resized when the format changes
function setFormat({ ar = '1:1', width } = {}) {
  const [a, b] = String(ar).split(/[:x\/]/).map(Number); const r = (a > 0 && b > 0) ? a / b : 1;
  if (r >= 1) { H = SHORT; W = Math.round(SHORT * r); } else { W = SHORT; H = Math.round(SHORT / r); }
  S = width ? width / W : 1; OUT_H = 2 * Math.round(H * S / 2); S = OUT_H / H; OUT_W = 2 * Math.round(W * S / 2);
  CX = W / 2; CY = H / 2;
  for (const L of _layers) { L.o.width = Math.round(L.w * S); L.o.height = Math.round(L.h * S); }   // layers made at file scope follow the format
  return { W, H, S, OUT_W, OUT_H };
}
{ const q = new URLSearchParams(location.search); if (q.has('ar') || q.has('w')) setFormat({ ar: q.get('ar') || '1:1', width: +q.get('w') || undefined }); }
const FPS_DRAW = 12, FPS_OUT = 24;          // drawn on twos, packed to 24 fps
const TAU = Math.PI * 2;
const HAND_FONT = '"Bradley Hand", "Segoe Script", "Chalkboard", "Comic Sans MS", cursive';

// ===================== COLOUR =====================
// All helpers take and return CSS colours. Hex in, hex out, except alpha().
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function parseColor(c) {
  if (c[0] === '#') { let h = c.slice(1); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const m = c.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2]];
}
const toHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
function mix(a, b, t) { const A = parseColor(a), B = parseColor(b); return toHex(A.map((v, i) => lerp(v, B[i], t))); }
const tint = (c, t) => mix(c, '#ffffff', t);       // towards white
const shade = (c, t) => mix(c, '#000000', t);      // towards black
function alpha(c, a) { const [r, g, b] = parseColor(c); return `rgba(${r},${g},${b},${a})`; }
function rgbToHsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; }
function hslToRgb([h, s, l]) { h = ((h % 360) + 360) % 360 / 360; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; }
const hsl = c => rgbToHsl(parseColor(c));
const withHsl = (c, fn) => toHex(hslToRgb(fn(hsl(c))));
const rotateHue = (c, deg) => withHsl(c, ([h, s, l]) => [h + deg, s, l]);
const saturate = (c, k) => withHsl(c, ([h, s, l]) => [h, clamp(s * k, 0, 1), l]);
const lighten = (c, d) => withHsl(c, ([h, s, l]) => [h, s, clamp(l + d, 0, 1)]);
// ramp: n steps from a light tint through the colour to a dark shade
function ramp(c, n = 5) { return Array.from({ length: n }, (_, i) => { const t = i / (n - 1); return t < .5 ? tint(c, (.5 - t) * 1.4) : shade(c, (t - .5) * 1.4); }); }
function harmony(base) { return { complement: rotateHue(base, 180), triad: [rotateHue(base, 120), rotateHue(base, 240)], analog: [rotateHue(base, -30), rotateHue(base, 30)], split: [rotateHue(base, 150), rotateHue(base, 210)] }; }

// ===================== PALETTES =====================
// Every palette has the same keys, so a scene written for one runs on any other.
//   paper      background of daylight shots        night     background of dark / blueprint shots
//   paperBand  faint light bands on paper (or null) chalk     light line on night, chalkDim its quiet version
//   ink        dark outline and text               guide     construction-line colour
//   fills[]    3..6 flat fills for subjects        shade     hatch / dot colour laid over fills
//   light      highlight hatch on fills            blush     second shade (warm shadow, cheeks, sunsets)
//   accents[]  4 loud colours for scribble outlines, wakes, sparks
//   inks[]     2..4 print inks for riso plates and dot screens (the finish's "colour separations")
//   finish     default surface finish: 'ink' | 'riso' | 'screen' | 'pencil' | 'flat'
const PALETTES = {
  // the fruit-fly film: warm paper, brown inks, four riso accents
  paperInk: {
    paper: '#f3e6cf', paperBand: 'rgba(255,238,200,.65)', ink: '#1e1630', night: '#0b0d1f', chalk: '#e8ecff', chalkDim: '#8d97c9', guide: 'rgba(70,100,255,.55)',
    fills: ['#e79256', '#c99a5a', '#b8864e', '#d9b078'], shade: '#3a2214', light: '#fff1d6', blush: '#c8473f',
    accents: ['#ff2bd6', '#28f0e0', '#ffe22b', '#5cff5c'], inks: ['#1e1630', '#c8473f', '#2b5fb8'], finish: 'ink',
  },
  // the flipbook: cream stock, fluorescent riso inks, halftone dots, dark purple night
  risoPop: {
    paper: '#f0ece2', paperBand: null, ink: '#22366b', night: '#2a2050', chalk: '#f3ebb1', chalkDim: '#8f86c8', guide: 'rgba(34,54,107,.5)',
    fills: ['#ff48b0', '#0078bf', '#ffe800', '#00a95c', '#ff6c2f', '#765ba7'], shade: '#22366b', light: '#fff9c8', blush: '#ff48b0',
    accents: ['#ff48b0', '#0078bf', '#ffe800', '#00a95c'], inks: ['#0078bf', '#ff48b0', '#ffe800', '#22366b'], finish: 'riso',
  },
  // the paper boat: sea blues, cream sky, one orange desk, flat shapes under a regular dot screen
  screenSea: {
    paper: '#e8e6db', paperBand: null, ink: '#1f1e2d', night: '#1a1c2e', chalk: '#e8e6db', chalkDim: '#8a93a6', guide: 'rgba(10,80,131,.5)',
    fills: ['#0a5083', '#518e9d', '#becacc', '#e4a05c', '#91906a', '#e8c84a', '#c8473f', '#051630'], shade: '#051630', light: '#f4f2e8', blush: '#e4a05c',
    accents: ['#c8473f', '#e8c84a', '#518e9d', '#f0a0b0'], inks: ['#0a5083', '#051630', '#e8c84a'], finish: 'screen',
  },
  // the personal website: near-monochrome cream and charcoal, pale pink and sage sections, thin graphite lines
  pencilMinimal: {
    paper: '#f4efe4', paperBand: null, ink: '#201f1b', night: '#27251f', chalk: '#d9d2c2', chalkDim: '#7d786c', guide: 'rgba(32,31,27,.35)',
    fills: ['#e8d6cc', '#e0e2d0', '#dad2c5', '#f4efe4'], shade: '#5e5a50', light: '#ffffff', blush: '#c9a9a0',
    accents: ['#8a8a55', '#b0483a', '#7e8aa0', '#c9a15a'], inks: ['#201f1b', '#8a8a55'], finish: 'pencil',
  },
  // chalk on navy only: for films that live entirely in the blueprint world
  blueprintNight: {
    paper: '#0b0d1f', paperBand: null, ink: '#e8ecff', night: '#0b0d1f', chalk: '#e8ecff', chalkDim: '#8d97c9', guide: 'rgba(150,170,255,.7)',
    fills: ['#1a2040', '#22306a', '#2c3a80', '#141a33'], shade: '#8d97c9', light: '#ffffff', blush: '#7fe7ff',
    accents: ['#7fe7ff', '#ff6fd8', '#ffe22b', '#5fe08a'], inks: ['#e8ecff', '#7fe7ff'], finish: 'ink',
  },
};
// makePalette: fill missing keys from a base, so a film can say makePalette({fills: [...], finish: 'riso'})
function makePalette(part = {}, base = 'paperInk') { const b = typeof base === 'string' ? PALETTES[base] : base; return { ...b, ...part }; }
// derivePalette: shift a whole palette (hue in degrees, saturation factor, lightness delta); paper and ink stay unless overridden
function derivePalette(pal, { hue = 0, sat = 1, light = 0, paper, ink, finish, night } = {}) {
  const f = c => lighten(saturate(rotateHue(c, hue), sat), light);
  return { ...pal, paper: paper || pal.paper, ink: ink || pal.ink, night: night || pal.night, finish: finish || pal.finish,
    fills: pal.fills.map(f), accents: pal.accents.map(f), inks: pal.inks.map(f), shade: f(pal.shade), blush: f(pal.blush), light: pal.light };
}
// duotone: two inks on paper, the way the flipbook goes magenta + blue for a beat
function duotone(inkA, inkB, paper = '#f0ece2', finish = 'riso') {
  return makePalette({ paper, ink: inkA, night: shade(inkA, .6), chalk: paper, chalkDim: mix(inkA, paper, .5), guide: alpha(inkA, .5),
    fills: [inkA, inkB, mix(inkA, inkB, .5), tint(inkA, .5), tint(inkB, .5)], shade: inkA, light: paper, blush: inkB, accents: [inkB, inkA, tint(inkB, .4), tint(inkA, .4)], inks: [inkA, inkB], finish });
}
let PAL = { ...PALETTES.paperInk };
function usePalette(p) { PAL = typeof p === 'string' ? { ...PALETTES[p] } : { ...p }; return PAL; }

// ===================== RANDOM & EASING =====================
// Everything is seeded. Math.random is banned in films: it makes textures boil.
function rng(seed) { let a = (seed * 1000003) >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const easeIO = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const sm = (a, b, t, e = easeIO) => e(clamp((t - a) / (b - a), 0, 1));   // 0..1 between times a and b
const flicker = (i, period = 2) => Math.floor(i / period) % 2 === 0;    // alternate two renders
const pulse = (i, every, hold = 1) => (i % every) < hold;                 // true for `hold` drawn frames every `every`

// ===================== GEOMETRY =====================
// Fill with a Path2D, outline with a jittered polyline: the two must not coincide.
function ellPts(cx, cy, rx, ry, rot = 0, n = 44) { const p = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, x = rx * Math.cos(a), y = ry * Math.sin(a); p.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); } return p; }
function ellPath(cx, cy, rx, ry, rot = 0) { const p = new Path2D(); p.ellipse(cx, cy, rx, ry, rot, 0, TAU); return p; }
function circPath(cx, cy, r) { return ellPath(cx, cy, r, r); }
function rectPath(x, y, w, h) { const p = new Path2D(); p.rect(x, y, w, h); return p; }
function roundRectPath(x, y, w, h, r) { const p = new Path2D(); p.roundRect(x, y, w, h, r); return p; }
function polyPath(pts, close = true) { const p = new Path2D(); pts.forEach((q, i) => i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])); if (close) p.closePath(); return p; }
function pathLength(pts, close) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (close) L += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]); return L; }
function bez(p0, p1, p2, p3, t) { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; }
function layer(w, h) { const full = w === undefined; w = w ?? W; h = h ?? H; const o = document.createElement('canvas'); o.width = Math.round(w * S); o.height = Math.round(h * S); if (full) _layers.push({ o, get w() { return W; }, get h() { return H; } }); else _layers.push({ o, w, h }); return o; }   // output pixels, logical size w x h
function cam(c, x, y, zoom, rot = 0) { c.setTransform(S, 0, 0, S, 0, 0); c.translate(W / 2, H / 2); c.scale(zoom, zoom); c.rotate(rot); c.translate(-x, -y); }
const resetT = c => c.setTransform(S, 0, 0, S, 0, 0);   // identity in logical units
const blit = (c, src) => { c.save(); resetT(c); c.drawImage(src, 0, 0, W, H); c.restore(); };   // draw a layer full-frame

// ===================== MARKS =====================
// wob: polyline with seeded jitter (amp 1..3 px). Use for every visible outline.
function wob(c, pts, amp, seed, close = false) { const r = rng(seed); c.beginPath(); pts.forEach((p, i) => { const x = p[0] + (r() - .5) * amp, y = p[1] + (r() - .5) * amp; i ? c.lineTo(x, y) : c.moveTo(x, y); }); if (close) c.closePath(); c.stroke(); }
// crayon: a wob stroke with a grainy edge (three passes, the flipbook's ripple line)
function crayon(c, pts, color, width, seed, close = false) { c.save(); c.strokeStyle = color; c.lineCap = 'round'; c.lineJoin = 'round'; for (let k = 0; k < 3; k++) { c.globalAlpha = k ? .35 : .85; c.lineWidth = width * (k ? .7 : 1); wob(c, pts, 2.5 + k * 1.5, seed + k * 7, close); } c.restore(); }
// hatch: short parallel strokes clipped to `path`. box=[x,y,w,h] bounds the path in the same coords. One stroke() per layer.
function hatch(c, path, box, o = {}) {
  const { angle = .9, gap = 7, len = 14, jitter = 6, color = PAL.ink, alpha: al = .35, width = 1.2, seed = 1 } = o; const r = rng(seed);
  c.save(); c.clip(path); c.strokeStyle = color; c.globalAlpha = al; c.lineWidth = width; c.lineCap = 'round';
  const [bx, by, bw, bh] = box, cx = bx + bw / 2, cy = by + bh / 2, R = Math.hypot(bw, bh) / 2, ca = Math.cos(angle), sa = Math.sin(angle);
  c.beginPath();
  for (let v = -R; v <= R; v += gap) for (let u = -R; u <= R; u += len * 1.7) { const uu = u + (r() - .5) * jitter * 2, L = len * (.6 + r() * .8);
    const x0 = cx + ca * uu - sa * v + (r() - .5) * jitter * .6, y0 = cy + sa * uu + ca * v + (r() - .5) * jitter * .6; c.moveTo(x0, y0); c.lineTo(x0 + ca * L, y0 + sa * L); }
  c.stroke(); c.restore();
}
// grain: n speckles clipped to path
function grain(c, path, box, n, color, al, seed, size = 1.8) { const r = rng(seed); c.save(); c.clip(path); c.fillStyle = color; c.globalAlpha = al; for (let i = 0; i < n; i++) c.fillRect(box[0] + r() * box[2], box[1] + r() * box[3], size * (.4 + r()), size * (.4 + r())); c.restore(); }
// scribble: the same outline in accent colours, each copy shifted, turned and scaled a little (riso misregistration). One or two parts per frame.
function scribble(c, path, cx, cy, o = {}) { const { colors = PAL.accents, amp = 5, alpha: al = .55, width = 1.1, seed = 3 } = o; const r = rng(seed); c.save(); c.globalAlpha = al; c.lineWidth = width;
  for (const col of colors) { c.strokeStyle = col; c.save(); c.translate(cx + (r() - .5) * amp * 2, cy + (r() - .5) * amp * 2); c.rotate((r() - .5) * .08); c.scale(1 + (r() - .5) * .08, 1 + (r() - .5) * .08); c.translate(-cx, -cy); c.stroke(path); c.restore(); } c.restore(); }
function cross(c, x, y, s) { c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.stroke(); }
// construction: thin guide lines with ticks, a circle and a few crosses around (cx,cy)
function construction(c, cx, cy, R, seed, color = PAL.guide, al = 1) { const r = rng(seed); c.save(); c.globalAlpha = al; c.strokeStyle = color; c.lineWidth = .9;
  for (let i = 0; i < 3; i++) { const a = r() * Math.PI, L = R * (1.3 + r() * 1.2); c.beginPath(); c.moveTo(cx - Math.cos(a) * L, cy - Math.sin(a) * L); c.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); c.stroke();
    for (let k = -3; k <= 3; k++) { const u = k * L / 4, x = cx + Math.cos(a) * u, y = cy + Math.sin(a) * u; c.beginPath(); c.moveTo(x - Math.sin(a) * 5, y + Math.cos(a) * 5); c.lineTo(x + Math.sin(a) * 5, y - Math.cos(a) * 5); c.stroke(); } }
  c.beginPath(); c.arc(cx, cy, R * 1.12, 0, TAU); c.stroke(); for (let i = 0; i < 5; i++) cross(c, cx + (r() - .5) * R * 3, cy + (r() - .5) * R * 3, 6); c.restore(); }
// squiggleText: illegible handwriting as rows of little arches (letters, notes, walls of text)
function squiggleText(c, x, y, w, lines, o = {}) { const { color = PAL.ink, seed = 1, lineH = 16, amp = 4, width = 1.3, gap = .4 } = o; const r = rng(seed); c.save(); c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round';
  for (let l = 0; l < lines; l++) { let px = x; const py = y + l * lineH, end = x + w * (l === lines - 1 ? .35 + r() * .5 : .9 + r() * .1);
    while (px < end) { const wl = 14 + r() * 40, f = .6 + r() * .6; c.beginPath(); c.moveTo(px, py); for (let u = 2; u <= wl; u += 2) c.lineTo(px + u, py - Math.abs(Math.sin(u * f + r() * .3)) * amp * (.5 + r() * .8)); c.stroke(); px += wl + amp * 2 * gap + r() * 8; } }
  c.restore(); }
// handText: real letters in a handwriting face, two inks misregistered. Fonts differ per machine: check the render.
function handText(c, text, x, y, o = {}) { const { size = 64, ink = PAL.ink, ink2 = PAL.accents[0], offset = 3, align = 'left' } = o; c.save(); c.font = `${size}px ${HAND_FONT}`; c.textAlign = align; c.textBaseline = 'alphabetic';
  if (ink2) { c.fillStyle = ink2; c.globalAlpha = .85; c.fillText(text, x + offset, y + offset * .6); } c.fillStyle = ink; c.globalAlpha = 1; c.fillText(text, x, y); c.restore(); }

// ===================== FINISHES =====================
// A finish is how a flat fill gets its texture. surface() is the one call a puppet or a scene makes;
// it reads PAL.finish unless told otherwise, so the same drawing changes finish with the palette.
//   ink     hatching along the form plus grain           (fruit-fly film)
//   riso    rotated halftone dot screen, a little jitter (flipbook)
//   screen  regular dot screen, straight grid            (paper boat)
//   pencil  sparse thin graphite lines and a few dots    (website)
//   flat    nothing
function surface(c, path, box, o = {}) {
  const f = o.finish || PAL.finish, color = o.color || PAL.shade, seed = o.seed || 1, density = o.density ?? .5;
  if (f === 'ink') { hatch(c, path, box, { angle: o.angle ?? 1.2, gap: o.gap ?? 4.5, len: o.len ?? 9, jitter: 3, color, alpha: o.alpha ?? .35, width: o.width ?? 1, seed }); grain(c, path, box, o.grain ?? 140, color, .35, seed + 1, 1.4); }
  else if (f === 'riso') dotScreen(c, path, box, { cell: o.cell ?? 7, color, density, angle: o.angle ?? .26, jitter: .35, seed, alpha: o.alpha ?? .9 });
  else if (f === 'screen') dotScreen(c, path, box, { cell: o.cell ?? 6, color, density, angle: o.angle ?? 0, jitter: .06, seed, alpha: o.alpha ?? .9 });
  else if (f === 'pencil') { hatch(c, path, box, { angle: o.angle ?? 1.1, gap: o.gap ?? 9, len: o.len ?? 30, jitter: 4, color, alpha: o.alpha ?? .22, width: .7, seed }); grain(c, path, box, o.grain ?? 40, color, .3, seed + 1, 1.2); }
}
// dotScreen: halftone dots clipped to a path. density is 0..1 or a function (x,y)=>0..1 for gradients.
function dotScreen(c, path, box, o = {}) {
  const { cell = 7, color = PAL.shade, density = .5, angle = 0, jitter = 0, seed = 1, alpha: al = 1, square = false } = o; const r = rng(seed), dens = typeof density === 'function' ? density : () => density;
  c.save(); c.clip(path); c.fillStyle = color; c.globalAlpha = al;
  const [bx, by, bw, bh] = box, cx = bx + bw / 2, cy = by + bh / 2, R = Math.hypot(bw, bh) / 2, ca = Math.cos(angle), sa = Math.sin(angle);
  c.beginPath();
  for (let v = -R; v <= R; v += cell) for (let u = -R; u <= R; u += cell) { const x = cx + ca * u - sa * v + (r() - .5) * jitter * cell, y = cy + sa * u + ca * v + (r() - .5) * jitter * cell;
    const d = clamp(dens(x, y), 0, 1); if (d <= 0) continue; const rad = cell * .62 * Math.sqrt(d); if (square) c.rect(x - rad, y - rad, rad * 2, rad * 2); else { c.moveTo(x + rad, y); c.arc(x, y, rad, 0, TAU); } }
  c.fill(); c.restore();
}
// plate + printPlate: real colour separations. Draw each ink's coverage in black on a white plate, then print
// the plates in order with multiply blending. Overlaps mix like ink on paper. This is the flipbook's whole look.
function plate() { const L = layer(); const g = L.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); return L; }
const _cov = document.createElement('canvas');
function printPlate(c, src, o = {}) {
  const { cell = 7, ink = PAL.inks[0], angle = .26, jitter = .2, seed = 1, gain = 1, maxCov = .78, blend = 'multiply', al = .95 } = o; const r = rng(seed);
  const sw = Math.ceil(W / cell), sh = Math.ceil(H / cell); _cov.width = sw; _cov.height = sh; const g = _cov.getContext('2d'); g.drawImage(src, 0, 0, sw, sh); const d = g.getImageData(0, 0, sw, sh).data;
  c.save(); resetT(c); c.globalCompositeOperation = blend; c.globalAlpha = al; c.fillStyle = ink; c.beginPath();
  const R = Math.hypot(W, H) / 2, ca = Math.cos(angle), sa = Math.sin(angle);
  for (let v = -R; v <= R; v += cell) for (let u = -R; u <= R; u += cell) { const x = W / 2 + ca * u - sa * v + (r() - .5) * jitter * cell, y = H / 2 + sa * u + ca * v + (r() - .5) * jitter * cell;
    if (x < 0 || y < 0 || x >= W || y >= H) continue; const k = ((y / cell | 0) * sw + (x / cell | 0)) * 4; const cov = clamp((1 - (d[k] * .299 + d[k + 1] * .587 + d[k + 2] * .114) / 255) * gain, 0, maxCov);
    if (cov < .03) continue; const rad = cell * .62 * Math.sqrt(cov); c.moveTo(x + rad, y); c.arc(x, y, rad, 0, TAU); }
  c.fill(); c.restore();
}
// paper: fills the frame with paper colour, optional light bands, and stock grain. Resets the transform.
function paper(c, base = PAL.paper, band = PAL.paperBand, seed = 5) { resetT(c); c.fillStyle = base; c.fillRect(0, 0, W, H);
  if (band) { c.save(); c.translate(W / 2, H / 2); c.rotate(-Math.PI / 4); c.fillStyle = band; for (let i = -6; i <= 6; i++) c.fillRect(-1200, i * 160 - 40, 2400, 80); c.restore(); }
  grain(c, rectPath(0, 0, W, H), [0, 0, W, H], 1400, shade(base, .5), .06, seed, 1.6); }
// night: dark background with star speckle
function night(c, base = PAL.night, seed = 5) { resetT(c); c.fillStyle = base; c.fillRect(0, 0, W, H); grain(c, rectPath(0, 0, W, H), [0, 0, W, H], 400, '#ffffff', .5, seed, 1.6); }

// ===================== LATTICES & PARTICLES =====================
function hexPath(x, y, s) { const p = new Path2D(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; i ? p.lineTo(x + s * Math.cos(a), y + s * Math.sin(a)) : p.moveTo(x + s * Math.cos(a), y + s * Math.sin(a)); } p.closePath(); return p; }
function hexCells(box, s, fn) { const w = Math.sqrt(3) * s, h = 1.5 * s, [bx, by, bw, bh] = box; let row = 0; for (let y = by - s; y < by + bh + s; y += h, row++) { const o = (row % 2) ? w / 2 : 0; for (let x = bx - w + o; x < bx + bw + w; x += w) fn(x, y); } }
function hexLattice(c, box, s, color, al, width = .8) { c.save(); c.strokeStyle = color; c.globalAlpha = al; c.lineWidth = width; hexCells(box, s, (x, y) => c.stroke(hexPath(x, y, s))); c.restore(); }
// aster: a nucleus or spark with rays; g scales ray length (animate 0..1 to ignite)
function aster(c, x, y, r, n, color, seed, g = 1, core = PAL.night, rim = PAL.chalk) { const rr = rng(seed); c.save(); c.strokeStyle = color; c.lineWidth = 1.4; c.globalAlpha = .9;
  for (let i = 0; i < n; i++) { const a = i / n * TAU + (rr() - .5) * .3, r0 = r * 1.6, r1 = r * (2.6 + rr() * 1.6) * g; c.beginPath(); c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); c.stroke(); }
  c.fillStyle = core; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.strokeStyle = rim; c.lineWidth = 1.6; c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + r * .2, y - r * .2, r * .35, 0, TAU); c.fill(); c.restore(); }
// dotBurst: fireworks made of dots on rays (the website's dark section)
function dotBurst(c, x, y, R, rays, color, seed, g = 1) { const r = rng(seed); c.save(); c.fillStyle = color; for (let k = 0; k < rays; k++) { const a = k / rays * TAU + (r() - .5) * .2, n = 6 + (r() * 6 | 0); for (let j = 1; j <= n; j++) { const d = R * g * j / n * (.9 + r() * .2); c.globalAlpha = .9 - j / n * .6; c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.2 + r() * 1.4, 0, TAU); c.fill(); } } c.restore(); }
function speedLines(c, x, y, dir, seed, n = 7, al = .6, color = PAL.ink) { const r = rng(seed); c.save(); c.strokeStyle = color; c.globalAlpha = al; c.lineCap = 'round';
  for (let i = 0; i < n; i++) { const side = (r() - .5) * 70, back = 30 + r() * 40, L = 60 + r() * 120, px = -Math.sin(dir), py = Math.cos(dir), x0 = x - Math.cos(dir) * back + px * side, y0 = y - Math.sin(dir) * back + py * side;
    c.lineWidth = .8 + r() * 1.8; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 - Math.cos(dir) * L, y0 - Math.sin(dir) * L); c.stroke(); } c.restore(); }
function loops(c, x, y, dir, seed, al = .6, cols = PAL.accents) { const r = rng(seed); c.save(); c.translate(x, y); c.rotate(dir); c.globalAlpha = al; c.lineWidth = 1.2;
  cols.forEach((col, k) => { c.strokeStyle = col; c.beginPath(); const A = 14 + r() * 16, w = .12 + r() * .1, ph = r() * TAU; for (let u = 0; u <= 220; u += 4) { const yy = Math.sin(u * w + ph) * A + (k - 2) * 6, xx = -u - Math.cos(u * w * 1.7 + ph) * 8; u ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); }); c.restore(); }

// ===================== MOTIFS =====================
// The recurring devices of the reference films, ready to place.
// seedDot: the anchor dot that sits in every frame of the flipbook, two inks slightly off
function seedDot(c, x, y, r = 9, ink = PAL.ink, ink2 = PAL.accents[0]) { c.save(); if (ink2) { c.fillStyle = ink2; c.globalAlpha = .8; c.beginPath(); c.arc(x + r * .3, y + r * .2, r, 0, TAU); c.fill(); } c.fillStyle = ink; c.globalAlpha = 1; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore(); }
// ripples: concentric crayon rings; pass the radii you want (animate them outward, drop the ones past the frame)
function ripples(c, cx, cy, radii, color, seed, width = 4) { radii.forEach((r, i) => crayon(c, ellPts(cx, cy, r, r, 0, Math.max(40, Math.round(r / 6))), color, width, seed + i, true)); }
function dashedRing(c, cx, cy, r, color, seed, dash = [14, 10], width = 1.5) { c.save(); c.setLineDash(dash); c.lineDashOffset = rng(seed)() * 40; c.strokeStyle = color; c.lineWidth = width; wob(c, ellPts(cx, cy, r, r, 0, 90), 1.5, seed, true); c.restore(); }
// dottedArc: the website's rings, drawn as dots along a circle
function dottedArc(c, cx, cy, r, color, seed, step = 9, size = 1.1) { const rr = rng(seed); c.save(); c.fillStyle = color; const n = Math.round(TAU * r / step); for (let k = 0; k < n; k++) { if (rr() < .12) continue; const a = k / n * TAU; c.beginPath(); c.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, size, 0, TAU); c.fill(); } c.restore(); }
// plant: a pressed-flower drawing, recursive branches with leaf clusters at the tips
function plant(c, x, y, len, depth, seed, o = {}) { const { stem = PAL.ink, leaf = PAL.accents[0], flower = PAL.accents[1], angle = -Math.PI / 2, width = 1.3 } = o; const r = rng(seed); c.save();
  (function branch(x, y, len, a, d, w) { const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; c.strokeStyle = stem; c.lineWidth = w; wob(c, [[x, y], [(x + x2) / 2 + (r() - .5) * len * .2, (y + y2) / 2 + (r() - .5) * len * .2], [x2, y2]], 1, seed + d * 13 + (r() * 100 | 0));
    if (d <= 0) { c.fillStyle = leaf; c.globalAlpha = .7; for (let k = 0; k < 5; k++) { const la = a + (r() - .5) * 2.2; c.beginPath(); c.ellipse(x2 + Math.cos(la) * 6, y2 + Math.sin(la) * 6, 7, 3, la, 0, TAU); c.fill(); } c.globalAlpha = 1;
      if (r() < .4) { c.strokeStyle = flower; c.lineWidth = .9; for (let k = 0; k < 6; k++) { const fa = k / 6 * TAU; c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 + Math.cos(fa) * 8, y2 + Math.sin(fa) * 8); c.stroke(); } } return; }
    const n = 2 + (r() < .5 ? 1 : 0); for (let k = 0; k < n; k++) branch(x2, y2, len * (.55 + r() * .25), a + (r() - .5) * 1.4, d - 1, w * .75); })(x, y, len, angle, depth, width); c.restore(); }
// tornEdge: a Path2D covering the frame below a torn paper line at height y
function tornEdge(y, o = {}) { const { amp = 9, seed = 1, freq = 60 } = o; const r = rng(seed); const p = new Path2D(); p.moveTo(-10, H + 10); p.lineTo(-10, y); for (let x = -10; x <= W + 10; x += freq / 5) p.lineTo(x, y + (r() - .5) * amp * 2 + Math.sin(x / freq) * amp * .6); p.lineTo(W + 10, H + 10); p.closePath(); return p; }
// section: a new paper colour from a torn edge downward, with a soft shadow under the tear
function section(c, y, color, seed = 1) { resetT(c); const p = tornEdge(y, { seed }); c.save(); c.fillStyle = 'rgba(0,0,0,.10)'; c.translate(0, 3); c.fill(p); c.restore(); c.fillStyle = color; c.fill(p); grain(c, p, [0, y, W, H - y], 600, shade(color, .5), .06, seed + 1, 1.6); }
// stickyNote: a paper square with a drawing callback inside
function stickyNote(c, x, y, s, seed, draw) { c.save(); c.translate(x, y); c.rotate((rng(seed)() - .5) * .12); c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(4, 5, s, s); c.fillStyle = tint(PAL.paper, .5); c.fillRect(0, 0, s, s); c.strokeStyle = alpha(PAL.ink, .25); c.lineWidth = 1; c.strokeRect(.5, .5, s - 1, s - 1); if (draw) draw(c, s); c.restore(); }
// thread: a thin line wandering down the frame (the website's spine)
function thread(c, x, seed, color = PAL.accents[0], width = 1.2) { const r = rng(seed); const pts = []; let px = x; for (let y = -10; y <= H + 10; y += 24) { px += (r() - .5) * 26; pts.push([px, y]); } c.save(); c.strokeStyle = color; c.lineWidth = width; c.globalAlpha = .8; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); c.restore(); }
// signOff: the two-word signature with two ink dots, as in every reference film
function signOff(c, a, b, o = {}) { const { x = 540, y = 540, size = 60, ink = PAL.ink, ink2 = PAL.accents[0], progressA = 1, progressB = 1 } = o; const ta = a.slice(0, Math.round(a.length * progressA)), tb = b.slice(0, Math.round(b.length * progressB));
  handText(c, ta, x, y - 12, { size, ink, ink2, align: 'center' }); if (tb) handText(c, tb, x, y + size * 1.1, { size: size * .75, ink, ink2, align: 'center' }); seedDot(c, x - 10, y + size * .35, 6, ink, null); seedDot(c, x + 10, y + size * .35, 6, ink2, null); }

// ===================== REVEALS & COMPOSITION =====================
function selfDraw(c, pts, progress, seed, amp = 1.5, close = false) { const L = pathLength(pts, close); c.save(); c.setLineDash([L * progress, L]); wob(c, pts, amp, seed, close); c.restore(); }
// blot: reveal `src` inside a growing ink blot (screen coords) with a bristly fringe
function blot(c, src, cx, cy, R, seed, fringe = PAL.night) { if (R <= 0) return; const r = rng(seed), path = new Path2D(); for (let i = 0; i < 72; i++) { const a = i / 72 * TAU, rr = R * (1 + (r() - .5) * .16), x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; i ? path.lineTo(x, y) : path.moveTo(x, y); } path.closePath();
  c.save(); resetT(c); c.clip(path); c.drawImage(src, 0, 0, W, H); c.restore(); c.save(); resetT(c); c.strokeStyle = fringe; c.lineWidth = 1.6; c.globalAlpha = .9;
  for (let i = 0; i < 420; i++) { const a = r() * TAU, rad = R * (1 + (r() - .5) * .14), L = 10 + r() * 38, x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); c.stroke(); } c.restore(); }
// iris: draw fn inside a circle, rest untouched (or filled with `outside`)
function iris(c, cx, cy, r, fn, outside) { c.save(); resetT(c); if (outside) { c.fillStyle = outside; c.fillRect(0, 0, W, H); } c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.clip(); fn(c); c.restore(); }
// mosaic: redraw `src` as flat hex cells of size s (compound-eye POV). Clip to an iris first if you want one.
function mosaic(c, src, s, box = [0, 0, W, H], tintCol = 'rgba(120,160,255,.10)') { const ow = src.width, oh = src.height, img = src.getContext('2d').getImageData(0, 0, ow, oh).data; c.save(); resetT(c);
  hexCells(box, s, (x, y) => { const xi = clamp(Math.round(x * S), 0, ow - 1), yi = clamp(Math.round(y * S), 0, oh - 1), k = (yi * ow + xi) * 4; c.fillStyle = `rgb(${img[k] * .92 | 0},${img[k + 1] * .92 | 0},${img[k + 2] * .95 | 0})`; const hp = hexPath(x, y, s); c.fill(hp); c.strokeStyle = 'rgba(20,25,60,.55)'; c.lineWidth = 1; c.stroke(hp); });
  if (tintCol) { c.fillStyle = tintCol; c.fillRect(box[0], box[1], box[2], box[3]); } c.restore(); }
// montage: cards[] are scene functions; shows one per `per` seconds, hard cuts. Returns the index shown.
function montage(c, cards, tau, per = .25, i = 0) { const k = Math.min(cards.length - 1, Math.floor(tau / per)); cards[k](c, tau - k * per, i); return k; }
// badges: every card as a round stamp on concentric dashed rings (the flipbook's gallery). Cards render once and are cached.
const _badge = new Map();
function badges(c, cards, o = {}) { const { cx = 540, cy = 540, r0 = 40, gap = 118, size = 52, ring = PAL.ink, seed = 1, progress = 1, count = cards.length, scale = 1 } = o;
  cards.forEach(fn => { if (_badge.has(fn)) return; const L = layer(); fn(L.getContext('2d'), 0, 0); const s = layer(256, 256); s.getContext('2d').drawImage(L, 0, 0, 256, 256); _badge.set(fn, s); });
  c.save(); resetT(c); c.translate(cx, cy); c.scale(scale, scale); c.translate(-cx, -cy); let placed = 0, k = 1; while (placed < count && k < 8) { const R = r0 + k * gap, n = Math.min(count - placed, Math.max(5, Math.round(TAU * R / (size * 2.5)))); dashedRing(c, cx, cy, R, ring, seed + k);
    for (let j = 0; j < n; j++) { const a = j / n * TAU + k * .5, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R, s = size * progress; if (s > 1) { c.save(); c.beginPath(); c.arc(x, y, s, 0, TAU); c.clip(); c.drawImage(_badge.get(cards[placed]), x - s, y - s, s * 2, s * 2); c.restore(); c.strokeStyle = ring; c.lineWidth = 3; c.beginPath(); c.arc(x, y, s, 0, TAU); c.stroke(); } placed++; } k++; }
  c.restore(); }
// flash: one near-white drawn frame
function flash(c, color = tint(PAL.paper, .6)) { resetT(c); c.fillStyle = color; c.fillRect(0, 0, W, H); }

// ===================== STYLE SHEETS =====================
// styleSheet: every mark in the current palette and finish, labelled. Render it before drawing anything else.
function styleSheet(c, tau = 0, i = 0) { paper(c); c.font = '16px ui-monospace, Menlo, monospace';
  const cell = (col, row, label, fn) => { const x = 40 + col * 260, y = 40 + row * 260; c.save(); c.translate(x, y); fn(); c.restore(); c.fillStyle = PAL.ink; c.fillText(label, x, y + 236); };
  const eb = [20, 20, 200, 160], ell = () => ellPath(120, 100, 100, 78);
  cell(0, 0, 'surface: ' + PAL.finish, () => { c.fillStyle = PAL.fills[0]; c.fill(ell()); surface(c, ell(), eb, { seed: 2 }); c.strokeStyle = PAL.ink; c.lineWidth = 2.4; wob(c, ellPts(120, 100, 100, 78), 2.2, 1, true); });
  cell(1, 0, 'ink', () => { c.fillStyle = PAL.fills[1]; c.fill(ell()); surface(c, ell(), eb, { finish: 'ink', seed: 3 }); });
  cell(2, 0, 'riso', () => { c.fillStyle = PAL.fills[2 % PAL.fills.length]; c.fill(ell()); surface(c, ell(), eb, { finish: 'riso', seed: 4 }); });
  cell(3, 0, 'screen / pencil', () => { const l = ellPath(70, 100, 60, 78), r = ellPath(175, 100, 60, 78); c.fillStyle = PAL.fills[0]; c.fill(l); surface(c, l, [10, 20, 120, 160], { finish: 'screen', seed: 5 }); c.fillStyle = PAL.fills[3 % PAL.fills.length]; c.fill(r); surface(c, r, [115, 20, 120, 160], { finish: 'pencil', seed: 6 }); });
  cell(0, 1, 'scribble, construction', () => { const p = ellPath(120, 100, 80, 60); c.fillStyle = PAL.fills[1]; c.fill(p); c.strokeStyle = PAL.ink; c.lineWidth = 2; wob(c, ellPts(120, 100, 80, 60), 2, 7, true); scribble(c, p, 120, 100, { seed: 8, amp: 6 }); construction(c, 120, 100, 70, 9); });
  cell(1, 1, 'dotScreen gradient', () => { const p = rectPath(20, 20, 200, 160); c.fillStyle = PAL.fills[0]; c.fill(p); dotScreen(c, p, eb, { cell: 7, color: PAL.shade, density: (x, y) => (x - 20) / 200, angle: .26, jitter: .3, seed: 10 }); });
  cell(2, 1, 'ripples, seedDot', () => { ripples(c, 120, 100, [30, 60, 90], PAL.accents[0], 11, 3.5); ripples(c, 120, 100, [45, 75], PAL.accents[1], 12, 3); seedDot(c, 120, 100, 8); });
  cell(3, 1, 'hexLattice, aster', () => { hexLattice(c, eb, 14, PAL.chalkDim, .9, 1); aster(c, 120, 100, 7, 14, PAL.accents[1], 13, 1); });
  cell(0, 2, 'squiggleText', () => { squiggleText(c, 20, 40, 200, 7, { seed: 14, lineH: 20 }); });
  cell(1, 2, 'plant, thread', () => { thread(c, 30, 15, PAL.accents[0]); plant(c, 130, 200, 60, 4, 16, { leaf: PAL.accents[3 % PAL.accents.length], flower: PAL.accents[1] }); });
  cell(2, 2, 'dotBurst, dottedArc', () => { c.fillStyle = PAL.night; c.fillRect(20, 20, 200, 160); dotBurst(c, 120, 100, 70, 14, PAL.accents[2 % PAL.accents.length], 17); dottedArc(c, 120, 100, 30, PAL.chalk, 18); dottedArc(c, 120, 100, 55, PAL.chalk, 19); });
  cell(3, 2, 'speedLines, loops', () => { speedLines(c, 180, 100, 0, 20, 9, .7); loops(c, 180, 100, 0, 21, .8); seedDot(c, 180, 100, 10, PAL.ink, null); });
  cell(0, 3, 'selfDraw ' + sm(0, 2, tau).toFixed(2), () => { c.strokeStyle = PAL.ink; c.lineWidth = 2.5; selfDraw(c, ellPts(120, 100, 100, 78, 0, 80), sm(0, 2, tau), 22, 1.5, true); });
  cell(1, 3, 'stickyNote, section', () => { c.save(); c.beginPath(); c.rect(20, 20, 200, 160); c.clip(); c.translate(-400, -500); c.scale(.5, .5); section(c, 1100, PAL.fills[0], 23); c.restore(); stickyNote(c, 120, 60, 70, 24, (c, s) => { c.strokeStyle = PAL.ink; c.lineWidth = 1; c.beginPath(); for (let a = 0; a < 20; a += .2) c.lineTo(s / 2 + Math.cos(a) * a * 1.4, s / 2 + Math.sin(a) * a * 1.4); c.stroke(); }); });
  cell(2, 3, 'handText (font varies)', () => { handText(c, 'hand text', 20, 110, { size: 50 }); handText(c, 'two inks', 30, 170, { size: 38 }); });
  cell(3, 3, 'palette', () => { const sw = [PAL.paper, PAL.ink, PAL.night, PAL.chalk, ...PAL.fills, PAL.shade, PAL.light, PAL.blush, ...PAL.accents, ...PAL.inks]; sw.forEach((col, k) => { c.fillStyle = col; c.fillRect(20 + (k % 6) * 34, 20 + Math.floor(k / 6) * 34, 30, 30); }); });
}
// paletteSheet: the palette with tint/shade ramps and the harmony of the first fill
function paletteSheet(c) { paper(c); c.font = '18px ui-monospace, Menlo, monospace'; const rows = [['paper', [PAL.paper]], ['ink', [PAL.ink]], ['night', [PAL.night]], ['chalk', [PAL.chalk, PAL.chalkDim]], ['fills', PAL.fills], ['shade/light/blush', [PAL.shade, PAL.light, PAL.blush]], ['accents', PAL.accents], ['inks', PAL.inks]];
  rows.forEach(([name, cols], r) => { c.fillStyle = PAL.ink; c.fillText(name, 40, 70 + r * 100); cols.forEach((col, k) => { ramp(col, 5).forEach((v, j) => { c.fillStyle = v; c.fillRect(260 + k * 130 + j * 22, 40 + r * 100, 20, 50); }); }); });
  const h = harmony(PAL.fills[0]); c.fillStyle = PAL.ink; c.fillText('harmony of fills[0]: complement, triad, analog, split', 40, 900); [h.complement, ...h.triad, ...h.analog, ...h.split].forEach((col, k) => { c.fillStyle = col; c.fillRect(40 + k * 60, 920, 50, 50); }); }

// ===================== TIMELINE & RUNTIME =====================
// defineFilm({ palette, timeline, score }) wires the player, the export buttons and the render hooks.
//   palette   name or object; optional (defaults to the current PAL)
//   timeline  [{ name, dur, fn(c, tau, i) }]   tau = seconds into the scene, i = global drawn frame
//   score     (ac, t0, dest) => schedules notes; optional
let FILM = null, ctx = null, cv = null;
//   format    { ar: '16:9', width: 1920 }; the query string ?ar=9:16&w=1080 overrides it at render time
function defineFilm({ palette, timeline, score, format = {} }) {
  const qs = new URLSearchParams(location.search);
  setFormat({ ar: qs.get('ar') || format.ar || '1:1', width: +qs.get('w') || format.width || undefined });
  if (palette) usePalette(palette);
  cv = document.getElementById('c'); if (!cv) { cv = document.createElement('canvas'); cv.id = 'c'; document.body.prepend(cv); } cv.width = OUT_W; cv.height = OUT_H; ctx = cv.getContext('2d');
  const DUR = timeline.reduce((a, s) => a + s.dur, 0), NDRAW = Math.round(DUR * FPS_DRAW);
  FILM = { timeline, score, DUR, NDRAW };
  window.__drawFrame = i => { cur = -1; show(i); }; window.__NDRAW = NDRAW; window.__FILM = FILM;
  window.__size = { w: OUT_W, h: OUT_H, W, H, S };
  window.__frame = i => { cur = -1; show(i); return cv.toDataURL('image/png'); };            // exact pixels, no screenshot
  window.__grid = (n = 24, cellW = 240) => gridSheet(n, cellW).toDataURL('image/jpeg', .9);  // n evenly spaced frames
  if (qs.has('bare')) { document.body.style.cssText = 'margin:0;padding:0;background:#000'; cv.style.cssText = `width:${OUT_W}px;height:${OUT_H}px;display:block`; document.querySelectorAll('.bar').forEach(b => b.hidden = true); }
  else buildPlayer();
  if (qs.has('grid')) { const img = new Image(); img.src = window.__grid(+qs.get('grid') || 24, 240); img.style.cssText = 'max-width:96vw'; cv.hidden = true; cv.after(img); }
  else show(qs.has('frame') ? +qs.get('frame') : 0);
  window.__ready = true;
}
// gridSheet: n evenly spaced drawn frames tiled 6 across, labelled with index and time. The first thing to look at.
function gridSheet(n = 24, cellW = 240) {
  const cols = 6, rows = Math.ceil(n / cols), cellH = Math.round(cellW * OUT_H / OUT_W), pad = 18, sheet = document.createElement('canvas');
  sheet.width = cols * cellW; sheet.height = rows * (cellH + pad); const g = sheet.getContext('2d'); g.fillStyle = '#141414'; g.fillRect(0, 0, sheet.width, sheet.height);
  g.font = '12px ui-monospace, Menlo, monospace'; g.fillStyle = '#e6e6e6';
  for (let k = 0; k < n; k++) { const i = Math.round(k * (FILM.NDRAW - 1) / Math.max(1, n - 1)); cur = -1; show(i);
    const x = (k % cols) * cellW, y = Math.floor(k / cols) * (cellH + pad); g.drawImage(cv, x, y, cellW, cellH); g.fillText(`${String(i).padStart(3, '0')}  ${(i / FPS_DRAW).toFixed(2)}s`, x + 4, y + cellH + 13); }
  cur = -1; return sheet;
}
function drawFrame(i) { const { timeline } = FILM; const t = i / FPS_DRAW; let acc = 0;
  for (let k = 0; k < timeline.length; k++) { const s = timeline[k]; if (t < acc + s.dur || k === timeline.length - 1) { resetT(ctx); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; s.fn(ctx, t - acc, i); resetT(ctx); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; return s.name; } acc += s.dur; } }
let cur = -1, playing = false, start = 0, sound = false, ac = null, ui = {};
function show(i) { if (i === cur) return; cur = i; const name = drawFrame(i); if (ui.scrub) { ui.scrub.value = i; ui.info.textContent = `draw ${String(i).padStart(3, '0')}/${FILM.NDRAW}  t=${(i / FPS_DRAW).toFixed(2)}s  ${name}  ${W}x${H}@${OUT_W}px`; } }
function loop() { if (!playing) return; const t = ((performance.now() - start) / 1000) % FILM.DUR; show(Math.floor(t * FPS_DRAW)); requestAnimationFrame(loop); }
function buildPlayer() {
  const bar = document.createElement('div'); bar.className = 'bar'; bar.innerHTML = '<button id="play">play</button><button id="snd">sound: off</button><input id="scrub" type="range" min="0" max="0" value="0"><span id="info"></span><button id="exp">export PNG frames</button><button id="wav">export score.wav</button><span id="msg"></span>';
  cv.after(bar); ui = { scrub: bar.querySelector('#scrub'), info: bar.querySelector('#info'), msg: bar.querySelector('#msg') }; ui.scrub.max = FILM.NDRAW - 1;
  const play = bar.querySelector('#play'); play.onclick = () => { playing = !playing; play.textContent = playing ? 'pause' : 'play'; if (playing) { start = performance.now(); if (sound && FILM.score) { ac = ac || new AudioContext(); ac.resume(); FILM.score(ac, ac.currentTime + .05, ac.destination); } loop(); } };
  bar.querySelector('#snd').onclick = e => { sound = !sound; e.target.textContent = 'sound: ' + (sound ? 'on' : 'off'); };
  ui.scrub.oninput = () => { playing = false; play.textContent = 'play'; show(+ui.scrub.value); };
  bar.querySelector('#exp').onclick = async () => { if (!window.showDirectoryPicker) { ui.msg.textContent = 'no File System Access API here: use render.mjs'; return; } const dir = await showDirectoryPicker({ mode: 'readwrite' }); playing = false;
    for (let i = 0; i < FILM.NDRAW; i++) { cur = -1; show(i); const blob = await new Promise(res => cv.toBlob(res, 'image/png')); const fh = await dir.getFileHandle(String(i).padStart(4, '0') + '.png', { create: true }); const w = await fh.createWritable(); await w.write(blob); await w.close(); ui.msg.textContent = `exported ${i + 1}/${FILM.NDRAW}`; }
    ui.msg.textContent = `done. ffmpeg -framerate ${FPS_DRAW} -i %04d.png -r ${FPS_OUT} -pix_fmt yuv420p -crf 18 out.mp4`; };
  bar.querySelector('#wav').onclick = async () => { if (!FILM.score) { ui.msg.textContent = 'no score defined'; return; } const sr = 48000, oac = new OfflineAudioContext(2, Math.ceil(sr * FILM.DUR), sr); FILM.score(oac, 0, oac.destination); const buf = await oac.startRendering();
    const n = buf.length, out = new DataView(new ArrayBuffer(44 + n * 4)), ws = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true); out.setUint32(24, sr, true); out.setUint32(28, sr * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); ws(36, 'data'); out.setUint32(40, n * 4, true);
    const L = buf.getChannelData(0), R = buf.getChannelData(1); let o = 44; for (let i = 0; i < n; i++) { out.setInt16(o, clamp(L[i], -1, 1) * 32767, true); out.setInt16(o + 2, clamp(R[i], -1, 1) * 32767, true); o += 4; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out], { type: 'audio/wav' })); a.download = 'score.wav'; a.click(); ui.msg.textContent = 'score.wav: ffmpeg -i out.mp4 -i score.wav -c:v copy -c:a aac -shortest final.mp4'; };
}
// note: one enveloped oscillator, the building block of every score
function note(ac, master, f, t0, t, d, type = 'triangle', g = .25) { const o = ac.createOscillator(), e = ac.createGain(); o.type = type; o.frequency.value = f; e.gain.setValueAtTime(0, t0 + t); e.gain.linearRampToValueAtTime(g, t0 + t + .02); e.gain.exponentialRampToValueAtTime(.0008, t0 + t + d); o.connect(e); e.connect(master); o.start(t0 + t); o.stop(t0 + t + d + .05); }
function noiseBurst(ac, master, t0, t, d, g = .3, seed = 1) { const sr = ac.sampleRate, buf = ac.createBuffer(1, Math.ceil(sr * d), sr), ch = buf.getChannelData(0), r = rng(seed); for (let i = 0; i < ch.length; i++) ch[i] = (r() * 2 - 1) * Math.pow(1 - i / ch.length, 2); const s = ac.createBufferSource(); s.buffer = buf; const e = ac.createGain(); e.gain.value = g; s.connect(e); e.connect(master); s.start(t0 + t); }
const pentHz = (o, s, base = 220) => base * Math.pow(2, o + [0, 2, 4, 7, 9][s % 5] / 12);
