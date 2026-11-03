// 2. valley: extreme wide. The great tree on its hill above a sleeping village, all grey; mist in the valley. Slow push.
(function () {
  const M = BM;
  const sh = { name: 'valley', dur: 6.5 };
  sh.base = new Cam([0, 0, 0], [0, -3.2, -100], 30);
  sh.cam = (lt) => { const k = easeInOut(lt / sh.dur); return new Cam([0.6 * k, -0.15 * k, -7 * k], [0.6 * k, -3.2 - 0.15 * k, -100 - 7 * k], 30); };
  sh.build = () => { sh.P = paintValleyWide(sh.base, { states: [0], seed: 202 }); };
  sh.draw = (g, lt) => {
    const cam = sh.cam(lt), B = sh.base, P = sh.P, tt = onTwos(lt);
    for (const k of ['sky', 'far', 'valley']) drawPlate(g, P[k][0], B, cam);
    // valley mist drifting (atmosphere, on ones), in front of the village, behind the hill
    const rng = new RNG(77);
    for (let i = 0; i < 26; i++) {
      const x = (rng.range(300, W + 300) + lt * rng.range(4, 10)) % (W + 600) - 300, y = rng.range(630, 700);
      dab(g, 'soft', rng.int(0, 1), x, y, rng.range(240, 460), rng.range(18, 36), 0, PALS[0].mist, rng.range(0.1, 0.22));
    }
    resetG(g);
    // one thread of chimney smoke: a sleeping village
    { const s = P.smoke[0]; const p = cam.project(B.unproject(s[0] - M, s[1] - M, 380)); const pts = [];
      for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push([p[0] + Math.sin(u * 5 + tt * 1.4) * 4 * u + u * 30, p[1] - u * 70]); }
      taper(g, pts, pts.map((_, i) => lerp(2.5, 6, i / 20)), mixc(PALS[0].mist, PALS[0].skyLow, 0.5), 0.35); resetG(g); }
    drawPlate(g, P.hill[0], B, cam);
    drawPlate(g, P.fg[0], B, cam);
  };
  SHOTS.push(sh);
})();
