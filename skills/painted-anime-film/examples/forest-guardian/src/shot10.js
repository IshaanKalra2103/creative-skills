// ---------- SHOT 10a: close and low on the knee print; one leaf settles into it ----------
(function () {
  const sh = { name: 'hollow', dur: 3.9 };
  let bg, C, Tg, kp, Ry, gpl, grass, leaves, hero, clods;
  const X = (v) => M4.xform(Ry, v);
  sh.build = () => {
    buildLeaves();
    Ry = M4.rotY(R_YAW);
    kp = X([-1.79, 0, 1.8]);
    C = V3.add(kp, X([3.0, 1.25, 6.8])); Tg = V3.add(kp, [0, 0.9, 0]);
    Tg = fitCam(C, 34, [[kp, [W * 0.46, H * 0.7]]], Tg);
    bg = forestBG(new Cam(C, Tg, 34), { seed: 11, sun: [W * 0.78, H * 0.08] });
    gpl = clearView(baseGrowth(77).filter(p => p.world && Math.hypot(p.world[0], p.world[2] - 0.6) > 3.4), C, kp, 2.4);
    const rng = new RNG(1012);
    grass = [];
    for (let i = 0; i < 90; i++) { const a = rng.next() * TAU, d = rng.range(0.1, 1.2); grass.push({ a, d, l: rng.range(0.15, 0.4), c: rng.pick([hx('b3ad72'), hx('9c9a5e'), hx('c4b980'), hx('7f8650')]) }); }
    clods = [];
    for (let i = 0; i < 14; i++) { const a = rng.next() * TAU, d = rng.range(1.5, 2.6); clods.push({ p: [kp[0] + Math.cos(a) * d, 0.04, kp[2] + Math.sin(a) * d * 0.9], r: rng.range(0.03, 0.09), seed: rng.int(1, 1e6), c: rng.pick([hx('5a4834'), hx('4a3b2c'), hx('6e5a40')]) }); }
    leaves = makeLeaves(50, [kp[0] - 14, kp[0] + 10, 1, 12, kp[2] - 18, kp[2] + 2], rng, { vy: 0.7, amp: 1.3, t0: 3 });
    for (const L of leaves) L.w *= 0.7;
    hero = { ph: 1.3, w: 1.8, amp: 0, vy: 0, drift: [0, 0], r0: 0.4, col: 3, size: 1.0, p: [0, 0, 0] };
    sh.heroL = Object.assign({}, hero, { w: 0, ph: 0.1, r0: 0.55 }); // lying face-up
  };
  const ring = (g, cam, c, r, col, seed, a = 1, rough = 0.2, sq = 0.9) => {
    const rng = new RNG(seed); g.save(); g.globalAlpha = a; g.fillStyle = css(col); g.beginPath();
    for (let i = 0; i <= 28; i++) { const an = i / 28 * TAU, rr = r * (1 - rough + rough * 2 * rng.next()), q = cam.project([c[0] + Math.cos(an) * rr, 0.02, c[2] + Math.sin(an) * rr * sq]); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }
    g.closePath(); g.fill(); g.restore();
  };
  sh.draw = (g, lt) => {
    const k = easeInOut(clamp(lt / sh.dur));
    const cam = new Cam(V3.add(C, V3.mul(V3.sub(Tg, C), 0.06 * k)), Tg, 34);
    bg.draw(g, cam, lt + 20);
    // grass combed flat around the print, then the hollow: lit lip, dark wet soil, roots
    g.save(); g.lineCap = 'round';
    for (const b of grass) { const c = kp, q0 = cam.project([c[0] + Math.cos(b.a) * (b.d + 1.6), 0.03, c[2] + Math.sin(b.a) * (b.d + 1.6) * 0.9]), q1 = cam.project([c[0] + Math.cos(b.a) * (b.d + 1.6 + b.l), 0.03, c[2] + Math.sin(b.a) * (b.d + 1.6 + b.l) * 0.9]); if (q0[2] < 1) continue;
      g.strokeStyle = css(b.c); g.globalAlpha = 0.45; g.lineWidth = Math.max(1, 0.025 * cam.f / q0[2]); g.beginPath(); g.moveTo(q0[0], q0[1]); g.lineTo(q1[0], q1[1]); g.stroke(); }
    g.restore();
    ring(g, cam, V3.add(kp, [0, 0, -0.15]), 1.75, hx('8f7a5a'), 12, 1, 0.16);
    ring(g, cam, V3.add(kp, [0, 0, -0.1]), 1.55, hx('6b5840'), 13, 1, 0.16);
    ring(g, cam, kp, 1.35, hx('3b3127'), 8, 1, 0.14);
    ring(g, cam, V3.add(kp, [0.15, 0, 0.25]), 0.9, hx('2c241d'), 14, 1, 0.2);
    // pale lip catching the sun on the far rim
    { const rng = new RNG(15); g.save(); g.strokeStyle = css(hx('c9b08a')); g.lineCap = 'round'; g.lineWidth = 3; g.beginPath();
      for (let i = 0; i <= 14; i++) { const an = Math.PI * (1.08 + 0.84 * i / 14), rr = 1.42 * (0.92 + 0.12 * rng.next()), q = cam.project([kp[0] + Math.cos(an) * rr, 0.03, kp[2] + Math.sin(an) * rr * 0.9]); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }
      g.stroke(); g.restore(); }
    for (const c of clods) { const q = cam.project(c.p); if (q[2] < 1) continue; const rr = c.r * cam.f / q[2];
      g.fillStyle = css(c.c); g.beginPath(); for (let k = 0; k < 6; k++) { const an = k / 6 * TAU + c.seed, rk = rr * (0.6 + 0.5 * Math.abs(Math.sin(c.seed * 0.37 + k * 1.9))); const x = q[0] + Math.cos(an) * rk, y = q[1] + Math.sin(an) * rk * 0.55; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.fill();
      g.fillStyle = css(hx('241c15'), 0.5); g.beginPath(); g.ellipse(q[0] + rr * 0.2, q[1] + rr * 0.35, rr * 0.9, rr * 0.25, 0, 0, TAU); g.fill(); }
    const it = growthPlace(gpl, cam, null, { t: lt }).sort((a, b) => b.sp[2] - a.sp[2]);
    growthDraw(g, it, LIGHT_FOREST);
    // sunbeam on the empty spot
    { const q = cam.project(kp); drawBeam(g, q[0] + 420, -60, Math.atan2(q[1] + 60, -420), Math.hypot(420, q[1] + 60) + 120, 50, 320, hx('ffe8b4'), 0.26); }
    drawLeavesWorld(g, leaves, cam, lt + 3, { size: 0.18, fog: 0.02 });
    // the hero leaf: spirals down, lands, rocks once and lies still
    { const T0 = 0.0, T1 = 2.7, tq = Math.floor(lt * 12) / 12, u = clamp((tq - T0) / (T1 - T0));
      const e = 1 - Math.pow(1 - u, 1.5), r = 1.6 * (1 - e) + 0.02, an = u * 8 + 0.8;
      const P = [kp[0] + 0.2 + Math.cos(an) * r, 0.08 + 4.6 * (1 - e) * (1 - e * 0.2), kp[2] + 0.2 + Math.sin(an) * r * 0.8];
      const q = cam.project(P), size = 0.36 * hero.size * cam.f / q[2] * 2.4;
      const land = clamp((tq - T1 + 0.25) / 0.25), rock = tq > T1 ? Math.sin((tq - T1) * 9) * Math.exp(-(tq - T1) * 3) * 0.25 : 0;
      g.save(); g.translate(q[0], q[1]); g.rotate(rock); g.scale(1, 1 - 0.55 * land);
      drawLeaf(g, land > 0 ? sh.heroL : hero, 0, 0, size, Math.min(tq, T1));
      g.restore();
      if (tq > T1) { g.save(); g.globalAlpha = 0.35 * Math.exp(-(tq - T1) * 2); g.fillStyle = css(hx('1d1813')); g.beginPath(); g.ellipse(q[0] + 4, q[1] + 6, size * 0.45, size * 0.12, 0, 0, TAU); g.fill(); g.restore(); }
    }
    drawMotes(g, 40, 1003, lt, [W * 0.35, 0, W, H * 0.8], hx('fff0c8'), 0.5);
  };
  SHOTS.push(sh);
})();
// ---------- SHOT 10: the clearing again, empty; leaves spiral down through the sunbeams ----------
(function () {
  const sh = { name: 'after', dur: 6.2, fadeOut: 3.0 };
  let S1, leaves, near, Ry, wisps, gpl, grass, hero;
  const blob = (g, cam, c, r, col, seed, a = 1, rough = 0.25) => {
    const rng = new RNG(seed); g.save(); g.globalAlpha = a; g.fillStyle = css(col); g.beginPath();
    for (let i = 0; i <= 24; i++) { const an = i / 24 * TAU, rr = r * (1 - rough + rough * 2 * rng.next()), q = cam.project([c[0] + Math.cos(an) * rr, 0.02, c[2] + Math.sin(an) * rr * 0.9]); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }
    g.closePath(); g.fill(); g.restore();
  };
  sh.build = () => {
    buildLeaves();
    S1 = SHOTS.find(s => s.name === 'forest');
    Ry = M4.rotY(R_YAW);
    const rng = new RNG(1010);
    leaves = makeLeaves(150, [-26, 22, 3, 24, -18, 24], rng, { vy: 0.75, amp: 1.5, t0: 3, cols: [0, 0, 1, 2, 2, 3] });
    near = makeLeaves(14, [-4, 9, 4, 12, 28, 35], rng, { vy: 0.6, amp: 1.2, t0: 5 });
    for (const L of leaves.concat(near)) L.w *= 0.7;
    gpl = baseGrowth(77).filter(p => p.world && Math.hypot(p.world[0], p.world[2] - 0.6) > 3.8);
    grass = [];
    for (let i = 0; i < 220; i++) { const a = rng.next() * TAU, d = rng.range(2.6, 8.5); grass.push({ a, d, l: rng.range(0.5, 1.3) * (1.4 - d / 9), c: rng.pick([hx('b3ad72'), hx('9c9a5e'), hx('c4b980'), hx('7f8650')]) }); }
    hero = { ph: 1.3, w: 2.2, amp: 0, vy: 0, drift: [0, 0], r0: 0.4, col: 2, size: 1.3, p: [0, 0, 0] };
    wisps = [[-0.4, -2.6], [0.9, -3.3], [-1.6, -1.8], [1.9, 1.6]].map(([x, z], i) => ({ p: M4.xform(Ry, [x, 0, z]), seed: 33 + i }));
  };
  sh.draw = (g, lt) => {
    const k = easeInOut(clamp(lt / sh.dur));
    const cam = new Cam([lerp(4.8, 4.3, k), lerp(3.0, 2.9, k), lerp(40, 36.5, k)], [lerp(-0.8, -0.9, k), lerp(6.7, 6.2, k), 0], 38), B = S1.base, P = S1.P;
    const drift = (lt + 12) * 6;
    drawPlate(g, P.haze, B, cam); drawPlate(g, P.row1, B, cam); drawPlate(g, P.row2, B, cam);
    drawPlate(g, P.mistBack, B, cam, { dx: drift * 0.5, alpha: 0.9 });
    drawPlate(g, P.row3, B, cam); drawPlate(g, P.ground, B, cam);
    // where it knelt: a bare scorched hollow, the knee and foot prints, flattened grass around it
    const X = (v) => M4.xform(Ry, v);
    blob(g, cam, X([0.2, 0, -0.2]), 7.5, hx('6f7448'), 5, 0.55, 0.18);
    blob(g, cam, X([0.1, 0, -2.6]), 3.6, hx('4a3a2c'), 6, 0.85, 0.3);
    blob(g, cam, X([0.1, 0, -2.6]), 2.0, hx('2f251d'), 7, 0.8, 0.35);
    // flattened grass, combed outward by the blast
    { const c = X([0.1, 0, -0.6]); g.save(); g.lineCap = 'round';
      for (const b of grass) { const q0 = cam.project([c[0] + Math.cos(b.a) * b.d, 0.03, c[2] + Math.sin(b.a) * b.d]), q1 = cam.project([c[0] + Math.cos(b.a) * (b.d + b.l), 0.03, c[2] + Math.sin(b.a) * (b.d + b.l)]);
        g.strokeStyle = css(b.c); g.globalAlpha = 0.7; g.lineWidth = Math.max(1, 0.09 * cam.f / q0[2]); g.beginPath(); g.moveTo(q0[0], q0[1]); g.lineTo(q1[0], q1[1]); g.stroke(); }
      g.restore(); }
    blob(g, cam, X([-1.79, 0, 1.5]), 1.6, hx('8f7a5a'), 12, 0.9);
    blob(g, cam, X([-1.79, 0, 1.8]), 1.35, hx('3b3127'), 8, 0.95);
    blob(g, cam, X([-1.6, 0, 1.55]), 0.8, hx('5a4936'), 9, 0.9);
    blob(g, cam, X([2.15, 0, 3.0]), 1.0, hx('3f3328'), 10, 0.9, 0.2);
    blob(g, cam, X([-1.9, 0, -0.9]), 1.0, hx('3f3328'), 11, 0.9, 0.2);
    // thin smoke still curling up from the scorch
    g.save(); g.lineCap = 'round'; g.filter = 'blur(2px)';
    for (const w of wisps) {
      const r2 = new RNG(w.seed), tq = Math.floor(lt * 12) / 12;
      g.beginPath();
      for (let i = 0; i <= 20; i++) { const h = i * 0.6, sway = Math.sin(h * 0.5 - tq * 1.3 + w.seed) * (0.15 + h * 0.08) + h * 0.12, q = cam.project([w.p[0] + sway, h, w.p[2] + sway * 0.4]); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }
      g.strokeStyle = css(hx('f1e6d4')); g.globalAlpha = 0.28 * (1 - k * 0.6); g.lineWidth = 5 + r2.range(0, 4); g.stroke();
    }
    g.restore();
    // the ferns that grew around it, with the gap where it was
    { const it = growthPlace(gpl, cam, null, { t: lt }).sort((a, b) => b.sp[2] - a.sp[2]); growthDraw(g, it, LIGHT_FOREST); }
    drawPlate(g, P.mistLow, B, cam, { dx: -drift, alpha: 0.85 });
    // the sunbeams breathe a little brighter now the canopy is open
    drawPlate(g, P.shafts, B, cam, { comp: 'screen', alpha: 0.75 + 0.1 * Math.sin(lt * 0.9) });
    // a shaft of sun reaching the empty spot
    { const q = cam.project(X([-0.6, 0, 0.6])); drawBeam(g, q[0] + 330, -40, Math.atan2(q[1] + 40, -330), Math.hypot(330, q[1] + 40) + 60, 40, 230, hx('ffe8b4'), 0.22 * clamp(lt / 1.5)); }
    drawLeavesWorld(g, leaves, cam, lt + 3, { size: 0.2, fog: 0.012 });
    drawMotes(g, 50, 1001, lt, [W * 0.3, 0, W * 0.95, H * 0.85], hx('fff0c8'), 0.45);
    drawPlate(g, P.near, B, cam);
    drawPlate(g, P.fg, B, cam);
    drawLeavesWorld(g, near, cam, lt + 5, { size: 0.2 });
  };
  SHOTS.push(sh);
})();
