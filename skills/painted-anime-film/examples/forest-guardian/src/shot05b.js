// ---------- SHOT 5b: birds burst from the treetops ----------
(function () {
  const sh = { name: 'birds-burst', dur: 3.2 };
  let bg, cam, birds, leaves;
  const TB = 0.3;
  sh.build = () => {
    buildLeaves();
    const C = [7.5, 1.5, 34], Tg0 = [-2, 13, -20];
    cam = new Cam(C, Tg0, 42);
    bg = forestBG(cam, { seed: 7, sun: [W * 0.9, -80] });
    bg.midTop = 230;
    sh.cam = cam;
    const rng = new RNG(61); birds = [];
    for (let i = 0; i < 74; i++) {
      const x = rng.range(80, W - 80), y = bg.midTop + rng.range(-60, 160);
      const a = -Math.PI / 2 + rng.range(-0.9, 0.9) + (x - W / 2) / W * 0.6;
      birds.push({ x, y, a, v: rng.range(200, 420), acc: rng.range(120, 380), t0: TB + Math.pow(rng.next(), 1.8) * 0.9 + Math.abs(x - W * 0.45) / W * 0.3, s: rng.range(12, 26), ph: rng.next() * 4, turn: rng.range(-0.45, 0.45) });
    }
    for (let i = 0; i < 4; i++) birds.push({ x: W * (0.2 + i * 0.22), y: H + 70, a: -Math.PI / 2 + 0.3 - i * 0.18, v: 820, acc: 250, t0: TB + 0.45 + i * 0.16, s: 52 - i * 5, ph: i, turn: 0.12, near: true });
    leaves = [];
    for (let i = 0; i < 40; i++) leaves.push({ x: rng.range(0, W), y: bg.midTop + rng.range(-20, 160), p: [0, 0, 0], drift: [0, 0], ph: rng.next() * TAU, w: rng.range(1.8, 3.4), amp: 1, vy: rng.range(40, 90), r0: rng.range(-1, 1), col: rng.pick([0, 0, 1, 2, 3]), size: rng.range(12, 22), t0: TB + rng.range(0, 1.2) });
    for (let i = 0; i < 16; i++) leaves.push({ x: rng.range(0, W), y: rng.range(-60, H * 0.5), p: [0, 0, 0], drift: [0, 0], ph: rng.next() * TAU, w: rng.range(1.6, 2.6), amp: 1, vy: rng.range(110, 190), r0: rng.range(-1, 1), col: rng.pick([0, 1, 2, 3, 4]), size: rng.range(30, 46), t0: TB + rng.range(0.1, 1.3) });
  };
  sh.draw = (g, lt) => {
    const f = Math.floor(lt * 24), rng = new RNG(700 + f);
    const A = lt > TB - 0.05 ? 7 * Math.exp(-(lt - TB) * 1.6) : 0;
    const shk = { near: [rng.range(-A, A), rng.range(-A, A) * 0.6], mid: [rng.range(-A, A) * 0.4, rng.range(-A, A) * 0.3] };
    const sc = new Cam(V3.add(cam.pos, [rng.range(-1, 1) * A * 0.03, rng.range(-1, 1) * A * 0.03, 0]), cam.tgt, cam.fov ?? 42);
    bg.draw(g, sc, lt);
    if (!sh.gplants) { sh.gplants = baseGrowth(77); sh.pose = P_KNEEL({ yaw: R_YAW }); }
    robotLayer(g, sc, sh.pose, LIGHT_FOREST, { seed: 7, lineW: 1.2, t: lt, moss: 1.35, gplants: sh.gplants, extra: handRockItems(), mats: { core: 0.85 } });
    drawCoreGlow(g, sc, evalPose(sh.pose), 0.85);
    // leaves shaken loose (screen space, drawings on twos)
    for (const L of leaves) {
      const t = Math.floor((lt - L.t0) * 12) / 12; if (t < 0) continue;
      drawLeaf(g, L, L.x + Math.sin(L.ph + t * L.w) * 30, L.y + t * L.vy + t * t * 14, L.size, t, 0.95);
    }
    const flock = (near) => { for (const b of birds) { if (!!b.near !== near) continue;
      const t = lt - b.t0; if (t < 0) continue;
      const d = b.v * t + 0.5 * b.acc * t * t, a = b.a + b.turn * t;
      const x = b.x + Math.cos(a) * d, y = b.y + Math.sin(a) * d;
      if (x < -80 || x > W + 80 || y < -80 || y > H + 80) continue;
      const s = b.s * (1 - 0.35 * clamp(t / 2.5)) * (t < 0.08 ? 0.75 : 1);
      drawFlockBird(g, x, y, s, t * 16 + b.ph, b.near ? hx('2e2a29') : hx('4a4542'), Math.cos(a) * 0.25);
    } };
    flock(false);
    flock(true);
  };
  SHOTS.push(sh);
})();
