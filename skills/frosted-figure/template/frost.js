// frost.js — a person photo as a "figure behind frosted glass": a soft gradient-mapped
// silhouette on off-white, rim fading to a pale tint, darkest where the body is deepest and
// the photo is darkest, lifting toward the bottom, with film grain. Pure functions over
// ImageData, no dependencies.
//
//   const {D, used} = frostDensity(imageData, opts, seg?)    // slow part: cutout + blurs
//   const img = frostColour(D, w, h, opts)                   // fast part: gradient map + grain
//
// seg (optional): { person, head } Float32Array(w*h) probabilities from a person segmenter
// (MediaPipe's selfie_multiclass gives both). Without it the backdrop is colour-keyed, which only
// works on plain or smoothly graded backdrops. `used` reports what the 'auto' options resolved to.

// density -> colour. green was sampled from the reference look (white bg -> lime rim -> deep
// green core); the others keep the same lightness steps. makePalette(hex) builds one for any colour.
const PALETTES = {
  green: [
    [0.00, '#f9f9f9'], [0.08, '#eaf8dc'], [0.20, '#b2ee86'], [0.30, '#99e96b'],
    [0.42, '#5ad84a'], [0.54, '#3bcd36'], [0.64, '#2ac02a'], [0.74, '#17a71a'],
    [0.83, '#0c8d0f'], [0.92, '#036207'], [1.00, '#013f00'],
  ],
  gold: [
    [0.00, '#f9f9f9'], [0.08, '#fbf4dc'], [0.20, '#fbe7a0'], [0.30, '#f9dc76'],
    [0.42, '#f6cc45'], [0.54, '#f5be1e'], [0.64, '#eca80a'], [0.74, '#d68f00'],
    [0.83, '#b37300'], [0.92, '#8a5800'], [1.00, '#5e3a00'],
  ],
  // lemon on top; darks stop at deep amber-orange (a true dark yellow reads olive/brown)
  yellow: [
    [0.00, '#f9f9f9'], [0.08, '#fcf8dc'], [0.20, '#fdf2a0'], [0.30, '#fdec74'],
    [0.42, '#fce340'], [0.54, '#fad81a'], [0.64, '#f4c800'], [0.74, '#f0b000'],
    [0.83, '#e59500'], [0.92, '#c47300'], [1.00, '#9a5200'],
  ],
  pink: [
    [0.00, '#f9f9f9'], [0.08, '#fcecf3'], [0.20, '#fbc6dd'], [0.30, '#f9a9cb'],
    [0.42, '#f585b6'], [0.54, '#f064a3'], [0.64, '#e84893'], [0.74, '#d4307f'],
    [0.83, '#b51f6a'], [0.92, '#861150'], [1.00, '#580834'],
  ],
  blue: [
    [0.00, '#f9f9f9'], [0.08, '#eaf1fd'], [0.20, '#bcd4fb'], [0.30, '#9cc0f9'],
    [0.42, '#6ea2f5'], [0.54, '#4a87f0'], [0.64, '#3270e8'], [0.74, '#1f58d6'],
    [0.83, '#1443b5'], [0.92, '#0b2e86'], [1.00, '#061c58'],
  ],
};

const DEFAULTS = {
  keyLo: 35, keyHi: 75,          // colour-key cutout: backdrop distance -> mask ramp (RGB units)
  shadeLo: 'auto', shadeHi: 'auto', // luminance range that counts as lit (lit = less dense);
                                 // auto = 5th..85th percentile inside the person (else 0.08..0.38)
  base: 0.24, shadow: 0.42, depth: 0.45, // density = mask * (base + shadow*dark + depth*inside²)
  deep: 0.07,                    // sigma of the "how far inside the figure" term
  blurNear: 'auto', blurFar: 'auto', farMix: 0.35, // frosting: two gaussian sigmas, mixed;
                                 // auto = 0.021 x head width (needs seg.head, else 0.015), far = 3.3 x near
  fadeStart: 0.6, fadeAmt: 0.85, // lift density toward the bottom edge
  grain: 0.035, lumaGrain: 0.018,
  seed: 7,
  palette: 'green',              // a PALETTES name or any '#rrggbb'
  // every sigma above is a fraction of image width, so results don't depend on resolution
};

const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

// ---------- palettes ----------

