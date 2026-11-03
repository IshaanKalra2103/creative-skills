// 6. flower: insert. The wilted grey bellflower; the ghost's sleeve comes down and touches its bell; colour runs from
// the touch along the stem, the flower lifts and opens, and colour spreads over the ground round it.
(function () {
  const sh = { name: 'flower', dur: 5 };
  const F = HOLLOW.flower, cp = [F[0] + 0.3, 0.62, F[2] + 2.05], tg = [F[0] - 0.12, 0.5, F[2] - 0.1];
  sh.base = new Cam(cp, tg, 34);
  sh.cam = (lt) => { const k = easeInOut(lt / sh.dur); return new Cam([cp[0] + 0.04 * k, cp[1] + 0.02 * k, cp[2] - 0.12 * k], tg, 34); };
  const TOUCH = 1.7;
  // the reaching pose; the body is placed so that this sleeve's cuff lands on the bell at TOUCH
  const pose = (tt) => ({ yaw: -0.75, sy: keyLerp([[0, 0.98], [TOUCH, 0.9], [2.4, 0.9], [3.4, 0.97]], tt), lean: [keyLerp([[0, 0], [TOUCH, 0.22], [2.6, 0.22], [3.6, 0.08]], tt), keyLerp([[0, 0.05], [TOUCH, 0.2], [2.6, 0.2], [3.6, 0.1]], tt)],
    armR: keyLerp([[0, -0.3], [1.0, -0.05], [TOUCH, -0.22], [2.2, -0.22], [3.2, -0.45]], tt), armL: -0.35, fwdR: keyLerp([[0, 0], [TOUCH, 0.35], [2.6, 0.35], [3.6, 0.1]], tt), fwdL: 0,
    look: keyLerp([[0, [-0.4, -1.2]], [TOUCH, [-0.6, -1.7]], [3.0, [-0.6, -1.7]], [3.6, [-0.4, -1.1]]], tt), flut: 0.8, ph: tt * 2.4, night: 0.6 });
  let side = 1, P0 = null, YAW = 0, WANT = [1, 0, 0];
  sh.build = () => {
    sh.P = paintHollow(sh.base, { states: [0, 1], seed: 11 });
    for (const w of [0, 1]) { for (const k of ['sky', 'trunk']) blurPlate(sh.P[k][w], 7); blurPlate(sh.P.roots[w], 4); }
    // choose the turn and the sleeve so the cuff reaches toward the camera and to screen right: the body then sits
    // behind and left of the flower, never between it and the lens
    const toCam = V3.norm([cp[0] - F[0], 0, cp[2] - F[2]]), right = [toCam[2], 0, -toCam[0]], want = V3.norm(V3.add(V3.mul(right, 0.75), V3.mul(toCam, 0.65))); WANT = want;
    let best = -1e9;
    for (let y = -Math.PI; y < Math.PI; y += Math.PI / 24) for (const sd of [1, -1]) {
      const st = Object.assign({ p: [0, 0, 0], s: GS }, pose(TOUCH), { yaw: y });
      if (sd < 0) { [st.armL, st.armR] = [st.armR, st.armL]; [st.fwdL, st.fwdR] = [st.fwdR, st.fwdL]; }
      const G = ghostItems(st), c = G.cuff(sd), h = V3.norm([c[0], 0, c[2]]);
      const face = V3.norm(V3.sub(G.head, [0, G.head[1], 0])), sc = V3.dot(h, want) + 0.6 * V3.dot([face[0], 0, face[2]], toCam);
      if (sc > best) { best = sc; side = sd; YAW = y; P0 = V3.sub(V3.add(FLOWER_BELL, [-0.02, 0.07, 0.03]), c); }
    }
  };
  sh.state = (tt) => {
    const st = pose(tt); st.yaw = YAW;
    if (side < 0) { [st.armL, st.armR] = [st.armR, st.armL]; [st.fwdL, st.fwdR] = [st.fwdR, st.fwdL]; }
    const inK = easeOut(smooth(0.2, TOUCH, tt)), outK = smooth(2.4, 3.8, tt);
    st.p = V3.add(P0, V3.add(V3.mul(WANT, -0.55 * (1 - inK) - 0.08 * outK), [0, 0.25 * (1 - inK) + 0.05 * outK, 0]));
    st.s = GS; st.blink = keyAt([[0, 0], [TOUCH + 0.1, 0.3], [2.9, 0.6], [2.97, 1], [3.04, 0.4], [3.1, 0.3], [3.9, 0]], tt); // soft eyes while it touches
    return st;
  };
  sh.draw = (g, lt) => {
    const cam = sh.cam(lt), B = sh.base, P = sh.P, tt = onTwos(lt);
    revealMatte(cam, bloomArrive(F, TOUCH + 0.35, 0.22, 0.2), tt, { soft: 0.6, band: 0.6 });
    revealDraw(g, (gg, w) => drawHollow(gg, P, B, cam, w), { edge: 0.3 });
    // the flower: colour runs from the touched bell along the stem, then it lifts and opens (overshoots, settles)
    const colK = smooth(TOUCH + 0.05, TOUCH + 1.4, tt), k = keyLerp([[0, 0], [TOUCH + 0.6, 0], [TOUCH + 1.9, 1.08], [TOUCH + 2.4, 0.97], [TOUCH + 2.8, 1]], tt);
    const nudge = tt >= TOUCH && tt < TOUCH + 0.6 ? 0.06 * Math.sin((tt - TOUCH) / 0.6 * Math.PI) : 0;
    const G = ghostItems(sh.state(tt));
    celLayer(g, cam, G.items, ghostLight(0.15 * smooth(TOUCH, 3, tt)), { seed: drawSeed(lt), clipY: 0.004, lineW: 1.8 });
    drawFlowerAt(g, cam, Math.max(0, k - nudge), colK, 41, { from: 0.92 });
    // the touch: a small warm spark where cloth meets petal, gone in half a second
    if (tt >= TOUCH - 0.05 && tt < TOUCH + 0.7) { const q = cam.project(FLOWER_BELL), a = 1 - (tt - TOUCH) / 0.7; glowFx(g, q[0], q[1], 70 * a + 30, [1, 0.85, 0.55], 0.6 * a, 'screen'); glowFx(g, q[0], q[1], 14, [1, 0.95, 0.8], 0.8 * a, 'lighter'); }
    // pollen-motes lift off the opened flower
    if (tt > TOUCH + 1.9) { const rng = new RNG(66), q = cam.project(F), s = cam.f / q[2];
      for (let i = 0; i < 6; i++) { const t0 = TOUCH + 1.9 + i * 0.22, u = tt - t0; if (u < 0) continue; drawMote(g, q[0] + (0.05 + rng.range(-0.08, 0.12) + 0.04 * Math.sin(u * 2 + i)) * s, q[1] - (0.42 + u * 0.12) * s, 1.6, clamp(1 - u / 2.2) * 0.8); } }
    drawPlate(g, P.fg[0], B, cam);
  };
  SHOTS.push(sh);
})();
