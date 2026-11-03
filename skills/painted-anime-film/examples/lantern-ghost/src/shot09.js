// 9. village: wide, static. Across a lane, a row of farmhouse fronts; the ghost glides along the eaves left to right.
// Each house comes into colour as it passes and the paper lantern under its eave catches, sways, and holds.
(function () {
  const sh = { name: 'village', dur: LANE.dur };
  sh.base = laneCam();
  sh.cam = () => sh.base;
  sh.build = () => { sh.P = paintLane(sh.base, { seed: 909 }); sh.L = laneLanterns(); };
  const lightAt = (x) => (x - LANE.gx0) / LANE.gv;
  sh.state = (tt) => {
    const x = laneGx(tt), yaw = -0.15, d = [Math.cos(yaw), Math.sin(yaw)];
    return { p: [x, LANE.gy + 0.12 * Math.sin(tt * 2.6), LANE.gz], s: GS, yaw, sy: 1 + 0.03 * Math.sin(tt * 2.6 + 1),
      lean: [d[0] * 0.12, d[1] * 0.12], drag: [d[0] * 0.3, d[1] * 0.3], armL: 0.4, armR: keyLerp([[0, 0.4], [2.2, 0.4], [2.5, 0.85], [2.9, 0.4]], tt), fwdL: -0.2, fwdR: -0.1,
      look: keyLerp([[0, [-0.6, -0.2]], [2.1, [-0.6, -0.2]], [2.4, [-0.2, -0.8]], [3.0, [-0.6, -0.2]]], tt), blink: keyAt([[0, 0], [3.3, 0.6], [3.37, 1], [3.44, 0.4], [3.51, 0]], tt),
      emit: 1, wick: 1, flut: 1.5, ph: tt * 3.2, night: 0, wickBend: 0.3 };
  };
  sh.draw = (g, lt) => {
    const cam = sh.cam(lt), B = sh.base, P = sh.P, tt = onTwos(lt), st = sh.state(tt);
    drawPlate(g, P.sky[0], B, cam);
    revealMatte(cam, laneArrive(cam, lightAt), tt, { soft: 0.14, band: 0.5 });
    revealDraw(g, (gg, w) => drawPlate(gg, P.row[w], B, cam), { edge: 0.35 });
    // the lanterns: each catches as the ghost passes over it (a flicker, then holds) and swings from the gust
    for (const L of sh.L) {
      const q = cam.project(L), s = 0.2 * cam.f / q[2] / 11, t0 = lightAt(L[0]) + 0.05, u = tt - t0;
      const lit = keyAt([[-99, 0], [t0, 0.45], [t0 + 0.083, 0.15], [t0 + 0.167, 0.8], [t0 + 0.25, 0.6], [t0 + 0.333, 1]], tt);
      const sway = u > 0 ? 0.22 * Math.exp(-u * 1.6) * Math.sin(u * 6.5) : 0;
      drawChochin(g, q[0], q[1], s, lit, sway);
    }
    const rng = new RNG(99);
    for (let i = 0; i < 60; i++) {
      const t0 = i * 0.085 + rng.range(0, 0.06), age = tt - t0, ox = rng.range(-0.3, 0.3), oy = rng.range(-0.1, 0.5), r = rng.range(1.2, 2.4);
      if (age < 0 || age > 1.7) continue;
      const q = cam.project([laneGx(t0) + ox - 0.2, LANE.gy + oy + age * 0.3 - age * age * 0.12, LANE.gz]);
      drawMote(g, q[0], q[1], r, Math.sin(Math.PI * Math.min(1, age / 1.7)) * 0.9);
    }
    const G = ghostItems(st);
    celLayer(g, cam, G.items, ghostLight(0.5), { seed: drawSeed(lt), lineW: 1.5 });
    ghostGlow(g, cam, G, 1, { r: 0.8 });
    revealDraw(g, (gg, w) => drawPlate(gg, P.fg[w], B, cam), { edge: 0.12 });
  };
  SHOTS.push(sh);
})();
