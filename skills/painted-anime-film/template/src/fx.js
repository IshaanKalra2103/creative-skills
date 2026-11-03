// ---------- hand-drawn effects: leaves, dust, glow, flames, wind, trails ----------
// leaves: each turn view is its own drawing
const LEAF = { views: null };
function buildLeaves() {
  if (LEAF.views) return;
  const cols = [
    { top: hx('6f8a3a'), under: hx('a9b56a'), line: hx('2f3d20') },
    { top: hx('8e9a3e'), under: hx('c8c27a'), line: hx('3d4222') },
    { top: hx('5a7a3c'), under: hx('98ad6a'), line: hx('26361e') },
    { top: hx('c79a3e'), under: hx('e6c77a'), line: hx('5a3e1e') },
    { top: hx('a8743a'), under: hx('d8a66a'), line: hx('4e321c') },
  ];
  LEAF.views = cols.map((C, ci) => {
    const out = [];
    for (let v = 0; v < 8; v++) {
      const S = 72, c = mkCanvas(S, S), g = c.getContext('2d'), rng = new RNG(900 + ci * 13 + v);
      const th = v / 8 * TAU, w = Math.cos(th), under = w < 0, aw = Math.max(0.12, Math.abs(w));
      const curl = Math.sin(th) * 0.35;
      g.translate(S / 2, S / 2);
      const len = 26, wid = 12 * aw;
      // outline path (pointed ovate with a slight curl)
      const pts = [];
      for (let i = 0; i <= 20; i++) { const t = i / 20, y = -len + t * 2 * len, r = Math.sin(Math.PI * Math.pow(t, 0.8)) * wid; pts.push([r + curl * (y * y) / len * 0.3, y]); }
      for (let i = 20; i >= 0; i--) { const t = i / 20, y = -len + t * 2 * len, r = Math.sin(Math.PI * Math.pow(t, 0.8)) * wid; pts.push([-r * 0.92 + curl * (y * y) / len * 0.3, y]); }
      const jp = pts.map(([x, y]) => [x + rng.range(-0.3, 0.3), y]);
      const leafPath = () => { g.beginPath(); jp.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
      leafPath();
      g.fillStyle = css(under ? C.under : C.top); g.fill();
      // shadow half (hard edge along the midrib)
      g.save(); g.clip();
      g.fillStyle = css(mixc(under ? C.under : C.top, hx('2a3550'), 0.32));
      g.beginPath(); g.moveTo(0, -len - 2); g.lineTo(wid + 6, -len); g.lineTo(wid + 6, len); g.lineTo(0, len + 2); g.closePath(); g.fill();
      g.restore();
      leafPath(); g.lineWidth = 1.3; g.strokeStyle = css(C.line); g.lineJoin = 'round'; g.stroke();
      // midrib + stem
      g.beginPath(); g.moveTo(curl * len * 0.3, -len * 0.85); g.quadraticCurveTo(0, 0, curl * len * 0.3, len + 6); g.lineWidth = 1.1; g.strokeStyle = css(mixc(C.line, C.top, 0.3)); g.stroke();
      out.push(c);
    }
    return out;
  });
}
// a falling leaf at time t: returns {x,y,z(world), view, rot}
function leafState(L, t) {
  const tt = Math.floor(t * 12) / 12; // drawn on twos
  const ph = L.ph + tt * L.w;
  return {
    p: [L.p[0] + Math.sin(ph) * L.amp + L.drift[0] * tt, L.p[1] - L.vy * tt, L.p[2] + Math.cos(ph * 0.7) * L.amp * 0.6 + L.drift[1] * tt],
    view: ((Math.floor((ph * 1.6 + L.ph) / TAU * 8) % 8) + 8) % 8,
    rot: Math.sin(ph) * 0.7 + L.r0,
  };
}
function drawLeaf(g, L, sx, sy, size, t, alpha = 1) {
  const st = leafState(L, t);
  g.save(); g.globalAlpha = alpha; g.translate(sx, sy); g.rotate(st.rot);
  const img = LEAF.views[L.col][st.view];
  g.drawImage(img, -size / 2, -size / 2, size, size);
  g.restore();
}
function makeLeaves(n, box, rng, o = {}) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({
    p: [rng.range(box[0], box[1]), rng.range(box[2], box[3]), rng.range(box[4], box[5])],
    ph: rng.next() * TAU, w: rng.range(1.6, 3.2), amp: rng.range(0.4, 1.4) * (o.amp || 1), vy: rng.range(0.7, 1.4) * (o.vy || 1),
    drift: [rng.range(-0.4, 0.4) + (o.wind || 0), rng.range(-0.2, 0.2)], r0: rng.range(-1, 1), col: rng.pick(o.cols || [0, 0, 1, 2, 2, 3]), size: rng.range(0.8, 1.3), t0: rng.range(0, o.t0 || 0),
  });
  return out;
}
// world leaves through a camera
function drawLeavesWorld(g, leaves, cam, t, o = {}) {
  const items = [];
  for (const L of leaves) {
    const tl = t - L.t0; if (tl < 0) continue;
    const st = leafState(L, tl);
    if (st.p[1] < (o.floor ?? 0)) continue;
    const sp = cam.project(st.p); if (sp[2] < 0.5) continue;
    items.push([sp, L, tl]);
  }
  items.sort((a, b) => b[0][2] - a[0][2]);
  for (const [sp, L, tl] of items) {
    const size = (o.size || 0.16) * L.size * cam.f / sp[2] * 2.4;
    if (size < 2 || sp[0] < -80 || sp[0] > W + 80 || sp[1] < -80 || sp[1] > H + 80) continue;
    const fk = o.fog ? clamp(1 - Math.exp(-sp[2] * o.fog)) : 0;
    drawLeaf(g, L, sp[0], sp[1], size, tl, 1 - fk * 0.6);
  }
}

