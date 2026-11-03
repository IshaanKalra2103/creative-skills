// ---------- procedural gouache painter (Canvas2D) ----------
const TIP = 64;
const Tips = {};
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }

function makeTip(fn) {
  const c = mkCanvas(TIP, TIP), g = c.getContext('2d');
  const img = g.createImageData(TIP, TIP);
  for (let y = 0; y < TIP; y++) for (let x = 0; x < TIP; x++) {
    const u = (x + 0.5) / TIP * 2 - 1, v = (y + 0.5) / TIP * 2 - 1;
    const a = clamp(fn(u, v));
    const i = (y * TIP + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.round(a * 255);
  }
  g.putImageData(img, 0, 0);
  return c;
}

function buildTips() {
  Tips.round = []; Tips.leaf = []; Tips.single = []; Tips.flat = []; Tips.dry = []; Tips.soft = [];
  for (let k = 0; k < 6; k++) {
    const s = k * 13.7 + 3;
    Tips.round.push(makeTip((u, v) => {
      const r = Math.hypot(u, v), a = Math.atan2(v, u);
      const R = 0.74 + 0.2 * vnoise2(Math.cos(a) * 1.7 + s, Math.sin(a) * 1.7 + s) + 0.05 * vnoise2(Math.cos(a) * 6 + s, Math.sin(a) * 6);
      const edge = clamp((R - r) / 0.045);
      const bristle = 0.86 + 0.14 * vnoise2(u * 2 + s, v * 16);
      return edge * bristle;
    }));
  }
  // leaf clusters: union of 3-5 lobes, scalloped
  for (let k = 0; k < 8; k++) {
    const rng = new RNG(100 + k);
    const lobes = [];
    const n = rng.int(3, 5);
    for (let i = 0; i < n; i++) {
      const a = rng.next() * TAU, d = rng.range(0.1, 0.42);
      lobes.push([Math.cos(a) * d, Math.sin(a) * d * 0.8, rng.range(0.32, 0.5)]);
    }
    const s = k * 7.1;
    Tips.leaf.push(makeTip((u, v) => {
      let m = 0;
      for (const [lx, ly, lr] of lobes) {
        const r = Math.hypot(u - lx, v - ly), a = Math.atan2(v - ly, u - lx);
        const R = lr * (0.86 + 0.22 * vnoise2(Math.cos(a) * 2.2 + s, Math.sin(a) * 2.2 + lr * 9));
        m = Math.max(m, clamp((R - r) / 0.04));
      }
      return m * (0.9 + 0.1 * vnoise2(u * 9 + s, v * 9));
    }));
  }
  // single leaves (pointing along +u)
  for (let k = 0; k < 5; k++) {
    const s = k * 5.3, bend = (k - 2) * 0.06, fat = 0.34 + k * 0.035;
    Tips.single.push(makeTip((u, v) => {
      const t = (u + 1) / 2; // 0 base .. 1 tip
      if (t < 0.04 || t > 0.98) return 0;
      const w = fat * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.9) * (1 + 0.08 * vnoise1(t * 9 + s));
      const vv = v - bend * Math.sin(Math.PI * t);
      return clamp((w - Math.abs(vv)) / 0.035);
    }));
  }
  // flat brush strokes (along u)
  for (let k = 0; k < 6; k++) {
    const s = k * 11.3 + 1;
    Tips.flat.push(makeTip((u, v) => {
      const halfw = 0.42 + 0.12 * vnoise2(u * 2.5 + s, s);
      const side = clamp((halfw - Math.abs(v)) / 0.06);
      const endR = 0.82 + 0.14 * vnoise2(v * 5 + s, s * 2);
      const ends = clamp((endR - Math.abs(u)) / 0.12);
      const bristle = 0.62 + 0.38 * vnoise2(v * 22 + s, u * 0.7);
      return side * ends * bristle;
    }));
  }
  for (let k = 0; k < 4; k++) {
    const s = k * 4.7 + 9;
    Tips.dry.push(makeTip((u, v) => {
      const side = clamp((0.45 - Math.abs(v)) / 0.05);
      const ends = clamp((0.88 - Math.abs(u) - 0.1 * vnoise2(v * 6 + s, 0)) / 0.15);
      const st = vnoise2(v * 18 + s, u * 1.3 + s);
      return side * ends * smooth(0.38, 0.55, st);
    }));
  }
  // soft airbrush (for mist / glow)
  Tips.soft.push(makeTip((u, v) => { const r = Math.hypot(u, v); return Math.pow(clamp(1 - r), 1.8); }));
  Tips.soft.push(makeTip((u, v) => { const r = Math.hypot(u, v * 1.0); const n = 0.8 + 0.2 * vnoise2(u * 3, v * 3); return Math.pow(clamp(1 - r), 1.3) * n; }));
}

