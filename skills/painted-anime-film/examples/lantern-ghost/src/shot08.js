// 8. descent: wide, trucking with it. Seen from across a gully, the ghost glides down the ridge path left to right;
// colour comes into the ridge behind it, a wake that widens down the slope. The sky and the far valley stay grey.
(function () {
  const sh = { name: 'descent', dur: SIDE.dur };
  sh.base = sideCam(0);
  sh.cam = (lt) => sideCam(lt);
  sh.build = () => { sh.P = paintSide(sh.base, { seed: 808 }); };
  sh.state = (tt) => {
    const x = sideGx(tt), yaw = 0.95, d = [Math.cos(yaw), Math.sin(yaw)]; // world +x in body space (x, z)
    return { p: [x, sideH(x) + 0.26 + 0.06 * Math.sin(tt * 2.2), SIDE.z + 0.4], s: GS, yaw, sy: 1 + 0.03 * Math.sin(tt * 2.2 + 1),
      lean: [d[0] * 0.14, d[1] * 0.14], drag: [d[0] * 0.28, d[1] * 0.28], armL: 0.45, armR: 0.45, fwdL: -0.2, fwdR: -0.2,
      look: [0, -0.25], blink: keyAt([[0, 0], [4.1, 0.6], [4.17, 1], [4.24, 0.4], [4.31, 0]], tt),
      emit: 1, wick: 1, flut: 1.5, ph: tt * 3.2, night: 0, wickBend: 0.3 };
  };
  // arrival of colour at a pixel: when the ghost passed that x, later the further below its path (plane of the ridge)
  function arrive(cam) {
    const D = cam.project([cam.pos[0], sideH(cam.pos[0]), SIDE.z])[2];
    const A = cam.unproject(0, 0, D), Bx = V3.sub(cam.unproject(1, 0, D), A), By = V3.sub(cam.unproject(0, 1, D), A);
    return (hit, sx, sy) => {
      const x = A[0] + Bx[0] * sx + By[0] * sy, y = A[1] + Bx[1] * sx + By[1] * sy, dv = Math.max(0, sideH(x) + 0.9 - y);
      return (x - SIDE.x0) / SIDE.v + 0.2 + 0.22 * dv + 0.14 * (rvNoise(x * 5, y * 5, 4) - 0.5) * 2;
    };
  }
  sh.draw = (g, lt) => {
    const cam = sh.cam(lt), B = sh.base, P = sh.P, tt = onTwos(lt), st = sh.state(tt);
    drawPlate(g, P.sky[0], B, cam); drawPlate(g, P.far[0], B, cam);
    revealMatte(cam, arrive(cam), tt, { soft: 0.18, band: 0.55 });
    revealDraw(g, (gg, w) => drawPlate(gg, P.ridge[w], B, cam), { edge: 0.35 });
    // mist lying in the gully (atmosphere, on ones)
    for (let i = 0; i < 22; i++) {
      const x = -7 + i * 1.0 + ((lt * 0.12 + i * 0.37) % 1), q = cam.project([x, sideH(x) - 1.25, -7.2]), s = cam.f / q[2];
      dab(g, 'soft', i % 2, q[0], q[1], 2.2 * s, 0.3 * s, -0.29, PALS[0].mist, 0.1);
    }
    resetG(g);
    // its light on the path under it
    { const q = cam.project([st.p[0], sideH(st.p[0]) + 0.1, SIDE.z + 0.4]); glowFx(g, q[0], q[1], 260, [1, 0.8, 0.5], 0.25, 'screen'); }
    // the wake: motes shed from the hem drift up and fade
    const rng = new RNG(88);
    for (let i = 0; i < 70; i++) {
      const t0 = i * 0.1 + rng.range(0, 0.08), age = tt - t0, ox = rng.range(-0.25, 0.25), oy = rng.range(0, 0.5), r = rng.range(1.2, 2.6);
      if (age < 0 || age > 1.9) continue;
      const x = sideGx(t0) + ox - 0.15, q = cam.project([x + age * 0.05, sideH(x) + 0.4 + oy + age * 0.32, SIDE.z + 0.4]);
      drawMote(g, q[0], q[1], r, Math.sin(Math.PI * Math.min(1, age / 1.9)) * 0.9);
    }
    const G = ghostItems(st);
    celLayer(g, cam, G.items, ghostLight(0.5), { seed: drawSeed(lt), lineW: 1.5 });
    ghostGlow(g, cam, G, 1, { r: 0.8 });
    revealDraw(g, (gg, w) => drawPlate(gg, P.near[w], B, cam), { edge: 0.12 });
  };
  SHOTS.push(sh);
})();
