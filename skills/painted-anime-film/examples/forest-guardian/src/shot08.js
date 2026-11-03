// ---------- launch poses: from the look-up into a deep crouch, then up ----------
const LAUNCH = (() => {
  const K = (b, o) => deepMerge(b, o);
  const KL0 = K(RISE.KE, { rot: { neck: [-0.32, 0.12, 0], head: [-0.38, 0.08, -0.02], chest: [-0.06, 0.04, 0] } });
  const KC = K(KL0, {
    rootP: [0.1, 6.05, 0.75], rootR: [0.24, 0, 0], rot: { waist: [0.12, 0, 0], chest: [0.12, 0, 0], neck: [-0.55, 0.06, 0], head: [-0.42, 0.04, 0] },
    kneeHintL: [0, 0.2, 1], kneeHintR: [0, 0.2, 1], handL: [4.9, 5.7, -1.9], handR: [-4.9, 5.6, -2.1], elbowHintL: [0.4, 0, -1], elbowHintR: [-0.4, 0, -1],
    handRotL: M4.euler(-0.5, 0, 0.15), handRotR: M4.euler(-0.5, 0, -0.15), curl: { L: 0.85, R: 0.85 },
  });
  const KC2 = K(KC, { rootP: [0.1, 5.75, 0.7], rootR: [0.28, 0, 0], handL: [4.8, 5.6, -2.3], handR: [-4.8, 5.5, -2.5] });
  // airborne: body straight, arms swept back and down, toes pointed
  const KF = K(KC2, {
    rootP: [0.1, 7.6, 1.0], rootR: [-0.05, 0, 0], rot: { waist: [-0.04, 0, 0], chest: [-0.1, 0, 0], neck: [-0.5, 0, 0], head: [-0.35, 0, 0] },
    footRotL: M4.rotX(0.7), footRotR: M4.rotX(0.7), kneeHintL: [0, 0, 1], kneeHintR: [0, 0, 1],
    handL: [4.2, 4.4, -2.6], handR: [-4.2, 4.3, -2.8], curl: { L: 0.9, R: 0.9 },
  });
  const keys = [{ t: 0, P: KL0, hold: true }, { t: 0.35, P: KL0, hold: true }, { t: 1.25, P: KC }, { t: 2.2, P: KC2, hold: true }, { t: 9, P: KC2, hold: true }];
  const lag = (path) => path.startsWith('rot.head') ? 0.25 : path.startsWith('rot.neck') ? 0.15 : (/^(hand|elbow|curl)/.test(path) ? 0.12 : 0);
  return { keys, lag, KC2, KF };
})();
// crouch (shot 8a time)
function P_CROUCH(t, o = {}) {
  const tq = o.ones ? t : Math.floor(t * 12) / 12;
  return poseFromParams(samplePoseKeys(LAUNCH.keys, tq, LAUNCH.lag), R_YAW);
}
// lift-off: s = seconds since the feet leave (negative = still crouched); returns pose + height gained
function P_FLY(s, o = {}) {
  const sq = o.ones ? s : Math.floor(s * 24) / 24; // the launch is on ones
  const u = clamp(sq / 0.18);
  const P = samplePoseKeys([{ t: 0, P: LAUNCH.KC2 }, { t: 1, P: LAUNCH.KF }], u, () => 0);
  const rise = sq > 0 ? 18 * sq * sq + 6 * sq : 0;
  P.rootP = V3.add(P.rootP, [0, rise, 0]);
  // legs trail: feet follow under the body once it leaves the ground
  if (sq > 0) { P.footL = V3.add(P.rootP, [1.9, -6.35, -0.4]); P.footR = V3.add(P.rootP, [-1.9, -6.3, -0.7]); }
  return { pose: poseFromParams(P, R_YAW), rise };
}
// jets: world positions + downward axis for a pose
function jetsOf(Mw) {
  const B = Mw[JIDX.back];
  return [1, -1].map(s => ({ p: M4.xform(B, [s * 1.75, -3.0, 0.36]), d: V3.norm(M4.xdir(B, [0, -1, 0.12])) }));
}
// jet power over shot-8a time: coughs, catches, roars
const JET_KEYS = [[0, 0], [20, 0], [21, 0.35], [22, 0.1], [23, 0], [29, 0], [30, 0.55], [31, 0.25], [32, 0.6], [33, 0.15], [34, 0], [38, 0], [39, 0.7], [40, 0.9], [42, 1.0]];
function jetAt(f) { for (let i = JET_KEYS.length - 1; i >= 0; i--) if (f >= JET_KEYS[i][0]) return JET_KEYS[i][1]; return 0; }
function drawJets(g, cam, Mw, power, fi, o = {}) {
  if (power <= 0.01) return;
  for (const [i, j] of jetsOf(Mw).entries()) {
    const a = cam.project(j.p), b = cam.project(V3.add(j.p, V3.mul(j.d, 6)));
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), ppm = cam.f / a[2];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) / 6 * (o.len || 5.5) * power * (0.9 + 0.2 * new RNG(fi * 7 + i).next());
    glowFx(g, a[0], a[1], 3.2 * ppm * power, hx('ffd890'), 0.55 * power);
    drawFlame(g, a[0], a[1], ang, len, 0.75 * ppm * (0.6 + 0.4 * power), fi + i * 3);
    glowFx(g, a[0], a[1], 1.1 * ppm, hx('fffbe8'), 0.9 * power);
  }
}
// ---------- SHOT 8a: the engines cough, catch, and blast the clearing ----------
(function () {
  const sh = { name: 'ignite', dur: 4.2 };
  let bg, C, Tg, dust, Ry, leaves;
  const IGN = 39 / 24;
  sh.build = () => {
    buildLeaves();
    Ry = M4.rotY(R_YAW);
    const Mw = evalPose(P_CROUCH(2.5)), J = jetsOf(Mw), bk = jointPos(Mw, 'back', [0, 0, -0.5]);
    C = M4.xform(Ry, [10, 1.5, -23]);
    const ft = V3.lerp(jointPos(Mw, 'anL'), jointPos(Mw, 'anR'), 0.5);
    Tg = fitCam(C, 36, [[bk, [860, 300]], [ft, [900, 800]]], bk);
    bg = forestBG(new Cam(C, Tg, 36), { seed: 10, sun: [W * 0.25, H * 0.05] });
    const rng = new RNG(808); dust = [];
    for (let i = 0; i < 56; i++) dust.push({ a: rng.next() * TAU, v: rng.range(10, 22), r: rng.range(1.4, 2.8), t0: IGN + rng.range(0, 0.5), seed: rng.int(1, 1e6) });
    leaves = makeLeaves(70, [-14, 14, 0.2, 3, -14, 14], rng, { vy: -1.2, amp: 0.6 });
    for (const L of leaves) { L.t0 = IGN + rng.range(0, 0.8); const d = V3.norm([L.p[0], 0, L.p[2]]); L.drift = [d[0] * 6, d[2] * 6]; L.vy = -rng.range(1.5, 3.5); }
    sh.gplants = clearView(baseGrowth(77), C, V3.lerp(jointPos(Mw, 'anL'), jointPos(Mw, 'anR'), 0.5), 5.5);
  };
  sh.draw = (g, lt) => {
    const f = Math.floor(lt * 24), pw = jetAt(f) * (f > 42 ? 1 + 0.08 * Math.sin(f * 2.3) : 1);
    const shake = f >= 39 ? 0.06 * Math.exp(-(lt - IGN) * 1.2) + 0.02 : f >= 30 && f < 34 ? 0.02 : 0;
    const rng = new RNG(5100 + f);
    const cam = new Cam(V3.add(C, [rng.range(-shake, shake), rng.range(-shake, shake), 0]), Tg, 36, rng.range(-shake, shake) * 0.06);
    bg.draw(g, cam, lt);
    const pose = P_CROUCH(lt), Mw = evalPose(pose);
    // jet light floods the ground under it
    const L = Object.assign({}, LIGHT_FOREST, { gobo: [0.3, 0.7, 1, 13] });
    robotLayer(g, cam, pose, L, { seed: 8 + (f >> 1) % 2, lineW: 1.5, t: lt, moss: 1.35, gplants: sh.gplants, extra: handRockItems(), mats: { core: 1, eye: 1, jet: pw * 1.5 } });
    // ground dust thrown outward from under the jets
    const ctr = V3.lerp(...jetsOf(Mw).map(j => j.p)); ctr[1] = 0.4;
    for (const d of dust) {
      const dt = Math.floor((lt - d.t0) * 12) / 12; if (dt < 0 || dt > 1.6) continue;
      const rr = d.v * Math.pow(dt, 0.6);
      const P = [ctr[0] + Math.cos(d.a) * rr, 0.5 + dt * 0.6, ctr[2] + Math.sin(d.a) * rr];
      const q = cam.project(P); if (q[2] < 1) continue;
      drawPuff(g, q[0], q[1], d.r * cam.f / q[2], clamp(dt / 1.6), d.seed + Math.floor(dt * 12), { alpha: 0.8, rise: 0.4, lit: hx('efe0c0'), shd: hx('b3a184'), line: hx('84735c') });
    }
    // coughs: dark smoke puffs from the nozzles
    for (const [t0, k] of [[21 / 24, 0.6], [30 / 24, 0.8], [32 / 24, 0.6]]) {
      const d = Math.floor((lt - t0) * 12) / 12; if (d < 0 || d > 1.0) continue;
      for (const j of jetsOf(Mw)) { const q = cam.project(V3.add(j.p, V3.mul(j.d, 0.8 + d * 1.5))); drawPuff(g, q[0], q[1], k * 1.1 * cam.f / q[2], d, 600 + Math.round(t0 * 99) + Math.floor(d * 12), { alpha: 0.9, rise: -0.4, lit: hx('9a948c'), shd: hx('5f5a56'), line: hx('3a3634') }); }
    }
    drawJets(g, cam, Mw, pw, f >> 1, { len: 7.2 });
    // where the blast hits the ground: hot glow + a churning skirt of dust
    if (pw > 0.3) {
      for (const j of jetsOf(Mw)) {
        const hp = V3.add(j.p, V3.mul(j.d, -j.p[1] / j.d[1])); hp[1] = 0.3;
        const q = cam.project(hp), ppm = cam.f / q[2];
        glowFx(g, q[0], q[1], 4.5 * ppm * pw, hx('ffcf80'), 0.5 * pw);
        for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + (f >> 1) * 0.7; drawPuff(g, q[0] + Math.cos(a) * 2.2 * ppm, q[1] + Math.sin(a) * 0.5 * ppm, 1.3 * ppm * pw, ((f >> 1) * 0.11 + k * 0.2) % 1, 900 + k * 13 + (f >> 1), { alpha: 0.85, rise: 0.3, lit: hx('f6e3bd'), shd: hx('c2a985'), line: hx('8d7558') }); }
      }
    }
    drawEyeGlow(g, cam, Mw, 1);
    drawLeavesWorld(g, leaves, cam, lt, { size: 0.2 });
  };
  SHOTS.push(sh);
})();
