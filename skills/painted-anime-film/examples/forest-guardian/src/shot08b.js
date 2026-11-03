// ---------- SHOT 8b: high and wide: a ring of wind rolls out across the canopy ----------
function drawWorldRing(g, cam, ctr, R, y, k, seed, o = {}) {
  const rng = new RNG(seed);
  const a0 = (o.alpha ?? 1) * (1 - k * k);
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  // soft mist body first
  g.filter = 'blur(10px)'; g.strokeStyle = css(o.mist || hx('fff3dc'), 0.35 * a0); g.lineWidth = (o.mw || 60) * (1 - k * 0.5);
  g.beginPath(); for (let i = 0; i <= 96; i++) { const a = i / 96 * TAU, q = cam.project([ctr[0] + Math.cos(a) * R, y, ctr[2] + Math.sin(a) * R]); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.stroke();
  g.filter = 'none';
  for (let band = 0; band < 5; band++) {
    const rr = R * (1 - band * 0.03 - rng.range(0, 0.015));
    let an = rng.next() * TAU; const end = an + TAU;
    while (an < end) {
      const seg = rng.range(0.15, 0.55), gap = rng.range(0.03, 0.18);
      g.beginPath();
      for (let s = 0; s <= 10; s++) { const t = an + seg * s / 10, q = cam.project([ctr[0] + Math.cos(t) * rr, y + band * 0.4, ctr[2] + Math.sin(t) * rr]); s ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }
      g.strokeStyle = css(band === 0 ? hx('fffaf0') : hx('f6e4bc'));
      g.globalAlpha = a0 * (band === 0 ? 0.95 : 0.55) * rng.range(0.5, 1);
      g.lineWidth = (o.w || 5) * (band === 0 ? 1 : 0.55) * rng.range(0.6, 1.3);
      g.stroke();
      an += seg + gap;
    }
  }
  g.restore();
}
(function () {
  const sh = { name: 'windring', dur: 3.8 };
  let C, Tg, crowns, spr, under, Ry, bits, birds;
  const T0 = 0.15;
  const ringR = (t) => t < T0 ? 0 : 14 + 84 * (1 - Math.exp(-(t - T0) * 0.62));
  sh.build = () => {
    buildLeaves();
    Ry = M4.rotY(R_YAW);
    C = M4.xform(Ry, [-46, 104, 92]); Tg = [0, 4, 0];
    const cd = V3.norm([C[0], 0, C[2]]);
    // crown sprites seen from above: normal and wind-flipped (pale undersides)
    spr = []; under = [];
    const L = [-0.75, -0.6];
    for (let v = 0; v < 12; v++) {
      const S = 300, rng = new RNG(4400 + v);
      const mk = (pal) => { const c = mkCanvas(S, S), g = c.getContext('2d'); paintCrown(g, { cx: S / 2, cy: S / 2, rx: S * 0.36, ry: S * 0.32, seed: 7000 + v * 11, pal, light: L, leaf: 9, lightAmt: 0.75, holes: 0, edgeLeaves: 1.3, hiAmt: 1.0 }); return c; };
      const k = rng.next();
      const pal = { deep: hx('1d2f2a'), dark: mixc(hx('2b463a'), hx('3a4a30'), k), mid: mixc(hx('4c6a42'), hx('63753f'), k), light: mixc(hx('8aa252'), hx('a7ab5c'), k), hi: hx('e9d88e') };
      spr.push(mk(pal));
      under.push(mk({ deep: hx('5f725c'), dark: hx('8b9c7e'), mid: hx('aebb98'), light: hx('d3dab8'), hi: hx('f2f0d6') }));
    }
    crowns = [];
    const rng = new RNG(818), sp = 7.2;
    for (let i = -30; i <= 30; i++) for (let j = -30; j <= 30; j++) {
      const x = (i + (j & 1) * 0.5) * sp + rng.range(-2.4, 2.4), z = j * sp * 0.87 + rng.range(-2.4, 2.4), d = Math.hypot(x, z);
      if (d < 15 + rng.range(-1, 3) || d > 210) continue;
      if (d < 27 && (x * cd[0] + z * cd[2]) / d > 0.35) continue; // keep the clearing open toward camera
      crowns.push({ p: [x, rng.range(16, 22) + (d < 24 ? 2 : 0), z], r: rng.range(4.2, 6.2), v: rng.int(0, 11), d, a: Math.atan2(z, x), seed: rng.next() });
    }
    bits = [];
    for (let i = 0; i < 260; i++) bits.push({ a: rng.next() * TAU, t: rng.range(T0 + 0.1, 3.4), up: rng.range(2, 7), col: rng.pick([0, 0, 1, 2, 3]), size: rng.range(0.8, 1.6), ph: rng.next() * TAU, w: rng.range(2, 4), amp: 0.4, vy: 0, drift: [0, 0], r0: rng.range(-1, 1), p: [0, 0, 0] });
    birds = [];
    for (let i = 0; i < 60; i++) { const a = rng.next() * TAU, d = rng.range(20, 80); birds.push({ p: [Math.cos(a) * d, 22, Math.sin(a) * d], a, t0: T0 + (d - 14) / 84 * 1.4 + rng.range(0, 0.25), v: rng.range(9, 15), ph: rng.next() * 4 }); }
  };
  sh.draw = (g, lt) => {
    const k = easeInOut(clamp(lt / sh.dur));
    const f = Math.floor(lt * 24), rng = new RNG(6100 + f), A = 0.12 * Math.exp(-lt * 1.5);
    const cam = new Cam(V3.add(V3.lerp(C, V3.mul(C, 1.06), k), [rng.range(-A, A), rng.range(-A, A), 0]), Tg, 38);
    // understory showing between crowns
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, css(hx('6f7c66'))); grd.addColorStop(0.5, css(hx('2f3f32'))); grd.addColorStop(1, css(hx('1f2c25')));
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    // the clearing floor
    const tq = Math.floor(lt * 12) / 12;
    g.save(); g.beginPath();
    for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, r = 17 + 2.5 * Math.sin(a * 3 + 1) + 1.5 * Math.sin(a * 7), q = cam.project([Math.cos(a) * r, 0, Math.sin(a) * r]); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }
    g.closePath(); g.fillStyle = css(hx('7f8a55')); g.fill(); g.clip();
    { const r2 = new RNG(77); for (let i = 0; i < 160; i++) { const a = r2.next() * TAU, d = Math.sqrt(r2.next()) * 18, q = cam.project([Math.cos(a) * d, 0, Math.sin(a) * d]); dab(g, 'soft', r2.int(0, 1), q[0], q[1], r2.range(10, 30), r2.range(5, 12), 0, r2.pick([hx('93a060'), hx('6c7a45'), hx('a7ad6c'), hx('5e6a3d')]), 0.6); } }
    g.restore();
    const pose = P_CROUCH(4.2), Mw = evalPose(pose);
    const rdep = cam.project([0, 6, 0])[2];
    const R = ringR(lt);
    const placed = crowns.map(c => {
      const w = R > 0 ? Math.exp(-Math.pow((c.d - R) / 9, 2)) * (1 - smooth(60, 98, R) * 0.5) : 0;
      const ww = Math.floor(w * 6) / 6; // the wave is drawn on twos-ish steps
      const p = [c.p[0] + Math.cos(c.a) * ww * 2.2, c.p[1] - ww * 1.2, c.p[2] + Math.sin(c.a) * ww * 2.2];
      return { c, q: cam.project(p), w: ww };
    }).filter(o => o.q[2] > 1).sort((a, b) => b.q[2] - a.q[2]);
    const drawCrown = (o) => {
      const s = o.c.r * 2.3 * cam.f / o.q[2];
      if (o.q[0] < -s || o.q[0] > W + s || o.q[1] < -s || o.q[1] > H + s) return;
      g.save(); g.translate(o.q[0], o.q[1]); g.scale(1, 1 - o.w * 0.18);
      g.drawImage(spr[o.c.v], -s / 2, -s / 2, s, s);
      if (o.w > 0.05) { g.globalAlpha = o.w * 0.95; g.drawImage(under[o.c.v], -s / 2, -s / 2, s, s); }
      g.restore();
    };
    let robotDone = false;
    for (const o of placed) {
      if (!robotDone && o.q[2] < rdep) {
        robotLayer(g, cam, pose, Object.assign({}, LIGHT_FOREST, { fog: [0.004, 40] }), { seed: 81, lineW: 1.0, t: lt, moss: 1.35, growth: true, mats: { core: 1, eye: 1, jet: 1.5 } });
        drawJets(g, cam, Mw, 1, f >> 1, { len: 7.2 });
        // dust skirt in the clearing
        for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + tq, rr = 6 + (tq * 4 + i) % 8, q = cam.project([Math.cos(a) * rr, 0.6, Math.sin(a) * rr]); drawPuff(g, q[0], q[1], 1.8 * cam.f / q[2], ((tq * 0.8 + i * 0.13) % 1), 300 + i * 7 + (f >> 1), { alpha: 0.85, lit: hx('f2e2c0'), shd: hx('bba684'), line: hx('8b765c') }); }
        robotDone = true;
      }
      drawCrown(o);
    }
    // the ring itself + leaves torn up along its front
    if (R > 0) {
      const kr = smooth(14, 98, R) * 0.85;
      drawWorldRing(g, cam, [0, 0, 0], R, 23, kr, 4242 + (f >> 1), { w: 6, mw: 80 });
      drawWorldRing(g, cam, [0, 0, 0], R * 0.86, 21, kr, 4343 + (f >> 1), { w: 3, mw: 40, alpha: 0.5 });
      for (const b of bits) {
        const dt = lt - b.t; if (dt < 0 || dt > 1.4) continue;
        const r0 = ringR(b.t), rr = r0 + dt * 14;
        const P = [Math.cos(b.a) * rr, 22 + b.up * Math.sin(Math.min(1, dt / 1.4) * Math.PI), Math.sin(b.a) * rr];
        const q = cam.project(P); if (q[2] < 1) continue;
        drawLeaf(g, b, q[0], q[1], 0.5 * b.size * cam.f / q[2] * 2.4, dt, 1 - dt / 1.4);
      }
    }
    for (const b of birds) {
      const dt = lt - b.t0; if (dt < 0) continue;
      const P = [b.p[0] + Math.cos(b.a) * b.v * dt, b.p[1] + dt * 5, b.p[2] + Math.sin(b.a) * b.v * dt], q = cam.project(P);
      drawFlockBird(g, q[0], q[1], 0.9 * cam.f / q[2], dt * 14 + b.ph, hx('2f2b2a'), 0);
    }
    // golden morning haze over everything far
    const hz = g.createLinearGradient(0, 0, 0, H * 0.6);
    hz.addColorStop(0, css(hx('f6dfb0'), 0.75)); hz.addColorStop(0.5, css(hx('efd9b6'), 0.25)); hz.addColorStop(1, css(hx('efd9b6'), 0));
    g.fillStyle = hz; g.fillRect(0, 0, W, H * 0.6);
  };
  SHOTS.push(sh);
})();
