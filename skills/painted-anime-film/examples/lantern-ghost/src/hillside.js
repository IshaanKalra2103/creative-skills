// ---------- the ridge path seen from across a gully (shot 8): the ghost glides down it, left to right ----------
// World: the ridge top runs along x at z = SIDE.z and falls toward +x (the valley side). The camera stands on the
// near bank (z = 0) and trucks with the ghost. Tea rows step down the ridge's near face into the gully; the near
// bank's grass fills the lower left. Sky and the far valley stay grey in this shot: colour only follows the ghost.
const SIDE = { z: -10, zn: -4.5, x0: -6.5, v: 1.5, dur: 7, fov: 32 };
const sideH = (x) => -0.3 * x + 0.15 * Math.sin(0.7 * x + 1) + 0.3 * (fbm2(x * 0.12 + 20, 5.1, 3) - 0.5);
const sideHN = (x) => sideH(x) + 0.1 + 0.3 * (fbm2(x * 0.35 + 40, 9.2, 3) - 0.5);
const sideCx = (t) => { const k = clamp(t / SIDE.dur); return 1 + 4.2 * k * k; };
function sideCam(t) { const cx = sideCx(t), cy = -0.3 * cx + 1.3; return new Cam([cx, cy, 0], [cx, cy - 0.55, SIDE.z], SIDE.fov); }
const sideGx = (t) => SIDE.x0 + SIDE.v * t;

