// ---------- the world of the film: two palettes (the grey hour / dawn) and its painters ----------
// Every painter takes `which` (0 grey hour, 1 dawn) and must use the same RNG draws in both states,
// so platePair() paintings line up stroke for stroke. Pick colours with C(which, key).
const PALS = [
  { // 0: the grey hour before dawn
    skyTop: hx('27304a'), skyMid: hx('4a5470'), skyLow: hx('8c90a8'), horizon: hx('b4b2c0'), glow: hx('c8c0c4'),
    ridgeFar: hx('6a7088'), ridgeMid: hx('545c76'), hill: hx('434b62'), hillLit: hx('5a6178'), land: hx('3a4256'),
    grass: [hx('3c4658'), hx('4a5466'), hx('323b4c'), hx('5a6474')], grassFg: [hx('1c2232'), hx('232a3a'), hx('2c3444'), hx('3a4252')],
    leaf: { deep: hx('1a2030'), dark: hx('262e40'), mid: hx('353f54'), light: hx('4b556c'), hi: hx('5f6880'), sky: hx('8c90a8') },
    bark: { dark: hx('1e2130'), mid: hx('2f3342'), light: hx('474b5c'), rim: hx('6a6f84'), moss: hx('3b4654') },
    root: hx('2a2e3e'), soil: hx('2b3040'), stone: hx('6c7084'), mist: hx('8f97ae'), paddy: hx('9da2b8'),
    roof: hx('343a4e'), roofLit: hx('4a5066'), wall: hx('7c8094'), wallShade: hx('5a5e72'), wood: hx('3c3c4a'), window: hx('2a2e3e'),
    flowers: [hx('6a6e82'), hx('767a8c'), hx('5e6276')], ink: hx('0b0a13'), shadow: hx('2a2f44'),
  },
  { // 1: dawn
    skyTop: hx('5d8fc4'), skyMid: hx('9dbedb'), skyLow: hx('e9dcc4'), horizon: hx('fbe1b0'), glow: hx('fff0c8'),
    ridgeFar: hx('a8b4c8'), ridgeMid: hx('8ca08c'), hill: hx('6f8f4c'), hillLit: hx('a9b45a'), land: hx('5e7b3c'),
    grass: [hx('6f8c3e'), hx('8fa64a'), hx('56723a'), hx('b8bc5c')], grassFg: [hx('2c4428'), hx('3a5630'), hx('4d6a34'), hx('6f8a3e')],
    leaf: { deep: hx('1f3a2a'), dark: hx('2e4f30'), mid: hx('4a6d36'), light: hx('86a046'), hi: hx('e2c66a'), sky: hx('f3e4c0') },
    bark: { dark: hx('2e2622'), mid: hx('54453a'), light: hx('86705a'), rim: hx('f2c47a'), moss: hx('6f8a3e') },
    root: hx('4e4036'), soil: hx('5a4a3a'), stone: hx('aca796'), mist: hx('f5e3c4'), paddy: hx('f2e2c0'),
    roof: hx('4a5674'), roofLit: hx('8a92a8'), wall: hx('efe3c8'), wallShade: hx('b8aec4'), wood: hx('7a5038'), window: hx('f3b85a'),
    flowers: [hx('f0a8b0'), hx('f6f0e2'), hx('f2d26a'), hx('8a80d8'), hx('e88a6a')], ink: hx('2a2a48'), shadow: hx('5a5a8a'),
  },
];
const C = (which, key) => PALS[which][key];
const L2 = [0.7, -0.7]; // 2D light: from the upper right (where dawn comes from)

