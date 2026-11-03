// ---------- forest kit: shared palettes + composite painters ----------
const PAL = {
  fog: hx('e9d9c9'),
  fogCool: hx('c7c7d3'),
  sky: [[0, hx('8fa5bd')], [0.3, hx('b9bccb')], [0.55, hx('e6cdb6')], [0.78, hx('f8e2b6')], [1, hx('fff1cc')]],
  leaf: { deep: hx('1c2f2c'), dark: hx('2b4740'), mid: hx('4d6a4a'), light: hx('8c9d57'), hi: hx('e4cb84') },
  leafCool: { deep: hx('243634'), dark: hx('34504c'), mid: hx('56705f'), light: hx('86977a'), hi: hx('d9c79a') },
  trunk: { dark: hx('262a2a'), mid: hx('454843'), light: hx('77745f'), rim: hx('e8bd76'), moss: hx('5b6e36') },
  ground: { far: hx('a5a38c'), mid: hx('6f7652'), near: hx('3c4a31'), dark: hx('25302a'), light: hx('dcc47e'), moss: hx('6d8240') },
  flowers: [hx('f4efe4'), hx('f2e7b0'), hx('e9b7c4'), hx('c9c2ea'), hx('f7d36d')],
};

function fogged(pal, amt, fog = PAL.fog) { return fogPal(pal, fog, amt); }

// tree: trunk + a few crowns; crowns positioned relative to trunk top
function paintTree(g, P) {
  const rng = new RNG(P.seed);
  const tp = fogged(P.tpal || PAL.trunk, P.fog || 0);
  const lp = fogged(P.lpal || PAL.leaf, P.fog || 0);
  if (P.sky) lp.sky = P.sky;
  const top = [P.x + (P.lean || 0) * P.h, P.base - P.h];
  // crowns behind trunk (back layer) first
  const crowns = P.crowns || [];
  for (const c of crowns.filter(c => c.back)) paintCrown(g, { cx: top[0] + c.dx, cy: top[1] + c.dy, rx: c.rx, ry: c.ry, seed: rng.int(1, 1e6), pal: fogged(lp, c.fog || 0.06), light: P.light, leaf: c.leaf, holes: c.holes, lightAmt: c.lightAmt, density: c.density });
  // branches
  for (const b of (P.branches || [])) {
    const by = lerp(P.base, top[1], b.at), bx = lerp(P.x, top[0], b.at);
    paintBranch(g, [bx, by], [bx + b.dx * 0.5, by + b.dy * 0.2], [bx + b.dx, by + b.dy], b.w, b.w * 0.25, tp.dark, rng);
  }
  const tr = paintTrunk(g, { x0: P.x, y0: P.base, x1: top[0], y1: top[1], w0: P.w0, w1: P.w1 || P.w0 * 0.55, seed: P.seed, pal: tp, lightX: P.lightX ?? 1, flare: P.flare ?? 0.6, moss: P.moss ?? 0.3, rimW: P.rimW, barkDensity: P.bark });
  for (const c of crowns.filter(c => !c.back)) paintCrown(g, { cx: top[0] + c.dx, cy: top[1] + c.dy, rx: c.rx, ry: c.ry, seed: rng.int(1, 1e6), pal: lp, light: P.light, leaf: c.leaf, holes: c.holes, lightAmt: c.lightAmt, density: c.density });
  return tr;
}

// ground band with perspective strokes: y0 (far) .. y1 (near)
function paintGround(g, w, y0, y1, P, rng) {
  const gp = P.pal || PAL.ground;
  const colAt = (y) => {
    const t = invlerp(y0, y1, y);
    if (t < 0.35) return mixc(gp.far, gp.mid, t / 0.35);
    return mixc(gp.mid, gp.near, (t - 0.35) / 0.65);
  };
  resetG(g);
  const grd = g.createLinearGradient(0, y0, 0, y1);
  for (let k = 0; k <= 6; k++) grd.addColorStop(k / 6, css(colAt(lerp(y0, y1, k / 6))));
  g.fillStyle = grd; g.fillRect(-50, y0 - 4, w + 100, y1 - y0 + 60);
  // horizontal strokes, getting bigger with nearness
  const n = Math.round(w * (y1 - y0) / 260 * (P.density || 1));
  for (let i = 0; i < n; i++) {
    const y = lerp(y0, y1, Math.pow(rng.next(), 0.8));
    const t = invlerp(y0, y1, y);
    const x = rng.range(-30, w + 30);
    let c = colAt(y + rng.gauss() * 10);
    const r = rng.next();
    if (r < 0.18) c = mixc(c, gp.dark, 0.5);
    else if (r < 0.3) c = mixc(c, gp.moss, 0.5);
    else if (r < 0.36) c = mixc(c, P.warm || gp.light, 0.35 * (1 - t));
    const s = lerp(16, 70, t);
    dab(g, rng.next() < 0.5 ? 'flat' : 'dry', rng.int(0, 3), x, y, s * rng.range(0.7, 1.4), s * rng.range(0.16, 0.3), rng.range(-0.08, 0.08), jit(c, rng, 0.03), rng.range(0.5, 0.95));
  }
  resetG(g);
}