const tintCache = new Map();
function tinted(name, idx, col) {
  const q = 40;
  const r = Math.round(clamp(col[0]) * q), gg = Math.round(clamp(col[1]) * q), b = Math.round(clamp(col[2]) * q);
  const key = name + idx + ':' + r + ',' + gg + ',' + b;
  let c = tintCache.get(key);
  if (!c) {
    const src = Tips[name][idx % Tips[name].length];
    c = mkCanvas(TIP, TIP);
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = `rgb(${Math.round(r / q * 255)},${Math.round(gg / q * 255)},${Math.round(b / q * 255)})`;
    g.fillRect(0, 0, TIP, TIP);
    tintCache.set(key, c);
  }
  return c;
}

function dab(g, name, idx, x, y, sx, sy, ang, col, a = 1) {
  const tip = tinted(name, idx, col);
  const c = Math.cos(ang), s = Math.sin(ang), kx = sx / TIP, ky = sy / TIP;
  g.setTransform(c * kx, s * kx, -s * ky, c * ky, x, y);
  g.globalAlpha = a;
  g.drawImage(tip, -TIP / 2, -TIP / 2);
}
function resetG(g) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }

// tapered filled stroke along polyline pts [[x,y],...], widths per point
function taper(g, pts, widths, col, a = 1) {
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(pts.length - 1, i + 1)];
    let dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const w = widths[i] / 2;
    L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); R.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = a; g.fillStyle = css(col);
  g.beginPath(); g.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < L.length; i++) g.lineTo(L[i][0], L[i][1]);
  for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.closePath(); g.fill();
}
function bez(p0, p1, p2, p3, n) {
  const o = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, it = 1 - t;
    o.push([it * it * it * p0[0] + 3 * it * it * t * p1[0] + 3 * it * t * t * p2[0] + t * t * t * p3[0],
    it * it * it * p0[1] + 3 * it * it * t * p1[1] + 3 * it * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return o;
}
function qbez(p0, p1, p2, n) {
  const o = [];
  for (let i = 0; i <= n; i++) { const t = i / n, it = 1 - t; o.push([it * it * p0[0] + 2 * it * t * p1[0] + t * t * p2[0], it * it * p0[1] + 2 * it * t * p1[1] + t * t * p2[1]]); }
  return o;
}

// ---------------- painters ----------------
// palette helper with fog
function fogPal(pal, fog, amt) {
  const o = {};
  for (const k in pal) o[k] = mixc(pal[k], fog, amt);
  return o;
}

// vertical gradient sky laid in with horizontal flat strokes
function paintSky(g, w, h, stops, rng) {
  // stops: [[y01, color],...]
  const at = (y) => {
    const t = y / h;
    for (let i = 0; i < stops.length - 1; i++) {
      if (t <= stops[i + 1][0]) return mixc(stops[i][1], stops[i + 1][1], smooth(stops[i][0], stops[i + 1][0], t));
    }
    return stops[stops.length - 1][1];
  };
  const grd = g.createLinearGradient(0, 0, 0, h);
  for (const [y, c] of stops) grd.addColorStop(y, css(c));
  resetG(g); g.fillStyle = grd; g.fillRect(0, 0, w, h);
  // brushwork
  const n = Math.round(w * h / 900);
  for (let i = 0; i < n; i++) {
    const x = rng.range(-40, w + 40), y = rng.range(-20, h + 20);
    const c = jit(at(y), rng, 0.018, 0.01);
    dab(g, 'flat', rng.int(0, 5), x, y, rng.range(60, 160), rng.range(14, 30), rng.range(-0.06, 0.06), c, rng.range(0.25, 0.5));
  }
  resetG(g);
}

// soft cloud bank (stratus with lit undersides)
function paintClouds(g, P, rng) {
  // P: {x0,x1,y,thick,body,lit,shadow,count}
  for (let i = 0; i < P.count; i++) {
    const x = rng.range(P.x0, P.x1), y = P.y + rng.gauss() * P.thick * 0.35;
    const len = rng.range(80, 260) * (P.scale || 1);
    const th = len * rng.range(0.08, 0.16);
    dab(g, 'flat', rng.int(0, 5), x, y, len, th * 1.3, rng.range(-0.03, 0.03), jit(P.shadow, rng, 0.02), rng.range(0.35, 0.7));
    dab(g, 'flat', rng.int(0, 5), x + rng.range(-10, 10), y - th * 0.35, len * 0.9, th, rng.range(-0.03, 0.03), jit(P.body, rng, 0.02), rng.range(0.45, 0.8));
    dab(g, 'flat', rng.int(0, 5), x + rng.range(-20, 20), y + th * 0.25, len * 0.7, th * 0.45, rng.range(-0.02, 0.02), jit(P.lit, rng, 0.02), rng.range(0.5, 0.9));
  }
  resetG(g);
}

// distant tree line silhouette (layer of crowns), fogged
function paintTreeline(g, w, P, rng) {
  // P: {base (y), height, var, color, top (rim color), rim (0..1), fade (mist color), step, conifer (0..1)}
  const step = P.step || 14;
  const tops = [];
  let x = -30;
  while (x < w + 30) {
    const hgt = P.height * (0.55 + 0.45 * fbm2(x * 0.004 + P.seed, P.seed * 0.3, 3)) + rng.gauss() * P.height * 0.06;
    const isCon = rng.next() < (P.conifer || 0);
    const cw = isCon ? rng.range(14, 26) * (P.scale || 1) : rng.range(26, 60) * (P.scale || 1);
    tops.push({ x, y: P.base - hgt, cw, isCon });
    x += cw * rng.range(0.45, 0.75);
  }
  resetG(g);
  g.fillStyle = css(P.color);
  // body
  g.beginPath(); g.moveTo(-40, P.base + (P.below || 200));
  for (const t of tops) g.lineTo(t.x, t.y + t.cw * 0.3);
  g.lineTo(w + 40, P.base + (P.below || 200)); g.closePath(); g.fill();
  // crowns as dabs (rounded tops) / conifer spikes
  for (const t of tops) {
    if (t.isCon) {
      const pts = [[t.x, t.y - t.cw * 0.8], [t.x + t.cw * 0.55, t.y + t.cw * 1.6], [t.x - t.cw * 0.55, t.y + t.cw * 1.6]];
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = css(P.color);
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k <= 6; k++) {
        const f = k / 6; const yy = t.y - t.cw * 0.8 + f * t.cw * 2.4; const ww = f * t.cw * 0.6;
        g.lineTo(t.x + ww, yy); g.lineTo(t.x + ww * 0.6, yy + 3);
      }
      for (let k = 6; k >= 1; k--) {
        const f = k / 6; const yy = t.y - t.cw * 0.8 + f * t.cw * 2.4; const ww = f * t.cw * 0.6;
        g.lineTo(t.x - ww * 0.6, yy + 3); g.lineTo(t.x - ww, yy);
      }
      g.closePath(); g.fill();
    } else {
      const n = 3 + Math.floor(t.cw / 12);
      for (let k = 0; k < n; k++) {
        const ox = rng.range(-0.45, 0.45) * t.cw, oy = rng.range(-0.1, 0.5) * t.cw;
        dab(g, 'leaf', rng.int(0, 7), t.x + ox, t.y + oy, t.cw * rng.range(0.5, 0.8), t.cw * rng.range(0.45, 0.7), rng.next() * TAU, jit(P.color, rng, 0.012, 0.006));
      }
    }
  }
  // rim light on sun side
  if (P.rim > 0) {
    for (const t of tops) {
      if (rng.next() > P.rim) continue;
      const n = 2 + Math.floor(t.cw / 16);
      for (let k = 0; k < n; k++) {
        const ox = (P.lightX || 1) * rng.range(0.05, 0.4) * t.cw, oy = rng.range(-0.1, 0.2) * t.cw;
        dab(g, 'leaf', rng.int(0, 7), t.x + ox, t.y + oy - t.cw * 0.12, t.cw * rng.range(0.2, 0.36), t.cw * rng.range(0.15, 0.28), rng.next() * TAU, jit(P.top, rng, 0.02), rng.range(0.5, 0.9));
      }
    }
  }
  resetG(g);
  // fade into mist at bottom
  if (P.fade) {
    const grd = g.createLinearGradient(0, P.base - P.height * 0.6, 0, P.base + 30);
    grd.addColorStop(0, css(P.fade, 0)); grd.addColorStop(1, css(P.fade, P.fadeAmt || 0.85));
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = grd; g.fillRect(0, P.base - P.height * 1.5, w, P.height * 2 + 400);
    resetG(g);
  }
}

// broadleaf crown made of stacked clumps (Ghibli style): each clump is a solid mass
// with a leafy stamped edge, then mid/light shapes laid in on the lit side.
const _clumpTmp = { c: null, g: null };
function clumpCanvas(sz) {
  if (!_clumpTmp.c || _clumpTmp.c.width < sz) { _clumpTmp.c = mkCanvas(sz, sz); _clumpTmp.g = _clumpTmp.c.getContext('2d'); }
  const g = _clumpTmp.g; resetG(g); g.clearRect(0, 0, sz, sz); return g;
}
// filled mass: polygon interior + leaf stamps around the boundary
function leafMass(g, x, y, rx, ry, col, rng, leaf, o = {}) {
  const n = 18, pts = [];
  const s0 = rng.next() * 100;
  for (let k = 0; k < n; k++) {
    const a = k / n * TAU;
    const m = 0.78 + 0.3 * vnoise2(Math.cos(a) * 1.3 + s0, Math.sin(a) * 1.3 + s0);
    pts.push([x + Math.cos(a) * rx * m * 0.86, y + Math.sin(a) * ry * m * 0.86]);
  }
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = css(col);
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath(); g.fill();
  const per = Math.PI * (rx + ry);
  const ns = Math.round(per / (leaf * (o.spacing || 0.9))) + 6;
  for (let k = 0; k < ns; k++) {
    const a = rng.next() * TAU;
    const m = 0.78 + 0.3 * vnoise2(Math.cos(a) * 1.3 + s0, Math.sin(a) * 1.3 + s0);
    const px = x + Math.cos(a) * rx * m * rng.range(0.8, 0.98), py = y + Math.sin(a) * ry * m * rng.range(0.8, 0.98);
    const s = leaf * rng.range(1.2, 2.2) * (o.stamp || 1);
    dab(g, 'leaf', rng.int(0, 7), px, py, s, s * rng.range(0.75, 1), rng.next() * TAU, jit(col, rng, o.jv ?? 0.015, 0.008));
  }
  // interior brushwork (low contrast)
  const ni = Math.round(rx * ry / (leaf * leaf) * 0.5 * (o.tex ?? 1));
  for (let k = 0; k < ni; k++) {
    const a = rng.next() * TAU, d = Math.sqrt(rng.next()) * 0.8;
    const s = leaf * rng.range(1, 1.8);
    dab(g, 'leaf', rng.int(0, 7), x + Math.cos(a) * d * rx, y + Math.sin(a) * d * ry, s, s * 0.85, rng.next() * TAU, jit(col, rng, o.jv ?? 0.025, 0.012), 0.8);
  }
}
function paintCrown(g, P) {
  const rng = new RNG(P.seed);
  const { cx, cy, rx, ry } = P;
  let L = P.light || [0.6, -0.8]; const ll = Math.hypot(L[0], L[1]); L = [L[0] / ll, L[1] / ll];
  const pal = P.pal;
  const leaf = P.leaf || Math.max(5, rx * 0.085);
  const clumps = [];
  const n = P.clumps || Math.round(4 + (rx * ry) / (Math.min(rx, ry) * Math.min(rx, ry) * 0.12));
  for (let i = 0; i < n; i++) {
    const a = rng.next() * TAU, rr = Math.sqrt(rng.next()) * 0.72;
    const x = cx + Math.cos(a) * rr * rx, y = cy + Math.sin(a) * rr * ry;
    const r = (0.3 + 0.22 * rng.next()) * Math.min(rx, ry) * (1.05 - 0.3 * rr);
    clumps.push({ x, y, r });
  }
  const nr = Math.round(5 + (rx + ry) / Math.min(rx, ry) * 2.2);
  for (let i = 0; i < nr; i++) {
    const a = (i / nr) * TAU + rng.range(-0.25, 0.25);
    if (Math.sin(a) > 0.5 && rng.next() < 0.5) continue;
    clumps.push({ x: cx + Math.cos(a) * rx * rng.range(0.7, 0.86), y: cy + Math.sin(a) * ry * rng.range(0.66, 0.84), r: Math.min(rx, ry) * rng.range(0.2, 0.32) });
  }
  clumps.sort((a, b) => (b.y - a.y) + (rng.next() - 0.5) * 6);
  const vtone = (y) => smooth(cy + ry, cy - ry, y);
  const la = P.lightAmt ?? 1;
  for (const c of clumps) {
    const vt = vtone(c.y);
    const R = c.r * 1.35, sz = Math.ceil(R * 2 + leaf * 6);
    const q = clumpCanvas(sz), o = sz / 2;
    const darkC = mixc(pal.deep, pal.dark, 0.3 + 0.7 * vt);
    leafMass(q, o, o, c.r, c.r * 0.88, darkC, rng, leaf);
    q.globalCompositeOperation = 'source-atop';
    // mid shape toward the light
    const off = c.r * 0.3 * la;
    leafMass(q, o + L[0] * off, o + L[1] * off, c.r * (0.55 + 0.25 * la), c.r * (0.5 + 0.22 * la), mixc(pal.dark, pal.mid, 0.5 + 0.5 * vt), rng, leaf * 0.8, { stamp: 0.9 });
    q.globalCompositeOperation = 'source-atop';
    if (la > 0.2) {
      const off2 = c.r * 0.55 * la;
      leafMass(q, o + L[0] * off2, o + L[1] * off2, c.r * 0.38 * la + c.r * 0.05, c.r * 0.32 * la + c.r * 0.05, mixc(pal.mid, pal.light, 0.35 + 0.65 * vt), rng, leaf * 0.65, { stamp: 0.8, tex: 0.6 });
      q.globalCompositeOperation = 'source-atop';
    }
    // sparkle leaves on the lit rim
    if (pal.hi) {
      const nh = Math.round(c.r / leaf * 2.5 * (P.hiAmt ?? 1) * la);
      for (let i = 0; i < nh; i++) {
        const a = Math.atan2(L[1], L[0]) + rng.gauss() * 0.6, d = c.r * rng.range(0.6, 0.95);
        const s = leaf * rng.range(0.5, 0.9);
        dab(q, 'leaf', rng.int(0, 7), o + Math.cos(a) * d, o + Math.sin(a) * d * 0.9, s, s * 0.8, rng.next() * TAU, jit(pal.hi, rng, 0.03), rng.range(0.7, 1));
      }
      q.globalCompositeOperation = 'source-atop';
    }
    // shadow under the clump's belly
    const nsd = Math.round(c.r / leaf * 2);
    for (let i = 0; i < nsd; i++) {
      const a = Math.atan2(-L[1], -L[0]) + rng.gauss() * 0.5, d = c.r * rng.range(0.55, 0.9);
      const s = leaf * rng.range(1, 1.8);
      dab(q, 'leaf', rng.int(0, 7), o + Math.cos(a) * d, o + Math.sin(a) * d * 0.9, s, s * 0.8, rng.next() * TAU, jit(pal.deep, rng, 0.02), 0.9);
    }
    resetG(g);
    g.drawImage(q.canvas, 0, 0, sz, sz, c.x - o, c.y - o, sz, sz);
  }
  // stray edge leaves
  const ne = Math.round((rx + ry) / leaf * 1.6 * (P.edgeLeaves ?? 1));
  for (let i = 0; i < ne; i++) {
    const a = rng.next() * TAU;
    const x = cx + Math.cos(a) * rx * rng.range(0.9, 1.04), y = cy + Math.sin(a) * ry * rng.range(0.86, 1.0);
    const lit = Math.cos(a) * L[0] + Math.sin(a) * L[1];
    const col = lit > 0.4 ? mixc(pal.mid, pal.light, rng.next() * 0.5) : mixc(pal.deep, pal.dark, rng.next());
    dab(g, 'single', rng.int(0, 4), x, y, leaf * rng.range(1.0, 1.6), leaf * rng.range(0.45, 0.7), a + rng.range(-0.7, 0.7), jit(col, rng, 0.03));
  }
  if (pal.sky && P.holes) {
    for (let i = 0; i < P.holes; i++) {
      const a = rng.next() * TAU, d = rng.range(0.35, 0.75);
      const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
      const s = leaf * rng.range(0.8, 1.8);
      dab(g, 'leaf', rng.int(0, 7), x, y, s, s * 0.8, rng.next() * TAU, jit(pal.sky, rng, 0.02), 1);
      if (rng.next() < 0.7) dab(g, 'leaf', rng.int(0, 7), x + s * 0.4, y + s * 0.2, s * 0.6, s * 0.5, rng.next() * TAU, jit(pal.sky, rng, 0.02), 1);
    }
  }
  resetG(g);
}

// trunk with bark brushwork; returns centerline points for branch attachment
function paintTrunk(g, P) {
  const rng = new RNG(P.seed);
  const { x0, y0, x1, y1, w0, w1 } = P;
  const lx = P.lightX ?? 1; // +1 light from right
  const n = 40;
  const c1 = [lerp(x0, x1, 0.33) + rng.range(-1, 1) * w0 * 0.6, lerp(y0, y1, 0.33)];
  const c2 = [lerp(x0, x1, 0.66) + rng.range(-1, 1) * w0 * 0.6, lerp(y0, y1, 0.66)];
  const pts = bez([x0, y0], c1, c2, [x1, y1], n);
  const ws = pts.map((p, i) => {
    const t = i / n;
    let w = lerp(w0, w1, Math.pow(t, 0.8));
    w *= 1 + 0.06 * (vnoise1(t * 7 + P.seed) - 0.5);
    if (P.flare) w *= 1 + P.flare * Math.pow(clamp(1 - t * 7), 2);
    return w;
  });
  const pal = P.pal;
  taper(g, pts, ws, pal.mid);
  // dark side band (opposite light)
  const dark = [], dw = [];
  for (let i = 0; i <= n; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(n, i + 1)];
    let dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const nx = -dy * -lx, ny = dx * -lx; // normal toward dark side
    const f = 0.22 + 0.06 * Math.sin(i * 0.7 + P.seed);
    dark.push([pts[i][0] + nx * ws[i] * f, pts[i][1] + ny * ws[i] * f]);
    dw.push(ws[i] * (1 - f * 2) * 1.02 + 0.5);
  }
  taper(g, dark, dw, pal.dark);
  // bark dry strokes
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nb = Math.round(len * (w0 + w1) / 2 / 60 * (P.barkDensity || 1));
  for (let i = 0; i < nb; i++) {
    const t = rng.next(); const k = Math.round(t * n);
    const across = rng.range(-0.45, 0.45);
    const p0 = pts[Math.max(0, k - 1)], p1 = pts[Math.min(n, k + 1)];
    let dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const x = pts[k][0] - dy * across * ws[k], y = pts[k][1] + dx * across * ws[k];
    const sideLit = across * -lx; // >0 on lit side? (normal convention)
    let col;
    const r = rng.next();
    if (sideLit < -0.25 && r < 0.5) col = pal.light; else if (r < 0.55) col = pal.dark; else col = mixc(pal.mid, pal.dark, rng.next());
    if (pal.moss && rng.next() < (P.moss || 0) * (1 - t)) col = mixc(pal.moss, pal.mid, rng.next() * 0.4);
    dab(g, 'dry', rng.int(0, 3), x, y, rng.range(14, 36) * Math.max(0.5, ws[k] / 40), rng.range(4, 8) * Math.max(0.6, ws[k] / 60), Math.atan2(dy, dx), jit(col, rng, 0.03), rng.range(0.4, 0.85));
  }
  // rim light (lit edge)
  if (pal.rim) {
    const rim = [], rw = [];
    for (let i = 0; i <= n; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(n, i + 1)];
      let dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const nx = -dy * lx, ny = dx * lx;
      rim.push([pts[i][0] - nx * ws[i] * 0.43, pts[i][1] - ny * ws[i] * 0.43]);
      const brk = vnoise1(i * 0.35 + P.seed * 3);
      rw.push(Math.max(0, (brk - 0.35)) * ws[i] * 0.16 * (P.rimW || 1));
    }
    taper(g, rim, rw, pal.rim, 0.9);
  }
  resetG(g);
  return { pts, ws };
}

