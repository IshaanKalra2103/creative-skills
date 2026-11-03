// ---------- SHOT 2: a small bird lands on the sleeping giant's shoulder ----------
const R_YAW = 0.55;
(function () {
  const sh = { name: 'bird', dur: 6 };
  let Lp, pose, bg, base, camAt, path;
  sh.build = () => {
    pose = P_KNEEL({ yaw: R_YAW });
    const Mw = evalPose(pose);
    Lp = jointPos(Mw, 'shL', [0.45, 1.55, 0.95]);
    const Hd = jointPos(Mw, 'head', [0, 0.8, 0.9]);
    const F = [Math.sin(R_YAW), 0, Math.cos(R_YAW)], Lf = [Math.cos(R_YAW), 0, -Math.sin(R_YAW)];
    const C = V3.add(Lp, V3.add(V3.mul(F, 6.8), V3.add(V3.mul(Lf, 2.2), [0, 1.5, 0])));
    const Tg = fitCam(C, 32, [[Lp, [1120, 560]], [Hd, [560, 470]]], Lp);
    camAt = (lt) => { const k = easeInOut(clamp(lt / sh.dur)); return new Cam(V3.add(C, V3.mul(V3.sub(Tg, C), 0.05 * k)), Tg, 32); };
    base = camAt(0);
    bg = forestBG(base, { seed: 2, sun: [W * 0.85, H * 0.05] });
    const P0 = V3.add(Lp, [6.0, 3.6, -7.5]), P1 = V3.add(Lp, [4.0, 1.2, -2.5]), P2 = V3.add(Lp, [1.4, 0.9, -0.6]), P3 = Lp;
    path = (u) => { const a = 1 - u; return [0, 1, 2].map(i => a * a * a * P0[i] + 3 * a * a * u * P1[i] + 3 * a * u * u * P2[i] + u * u * u * P3[i]); };
  };
  const S = 1.5;
  function birdAt(lt) {
    const f = Math.floor(lt * 24);
    const tA = 0.9, tL = 3.0;
    if (lt < tA) return null;
    const perchYaw = -0.75;
    if (lt < tL) {
      const u = easeOut(clamp((lt - tA) / (tL - tA)), 1.6);
      const p = path(u), q = path(Math.min(1, u + 0.02));
      const d = V3.sub(q, p);
      let yaw = Math.atan2(d[0], d[2]), pitch = Math.atan2(d[1], Math.hypot(d[0], d[2]));
      const flareK = clamp((lt - 2.55) / 0.45);
      // bounding flight: bursts of flaps, then a short tuck
      const cyc = f % 11, flapping = cyc < 7;
      let flap = flapping ? [1.05, 0.4, -0.55, 0.1][f % 4] : 0.1, sweep = flapping ? 0 : 0.85;
      if (flareK > 0) { flap = lerp(flap, [1.3, 1.1, 1.25, 1.0][f % 4], flareK); sweep = 0; pitch = lerp(pitch, 0.85, Math.sin(flareK * Math.PI) * 0.9 + flareK * 0.1); yaw = lerp(yaw, perchYaw, flareK); }
      return { p: V3.add(p, [0, 0.13 * S, 0]), yaw, pitch, flap, sweep, tail: flareK * 0.45, legs: flareK > 0.4 ? 1 : 0, s: S };
    }
    // perched: settle, then little head turns (drawn on twos)
    const tp = Math.floor((lt - tL) * 12) / 12;
    let dip = 0, flap = 0, sweep = 1, pitch = 0, headYaw = 0, headPitch = 0, tail = 0;
    if (tp < 0.25) { const k = tp / 0.25; dip = Math.sin(k * Math.PI) * 0.05; flap = lerp(0.9, 0, k); sweep = k; pitch = lerp(0.3, -0.1, k); tail = lerp(0.4, -0.2, k); }
    else if (tp < 0.45) { const k = (tp - 0.25) / 0.2; pitch = lerp(-0.1, 0, k); tail = lerp(-0.2, 0.05, k); }
    if (tp > 0.9) headYaw = tp < 1.0 ? 0.3 : 0.55;
    if (tp > 1.75) { headYaw = tp < 1.84 ? 0.2 : -0.35; headPitch = tp < 1.84 ? 0.1 : 0.32; }
    if (tp > 2.4) { tail = tp < 2.5 ? -0.3 : tp < 2.58 ? 0.15 : 0; }
    return { p: V3.add(Lp, [0, 0.13 * S - dip, 0]), yaw: perchYaw, pitch, flap, sweep, headYaw, headPitch, tail, legs: 1, s: S };
  }
  sh.draw = (g, lt) => {
    const cam = camAt(lt);
    bg.draw(g, cam, lt);
    const b = birdAt(lt);
    robotLayer(g, cam, pose, Object.assign({}, LIGHT_FOREST, { gobo: [0.16, 0.42, 1, 0] }), { seed: 2, lineW: 1.5, t: lt, moss: 1.35, extra: b ? birdItems(b) : [] });
  };
  SHOTS.push(sh);
})();