// a small broadleaf or a black pine standing on the ridge, painted in plate pixels (base at bx, by; s = px per metre)
function paintSideTree(g, which, bx, by, s, kind, rng) {
  const pal = PALS[which], tp = fogPal(pal.bark, pal.mist, 0.05), lp = fogPal(pal.leaf, pal.mist, 0.06);
  if (kind === 'pine') { // twisted trunk leaning toward the valley, flat cloud-pads of needles
    const h = 4.2 * s, top = [bx + 0.9 * s, by - h];
    const pts = bez([bx, by], [bx - 0.4 * s, by - h * 0.35], [bx + 1.4 * s, by - h * 0.6], top, 24);
    taper(g, pts, pts.map((_, i) => lerp(0.32, 0.1, i / 24) * s), tp.dark);
    taper(g, pts.map(p => [p[0] + 0.06 * s, p[1]]), pts.map((_, i) => lerp(0.12, 0.04, i / 24) * s), tp.light, 0.7);
    for (const [u, dx, rx, ry] of [[1, 0, 1.3, 0.42], [0.78, 1.0, 1.0, 0.32], [0.62, -0.8, 0.9, 0.3], [0.45, 1.3, 0.75, 0.26]]) {
      const p = pts[Math.round(u * 24)], c = [p[0] + dx * s, p[1] - 0.15 * s];
      if (dx) { const br = qbez(p, [lerp(p[0], c[0], 0.5), p[1] - 0.2 * s], c, 8); taper(g, br, br.map((_, i) => lerp(0.08, 0.03, i / 8) * s), tp.dark); }
      paintCrown(g, { cx: c[0], cy: c[1], rx: rx * s, ry: ry * s, seed: rng.int(1, 1e6), pal: lp, light: L2, leaf: Math.max(3, 0.12 * s), holes: 1, lightAmt: which ? 0.9 : 0.3 });
    }
  } else { // a round broadleaf
    const h = 3.4 * s, top = [bx + 0.2 * s, by - h];
    const pts = qbez([bx, by], [bx - 0.1 * s, by - h * 0.5], top, 16);
    taper(g, pts, pts.map((_, i) => lerp(0.26, 0.1, i / 16) * s), tp.dark);
    for (const [dx, dy, rx, ry] of [[-0.8, 0.3, 1.2, 0.95], [0.9, 0.2, 1.15, 0.9], [0, -0.4, 1.5, 1.1], [0.1, 0.5, 1.1, 0.7]])
      paintCrown(g, { cx: top[0] + dx * s, cy: top[1] + dy * s, rx: rx * s, ry: ry * s, seed: rng.int(1, 1e6), pal: lp, light: L2, leaf: Math.max(3, 0.13 * s), holes: 2, lightAmt: which ? 0.9 : 0.3 });
  }
  resetG(g);
}
// a roadside jizo: a small stone figure with a cloth bib (red at dawn)
function paintJizo(g, which, x, y, s) {
  const pal = PALS[which], st = pal.stone, sh = mixc(st, pal.ink, 0.45);
  g.fillStyle = css(sh); g.beginPath(); g.ellipse(x, y - 0.16 * s, 0.17 * s, 0.2 * s, 0, 0, TAU); g.fill();
  g.fillStyle = css(st); g.beginPath(); g.ellipse(x + 0.03 * s, y - 0.18 * s, 0.13 * s, 0.17 * s, 0, 0, TAU); g.fill();
  g.fillStyle = css(sh); g.beginPath(); g.arc(x, y - 0.42 * s, 0.1 * s, 0, TAU); g.fill();
  g.fillStyle = css(st); g.beginPath(); g.arc(x + 0.025 * s, y - 0.43 * s, 0.075 * s, 0, TAU); g.fill();
  g.fillStyle = css(which ? hx('c8402c') : hx('5e6070')); g.beginPath(); g.moveTo(x - 0.15 * s, y - 0.32 * s); g.lineTo(x + 0.15 * s, y - 0.32 * s); g.lineTo(x, y - 0.12 * s); g.closePath(); g.fill();
  g.fillStyle = css(mixc(pal.stone, pal.ink, 0.6)); g.fillRect(x - 0.22 * s, y - 0.02 * s, 0.44 * s, 0.05 * s);
}
// susuki (pampas): a clump of thin arched blades with soft plumes that catch the light
function paintSusuki(g, which, x, y, s, rng, n = 9) {
  const pal = PALS[which];
  for (let i = 0; i < n; i++) {
    const h = rng.range(0.9, 1.5) * s, lean = rng.range(0.05, 0.45), bx = x + rng.range(-0.15, 0.15) * s;
    const pts = qbez([bx, y], [bx + lean * h * 0.25, y - h * 0.6], [bx + lean * h, y - h], 16);
    taper(g, pts, pts.map((_, k) => lerp(0.025, 0.006, k / 16) * s), mixc(pal.grassFg[2], pal.grass[1], 0.5));
    for (let k = 10; k < 16; k++) dab(g, 'dry', rng.int(0, 3), pts[k][0] + 0.04 * s, pts[k][1] + 0.02 * s, rng.range(0.12, 0.2) * s, 0.03 * s, 0.9 + lean, which ? mixc(hx('f2dcb0'), pal.glow, 0.3) : mixc(pal.grassFg[3], pal.mist, 0.35), 0.8);
    resetG(g);
  }
}
function paintSideState(S, cam, which, o) {
  const M = BM, pal = PALS[which], rng = new RNG(o.seed || 808);
  const PW = W + 2 * M, PH = H + 2 * M;
  const hz = cam.project([cam.pos[0], cam.pos[1], cam.pos[2] - 3000])[1] + M;
  // sky and the far valley exist only in the grey state here (they do not change in this shot)
  if (S.sky) {
    const rng = new RNG((o.seed || 808) + 1); // its own stream, so the two states of the ridge stay stroke for stroke
    paintSkyState(S.sky.g, PW, PH, which, rng, { horizon: clamp(hz / PH), stars: 50, sun: [PW * 0.97, hz - 20, 520], clouds: [[0, PW, hz - 260, 5, 1.5, 40], [300, PW, hz - 120, 4, 1.1, 25]] });
    const F = S.far.g, near = (c, k) => mixc(c, pal.mist, k);
    paintRidge(F, PW, PH, which, { y: hz - 20, amp: 60, freq: 0.0014, seed: 41, col: [near(pal.ridgeFar, 0.6), near(pal.ridgeFar, 0.6)], dark: [near(pal.ridgeFar, 0.5), near(pal.ridgeFar, 0.5)], fade: 200, tex: 0.3, rim: [near(pal.ridgeFar, 0.75), near(pal.ridgeFar, 0.75)] }, rng);
    paintMist(F, PW, { y: hz + 20, thick: 40, col: pal.mist, alpha: 0.5, count: 40, size: 34 }, rng);
    paintRidge(F, PW, PH, which, { y: hz + 30, amp: 30, freq: 0.0024, seed: 7, col: [near(pal.ridgeMid, 0.35), near(pal.ridgeMid, 0.35)], dark: [near(pal.hill, 0.3), near(pal.hill, 0.3)], fade: 140, tex: 0.5,
      trees: { n: 80, size: 9, fog: [pal.mist, pal.mist], fogAmt: 0.4 } }, rng);
    // the valley floor far below, in perspective: fields in a loose grid, a river, villages, copses (grey in this shot)
    const FY = cam.pos[1] - 39, cx = cam.pos[0], fp = (x, z) => toPlate(cam, [x, FY, z]);
    F.save(); F.beginPath(); F.rect(0, hz + 40, PW, PH); F.clip();
    F.fillStyle = css(near(pal.land, 0.3)); F.fillRect(0, hz + 30, PW, PH);
    const rot = 0.28, ax = [Math.cos(rot), Math.sin(rot)], az = [-ax[1], ax[0]], GX = 46, GZ = 30;
    const jg = (i, j) => [GX * 0.2 * (vnoise2(i * 0.71, j * 1.3) - 0.5) * 2, GZ * 0.22 * (vnoise2(i * 1.7 + 9, j * 0.53) - 0.5) * 2];
    const cells = [];
    for (let i = -30; i < 30; i++) for (let j = 0; j < 70; j++) {
      const r = rng.next(), r2 = rng.next();
      const pts = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([a, b]) => { const I = i + a, J = j + b, d = jg(I, J), lx = I * GX + d[0], lz = -120 - J * GZ + d[1]; return fp(cx + 200 + lx * ax[0] + lz * az[0], lx * ax[1] + lz * az[1]); });
      if (pts.some(q => q[2] < 50) || pts.every(q => q[1] < hz + 40) || pts.every(q => q[0] < -20 || q[0] > PW + 20)) continue;
      cells.push([pts, r, r2]);
    }
    cells.sort((a, b) => b[0][0][2] - a[0][0][2]);
    for (const [pts, r, r2] of cells) {
      const fog = clamp(1 - (pts[0][1] - hz) / 420) * 0.6;
      const col = r < 0.5 ? mixc(pal.land, mixc(pal.paddy, pal.skyLow, r2 * 0.5), lerp(0.35, 0.6, r2)) : r < 0.8 ? mixc(pal.land, pal.grass[1], 0.5 + r2 * 0.3) : mixc(pal.land, pal.soil, 0.4 + r2 * 0.3);
      F.fillStyle = css(mixc(mixc(col, mixc(pal.land, pal.paddy, 0.3), 0.45), pal.mist, fog), 0.92);
      F.beginPath(); pts.forEach((q, k) => k ? F.lineTo(q[0], q[1]) : F.moveTo(q[0], q[1])); F.closePath(); F.fill();
      F.strokeStyle = css(mixc(pal.hill, pal.mist, fog * 0.7), 0.45); F.lineWidth = 1; F.stroke();
    }
    for (let i = 0; i < 700; i++) { const t = Math.pow(rng.next(), 0.8), y = lerp(hz + 40, PH, t), sz = lerp(10, 50, t);
      dab(F, 'dry', rng.int(0, 3), rng.range(-30, PW + 30), y, sz * rng.range(0.8, 1.6), sz * rng.range(0.08, 0.14), 0, mixc(pal.land, pal.mist, 0.3 * (1 - t)), rng.range(0.08, 0.18)); }
    resetG(F);
    // the river: a slow bend across the floor, holding the pale sky
    const rv = spline([[cx + 520, -1600], [cx + 260, -900], [cx + 330, -520], [cx + 150, -330], [cx + 230, -200], [cx + 120, -110]], 40);
    const bank = (k) => rv.map((p, i) => { const a = rv[Math.max(0, i - 1)], b = rv[Math.min(rv.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, w = k * (1 + 0.3 * Math.sin(i * 0.4)); return fp(p[0] - dz / l * w, p[1] + dx / l * w); });
    const strip = (A, B_, col, a) => { F.fillStyle = css(col, a); F.beginPath(); A.forEach((q, i) => i ? F.lineTo(q[0], q[1]) : F.moveTo(q[0], q[1])); for (let i = B_.length - 1; i >= 0; i--) F.lineTo(B_[i][0], B_[i][1]); F.closePath(); F.fill(); };
    strip(bank(13), bank(-13), mixc(pal.soil, pal.grass[2], 0.5), 0.8);
    strip(bank(9), bank(-9), mixc(pal.skyMid, pal.skyLow, 0.6), 0.95);
    // villages: three clusters of farmhouses with trees between, far to near
    const houses = [];
    for (const [hx_, hz_, n] of [[cx + 250, -700, 7], [cx + 40, -520, 6], [cx + 120, -300, 9], [cx + 380, -380, 5]])
      for (let k = 0; k < n; k++) houses.push([hx_ + rng.range(-45, 45), hz_ + rng.range(-35, 35), rng.range(-0.4, 0.4), rng.range(0.85, 1.2)]);
    houses.sort((a, b) => a[1] - b[1]);
    for (const [x, z, yaw, sc] of houses) {
      if (rng.next() < 0.5) { const q = fp(x + rng.range(-12, 12), z - rng.range(6, 14)), s_ = cam.f / q[2]; paintCrown(F, { cx: q[0], cy: q[1] - 4 * s_, rx: rng.range(5, 8) * s_, ry: rng.range(4, 6) * s_, seed: rng.int(1, 1e6), pal: fogPal(pal.leaf, pal.mist, 0.35), light: L2, leaf: 2.5, lightAmt: 0.3 }); }
      paintHouse(F, cam, M, which, { p: [x, FY, z], w: 9 * sc, d: 7 * sc, h: 3.4 * sc, rh: 3.4 * sc, yaw, ov: 1.3 }, rng);
    }
    for (let i = 0; i < 22; i++) { // copses
      const x = cx + rng.range(-150, 700), z = -rng.range(150, 1300), n = rng.int(3, 7);
      for (let k = 0; k < n; k++) { const q = fp(x + rng.range(-14, 14), z + rng.range(-8, 8)); if (q[1] < hz + 44) continue; const s_ = cam.f / q[2]; paintCrown(F, { cx: q[0], cy: q[1] - 4 * s_, rx: rng.range(5, 8) * s_, ry: rng.range(4, 6) * s_, seed: rng.int(1, 1e6), pal: fogPal(pal.leaf, pal.mist, 0.35), light: L2, leaf: 2.5, lightAmt: 0.3 }); }
    }
    resetG(F); F.restore();
    paintMist(F, PW, { y: hz + 120, thick: 70, col: pal.mist, alpha: 0.4, count: 60, size: 40 }, rng);
    resetG(F);
  }
  // ---- the ridge and its near face ----
  const R = S.ridge, Rg = R.g, P = (x, y, z) => toPlate(cam, [x, y, z]);
  const xs = []; for (let x = -9; x <= 15; x += 0.08) xs.push(x);
  const line = xs.map(x => P(x, sideH(x), SIDE.z));
  const pxm = cam.f / line[0][2];
  Rg.save(); Rg.beginPath(); line.forEach((q, i) => i ? Rg.lineTo(q[0], q[1]) : Rg.moveTo(q[0], q[1])); Rg.lineTo(R.w + 50, R.h + 50); Rg.lineTo(-50, R.h + 50); Rg.closePath();
  const top = Math.min(...line.map(q => q[1]));
  const gr = Rg.createLinearGradient(0, top, 0, R.h);
  gr.addColorStop(0, css(mixc(pal.hillLit, pal.mist, 0.15))); gr.addColorStop(0.35, css(pal.hill)); gr.addColorStop(1, css(mixc(pal.hill, pal.shadow, 0.6)));
  Rg.fillStyle = gr; Rg.fill(); Rg.clip();
  for (let i = 0; i < 1600; i++) { // strokes along the slope
    const x = rng.range(-9, 15), k = Math.pow(rng.next(), 1.3), q = P(x, sideH(x) - k * 1.6, SIDE.z + k * 4), s = cam.f / q[2];
    const col = mixc(mixc(pal.hillLit, pal.hill, clamp(k * 1.6)), rng.next() < 0.35 ? pal.grass[2] : pal.grass[1], 0.3);
    dab(Rg, 'flat', rng.int(0, 5), q[0], q[1], rng.range(0.25, 0.6) * s, rng.range(0.05, 0.09) * s, -0.29, jit(col, rng, 0.02), rng.range(0.35, 0.7));
  }
  resetG(Rg);
  // tea rows stepping down the face: rounded hedges in bands, lit along their tops
  for (let k = 1; k <= 8; k++) {
    const z = SIDE.z + 0.62 * k, dy = -0.2 * k - 0.05;
    const row = []; for (let x = -9; x <= 15; x += 0.1) row.push(P(x, sideH(x) + dy, z));
    const s = cam.f / row[0][2], hw = 0.2 * s;
    const body = mixc(pal.leaf.dark, pal.hill, 0.35), lit = mixc(pal.leaf.light, pal.hillLit, 0.3);
    taper(Rg, row.map(q => [q[0], q[1] + hw * 0.6]), row.map(() => hw * 1.1), mixc(pal.shadow, pal.leaf.deep, 0.5), 0.8);
    taper(Rg, row, row.map(() => hw), body);
    // one continuous clipped hedge: overlapping soft bumps along the top, highlights broken into a few long touches
    for (let i = 0; i < row.length; i++) {
      const q = row[i], b = fbm2(i * 0.15, k * 3.1, 2);
      dab(Rg, 'round', rng.int(0, 5), q[0], q[1] - hw * 0.3, hw * rng.range(1.2, 1.6), hw * rng.range(0.6, 0.75), -0.29, jit(mixc(body, lit, 0.25 + 0.3 * b), rng, 0.015), 0.95);
    }
    for (let i = 0; i < row.length; i += 3) {
      const q = row[i]; if (fbm2(i * 0.11, k * 5.3, 2) < 0.45) { rng.next(); continue; }
      dab(Rg, 'flat', rng.int(0, 5), q[0], q[1] - hw * 0.75, hw * rng.range(1.4, 2.2), hw * 0.16, -0.29, jit(lit, rng, 0.02), which ? 0.8 : 0.4);
    }
    resetG(Rg);
  }
  Rg.restore(); resetG(Rg);
  // the ridge-top: a grass fringe, the trees, a jizo and susuki; the ghost passes in front of all of them
  for (let i = 0; i < line.length; i += 2) { const q = line[i]; paintGrassTuft(Rg, q[0], q[1] + 2, { h: 0.22 * pxm * rng.range(0.6, 1.3), n: 4, cols: pal.grass.map(c => mixc(c, pal.hill, 0.3)), w: Math.max(1, 0.03 * pxm), lean: 0.2 }, rng); }
  for (const [x, kind] of [[-7.6, 'tree'], [-3.2, 'pine'], [3.4, 'tree'], [7.8, 'pine'], [11.5, 'tree']]) { const q = P(x, sideH(x) - 0.05, SIDE.z - 0.3); paintSideTree(Rg, which, q[0], q[1], cam.f / q[2], kind, rng); }
  { const q = P(-1.4, sideH(-1.4), SIDE.z + 0.1); paintJizo(Rg, which, q[0], q[1], cam.f / q[2]); }
  for (const x of [0.6, 5.2, 9.6, 13]) { const q = P(x, sideH(x), SIDE.z + 0.2); paintSusuki(Rg, which, q[0], q[1], cam.f / q[2], rng, 10); }
  for (let i = 0; i < 40; i++) { const x = rng.range(-9, 15), q = P(x, sideH(x), SIDE.z + rng.range(0, 0.4)); paintFlowers(Rg, q[0], q[1] - 3, 0.25 * pxm, 3, [pal.flowers[i % pal.flowers.length], which ? hx('ffffff') : hx('70748a')], rng, Math.max(1.5, 0.035 * pxm)); }
  resetG(Rg);
  // ---- the near bank: our side of the gully ----
  const N = S.near, Ng = N.g;
  const nl = []; for (let x = -6; x <= 14; x += 0.05) nl.push(P(x, sideHN(x), SIDE.zn));
  Ng.beginPath(); nl.forEach((q, i) => i ? Ng.lineTo(q[0], q[1]) : Ng.moveTo(q[0], q[1])); Ng.lineTo(N.w + 50, N.h + 50); Ng.lineTo(-50, N.h + 50); Ng.closePath();
  const ntop = Math.min(...nl.map(q => q[1])), ng = Ng.createLinearGradient(0, ntop, 0, N.h);
  ng.addColorStop(0, css(mixc(pal.grassFg[2], pal.grass[2], 0.4))); ng.addColorStop(0.4, css(pal.grassFg[1])); ng.addColorStop(1, css(pal.grassFg[0]));
  Ng.fillStyle = ng; Ng.fill();
  const npx = cam.f / nl[0][2];
  for (let i = 0; i < nl.length; i += 1) { const q = nl[i]; if (rng.next() < 0.6) paintGrassTuft(Ng, q[0], q[1] + rng.range(2, 0.3 * npx), { h: rng.range(0.25, 0.6) * npx, n: 5, cols: pal.grassFg, w: Math.max(1.2, 0.025 * npx), lean: 0.25 }, rng); }
  for (let i = 0; i < 55; i++) { const x = rng.range(-6, 14), q = P(x, sideHN(x) - 0.05, SIDE.zn + rng.range(0, 0.3)); paintFlowers(Ng, q[0], q[1] - 0.15 * npx, 0.2 * npx, 3, [pal.flowers[(i + 1) % pal.flowers.length], which ? hx('fff6e0') : hx('6a6e82')], rng, Math.max(2, 0.035 * npx)); }
  for (const x of [-1.5, 2.2, 6.4, 10.5]) { const q = P(x, sideHN(x), SIDE.zn + 0.1); paintSusuki(Ng, which, q[0], q[1] + 4, cam.f / q[2] * 0.9, rng, 12); }
  resetG(Ng);
}
function paintSide(cam, o = {}) {
  const M = BM, PW = W + 2 * M, PH = H + 2 * M;
  const dR = cam.project([cam.pos[0], sideH(cam.pos[0]), SIDE.z])[2], dN = cam.project([cam.pos[0], sideHN(cam.pos[0]), SIDE.zn])[2];
  // the truck moves the near plates a long way: make them wide and tall enough for the whole move
  const end = sideCam(SIDE.dur), dx = (end.pos[0] - cam.pos[0]) * cam.f, dy = (cam.pos[1] - end.pos[1]) * cam.f;
  const mk = (depth, w, h) => [new Plate(w, h, depth, -M, -M), new Plate(w, h, depth, -M, -M)];
  const P = { sky: mk(3000, PW, PH), far: mk(300, PW, PH), ridge: mk(dR, Math.ceil(PW + dx / dR + 60), Math.ceil(PH + dy / dR + 60)), near: mk(dN, Math.ceil(PW + dx / dN + 60), Math.ceil(PH + dy / dN + 60)) };
  for (const which of (o.states || [0, 1])) {
    const S = { ridge: P.ridge[which], near: P.near[which] };
    if (which === 0) { S.sky = P.sky[0]; S.far = P.far[0]; }
    paintSideState(S, cam, which, o);
    for (const k in S) applyGrain(S[k].g, S[k].w, S[k].h, 0.1);
  }
  return P;
}