// branch: tapered curve
function paintBranch(g, p0, p1, p2, w0, w1, col, rng) {
  const pts = qbez(p0, p1, p2, 16);
  taper(g, pts, pts.map((_, i) => lerp(w0, w1, i / 16)), col);
}

function paintGrassTuft(g, x, y, P, rng) {
  // P: {h, n, cols:[...], lean, w}
  const n = P.n || 9;
  for (let i = 0; i < n; i++) {
    const h = P.h * rng.range(0.5, 1.1);
    const lean = (P.lean || 0) + rng.range(-0.5, 0.5);
    const bx = x + rng.range(-1, 1) * P.h * 0.25;
    const tip = [bx + lean * h * 0.6, y - h];
    const mid = [bx + lean * h * 0.15, y - h * 0.55];
    const pts = qbez([bx, y], mid, tip, 8);
    const w = (P.w || 3) * rng.range(0.7, 1.3);
    taper(g, pts, pts.map((_, k) => w * (1 - k / 8) + 0.3), jit(rng.pick(P.cols), rng, 0.03), 1);
  }
}

function paintFern(g, x, y, P, rng) {
  // P: {len, ang (radians, -PI/2 up), curl, cols:{dark,mid,light}, leaf}
  const n = 24;
  const len = P.len, curl = P.curl || 0.5;
  const pts = [];
  let px = x, py = y, ang = P.ang;
  for (let i = 0; i <= n; i++) {
    pts.push([px, py]);
    px += Math.cos(ang) * len / n; py += Math.sin(ang) * len / n;
    ang += curl * 0.05 * (i / n) * (P.dir || 1) + 0.012 * (P.dir || 1);
  }
  taper(g, pts, pts.map((_, i) => 3.2 * (1 - i / n) + 0.6), P.cols.dark);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const p = pts[i], q = pts[i + 1] || p;
    const da = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const s = P.leaf * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.8) * 1.3 + 3;
    for (const side of [-1, 1]) {
      const la = da + side * (1.05 - 0.35 * t) + rng.range(-0.1, 0.1);
      const lit = side * (P.litSide || 1) > 0;
      const col = lit ? mixc(P.cols.mid, P.cols.light, rng.next() * 0.8) : mixc(P.cols.dark, P.cols.mid, rng.next() * 0.8);
      dab(g, 'single', rng.int(0, 4), p[0] + Math.cos(la) * s * 0.48, p[1] + Math.sin(la) * s * 0.48, s, s * 0.5, la, jit(col, rng, 0.02), 1);
    }
  }
  resetG(g);
}