// OKLab (Björn Ottosson). Used to transplant the green ladder's lightness/chroma onto any hue.
const toLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const toSrgb = c => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function rgbToOklab([R, G, B]) {
  const r = toLin(R), g = toLin(G), b = toLin(B);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
function oklabToLinear([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076926573 * s];
}
const inGamut = lin => lin.every(c => c >= -1e-4 && c <= 1 + 1e-4);
const toHex = lin => '#' + lin.map(c => Math.round(Math.min(255, Math.max(0, toSrgb(Math.min(1, Math.max(0, c)))))).toString(16).padStart(2, '0')).join('');

// Any colour -> an 11-stop ladder. The given colour lands on the 0.54 stop (the "signature" mid
// tone); lighter stops climb to the paper white, darker ones sink to a deep core, and chroma
// follows the green ladder's shape, clipped to the sRGB gamut.
function makePalette(target) {
  const green = PALETTES.green.map(([t, c]) => [t, rgbToOklab(hex(c))]);
  const [Lt, at, bt] = rgbToOklab(hex(target));
  const Ct = Math.hypot(at, bt), h = Math.atan2(bt, at);
  const ai = green.findIndex(([t]) => t === 0.54);
  const [Lw] = green[0][1], [La, aa, ba] = green[ai][1], [Lc] = green.at(-1)[1];
  const Ca = Math.hypot(aa, ba), Lcore = Math.min(Lc, Lt * 0.45);
  return green.map(([t, [L, a, b]], i) => {
    const L2 = i <= ai ? Lw + (L - Lw) * (Lw - Lt) / (Lw - La) : Lt + (L - La) * (Lt - Lcore) / (La - Lc);
    let C = Math.hypot(a, b) * Ct / Ca;
    while (C > 0 && !inGamut(oklabToLinear([L2, C * Math.cos(h), C * Math.sin(h)]))) C -= 0.002;
    return [t, i === 0 ? '#f9f9f9' : toHex(oklabToLinear([L2, Math.max(0, C) * Math.cos(h), Math.max(0, C) * Math.sin(h)]))];
  });
}

function resolvePalette(p) {
  if (Array.isArray(p)) return p;
  if (PALETTES[p]) return PALETTES[p];
  if (/^#?[0-9a-f]{6}$/i.test(p)) return makePalette(p[0] === '#' ? p : '#' + p);
  throw new Error(`unknown palette "${p}" (use ${Object.keys(PALETTES).join(', ')} or a #rrggbb)`);
}

function buildLut(stops, n = 1024) {
  const cols = stops.map(([t, c]) => [t, hex(c)]);
  const lut = new Uint8ClampedArray(n * 3);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    let k = 0;
    while (k < cols.length - 2 && t > cols[k + 1][0]) k++;
    const [t0, c0] = cols[k], [t1, c1] = cols[k + 1];
    const u = (t - t0) / (t1 - t0);
    const f = smoothstep(0, 1, u) * 0.35 + u * 0.65;
    for (let j = 0; j < 3; j++) lut[i * 3 + j] = c0[j] + (c1[j] - c0[j]) * f;
  }
  return lut;
}

// ---------- blur ----------

// gaussian ~ three box blurs (clamped edges so a figure running off-frame stays solid)
function boxSizes(sigma, n = 3) {
  let wl = Math.floor(Math.sqrt((12 * sigma * sigma) / n + 1));
  if (wl % 2 === 0) wl--;
  const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
  return Array.from({ length: n }, (_, i) => (i < m ? wl : wl + 2));
}

function boxPass(src, dst, w, h, r, horiz) {
  const n = horiz ? w : h, lines = horiz ? h : w;
  const stride = horiz ? 1 : w, lineStride = horiz ? w : 1;
  const inv = 1 / (2 * r + 1);
  for (let l = 0; l < lines; l++) {
    const base = l * lineStride;
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += src[base + Math.min(n - 1, Math.max(0, k)) * stride];
    for (let i = 0; i < n; i++) {
      dst[base + i * stride] = acc * inv;
      acc += src[base + Math.min(n - 1, i + r + 1) * stride] - src[base + Math.max(0, i - r) * stride];
    }
  }
}

function blur(a, w, h, sigma) {
  const s = a.slice();
  if (sigma < 0.5) return s;
  const t = new Float32Array(a.length);
  for (const b of boxSizes(sigma)) {
    const r = (b - 1) / 2;
    boxPass(s, t, w, h, r, true);
    boxPass(t, s, w, h, r, false);
  }
  return s;
}

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- colour-key cutout (no-ML fallback) ----------

function lstsq(rows, ys) {
  // normal equations + tiny ridge, gaussian elimination with partial pivoting
  const n = rows[0].length;
  const A = Array.from({ length: n }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === j ? 1e-6 : 0)));
  rows.forEach((f, k) => {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) A[i][j] += f[i] * f[j];
      A[i][n] += f[i] * ys[k];
    }
  });
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let j = c; j <= n; j++) A[r][j] -= f * A[c][j];
    }
  }
  return A.map((row, i) => row[n] / row[i]);
}