// one-call grass band (tufts scattered across a y-range)
function paintGrassBand(g, w, y0, y1, P, rng) {
  const n = P.n || Math.round(w / 12);
  for (let i = 0; i < n; i++) {
    const y = lerp(y0, y1, rng.next());
    const t = invlerp(y0, y1, y);
    const x = rng.range(-20, w + 20);
    const h = lerp(P.hFar, P.hNear, t) * rng.range(0.6, 1.3);
    const cols = P.cols.map(c => mixc(c, P.fog || PAL.fog, (1 - t) * (P.fogAmt || 0)));
    paintGrassTuft(g, x, y, { h, n: P.blades || 7, cols, lean: P.lean || 0.15, w: lerp(1.2, P.wNear || 3.4, t) }, rng);
  }
  resetG(g);
}

// light shafts plate (to be drawn with 'screen')
function paintShafts(w, h, P) {
  const pl = new Plate(w, h, P.depth || 1e4, P.ox || 0, P.oy || 0);
  const g = pl.g; const rng = new RNG(P.seed || 5);
  for (const s of P.shafts) {
    // s: {x (top), w, ang, len, a}
    g.save();
    g.translate(s.x, s.y || -40);
    g.rotate(s.ang);
    const grd = g.createLinearGradient(0, 0, 0, s.len);
    grd.addColorStop(0, css(P.col, s.a));
    grd.addColorStop(0.55, css(P.col, s.a * 0.55));
    grd.addColorStop(1, css(P.col, 0));
    g.fillStyle = grd;
    // soft sided beam: several stacked rects with decreasing width
    for (let k = 0; k < 6; k++) {
      const ww = s.w * (1 - k * 0.14);
      g.globalAlpha = 0.28;
      g.fillRect(-ww / 2, 0, ww, s.len);
    }
    g.restore();
  }
  // blur for softness
  const c2 = mkCanvas(w, h), g2 = c2.getContext('2d');
  g2.filter = 'blur(10px)'; g2.drawImage(pl.c, 0, 0);
  g.clearRect(0, 0, w, h); g.drawImage(c2, 0, 0);
  return pl;
}

// atmospheric glow blob
function glow(g, x, y, r, col, a) {
  const grd = g.createRadialGradient(x, y, 0, x, y, r);
  grd.addColorStop(0, css(col, a)); grd.addColorStop(0.4, css(col, a * 0.45)); grd.addColorStop(1, css(col, 0));
  g.fillStyle = grd; g.fillRect(x - r, y - r, r * 2, r * 2);
}

function stopAt(stops, t) {
  for (let i = 0; i < stops.length - 1; i++) if (t <= stops[i + 1][0]) return mixc(stops[i][1], stops[i + 1][1], smooth(stops[i][0], stops[i + 1][0], t));
  return stops[stops.length - 1][1];
}
// glowing haze backdrop for forest interiors
function paintHaze(g, w, h, P, rng) {
  const grd = g.createLinearGradient(0, 0, 0, h);
  for (const [y, c] of P.stops) grd.addColorStop(y, css(c));
  resetG(g); g.fillStyle = grd; g.fillRect(0, 0, w, h);
  if (P.sun) { glow(g, P.sun[0], P.sun[1], P.sun[2], P.sunCol || hx('fff6dc'), P.sunA ?? 0.9); glow(g, P.sun[0], P.sun[1], P.sun[2] * 0.35, hx('ffffff'), 0.8); }
  // faint large brush passes so it isn't a clean gradient
  const n = Math.round(w * h / 5000);
  for (let i = 0; i < n; i++) {
    const x = rng.range(-50, w + 50), y = rng.range(0, h);
    const c = jit(stopAt(P.stops, y / h), rng, 0.015, 0.012);
    dab(g, 'soft', 1, x, y, rng.range(80, 220), rng.range(40, 120), rng.range(-0.3, 0.3), c, 0.35);
  }
  resetG(g);
}

