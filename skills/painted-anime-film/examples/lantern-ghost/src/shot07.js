// 7. kindle: medium close-up. The ghost looks at the sleeve that touched the flower; its own light catches in steps,
// like a lamp taking; it lowers the sleeve, then turns and looks down toward the valley (screen right).
(function () {
  const sh = { name: 'kindle', dur: 4.5 };
  const G0 = [0.5, 0.1, -0.35], cp = [G0[0] - 0.32, 1.12, G0[2] + 2.05], tg = [G0[0] + 0.08, 0.98, G0[2]];
  sh.base = new Cam(cp, tg, 30);
  sh.cam = (lt) => { const k = easeInOut(lt / sh.dur); return new Cam([cp[0], cp[1], cp[2] - 0.08 * k], tg, 30); };
  sh.build = () => {
    sh.P = paintHollow(sh.base, { states: [0, 1], seed: 11 });
    for (const w of [0, 1]) { for (const k of ['sky', 'trunk', 'roots', 'ground']) blurPlate(sh.P[k][w], 6); }
  };
  // light steps: holds between, like a wick catching (stepped, not eased)
  const EMIT = [[0, 0], [1.0, 0.22], [1.42, 0.5], [1.84, 1]];
  sh.state = (tt) => {
    const emit = keyAt(EMIT, tt) * (1 + (tt > 1.84 ? 0 : 0.08 * Math.sin(tt * 40)));
    return { p: [G0[0], G0[1] + 0.03 * Math.sin(tt * 1.6), G0[2]], s: GS, yaw: keyLerp([[0, -0.15], [2.6, -0.15], [3.3, 0.75]], tt), sy: keyLerp([[0, 1], [1.84, 1], [1.95, 1.05], [2.2, 1]], tt),
      armR: keyLerp([[0, 0.75], [2.1, 0.75], [2.7, -0.3]], tt), fwdR: keyLerp([[0, 0.55], [2.1, 0.55], [2.7, 0.05]], tt), armL: -0.35,
      look: keyLerp([[0, [-0.5, -0.15]], [2.4, [-0.5, -0.15]], [2.9, [-0.2, 0.05]], [3.5, [-0.7, -0.5]]], tt),
      blink: keyAt([[0, 0], [0.55, 0.6], [0.62, 1], [0.69, 0.4], [0.76, 0], [2.95, 0.6], [3.02, 1], [3.09, 0.4], [3.16, 0]], tt),
      emit, wick: emit, flut: 1, ph: tt * 2.4, night: 0.6 * (1 - emit), wickBend: keyLerp([[0, 0], [2.6, 0], [3.4, 0.25]], tt) };
  };
  sh.draw = (g, lt) => {
    const cam = sh.cam(lt), B = sh.base, P = sh.P, tt = onTwos(lt), st = sh.state(tt);
    revealMatte(cam, bloomArrive(HOLLOW.flower, -3.3, 0.22, 0.2), tt + 0.6 * smooth(1.84, 4.5, tt), { soft: 0.6, band: 0.6 });
    revealDraw(g, (gg, w) => drawHollow(gg, P, B, cam, w), { edge: 0.25 });
    // its own light falls on the ground and the roots behind it
    if (st.emit > 0) { const q = cam.project([G0[0], 0.4, G0[2] - 0.3]); glowFx(g, q[0], q[1], 520 * st.emit, [1, 0.8, 0.5], 0.22 * st.emit, 'screen'); }
    const G = ghostItems(st);
    celLayer(g, cam, G.items, ghostLight(0.25 + 0.25 * st.emit), { seed: drawSeed(lt), clipY: 0.004, lineW: 1.8 });
    ghostGlow(g, cam, G, st.emit, { r: 0.9 });
    // the step itself: each catch throws a brief flare at the wick
    for (const [t0] of EMIT.slice(1)) if (tt >= t0 && tt < t0 + 0.25) { const q = cam.project(G.crown), a = 1 - (tt - t0) / 0.25; glowFx(g, q[0], q[1], 120, [1, 0.85, 0.55], 0.5 * a, 'screen'); }
    drawPlate(g, P.fg[0], B, cam);
  };
  SHOTS.push(sh);
})();
