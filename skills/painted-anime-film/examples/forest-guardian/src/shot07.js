// ---------- SHOT 7a: it lifts its head toward the canopy gap; the eyes come on ----------
const LIFT = { t0: 0.7, t1: 3.1 };
// head-lift amount over shot-7a time (drawn on twos, neck leads, head follows, small overshoot)
function liftAt(t, lag = 0) {
  const u = clamp((t - lag - LIFT.t0) / (LIFT.t1 - LIFT.t0));
  const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  return e + Math.sin(clamp((t - lag - LIFT.t1) / 0.7) * Math.PI) * 0.06;
}
function P_LOOKUP(t, o = {}) {
  const tq = o.ones ? t : Math.floor(t * 12) / 12;
  return P_RISE(12, { edit: (P) => {
    const n = liftAt(tq), h = liftAt(tq, 0.22);
    P.rot.neck = [0.3 - 0.62 * n, 0.12 * n, 0.0];
    P.rot.head = [0.12 - 0.5 * h, -0.02 + 0.1 * h, 0.02 - 0.04 * h];
    P.rot.chest = [0.06 - 0.12 * n, 0.04 * n, 0];
    return P;
  } });
}
const EYE_KEYS = [[0, 0], [52, 0], [53, 0.35], [54, 0.08], [55, 0], [58, 0], [59, 0.7], [60, 0.4], [61, 0.15], [63, 0.9], [64, 1.25], [66, 1.0]];
function eyeAt(f) { for (let i = EYE_KEYS.length - 1; i >= 0; i--) if (f >= EYE_KEYS[i][0]) return EYE_KEYS[i][1] * (f > 66 ? 1 + 0.04 * Math.sin(f / 24 * 5) : 1); return 0; }
function drawEyeGlow(g, cam, Mw, e, o = {}) {
  if (e <= 0.01) return;
  for (const s of [0.6, -0.6]) {
    const p = cam.project(jointPos(Mw, 'head', [s, 0.86, 1.25]));
    if (p[2] < 0.5 || glProbe(p[0], p[1])[0] < p[2] - 0.5) continue; // hidden behind the head
    const r = (o.r || 0.9) * cam.f / p[2];
    glowFx(g, p[0], p[1], r * (1.3 + e), hx('a8f4ff'), 0.5 * e);
    glowFx(g, p[0], p[1], r * 0.4, hx('f2ffff'), 0.75 * Math.min(1, e));
  }
}
(function () {
  const sh = { name: 'lookup', dur: 4.6 };
  let bg, C, Tg, eye0;
  sh.build = () => {
    buildLeaves();
    const Ry = M4.rotY(R_YAW);
    const M0 = evalPose(P_LOOKUP(0)), M1 = evalPose(P_LOOKUP(4));
    eye0 = jointPos(M1, 'head', [0, 0.86, 1.3]);
    const ch = jointPos(M0, 'chest', [0, 2.6, 2.4]);
    const F = M4.xdir(Ry, [0, 0, 1]), Lf = M4.xdir(Ry, [1, 0, 0]);
    C = V3.add(eye0, V3.add(V3.mul(F, 7.2), V3.add(V3.mul(Lf, 6.4), [0, -2.6, 0])));
    Tg = fitCam(C, 30, [[eye0, [700, 520]], [ch, [720, 1010]]], eye0);
    bg = canopyUpBG(new Cam(C, Tg, 30), { seed: 7, crownBottom: 0.7, gap: [W * 0.75, H * 0.12, 380, 260] });
    sh.leaves = makeLeaves(26, [eye0[0] - 7, eye0[0] + 7, eye0[1] + 1, eye0[1] + 8, eye0[2] - 4, eye0[2] + 6], new RNG(71), { t0: 3.5, vy: 0.8 });
  };
  sh.draw = (g, lt) => {
    const k = easeInOut(clamp(lt / sh.dur));
    const cam = new Cam(V3.add(C, [0, -0.25 * k, 0]), V3.add(Tg, [0, 0.35 * k, 0]), 30);
    bg.draw(g, cam);
    const f = Math.floor(lt * 24), e = eyeAt(Math.floor(f / 2) * 2 + (f >= 52 && f < 66 ? f % 2 : 0));
    const pose = P_LOOKUP(lt), Mw = evalPose(pose);
    robotLayer(g, cam, pose, Object.assign({}, LIGHT_FOREST, { gobo: [0.3, 0.75, 1, 11] }), { seed: 7, lineW: 1.6, t: lt, moss: 1.35, mats: { core: 0.9, eye: e } });
    drawEyeGlow(g, cam, Mw, e);
    drawCoreGlow(g, cam, Mw, 0.9);
    drawLeavesWorld(g, sh.leaves, cam, lt, { size: 0.16 });
    drawMotes(g, 30, 77, lt, [200, 0, W - 100, H * 0.8], hx('fff0c8'), 0.35);
  };
  SHOTS.push(sh);
})();
// ---------- SHOT 7b: what it sees: the gap in the canopy, full of light ----------
(function () {
  const sh = { name: 'gap', dur: 3.0 };
  let bg, C, Tg;
  sh.build = () => {
    buildLeaves();
    C = [0.5, 15, 1.5];
    const up = V3.norm([0.12, 1, 0.08]);
    Tg = V3.add(C, V3.mul(up, 30));
    const cam = new Cam(C, Tg, 44, 0.08);
    const sp = cam.project(V3.add(C, V3.mul(V3.norm(LIGHT_FOREST.sun), 1000)));
    bg = gapUpBG(cam, { seed: 12, gR: 290, sunOff: [140, -70] });
    sh.cam0 = cam;
    sh.leaves = makeLeaves(40, [C[0] - 10, C[0] + 10, C[1] + 6, C[1] + 22, C[2] - 10, C[2] + 10], new RNG(72), { t0: 2, vy: 0.9 });
  };
  sh.draw = (g, lt) => {
    const k = easeInOut(clamp(lt / sh.dur));
    const cam = new Cam(V3.add(C, [0, 0.6 * k, 0]), Tg, 44 - 2 * k, 0.08);
    bg.draw(g, cam);
    const s = bg.sun, ra = 0.22 + 0.06 * Math.sin(lt * 1.3);
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + 0.4; drawBeam(g, s[0], s[1], a, 1400, 30, 260, hx('fff0c4'), ra * (0.6 + 0.4 * Math.sin(i * 2.7))); }
    glowFx(g, s[0], s[1], 260, hx('fffbe8'), 0.6);
    drawLeavesWorld(g, sh.leaves, cam, lt, { size: 0.2 });
    drawMotes(g, 40, 79, lt, [0, 0, W, H], hx('fff4d4'), 0.4);
  };
  SHOTS.push(sh);
})();