// Backdrop as a smooth colour field fitted to the top, left and right borders. The subject often
// runs off-frame (a jacket can be ~40% of the border), so RANSAC a plane first (a light->black
// step can't win the vote), then refine a quadratic on the plane's inliers.
function backdropModel(data, w, h) {
  const S = [];
  const add = (x, y) => { const i = (y * w + x) * 4; S.push([x / w, y / h, data[i], data[i + 1], data[i + 2]]); };
  for (let y = 0; y < 4; y++) for (let x = 0; x < w; x += 2) add(x, y);
  for (let y = 4; y < h; y += 2) for (const x of [0, 1, 2, 3, w - 4, w - 3, w - 2, w - 1]) add(x, y);
  const lin = (x, y) => [1, x, y];
  const quad = (x, y) => [1, x, y, x * x, x * y, y * y];
  const fit = (feats, set) => [0, 1, 2].map(c => lstsq(set.map(s => feats(s[0], s[1])), set.map(s => s[2 + c])));
  const resid = (feats, coef, s) => { const f = feats(s[0], s[1]); return Math.hypot(...[0, 1, 2].map(c => s[2 + c] - dot(f, coef[c]))); };

  const rand = mulberry32(1);
  let best, bestCount = -1;
  for (let it = 0; it < 300; it++) {
    const coef = fit(lin, [0, 1, 2].map(() => S[Math.floor(rand() * S.length)]));
    let count = 0;
    for (const s of S) if (resid(lin, coef, s) < 25) count++;
    if (count > bestCount) { bestCount = count; best = coef; }
  }
  let keep = S.filter(s => resid(lin, best, s) < 25), coef;
  for (let it = 0; it < 3; it++) {
    coef = fit(quad, keep);
    const res = S.map(s => resid(quad, coef, s));
    const med = res.filter(r => r < 25).sort((a, b) => a - b);
    const thr = Math.max(10, 3 * (med[med.length >> 1] || 5));
    keep = S.filter((_, k) => res[k] < thr);
  }
  return (x, y) => { const f = quad(x / w, y / h); return coef.map(c => Math.min(255, Math.max(0, dot(f, c)))); };
}

function keyMask(data, w, h, o) {
  const bgAt = backdropModel(data, w, h);
  const mask = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, bg = bgAt(x, y);
      mask[i] = smoothstep(o.keyLo, o.keyHi, Math.hypot(data[i * 4] - bg[0], data[i * 4 + 1] - bg[1], data[i * 4 + 2] - bg[2]));
    }
  }
  return fillHoles(closeMask(blur(mask, w, h, 0.003 * w), w, h), w, h);
}

// soft morphological close: speckle (bleached hair that matches the backdrop) blurs to ~0.5 and
// gets filled; clean outer edges move a few px, which the frosting hides anyway
function closeMask(m, w, h) {
  const b = blur(m, w, h, 0.012 * w);
  return m.map((v, i) => Math.max(v, smoothstep(0.35, 0.6, b[i])));
}