// cel dust / smoke puff, drawn fresh for each exposure (seeded per drawing)
function drawPuff(g, x, y, r, k, seed, o = {}) {
  // k: 0..1 life. grows, rises, breaks up, thins
  const rng = new RNG(seed);
  const n = 7 + rng.int(0, 4);
  const R = r * (0.45 + 0.75 * Math.pow(k, 0.6));
  const lit = o.lit || hx('e8dcc4'), shd = o.shd || hx('a79e95'), line = o.line || hx('7d736b');
  const a = (o.alpha ?? 1) * (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
  const balls = [];
  for (let i = 0; i < n; i++) {
    const an = rng.next() * TAU, d = rng.range(0.1, 0.75) * R * (1 + k * 0.6);
    const br = R * rng.range(0.35, 0.6) * (1 - k * 0.35 * rng.next());
    balls.push([x + Math.cos(an) * d * 1.3, y + Math.sin(an) * d * 0.6 - k * r * (o.rise ?? 0.6), br]);
  }
  g.save(); g.globalAlpha = a;
  const path = (dx, dy, s) => { g.beginPath(); for (const [bx, by, br] of balls) { g.moveTo(bx + dx + br * s, by + dy); g.arc(bx + dx, by + dy, br * s, 0, TAU); } };
  path(0, 0, 1.06); g.fillStyle = css(line); g.fill();
  path(0, 0, 1); g.fillStyle = css(shd); g.fill();
  g.save(); path(0, 0, 1); g.clip();
  path(-R * 0.18, -R * 0.22, 0.9); g.fillStyle = css(lit); g.fill(); g.restore();
  g.restore();
}

function glowFx(g, x, y, r, col, a = 1, comp = 'lighter') {
  g.save(); g.globalCompositeOperation = comp; g.globalAlpha = a;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, css(col, 1)); gr.addColorStop(0.25, css(col, 0.5)); gr.addColorStop(1, css(col, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore();
}

// jet flame from (x,y) along angle ang, length len, width w; drawing index fi changes the shape
function drawFlame(g, x, y, ang, len, w, fi, o = {}) {
  const rng = new RNG(1000 + fi * 17 + (o.seed || 0));
  const layer = (lk, wk, col, a) => {
    const n = 14, L = len * lk * rng.range(0.85, 1.12);
    const ptsL = [], ptsR = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, ww = w * wk * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.55 + 0.45)), 0.9) * (1 - t * 0.85) * rng.range(0.85, 1.15);
      const cx = Math.cos(ang) * L * t, cy = Math.sin(ang) * L * t, nx = -Math.sin(ang), ny = Math.cos(ang);
      ptsL.push([x + cx + nx * ww, y + cy + ny * ww]); ptsR.push([x + cx - nx * ww, y + cy - ny * ww]);
    }
    g.beginPath(); g.moveTo(ptsL[0][0], ptsL[0][1]);
    for (const p of ptsL) g.lineTo(p[0], p[1]);
    for (const p of ptsR.reverse()) g.lineTo(p[0], p[1]);
    g.closePath(); g.globalAlpha = a; g.fillStyle = css(col); g.fill();
  };
  g.save(); g.globalCompositeOperation = o.comp || 'source-over';
  layer(1.0, 1.0, o.c1 || hx('ffb45a'), 0.85);
  layer(0.78, 0.7, o.c2 || hx('ffe7a0'), 0.95);
  layer(0.5, 0.42, o.c3 || hx('fffbf0'), 1);
  g.restore();
}

