// ---------- SHOT 3: the first ray of sun reaches the weathered face ----------
(function () {
  const sh = { name: 'face-ray', dur: 5.5 };
  let pose, bg, camAt, eyeC, eyes, nrm, dTop, dChin, L0, glintAt;
  sh.build = () => {
    pose = P_KNEEL({ yaw: R_YAW });
    const Mw = evalPose(pose);
    eyeC = jointPos(Mw, 'head', [0, 0.86, 1.3]);
    eyes = [jointPos(Mw, 'head', [0.6, 0.86, 1.32]), jointPos(Mw, 'head', [-0.6, 0.86, 1.32])];
    const top = jointPos(Mw, 'head', [0, 1.7, 0.3]), chin = jointPos(Mw, 'head', [0, -0.1, 1.0]);
    const fwd = V3.norm(M4.xdir(Mw[JIDX.head], [0, 0, 1]));
    const F = [Math.sin(R_YAW), 0, Math.cos(R_YAW)], Lf = [Math.cos(R_YAW), 0, -Math.sin(R_YAW)];
    const C = V3.add(eyeC, V3.add(V3.mul(fwd, 6.0), V3.add(V3.mul(Lf, 2.0), [0, 0.6, 0])));
    const Tg = fitCam(C, 30, [[eyeC, [800, 470]], [top, [860, 180]]], eyeC);
    camAt = (lt) => { const k = easeInOut(clamp(lt / sh.dur)); return new Cam(V3.add(C, V3.mul(V3.sub(eyeC, C), 0.05 * k)), Tg, 30); };
    bg = canopyUpBG(camAt(0), { seed: 3, crownBottom: 0.6 });
    const sun = V3.norm(LIGHT_FOREST.sun);
    nrm = V3.norm(V3.sub([0, 1, 0], V3.mul(sun, sun[1])));
    dTop = V3.dot(top, nrm); dChin = V3.dot(chin, nrm);
    L0 = Object.assign({}, LIGHT_FOREST, { gobo: [0.35, 0.86, 1, 7], shaftDir: nrm, amb: [0.5, 0.55, 0.68], amb2: [0.36, 0.4, 0.54] });
  };
  const T0 = 1.3, T1 = 3.4, WID = 40;
  const edgeK = (lt) => easeInOut(clamp((Math.floor(lt * 12) / 12 - T0) / (T1 - T0)));
  sh.draw = (g, lt) => {
    const cam = camAt(lt);
    bg.draw(g, cam);
    const k = edgeK(lt);
    const e = lerp(dTop + 0.4, dChin - 2.2, k);
    const L = Object.assign({}, L0, { shaft: [e + WID, 0, WID, 0] });
    robotLayer(g, cam, pose, L, { seed: 3, lineW: 1.7, t: lt, moss: 1.35 });
    // the beam itself, warming as it arrives
    const sp = cam.project(V3.add(eyeC, V3.mul(V3.norm(LIGHT_FOREST.sun), 40)));
    const ep = cam.project(eyeC);
    const ang = Math.atan2(ep[1] - sp[1], ep[0] - sp[0]);
    const ba = clamp((lt - T0 + 0.4) / 1.2) * 0.5;
    if (ba > 0) drawBeam(g, sp[0], sp[1], ang, Math.hypot(ep[0] - sp[0], ep[1] - sp[1]) * 1.25, 140, 520, hx('ffe4a8'), ba);
    drawMotes(g, 40, 31, lt, [ep[0] - 500, ep[1] - 420, ep[0] + 420, ep[1] + 300], hx('fff0c8'), 0.25 + ba);
    // glint on the lenses as the light crosses them
    const tg = T0 + (T1 - T0) * 0.78;
    for (let i = 0; i < 2; i++) {
      const q = cam.project(eyes[i]); const u = (lt - tg - i * 0.08) * 12;
      if (u > 0 && u < 7) drawGlint(g, q[0] - 18, q[1] - 16, 70 * Math.sin(Math.min(1, u / 6) * Math.PI) + 10, 0.9);
    }
  };
  SHOTS.push(sh);
})();
