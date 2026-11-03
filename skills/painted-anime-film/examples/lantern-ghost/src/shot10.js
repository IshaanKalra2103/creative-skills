// 10. release: the valley wide again (the grey of shot 2), low, rising push. On our slope the ghost faces the valley,
// spreads its sleeves and comes apart from the hem up into petals and light that pour away across the valley;
// colour runs out from it over the fields and the hill, and the sky warms outward from the sun as it crests the ridge.
(function () {
  const sh = { name: 'release', dur: 6.5 };
  const M = BM;
  sh.base = new Cam([0, 0, 0], [0, -3.2, -100], 30);
  sh.cam = (lt) => { const k = easeInOut(lt / sh.dur); return new Cam([0.2 * k, 1.4 * k, -5 * k], [0.2 * k, -3.2 + 3.0 * k, -100 - 5 * k], 30); };
  const S = 5.5, D = 60; // the ghost is drawn at the fg slope's depth, scaled up to the size it has there
  const REL = 1.45, DONE = 3.25, SUNUP = 2.3;
  const dk = (tt) => smooth(REL, DONE, tt); // how far the dissolve has climbed (0 hem .. 1 past the wick)
  sh.build = () => {
    sh.P = paintValleyWide(sh.base, { states: [0, 1], seed: 202 });
    sh.G0 = sh.base.unproject(300, 812, D);
    sh.SUN = sh.base.unproject((W + 2 * M) * 0.86 - M, (H + 2 * M) * 0.6 - M - 50, 3000);
    // petals: each peels off the body at the cut line and flies to a point out over the valley (a few come at us)
    const rng = new RNG(1010); sh.petals = [];
    for (let i = 0; i < 1100; i++) {
      const near = i < 60, tb = rng.range(REL + 0.05, DONE + 0.1), th = rng.next() * TAU;
      const to = near ? sh.base.unproject(rng.range(900, 1900), rng.range(150, 900), rng.range(10, 26)) : sh.base.unproject(rng.range(450, 2000), rng.range(330, 760), rng.range(110, 420));
      sh.petals.push({ tb, th, yb: rng.range(0, 0.12), to, dur: near ? rng.range(1.4, 2.2) : rng.range(2.4, 4.2), arc: rng.range(2, 12), col: rng.int(0, 4), ph: rng.range(0, TAU), spin: rng.range(4, 9) * (rng.next() < 0.5 ? -1 : 1), wob: rng.range(0, TAU), mote: rng.next() < 0.25, sz: near ? 0.5 : rng.range(1.1, 2.0) });
    }
  };
  sh.state = (tt) => {
    const yaw = 2.3, bob = 0.25 * Math.sin(tt * 1.7);
    const cut = -0.15 + 1.95 * dk(tt); // body units
    const s = { p: [sh.G0[0], sh.G0[1] + bob + keyLerp([[0, 0], [0.7, 0], [1.0, -0.5], [1.45, 0.9], [2.2, 1.2]], tt, easeInOut), sh.G0[2]], s: S, yaw,
      sy: keyLerp([[0, 1], [0.7, 1], [1.0, 0.93], [1.45, 1.08], [1.9, 1.02]], tt, easeInOut),
      armL: keyLerp([[0, 0.15], [0.7, 0.15], [1.0, -0.15], [1.5, 1.3]], tt, easeInOut), armR: keyLerp([[0, 0.15], [0.7, 0.15], [1.0, -0.15], [1.5, 1.3]], tt, easeInOut),
      fwdL: -0.15, fwdR: -0.15, lean: [0, keyLerp([[0, 0], [1.0, 0.1], [1.5, -0.12]], tt, easeInOut)], look: [0, 0.3],
      emit: 1, wick: 1, flut: lerp(1.2, 2.4, smooth(REL, REL + 0.5, tt)), ph: tt * 2.6, night: 0, wickBend: 0.3 };
    if (tt >= REL) { const cy = s.p[1] + cut * S; s.coat = cy + 0.9; s.coatCol = [1.0, 0.86, 0.6]; s.coatEmit = 1; s.coatA = 1; s.coatNoise = 0.9; s.clip = cy; }
    return s;
  };
  sh.draw = (g, lt) => {
    const cam = sh.cam(lt), B = sh.base, P = sh.P, tt = onTwos(lt), st = sh.state(tt);
    const sp = cam.project(sh.SUN), G = ghostItems(st), gq = cam.project(G.chest);
    // the sky first: it warms outward from where the sun comes up
    revealMatte(cam, (hit, sx, sy) => SUNUP + Math.hypot(sx - sp[0], (sy - sp[1]) * 1.3) / 950 + 0.15 * (rvNoise(sx * 0.03, sy * 0.03, 1) - 0.5) * 2, tt, { soft: 0.5, band: 0.8 });
    revealDraw(g, (gg, w) => {
      drawPlate(gg, P.sky[w], B, cam);
      if (w) { const y = sp[1] + lerp(70, -190, easeOut(smooth(SUNUP - 0.5, sh.dur - 0.3, tt)));
        glowFx(gg, sp[0], y, 520, [1, 0.82, 0.58], 0.55, 'screen'); glowFx(gg, sp[0], y, 160, [1, 0.94, 0.8], 0.8, 'screen');
        gg.save(); gg.fillStyle = css(hx('fff8ea')); gg.beginPath(); gg.arc(sp[0], y, 26, 0, TAU); gg.fill(); gg.restore(); sh.sunY = y; }
      drawPlate(gg, P.far[w], B, cam);
    }, { edge: 0.15 });
    // the land: colour runs out from the ghost, mostly sideways across the valley
    revealMatte(cam, (hit, sx, sy) => REL + 0.15 + Math.hypot(sx - gq[0], (sy - gq[1]) * 2.2) / 760 + 0.16 * (rvNoise(sx * 0.03, sy * 0.03, 1) - 0.5) * 2, tt, { soft: 0.22, band: 0.6 });
    revealDraw(g, (gg, w) => { drawPlate(gg, P.valley[w], B, cam); }, { edge: 0.3 });
    const wake = smooth(REL, DONE + 1, tt), rng = new RNG(77);
    for (let i = 0; i < 26; i++) { // valley mist burns off as the light comes
      const x = (rng.range(300, W + 300) + lt * rng.range(4, 10)) % (W + 600) - 300, y = rng.range(630, 700);
      dab(g, 'soft', rng.int(0, 1), x, y, rng.range(240, 460), rng.range(18, 36), 0, mixc(PALS[0].mist, PALS[1].mist, wake), rng.range(0.1, 0.22) * (1 - 0.6 * wake));
    }
    resetG(g);
    revealDraw(g, (gg, w) => { drawPlate(gg, P.hill[w], B, cam); }, { edge: 0.3 });
    // the ghost: cut away from the hem up, a band of light riding the cut
    const L = ghostLight(0.4 + 0.6 * wake);
    if (dk(tt) < 1) {
      celLayer(g, cam, G.items, L, { seed: drawSeed(lt), lineW: 1.8, clipY: st.clip, clipN: st.clip != null ? 0.9 : 0 });
      ghostGlow(g, cam, G, 1 + 0.8 * smooth(REL - 0.3, REL + 0.3, tt) * (1 - dk(tt)), { r: 1.1 });
    }
    revealDraw(g, (gg, w) => { drawPlate(gg, P.fg[w], B, cam); }, { edge: 0.2 });
    // the wick goes last: a small flame that slips free and drifts up and away, curling
    if (tt > DONE - 0.35 && tt < DONE + 1.4) {
      const u = (tt - (DONE - 0.35)) / 1.75, c0 = G.crown, p = cam.project([c0[0] + 9 * u, c0[1] + 6 * u + 3 * Math.sin(u * 3), c0[2] - 20 * u]);
      drawWickFlame(g, p[0], p[1], lerp(1.6, 0.5, u), 0.4 + 0.3 * Math.sin(tt * 3), Math.floor(lt * 12), 1 - smooth(0.7, 1, u));
    }
    // petals and light pouring out across the valley
    for (const pt of sh.petals) {
      const u = (tt - pt.tb) / pt.dur; if (u <= 0 || u >= 1) continue;
      const cutY = sh.G0[1] + (-0.15 + 1.95 * dk(pt.tb) + pt.yb) * S;
      const b = [sh.G0[0] + Math.cos(pt.th) * 0.3 * S, cutY, sh.G0[2] + Math.sin(pt.th) * 0.3 * S], e = 1 - Math.pow(1 - u, 2.2);
      const w = [lerp(b[0], pt.to[0], e) + 0.8 * Math.sin(tt * 2.2 + pt.wob) * u, lerp(b[1], pt.to[1], e) + pt.arc * Math.sin(Math.PI * u), lerp(b[2], pt.to[2], e)];
      const q = cam.project(w); if (q[2] < 1) continue;
      const a = smooth(0, 0.06, u) * (1 - smooth(0.72, 1, u)), sz = clamp(pt.sz * cam.f / q[2], 4, 110);
      if (pt.mote) { // a mote with a short light trail behind it
        const u0 = Math.max(0, u - 0.022), e0 = 1 - Math.pow(1 - u0, 2.2), w0 = [lerp(b[0], pt.to[0], e0), lerp(b[1], pt.to[1], e0) + pt.arc * Math.sin(Math.PI * u0), lerp(b[2], pt.to[2], e0)], q0 = cam.project(w0);
        if (q0[2] > 1) { g.save(); g.globalCompositeOperation = 'screen'; g.strokeStyle = css([1, 0.9, 0.66], 0.18 * a); g.lineWidth = clamp(sz * 0.12, 1, 3); g.lineCap = 'round'; g.beginPath(); g.moveTo(q0[0], q0[1]); g.lineTo(q[0], q[1]); g.stroke(); g.restore(); }
        drawMote(g, q[0], q[1], clamp(sz * 0.16, 1.5, 5), a); }
      else drawPetal(g, q[0], q[1], sz, pt.ph + tt * pt.spin, pt.col, pt.wob + tt * 0.8, a);
    }
    // once the sun is up its light lies over everything
    const sun = smooth(SUNUP + 0.3, sh.dur, tt);
    if (sun > 0) glowFx(g, sp[0], sh.sunY ?? sp[1], 1200, [1, 0.86, 0.62], 0.32 * sun, 'screen');
  };
  SHOTS.push(sh);
})();