// a rank of trees at one depth, fading into mist
function paintTrunkRow(g, w, P, rng) {
  const tp = fogged(PAL.trunk, P.fogAmt, P.fog);
  const lp = Object.assign(fogged(P.lpal || PAL.leaf, Math.min(1, P.fogAmt * (P.leafFog || 1.0)), P.fog), { sky: P.sky });
  const xs = [];
  let x = rng.range(-60, 0);
  while (x < w + 60) { xs.push(x); x += rng.range(P.gapMin, P.gapMax); }
  const trees = [];
  for (const tx of xs) {
    if (P.skip && tx > P.skip[0] && tx < P.skip[1]) continue;
    const big = rng.next() < (P.bigChance ?? 0.25);
    const w0 = rng.range(P.wMin, P.wMax) * (big ? 1.6 : 1);
    trees.push({ tx, w0, base: P.base + rng.range(-(P.baseVar || 0), P.baseVar || 0), lean: rng.range(-1, 1) * (P.lean ?? 0.06), seed: rng.int(1, 1e6) });
  }
  // crowns behind trunks
  for (const t of trees) {
    const nc = rng.int(P.crownsMin ?? 1, P.crownsMax ?? 3);
    for (let k = 0; k < nc; k++) {
      const cy = rng.range(P.crownY[0], P.crownY[1]);
      const rx = rng.range(P.crownR[0], P.crownR[1]);
      const cx = t.tx + t.lean * (t.base - cy) + rng.range(-1, 1) * rx * 0.6;
      paintCrown(g, { cx, cy, rx, ry: rx * rng.range(0.45, 0.7), seed: rng.int(1, 1e6), pal: lp, light: P.light, leaf: P.leaf || 10, lightAmt: P.lightAmt ?? 0.7, hiAmt: P.hiAmt ?? 0.7, holes: P.holes || 0 });
    }
  }
  for (const t of trees) {
    const r = paintTrunk(g, { x0: t.tx, y0: t.base, x1: t.tx + t.lean * (t.base - P.top), y1: P.top, w0: t.w0, w1: t.w0 * rng.range(0.5, 0.75), seed: t.seed, pal: tp, lightX: P.lightX ?? 1, flare: rng.range(0.3, 0.9), moss: P.moss ?? 0.25, rimW: P.rimW ?? 0.8, barkDensity: P.bark ?? 0.6 });
    const nl = rng.next() < (P.limbs || 0) ? rng.int(1, 2) : 0;
    for (let k = 0; k < nl; k++) {
      const i = Math.floor(rng.range(0.35, 0.8) * (r.pts.length - 1)), p = r.pts[i], dir = rng.sign();
      const ex = p[0] + dir * t.w0 * rng.range(2.5, 5), ey = p[1] - t.w0 * rng.range(1.5, 3.5);
      paintBranch(g, p, [p[0] + dir * t.w0 * 1.6, p[1] - t.w0 * 0.6], [ex, ey], t.w0 * 0.32, t.w0 * 0.08, tp.dark, rng);
      if (P.limbLeaves) paintCrown(g, { cx: ex, cy: ey, rx: t.w0 * rng.range(2, 3.5), ry: t.w0 * rng.range(1.2, 1.8), seed: rng.int(1, 1e6), pal: lp, light: P.light, leaf: P.leaf || 10, lightAmt: P.lightAmt ?? 0.7 });
    }
  }
  resetG(g);
}

