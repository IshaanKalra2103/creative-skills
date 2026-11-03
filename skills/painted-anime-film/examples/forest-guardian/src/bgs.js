// ---------- reusable painted backgrounds, laid out for a given base camera ----------
const BM = 110; // plate margin
function groundY(cam, d) { // screen y of the ground plane at horizontal distance d along the view
  const dir = V3.norm(V3.sub(cam.tgt, cam.pos)), hd = V3.norm([dir[0], 0, dir[2]]);
  return cam.project([cam.pos[0] + hd[0] * d, 0, cam.pos[2] + hd[2] * d])[1];
}
const L2D = [0.72, -0.69];
function forestBG(B, o = {}) {
  const PW = W + BM * 2, PH = H + BM * 2, P = {};
  const rs = (k) => new RNG((o.seed || 1) * 100 + k);
  const sun = o.sun || [W * 0.7, H * 0.2];
  const y300 = groundY(B, 300) + BM, y170 = groundY(B, 170) + BM, y90 = groundY(B, 90) + BM, y45 = groundY(B, 45) + BM;
  P.haze = new Plate(PW, PH, 3000, -BM, -BM);
  paintHaze(P.haze.g, PW, PH, { stops: o.stops || [[0, hx('b3bcc6')], [0.3, hx('e2d3c4')], [0.5, hx('f6e3c4')], [0.68, hx('fbeccc')], [1, hx('dcd3c3')]], sun: [sun[0] + BM, sun[1] + BM, 700] }, rs(1));
  P.row1 = new Plate(PW, PH, 300, -BM, -BM);
  paintTrunkRow(P.row1.g, PW, { base: y300, top: -60, gapMin: 90, gapMax: 220, wMin: 7, wMax: 15, fog: hx('f3e6d2'), fogAmt: 0.86, light: L2D, moss: 0, bark: 0.3, crownY: [y300 - 700, y300 - 280], crownR: [80, 170], leaf: 9, lightAmt: 0.5, crownsMax: 2, lean: 0.04 }, rs(2));
  P.row2 = new Plate(PW, PH, 170, -BM, -BM);
  paintTrunkRow(P.row2.g, PW, { base: y170, top: -60, gapMin: 150, gapMax: 330, wMin: 13, wMax: 26, fog: hx('ecdecc'), fogAmt: 0.7, light: L2D, moss: 0.1, bark: 0.4, limbs: 0.5, limbLeaves: true, crownY: [y170 - 720, y170 - 260], crownR: [100, 200], leaf: 11, lightAmt: 0.6, lean: 0.05 }, rs(3));
  P.mist = new Plate(PW, PH, 140, -BM, -BM);
  paintMist(P.mist.g, PW, { y: y170 - 40, thick: 160, col: hx('f6e8d4'), alpha: 0.3, count: 120, size: 80 }, rs(4));
  if (o.row3 !== false) {
    P.row3 = new Plate(PW, PH, 90, -BM, -BM);
    paintTrunkRow(P.row3.g, PW, { base: y90, top: -60, gapMin: 260, gapMax: 460, wMin: 28, wMax: 46, fog: hx('e3d5c4'), fogAmt: 0.42, light: L2D, moss: 0.4, bark: 0.8, limbs: 0.7, limbLeaves: true, skip: o.skip, crownY: [y90 - 760, y90 - 300], crownR: [150, 250], leaf: 13, lightAmt: 0.75, holes: 3, sky: hx('f7e8cc'), bigChance: 0.4 }, rs(5));
    const lp = fogged(PAL.leaf, 0.38, hx('e3d5c4')), rng = rs(6);
    for (let i = 0; i < 16; i++) paintCrown(P.row3.g, { cx: rng.range(-60, PW + 60), cy: y90 - 20 + rng.range(-25, 12), rx: rng.range(60, 150), ry: rng.range(32, 70), seed: rng.int(1, 1e6), pal: lp, light: L2D, leaf: 9, lightAmt: 0.85 });
  }
  if (o.ground !== false && y90 < PH) {
    P.ground = new Plate(PW, PH, 45, -BM, -BM);
    const g = P.ground.g, rng = rs(7), y0 = Math.max(y90 - 30, 0);
    paintForestFloor(g, PW, y0, PH, { pal: { far: hx('b8b096'), mid: hx('7d8158'), near: hx('3f4c34'), dark: hx('2b352c'), moss: hx('6f8442'), earth: hx('5e4d39'), grass: hx('8a9550') }, fog: hx('ecdcc6'), fogAmt: 0.6, density: 1.2, sNear: 130, mounds: 0, fadeH: 70 }, rng);
    paintGrassBand(g, PW, y0 + 10, PH, { hFar: 6, hNear: 30, cols: [hx('5c6c3c'), hx('7b8848'), hx('3f5032'), hx('97a058')], fog: hx('ded0b8'), fogAmt: 0.55, n: 900, blades: 6, wNear: 2.8 }, rng);
    for (let i = 0; i < 60; i++) paintFlowers(g, rng.range(0, PW), rng.range(y0 + 30, PH), rng.range(10, 34), 6, PAL.flowers, rng, rng.range(2, 4.5));
  }
  for (const k in P) applyGrain(P[k].g, P[k].w, P[k].h, 0.12);
  return {
    P, B,
    draw(g, cam, lt, layer = 'back') {
      const drift = lt * 6;
      if (layer === 'back') {
        drawPlate(g, P.haze, B, cam); drawPlate(g, P.row1, B, cam); drawPlate(g, P.row2, B, cam);
        drawPlate(g, P.mist, B, cam, { dx: drift * 0.5, alpha: 0.9 });
        if (P.row3) drawPlate(g, P.row3, B, cam);
        if (P.ground) drawPlate(g, P.ground, B, cam);
      }
    },
  };
}
// a soft sun-shaft plate in screen space for a camera
function shaftsFor(o) {
  const PW = W + BM * 2, PH = H + BM * 2;
  return paintShafts(PW, PH, { depth: o.depth || 60, ox: -BM, oy: -BM, col: o.col || hx('ffe6ad'), shafts: o.shafts.map(s => Object.assign({}, s, { x: s.x + BM, y: (s.y ?? -60) })) });
}
// looking up into the canopy: sky + sun glow, converging trunks, backlit crowns around a gap
function canopyUpBG(B, o = {}) {
  const PW = W + BM * 2, PH = H + BM * 2, P = {};
  const rs = (k) => new RNG((o.seed || 1) * 131 + k);
  const sunD = V3.norm(o.sun || LIGHT_FOREST.sun);
  const sp = B.project(V3.add(B.pos, V3.mul(sunD, 1000)));
  const sun = [sp[0] + BM, sp[1] + BM];
  const zp = B.project(V3.add(B.pos, [0, 1000, 0])); const vp = [zp[0] + BM, zp[1] + BM];
  const gap = o.gap ? [o.gap[0] + BM, o.gap[1] + BM, o.gap[2], o.gap[3] || o.gap[2] * 0.7] : [sun[0], sun[1], 360, 260];
  // sky
  P.sky = new Plate(PW, PH, 4000, -BM, -BM);
  { const g = P.sky.g, grd = g.createLinearGradient(0, PH, 0, 0);
    grd.addColorStop(0, css(hx('d9d2c4'))); grd.addColorStop(0.5, css(hx('e9dccb'))); grd.addColorStop(1, css(hx('c4cbd2')));
    g.fillStyle = grd; g.fillRect(0, 0, PW, PH);
    const r = g.createRadialGradient(sun[0], sun[1], 0, sun[0], sun[1], 900);
    r.addColorStop(0, css(hx('fffbea'), 1)); r.addColorStop(0.12, css(hx('fff1c8'), 0.95)); r.addColorStop(0.45, css(hx('f6dcae'), 0.5)); r.addColorStop(1, css(hx('f6dcae'), 0));
    g.fillStyle = r; g.fillRect(0, 0, PW, PH);
    // a few soft dawn clouds
    const rng = rs(1);
    for (let i = 0; i < 9; i++) { const cx = rng.range(0, PW), cy = rng.range(0, PH * 0.7); for (let k = 0; k < 14; k++) dab(g, 'soft', rng.int(0, 4), cx + rng.range(-160, 160), cy + rng.range(-24, 24), rng.range(60, 140), rng.range(18, 34), rng.range(-0.1, 0.1), mixc(hx('fbe9cf'), hx('d8cfd4'), rng.next()), 0.25); }
  }
  const lpal = (amt) => Object.assign(fogged({ deep: hx('17262a'), dark: hx('253c37'), mid: hx('3f5a3e'), light: hx('86a04a'), hi: hx('f2dc8a') }, amt, hx('eadfcf')), { sky: hx('f7ecd2') });
  const inGap = (x, y, k = 1) => ((x - gap[0]) / (gap[2] * k)) ** 2 + ((y - gap[1]) / (gap[3] * k)) ** 2 < 1;
  const lightTo = (x, y) => [sun[0] - x, sun[1] - y];
  // trunks converging to the zenith
  const trunks = (pl, n, wR, fogAmt, rng) => {
    const tp = fogged(PAL.trunk, fogAmt, hx('e6dccb'));
    for (let i = 0; i < n; i++) {
      const bx = rng.range(-200, PW + 200), by = PH + rng.range(40, 400);
      const k = rng.range(0.45, 0.8), ex = lerp(bx, vp[0], k), ey = lerp(by, vp[1], k);
      if (inGap(ex, ey, 0.9) && rng.next() < 0.7) continue;
      const w0 = rng.range(wR[0], wR[1]);
      paintTrunk(pl.g, { x0: bx, y0: by, x1: ex, y1: ey, w0, w1: w0 * 0.35, seed: rng.int(1, 1e6), pal: tp, lightX: ex < sun[0] ? 1 : -1, moss: 0.3, rimW: 0.5, barkDensity: 0.4 });
    }
  };
  const crowns = (pl, n, rR, amt, rng, ring) => {
    const lp = lpal(amt);
    for (let i = 0; i < n; i++) {
      let x, y, tries = 0;
      do { x = rng.range(-150, PW + 150); y = rng.range(-150, PH * (o.crownBottom || 0.75)); tries++; } while (inGap(x, y, ring) && tries < 30);
      if (inGap(x, y, ring)) continue;
      const rx = rng.range(rR[0], rR[1]);
      paintCrown(pl.g, { cx: x, cy: y, rx, ry: rx * rng.range(0.55, 0.8), seed: rng.int(1, 1e6), pal: lp, light: lightTo(x, y), leaf: Math.max(8, rx * 0.07), lightAmt: 0.55, holes: 4, edgeLeaves: true });
    }
  };
  P.far = new Plate(PW, PH, 90, -BM, -BM); trunks(P.far, 10, [10, 22], 0.6, rs(2)); crowns(P.far, 26, [110, 210], 0.5, rs(3), 0.9);
  P.mid = new Plate(PW, PH, 45, -BM, -BM); trunks(P.mid, 5, [26, 44], 0.3, rs(4)); crowns(P.mid, 16, [150, 280], 0.22, rs(5), 1.25);
  P.near = new Plate(PW, PH, 22, -BM, -BM); crowns(P.near, o.nearN ?? 7, [200, 340], 0.05, rs(6), 1.7);
  paintMist(P.far.g, PW, { y: PH * 0.8, thick: 300, col: hx('f3e7d2'), alpha: 0.22, count: 60, size: 120 }, rs(7));
  for (const k in P) applyGrain(P[k].g, P[k].w, P[k].h, 0.1);
  return { P, B, sun: [sun[0] - BM, sun[1] - BM], draw(g, cam, sh = {}) { for (const k of ['sky', 'far', 'mid', 'near']) { const o = sh[k] || [0, 0]; drawPlate(g, P[k], B, cam, { dx: o[0], dy: o[1] }); } } };
}
// treetops against the dawn sky (camera tilted up a little toward the sun)
function treetopsBG(B, o = {}) {
  const PW = W + BM * 2, PH = H + BM * 2, P = {};
  const rs = (k) => new RNG((o.seed || 1) * 151 + k);
  const sp = B.project(V3.add(B.pos, V3.mul(V3.norm(o.sun || LIGHT_FOREST.sun), 1000)));
  const sun = [sp[0] + BM, sp[1] + BM];
  P.sky = new Plate(PW, PH, 4000, -BM, -BM);
  { const g = P.sky.g, grd = g.createLinearGradient(0, 0, 0, PH);
    grd.addColorStop(0, css(hx('aab7c4'))); grd.addColorStop(0.45, css(hx('e7d6c2'))); grd.addColorStop(0.8, css(hx('fae6c4'))); grd.addColorStop(1, css(hx('fdeccd')));
    g.fillStyle = grd; g.fillRect(0, 0, PW, PH);
    const r = g.createRadialGradient(sun[0], sun[1], 0, sun[0], sun[1], 1100);
    r.addColorStop(0, css(hx('fffdf2'), 1)); r.addColorStop(0.05, css(hx('fff6d8'), 1)); r.addColorStop(0.2, css(hx('fbe3b2'), 0.7)); r.addColorStop(0.6, css(hx('f2cfa6'), 0.25)); r.addColorStop(1, css(hx('f2cfa6'), 0));
    g.fillStyle = r; g.fillRect(0, 0, PW, PH);
    const rng = rs(1);
    for (let i = 0; i < 12; i++) { const cx = rng.range(0, PW), cy = rng.range(PH * 0.05, PH * 0.5), lit = Math.hypot(cx - sun[0], cy - sun[1]) < 600; for (let k = 0; k < 16; k++) dab(g, 'soft', rng.int(0, 1), cx + rng.range(-220, 220), cy + rng.range(-18, 18), rng.range(90, 200), rng.range(14, 28), rng.range(-0.06, 0.06), lit ? mixc(hx('fff2d8'), hx('f9d9a8'), rng.next()) : mixc(hx('f0dccb'), hx('c9c7cf'), rng.next()), 0.3); }
  }
  const crownPal = (fog, fogCol) => Object.assign(fogged({ deep: hx('1b2a2c'), dark: hx('2a4038'), mid: hx('49613f'), light: hx('8fa04e'), hi: hx('f6dc8c') }, fog, fogCol), { sky: hx('f9e8c8') });
  const band = (pl, y0, y1, n, rR, fog, fogCol, rng, trunks) => {
    const pal = crownPal(fog, fogCol), tp = fogged(PAL.trunk, fog, fogCol);
    const xs = []; for (let i = 0; i < n; i++) xs.push(rng.range(-150, PW + 150)); xs.sort((a, b) => a - b);
    for (const x of xs) {
      const rx = rng.range(rR[0], rR[1]), y = rng.range(y0, y1);
      if (trunks) paintTrunk(pl.g, { x0: x + rng.range(-10, 10), y0: PH + 40, x1: x, y1: y + rx * 0.3, w0: rx * 0.16, w1: rx * 0.08, seed: rng.int(1, 1e6), pal: tp, lightX: x < sun[0] ? 1 : -1, moss: 0.2, rimW: 0.6 });
      paintCrown(pl.g, { cx: x, cy: y, rx, ry: rx * rng.range(0.75, 1.0), seed: rng.int(1, 1e6), pal, light: [sun[0] - x, sun[1] - y], leaf: Math.max(6, rx * 0.075), lightAmt: 0.45, holes: 3, edgeLeaves: 1.4, hiAmt: 1.3 });
    }
    // fill below the crowns so no sky shows under the canopy line
    const grd = pl.g.createLinearGradient(0, y1 + rR[0] * 0.4, 0, PH);
    grd.addColorStop(0, css(pal.deep, 0)); grd.addColorStop(0.25, css(mixc(pal.deep, pal.dark, 0.5), 1)); grd.addColorStop(1, css(pal.deep, 1));
    pl.g.fillStyle = grd; pl.g.fillRect(0, y1 + rR[0] * 0.4, PW, PH);
  };
  P.far = new Plate(PW, PH, 400, -BM, -BM); band(P.far, PH * (o.farY || 0.5), PH * ((o.farY || 0.5) + 0.07), 70, [45, 95], 0.74, hx('ecdcc6'), rs(2));
  P.mid = new Plate(PW, PH, 140, -BM, -BM); band(P.mid, PH * (o.midY || 0.5), PH * ((o.midY || 0.5) + 0.16), 34, [110, 210], 0.4, hx('e8d6bf'), rs(3), true);
  paintMist(P.mid.g, PW, { y: PH * 0.9, thick: 120, col: hx('f6e7cf'), alpha: 0.22, count: 60, size: 110 }, rs(4));
  P.near = new Plate(PW, PH, 45, -BM, -BM);
  { const rng = rs(5), pal = crownPal(0.08, hx('e8d6bf'));
    for (const [x, y, rx] of (o.near || [[90, 40, 320], [PW - 110, 70, 350], [PW - 330, 610, 250], [140, 720, 230]])) {
      paintTrunk(P.near.g, { x0: x + 40 * Math.sign(PW / 2 - x), y0: PH + 60, x1: x, y1: y + rx * 0.4, w0: rx * 0.3, w1: rx * 0.14, seed: rng.int(1, 1e6), pal: fogged(PAL.trunk, 0.05, hx('e8d6bf')), lightX: x < sun[0] ? 1 : -1, moss: 0.5, rimW: 0.7 });
      paintCrown(P.near.g, { cx: x, cy: y, rx, ry: rx * 0.9, seed: rng.int(1, 1e6), pal, light: [sun[0] - x, sun[1] - y], leaf: 16, lightAmt: 0.4, holes: 5, edgeLeaves: 1.5, hiAmt: 1.4 });
    }
    if (o.bushes !== false) { const bp = crownPal(0.0, hx('e8d6bf')); for (let i = 0; i < 9; i++) { const x = -100 + i * (PW + 200) / 8 + rng.range(-60, 60), rx = rng.range(200, 290); paintCrown(P.near.g, { cx: x, cy: PH - 40 + rng.range(-30, 40), rx, ry: rx * 0.6, seed: rng.int(1, 1e6), pal: bp, light: [sun[0] - x, -400], leaf: 15, lightAmt: 0.35, holes: 2, edgeLeaves: 1.6, hiAmt: 1.2 }); } }
  }
  for (const k in P) applyGrain(P[k].g, P[k].w, P[k].h, 0.1);
  return { P, B, sun: [sun[0] - BM, sun[1] - BM], midTop: PH * (o.midY || 0.5) - BM, draw(g, cam, sh = {}, layers = ['sky', 'far', 'mid', 'near']) { for (const k of layers) { const q = sh[k] || [0, 0]; drawPlate(g, P[k], B, cam, { dx: q[0], dy: q[1] }); } } };
}
// straight up through the gap in the canopy: trunks converge from every edge to the zenith,
// crowns ring an irregular bright opening, near leaves frame it dark
function gapUpBG(B, o = {}) {
  const PW = W + BM * 2, PH = H + BM * 2, P = {};
  const rs = (k) => new RNG((o.seed || 1) * 173 + k);
  const zp = B.project(V3.add(B.pos, [0, 1000, 0])); const vp = [zp[0] + BM, zp[1] + BM];
  const sp = B.project(V3.add(B.pos, V3.mul(V3.norm(o.sun || LIGHT_FOREST.sun), 1000)));
  const gR = o.gR || 330;
  const gc = vp;
  const sun = o.sunOff ? [gc[0] + o.sunOff[0], gc[1] + o.sunOff[1]] : (sp[2] > 0 ? [sp[0] + BM, sp[1] + BM] : [vp[0] + 300, vp[1] - 200]);
  // lumpy gap radius by angle
  const gapR = (a) => gR * (1 + 0.22 * Math.sin(a * 3 + 1.3) + 0.12 * Math.sin(a * 5 + 0.4) + 0.08 * Math.sin(a * 9 + 2));
  const polar = (x, y) => { const dx = x - gc[0], dy = y - gc[1]; return [Math.atan2(dy, dx), Math.hypot(dx, dy)]; };
  P.sky = new Plate(PW, PH, 4000, -BM, -BM);
  { const g = P.sky.g;
    g.fillStyle = css(hx('dfe3e2')); g.fillRect(0, 0, PW, PH);
    const r = g.createRadialGradient(sun[0], sun[1], 0, sun[0], sun[1], 1200);
    r.addColorStop(0, css(hx('fffef6'))); r.addColorStop(0.06, css(hx('fff7dc'))); r.addColorStop(0.25, css(hx('fbe6bb'))); r.addColorStop(0.6, css(hx('ecdcc2'))); r.addColorStop(1, css(hx('c9d2d8')));
    g.fillStyle = r; g.fillRect(0, 0, PW, PH);
    const rng = rs(1);
    for (let i = 0; i < 8; i++) { const cx = gc[0] + rng.range(-500, 500), cy = gc[1] + rng.range(-350, 350); for (let k = 0; k < 12; k++) dab(g, 'soft', rng.int(0, 1), cx + rng.range(-170, 170), cy + rng.range(-20, 20), rng.range(80, 170), rng.range(14, 26), rng.range(-0.3, 0.3) + 0.4, mixc(hx('fff4dc'), hx('f2d9b4'), rng.next()), 0.28); }
  }
  const lpal = (amt) => Object.assign(fogged({ deep: hx('142427'), dark: hx('22392f'), mid: hx('3d5a3a'), light: hx('8aa64c'), hi: hx('fbe49a') }, amt, hx('efe2cc')), { sky: hx('fbf0d6') });
  // a tree seen from below: trunk from the frame edge toward the zenith, crown at its top
  const tree = (pl, a, rOut, rIn, w, amt, rng, crownR) => {
    const bx = vp[0] + Math.cos(a) * rOut, by = vp[1] + Math.sin(a) * rOut;
    const ex = vp[0] + Math.cos(a) * rIn, ey = vp[1] + Math.sin(a) * rIn;
    const tp = fogged(PAL.trunk, amt + 0.1, hx('e8dcc8'));
    paintTrunk(pl.g, { x0: bx, y0: by, x1: ex, y1: ey, w0: w, w1: w * 0.3, seed: rng.int(1, 1e6), pal: tp, lightX: Math.cos(a) < 0 ? 1 : -1, moss: 0.35, rimW: 0.7, barkDensity: 0.5 });
    // a few limbs reaching toward the gap
    for (let i = 0; i < 3; i++) {
      const u = rng.range(0.55, 0.9), px = lerp(bx, ex, u), py = lerp(by, ey, u);
      const aa = a + Math.PI + rng.range(-0.9, 0.9), L = w * rng.range(3, 6);
      paintBranch(pl.g, [px, py], [px + Math.cos(aa) * L * 0.5, py + Math.sin(aa) * L * 0.5], [px + Math.cos(aa + 0.3) * L, py + Math.sin(aa + 0.3) * L], w * 0.25, w * 0.06, tp.dark || tp.mid, rng);
    }
  };
  const ring = (pl, n, rR, amt, rng, k0, k1) => {
    const lp = lpal(amt);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rng.range(-0.2, 0.2), rr = gapR(a) * rng.range(k0, k1);
      const x = gc[0] + Math.cos(a) * rr, y = gc[1] + Math.sin(a) * rr * 0.85, rx = rng.range(rR[0], rR[1]);
      paintCrown(pl.g, { cx: x, cy: y, rx, ry: rx * rng.range(0.7, 0.95), seed: rng.int(1, 1e6), pal: lp, light: [sun[0] - x, sun[1] - y], leaf: Math.max(8, rx * 0.07), lightAmt: 0.42, holes: 5, edgeLeaves: 1.5, hiAmt: 1.5 });
    }
  };
  P.far = new Plate(PW, PH, 120, -BM, -BM);
  { const rng = rs(2); for (let i = 0; i < 14; i++) tree(P.far, i / 14 * TAU + rng.range(-0.15, 0.15), 1500, rng.range(300, 420), rng.range(14, 26), 0.55, rng); ring(P.far, 30, [90, 170], 0.5, rs(3), 1.25, 1.6); }
  P.mid = new Plate(PW, PH, 50, -BM, -BM);
  { const rng = rs(4); for (let i = 0; i < 8; i++) tree(P.mid, i / 8 * TAU + 0.3 + rng.range(-0.2, 0.2), 1700, rng.range(420, 560), rng.range(34, 56), 0.25, rng); ring(P.mid, 20, [150, 260], 0.22, rs(5), 1.55, 2.0); }
  P.near = new Plate(PW, PH, 20, -BM, -BM);
  { const rng = rs(6), lp = lpal(0.04);
    for (let i = 0; i < 26; i++) { const a = i / 14 * TAU + rng.range(-0.15, 0.15), rr = gapR(a) * (i < 14 ? rng.range(2.25, 2.7) : rng.range(3.3, 3.9)); const x = gc[0] + Math.cos(a) * rr, y = gc[1] + Math.sin(a) * rr * 0.8, rx = rng.range(240, 360);
      paintCrown(P.near.g, { cx: x, cy: y, rx, ry: rx * 0.8, seed: rng.int(1, 1e6), pal: lp, light: [sun[0] - x, sun[1] - y], leaf: 15, lightAmt: 0.32, holes: 6, edgeLeaves: 1.6, hiAmt: 1.2 }); }
  }
  paintMist(P.far.g, PW, { y: gc[1] + 160, thick: 260, col: hx('fff2da'), alpha: 0.2, count: 50, size: 140 }, rs(7));
  for (const k in P) applyGrain(P[k].g, P[k].w, P[k].h, 0.1);
  return { P, B, sun: [sun[0] - BM, sun[1] - BM], gc: [gc[0] - BM, gc[1] - BM], draw(g, cam, sh = {}) { for (const k of ['sky', 'far', 'mid', 'near']) { const q = sh[k] || [0, 0]; drawPlate(g, P[k], B, cam, { dx: q[0], dy: q[1] }); } } };
}