// any backdrop-looking region not connected to the frame edge is a hole in the subject
function fillHoles(m, w, h) {
  const seen = new Uint8Array(w * h), stack = [];
  const push = i => { if (!seen[i] && m[i] < 0.5) { seen[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop(), x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < w * (h - 1)) push(i + w);
  }
  return m.map((v, i) => (seen[i] ? v : 1)); // holes and the inner half of soft edges -> solid
}

// ---------- the effect ----------

function frostDensity(img, opts = {}, seg = null) {
  const o = { ...DEFAULTS, ...opts };
  const { width: w, height: h, data } = img;
  const N = w * h;
  // segmenters leave a ~10% confidence floor over the backdrop: stretch it out so the paper stays clean
  const m = seg?.person
    ? fillHoles(blur(seg.person.map(v => smoothstep(0.3, 0.7, v)), w, h, 0.002 * w), w, h)
    : keyMask(data, w, h, o);

  const lum = new Float32Array(N);
  for (let i = 0; i < N; i++) lum[i] = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;

  // auto-levels on the person only, so low-key (navy suit on black) and high-key photos both
  // spread across the palette instead of saturating at one end
  if (o.shadeLo === 'auto' || o.shadeHi === 'auto') {
    const v = [];
    for (let i = 0; i < N; i += 7) if (m[i] > 0.5) v.push(lum[i]);
    v.sort((a, b) => a - b);
    const pct = q => v[Math.min(v.length - 1, Math.floor(q * v.length))];
    if (o.shadeLo === 'auto') o.shadeLo = v.length > 100 ? pct(0.05) : 0.08;
    if (o.shadeHi === 'auto') o.shadeHi = v.length > 100 ? Math.max(o.shadeLo + 0.1, pct(0.85)) : 0.38;
  }
  // blur scales with the head, not the frame: a face that's a quarter of the frame needs far less
  // frosting than a close-up to stay readable (fitted on two hand-tuned photos: 0.75 -> 0.015, 0.45 -> 0.008)
  if (o.blurNear === 'auto') {
    let a = 0;
    if (seg?.head) for (let i = 0; i < N; i++) a += seg.head[i] > 0.5 ? 1 : 0;
    o.blurNear = a > 0.002 * N ? Math.min(0.02, Math.max(0.008, 0.021 * Math.sqrt(a) / w)) : 0.015;
  }
  if (o.blurFar === 'auto') o.blurFar = o.blurNear * 3.3;

  const shadow = new Float32Array(N);
  for (let i = 0; i < N; i++) shadow[i] = 1 - smoothstep(o.shadeLo, o.shadeHi, lum[i]);
  const deep = blur(m, w, h, o.deep * w);
  const raw = new Float32Array(N);
  for (let i = 0; i < N; i++) raw[i] = m[i] * (o.base + o.shadow * shadow[i] + o.depth * deep[i] * deep[i]); // squared: dark core, bright rim

  const near = blur(raw, w, h, o.blurNear * w);
  const far = blur(raw, w, h, o.blurFar * w);
  const D = new Float32Array(N);
  for (let y = 0; y < h; y++) {
    const fade = 1 - o.fadeAmt * Math.pow(smoothstep(o.fadeStart * h, h, y), 1.2);
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      D[i] = (near[i] * (1 - o.farMix) + far[i] * o.farMix) * fade;
    }
  }
  const r3 = x => Math.round(x * 1000) / 1000;
  return { D, mask: m, used: { shadeLo: r3(o.shadeLo), shadeHi: r3(o.shadeHi), blurNear: r3(o.blurNear), blurFar: r3(o.blurFar) } };
}

function frostColour(D, w, h, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const lut = buildLut(resolvePalette(o.palette));
  const rand = mulberry32(o.seed);
  const gauss = () => (rand() + rand() + rand() - 1.5) * 1.41;
  const out = new ImageData(w, h), od = out.data;
  for (let i = 0; i < w * h; i++) {
    let d = D[i] + gauss() * o.grain * Math.min(1, D[i] * 6); // grain lives in the figure, faint on bare paper
    d = Math.min(1, Math.max(0, d));
    const k = Math.round(d * 1023) * 3, n = gauss() * o.lumaGrain * 255;
    od[i * 4] = lut[k] + n;
    od[i * 4 + 1] = lut[k + 1] + n;
    od[i * 4 + 2] = lut[k + 2] + n;
    od[i * 4 + 3] = 255;
  }
  return out;
}

function greyImage(a, w, h) {
  const out = new ImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    out.data.fill(Math.round(a[i] * 255), i * 4, i * 4 + 3);
    out.data[i * 4 + 3] = 255;
  }
  return out;
}

Object.assign(globalThis, { frostDensity, frostColour, makePalette, resolvePalette, greyImage, FROST_PALETTES: PALETTES, FROST_DEFAULTS: DEFAULTS });
