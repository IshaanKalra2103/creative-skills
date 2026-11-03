// ---------- SHOT 6: the rise (wide, low, locked-off with a slow follow tilt) ----------
(function () {
  const sh = { name: 'rise', dur: 9.5 };
  let bg, C0, T0, T1, clods, leaves, puffs, grains, Ry;
  const W2 = (v) => M4.xform(Ry, v);
  const kneePrintT = 3.3;
  function camAt(lt) {
    const k = smooth(3.0, 8.6, lt);
    const tg = V3.lerp(T0, T1, k * k * (3 - 2 * k) * 0.5 + k * 0.5);
    // the ground thumps: shake on ones, decaying
    const f = Math.floor(lt * 24), rng = new RNG(7700 + f);
    let A = 0;
    for (const [t0, a, d] of [[3.15, 0.05, 0.6], [6.15, 0.11, 0.7], [7.45, 0.04, 0.5]]) if (lt > t0) A += a * Math.exp(-(lt - t0) / d * 3) ;
    if (lt > 2.4 && lt < 6.4) A += 0.012;
    return new Cam(V3.add(C0, [rng.range(-A, A), rng.range(-A, A), rng.range(-A, A)]), tg, 40, rng.range(-A, A) * 0.05);
  }
  sh.build = () => {
    buildLeaves();
    Ry = M4.rotY(R_YAW);
    C0 = W2([-20.1, 1.35, 19.1]); T0 = W2([0.2, 7.6, 0.8]); T1 = W2([0.2, 8.9, 0.8]);
    const mid = new Cam(C0, V3.lerp(T0, T1, 0.5), 40);
    bg = forestBG(mid, { seed: 9, sun: [W * 0.02, -60] });
    const rng = new RNG(606);
    // soil clods shed from the right shin and knee as it peels off the ground
    clods = [];
    for (let i = 0; i < 46; i++) {
      const tr = rng.range(2.9, 4.6), u = rng.next();
      clods.push({ tr, u, side: rng.range(-0.55, 0.55), v: [rng.range(-0.8, 0.8), rng.range(-0.2, 0.9), rng.range(-0.8, 0.8)], r: rng.range(0.07, 0.2) * (rng.next() < 0.15 ? 1.9 : 1), seed: rng.int(1, 1e6), grass: rng.next() < 0.35 });
    }
    // leaves pouring off shoulders, arms and head as it moves
    leaves = [];
    const srcs = [['shL', [0, 1.2, 0]], ['shR', [0, 1.2, 0]], ['chest', [0, 3.6, -0.5]], ['head', [0, 1.4, 0]], ['elL', [0, 0.4, 0]], ['elR', [0, 0.4, 0]], ['waist', [0, 0.6, -1.0]]];
    for (let i = 0; i < 120; i++) {
      const [j, off] = rng.pick(srcs), tr = 2.6 + Math.pow(rng.next(), 0.8) * 5.4;
      leaves.push({ j, off: V3.add(off, [rng.range(-1.1, 1.1), rng.range(-0.3, 0.3), rng.range(-0.9, 0.9)]), tr, ph: rng.next() * TAU, w: rng.range(1.8, 3.4), amp: rng.range(0.4, 1.2), vy: rng.range(0.9, 1.7), drift: [rng.range(-0.5, 0.2), rng.range(-0.3, 0.3)], r0: rng.range(-1, 1), col: rng.pick([0, 0, 1, 2, 2, 3, 4]), size: rng.range(0.8, 1.4) });
    }
    // fine soil and seed streams spilling off ledges
    grains = [];
    for (let i = 0; i < 260; i++) {
      const [j, off] = rng.pick([['shL', [rng.range(-1.2, 1.2), 0.9, rng.range(-0.8, 0.8)]], ['shR', [rng.range(-1.2, 1.2), 0.9, rng.range(-0.8, 0.8)]], ['chest', [rng.range(-2, 2), 3.3, rng.range(-1, 0)]], ['knR', [rng.range(-0.6, 0.6), -0.4, rng.range(-0.4, 0.4)]], ['hipR', [0, -1.2, 0.6]]]);
      grains.push({ j, off, tr: rng.range(3.0, 7.2), v: [rng.range(-0.4, 0.4), rng.range(-0.3, 0.2), rng.range(-0.4, 0.4)], seed: rng.next() });
    }
    // dust: [t0, joint, off, r, life]
    puffs = [[3.15, 'knR', [0, -0.9, 0.3], 1.4, 1.8], [3.25, 'knR', [0.8, -0.9, -0.4], 1.0, 1.5], [3.4, 'anR', [0, -0.6, 1.6], 0.9, 1.4], [4.4, 'anR', [0, -0.7, 1.2], 0.8, 1.3],
      [6.15, 'anR', [0, -0.85, 0.9], 1.5, 1.7], [6.2, 'anR', [-1.0, -0.85, 0.2], 1.2, 1.5], [6.22, 'anR', [1.0, -0.85, 1.4], 1.1, 1.5], [4.9, 'anL', [0.9, -0.85, 1.2], 0.8, 1.4]];
    sh.gplants = clearView(baseGrowth(77), C0, W2([0, 2, 1]), 3.5);
    sh.cam = mid;
  };
  // pose at a given time (and where joints were then)
  const poseCache = new Map();
  function poseAt(t) {
    const k = Math.round(Math.max(0, t) * 12);
    if (!poseCache.has(k)) { if (poseCache.size > 400) poseCache.clear(); const p = P_RISE(k / 12); poseCache.set(k, { p, Mw: evalPose(p) }); }
    return poseCache.get(k);
  }
  const jointAt = (t, j, off) => jointPos(poseAt(t).Mw, j, off);
  sh.draw = (g, lt) => {
    const cam = camAt(lt);
    bg.draw(g, cam, lt);
    const tq = Math.floor(lt * 12) / 12;
    // the hollow where the knee rested for so long
    if (tq > kneePrintT - 0.1) {
      const kp = V3.add(jointAt(kneePrintT - 0.4, 'knR'), [0, 0, 0]); kp[1] = 0.02;
      const a = cam.project(kp), s = cam.f / a[2];
      g.save(); g.globalAlpha = clamp((tq - kneePrintT + 0.1) / 0.4);
      g.translate(a[0], a[1]); g.scale(1, 0.32);
      const rng = new RNG(31);
      g.fillStyle = css(hx('3b3127')); g.beginPath(); for (let i = 0; i <= 18; i++) { const an = i / 18 * TAU, r = 1.35 * s * (0.85 + 0.25 * rng.next()); i ? g.lineTo(Math.cos(an) * r, Math.sin(an) * r) : g.moveTo(Math.cos(an) * r, Math.sin(an) * r); } g.fill();
      g.fillStyle = css(hx('5a4936')); g.beginPath(); g.ellipse(-0.25 * s, -0.3 * s, 1.0 * s, 0.75 * s, 0, 0, TAU); g.fill();
      g.restore();
    }
    const L = Object.assign({}, LIGHT_FOREST, { gobo: [0.28, 0.6, 1, 9] });
    const { p } = poseAt(lt);
    robotLayer(g, cam, p, L, { seed: 6 + Math.floor(lt * 12) % 2, lineW: 1.25, t: lt, moss: 1.35, gplants: sh.gplants, extra: handRockItems(), mats: { core: 0.85 },
      fall: { t0: 2.7, spread: 4.2, poseAt: (t) => poseAt(t).p, key: 'rise' } });
    const front = (q, slack = 0.3) => q[2] > 0.5 && glProbe(q[0], q[1])[0] > q[2] - slack;
    // falling clods (on twos)
    const items = [];
    for (const c of clods) {
      const dt = tq - c.tr; if (dt < 0 || dt > 2.2) continue;
      const a = jointAt(c.tr, 'knR'), b = jointAt(c.tr, 'anR');
      const p0 = V3.add(V3.lerp(a, b, c.u), W2([c.side, -0.7, 0.2]));
      let y = p0[1] + c.v[1] * dt - 4.9 * dt * dt; if (y < c.r) y = c.r;
      const P = [p0[0] + c.v[0] * dt, y, p0[2] + c.v[2] * dt];
      items.push([cam.project(P), c, y <= c.r]);
    }
    items.sort((a, b) => b[0][2] - a[0][2]);
    for (const [q, c, landed] of items) if (front(q, 0.6)) {
      const r = c.r * cam.f / q[2];
      drawClod(g, q[0], q[1], r, c.seed, c.grass, landed);
    }
    // soil grains: short streaks on ones
    g.save(); g.lineCap = 'round';
    for (const gr of grains) {
      const dt = lt - gr.tr; if (dt < 0 || dt > 1.6) continue;
      const p0 = jointAt(gr.tr, gr.j, gr.off);
      const y = p0[1] - 4.9 * dt * dt; if (y < 0.05) continue;
      const P = [p0[0] + gr.v[0] * dt, y, p0[2] + gr.v[2] * dt];
      const q = cam.project(P); if (!front(q, 0.5)) continue;
      const vy = 9.8 * dt, len = Math.min(26, vy * cam.f / q[2] / 24 * 1.2) + 1;
      g.strokeStyle = css(gr.seed < 0.6 ? hx('4a3b2c') : hx('6e5a40'), 0.85); g.lineWidth = Math.max(1.2, 0.05 * cam.f / q[2]);
      g.beginPath(); g.moveTo(q[0], q[1] - len); g.lineTo(q[0], q[1]); g.stroke();
    }
    g.restore();
    // dust where weight leaves and meets the ground
    for (const [t0, j, off, r, life] of puffs) {
      const d = tq - t0; if (d < 0 || d > life) continue;
      const P = jointAt(t0, j, off); P[1] = Math.max(P[1], 0.3);
      const q = cam.project(P);
      for (let k = 0; k < 3; k++) drawPuff(g, q[0] + (k - 1) * r * 0.8 * cam.f / q[2], q[1] - k % 2 * 6, r * cam.f / q[2] * (1 - k * 0.15), clamp(d / life), 8000 + Math.round(t0 * 100) + k * 17 + Math.floor(d * 12), { alpha: 0.85, rise: 0.5, lit: hx('e3d3b2'), shd: hx('a89679'), line: hx('7b6a55') });
    }
    // leaves
    const lv = [];
    for (const Lf of leaves) {
      const dt = lt - Lf.tr; if (dt < 0) continue;
      if (!Lf.p) Lf.p = jointAt(Lf.tr, Lf.j, Lf.off);
      Lf.t0 = Lf.tr; lv.push(Lf);
    }
    drawLeavesWorld(g, lv, cam, lt, { size: 0.2, floor: 0.1 });
  };
  SHOTS.push(sh);
})();
function drawClod(g, x, y, r, seed, grass, landed) {
  const rng = new RNG(seed), n = 8, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, k = rng.range(0.7, 1.2); pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * 0.85 * k]); }
  const path = () => { g.beginPath(); pts.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath(); };
  path(); g.fillStyle = css(hx('3e3226')); g.fill();
  g.save(); path(); g.clip(); g.fillStyle = css(hx('6b5640')); g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.35, r * 0.8, r * 0.55, -0.4, 0, TAU); g.fill();
  if (rng.next() < 0.5) { g.fillStyle = css(hx('6d7a3c')); g.beginPath(); g.ellipse(x + r * 0.2, y - r * 0.5, r * 0.6, r * 0.3, 0.2, 0, TAU); g.fill(); }
  g.restore();
  path(); g.lineWidth = Math.max(1, r * 0.14); g.strokeStyle = css(hx('2a2018'), 0.9); g.stroke();
  if (grass && r > 3) { g.strokeStyle = css(hx('7f8c45')); g.lineWidth = Math.max(1, r * 0.1); for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + rng.range(-0.7, 0.7); g.beginPath(); g.moveTo(x, y - r * 0.5); g.quadraticCurveTo(x + Math.cos(a) * r, y - r * 0.5 + Math.sin(a) * r, x + Math.cos(a) * r * 1.8, y - r * 0.5 + Math.sin(a) * r * 1.7); g.stroke(); } }
}
