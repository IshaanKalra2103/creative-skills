// ---------- SHOT 4: a faint light flickers on deep in its chest ----------
const CORE_KEYS = [[0, 0], [20, 0], [21, 0.28], [22, 0.05], [23, 0], [26, 0], [27, 0.5], [28, 0.12], [29, 0], [33, 0], [34, 0.42], [35, 0.75], [36, 0.3], [37, 0.12], [40, 0.12]];
function coreFlicker(f) { // f: frame in shot (24 fps)
  if (f >= 40) { const k = clamp((f - 40) / 34); return lerp(0.15, 0.85, easeInOut(k)) + (k >= 1 ? 0.06 * Math.sin((f - 74) / 24 * TAU * 0.6) : 0); }
  for (let i = CORE_KEYS.length - 1; i >= 0; i--) if (f >= CORE_KEYS[i][0]) return CORE_KEYS[i][1];
  return 0;
}
function drawCoreGlow(g, cam, Mw, e, o = {}) {
  if (e <= 0.01) return;
  const p = cam.project(jointPos(Mw, 'chest', [0, 2.05, 3.0]));
  const r = (o.r || 1.6) * cam.f / p[2];
  glowFx(g, p[0], p[1], r * (1.2 + e), hx('9ff5e0'), 0.55 * e);
  glowFx(g, p[0], p[1], r * 0.45, hx('eafff8'), 0.7 * e);
}
(function () {
  const sh = { name: 'core', dur: 4.5 };
  let pose, Mw, bg, camAt, core;
  sh.build = () => {
    pose = P_KNEEL({ yaw: R_YAW });
    Mw = evalPose(pose);
    core = jointPos(Mw, 'chest', [0, 2.05, 3.0]);
    const eyeC = jointPos(Mw, 'head', [0, 0.86, 1.3]);
    const F = [Math.sin(R_YAW), 0, Math.cos(R_YAW)], Lf = [Math.cos(R_YAW), 0, -Math.sin(R_YAW)];
    const C = V3.add(core, V3.add(V3.mul(F, 7.5), V3.add(V3.mul(Lf, -2.2), [0, -1.4, 0])));
    const Tg = fitCam(C, 30, [[core, [900, 560]], [eyeC, [930, 150]]], core);
    camAt = (lt) => { const k = easeInOut(clamp((lt - 1.4) / 3)); return new Cam(V3.add(C, V3.mul(V3.sub(core, C), 0.07 * k)), Tg, 30); };
    bg = forestBG(camAt(0), { seed: 4, sun: [W * 0.95, H * 0.1] });
  };
  sh.draw = (g, lt) => {
    const cam = camAt(lt), f = Math.floor(lt * 24);
    bg.draw(g, cam, lt);
    const e = coreFlicker(f);
    robotLayer(g, cam, pose, Object.assign({}, LIGHT_FOREST, { gobo: [0.3, 0.62, 1, 4] }), { seed: 4, lineW: 1.6, t: lt, moss: 1.35, mats: { core: e } });
    drawCoreGlow(g, cam, Mw, e);
  };
  SHOTS.push(sh);
})();
