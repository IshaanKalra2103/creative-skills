/* svpaint.js — a 2D painting kit for Spider-Verse-style illustration. Classic script, no deps, works from file://.
 *
 * Everything here is drawn, not rendered: shapes, brush texture, ink, spray, dots.
 *   shapes     P.smooth, P.limb, P.rough, P.homography        (contours you draw, walls you construct in perspective)
 *   paint      P.dryBrush, P.spray, P.inkStroke                (texture and line)
 *   print      P.dots, P.dotPattern, P.hatch, P.screenGradient  (Ben-Day and hatching instead of gradients)
 *   light      P.toon                                          (stacked offset silhouettes: rim, shadow, mid dots, lit crescent)
 *   time       P.twos                                          (12 drawings a second)
 *   output     P.compositor                                    (layers + colour-plate misregistration + grain)
 */
(function (G) {
  'use strict';
  const P = (G.P = {});
  const TAU = Math.PI * 2;
  const clamp = (P.clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x));
  P.lerp = (a, b, t) => a + (b - a) * t;
  P.lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  P.rng = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const hex = (P.hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; });
  P.mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
  P.twos = (t) => Math.floor(t * 12) / 12;
  P.ones = (t) => Math.floor(t * 24) / 24;

  // ------------------------------------------------------------ paths
  // closed or open Catmull-Rom through points → Path2D of cubic Béziers
  P.smooth = (pts, closed = true, k = 0.5) => {
    const p = new Path2D(), n = pts.length;
    if (n < 2) return p;
    const at = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    p.moveTo(pts[0][0], pts[0][1]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      p.bezierCurveTo(p1[0] + ((p2[0] - p0[0]) * k) / 3, p1[1] + ((p2[1] - p0[1]) * k) / 3, p2[0] - ((p3[0] - p1[0]) * k) / 3, p2[1] - ((p3[1] - p1[1]) * k) / 3, p2[0], p2[1]);
    }
    if (closed) p.closePath();
    return p;
  };
  P.poly = (pts) => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); return p; };
  // subdivide + jitter a polygon so its edge looks painted, not cut
  P.rough = (pts, amp = 1.5, step = 18, seed = 1) => {
    const r = P.rng(seed), out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / step));
      for (let k = 0; k < n; k++) { const t = k / n; out.push([a[0] + (b[0] - a[0]) * t + (r() - 0.5) * amp * 2, a[1] + (b[1] - a[1]) * t + (r() - 0.5) * amp * 2]); }
    }
    return out;
  };
  P.bbox = (pts) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    return [x0, y0, x1, y1];
  };
  P.translate = (path, dx, dy) => { const p = new Path2D(); p.addPath(path, new DOMMatrix().translateSelf(dx, dy)); return p; };

  // a limb drawn as a contour around a bone A→B. prof: [[t, wA, wB], ...] half-widths on each side of the bone
  // (side A = left of the direction of travel on screen). Ends are rounded. Returns {pts, path, at(t, s)}.
  P.limb = (A, B, prof, o = {}) => {
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = uy, ny = -ux;
    const side = (s) => prof.map(([t, wa, wb]) => { const w = s > 0 ? wa : wb; return [A[0] + dx * t + nx * w * s, A[1] + dy * t + ny * w * s]; });
    const left = side(1), right = side(-1), capLen = o.capLen ?? 0.8, capN = 5;
    // rounded end: sweeps from the +n side to the -n side around c, bulging along `dir`
    const cap = (c, wFrom, wTo, dir, sgn) => {
      const out = [];
      for (let i = 1; i < capN; i++) {
        const a = (i / capN) * Math.PI, w = wFrom + (wTo - wFrom) * (i / capN), cs = Math.cos(a) * sgn;
        out.push([c[0] + nx * cs * w + dir * ux * Math.sin(a) * w * capLen, c[1] + ny * cs * w + dir * uy * Math.sin(a) * w * capLen]);
      }
      return out;
    };
    const f0 = prof[0], f1 = prof[prof.length - 1];
    const cB = [A[0] + dx * f1[0], A[1] + dy * f1[0]], cA = [A[0] + dx * f0[0], A[1] + dy * f0[0]];
    const pts = [...left, ...cap(cB, f1[1], f1[2], 1, 1), ...right.slice().reverse(), ...cap(cA, f0[2], f0[1], -1, -1)];
    // width at t on one side
    const wAt = (t, s) => {
      for (let i = 0; i < prof.length - 1; i++) {
        const [t0, a0, b0] = prof[i], [t1, a1, b1] = prof[i + 1];
        if (t >= t0 && t <= t1) { const k = (t - t0) / (t1 - t0 || 1); return s > 0 ? a0 + (a1 - a0) * k : b0 + (b1 - b0) * k; }
      }
      return s > 0 ? f1[1] : f1[2];
    };
    // point on the limb: t along the bone, s in -1..1 across it
    const at = (t, s) => { const w = wAt(t, s >= 0 ? 1 : -1) * Math.abs(s); return [A[0] + dx * t + nx * w * Math.sign(s || 1), A[1] + dy * t + ny * w * Math.sign(s || 1)]; };
    return { pts, path: P.smooth(pts, true, o.tension ?? 0.9), at, A, B, u: [ux, uy], n: [nx, ny], L };
  };

  // map a unit square onto a quad (perspective-correct): H(u, v) → screen. quad = [p00, p10, p11, p01]
  P.homography = (q) => {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
    const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    const den = dx1 * dy2 - dx2 * dy1;
    const g = (dx3 * dy2 - dx2 * dy3) / den, h = (dx1 * dy3 - dx3 * dy1) / den;
    const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
    return (u, v) => { const w = g * u + h * v + 1; return [(a * u + b * v + c) / w, (d * u + e * v + f) / w]; };
  };
  // lay a flat image onto a perspective quad: split it into small triangles, each mapped affinely
  // map(u, v) → screen, u/v in 0..1 over the image (v = 0 at the image's bottom edge)
  P.warp = (ctx, img, map, nx = 14, ny = 8) => {
    const w = img.width, h = img.height;
    const tri = (s0, s1, s2, d0, d1, d2) => {
      // affine taking source triangle to destination triangle, clipped to the destination (grown 0.6px to hide seams)
      const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3, g = (p) => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + (dx / l) * 0.6, p[1] + (dy / l) * 0.6]; };
      const [x0, y0] = s0, [x1, y1] = s1, [x2, y2] = s2, den = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
      const a = ((d1[0] - d0[0]) * (y2 - y0) - (d2[0] - d0[0]) * (y1 - y0)) / den, b = ((d1[1] - d0[1]) * (y2 - y0) - (d2[1] - d0[1]) * (y1 - y0)) / den;
      const c = ((d2[0] - d0[0]) * (x1 - x0) - (d1[0] - d0[0]) * (x2 - x0)) / den, d = ((d2[1] - d0[1]) * (x1 - x0) - (d1[1] - d0[1]) * (x2 - x0)) / den;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(...g(d0)); ctx.lineTo(...g(d1)); ctx.lineTo(...g(d2)); ctx.closePath(); ctx.clip();
      ctx.transform(a, b, c, d, d0[0] - a * x0 - c * y0, d0[1] - b * x0 - d * y0);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    };
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const u0 = i / nx, u1 = (i + 1) / nx, v0 = j / ny, v1 = (j + 1) / ny;
      const S = (u, v) => [u * w, (1 - v) * h], D = (u, v) => map(u, v);
      tri(S(u0, v0), S(u1, v0), S(u1, v1), D(u0, v0), D(u1, v0), D(u1, v1));
      tri(S(u0, v0), S(u1, v1), S(u0, v1), D(u0, v0), D(u1, v1), D(u0, v1));
    }
  };
  // intersection of line (a1→a2) with line (b1→b2)
  P.meet = (a1, a2, b1, b2) => {
    const d = (a1[0] - a2[0]) * (b1[1] - b2[1]) - (a1[1] - a2[1]) * (b1[0] - b2[0]);
    const t = ((a1[0] - b1[0]) * (b1[1] - b2[1]) - (a1[1] - b1[1]) * (b1[0] - b2[0])) / d;
    return [a1[0] + t * (a2[0] - a1[0]), a1[1] + t * (a2[1] - a1[1])];
  };

  // ------------------------------------------------------------ paint
  // dry brush: many thin semi-opaque strokes laid in one direction inside a clip
  P.dryBrush = (ctx, clip, color, o = {}) => {
    const r = P.rng(o.seed || 9), ang = o.angle ?? -Math.PI / 2, len = o.len || 60, w = o.width || 2, alpha = o.alpha ?? 0.25;
    const [x0, y0, x1, y1] = o.box || [0, 0, ctx.canvas.width, ctx.canvas.height];
    const n = o.count || Math.round(((x1 - x0) * (y1 - y0)) / (len * w * 2.2));
    ctx.save();
    if (clip) ctx.clip(clip);
    ctx.strokeStyle = color; ctx.lineCap = 'round';
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), l = len * (0.4 + r() * 0.8);
      let c2 = ca, s2 = sa;
      if (o.angleAt) { const a = o.angleAt(x, y); c2 = Math.cos(a); s2 = Math.sin(a); }
      ctx.globalAlpha = alpha * (0.35 + r() * 0.65);
      ctx.lineWidth = w * (0.5 + r());
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + c2 * l, y + s2 * l); ctx.stroke();
    }
    ctx.restore();
  };

  // spray-can overspray: speckles thinning out from a set of seed points or along a path's points
  P.spray = (ctx, pts, color, o = {}) => {
    const r = P.rng(o.seed || 3), n = o.count || 300, reach = o.reach || 8, size = o.size || 1;
    ctx.fillStyle = color; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const k = Math.floor(r() * pts.length), a = pts[k], b = pts[(k + 1) % pts.length], t = r();
      const d = Math.pow(r(), 2.2) * reach, th = r() * TAU, s = size * (0.35 + r() * 0.9);
      const x = a[0] + (b[0] - a[0]) * t + Math.cos(th) * d, y = a[1] + (b[1] - a[1]) * t + Math.sin(th) * d;
      ctx.moveTo(x + s, y); ctx.arc(x, y, s, 0, TAU);
    }
    ctx.fill();
  };

  // a brush-pen ink stroke as a filled shape: pressure swells in the middle, tapers at the ends, wobbles a little
  P.inkStroke = (ctx, pts, o = {}) => {
    if (pts.length < 2) return;
    const w = o.width || 3, r = P.rng(o.seed || 1), wob = o.wobble ?? 0.6, t0 = o.taper0 ?? 1, t1 = o.taper1 ?? 1;
    // resample for even spacing
    const S = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 4));
      for (let k = 1; k <= n; k++) S.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
    const L = [], R = [], n = S.length;
    let jit = 0;
    for (let i = 0; i < n; i++) {
      const a = S[Math.max(0, i - 1)], b = S[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const t = i / (n - 1);
      jit += (r() - 0.5) * 0.35; jit *= 0.85;
      const press = (o.press ? o.press(t) : 1) * Math.min(1, t / (0.18 * t0 + 1e-3), (1 - t) / (0.18 * t1 + 1e-3)) * (1 + jit);
      const hw = Math.max(0.25, (w / 2) * (t0 === 0 && t1 === 0 ? 1 : 0.35 + 0.65 * press));
      const wx = (r() - 0.5) * wob, wy = (r() - 0.5) * wob;
      L.push([S[i][0] - (dy / l) * hw + wx, S[i][1] + (dx / l) * hw + wy]);
      R.push([S[i][0] + (dy / l) * hw + wx, S[i][1] - (dx / l) * hw + wy]);
    }
    ctx.fillStyle = o.color || '#0b0812';
    ctx.fill(P.smooth([...L, ...R.reverse()], true, 0.6));
  };

  // ------------------------------------------------------------ print
  const patCache = new Map();
  // a fixed dot screen as a pattern (fast, for fills redrawn every frame)
  P.dotPattern = (ctx, color, cell, r, angle = 0.785, bg = null) => {
    const key = [color, cell, r, angle, bg].join('|');
    if (!patCache.has(key)) {
      const c = document.createElement('canvas'), s = Math.max(2, Math.round(cell));
      c.width = c.height = s;
      const x = c.getContext('2d');
      if (bg) { x.fillStyle = bg; x.fillRect(0, 0, s, s); }
      x.fillStyle = color;
      for (const [cx, cy] of [[s / 2, s / 2]]) { x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); }
      patCache.set(key, c);
    }
    const p = ctx.createPattern(patCache.get(key), 'repeat');
    p.setTransform(new DOMMatrix().rotateSelf((angle * 180) / Math.PI));
    return p;
  };
  // Ben-Day dots whose radius varies with position: radius(x, y) → px
  P.dots = (ctx, clip, color, o = {}) => {
    const cell = o.cell || 7, ang = o.angle ?? 0.785, radius = o.radius || (() => cell * 0.3);
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const [bx0, by0, bx1, by1] = o.box || [0, 0, W, H];
    const x0 = Math.max(0, bx0), y0 = Math.max(0, by0), x1 = Math.min(W, bx1), y1 = Math.min(H, by1);
    if (x1 <= x0 || y1 <= y0) return;
    ctx.save();
    if (clip) ctx.clip(clip);
    ctx.fillStyle = color; ctx.beginPath();
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const cs = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => [x * ca + y * sa, -x * sa + y * ca]);
    const [u0, v0, u1, v1] = P.bbox(cs);
    for (let v = Math.floor(v0 / cell) * cell; v <= v1 + cell; v += cell)
      for (let u = Math.floor(u0 / cell) * cell; u <= u1 + cell; u += cell) {
        const x = u * ca - v * sa, y = u * sa + v * ca;
        if (x < x0 - cell || x > x1 + cell || y < y0 - cell || y > y1 + cell) continue;
        const rr = radius(x, y);
        if (rr > 0.25) { ctx.moveTo(x + rr, y); ctx.arc(x, y, rr, 0, TAU); }
      }
    ctx.fill(); ctx.restore();
  };
  // hatching: parallel dashes inside a clip, weight(x, y) 0..1 thins them out
  P.hatch = (ctx, clip, color, o = {}) => {
    const gap = o.gap || 6, ang = o.angle ?? -0.9, w = o.width || 1, weight = o.weight || (() => 1), seg = o.seg || 16;
    const r = P.rng(o.seed || 7), jit = o.jitter ?? 0.5;
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const [bx0, by0, bx1, by1] = o.box || [0, 0, W, H];
    const x0 = Math.max(0, bx0), y0 = Math.max(0, by0), x1 = Math.min(W, bx1), y1 = Math.min(H, by1);
    if (x1 <= x0 || y1 <= y0) return;
    ctx.save();
    if (clip) ctx.clip(clip);
    ctx.strokeStyle = color; ctx.lineCap = 'round';
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const cs = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => [x * ca + y * sa, -x * sa + y * ca]);
    const [u0, v0, u1, v1] = P.bbox(cs);
    const buckets = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    for (let v = Math.floor(v0 / gap) * gap; v <= v1; v += gap) {
      const vj = v + (r() - 0.5) * gap * jit;
      for (let u = u0; u < u1; u += seg) {
        const xm = (u + seg / 2) * ca - vj * sa, ym = (u + seg / 2) * sa + vj * ca;
        if (xm < x0 - seg || xm > x1 + seg || ym < y0 - seg || ym > y1 + seg) continue;
        const k = weight(xm, ym);
        if (k <= 0.05) continue;
        const p = buckets[Math.min(3, Math.floor(k * 4))];
        p.moveTo(u * ca - vj * sa, u * sa + vj * ca);
        p.lineTo((u + seg * (0.75 + r() * 0.3)) * ca - vj * sa, (u + seg * (0.75 + r() * 0.3)) * sa + vj * ca);
      }
    }
    buckets.forEach((p, i) => { ctx.lineWidth = (w * (i + 1)) / 4; ctx.stroke(p); });
    ctx.restore();
  };
  // a gradient printed as an AM dot screen between flat colour stops. t(x, y) → 0..1
  P.screenGradient = (W, H, t, stops, o = {}) => {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx = cv.getContext('2d'), img = cx.createImageData(W, H), d = img.data;
    const cols = stops.map(hex), n = cols.length - 1;
    const cell = o.cell || 9, ang = o.angle ?? 0.26, band = o.band ?? 0.45, ca = Math.cos(ang), sa = Math.sin(ang);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const s = clamp(t(x, y)) * n, i = Math.min(Math.floor(s), n - 1);
        const f = clamp((s - i - band / 2) / (1 - band));
        const u = (x * ca + y * sa) / cell, v = (-x * sa + y * ca) / cell;
        const c = 0.5 + 0.25 * (Math.cos(TAU * u) + Math.cos(TAU * v)) > 1 - f ? cols[i + 1] : cols[i];
        const k = (y * W + x) * 4;
        d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
      }
    cx.putImageData(img, 0, 0);
    return cv;
  };

  // ------------------------------------------------------------ light
  // Toon light on any drawn shape by stacking offset copies of its own silhouette (no gradients):
  //   base shadow → rim crescent on the rim side → mid band of dots → lit crescent on the key side.
  // key/rimDir are unit screen vectors pointing TOWARD the light. widths in px.
  const BIG = (() => { const p = new Path2D(); p.rect(-1e5, -1e5, 2e5, 2e5); return p; })();
  const outside = (path) => { const p = new Path2D(BIG); p.addPath(path); return p; };
  P.toon = (ctx, path, o) => {
    const { key, rimDir } = o;
    ctx.save();
    ctx.clip(path);
    ctx.fillStyle = o.shadow; ctx.fill(path);
    if (o.shadowDots) { ctx.fillStyle = o.shadowDots; ctx.fill(path); }
    const band = (dir, w, fill) => {
      ctx.save();
      ctx.clip(outside(P.translate(path, -dir[0] * w, -dir[1] * w)), 'evenodd');
      ctx.fillStyle = fill; ctx.fill(path);
      ctx.restore();
    };
    if (rimDir && o.rimW) band(rimDir, o.rimW, o.rim);
    if (o.midW) band(key, o.midW, o.mid);
    if (o.litW) band(key, o.litW, o.lit);
    if (o.hotW) band(key, o.hotW, o.hot);
    ctx.restore();
  };
  // the region lit by the key light (for re-drawing lines brighter inside it)
  P.litClip = (ctx, path, key, w) => { ctx.clip(path); ctx.clip(outside(P.translate(path, -key[0] * w, -key[1] * w)), 'evenodd'); };

  // ------------------------------------------------------------ compositor (WebGL2)
  // Layers stacked back to front, each with parallax `par` and misregistration `mis` (px).
  // Out of focus = the red and blue plates slip apart. Never blur.
  P.compositor = (canvas) => {
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true });
    if (!gl) return null;
    const N = 6;
    let body = '';
    for (let i = 0; i < N; i++)
      body += `if (uN > ${i}) { vec2 q = (uv - .5) * uScale + .5 + uPar[${i}]; vec2 m = uMis[${i}];
        vec4 R = texture(uL${i}, q + m), Gg = texture(uL${i}, q), B = texture(uL${i}, q - m);
        c = vec3(mix(c.r, R.r, R.a), mix(c.g, Gg.g, Gg.a), mix(c.b, B.b, B.a)); }\n`;
    const fs = `#version 300 es
      precision highp float;
      ${Array.from({ length: N }, (_, i) => `uniform sampler2D uL${i};`).join('\n')}
      uniform vec2 uPar[${N}]; uniform vec2 uMis[${N}]; uniform int uN;
      uniform vec2 uRes; uniform float uGrain, uSeed, uGlitch, uVignette, uScale;
      out vec4 o;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        vec2 uv = gl_FragCoord.xy / uRes; uv.y = 1. - uv.y;
        if (uGlitch > 0.) {
          float band = floor(uv.y * 34. + uSeed * 13.);
          if (h(vec2(band, uSeed)) < uGlitch * .4) uv.x += (h(vec2(band + 3., uSeed)) - .5) * .1 * uGlitch;
        }
        vec3 c = vec3(0.);
        ${body}
        if (uGlitch > 0.) { float g = step(1. - uGlitch * .3, h(floor(uv * vec2(5., 26.)) + uSeed * 2.)); c = mix(c, c.gbr, g); }
        vec2 d = uv - .5; c *= 1. - uVignette * dot(d, d) * 1.5;
        c += (h(gl_FragCoord.xy + uSeed * 91.) - .5) * uGrain;
        o = vec4(c, 1.);
      }`;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, '#version 300 es\nin vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog); gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(prog, n);
    const tex = [];
    for (let i = 0; i < N; i++) {
      const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      gl.uniform1i(U(`uL${i}`), i);
      tex.push(t);
    }
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    return {
      upload(i, cv) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tex[i]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); },
      draw(layers, o = {}) {
        const W = canvas.width, H = canvas.height;
        gl.viewport(0, 0, W, H);
        const par = new Float32Array(N * 2), mis = new Float32Array(N * 2);
        layers.forEach((l, i) => { par[i * 2] = (l.par?.[0] || 0) / W; par[i * 2 + 1] = (l.par?.[1] || 0) / H; mis[i * 2] = (l.mis?.[0] || 0) / W; mis[i * 2 + 1] = (l.mis?.[1] || 0) / H; });
        gl.uniform2fv(U('uPar'), par); gl.uniform2fv(U('uMis'), mis); gl.uniform1i(U('uN'), layers.length);
        gl.uniform2f(U('uRes'), W, H); gl.uniform1f(U('uGrain'), o.grain ?? 0.05); gl.uniform1f(U('uSeed'), o.seed || 0);
        gl.uniform1f(U('uGlitch'), o.glitch || 0); gl.uniform1f(U('uVignette'), o.vignette ?? 0.25); gl.uniform1f(U('uScale'), o.scale ?? 1);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
    };
  };
})(window);