function paintFlowers(g, x, y, r, n, cols, rng, size = 4) {
  for (let i = 0; i < n; i++) {
    const a = rng.next() * TAU, d = Math.sqrt(rng.next()) * r;
    const fx = x + Math.cos(a) * d, fy = y + Math.sin(a) * d * 0.4;
    const s = size * rng.range(0.7, 1.3);
    const c = rng.pick(cols);
    dab(g, 'round', rng.int(0, 5), fx, fy, s, s * 0.8, rng.next() * TAU, jit(c, rng, 0.03));
    if (s > 3) dab(g, 'round', rng.int(0, 5), fx, fy, s * 0.35, s * 0.35, 0, [0.95, 0.78, 0.3]);
  }
  resetG(g);
}

// mist: layered soft dabs in a band
function paintMist(g, w, P, rng) {
  // P: {y, thick, col, alpha, count, size}
  for (let i = 0; i < P.count; i++) {
    const x = rng.range(-100, w + 100), y = P.y + rng.gauss() * P.thick * 0.4;
    const s = P.size * rng.range(0.6, 1.4);
    dab(g, 'soft', rng.int(0, 1), x, y, s * rng.range(2.5, 4.5), s, rng.range(-0.05, 0.05), jit(P.col, rng, 0.01), P.alpha * rng.range(0.5, 1));
  }
  resetG(g);
}