// ---- sky ----
function paintSkyState(g, w, h, which, rng, o = {}) {
  const P = PALS[which], hz = o.horizon ?? 0.75;
  paintSky(g, w, h, [[0, P.skyTop], [hz * 0.5, P.skyMid], [hz * 0.88, P.skyLow], [hz, P.horizon], [1, P.horizon]], rng);
  if (o.sun) { glow(g, o.sun[0], o.sun[1], o.sun[2], P.glow, which ? 0.85 : 0.35); }
  if (o.clouds) for (const c of o.clouds) { // soft stratus banks: wide, low-contrast, lit from below at dawn
    const [x0, x1, y, count = 6, scale = 1, thick = 40] = c;
    for (let i = 0; i < count * 4; i++) {
      const x = rng.range(x0, x1), yy = y + rng.gauss() * thick * 0.4, L = rng.range(180, 420) * scale, T_ = L * rng.range(0.1, 0.18);
      const body = which ? mixc(P.skyLow, hx('fff2dc'), 0.35) : mixc(P.skyMid, P.skyLow, 0.35), shade = which ? hx('b9a4b8') : mixc(P.skyTop, P.skyMid, 0.7);
      dab(g, 'soft', rng.int(0, 1), x, yy - T_ * 0.3, L, T_, rng.range(-0.02, 0.02), shade, rng.range(0.25, 0.45));
      dab(g, 'soft', rng.int(0, 1), x + rng.range(-20, 20), yy + T_ * 0.15, L * 0.85, T_ * 0.6, rng.range(-0.02, 0.02), body, rng.range(0.2, which ? 0.6 : 0.35));
    }
  }
  if (!which && o.stars) for (let i = 0; i < o.stars; i++) { const x = rng.range(0, w), y = rng.range(0, h * hz * 0.45); g.fillStyle = css(hx('c8cce0'), rng.range(0.3, 0.7)); g.fillRect(x, y, 1.6, 1.6); }
  else if (o.stars) for (let i = 0; i < o.stars; i++) { rng.range(0, w); rng.range(0, 1); rng.range(0, 1); }
  resetG(g);
}
// ---- a ridge / hill layer: noisy top edge, gouache body, rim of light on the edge facing the sky glow ----
function paintRidge(g, w, h, which, P, rng) {
  const pts = [], st = 6;
  for (let x = -60; x <= w + 60; x += st) {
    let y = P.y - P.amp * (fbm2(x * P.freq + P.seed, P.seed * 0.37, 4) - 0.5) * 2;
    if (P.shape) y += P.shape(x);
    pts.push([x, y]);
  }
  const col = P.col[which], dark = P.dark ? P.dark[which] : mulc(col, 0.85);
  g.fillStyle = css(col); g.beginPath(); g.moveTo(-60, h + 60); for (const p of pts) g.lineTo(p[0], p[1]); g.lineTo(w + 60, h + 60); g.closePath(); g.fill();
  // body texture: horizontal-ish dabs, darker downward, clipped to the shape
  g.save(); g.beginPath(); g.moveTo(-60, h + 60); for (const p of pts) g.lineTo(p[0], p[1]); g.lineTo(w + 60, h + 60); g.closePath(); g.clip();
  const n = Math.round(w * (h - P.y + P.amp) / 1400 * (P.tex ?? 1));
  for (let i = 0; i < n; i++) {
    const x = rng.range(-40, w + 40), y = rng.range(P.y - P.amp * 1.2, h + 20);
    const k = clamp((y - P.y) / (P.fade || 300));
    const c = jit(mixc(col, dark, k * 0.9 + rng.next() * 0.15), rng, 0.02, 0.012);
    dab(g, 'flat', rng.int(0, 5), x, y, rng.range(40, 120) * (P.dab || 1), rng.range(8, 18) * (P.dab || 1), rng.range(-0.12, 0.12), c, rng.range(0.3, 0.6));
  }
  resetG(g); g.restore();
  // rim light along the top edge
  if (P.rim) {
    const rimC = P.rim[which];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x, y] = pts[i], v = vnoise1(x * 0.01 + P.seed);
      if (v < 0.45) continue;
      dab(g, 'flat', rng.int(0, 5), x, y + 3, rng.range(10, 22), rng.range(2, 4), Math.atan2(pts[i + 1][1] - y, st), rimC, (v - 0.45) * 1.4 * (which ? 1 : 0.5));
    }
    resetG(g);
  }
  // tree clumps along the ridge
  if (P.trees) {
    const T_ = P.trees;
    for (let i = 0; i < T_.n; i++) {
      const x = rng.range(0, w), k = Math.round((x + 60) / st), y = pts[Math.max(0, Math.min(pts.length - 1, k))][1];
      if (T_.skip && x > T_.skip[0] && x < T_.skip[1]) { rng.next(); rng.next(); rng.next(); continue; }
      const s = T_.size * rng.range(0.6, 1.3);
      const lp = fogPal(PALS[which].leaf, T_.fog[which], T_.fogAmt);
      paintCrown(g, { cx: x, cy: y - s * 0.35 + rng.range(0, s * 0.8), rx: s, ry: s * rng.range(0.6, 0.85), seed: rng.int(1, 1e6), pal: lp, light: L2, leaf: Math.max(3, s * 0.13), lightAmt: which ? 0.9 : 0.3 });
    }
  }
  return pts;
}
// ---- the great tree, painted (trunk with buttress roots + huge crown) ----
// x, base in plate px; h trunk height px; s scale; which palette
function paintGreatTree(g, which, P) {
  const rng = new RNG(P.seed || 7);
  const pal = PALS[which], s = P.s;
  const tp = fogPal(pal.bark, P.fog || pal.mist, P.fogAmt || 0), lp = fogPal(pal.leaf, P.fog || pal.mist, P.fogAmt || 0);
  const top = [P.x + 0.05 * P.h, P.base - P.h];
  // back crown masses
  const crowns = [[-0.9, -0.15, 1.0, 0.55], [0.85, -0.05, 0.95, 0.5], [0.0, -0.45, 1.25, 0.6], [-0.4, 0.25, 0.8, 0.4], [0.55, 0.3, 0.75, 0.38], [1.45, 0.22, 0.6, 0.32], [-1.45, 0.3, 0.6, 0.3]];
  const R = P.h * 0.62;
  for (const [dx, dy, rx, ry] of crowns.slice(0, 3)) paintCrown(g, { cx: top[0] + dx * R, cy: top[1] + dy * R, rx: rx * R, ry: ry * R, seed: rng.int(1, 1e6), pal: fogPal(lp, P.fog || pal.mist, 0.08), light: L2, leaf: Math.max(4, 11 * s), holes: 4, lightAmt: which ? 0.9 : 0.35 });
  // limbs
  for (const [ax, ay, bx, by, w] of [[0, 0.75, -0.95, -0.05, 0.16], [0, 0.82, 0.9, 0.0, 0.14], [0, 0.92, 0.2, -0.35, 0.12], [0, 0.88, -0.45, -0.3, 0.1]]) {
    const p0 = [lerp(P.x, top[0], ay), lerp(P.base, top[1], ay)];
    paintBranch(g, p0, [p0[0] + bx * R * 0.5, p0[1] + by * R * 0.2 - R * 0.15], [top[0] + bx * R, top[1] + by * R], P.w * w * 2, P.w * w * 0.5, tp.dark, rng);
  }
  // trunk
  paintTrunk(g, { x0: P.x, y0: P.base, x1: top[0], y1: top[1], w0: P.w, w1: P.w * 0.62, seed: P.seed || 7, pal: tp, lightX: 1, flare: 0.9, moss: 0.6, rimW: which ? 1.4 : 0.4, barkDensity: 1.2 });
  // buttress roots spreading on the ground
  for (const [dx, len, w] of [[-0.42, -1.6, 0.34], [0.4, 1.5, 0.3], [-0.15, -0.8, 0.22], [0.18, 0.9, 0.2]]) {
    const x0 = P.x + dx * P.w, y0 = P.base - P.w * 0.08;
    paintTrunk(g, { x0, y0, x1: x0 + len * P.w, y1: P.base + P.w * 0.1, w0: P.w * w, w1: P.w * w * 0.25, seed: rng.int(1, 1e6), pal: tp, lightX: 1, flare: 0, moss: 0.8, rimW: which ? 1 : 0.3, barkDensity: 1 });
  }
  // front crown masses
  for (const [dx, dy, rx, ry] of crowns.slice(3)) paintCrown(g, { cx: top[0] + dx * R, cy: top[1] + dy * R, rx: rx * R, ry: ry * R, seed: rng.int(1, 1e6), pal: lp, light: L2, leaf: Math.max(4, 11 * s), holes: 3, lightAmt: which ? 1 : 0.35 });
  resetG(g);
  return top;
}
// ---- grass + flowers band (perspective) ----
function paintMeadow(g, w, y0, y1, which, P, rng) {
  const pal = PALS[which];
  paintGrassBand(g, w, y0, y1, { hFar: P.hFar || 5, hNear: P.hNear || 26, cols: P.cols ? P.cols[which] : pal.grass, fog: pal.mist, fogAmt: P.fogAmt ?? 0.35, n: P.n || 900, blades: P.blades || 6, wNear: P.wNear || 2.6, lean: P.lean || 0 }, rng);
  const fl = which ? pal.flowers : pal.flowers.concat(pal.flowers).slice(0, 5);
  for (let i = 0; i < (P.flowers || 0); i++) {
    const x = rng.range(0, w), t = rng.next(), y = lerp(y0 + 6, y1, t);
    const col = fl[i % fl.length];
    paintFlowers(g, x, y, lerp(6, 30, t) * (P.fs || 1), 5, [col, mixc(col, hx('ffffff'), 0.3)], rng, lerp(1.4, 4.5, t) * (P.fs || 1));
  }
  resetG(g);
}
// ---- the shadow pool: an ink-dark hollow on the ground, drawn per drawing ----
// c world centre, r radius, seed per drawing; o: {ripples: [[t0, k]...], t, sheen}
function poolPts(cam, c, r, seed, n = 40) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, m = 1 + 0.14 * Math.sin(2 * a + 1) + 0.08 * Math.sin(3 * a + 0.4) + 0.16 * (vnoise2(Math.cos(a) * 1.6 + 7, Math.sin(a) * 1.6) - 0.5) * 2 + 0.012 * (hash2i(i, seed) - 0.5);
    pts.push(cam.project([c[0] + Math.cos(a) * r * m, c[1], c[2] + Math.sin(a) * r * m * 0.8]));
  }
  return pts;
}
function drawPool(g, cam, c, r, seed, o = {}) {
  const pts = poolPts(cam, c, r, seed);
  g.save();
  g.fillStyle = css(o.col || C(0, 'ink'));
  g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill();
  g.clip();
  // a faint sheen of sky on the far half, broken
  const sheen = o.sheen ?? 0.25;
  if (sheen > 0) {
    const rng = new RNG(seed + 5);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + rng.range(0.25, Math.PI - 0.25), d = rng.range(0.55, 0.85);
      const p = cam.project([c[0] + Math.cos(a) * r * d, c[1], c[2] + Math.sin(a) * r * d * 0.8]);
      const q = cam.project([c[0] + Math.cos(a) * r * d + r * rng.range(0.15, 0.35), c[1], c[2] + Math.sin(a) * r * d * 0.8]);
      g.strokeStyle = css(o.sheenCol || hx('4a5068'), sheen * rng.range(0.4, 1)); g.lineWidth = Math.max(1, rng.range(1, 2.5) * cam.f / p[2] * 0.01);
      g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
    }
  }
  // ripples: expanding rings, drawn as broken ellipses
  for (const [rc, k] of (o.ripples || [])) {
    if (k <= 0 || k >= 1) continue;
    const rr = lerp(0.08, r * 0.95, Math.pow(k, 0.7)), a = (1 - k) * 0.8;
    const ring = [];
    for (let i = 0; i <= 48; i++) { const t = i / 48 * TAU; ring.push(cam.project([rc[0] + Math.cos(t) * rr, c[1], rc[2] + Math.sin(t) * rr * 0.8])); }
    g.strokeStyle = css(o.rippleCol || hx('3a3f58'), a); g.lineWidth = Math.max(1, 2.2 * (1 - k) * cam.f / ring[0][2] * 0.012);
    g.beginPath();
    for (let i = 0; i < 48; i++) { if (vnoise1(i * 0.6 + k * 3) < 0.3) continue; g.moveTo(ring[i][0], ring[i][1]); g.lineTo(ring[i + 1][0], ring[i + 1][1]); }
    g.stroke();
  }
  g.restore();
  // grass and moss over the front rim, so the pool sits in the ground rather than on it
  if (o.tufts !== false) {
    const rng = new RNG(808), cols = o.tuftCols || PALS[0].grass.map(c => mixc(c, PALS[0].shadow, 0.4));
    for (let i = 0; i < 16; i++) {
      const a = rng.range(0.15, Math.PI - 0.15), q = cam.project([c[0] + Math.cos(a) * r * 1.02, c[1], c[2] + Math.sin(a) * r * 0.85]), s = cam.f / q[2];
      paintGrassTuft(g, q[0], q[1] + 0.01 * s, { h: rng.range(0.04, 0.09) * s, n: 5, cols, lean: rng.range(-0.3, 0.3), w: Math.max(1, 0.008 * s) }, rng);
    }
    resetG(g);
  }
  return pts;
}
// ---- the stone lantern (cel mesh, on-model across shots) ----
const LANTERN = { gm: null };
// a hexagon outline subdivided along its edges (so corners can be lifted on their own); phase puts a corner at +z
function hexRing(r, n = 36, phase = Math.PI / 2) {
  const out = [];
  for (let j = 0; j < n; j++) {
    const a = j / n * TAU, u = (((a - phase) % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3) - Math.PI / 6;
    const rr = r * Math.cos(Math.PI / 6) / Math.cos(u);
    out.push([rr * Math.cos(a), rr * Math.sin(a)]);
  }
  return out;
}
const hexCorner = (x, z, phase = Math.PI / 2) => { const a = Math.atan2(z, x), u = (((a - phase) % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3) - Math.PI / 6; return Math.abs(u) / (Math.PI / 6); };
function lanternBuild() {
  if (LANTERN.gm) return;
  const hexL = (prof, o = {}) => loft(prof.map(([r, y]) => ({ y, ring: hexRing(r) })), Object.assign({ smooth: 25 }, o));
  // the roof: concave sweep up to the finial, deep eaves, corners that curl up (warabide)
  const roofDeform = (p) => { const r = Math.hypot(p[0], p[2]), c = Math.pow(hexCorner(p[0], p[2]), 4); p[1] += c * Math.pow(Math.max(0, r - 0.26), 1.6) * 0.75; return p; };
  const stone = mergeMesh([
    hexL([[0.4, 0], [0.4, 0.1], [0.33, 0.14], [0.24, 0.2], [0.13, 0.24]]),
    lathe([[0.105, 0.22], [0.1, 0.52], [0.125, 0.54], [0.125, 0.585], [0.1, 0.605], [0.105, 0.88]], { n: 20, smooth: 50 }),
    hexL([[0.11, 0.87], [0.2, 0.9], [0.28, 0.955], [0.3, 1.0], [0.29, 1.035], [0.21, 1.05]]),
    hexL([[0.175, 1.05], [0.175, 1.33]], { smooth: 10 }),
    hexL([[0.2, 1.325], [0.44, 1.365], [0.5, 1.395], [0.49, 1.43], [0.37, 1.47], [0.24, 1.525], [0.13, 1.57], [0.06, 1.6]], { deform: roofDeform }),
    lathe([[0.075, 1.595], [0.09, 1.62], [0.06, 1.645], [0.07, 1.66], [0.088, 1.69], [0.07, 1.73], [0.035, 1.77], [0.001, 1.8]], { n: 16, smooth: 60 }),
  ]);
  // openings: a tall window on the front and back faces, a round moon window on two side faces (recessed, almost flush)
  const ap = 0.175 * Math.cos(Math.PI / 6) - 0.004, wins = [];
  for (const k of [0, 3]) { const a = Math.PI / 2 + Math.PI / 6 + k * Math.PI / 3; wins.push(xformMesh(rbox(0.12, 0.17, 0.01, 2), MUL(T(Math.cos(a) * ap, 1.19, Math.sin(a) * ap), RY(-a + Math.PI / 2)))); }
  for (const k of [1, 4]) { const a = Math.PI / 2 + Math.PI / 6 + k * Math.PI / 3; wins.push(xformMesh(lathe([[0.001, -0.005], [0.05, -0.005], [0.05, 0.005], [0.001, 0.005]], { n: 20 }), MUL(T(Math.cos(a) * ap, 1.2, Math.sin(a) * ap), RY(-a + Math.PI / 2), RX(Math.PI / 2)))); }
  LANTERN.gm = { stone: glMesh(finalize(stone)), windows: glMesh(finalize(mergeMesh(wins))) };
}
// p world pos, yaw; which palette; lit 0..1 (window glow)
function lanternItems(p, yaw, which, lit = 0) {
  lanternBuild();
  const M = MUL(T(...p), RY(yaw));
  const st = which ? [hx('b0aa98'), hx('9c9686')] : [hx('7a8092'), hx('6a7082')];
  return [
    { gm: LANTERN.gm.stone, model: M, mat: { type: 3, col: st[0], col2: st[1], id: 501, moss: 0.95 }, restUp: [0, 1, 0] },
    { gm: LANTERN.gm.windows, model: M, mat: { type: 5, col: hx('15141c'), id: 502, emit: lit, emitCol: hx('ffd38a') } },
  ];
}
// ---- petals (each tumble view is its own drawing, like the leaves) ----
const PETAL = { views: null };
function buildPetals() {
  if (PETAL.views) return;
  const cols = [[hx('f4b8bf'), hx('d88a9a')], [hx('fbf3e6'), hx('d8c8d0')], [hx('f6dc7a'), hx('d8a850')], [hx('f0a0a8'), hx('c87888')], [hx('fff8ee'), hx('e0d0c8')]];
  PETAL.views = cols.map(([top, shd], ci) => {
    const out = [];
    for (let v = 0; v < 8; v++) {
      const S = 40, c = mkCanvas(S, S), g = c.getContext('2d');
      const th = v / 8 * TAU, aw = Math.max(0.15, Math.abs(Math.cos(th)));
      g.translate(S / 2, S / 2);
      const L = 14, Wd = 8 * aw;
      const path = () => { g.beginPath(); g.moveTo(0, -L); g.bezierCurveTo(Wd * 1.3, -L * 0.4, Wd, L * 0.7, 0, L); g.bezierCurveTo(-Wd, L * 0.7, -Wd * 1.3, -L * 0.4, 0, -L); g.closePath(); };
      path(); g.fillStyle = css(Math.cos(th) < 0 ? shd : top); g.fill();
      g.save(); path(); g.clip(); g.fillStyle = css(shd); g.fillRect(Wd * 0.15, -L, Wd * 2, L * 2); g.restore();
      path(); g.lineWidth = 1; g.strokeStyle = css(mixc(shd, hx('5a3a4a'), 0.5)); g.stroke();
      out.push(c);
    }
    return out;
  });
}
// draw a petal at screen pos with tumble phase ph (held on twos by the caller)
function drawPetal(g, x, y, size, ph, col, rot, a = 1) {
  buildPetals();
  const v = ((Math.floor(ph / TAU * 8) % 8) + 8) % 8;
  g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(rot); g.drawImage(PETAL.views[col % PETAL.views.length][v], -size / 2, -size / 2, size, size); g.restore();
}
// ---- a bellflower, drawn per drawing: k 0 wilted .. 1 upright and open; colK 0 grey .. 1 colour (runs up from the base)
function drawBellflower(g, x, y, s, k, colK, seed, o = {}) {
  const rng = new RNG(seed);
  const greyStem = hx('4a5262'), stem = hx('4f7a34'), greyPet = hx('70748a'), pet = hx('7f72d8'), petShade = hx('5446a8'), greyShade = hx('555a6e');
  const ink = hx('25233a');
  // stem: bezier from base; wilted droops over, healthy stands with a gentle arc
  const H = 150 * s;
  const tip = [x + lerp(70, 18, k) * s, y - lerp(70, H, k)];
  const c1 = [x + lerp(10, 2, k) * s, y - lerp(110, H * 0.45, k)], c2 = [x + lerp(70, 10, k) * s, y - lerp(125, H * 0.85, k)];
  const pts = bez([x, y], c1, c2, tip, 24);
  const from = o.from ?? 0, colAt = (t) => clamp((colK * 1.3 - Math.abs(t - from)) * 4); // colour spreads along the stem from `from`
  // leaves at the base
  for (const [t, side, len] of [[0.12, -1, 46], [0.2, 1, 40], [0.34, -1, 30]]) {
    const p = pts[Math.round(t * 24)], ang = -Math.PI / 2 + side * lerp(1.25, 0.75, k) + (rng.next() - 0.5) * 0.2;
    const L = len * s, dx = Math.cos(ang) * L, dy = Math.sin(ang) * L;
    const cc = mixc(greyStem, stem, colAt(t));
    g.fillStyle = css(cc); g.beginPath(); g.moveTo(p[0], p[1]);
    g.quadraticCurveTo(p[0] + dx * 0.5 - dy * 0.25, p[1] + dy * 0.5 + dx * 0.25, p[0] + dx, p[1] + dy);
    g.quadraticCurveTo(p[0] + dx * 0.5 + dy * 0.12, p[1] + dy * 0.5 - dx * 0.12, p[0], p[1]); g.fill();
    g.strokeStyle = css(ink, 0.8); g.lineWidth = 1.1; g.stroke();
  }
  // stem with ink edge
  const ws = pts.map((_, i) => lerp(5.5, 3, i / 24) * s);
  taper(g, pts, ws.map(w => w + 2), ink, 0.85); taper(g, pts, ws, mixc(greyStem, stem, colAt(0.5)));
  for (let i = 0; i < 24; i++) { const t = i / 24; if (colAt(t) > 0 && colAt(t) < 1) { taper(g, pts.slice(i, i + 2), ws.slice(i, i + 2), mixc(greyStem, stem, colAt(t))); } }
  resetG(g);
  // bells hang from short pedicels near the tip
  const bells = [[0.78, -1, 1.0], [0.9, 1, 0.85], [1.0, 0, 1.1]];
  for (const [t, side, bs] of bells) {
    const p = pts[Math.round(t * 24)];
    const cK = colAt(t + 0.08);
    // wilted: bell points down; healthy: points out and slightly up
    const ang = lerp(Math.PI * 0.5 + side * 0.15, -Math.PI * 0.05 + side * 0.9, k) + (rng.next() - 0.5) * 0.15;
    const open = lerp(0.35, 1, k);
    const L = 30 * s * bs, Wb = 12 * s * bs * open;
    g.save(); g.translate(p[0], p[1]); g.rotate(ang - Math.PI / 2);
    // bell body (from attachment at 0,0 opening toward +y), 5-lobed lip
    const lip = [];
    for (let i = 0; i <= 10; i++) { const u = i / 10, xx = lerp(-Wb * 1.25, Wb * 1.25, u); lip.push([xx, L + Math.abs(Math.sin(u * Math.PI * 2.5)) * 5 * s * open]); }
    const body = () => { g.beginPath(); g.moveTo(-Wb * 0.25, 0); g.quadraticCurveTo(-Wb * 0.95, L * 0.45, lip[0][0], lip[0][1]); for (const q of lip) g.lineTo(q[0], q[1]); g.quadraticCurveTo(Wb * 0.95, L * 0.45, Wb * 0.25, 0); g.closePath(); };
    body(); g.fillStyle = css(mixc(greyPet, pet, cK)); g.fill();
    g.save(); body(); g.clip(); g.fillStyle = css(mixc(greyShade, petShade, cK)); g.beginPath(); g.moveTo(Wb * 0.05, 0); g.quadraticCurveTo(Wb * 0.2, L * 0.6, Wb * 0.3, L + 8 * s); g.lineTo(Wb * 2, L + 8 * s); g.lineTo(Wb * 2, 0); g.fill(); g.restore();
    body(); g.strokeStyle = css(ink); g.lineWidth = 1.2; g.stroke();
    // inner throat when open
    if (open > 0.6) { g.fillStyle = css(mixc(greyShade, hx('3a2e86'), cK), (open - 0.6) * 2.2); g.beginPath(); g.ellipse(0, L + 2 * s, Wb * 0.85, 4 * s * open, 0, 0, TAU); g.fill(); }
    // sepals
    g.fillStyle = css(mixc(greyStem, stem, cK)); g.beginPath(); g.moveTo(-6 * s, 2 * s); g.lineTo(0, -4 * s); g.lineTo(6 * s, 2 * s); g.lineTo(0, 7 * s); g.closePath(); g.fill();
    g.restore();
  }
  return { tip, top: pts[24], pts };
}
// ---- a farmhouse painted from 3D corners through the plate camera (no ink: backgrounds are drawn in value) ----
// cam: the shot's base Cam; off: plate offset; o: {p:[x,y,z] centre of floor, w, d, h (wall), rh (roof rise), yaw, lanterns:true}
function paintHouse(g, cam, off, which, o, rng) {
  const pal = PALS[which];
  const cy = Math.cos(o.yaw || 0), sy = Math.sin(o.yaw || 0);
  const Wp = (x, y, z) => { const X = o.p[0] + x * cy - z * sy, Z = o.p[2] + x * sy + z * cy; const q = cam.project([X, o.p[1] + y, Z]); return [q[0] + off, q[1] + off, q[2]]; };
  const { w, d, h, rh } = o, ov = o.ov ?? 0.35;
  const poly = (pts, col, a = 1) => { g.fillStyle = css(col, a); g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); };
  const tex = (pts, col, n, sz) => { g.save(); g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.clip();
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    for (let i = 0; i < n; i++) dab(g, 'flat', rng.int(0, 5), rng.range(x0, x1), rng.range(y0, y1), sz * rng.range(0.8, 1.6), sz * 0.3, rng.range(-0.1, 0.1), jit(col, rng, 0.03, 0.015), rng.range(0.25, 0.5));
    resetG(g); g.restore(); };
  // walls: front (z = +d/2) and side (x = +w/2 or -w/2 depending on view)
  const front = [Wp(-w / 2, 0, d / 2), Wp(w / 2, 0, d / 2), Wp(w / 2, h, d / 2), Wp(-w / 2, h, d / 2)];
  const sideX = (cam.pos[0] - o.p[0]) * cy + (cam.pos[2] - o.p[2]) * sy > 0 ? w / 2 : -w / 2;
  const side = [Wp(sideX, 0, d / 2), Wp(sideX, 0, -d / 2), Wp(sideX, h, -d / 2), Wp(sideX, h, d / 2)];
  const lightOnSide = sideX > 0;
  poly(side, lightOnSide ? pal.wall : pal.wallShade); tex(side, lightOnSide ? pal.wall : pal.wallShade, 8, 14);
  poly(front, lightOnSide ? pal.wallShade : pal.wall); tex(front, lightOnSide ? pal.wallShade : pal.wall, 10, 16);
  // close up: charred-board wainscot along the bottom of both walls, posts on the side wall
  if (o.detail) {
    const boards = which ? hx('4a3a32') : mixc(pal.wood, pal.ink, 0.25), bl = which ? hx('6e5848') : mixc(pal.wood, pal.mist, 0.15);
    for (const [A, B_] of [[[-w / 2, d / 2], [w / 2, d / 2]], [[sideX, d / 2], [sideX, -d / 2]]]) {
      const q = [Wp(A[0], 0, A[1]), Wp(B_[0], 0, B_[1]), Wp(B_[0], h * 0.32, B_[1]), Wp(A[0], h * 0.32, A[1])];
      poly(q, boards);
      g.strokeStyle = css(bl, 0.6); g.lineWidth = 1;
      for (let i = 1; i < 14; i++) { const u = i / 14, a_ = Wp(lerp(A[0], B_[0], u), 0, lerp(A[1], B_[1], u)), b_ = Wp(lerp(A[0], B_[0], u), h * 0.32, lerp(A[1], B_[1], u)); g.beginPath(); g.moveTo(a_[0], a_[1]); g.lineTo(b_[0], b_[1]); g.stroke(); }
    }
    g.strokeStyle = css(pal.wood); g.lineWidth = Math.max(1, Math.abs(side[1][0] - side[0][0]) / 40);
    for (const u of [0, 0.5, 1]) { const a_ = Wp(sideX, 0, lerp(d / 2, -d / 2, u)), b_ = Wp(sideX, h, lerp(d / 2, -d / 2, u)); g.beginPath(); g.moveTo(a_[0], a_[1]); g.lineTo(b_[0], b_[1]); g.stroke(); }
  }
  // timber frame on the front
  g.strokeStyle = css(pal.wood); g.lineWidth = Math.max(1, (front[1][0] - front[0][0]) / 60);
  for (const u of [0, 0.33, 0.66, 1]) { const a = Wp(lerp(-w / 2, w / 2, u), 0, d / 2), b = Wp(lerp(-w / 2, w / 2, u), h, d / 2); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  { const a = Wp(-w / 2, h * 0.55, d / 2), b = Wp(w / 2, h * 0.55, d / 2); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  // windows (lit at dawn)
  const win = [];
  for (const u of [0.17, 0.5, 0.83]) {
    if (rng.next() < 0.3) continue;
    const q = [Wp(lerp(-w / 2, w / 2, u) - w * 0.08, h * 0.62, d / 2), Wp(lerp(-w / 2, w / 2, u) + w * 0.08, h * 0.62, d / 2), Wp(lerp(-w / 2, w / 2, u) + w * 0.08, h * 0.88, d / 2), Wp(lerp(-w / 2, w / 2, u) - w * 0.08, h * 0.88, d / 2)];
    poly(q, pal.window); win.push(q);
  }
  // hip-gable roof with deep eaves
  const e = [Wp(-w / 2 - ov, h, d / 2 + ov), Wp(w / 2 + ov, h, d / 2 + ov), Wp(w / 2 + ov, h, -d / 2 - ov), Wp(-w / 2 - ov, h, -d / 2 - ov)];
  const r0 = Wp(-w * 0.28, h + rh, 0), r1 = Wp(w * 0.28, h + rh, 0);
  // eave shadow on the walls (hard edge)
  poly([front[3], front[2], Wp(w / 2, h - h * 0.22, d / 2), Wp(-w / 2, h - h * 0.12, d / 2)], pal.shadow, 0.55);
  poly([e[0], e[1], r1, r0], which ? pal.roofLit : pal.roof); tex([e[0], e[1], r1, r0], which ? pal.roofLit : pal.roof, 12, 16);
  // tile lines
  g.strokeStyle = css(mulc(pal.roof, 0.75), 0.6); g.lineWidth = 1;
  for (let i = 1; i < 9; i++) { const u = i / 9; const a = [lerp(e[0][0], e[1][0], u), lerp(e[0][1], e[1][1], u)], b = [lerp(r0[0], r1[0], u), lerp(r0[1], r1[1], u)]; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  const hipSide = sideX > 0 ? [e[1], e[2], r1] : [e[3], e[0], r0];
  poly(hipSide, sideX > 0 ? mulc(pal.roof, 0.9) : mulc(pal.roof, 0.7));
  // ridge
  g.strokeStyle = css(mulc(pal.roof, 0.6)); g.lineWidth = Math.max(1.5, Math.hypot(r1[0] - r0[0], r1[1] - r0[1]) / 30); g.beginPath(); g.moveTo(r0[0], r0[1]); g.lineTo(r1[0], r1[1]); g.stroke();
  g.strokeStyle = css(which ? hx('f6dcae') : hx('6a7088'), 0.7); g.lineWidth = 1.2; g.beginPath(); g.moveTo(e[0][0], e[0][1]); g.lineTo(e[1][0], e[1][1]); g.stroke();
  // eave lantern hook point (front-left corner under the eave), returned in plate px
  return { lantern: Wp(-w * 0.32, h - 0.25, d / 2 + ov * 0.6), chimney: Wp(w * 0.2, h + rh, 0), win };
}

// ---- light for the cels: the grey hour (cool sky light from the upper right) and dawn (warm low sun), never gobo ----
const GL_PRE = { sun: [0.5, 0.75, 0.42], sunCol: [0.86, 0.89, 0.97], amb: [0.52, 0.55, 0.7], amb2: [0.42, 0.44, 0.58],
  fogCol: [0.42, 0.45, 0.58], fog: [0.004, 30], noShadow: true, shadowCenter: [0, 1, 0], shadowR: 6 };
const GL_DAWN = { sun: [0.82, 0.4, 0.42], sunCol: [1.08, 0.98, 0.84], amb: [0.62, 0.64, 0.78], amb2: [0.5, 0.52, 0.66],
  fogCol: [0.95, 0.88, 0.78], fog: [0.004, 30], shadowCenter: [0, 1, 0], shadowR: 6 };
const ghostLight = (k) => lightMix(GL_PRE, GL_DAWN, k);
function groundPal(which) { const P = PALS[which]; return { far: P.land, mid: mixc(P.land, P.grass[0], 0.5), near: P.grass[2], dark: P.soil, moss: P.grass[1], light: P.grass[3] }; }
// world point -> plate pixel, for painting things where the cel camera will see them
const toPlate = (cam, p) => { const q = cam.project(p); return [q[0] + BM, q[1] + BM, q[2]]; };
// out-of-focus plate (the background of an insert)
function blurPlate(pl, px) { const c = mkCanvas(pl.w, pl.h), q = c.getContext('2d'); q.filter = `blur(${px}px)`; q.drawImage(pl.c, 0, 0); pl.g.clearRect(0, 0, pl.w, pl.h); pl.g.drawImage(c, 0, 0); }

// ---- 2D effects drawn per drawing ----
// a drop of shadow (or water), stretched along its fall by speed vy (px/s)
function drawDrip(g, x, y, r, vy, col, a = 1) {
  const st = 1 + Math.min(2.2, Math.abs(vy) * 0.0035);
  g.save(); g.globalAlpha = a; g.translate(x, y); g.fillStyle = css(col); g.beginPath();
  g.moveTo(0, -r * st * 1.7); g.bezierCurveTo(r * 0.85, -r * st * 0.5, r, r * 0.55, 0, r); g.bezierCurveTo(-r, r * 0.55, -r * 0.85, -r * st * 0.5, 0, -r * st * 1.7);
  g.fill(); g.restore();
}
// a taffy strand between screen points a (top) and b (bottom); k 0 thick .. 1 about to snap (thin waist)
function drawStrand(g, a, b, w, k, sag, col) {
  const mid = [(a[0] + b[0]) / 2 + sag, (a[1] + b[1]) / 2];
  const pts = qbez(a, mid, b, 16);
  taper(g, pts, pts.map((_, i) => { const t = i / 16; return Math.max(0.6, w * (1 - (1 - 0.06) * k * Math.pow(Math.sin(Math.PI * t), 0.6)) * (1 + 0.6 * (1 - Math.sin(Math.PI * t)))); }), col);
  resetG(g);
}
// a pale spirit mote: soft halo + a small bright core
function drawMote(g, x, y, r, a = 1) {
  glowFx(g, x, y, r * 6, [0.75, 0.82, 1.0], 0.35 * a, 'screen');
  g.save(); g.globalAlpha = a; g.fillStyle = css(hx('f4f6ff')); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
}
// a paper lantern (chochin) hanging from an eave: lit 0..1
function drawChochin(g, x, y, s, lit, sway = 0) {
  g.save(); g.translate(x, y); g.rotate(sway);
  const w = 11 * s, h = 15 * s, ink = hx('241f2c');
  g.strokeStyle = css(ink); g.lineWidth = Math.max(1, 1.2 * s * 0.5); g.beginPath(); g.moveTo(0, -h * 1.1); g.lineTo(0, -h * 0.62); g.stroke();
  const paper = mixc(hx('b9b2b0'), hx('ffcf7a'), lit), shade = mixc(hx('8d8692'), hx('e8833a'), lit);
  g.fillStyle = css(paper); g.beginPath(); g.ellipse(0, 0, w, h * 0.62, 0, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.ellipse(0, 0, w, h * 0.62, 0, 0, TAU); g.clip();
  g.fillStyle = css(shade); g.beginPath(); g.ellipse(w * 0.55, 0, w * 0.75, h * 0.7, 0, 0, TAU); g.fill();
  g.strokeStyle = css(mixc(shade, ink, 0.4), 0.6); g.lineWidth = Math.max(0.6, s * 0.4);
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.ellipse(0, i * h * 0.17, w, h * 0.06, 0, 0, Math.PI); g.stroke(); }
  if (lit > 0.5) { g.fillStyle = css(hx('c8402c'), 0.85); g.fillRect(-w * 0.18, -h * 0.25, w * 0.36, h * 0.5); }
  g.restore();
  g.fillStyle = css(ink); g.fillRect(-w * 0.55, -h * 0.68, w * 1.1, h * 0.12); g.fillRect(-w * 0.5, h * 0.56, w, h * 0.12);
  g.strokeStyle = css(ink); g.lineWidth = Math.max(1, s * 0.5); g.beginPath(); g.ellipse(0, 0, w, h * 0.62, 0, 0, TAU); g.stroke();
  g.restore();
  if (lit > 0) { glowFx(g, x, y, 60 * s, [1, 0.72, 0.36], 0.45 * lit, 'screen'); glowFx(g, x, y, 14 * s, [1, 0.85, 0.55], 0.5 * lit, 'lighter'); }
}
// the flame the ghost leaves behind: a teardrop flame whose tip can curl over like its wick (curl 0..1); fi = drawing index
function drawWickFlame(g, x, y, s, curl, fi, a = 1) {
  const rng = new RNG(4000 + fi * 13);
  const spine = (lk) => { const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14;
    const ang = -Math.PI / 2 + curl * Math.pow(t, 1.6) * 2.3 + 0.05 * Math.sin(fi * 1.7 + t * 4);
    const p = i ? pts[i - 1] : [x, y]; const L = 30 * s * lk / 14;
    pts.push(i ? [p[0] + Math.cos(ang) * L, p[1] + Math.sin(ang) * L] : [x, y]); } return pts; };
  const layer = (lk, wk, col, al) => {
    const sp = spine(lk * rng.range(0.94, 1.06)), Lp = [], Rp = [];
    for (let i = 0; i < sp.length; i++) {
      const t = i / (sp.length - 1), p = sp[i], q = sp[Math.min(sp.length - 1, i + 1)], o = sp[Math.max(0, i - 1)];
      let dx = q[0] - o[0], dy = q[1] - o[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const w = 9 * s * wk * Math.pow(Math.sin(Math.PI * Math.min(1, 0.35 + t * 0.75)), 0.8) * (1 - t * 0.7);
      Lp.push([p[0] - dy * w, p[1] + dx * w]); Rp.push([p[0] + dy * w, p[1] - dx * w]);
    }
    g.beginPath(); g.moveTo(Lp[0][0], Lp[0][1]); for (const p of Lp) g.lineTo(p[0], p[1]); for (let i = Rp.length - 1; i >= 0; i--) g.lineTo(Rp[i][0], Rp[i][1]); g.closePath();
    g.globalAlpha = al * a; g.fillStyle = css(col); g.fill();
  };
  g.save();
  glowFx(g, x, y - 12 * s, 90 * s, [1, 0.7, 0.35], 0.35 * a, 'screen');
  layer(1, 1, hx('f2903a'), 0.95); layer(0.78, 0.66, hx('ffd36a'), 1); layer(0.5, 0.36, hx('fff6dc'), 1);
  g.restore();
  glowFx(g, x, y - 10 * s, 26 * s, [1, 0.85, 0.55], 0.55 * a, 'lighter');
}

// ---------- the hollow under the great tree (shots 3-7, 11), painted from any camera ----------
// World layout, shared by every shot here: trunk centre (0,0,-3.6) radius 1.7, a sacred rope round it at 2 m;
// the pool at (0,0,-1.15) tucked against the trunk between two buttress roots; the stone lantern at (-2.1,0,-0.5);
// the bellflower at (1.15,0,-0.55). The valley lies toward +x and dawn comes from +x (light from the upper right).
const HOLLOW = {
  trunk: [0, 0, -3.6], trunkR: 1.7, pool: [0, 0, -1.15], poolR: 0.78, lantern: [-2.1, 0, -0.5], lanternYaw: 0.25, flower: [1.15, 0, -0.55],
  rope: 2.05,
  // buttress roots: a path on the ground [x, z] and the flange height at each point (0 = it dives into the soil)
  roots: [
    { p: [[-0.45, -2.05], [-0.62, -1.72]], h: [0.62, 0], side: -1 },
    { p: [[0.5, -2.05], [0.68, -1.68]], h: [0.55, 0], side: 1 },
    { p: [[-1.65, -3.0], [-2.7, -2.55], [-3.9, -2.0]], h: [1.05, 0.42, 0], side: -1 },
    { p: [[1.65, -3.0], [2.8, -2.65], [4.0, -2.05]], h: [0.95, 0.36, 0], side: 1 },
    { p: [[-1.0, -2.3], [-1.35, -1.6], [-1.62, -0.72], [-1.9, 0.25]], h: [1.15, 0.56, 0.24, 0], side: -1 },
    { p: [[1.0, -2.3], [1.32, -1.52], [1.58, -0.72], [2.0, 0.18]], h: [1.05, 0.5, 0.2, 0], side: 1 },
  ],
};
const trunkR = (y) => HOLLOW.trunkR * (1 + 0.42 * Math.exp(-Math.max(0, y) / 0.85));
const trunkCx = (y) => HOLLOW.trunk[0] + 0.14 * Math.sin(y * 0.33 + 0.4);
// a point on the trunk surface: u across (-1 left .. 1 right as seen from +z), height y
const trunkPt = (u, y) => { const r = trunkR(y); return [trunkCx(y) + r * u, y, HOLLOW.trunk[2] + r * Math.sqrt(Math.max(0, 1 - u * u))]; };
function paintBigTrunk(g, cam, which, rng) {
  const pal = PALS[which].bark, Y1 = 13, n = 60;
  const ys = []; for (let i = 0; i <= n; i++) ys.push(Y1 * Math.pow(i / n, 1.4));
  const P = (u, y) => toPlate(cam, trunkPt(u, y));
  const band = (u0, u1, col, a = 1) => { // a vertical band of the trunk between two across-positions
    g.fillStyle = css(col, a); g.beginPath();
    ys.forEach((y, i) => { const q = P(u0(y), y); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); });
    for (let i = ys.length - 1; i >= 0; i--) { const q = P(u1(ys[i]), ys[i]); g.lineTo(q[0], q[1]); }
    g.closePath(); g.fill();
  };
  // the base contour bulges toward us: fill the front ground ring first so the silhouette closes
  band(() => -1, () => 1, pal.mid);
  g.fillStyle = css(pal.mid); g.beginPath();
  for (let i = 0; i <= 24; i++) { const u = lerp(-1, 1, i / 24), q = P(u, 0); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }
  { const q = P(1, 0.4), r = P(-1, 0.4); g.lineTo(q[0], q[1]); g.lineTo(r[0], r[1]); } g.closePath(); g.fill();
  // three values: shade side (left), mid, lit side (right), with a broken edge between them
  const wob = (s) => (y) => 0.06 * Math.sin(y * 1.7 + s) + 0.04 * Math.sin(y * 4.1 + s * 2);
  band(() => -1, (y) => -0.32 + wob(1)(y), pal.dark);
  band((y) => 0.38 + wob(2)(y), () => 1, mixc(pal.mid, pal.light, 0.55));
  band((y) => 0.86 + wob(3)(y) * 0.5, () => 1, which ? pal.rim : mixc(pal.light, PALS[0].skyLow, 0.25), which ? 0.9 : 0.6);
  // furrows: long dark grooves down the bark, a lit ridge on their right where the light reaches
  for (let k = 0; k < 17; k++) {
    const u0 = -0.92 + k * 0.115 + rng.range(-0.03, 0.03), seed = rng.range(0, 10);
    const pts = [], pts2 = [], ws = [];
    for (let i = 0; i <= 40; i++) {
      const y = lerp(-0.05, Y1, Math.pow(i / 40, 1.3)), u = clamp(u0 + 0.05 * Math.sin(y * 0.6 + seed) + 0.03 * Math.sin(y * 2.3 + seed), -0.99, 0.99);
      const q = P(u, y), q2 = P(clamp(u + 0.025, -1, 1), y);
      pts.push([q[0], q[1]]); pts2.push([q2[0], q2[1]]);
      ws.push(Math.max(1, 0.045 * (0.6 + 0.8 * vnoise1(y * 1.3 + seed)) * cam.f / q[2] * Math.sqrt(1 - u * u)));
    }
    taper(g, pts, ws, mixc(pal.dark, PALS[which].ink, 0.35), 0.9);
    if (u0 > -0.2) taper(g, pts2, ws.map(w => w * 0.45), mixc(pal.light, pal.mid, 0.2), 0.75);
  }
  resetG(g);
  // bark: vertical dry strokes, their size capped so a huge trunk keeps a brush-sized texture
  for (let i = 0; i < 1400; i++) {
    const u = rng.range(-0.97, 0.97), y = Y1 * Math.pow(rng.next(), 1.6), q = P(u, y), s = Math.min(1.6, 0.9 * cam.f / q[2] / 300);
    const r = rng.next(), col = u > 0.38 ? (r < 0.5 ? pal.light : pal.mid) : u < -0.32 ? (r < 0.6 ? pal.dark : pal.mid) : (r < 0.5 ? pal.mid : mixc(pal.mid, pal.dark, 0.5));
    dab(g, 'dry', rng.int(0, 3), q[0], q[1], rng.range(30, 90) * s, rng.range(4, 9) * s, Math.PI / 2 + rng.range(-0.06, 0.06), jit(col, rng, 0.03), rng.range(0.35, 0.75));
  }
  // moss in patches on the flare, heavier on the shaded side
  for (let k = 0; k < 6; k++) {
    const u0 = rng.range(-0.98, 0.55), y0 = rng.range(0.02, 0.5), R_ = rng.range(0.15, 0.3);
    for (let i = 0; i < 22; i++) {
      const u = clamp(u0 + rng.range(-1, 1) * R_ / trunkR(y0), -0.99, 0.99), y = Math.max(0, y0 + rng.range(-0.5, 0.5) * R_ * 0.6), q = P(u, y), s = cam.f / q[2];
      const col = mixc(mixc(pal.moss, pal.mid, 0.4), pal.light, clamp((y0 - y) / R_ + 0.2) * 0.35);
      dab(g, 'round', rng.int(0, 5), q[0], q[1], rng.range(0.07, 0.13) * s, rng.range(0.05, 0.09) * s, rng.range(-0.2, 0.2), jit(col, rng, 0.02), rng.range(0.55, 0.8));
    }
  }
  resetG(g);
  // a knot-hole on the shaded side
  { const q = P(-0.42, 1.55), s = cam.f / q[2]; g.fillStyle = css(mixc(pal.dark, PALS[which].ink, 0.6)); g.beginPath(); g.ellipse(q[0], q[1], 0.09 * s, 0.17 * s, 0.1, 0, TAU); g.fill();
    g.strokeStyle = css(pal.light, 0.7); g.lineWidth = Math.max(1, 0.025 * s); g.beginPath(); g.ellipse(q[0] + 0.01 * s, q[1], 0.12 * s, 0.21 * s, 0.1, -1.2, 1.1); g.stroke(); }
  // the sacred rope (shimenawa) with paper streamers: straw, twisted
  const straw = which ? [hx('d8c48e'), hx('a68c5a'), hx('f2e2b0')] : [hx('8a8a92'), hx('63656f'), hx('a6a8b2')];
  const rope = [], rw = [];
  for (let i = 0; i <= 48; i++) { const u = lerp(-1, 1, i / 48), y = HOLLOW.rope - 0.08 * (1 - u * u) + 0.02 * Math.sin(u * 9), q = P(u * 1.04, y); rope.push([q[0], q[1]]); rw.push(0.16 * cam.f / q[2] * (0.55 + 0.45 * Math.sqrt(1 - u * u))); }
  taper(g, rope, rw.map(w => w * 1.2), PALS[which].shadow, 0.5);
  taper(g, rope.map((p, i) => [p[0], p[1] - rw[i] * 0.08]), rw, straw[0]);
  taper(g, rope.map((p, i) => [p[0], p[1] + rw[i] * 0.28]), rw.map(w => w * 0.4), straw[1]);
  g.strokeStyle = css(straw[1]); g.lineCap = 'round';
  for (let i = 2; i < 47; i += 2) { const p = rope[i], w = rw[i]; g.lineWidth = Math.max(1, w * 0.12); g.beginPath(); g.moveTo(p[0] - w * 0.35, p[1] - w * 0.45); g.lineTo(p[0] + w * 0.3, p[1] + w * 0.35); g.stroke(); }
  for (let i = 1; i < 47; i += 2) { const p = rope[i], w = rw[i]; g.strokeStyle = css(straw[2], 0.7); g.lineWidth = Math.max(1, w * 0.07); g.beginPath(); g.moveTo(p[0] - w * 0.25, p[1] - w * 0.4); g.lineTo(p[0] + w * 0.15, p[1] - w * 0.05); g.stroke(); }
  // shide: zigzag paper streamers
  const paper = which ? hx('fbf6ea') : hx('b4b6c2'), paperS = which ? hx('d8d0c8') : hx('8a8c9a');
  for (const u of [-0.62, -0.18, 0.28, 0.7]) {
    const i = Math.round((u / 1.04 + 1) / 2 * 48), p = rope[i], s = rw[i] / 0.16;
    let x = p[0], y = p[1] + rw[i] * 0.4;
    for (let k = 0; k < 4; k++) {
      const w = 0.07 * s, h = 0.09 * s, dir = k % 2 ? -1 : 1;
      g.fillStyle = css(k % 2 ? paperS : paper);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * dir, y); g.lineTo(x + w * dir, y + h); g.lineTo(x, y + h); g.closePath(); g.fill();
      x += w * dir * 0.5; y += h * 0.8;
    }
  }
  g.lineCap = 'butt'; resetG(g);
}
// a buttress root: a flange of wood whose top falls from the trunk to the soil; seen face and rounded top
function paintRoot(g, cam, root, which, rng) {
  const pal = PALS[which].bark, n = 26;
  const path = spline(root.p.map((p, i) => [p[0], root.h[i], p[1]]), n).map((p, i) => [p[0], Math.max(0, p[1] + 0.05 * Math.sin(i * 0.8 + root.p[0][0] * 5) * Math.min(1, p[1] * 4)), p[2]]);
  // the flank swells out toward the camera, so the root reads as a rounded hump, not a wall
  const flank = path.map((p, i) => { const a = path[Math.max(0, i - 1)], c = path[Math.min(path.length - 1, i + 1)]; let nx = -(c[2] - a[2]), nz = c[0] - a[0]; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l; if (nz < 0) { nx = -nx; nz = -nz; } return [nx, nz]; });
  const top = path.map(p => toPlate(cam, [p[0], Math.max(0, p[1]), p[2]])), bot = path.map((p, i) => toPlate(cam, [p[0] + flank[i][0] * p[1] * 0.75, 0, p[2] + flank[i][1] * p[1] * 0.75]));
  if (top.some(q => q[2] < 0.3)) return;
  const thick = top.map((q, i) => Math.max(1.5, 0.2 * cam.f / q[2] * Math.sqrt(Math.max(0, path[i][1]) / 1.1 + 0.15)));
  // contact shadow, then the face (lit if it faces the light), then the rounded top
  const face = root.side < 0 ? mixc(pal.dark, pal.mid, 0.8) : mixc(pal.dark, pal.mid, 0.35);
  const poly = (A, B, col, a = 1) => { g.fillStyle = css(col, a); g.beginPath(); A.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); for (let i = B.length - 1; i >= 0; i--) g.lineTo(B[i][0], B[i][1]); g.closePath(); g.fill(); };
  taper(g, bot.map((q, i) => [q[0] - root.side * thick[i] * 0.6, q[1] + thick[i] * 0.15]), thick.map(t => t * 2.4), which ? mixc(PALS[1].shadow, pal.dark, 0.65) : PALS[0].shadow, which ? 0.5 : 0.6);
  // rounded cross-section in value bands: lit shoulder, body, dark underside by the soil
  const band = (f0, f1, col, a = 1) => poly(top.map((q, i) => [lerp(q[0], bot[i][0], f0), lerp(q[1], bot[i][1], f0)]), bot.map((q, i) => [lerp(top[i][0], q[0], f1), lerp(top[i][1], q[1], f1)]), col, a);
  const lit = root.side < 0 ? mixc(face, pal.light, 0.55) : mixc(face, pal.mid, 0.5);
  band(0, 1, face); band(0, 0.3, lit, 0.9); band(0.62, 1, mixc(face, pal.dark, 0.55), 0.85);
  taper(g, top.map((q, i) => [q[0], q[1] + thick[i] * 0.1]), thick.map(t => t * 0.8), mixc(lit, pal.light, 0.4), 0.9);
  if (which) taper(g, top.map((q, i) => [q[0] + thick[i] * 0.1, q[1] - thick[i] * 0.2]), thick.map(t => t * 0.3), pal.rim, 0.7);
  resetG(g);
  // bark strokes along the flange and moss on its top
  for (let i = 0; i < n * 10; i++) {
    const k = rng.int(0, top.length - 2), a = top[k], b = bot[k], v = rng.next(), x = lerp(a[0], b[0], v), y = lerp(a[1], b[1], v);
    const nx = top[k + 1], ang = Math.atan2(lerp(nx[1], bot[k + 1][1], v) - y, lerp(nx[0], bot[k + 1][0], v) - x), s = Math.min(1.4, cam.f / a[2] / 300);
    const r = rng.next(), col = r < 0.45 ? pal.dark : r < 0.75 ? mixc(face, pal.dark, 0.3) : face;
    dab(g, 'dry', rng.int(0, 3), x, y, rng.range(20, 60) * s, rng.range(3, 7) * s, ang, jit(col, rng, 0.03), rng.range(0.4, 0.8));
    if (rng.next() < 0.35) { const s2 = Math.min(1.4, thick[k] / 14), mz = vnoise2(k * 0.25, root.p[0][0]) > 0.55; dab(g, 'round', rng.int(0, 5), a[0] + rng.range(-1, 1) * thick[k], a[1] + rng.range(-0.2, 0.5) * thick[k], rng.range(10, 22) * s2, rng.range(6, 12) * s2, 0, jit(mixc(mixc(pal.moss, face, 0.35), pal.light, rng.next() * 0.25), rng, 0.02), mz ? 0.8 : 0); }
    else { rng.int(0, 5); rng.range(0, 1); rng.range(0, 1); rng.range(0, 1); rng.range(0, 1); rng.next(); rng.next(); rng.next(); }
  }
  resetG(g);
}
// the hilltop ground: crest line against the far valley, value darkening toward us and under the tree
function paintHillGround(g, cam, which, rng, PW, PH) {
  const pal = PALS[which], gp = groundPal(which);
  const crest = []; for (let x = -40; x <= 40; x += 0.5) crest.push(toPlate(cam, [x, -0.0035 * x * x - 0.25, -10 - 0.02 * x * x]));
  const top = Math.min(...crest.map(q => q[1]));
  const near = mixc(pal.land, pal.shadow, 0.45), far = mixc(pal.hillLit, pal.mist, 0.3);
  g.save(); g.beginPath(); crest.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.lineTo(PW + 50, PH + 50); g.lineTo(-50, PH + 50); g.closePath();
  const grd = g.createLinearGradient(0, top, 0, PH); grd.addColorStop(0, css(far)); grd.addColorStop(0.25, css(pal.land)); grd.addColorStop(1, css(near));
  g.fillStyle = grd; g.fill(); g.clip();
  // horizontal strokes that grow toward us
  for (let i = 0; i < 1500; i++) {
    const t = Math.pow(rng.next(), 0.9), y = lerp(top, PH, t), x = rng.range(-30, PW + 30), s = lerp(10, 60, t);
    const r = rng.next(), base = mixc(far, near, smooth(0, 0.9, t)), col = r < 0.25 ? mixc(base, gp.dark, 0.4) : r < 0.45 ? mixc(base, gp.moss, 0.35) : r < 0.55 ? mixc(base, gp.light, 0.25) : base;
    dab(g, rng.next() < 0.5 ? 'flat' : 'dry', rng.int(0, 3), x, y, s * rng.range(0.8, 1.6), s * rng.range(0.14, 0.26), rng.range(-0.05, 0.05), jit(col, rng, 0.02), rng.range(0.45, 0.85));
  }
  resetG(g);
  // shade of the canopy around the trunk
  const tb = toPlate(cam, [HOLLOW.trunk[0], 0, HOLLOW.trunk[2] + 1.2]);
  const sc = cam.f / tb[2];
  for (let i = 0; i < 160; i++) { const a = rng.next() * TAU, d = Math.sqrt(rng.next()); dab(g, 'soft', rng.int(0, 1), tb[0] + Math.cos(a) * d * 5.5 * sc, tb[1] + Math.sin(a) * d * 1.4 * sc, rng.range(1.2, 2.4) * sc, rng.range(0.3, 0.6) * sc, 0, pal.shadow, which ? 0.07 : 0.1); }
  resetG(g);
  // a worn path of stepping stones up to the lantern and the tree
  for (const [x, z, r] of [[0.15, 6.5, 0.32], [-0.35, 4.9, 0.3], [-0.8, 3.5, 0.28], [-1.25, 2.25, 0.27], [-1.55, 1.1, 0.25], [-1.2, 0.35, 0.22]]) {
    const ring = [], ring2 = [];
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, m = 1 + 0.12 * Math.sin(a * 3 + x * 7); ring.push(toPlate(cam, [x + Math.cos(a) * r * m, 0.03, z + Math.sin(a) * r * 0.8 * m])); ring2.push(toPlate(cam, [x + Math.cos(a) * r * m, 0, z + Math.sin(a) * r * 0.8 * m + 0.03])); }
    if (ring.some(q => q[2] < 0.3)) continue;
    const poly = (R_, col, a = 1) => { g.fillStyle = css(col, a); g.beginPath(); R_.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill(); };
    poly(ring2, mixc(pal.stone, pal.ink, 0.55)); poly(ring, mixc(pal.stone, near, 0.35));
    const c = toPlate(cam, [x + r * 0.2, 0.031, z - r * 0.25]), s = cam.f / c[2];
    dab(g, 'flat', rng.int(0, 5), c[0], c[1], r * s * 0.9, r * s * 0.14, 0, mixc(pal.stone, pal.horizon, 0.3), 0.6); resetG(g);
  }
  // grass: tufts close in value to the ground, few far away, more toward us
  const gc = pal.grass.map(c => mixc(c, near, which ? 0.25 : 0.55));
  for (let i = 0; i < 520; i++) {
    const t = Math.pow(rng.next(), 0.7), y = lerp(top + 6, PH, t), x = rng.range(-20, PW + 20);
    if (vnoise2(x * 0.008, y * 0.02) < 0.5) continue;
    paintGrassTuft(g, x, y, { h: lerp(4, 30, t) * rng.range(0.6, 1.2), n: 6, cols: gc.map(c => mixc(c, far, (1 - t) * 0.5)), lean: 0.15, w: lerp(1.2, 3.2, t) }, rng);
  }
  for (let i = 0; i < 26; i++) { const x = rng.range(0, PW), y = rng.range(top + 20, PH); const t = (y - top) / (PH - top); paintFlowers(g, x, y, lerp(8, 30, t), 4, [pal.flowers[i % 3], which ? hx('ffffff') : hx('70748a')], rng, lerp(1.5, 4, t)); }
  g.restore(); resetG(g);
  return top;
}
// paint one state of the hollow into plates P = {sky, ground, trunk, roots, fg}
function paintHollowState(P, cam, which, o = {}) {
  const pal = PALS[which], M = BM, PW = W + 2 * M, PH = H + 2 * M;
  const rng = new RNG(o.seed || 11);
  const hz = toPlate(cam, [cam.pos[0], cam.pos[1] - 1.2, cam.pos[2] - 400])[1];
  paintSkyState(P.sky.g, PW, PH, which, rng, { horizon: clamp(hz / PH, 0.15, 0.95), sun: which ? [PW * 0.92, hz - 10, 520] : null, clouds: [[0, PW, hz - 300, 4, 1.6, 30], [0, PW, hz - 150, 4, 1.2, 20]] });
  for (const [dy, amp, key, fz] of [[-60, 46, 'ridgeFar', 0.0015], [-10, 34, 'ridgeMid', 0.003]]) {
    paintRidge(P.sky.g, PW, PH, which, { y: hz + dy, amp, freq: fz, seed: 3 + dy, col: [PALS[0][key], PALS[1][key]], dark: [PALS[0].hill, PALS[1].hill], rim: [PALS[0].horizon, PALS[1].horizon], fade: 200, tex: 0.5 }, rng);
  }
  paintMist(P.sky.g, PW, { y: hz, thick: 60, col: pal.mist, alpha: which ? 0.35 : 0.5, count: 50, size: 44 }, rng); resetG(P.sky.g);
  paintHillGround(P.ground.g, cam, which, rng, PW, PH);
  const tq = P.trunk.g, lp = fogPal(pal.leaf, pal.mist, 0.05);
  for (const [dx, dy, rx, ry] of [[-3.5, 7.5, 3.2, 1.6], [3.2, 7.8, 3.4, 1.5], [0, 9.5, 4.5, 2], [-6, 6.2, 2.4, 1.2], [6.2, 6.4, 2.4, 1.2]]) {
    const c = toPlate(cam, [HOLLOW.trunk[0] + dx, dy, HOLLOW.trunk[2] - 1]);
    const seed = rng.int(1, 1e6);
    if (c[2] > 0.5) paintCrown(tq, { cx: c[0], cy: c[1], rx: rx * cam.f / c[2], ry: ry * cam.f / c[2], seed, pal: lp, light: L2, leaf: Math.min(40, Math.max(6, 0.12 * cam.f / c[2])), holes: 4, lightAmt: which ? 1 : 0.3 });
  }
  resetG(tq);
  paintBigTrunk(tq, cam, which, rng);
  const rq = P.roots.g;
  for (const r of HOLLOW.roots.slice().sort((a, b) => a.p[a.p.length - 1][1] - b.p[b.p.length - 1][1])) paintRoot(rq, cam, r, which, rng);
  if (o.flowers && which) { // the blue flowers that fill the hollow in the end
    const c = HOLLOW.pool, frng = new RNG((o.seed || 11) + 99);
    for (let i = 0; i < o.flowers; i++) {
      const a = frng.next() * TAU, d = Math.sqrt(frng.next()) * HOLLOW.poolR * 1.15;
      const q = toPlate(cam, [c[0] + Math.cos(a) * d, 0, c[2] + Math.sin(a) * d * 0.85]), s = 0.05 * cam.f / q[2];
      paintGrassTuft(rq, q[0], q[1], { h: s * 2.2, n: 4, cols: pal.grass, w: Math.max(1, s * 0.25), lean: 0.1 }, frng);
      for (let k = 0; k < 3; k++) { const fx = q[0] + frng.range(-1, 1) * s * 0.9, fy = q[1] - s * frng.range(1.2, 2.4);
        dab(rq, 'round', frng.int(0, 5), fx, fy, s * 0.55, s * 0.45, frng.next() * TAU, jit(frng.pick([hx('6f7ee0'), hx('8a7fe0'), hx('5d74d4'), hx('a6b4f4')]), frng, 0.03));
        dab(rq, 'round', frng.int(0, 5), fx, fy, s * 0.14, s * 0.14, 0, hx('f6f0d0')); }
    }
    resetG(rq);
  }
  const fq = P.fg.g;
  paintGrassBand(fq, PW, H + M - 30, H + M + 40, { hFar: 40, hNear: 110, cols: pal.grassFg, n: 60, blades: 7, wNear: 7, lean: 0.12 }, rng);
}
function paintHollow(cam, o = {}) {
  const M = BM, PW = W + 2 * M, PH = H + 2 * M;
  const dT = cam.project([HOLLOW.trunk[0], 0, HOLLOW.trunk[2] + HOLLOW.trunkR])[2], dP = cam.project(HOLLOW.pool)[2];
  const mk = (depth) => [new Plate(PW, PH, depth, -M, -M), new Plate(PW, PH, depth, -M, -M)];
  const P = { sky: mk(400), ground: mk(dP), trunk: mk(dT), roots: mk(dP * 0.95), fg: mk(Math.max(0.8, dP * 0.35)) };
  for (const which of (o.states || [0, 1])) {
    const S = {}; for (const k in P) S[k] = P[k][which];
    paintHollowState(S, cam, which, o);
    blurPlate(S.fg, 4);
    for (const k in S) applyGrain(S[k].g, PW, PH, 0.1);
  }
  return P;
}
function drawHollow(g, P, base, cam, which, layers = ['sky', 'ground', 'trunk', 'roots']) { for (const k of layers) drawPlate(g, P[k][which], base, cam); }
// the bellflower at its place in the hollow, sized by distance
function drawFlowerAt(g, cam, k, colK, seed, o = {}) {
  const q = cam.project(HOLLOW.flower); if (q[2] < 0.2) return null;
  return drawBellflower(g, q[0], q[1], 0.45 * cam.f / q[2] / 150, k, colK, seed, o);
}
// the ghost's scale in every shot
const GS = 0.72;

