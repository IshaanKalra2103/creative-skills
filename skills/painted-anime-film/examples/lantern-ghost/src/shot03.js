// 3. roots: low medium, static. Between two roots a pool of shadow, darker than the night. It ripples once; a pale mote rises.
(function () {
  const sh = { name: 'roots', dur: 5 };
  sh.base = new Cam([0.35, 1.0, 3.3], [0, 0.5, -1.3], 40);
  sh.cam = () => sh.base;
  const C = HOLLOW.pool;
  sh.build = () => { sh.P = paintHollow(sh.base, { states: [0], seed: 11 }); };
  sh.draw = (g, lt) => {
    const cam = sh.cam(lt), B = sh.base, P = sh.P, tt = onTwos(lt), seed = drawSeed(lt);
    drawHollow(g, P, B, cam, 0);
    const rip = [];
    for (const [t0, dur, off] of [[1.3, 1.8, [0, 0, 0]], [1.55, 1.6, [0.05, 0, 0.02]]]) rip.push([V3.add(C, off), (tt - t0) / dur]);
    drawPool(g, cam, C, HOLLOW.poolR, 3, { ripples: rip, sheen: 0.3 });
    // the mote: a spark rises out of the centre and drifts upward
    if (tt > 2.3) {
      const u = tt - 2.3, y = 0.02 + 0.42 * u + 0.05 * u * u, x = C[0] + 0.1 * Math.sin(u * 1.9) + 0.03 * u, z = C[2] + 0.06 * Math.sin(u * 1.3);
      const q = cam.project([x, y, z]);
      drawMote(g, q[0], q[1], lerp(1.2, 3, smooth(0, 0.8, u)), smooth(0, 0.3, u) * (0.75 + 0.25 * Math.sin(Math.floor(lt * 12) * 2.1)));
    }
    contactShadow(g, cam, HOLLOW.lantern, 0.42, 0, 0.55);
    celLayer(g, cam, lanternItems(HOLLOW.lantern, HOLLOW.lanternYaw, 0, 0), GL_PRE, { seed: 7, sat: 0.3, lineW: 1.5 });
    drawFlowerAt(g, cam, 0, 0, 41);
    drawPlate(g, P.fg[0], B, cam);
  };
  SHOTS.push(sh);
})();
