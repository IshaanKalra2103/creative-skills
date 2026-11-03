// ---------- the village lane (shot 9): farmhouse fronts across a dirt lane, eave lanterns, a utility pole ----------
// World: house fronts face +z near z = 0, the lane runs along x in front of them, the camera stands across the lane.
// The ghost glides along the eaves left to right; each house comes into colour as it passes and its lantern catches.
const LANE = { cam: [-13, 1.7, 9], tgt: [-1, 2.6, -2.5], fov: 36, houses: [-10, -4.8, 0.4, 5.6, 10.8, 16, 21.2, 26.4], hz: -2.5, w: 4.0, d: 4.6, h: 2.9, rh: 1.9, ov: 0.55,
  gx0: -11.5, gv: 3.9, gy: 3.3, gz: 1.4, dur: 5 };
const laneGx = (t) => LANE.gx0 + LANE.gv * t;
const laneCam = () => new Cam(LANE.cam, LANE.tgt, LANE.fov);
// the lantern on each house: hung under the front eave, left of the door
const laneLanterns = () => LANE.houses.map(x => [x + LANE.w * 0.3, LANE.h - 0.28, LANE.hz + LANE.d / 2 + LANE.ov * 0.6]);
function paintLaneState(S, cam, which, o) {
  const M = BM, PW = W + 2 * M, PH = H + 2 * M, pal = PALS[which], rng = new RNG(o.seed || 909);
  const P = (x, y, z) => toPlate(cam, [x, y, z]);
  const hz = P(cam.pos[0], cam.pos[1], cam.pos[2] - 3000)[1];
  if (S.sky) { // grey in this shot: the wooded hill behind the village and the sky over it
    const r2 = new RNG((o.seed || 909) + 1), mid = mixc(pal.ridgeMid, pal.mist, 0.3);
    paintSkyState(S.sky.g, PW, PH, which, r2, { horizon: clamp(hz / PH), stars: 40, sun: [PW * 0.97, hz - 40, 480], clouds: [[0, PW, hz - 380, 5, 1.5, 40], [0, PW, hz - 220, 4, 1.1, 25]] });
    paintRidge(S.sky.g, PW, PH, which, { y: hz - 150, amp: 70, freq: 0.0013, seed: 13, col: [mid, mid], dark: [pal.hill, pal.hill], fade: 220, tex: 0.5, rim: [pal.horizon, pal.horizon],
      trees: { n: 40, size: 16, fog: [pal.mist, pal.mist], fogAmt: 0.35 } }, r2);
    resetG(S.sky.g);
  }
  // ---- the row: ground, trees behind, the houses, their doors, the gutter, pots ----
  const R = S.row.g;
  const gTop = P(0, 0, -9)[1];
  const grd = R.createLinearGradient(0, gTop, 0, PH);
  grd.addColorStop(0, css(mixc(pal.land, pal.mist, 0.2))); grd.addColorStop(0.5, css(mixc(pal.soil, pal.stone, 0.35))); grd.addColorStop(1, css(mixc(pal.soil, pal.land, 0.4)));
  R.fillStyle = grd; R.fillRect(0, gTop, PW, PH - gTop);
  for (let i = 0; i < 1500; i++) {
    const z = lerp(-8, 15, Math.pow(rng.next(), 0.8)), x = rng.range(-25, 25), q = P(x, 0, z), s = cam.f / q[2];
    if (q[2] < 1) continue; // behind the camera: it would project flipped into the sky
    const lane = z > 0.8 && z < 6.5, col = lane ? mixc(pal.soil, pal.stone, rng.range(0.25, 0.55)) : mixc(pal.land, pal.grass[rng.int(0, 3)], 0.5);
    dab(R, rng.next() < 0.5 ? 'flat' : 'dry', rng.int(0, 3), q[0], q[1], rng.range(0.3, 0.8) * s, rng.range(0.04, 0.08) * s, 0, jit(col, rng, 0.02), rng.range(0.4, 0.8));
  }
  // wheel ruts and two puddles holding the sky
  for (const z of [2.7, 4.3]) { const pts = []; for (let x = -25; x <= 25; x += 0.5) { const q = P(x, 0, z + 0.08 * Math.sin(x * 0.4)); if (q[2] > 1) pts.push(q); } taper(R, pts, pts.map(q => 0.09 * cam.f / q[2]), mixc(pal.soil, pal.ink, 0.3), 0.45); }
  for (const [x, z, r] of [[-2.2, 3.6, 0.9], [5.6, 2.9, 0.6]]) { const q = P(x, 0, z), s = cam.f / q[2]; dab(R, 'round', rng.int(0, 5), q[0], q[1], r * s, r * 0.12 * s, 0, mixc(pal.skyLow, pal.paddy, 0.4), 0.85); dab(R, 'flat', rng.int(0, 5), q[0] - r * 0.2 * s, q[1], r * 0.6 * s, 0.02 * s, 0, pal.horizon, 0.6); }
  resetG(R);
  // trees and a bamboo stand behind the row, rising over the roofs
  for (let i = 0; i < 7; i++) {
    const x = -12 + i * 4.2 + rng.range(-0.8, 0.8), q = P(x, 0, -8), s = cam.f / q[2], h = rng.range(5.5, 8);
    paintCrown(R, { cx: q[0], cy: q[1] - h * s, rx: rng.range(2.2, 3.2) * s, ry: rng.range(1.8, 2.6) * s, seed: rng.int(1, 1e6), pal: fogPal(pal.leaf, pal.mist, 0.15), light: L2, leaf: Math.max(4, 0.16 * s), holes: 2, lightAmt: which ? 0.9 : 0.3 });
  }
  resetG(R);
  // painter's order: furthest from the camera first (the row recedes to the right)
  const order = LANE.houses.slice().sort((a, b) => Math.hypot(b - cam.pos[0], LANE.hz - cam.pos[2]) - Math.hypot(a - cam.pos[0], LANE.hz - cam.pos[2]));
  // a low hedge and a small tree in each gap, behind the fronts
  for (let i = 0; i < LANE.houses.length - 1; i++) {
    const x = (LANE.houses[i] + LANE.houses[i + 1]) / 2, q = P(x, 0, LANE.hz - 0.5), s = cam.f / q[2];
    paintCrown(R, { cx: q[0], cy: q[1] - 2.6 * s, rx: 1.3 * s, ry: 1.1 * s, seed: rng.int(1, 1e6), pal: fogPal(pal.leaf, pal.mist, 0.08), light: L2, leaf: Math.max(4, 0.14 * s), holes: 1, lightAmt: which ? 0.9 : 0.3 });
    paintCrown(R, { cx: q[0], cy: q[1] - 0.5 * s, rx: 1.0 * s, ry: 0.5 * s, seed: rng.int(1, 1e6), pal: fogPal(pal.leaf, pal.mist, 0.05), light: L2, leaf: Math.max(4, 0.12 * s), holes: 0, lightAmt: which ? 0.9 : 0.3 });
  }
  resetG(R);
  for (const x of order) {
    const yaw = rng.range(-0.03, 0.03);
    paintHouse(R, cam, M, which, { p: [x, 0, LANE.hz], w: LANE.w, d: LANE.d, h: LANE.h, rh: LANE.rh, yaw, ov: LANE.ov, detail: true }, rng);
    // a sliding door with a lattice, right of centre
    const zf = LANE.hz + LANE.d / 2 + 0.01, d0 = P(x + 0.2, 0, zf), d1 = P(x + 1.3, 0, zf), d2 = P(x + 1.3, 2.0, zf), d3 = P(x + 0.2, 2.0, zf);
    R.fillStyle = css(which ? hx('6a4630') : mixc(pal.wood, pal.ink, 0.3)); R.beginPath(); [d0, d1, d2, d3].forEach((q, i) => i ? R.lineTo(q[0], q[1]) : R.moveTo(q[0], q[1])); R.closePath(); R.fill();
    R.strokeStyle = css(which ? hx('e9d2a4') : mixc(pal.wall, pal.ink, 0.3), 0.7); R.lineWidth = 1;
    for (let k = 1; k < 4; k++) { const a = P(x + 0.2 + k * 0.275, 0.1, zf), b = P(x + 0.2 + k * 0.275, 1.9, zf); R.beginPath(); R.moveTo(a[0], a[1]); R.lineTo(b[0], b[1]); R.stroke(); }
    for (let k = 1; k < 5; k++) { const a = P(x + 0.25, k * 0.4, zf), b = P(x + 1.25, k * 0.4, zf); R.beginPath(); R.moveTo(a[0], a[1]); R.lineTo(b[0], b[1]); R.stroke(); }
    // pots and a water barrel by the door
    for (let k = 0; k < 3; k++) {
      const q = P(x + rng.range(-1.6, -0.3), 0, zf + 0.35), s = cam.f / q[2], r = rng.range(0.14, 0.22);
      R.fillStyle = css(which ? hx('9a5a3a') : mixc(pal.stone, pal.ink, 0.4)); R.fillRect(q[0] - r * s, q[1] - r * 1.6 * s, r * 2 * s, r * 1.6 * s);
      paintGrassTuft(R, q[0], q[1] - r * 1.5 * s, { h: r * 2.2 * s, n: 5, cols: pal.grass, w: Math.max(1, 0.03 * s), lean: 0 }, rng);
      dab(R, 'round', rng.int(0, 5), q[0] + rng.range(-0.1, 0.1) * s, q[1] - r * 3 * s, 0.06 * s, 0.05 * s, 0, pal.flowers[k % pal.flowers.length], 0.95);
    }
    resetG(R);
  }
  // a stone gutter along the fronts
  { const a = []; for (let x = -25; x <= 40; x += 0.5) { const q = P(x, 0, LANE.hz + LANE.d / 2 + 0.8); if (q[2] > 1) a.push(q); } taper(R, a, a.map(q => 0.1 * cam.f / q[2]), mixc(pal.stone, pal.ink, 0.35), 0.9); taper(R, a.map(q => [q[0], q[1] - 0.06 * cam.f / q[2]]), a.map(q => 0.04 * cam.f / q[2]), pal.stone, 0.8); }
  resetG(R);
  // ---- foreground: a wooden utility pole on our side of the lane, its wires across the sky, the verge ----
  const F = S.fg.g;
  const pb = P(-12, 0, 6.5), pt = P(-11.9, 9, 6.5), ps = cam.f / pb[2];
  taper(F, [pb, pt], [0.14 * ps, 0.1 * ps], mixc(pal.wood, pal.ink, 0.35));
  taper(F, [[pb[0] + 0.05 * ps, pb[1]], [pt[0] + 0.04 * ps, pt[1]]], [0.04 * ps, 0.03 * ps], which ? hx('b08a62') : mixc(pal.wood, pal.mist, 0.25), 0.8);
  for (const y of [6.6, 7.1]) { const a = P(-11.9 - 0.45, y, 6.5), b = P(-11.9 + 0.45, y, 6.5); taper(F, [a, b], [0.06 * ps, 0.06 * ps], mixc(pal.wood, pal.ink, 0.4)); }
  // wires: from the crossarm away to a pole far off to the right, sagging
  for (const [dx, y] of [[-0.4, 7.15], [0.4, 7.15], [0, 6.65]]) {
    const a = [-11.9 + dx, y, 6.5], b = [30, y - 0.6, 5], pts = [];
    for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push(P(lerp(a[0], b[0], u), lerp(a[1], b[1], u) - 1.4 * Math.sin(Math.PI * u), lerp(a[2], b[2], u))); }
    taper(F, pts, pts.map(() => 2.2), mixc(pal.ink, pal.skyMid, 0.1), 0.95);
  }
  paintGrassBand(F, PW, H + M - 50, H + M + 30, { hFar: 30, hNear: 80, cols: pal.grassFg, n: 70, blades: 6, wNear: 5, lean: 0.15 }, rng);
  for (const x of [-12.6, -10.6]) { const q = P(x, 0, 6.6); paintSusuki(F, which, q[0], q[1] + 10, cam.f / q[2] * 0.85, rng, 9); }
  resetG(F);
}
function paintLane(cam, o = {}) {
  const M = BM, PW = W + 2 * M, PH = H + 2 * M;
  const mk = (depth) => [new Plate(PW, PH, depth, -M, -M), new Plate(PW, PH, depth, -M, -M)];
  const P = { sky: mk(3000), row: mk(cam.project([-2, 0, LANE.hz])[2]), fg: mk(cam.project([-12, 0, 6.5])[2]) };
  for (const which of (o.states || [0, 1])) {
    const S = { row: P.row[which], fg: P.fg[which] };
    if (which === 0) S.sky = P.sky[0];
    paintLaneState(S, cam, which, o);
    blurPlate(S.fg, 2);
    for (const k in S) applyGrain(S[k].g, PW, PH, 0.1);
  }
  return P;
}

// arrival of colour on the lane: where each pixel's ray meets the plane of the house fronts, by x (when the ghost
// passed) and by how far below its path; ragged with fine noise, so the front is a thin broken edge, not a smoky band
function laneArrive(cam, lightAt) {
  const zf = LANE.hz + LANE.d / 2, C = cam.pos;
  const d0 = V3.sub(cam.unproject(0, 0, 1), C), dx = V3.sub(V3.sub(cam.unproject(1, 0, 1), C), d0), dy = V3.sub(V3.sub(cam.unproject(0, 1, 1), C), d0);
  return (hit, sx, sy) => {
    const rx = d0[0] + dx[0] * sx + dy[0] * sy, ry = d0[1] + dx[1] * sx + dy[1] * sy, rz = d0[2] + dx[2] * sx + dy[2] * sy;
    if (rz > -1e-4) return 1e9;
    const k = (zf - C[2]) / rz, x = C[0] + rx * k, y = C[1] + ry * k, dv = Math.max(0, LANE.gy + 0.6 - y);
    return lightAt(x) + 0.1 + 0.12 * dv + 0.12 * (rvNoise(x * 5, y * 5, 4) - 0.5) * 2;
  };
}