// a soft contact shadow on the ground under something standing or hovering (h = height above ground)
function contactShadow(g, cam, p, r, h = 0, a = 0.5) {
  const q = cam.project([p[0], 0, p[2]]), s = cam.f / q[2], k = 1 / (1 + h * 1.5);
  g.save(); g.globalAlpha = a * k; g.fillStyle = css(PALS[0].ink);
  g.filter = `blur(${Math.max(1, 0.06 * s)}px)`; g.beginPath(); g.ellipse(q[0], q[1], r * s * (1 + h * 0.3), r * s * 0.3 * (1 + h * 0.3), 0, 0, TAU); g.fill(); g.restore();
}

// ---------- the valley seen from across it: the great tree's hill, the village at its foot, paddies, a river ----------
// Painted in screen space for one camera (the wide establishing view), in both states with identical RNG draws.
// Layers: sky (far), far (ridges + mist), valley (floor, paddies, river, village), hill (the tree's hill), fg.
const VALLEY = { floor: -28, hill: { cx: 560, peak: 330, base: 662, wl: 380, wr: 420 } };
// where a screen pixel's ray meets the valley floor
function floorHit(cam, sx, sy, y = VALLEY.floor) { const a = cam.unproject(sx, sy, 1), d = V3.sub(a, cam.pos), k = (y - cam.pos[1]) / d[1]; return V3.add(cam.pos, V3.mul(d, k)); }
function valleyHillY(x) {
  const h = VALLEY.hill, u = (x - h.cx) / (x < h.cx ? h.wl : h.wr);
  const bell = Math.abs(u) >= 1 ? 0 : Math.pow(Math.cos(u * Math.PI / 2), 1.5);
  const v = (x - (h.cx - 330)) / 270, sh = Math.abs(v) >= 1 ? 0 : Math.pow(Math.cos(v * Math.PI / 2), 1.2);
  return Math.min(h.base - (h.base - h.peak) * bell, h.base - (h.base - 525) * sh) + 9 * (fbm2(x * 0.007, 3.3, 3) - 0.5) * Math.max(bell, sh);
}
function paintValleyState(S, cam, which, o) {
  const M = BM, PW = W + 2 * M, PH = H + 2 * M, pal = PALS[which], rng = new RNG(o.seed || 202), hh = VALLEY.hill;
  const near = (c, k) => mixc(c, pal.mist, k); // aerial perspective
  // sky: a pale place low on the right where the sun will come
  paintSkyState(S.sky.g, PW, PH, which, rng, { horizon: 0.6, stars: 70, sun: [PW * 0.86, PH * 0.6, 520],
    clouds: [[0, PW, 150, 6, 1.7, 60], [400, PW, 290, 5, 1.3, 40], [0, PW * 0.7, 380, 4, 1, 25]] });
  // far: three ridges stepping toward us, each darker and more textured, mist between
  const F = S.far.g;
  paintRidge(F, PW, PH, which, { y: 455 + M, amp: 80, freq: 0.0012, seed: 31, col: [near(pal.ridgeFar, 0.62), near(pal.ridgeFar, 0.62)], dark: [near(pal.ridgeFar, 0.5), near(pal.ridgeFar, 0.5)], fade: 200, tex: 0.3, rim: [near(pal.ridgeFar, 0.75), near(pal.ridgeFar, 0.75)] }, rng);
  paintMist(F, PW, { y: 500 + M, thick: 50, col: pal.mist, alpha: 0.5, count: 40, size: 36 }, rng);
  paintRidge(F, PW, PH, which, { y: 515 + M, amp: 55, freq: 0.0019, seed: 9, col: [near(pal.ridgeFar, 0.45), near(pal.ridgeFar, 0.45)], dark: [near(pal.ridgeFar, 0.3), near(pal.ridgeFar, 0.3)], fade: 150, tex: 0.4, rim: [near(pal.ridgeFar, 0.6), near(pal.ridgeFar, 0.6)] }, rng);
  paintMist(F, PW, { y: 548 + M, thick: 40, col: pal.mist, alpha: 0.55, count: 50, size: 30 }, rng);
  paintRidge(F, PW, PH, which, { y: 572 + M, amp: 38, freq: 0.003, seed: 17, col: [near(pal.ridgeMid, 0.25), near(pal.ridgeMid, 0.25)], dark: [near(pal.hill, 0.2), near(pal.hill, 0.2)], fade: 130, tex: 0.6,
    trees: { n: 90, size: 10, fog: [pal.mist, pal.mist], fogAmt: 0.45 } }, rng);
  paintMist(F, PW, { y: 600 + M, thick: 30, col: pal.mist, alpha: 0.5, count: 50, size: 24 }, rng);
  paintRidge(F, PW, PH, which, { y: 618 + M, amp: 12, freq: 0.006, seed: 23, col: [near(pal.hill, 0.15), near(pal.hill, 0.15)], dark: [pal.hill, pal.hill], fade: 60, tex: 0.6,
    trees: { n: 160, size: 9, fog: [pal.mist, pal.mist], fogAmt: 0.25 } }, rng);
  resetG(F);
  // valley floor
  const V = S.valley.g, top = 622;
  paintGround(V, PW, top + M, PH, { pal: { far: near(pal.land, 0.4), mid: pal.land, near: mixc(pal.land, pal.hill, 0.5), dark: pal.soil, moss: pal.grass[0], light: pal.grass[3] }, density: 0.9 }, rng);
  // paddies: an irregular world grid on the floor, slightly turned; water holds the sky, dry and planted fields between
  const fx = [Math.cos(0.18), Math.sin(0.18)], fz = [-fx[1], fx[0]];
  const quad = (pts, col, a, edge) => { V.fillStyle = css(col, a); V.beginPath(); pts.forEach((q, i) => i ? V.lineTo(q[0], q[1]) : V.moveTo(q[0], q[1])); V.closePath(); V.fill(); if (edge) { V.strokeStyle = css(edge, 0.5); V.lineWidth = 1; V.stroke(); } };
  const cells = [], GX = 11, GZ = 7.5, jitP = (i, j) => [GX * 0.18 * (vnoise2(i * 0.71, j * 1.3) - 0.5) * 2, GZ * 0.2 * (vnoise2(i * 1.7 + 9, j * 0.53) - 0.5) * 2];
  for (let i = -26; i < 26; i++) for (let j = 0; j < 30; j++) {
    const r = rng.next(), r2 = rng.next();
    const pts = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([a, b]) => { const I = i + a, J = j + b, d = jitP(I, J), lx = I * GX + d[0], lz = -88 - J * GZ + d[1]; return toPlate(cam, [lx * fx[0] + lz * fz[0], VALLEY.floor, lx * fx[1] + lz * fz[1]]); });
    if (pts.some(q => q[2] < 1) || pts.every(q => q[1] < top + M) || pts.every(q => q[0] < -20 || q[0] > PW + 20)) continue;
    cells.push([pts, r, r2]);
  }
  cells.sort((a, b) => b[0][0][2] - a[0][0][2]);
  for (const [pts, r, r2] of cells) {
    const y = pts[0][1] - M, t = clamp((y - top) / 300), far = (1 - t) * 0.55;
    const col = r < 0.5 ? mixc(pal.land, mixc(pal.paddy, pal.skyLow, r2 * 0.5), lerp(0.35, 0.6, r2)) : r < 0.8 ? mixc(pal.land, pal.grass[1], 0.5 + r2 * 0.3) : mixc(pal.land, pal.soil, 0.4 + r2 * 0.3);
    const midc = mixc(pal.land, pal.paddy, 0.3);
    quad(pts, mixc(mixc(col, midc, 0.45), pal.mist, far), 0.9, mixc(pal.hill, pal.mist, far * 0.6));
    if (r >= 0.5 && r < 0.8 && t > 0.15) { // planted rows run along the field
      const n = 5, a = pts[0], b = pts[1], c = pts[2], d = pts[3];
      for (let k = 1; k < n; k++) { const u = k / n, A = [lerp(a[0], d[0], u), lerp(a[1], d[1], u)], B_ = [lerp(b[0], c[0], u), lerp(b[1], c[1], u)];
        V.strokeStyle = css(mixc(col, pal.grass[2], 0.5), 0.5); V.lineWidth = 1; V.beginPath(); V.moveTo(A[0], A[1]); V.lineTo(B_[0], B_[1]); V.stroke(); }
    }
  }
  // brush texture over the whole floor so the fields read as paint, not tiles
  for (let i = 0; i < 1400; i++) {
    const t = Math.pow(rng.next(), 0.8), y = lerp(top + M, PH, t), x = rng.range(-30, PW + 30), sz = lerp(14, 70, t), r = rng.next();
    dab(V, 'dry', rng.int(0, 3), x, y, sz * rng.range(0.8, 1.6), sz * rng.range(0.08, 0.16), rng.range(-0.04, 0.04), r < 0.5 ? mixc(pal.land, pal.mist, 0.3 * (1 - t)) : mixc(pal.paddy, pal.skyLow, 0.5), rng.range(0.08, 0.2));
  }
  resetG(V);
  // the river: screen-space course, world width
  const course = spline([[1900, 626], [1640, 648], [1470, 684], [1580, 742], [1380, 820], [1120, 905], [860, 1010]], 60).map(([sx, sy]) => floorHit(cam, sx, sy));
  const side = (k) => course.map((p, i) => { const a = course[Math.max(0, i - 1)], b = course[Math.min(course.length - 1, i + 1)], dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1; return toPlate(cam, [p[0] - dz / l * k, VALLEY.floor, p[2] + dx / l * k]); });
  const wob = (k) => course.map((_, i) => k * (1 + 0.35 * Math.sin(i * 0.37 + 1.1)));
  const sideW = (ks) => course.map((p, i) => { const a = course[Math.max(0, i - 1)], b = course[Math.min(course.length - 1, i + 1)], dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1; return toPlate(cam, [p[0] - dz / l * ks[i], VALLEY.floor, p[2] + dx / l * ks[i]]); });
  const L_ = sideW(wob(3.2)), R_ = sideW(wob(-3.2)), bankL = sideW(wob(4.6)), bankR = sideW(wob(-4.6));
  const strip = (A, B, col, a) => { V.fillStyle = css(col, a); V.beginPath(); A.forEach((q, i) => i ? V.lineTo(q[0], q[1]) : V.moveTo(q[0], q[1])); for (let i = B.length - 1; i >= 0; i--) V.lineTo(B[i][0], B[i][1]); V.closePath(); V.fill(); };
  strip(bankL, bankR, mixc(pal.soil, pal.grass[2], 0.5), 0.85);
  strip(L_, R_, mixc(pal.skyMid, pal.skyLow, 0.55), 0.95);
  for (const B of [bankL, bankR]) for (let i = 2; i < B.length - 2; i += 1) { const q = B[i], s = cam.f / q[2]; paintGrassTuft(V, q[0] + rng.range(-1, 1) * s, q[1], { h: 1.2 * s, n: 3, cols: pal.grass.map(c => mixc(c, pal.ink, 0.2)), w: Math.max(1, 0.15 * s), lean: 0.1 }, rng); }
  for (let i = 0; i < 70; i++) { const k = rng.int(2, course.length - 3), q = toPlate(cam, course[k]), s = cam.f / q[2]; dab(V, 'flat', rng.int(0, 5), q[0] + rng.range(-2, 2) * s, q[1], rng.range(2, 5) * s, 0.25 * s, 0, mixc(pal.skyMid, pal.glow, rng.next()), rng.range(0.3, 0.6)); }
  resetG(V);
  // the village: houses clustered at the hill's foot and along the river, trees between, far to near
  const houses = [];
  for (let i = 0; i < 34; i++) { const k = rng.next(), sx = k < 0.6 ? rng.range(900, 1280) : rng.range(1250, 1560), sy = rng.range(642, 735) + (sx - 900) * 0.02; houses.push([sx, sy, rng.range(-0.3, 0.35), rng.range(0.85, 1.25), rng.next()]); }
  houses.sort((a, b) => a[1] - b[1]);
  for (const [sx, sy, yaw, sc, tr] of houses) {
    const p = floorHit(cam, sx, sy);
    if (tr < 0.55) { const q = toPlate(cam, V3.add(p, [rng.range(-9, 9), 0, rng.range(-7, -3)])), s = cam.f / q[2]; paintCrown(V, { cx: q[0], cy: q[1] - 3.5 * s, rx: rng.range(3.5, 5.5) * s, ry: rng.range(3, 4.5) * s, seed: rng.int(1, 1e6), pal: fogPal(pal.leaf, pal.mist, 0.3), light: L2, leaf: 3, lightAmt: which ? 0.8 : 0.3 }); }
    else { rng.range(0, 1); rng.range(0, 1); rng.range(0, 1); rng.range(0, 1); rng.int(1, 1e6); }
    paintHouse(V, cam, M, which, { p, w: 8 * sc, d: 6 * sc, h: 3.2 * sc, rh: 3.2 * sc, yaw, ov: 1.2 }, rng);
  }
  // copses on the floor
  for (let i = 0; i < 14; i++) {
    const sx = rng.range(760, 1800), sy = rng.range(630, 700), p = floorHit(cam, sx, sy), n = rng.int(2, 5);
    for (let k = 0; k < n; k++) { const q = toPlate(cam, V3.add(p, [rng.range(-8, 8), 0, rng.range(-4, 4)])), s = cam.f / q[2]; paintCrown(V, { cx: q[0], cy: q[1] - 3 * s, rx: rng.range(3, 4.5) * s, ry: rng.range(2.6, 3.6) * s, seed: rng.int(1, 1e6), pal: fogPal(pal.leaf, pal.mist, 0.25), light: L2, leaf: 3, lightAmt: which ? 0.8 : 0.3 }); }
  }
  resetG(V);
  S.smoke = toPlate(cam, V3.add(floorHit(cam, houses[12][0], houses[12][1]), [1.5, 7.5, 0]));
  // the hill: a rounded mound, steeper toward the village; lit flank on the right with rice terraces
  const Hg = S.hill.g, hx0 = hh.cx - 610, hx1 = hh.cx + hh.wr + 10;
  const outline = () => { Hg.beginPath(); Hg.moveTo(hx0 + M, hh.base + M + 30); for (let x = hx0; x <= hx1; x += 4) Hg.lineTo(x + M, valleyHillY(x) + M); Hg.lineTo(hx1 + M, hh.base + M + 30); Hg.closePath(); };
  outline(); const hg = Hg.createLinearGradient(hx0 + M, 0, hx1 + M, 0);
  hg.addColorStop(0, css(mixc(pal.hill, pal.shadow, 0.3))); hg.addColorStop(0.55, css(pal.hill)); hg.addColorStop(1, css(pal.hillLit));
  Hg.fillStyle = hg; Hg.fill();
  Hg.save(); outline(); Hg.clip();
  for (let i = 0; i < 900; i++) { // strokes following the curve of the hill
    const x = rng.range(hx0, hx1), y0 = valleyHillY(x), y = rng.range(y0, hh.base + 30), sl = (valleyHillY(x + 4) - valleyHillY(x - 4)) / 8, k = (y - y0) / (hh.base + 30 - y0 + 1);
    const lit = clamp((x - hh.cx) / hh.wr * 0.8 + 0.3 - k * 0.3), col = mixc(mixc(pal.hill, pal.hillLit, lit), rng.next() < 0.3 ? pal.grass[2] : pal.grass[1], 0.3);
    dab(Hg, 'flat', rng.int(0, 5), x + M, y + M, rng.range(14, 30), rng.range(3, 5), Math.atan(sl) * (1 - k), jit(col, rng, 0.02), rng.range(0.4, 0.75));
  }
  // terraces: steps at constant height round the lit flank; seen from a little above, each is an arc that sags toward us
  for (let k = 0; k < 7; k++) {
    const ye = lerp(hh.peak + 70, hh.base - 22, k / 6);
    let xr = hh.cx; while (xr < hx1 && valleyHillY(xr) < ye) xr += 2;
    const R = xr - hh.cx, sag = R * 0.16, pts = [], al = [];
    for (let u = 0; u <= 1.25; u += 0.02) { const x = xr - u * R; if (valleyHillY(x) > ye + sag * Math.sin(Math.min(1, u) * Math.PI / 2) - 2) continue; pts.push([x + M, ye + sag * Math.sin(Math.min(1, u) * Math.PI / 2) + M]); al.push(u); }
    if (pts.length < 4) continue;
    const lip = mixc(pal.hillLit, pal.paddy, 0.3);
    taper(Hg, pts.map(q => [q[0], q[1] + 3]), al.map(u => lerp(5, 2, u / 1.25)), mixc(pal.hill, pal.shadow, 0.3), 0.6);
    taper(Hg, pts, al.map(u => lerp(2, 0.8, u / 1.25)), lip, 0.7);
  }
  resetG(Hg);
  // the shaded shoulder is wooded
  for (let i = 0; i < 170; i++) {
    const x = rng.range(hh.cx - 600, hh.cx - 90), y = rng.range(valleyHillY(x) + 6, hh.base), r = rng.range(12, 22) * lerp(0.8, 1.2, (y - 500) / 160);
    paintCrown(Hg, { cx: x + M, cy: y + M, rx: r * 1.15, ry: r, seed: rng.int(1, 1e6), pal: fogPal(pal.leaf, pal.mist, 0.1), light: L2, leaf: 4, lightAmt: which ? 0.8 : 0.25 });
  }
  resetG(Hg);
  // a path winding from the tree down the lit flank toward the village
  { const pts = bez([hh.cx + 50 + M, hh.peak + 10 + M], [hh.cx + 180 + M, hh.peak + 50 + M], [hh.cx + 150 + M, hh.base - 120 + M], [hh.cx + 400 + M, hh.base + M], 40);
    taper(Hg, pts, pts.map((_, i) => lerp(1.5, 5, i / 40)), mixc(pal.stone, pal.hillLit, 0.4), 0.75); }
  Hg.restore(); resetG(Hg);
  // trees round the foot hide where the hill meets the floor; a few on the shoulders
  for (let i = 0; i < 80; i++) {
    const x = rng.range(hx0 + 20, hx1 + 40), y = Math.max(valleyHillY(x) + 18, hh.base - rng.range(-8, 14)), r = rng.range(8, 17);
    paintCrown(Hg, { cx: x + M, cy: y + M, rx: r * 1.2, ry: r, seed: rng.int(1, 1e6), pal: fogPal(pal.leaf, pal.mist, 0.12), light: L2, leaf: 4, lightAmt: which ? 0.85 : 0.3 });
  }
  for (const [u, s] of [[-0.62, 0.8], [-0.4, 0.6], [0.55, 0.7], [0.78, 0.9]]) {
    const x = hh.cx + u * (u < 0 ? hh.wl : hh.wr), y = valleyHillY(x) + 6;
    paintCrown(Hg, { cx: x + M, cy: y - 12 * s + M, rx: 20 * s, ry: 16 * s, seed: rng.int(1, 1e6), pal: fogPal(pal.leaf, pal.mist, 0.08), light: L2, leaf: 4, lightAmt: which ? 0.85 : 0.3 });
  }
  resetG(Hg);
  paintGreatTree(Hg, which, { x: hh.cx + M, base: hh.peak + 6 + M, h: 150, w: 32, s: 0.8, seed: 7, fog: pal.mist, fogAmt: 0.08 });
  Hg.fillStyle = css(pal.stone); Hg.fillRect(hh.cx - 46 + M, hh.peak - 6 + M, 3, 10); Hg.fillRect(hh.cx - 49 + M, hh.peak - 8 + M, 9, 3);
  // foreground: our own dark slope, grasses and pampas in the bottom corners
  const G_ = S.fg.g;
  // our own slope: a dark rise across the bottom, higher at the left
  G_.fillStyle = css(mixc(pal.grassFg[0], pal.grassFg[1], 0.5)); G_.beginPath(); G_.moveTo(0, PH);
  for (let x = 0; x <= PW; x += 8) G_.lineTo(x, H + M - lerp(150, 14, smooth(0, PW * 0.75, x)) - 10 * fbm2(x * 0.01, 1.7, 3));
  G_.lineTo(PW, PH); G_.closePath(); G_.fill();
  paintGrassBand(G_, PW * 0.6, H + M - 140, H + M + 20, { hFar: 34, hNear: 90, cols: pal.grassFg, n: 120, blades: 6, wNear: 4, lean: 0.25 }, rng);
  for (let i = 0; i < 9; i++) {
    const x = W + M - rng.range(20, 360), y = H + M + 10, h = rng.range(170, 300), lean = rng.range(0.1, 0.35);
    const pts = qbez([x, y], [x + lean * h * 0.3, y - h * 0.6], [x + lean * h, y - h], 20);
    taper(G_, pts, pts.map((_, k) => lerp(3.5, 1, k / 20)), pal.grassFg[1]);
    for (let k = 12; k < 20; k++) dab(G_, 'dry', rng.int(0, 3), pts[k][0] + 5, pts[k][1] + 3, rng.range(16, 26), 4, 0.9 + lean, mixc(pal.grassFg[3], pal.mist, 0.3), 0.8);
    resetG(G_);
  }
}
function paintValleyWide(cam, o = {}) {
  const M = BM, PW = W + 2 * M, PH = H + 2 * M;
  const mk = (depth) => [new Plate(PW, PH, depth, -M, -M), new Plate(PW, PH, depth, -M, -M)];
  const P = { sky: mk(3000), far: mk(1500), valley: mk(380), hill: mk(200), fg: mk(60), smoke: [] };
  for (const which of (o.states || [0, 1])) {
    const S = {}; for (const k of ['sky', 'far', 'valley', 'hill', 'fg']) S[k] = P[k][which];
    paintValleyState(S, cam, which, o);
    P.smoke[which] = S.smoke;
    blurPlate(S.fg, 3);
    for (const k of ['sky', 'far', 'valley', 'hill', 'fg']) applyGrain(S[k].g, PW, PH, 0.1);
  }
  return P;
}

// colour reaching the ground: a disc growing round c from time t0 at v m/s with a ragged edge; the sky (no hit) waits
function bloomArrive(c, t0, v, rag = 0.3) { return (hit) => hit ? t0 + (Math.hypot(hit[0] - c[0], hit[2] - c[2]) + rag * (rvNoise(hit[0], hit[2], 8) - 0.5) * 2) / v : 1e9; }
// the bell of the wilted flower in the world (the 2D flower is 0.45 m tall upright; its drooped tip sits here)
const FLOWER_BELL = [HOLLOW.flower[0] + 0.2, 0.1, HOLLOW.flower[2]];
