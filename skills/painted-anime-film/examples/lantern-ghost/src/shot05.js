// 5. rise: low wide, tilting up. The ghost floats up out of the pool; shadow runs off its body and drips back;
// the hem pulls like taffy and snaps free; it hovers, looks toward the lantern, then toward the flower.
(function () {
  const sh = { name: 'rise', dur: 7.5 };
  const C = HOLLOW.pool, CP = [0.55, 0.3, 4.5];
  sh.base = new Cam(CP, [0, 0.75, -0.6], 36);
  sh.cam = (lt) => { const k = smooth(1.3, 4.6, lt); return new Cam(CP, [0, lerp(0.42, 1.05, k), -0.6], 36); };
  sh.build = () => { sh.P = paintHollow(sh.base, { states: [0], seed: 11 }); };
  const SNAP = 3.2, H0 = GS * 1.58;
  // body height of the hem over the pool (seconds -> metres), key poses with eases between
  const Y = [[0, -0.77], [0.8, -0.77], [1.4, -0.88], [2.3, -0.3], [SNAP, 0.46], [3.45, 0.62], [4.1, 0.37], [4.8, 0.43], [7.5, 0.4]];
  function hemLift(t) { return keyLerp(Y, t, easeInOut); }
  // strands of shadow between the hem and the pool (thetas round the hem)
  const STR = [0.35, 1.25, 1.95, 2.75, 1.6 + Math.PI];
  // drips that fall off the hem after it snaps: [t0, theta, size]
  const DRIPS = [[3.3, 1.2, 1], [3.42, 2.1, 0.8], [3.55, 0.6, 0.7], [3.75, 1.75, 0.9], [4.05, 2.6, 0.6], [4.4, 1.4, 0.7], [4.9, 1.9, 0.5]];
  sh.state = (tt) => {
    const py = hemLift(tt);
    // the hem stays stuck to the pool until the snap: it is stretched part of the way, strands bridge the rest
    const stuck = tt < SNAP ? Math.max(0, py) : 0;
    const recoil = tt >= SNAP ? keyAt([[SNAP, -0.16], [SNAP + 0.083, 0.1], [SNAP + 0.167, -0.04], [SNAP + 0.25, 0]], tt) : 0;
    const pull = stuck * 0.55 / GS + recoil;
    // the shadow coat drains from the crown down (fraction of body height), the last of it rides the hem
    const rel = keyLerp([[0, 1.2], [1.6, 1.2], [2.6, 0.62], [SNAP, 0.22], [SNAP + 0.25, 0.12], [4.6, -0.15]], tt, easeInOut);
    const look = keyLerp([[0, [0.05, 0.85]], [1.4, [0.05, 0.85]], [2.2, [0, 0.45]], [4.6, [0, 0.1]], [5.2, [0, 0.1]], [5.45, [0.95, -0.05]], [6.2, [0.95, -0.05]], [6.45, [-0.9, -0.25]]], tt, easeInOut);
    const yaw = keyLerp([[0, 0], [5.2, 0], [5.6, -0.32], [6.2, -0.32], [6.6, 0.38]], tt, easeInOut); // + turns the face toward +x (screen right)
    const blink = keyAt([[0, 0], [6.85, 0.6], [6.93, 1], [7.0, 0.4], [7.08, 0]], tt);
    const sy = keyLerp([[0, 1], [0.8, 1], [1.4, 0.93], [1.8, 1.07], [2.9, 1.06], [SNAP, 1.0], [3.35, 1.06], [3.6, 0.95], [4.0, 1.02], [4.4, 1]], tt, easeInOut);
    const flut = tt < SNAP ? 0.3 : lerp(2.2, 1, smooth(SNAP, 4.8, tt));
    const arm = keyLerp([[0, -0.15], [SNAP, -0.15], [3.35, 0.55], [3.8, 0.1], [4.4, 0.2]], tt, easeInOut);
    return { p: [C[0], py, C[2]], s: GS, yaw, pull, pullDepth: 1, sy, flut, ph: tt * 2.4, armL: arm, armR: arm,
      coat: py + H0 * rel - pull * GS * 0.5, coatA: 1, coatNoise: 0.18, eyeGlow: keyAt([[0, 1], [2.55, 0.6], [2.72, 0.25], [2.88, 0]], tt),
      look, blink, night: 1, lean: [0, tt < SNAP ? -0.05 : 0.02] };
  };
  sh.draw = (g, lt) => {
    const cam = sh.cam(lt), B = sh.base, P = sh.P, tt = onTwos(lt), seed = drawSeed(lt);
    drawHollow(g, P, B, cam, 0);
    const G = ghostItems(sh.state(tt)), st = G.s;
    // pool: shrinks a little once the ghost has left it; ripples from the rise and from each drip
    const rip = [[C, (tt - 1.45) / 1.6], [C, (tt - 2.2) / 1.6], [C, (tt - SNAP) / 1.4]];
    const drops = [];
    for (const [t0, th, sz] of DRIPS) {
      if (tt < t0) continue;
      const a = hemLift(t0), p0 = [C[0] + Math.cos(th) * 0.3 * GS, Math.max(0.05, a) - 0.04, C[2] + Math.sin(th) * 0.3 * GS];
      const u = tt - t0, y = p0[1] - 4.9 * u * u;
      if (y > 0) drops.push([[p0[0], y, p0[2]], 9.8 * u, sz]);
      else { const tl = Math.sqrt(p0[1] / 4.9); rip.push([[p0[0], 0, p0[2]], (u - tl) / 0.9]); }
    }
    const pr = lerp(HOLLOW.poolR, 0.6, smooth(3.4, 6.5, tt));
    drawPool(g, cam, C, pr, 3, { ripples: rip, sheen: 0.3 });
    contactShadow(g, cam, HOLLOW.lantern, 0.42, 0, 0.55);
    celLayer(g, cam, lanternItems(HOLLOW.lantern, HOLLOW.lanternYaw, 0, 0), GL_PRE, { seed: 7, sat: 0.3, lineW: 1.5 });
    drawFlowerAt(g, cam, 0, 0, 41);
    // strands: from the stretched hem down to the pool surface; they thin as they stretch and snap at SNAP
    const ink = PALS[0].ink;
    if (tt < SNAP + 0.34) for (let i = 0; i < STR.length; i++) {
      const th = STR[i] + 0.15 * Math.sin(i * 3.1), hem = G.hem(th), base = [C[0] + Math.cos(th) * 0.24, 0, C[2] + Math.sin(th) * 0.2];
      const a = cam.project(hem), b = cam.project(base), gap = hem[1];
      if (a[2] < 0.2 || gap < 0.01) continue;
      const w = 0.05 * GS * cam.f / a[2];
      if (tt < SNAP) drawStrand(g, a, b, w, clamp(gap / 0.55), 6 * Math.sin(i * 1.7), ink);
      else { // snapped: top half shrinks up into the hem, bottom half sinks into the pool
        const k = smooth(SNAP, SNAP + 0.34, tt), m = [lerp(a[0], b[0], 0.5), lerp(a[1], b[1], 0.5)];
        drawStrand(g, a, [lerp(m[0], a[0], k), lerp(m[1], a[1], k)], w * 0.8, 0.3, 0, ink);
        drawStrand(g, [lerp(m[0], b[0], k), lerp(m[1], b[1], k)], b, w * 0.8, 0.3, 0, ink);
      }
    }
    // the ghost; under the pool surface it is cut away
    celLayer(g, cam, G.items, GL_PRE, { seed, clipY: 0.004, lineW: 1.6, ink: tt < 2.4 ? [0.2, 0.22, 0.34] : undefined });
    for (const [p, v, sz] of drops) { const q = cam.project(p); drawDrip(g, q[0], q[1], 0.017 * sz * cam.f / q[2], v * cam.f / q[2], ink); }
    if (st.eyeGlow > 0) for (const side of [1, -1]) {
      const q = cam.project(M4.xform(G.M, ghDeform(ghSurf(Math.PI / 2 + side * 0.33 + st.look[0] * 0.28, 1.17 + st.look[1] * 0.08), st)));
      glowFx(g, q[0], q[1], 30, [0.7, 0.85, 1], 0.3 * st.eyeGlow, 'screen');
    }
    drawPlate(g, P.fg[0], B, cam);
  };
  SHOTS.push(sh);
})();