// expanding wind ring drawn as broken brush arcs on an ellipse
function drawWindRing(g, cx, cy, rx, ry, k, seed, o = {}) {
  const rng = new RNG(seed);
  g.save(); g.lineCap = 'round';
  const a = (o.alpha ?? 1) * (1 - Math.pow(k, 2));
  for (let band = 0; band < 5; band++) {
    const rr = 1 - band * 0.035 - rng.range(0, 0.02);
    let an = rng.next() * TAU;
    while (an < TAU * 1.0 + 6.3) {
      const seg = rng.range(0.25, 0.9), gap = rng.range(0.05, 0.3);
      g.beginPath();
      for (let s = 0; s <= 12; s++) { const t = an + seg * s / 12; const px = cx + Math.cos(t) * rx * rr, py = cy + Math.sin(t) * ry * rr; s ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.strokeStyle = css(band === 0 ? (o.c0 || hx('fffaf0')) : (o.c1 || hx('f8e7c0')), 1);
      g.globalAlpha = a * (band === 0 ? 0.9 : 0.5) * rng.range(0.5, 1);
      g.lineWidth = (o.w || 6) * (band === 0 ? 1 : 0.5) * rng.range(0.6, 1.2);
      g.stroke();
      an += seg + gap;
      if (an > TAU * 2) break;
    }
  }
  g.restore();
}
// flock silhouettes (small, distant birds): 4 flap drawings
function drawFlockBird(g, x, y, s, phase, col, ang = 0) {
  const f = ((Math.floor(phase) % 4) + 4) % 4;
  const up = [0.9, 0.3, -0.5, 0.1][f];
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s);
  g.beginPath();
  g.moveTo(-1.0, -up * 0.8); g.quadraticCurveTo(-0.45, -up * 0.5 - 0.1, -0.08, 0.02);
  g.quadraticCurveTo(0, 0.12, 0.08, 0.02); g.quadraticCurveTo(0.45, -up * 0.5 - 0.1, 1.0, -up * 0.8);
  g.quadraticCurveTo(0.45, -up * 0.35 + 0.08, 0.06, 0.16); g.quadraticCurveTo(0, 0.24, -0.06, 0.16);
  g.quadraticCurveTo(-0.45, -up * 0.35 + 0.08, -1.0, -up * 0.8);
  g.fillStyle = css(col); g.fill();
  g.restore();
}
// motes in sunbeams
function drawMotes(g, n, seed, t, box, col, a) {
  const rng = new RNG(seed);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = rng.range(box[0], box[2]) + Math.sin(t * 0.4 + i) * 8, y = rng.range(box[1], box[3]) + Math.cos(t * 0.3 + i * 1.7) * 6 - t * 3;
    const r = rng.range(0.8, 2.4), tw = 0.5 + 0.5 * Math.sin(Math.floor(t * 8) * 1.3 + i * 2.1);
    g.globalAlpha = a * tw; g.fillStyle = css(col); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  g.restore();
}
function drawGlint(g, x, y, r, a = 1, rot = 0.3) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.translate(x, y); g.rotate(rot);
  glowFx(g, 0, 0, r * 1.2, hx('fff2c8'), 0.6, 'lighter');
  g.fillStyle = css(hx('fffdf4'));
  for (const [L, w] of [[r, r * 0.09], [r * 0.55, r * 0.07]]) for (let k = 0; k < 2; k++) {
    g.save(); g.rotate(k * Math.PI / 2 + (L < r ? Math.PI / 4 : 0));
    g.beginPath(); g.moveTo(-L, 0); g.quadraticCurveTo(0, -w, L, 0); g.quadraticCurveTo(0, w, -L, 0); g.fill(); g.restore();
  }
  g.restore();
}
// soft screen-space light beam from a point along a direction
function drawBeam(g, x, y, ang, len, w0, w1, col, a) {
  g.save(); g.globalCompositeOperation = 'screen'; g.translate(x, y); g.rotate(ang);
  const grd = g.createLinearGradient(0, 0, len, 0);
  grd.addColorStop(0, css(col, a)); grd.addColorStop(0.6, css(col, a * 0.55)); grd.addColorStop(1, css(col, 0));
  g.fillStyle = grd; g.filter = 'blur(18px)';
  g.beginPath(); g.moveTo(0, -w0 / 2); g.lineTo(len, -w1 / 2); g.lineTo(len, w1 / 2); g.lineTo(0, w0 / 2); g.closePath(); g.fill();
  g.restore();
}
