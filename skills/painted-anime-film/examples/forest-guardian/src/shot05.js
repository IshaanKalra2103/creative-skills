// ---------- SHOT 5a: the ground trembles under its hand ----------
function drawPebble(g, x, y, r, seed, lit) {
  const rng = new RNG(seed), n = 9, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, k = rng.range(0.8, 1.15); pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * 0.72 * k]); }
  const path = () => { g.beginPath(); pts.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath(); };
  path(); g.fillStyle = css(hx('5c5a52')); g.fill();
  g.save(); path(); g.clip(); g.fillStyle = css(lit ? hx('b9ae94') : hx('8d887a')); g.beginPath(); g.ellipse(x - r * 0.25, y - r * 0.3, r * 0.85, r * 0.55, -0.3, 0, TAU); g.fill(); g.restore();
  path(); g.lineWidth = Math.max(1, r * 0.12); g.strokeStyle = css(hx('3b3026'), 0.85); g.stroke();
}
(function () {
  const sh = { name: 'tremor', dur: 3.5 };
  let base, bg, C0, Tg, pebbles, tips;
  const TR0 = 0.5;
  const shakeAmp = (lt) => lt < TR0 ? 0 : 0.05 * (0.6 + 0.4 * Math.sin(lt * 7)) * clamp((lt - TR0) / 0.4) ;
  function poseAt(lt) {
    const p = P_KNEEL({ yaw: R_YAW });
    const f = Math.floor(lt * 12) / 12;
    let c = 0.3;
    if (f > 1.5) c = f < 1.75 ? 0.08 : f < 2.2 ? 0.12 : 0.55; // twitch, then dig in
    p.curl = { L: 0.7, R: c };
    return p;
  }
  sh.build = () => {
    base = P_KNEEL({ yaw: R_YAW });
    const Mw = evalPose(base);
    const hc = V3.lerp(jointPos(Mw, 'wrR'), jointPos(Mw, 'fR1b'), 0.55);
    sh.hc = hc;
    tips = ['fR0b', 'fR1b', 'fR2b'].map(j => { const p = jointPos(Mw, j, [-0.5, 0, 0]); p[1] = 1.0; return p; });
    const F = [Math.sin(R_YAW), 0, Math.cos(R_YAW)], Lf = [Math.cos(R_YAW), 0, -Math.sin(R_YAW)];
    C0 = V3.add(hc, V3.add(V3.mul(F, 5.4), V3.add(V3.mul(Lf, 2.6), [0, 0.5, 0])));
    Tg = fitCam(C0, 34, [[hc, [820, 420]]], hc);
    bg = forestBG(new Cam(C0, Tg, 34), { seed: 5, sun: [W * 0.9, H * 0.0] });
    const rng = new RNG(55); pebbles = [];
    for (let i = 0; i < 26; i++) { const a = rng.next() * TAU, d = rng.range(2.4, 5.5); const p = V3.add(hc, [Math.cos(a) * d, 0, Math.sin(a) * d]); p[1] = 0.04; pebbles.push({ p, r: rng.range(0.05, 0.13), seed: rng.int(1, 1e6), ph: rng.next(), lit: rng.next() < 0.6 }); }
    for (let i = 0; i < 9; i++) { const a = rng.range(-1, 1), d = rng.range(0.8, 1.6); pebbles.push({ p: V3.add(hc, [Math.cos(a) * d * 1.2, 1.02 + rng.range(-0.05, 0.08), Math.sin(a) * d]), r: rng.range(0.04, 0.08), seed: rng.int(1, 1e6), ph: rng.next(), lit: true }); }
  };
  sh.draw = (g, lt) => {
    const f = Math.floor(lt * 24), rng = new RNG(9000 + f), A = shakeAmp(lt);
    const cam = new Cam(V3.add(C0, [rng.range(-A, A), rng.range(-A, A), rng.range(-A, A)]), Tg, 34, rng.range(-A, A) * 0.12);
    bg.draw(g, cam, lt);
    if (!sh.gplants) sh.gplants = clearView(baseGrowth(77), C0, sh.hc, 2.6);
    robotLayer(g, cam, poseAt(lt), Object.assign({}, LIGHT_FOREST, { gobo: [0.3, 0.55, 1, 5] }), { seed: 5, lineW: 1.6, t: lt, moss: 1.35, gplants: sh.gplants, extra: handRockItems(), mats: { core: 0.85 } });
    // pebbles hop on threes while the ground shakes
    const f3 = Math.floor(lt * 8);
    const items = pebbles.map(pb => {
      const hop = lt > TR0 ? Math.abs(Math.sin((f3 / 8 + pb.ph) * 9.0)) * 0.12 * clamp((lt - TR0) / 0.6) * (new RNG(pb.seed + f3).next() < 0.6 ? 1 : 0.2) : 0;
      return [cam.project([pb.p[0], pb.p[1] + pb.r + hop, pb.p[2]]), pb];
    }).sort((a, b) => b[0][2] - a[0][2]);
    for (const [q, pb] of items) if (q[2] > 0.5 && glProbe(q[0], q[1])[0] > q[2] - 0.15) drawPebble(g, q[0], q[1], pb.r * cam.f / q[2], pb.seed, pb.lit);
    // dust where the fingertips dig in
    const td = Math.floor(lt * 12) / 12 - 2.2;
    if (td > 0) tips.forEach((tp, i) => { const q = cam.project(tp); const k = clamp(td / 1.1); if (k < 1) drawPuff(g, q[0] + i * 6, q[1], 0.2 * cam.f / q[2], k, 4000 + i * 31 + Math.floor(td * 12), { alpha: 0.8, rise: 0.5, lit: hx('cdbd9c'), shd: hx('94836b'), line: hx('6a5844') }); });
  };
  SHOTS.push(sh);
})();