// paper / gouache grain applied over opaque pixels
let _grainTile = null;
function grainTile() {
  if (_grainTile) return _grainTile;
  const S = 256; const c = mkCanvas(S, S), g = c.getContext('2d');
  const img = g.createImageData(S, S); const rng = new RNG(77);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    const n = 0.5 + (rng.next() - 0.5) * 0.5 + (vnoise2(x * 0.08, y * 0.08) - 0.5) * 0.5 + (vnoise2(x * 0.3 + 5, y * 0.03) - 0.5) * 0.25;
    const v = Math.round(clamp(n) * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  _grainTile = c; return c;
}
function applyGrain(g, w, h, amt = 0.08) {
  if (amt <= 0) return;
  resetG(g);
  const copy = mkCanvas(w, h); copy.getContext('2d').drawImage(g.canvas, 0, 0);
  g.globalCompositeOperation = 'soft-light';
  g.globalAlpha = amt;
  const pat = g.createPattern(grainTile(), 'repeat');
  g.fillStyle = pat; g.fillRect(0, 0, w, h);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(copy, 0, 0);
  resetG(g);
}

// light patches on ground: flattened warm ellipses made of round dabs
function paintLightPatch(g, x, y, rx, ry, col, rng, a = 0.9) {
  const n = Math.round(rx * ry / 40) + 4;
  for (let i = 0; i < n; i++) {
    const an = rng.next() * TAU, d = Math.sqrt(rng.next());
    dab(g, 'round', rng.int(0, 5), x + Math.cos(an) * d * rx, y + Math.sin(an) * d * ry, rng.range(8, 18), rng.range(4, 8), rng.range(-0.2, 0.2), jit(col, rng, 0.03), a * rng.range(0.6, 1));
  }
  resetG(g);
}

// a generic "plate": painted canvas with depth for multiplane placement
class Plate {
  constructor(w, h, depth = 1e4, ox = 0, oy = 0) {
    this.c = mkCanvas(w, h); this.g = this.c.getContext('2d'); this.w = w; this.h = h;
    this.depth = depth; this.ox = ox; this.oy = oy; // where plate's (0,0) sits in base frame pixels
  }
}