// forest floor: horizontal painted strokes in perspective + moss mounds, fading into mist at the top
function paintForestFloor(g, w, y0, y1, P, rng) {
  const gp = P.pal || PAL.ground;
  const fog = P.fog || PAL.fog;
  const colAt = (t) => t < 0.3 ? mixc(gp.far, gp.mid, t / 0.3) : mixc(gp.mid, gp.near, (t - 0.3) / 0.7);
  resetG(g);
  const grd = g.createLinearGradient(0, y0, 0, y1);
  for (let k = 0; k <= 8; k++) grd.addColorStop(k / 8, css(colAt(k / 8)));
  g.fillStyle = grd; g.fillRect(-50, y0, w + 100, y1 - y0 + 80);
  const n = Math.round(w * (y1 - y0) / 140 * (P.density || 1));
  const kinds = [gp.moss, gp.dark, gp.mid, gp.earth || hx('5a4a36'), gp.grass || hx('7d8a45'), gp.near];
  for (let i = 0; i < n; i++) {
    const t = Math.pow(rng.next(), 0.85);
    const y = lerp(y0, y1, t), x = rng.range(-40, w + 40);
    // regional color drift so patches read as areas, not dots
    const reg = fbm2(x * 0.004, y * 0.012 + 3, 3);
    const kind = kinds[Math.floor(reg * kinds.length * 1.3) % kinds.length];
    let c = mixc(colAt(t), kind, 0.25 + 0.3 * rng.next());
    c = mixc(c, fog, (1 - t) * (P.fogAmt ?? 0.4));
    const s = lerp(P.sFar || 18, P.sNear || 120, t) * rng.range(0.5, 1.3);
    dab(g, rng.next() < 0.55 ? 'flat' : 'dry', rng.int(0, 3), x, y, s, s * lerp(0.1, 0.2, t), rng.range(-0.05, 0.05), jit(c, rng, 0.02, 0.01), rng.range(0.35, 0.8));
  }
  resetG(g);
  // moss mounds: lit tops, shaded bellies
  const nm = P.mounds ?? 40;
  for (let i = 0; i < nm; i++) {
    const t = Math.pow(rng.next(), 0.7);
    const y = lerp(y0 + 10, y1, t), x = rng.range(0, w);
    const s = lerp(10, 70, t) * rng.range(0.6, 1.5);
    const f = (1 - t) * (P.fogAmt ?? 0.4);
    leafMass(g, x, y, s, s * 0.32, mixc(gp.dark, fog, f), rng, s * 0.18, { stamp: 0.8, tex: 0.3 });
    leafMass(g, x - s * 0.1, y - s * 0.1, s * 0.8, s * 0.2, mixc(gp.moss, fog, f), rng, s * 0.15, { stamp: 0.7, tex: 0.3 });
    leafMass(g, x - s * 0.2, y - s * 0.16, s * 0.45, s * 0.1, mixc(gp.grass || gp.moss, fog, f * 0.8), rng, s * 0.1, { stamp: 0.6, tex: 0.2 });
  }
  resetG(g);
  // dissolve the far edge into the mist
  const fg2 = g.createLinearGradient(0, y0, 0, y0 + (P.fadeH || 90));
  fg2.addColorStop(0, css(fog, 1)); fg2.addColorStop(1, css(fog, 0));
  g.fillStyle = fg2; g.fillRect(-50, y0 - 2, w + 100, (P.fadeH || 90) + 2);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < w / 30; i++) dab(g, 'soft', 0, rng.range(0, w), y0 + rng.range(-10, 20), rng.range(80, 200), rng.range(30, 60), 0, [0, 0, 0], 0.8);
  resetG(g);
}

function paintTreeShadow(g, x, y, rx, ry, col, rng, a = 0.5) {
  const n = Math.round(rx / 8) + 6;
  for (let i = 0; i < n; i++) {
    const an = rng.next() * TAU, d = Math.sqrt(rng.next());
    dab(g, 'leaf', rng.int(0, 7), x + Math.cos(an) * d * rx, y + Math.sin(an) * d * ry, rng.range(30, 70), rng.range(10, 20), rng.range(-0.2, 0.2), jit(col, rng, 0.01), a);
  }
  resetG(g);
}

// long broken shadow cast across the floor (dry-brush dabs strung along a line)
function paintShadowStreak(g, x0, y0, x1, y1, w0, w1, col, a, rng) {
  const L = Math.hypot(x1 - x0, y1 - y0), n = Math.round(L / 6), ang = Math.atan2(y1 - y0, x1 - x0);
  for (let i = 0; i < n; i++) {
    const t = i / n, w = lerp(w0, w1, t);
    const x = lerp(x0, x1, t) + rng.gauss() * w * 0.12, y = lerp(y0, y1, t) + rng.gauss() * w * 0.12;
    if (fbm2(x * 0.01, y * 0.02, 2) < 0.32) continue; // broken by light coming through
    dab(g, rng.next() < 0.6 ? 'dry' : 'flat', rng.int(0, 3), x, y, w * rng.range(1.6, 3.2), w * rng.range(0.6, 1.0), ang + rng.range(-0.05, 0.05), jit(col, rng, 0.015), a * rng.range(0.6, 1));
  }
  resetG(g);
}
