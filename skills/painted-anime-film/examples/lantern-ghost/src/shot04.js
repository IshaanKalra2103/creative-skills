// 4. eyes: close-up, very slow push. In the dark of the pool two eyes open, blink, then look up.
(function () {
  const sh = { name: 'eyes', dur: 3.5 };
  const C = HOLLOW.pool, tg = [0, 0.14, -0.6];
  sh.base = new Cam([0.14, 0.5, 1.5], tg, 30);
  sh.cam = (lt) => { const k = easeInOut(lt / sh.dur); return new Cam([0.14, 0.5 - 0.03 * k, 1.5 - 0.16 * k], tg, 30); };
  sh.build = () => { sh.P = paintHollow(sh.base, { states: [0], seed: 11 }); };
  // timing sheet (seconds): blink 1 = shut
  const BLINK = [[0, 1], [1.0, 0.7], [1.083, 0.3], [1.167, 0], [2.0, 0.55], [2.083, 1], [2.167, 0.45], [2.25, 0]];
  sh.state = (tt) => {
    const f = tt;
    const look = keyLerp([[0, [0, 0]], [2.55, [0, 0]], [2.8, [0.05, 0.85]]], f, easeOut);
    return { p: [C[0], -0.77 + 0.012 * Math.sin(tt * 2.2) + 0.02 * smooth(2.55, 2.9, tt), C[2]], s: GS, coat: 4, coatA: 1, eyeGlow: keyAt(BLINK, f) > 0.9 ? 0 : 1,
      blink: keyAt(BLINK, f), look, lean: [0, -0.06 * smooth(2.55, 2.9, tt)], flut: 0.4, ph: tt * 2, night: 1 };
  };
  sh.draw = (g, lt) => {
    const cam = sh.cam(lt), B = sh.base, P = sh.P, tt = onTwos(lt);
    drawHollow(g, P, B, cam, 0);
    drawPool(g, cam, C, HOLLOW.poolR, 3, { sheen: 0.35, ripples: [[C, (tt + 0.4) / 3.2]] });
    const G = ghostItems(sh.state(tt));
    celLayer(g, cam, G.items, GL_PRE, { seed: drawSeed(lt), clipY: 0.004, ink: [0.2, 0.22, 0.34], lineW: 1.7 });
    const st = G.s;
    if (st.eyeGlow > 0) for (const side of [1, -1]) {
      const th = Math.PI / 2 + side * 0.33 + st.look[0] * 0.28, y = 1.17 + st.look[1] * 0.08;
      const q = cam.project(M4.xform(G.M, ghDeform(ghSurf(th, y), st)));
      glowFx(g, q[0], q[1], 46, [0.7, 0.85, 1], 0.32 * (1 - st.blink), 'screen');
    }
    drawPlate(g, P.fg[0], B, cam);
  };
  SHOTS.push(sh);
})();
