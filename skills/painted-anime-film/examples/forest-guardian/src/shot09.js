// ---------- SHOT 9a: launch: from under it, it tears up through the canopy gap ----------
(function () {
  const sh = { name: 'launch', dur: 2.6 };
  const TL = 0.5, FOV = 60; // feet leave the ground
  let bg, C, Tg, leaves, buf, bufG, rocks;
  sh.build = () => {
    buildLeaves();
    const Ry = M4.rotY(R_YAW), Mw = evalPose(P_CROUCH(4.2));
    const hd = jointPos(Mw, 'head', [0, 0.4, 0.4]), hip = jointPos(Mw, 'root');
    C = V3.add(M4.xform(Ry, [5, 0, 17]), [0, 0.8, 0]);
    Tg = fitCam(C, FOV, [[hip, [W * 0.5, H * 0.8]], [[0.1, 30, 0.7], [W * 0.5, H * 0.13]]], hd);
    const cam = new Cam(C, Tg, FOV), gp = cam.project([0.1, 30, 0.7]);
    sh.gp = gp;
    bg = canopyUpBG(cam, { seed: 9, crownBottom: 0.45, gap: [gp[0], gp[1] - 40, 340, 210], nearN: 6 });
    buf = mkCanvas(W, H); bufG = buf.getContext('2d');
    const rng = new RNG(909);
    // canopy leaves shaken loose, and ground litter blown up past the lens
    leaves = makeLeaves(60, [-12, 12, 16, 30, -12, 12], rng, { vy: 1.3, amp: 1.0, t0: 0.4 });
    for (let i = 0; i < 50; i++) {
      const a = rng.next() * TAU;
      leaves.push({ p: [Math.cos(a) * 2.5, 0.6, Math.sin(a) * 2.5 + 0.7], ph: rng.next() * TAU, w: rng.range(4, 7), amp: 0.3, vy: -rng.range(4, 9), drift: [Math.cos(a) * rng.range(5, 10), Math.sin(a) * rng.range(5, 10)], r0: rng.range(-1, 1), col: rng.pick([0, 1, 2, 3]), size: rng.range(0.9, 1.5), t0: TL + rng.range(-0.1, 0.25) });
    }
    rocks = [];
    for (let i = 0; i < 26; i++) { const a = rng.next() * TAU; rocks.push({ a, v: rng.range(6, 14), up: rng.range(5, 11), r: rng.range(0.08, 0.22), seed: rng.int(1, 1e6), t0: TL + rng.range(-0.04, 0.08) }); }
  };
  sh.draw = (g, lt) => {
    const f = Math.floor(lt * 24), s = lt - TL, rng = new RNG(9100 + f);
    const A = s < 0 ? 0.05 : 0.22 * Math.exp(-s * 3) + 0.03;
    const cam = new Cam(V3.add(C, [rng.range(-A, A), rng.range(-A, A), rng.range(-A, A)]), Tg, FOV, rng.range(-A, A) * 0.05);
    bg.draw(g, cam, { near: [rng.range(-1, 1) * A * 50, rng.range(-1, 1) * A * 50] });
    const { pose } = s < 0 ? { pose: P_CROUCH(4.2) } : P_FLY(s, { ones: true });
    const Mw = evalPose(pose), J = jetsOf(Mw);
    const pw = 1 + 0.1 * Math.sin(f * 2.3) + (s >= 0 && s < 0.3 ? 0.5 : 0);
    // the jet column: light from the nozzles down to the ground, hanging on after it's gone
    const fadeCol = s < 0 ? 1 : Math.max(0, 1 - s / 0.9);
    if (fadeCol > 0) for (const j of J) {
      const a = cam.project(j.p), gpt = cam.project([j.p[0], 0.2, j.p[2]]);
      if (a[2] < 0.5 || gpt[2] < 0.5) continue;
      const ppm = cam.f / a[2], wTop = 0.7 * ppm, wBot = 2.4 * cam.f / gpt[2];
      g.save(); g.globalCompositeOperation = 'lighter';
      const grd = g.createLinearGradient(a[0], a[1], gpt[0], gpt[1]);
      grd.addColorStop(0, css(hx('fff6dc'), 0.9 * fadeCol)); grd.addColorStop(0.4, css(hx('ffd890'), 0.5 * fadeCol)); grd.addColorStop(1, css(hx('f0b070'), 0.15 * fadeCol));
      g.fillStyle = grd; g.beginPath();
      const nx = -(gpt[1] - a[1]), ny = gpt[0] - a[0], nl = Math.hypot(nx, ny) || 1;
      g.moveTo(a[0] + nx / nl * wTop, a[1] + ny / nl * wTop); g.lineTo(gpt[0] + nx / nl * wBot, gpt[1] + ny / nl * wBot);
      g.lineTo(gpt[0] - nx / nl * wBot, gpt[1] - ny / nl * wBot); g.lineTo(a[0] - nx / nl * wTop, a[1] - ny / nl * wTop); g.fill();
      g.restore();
    }
    // the robot: on launch frames it's drawn stretched along its path (a smear drawing), plus speed lines
    const smear = s >= 0 && s < 4 / 24 ? [0.85, 0.55, 0.3, 0.12][Math.floor(s * 24)] : 0;
    const head = cam.project(jointPos(Mw, 'head', [0, 0.6, 0]));
    if (head[2] > 0.5 && head[1] > -H * 0.8) {
      if (smear > 0) {
        bufG.clearRect(0, 0, W, H);
        robotLayer(bufG, cam, pose, LIGHT_FOREST, { seed: 90 + f, lineW: 1.7, t: lt, moss: 1.35, growth: true, ground: false, mats: { core: 1, eye: 1, jet: 1.8 } });
        g.save(); g.translate(head[0], head[1]); g.scale(1 - smear * 0.18, 1 + smear); g.translate(-head[0], -head[1]);
        g.drawImage(buf, 0, 0); g.restore();
        g.save(); g.lineCap = 'round';
        const r2 = new RNG(77 + f);
        for (let i = 0; i < 26; i++) {
          const x = head[0] + r2.range(-1, 1) * 260 * (1 + smear), y0 = head[1] + r2.range(120, 520), len = r2.range(300, 900) * smear;
          g.strokeStyle = css(r2.next() < 0.5 ? hx('fff8e6') : hx('f2dcae')); g.globalAlpha = 0.75 * smear + 0.2;
          g.lineWidth = r2.range(2, 7); g.beginPath(); g.moveTo(x, y0); g.lineTo(x + (x - head[0]) * 0.05, y0 + len); g.stroke();
        }
        g.restore();
      } else {
        robotLayer(g, cam, pose, LIGHT_FOREST, { seed: 90 + (s < 0 ? (f >> 1) % 2 : f), lineW: 1.7, t: lt, moss: 1.35, growth: true, ground: false, mats: { core: 1, eye: 1, jet: 1.5 } });
      }
      drawJets(g, cam, Mw, pw, s < 0 ? f >> 1 : f, { len: s < 0 ? 6 : 9 });
      drawEyeGlow(g, cam, Mw, 1);
    }
    // ground shock: a flat ring + a wall of dust rolling outward under the camera
    if (s >= 0 && s < 1.3) {
      const kq = Math.floor(s * 12) / 12, ctr = V3.lerp(J[0].p, J[1].p, 0.5); ctr[1] = 0.3;
      const c = cam.project(ctr);
      if (c[2] > 0.5) {
        const R = 3 + 26 * Math.pow(kq / 1.3, 0.55), e = cam.project([ctr[0] + R, 0.3, ctr[2]]);
        drawWindRing(g, c[0], c[1], Math.abs(e[0] - c[0]) + 60, 60 + kq * 80, kq / 1.3, 55 + (f >> 1), { w: 9 });
      }
      for (const r of rocks) {
        const d = s - (r.t0 - TL); if (d < 0) continue;
        const P = [ctr[0] + Math.cos(r.a) * r.v * d, 0.3 + r.up * d - 9 * d * d, ctr[2] + Math.sin(r.a) * r.v * d];
        if (P[1] < 0) continue;
        const q = cam.project(P); if (q[2] < 0.5) continue;
        const rr = Math.max(2, r.r * cam.f / q[2]);
        g.fillStyle = css(hx('4c3d2e')); g.strokeStyle = css(hx('2a211a')); g.lineWidth = 1.2;
        g.beginPath(); for (let k = 0; k < 6; k++) { const an = k / 6 * TAU + r.seed, rk = rr * (0.75 + 0.3 * Math.sin(r.seed + k * 2.1)); k ? g.lineTo(q[0] + Math.cos(an) * rk, q[1] + Math.sin(an) * rk) : g.moveTo(q[0] + Math.cos(an) * rk, q[1] + Math.sin(an) * rk); } g.closePath(); g.fill(); g.stroke();
      }
    }
    // dust boiling up around the base (rolling toward camera, filling the bottom of frame)
    const ctr = [0.1, 0.3, 0.7];
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU + 0.3, life = ((Math.floor(lt * 12) / 12) * (s < 0 ? 0.6 : 1.2) + i * 0.071) % 1;
      const rr = 2 + life * (s < 0 ? 5 : 11), P = [ctr[0] + Math.cos(a) * rr, 0.8 + life * 2.5, ctr[2] + Math.sin(a) * rr];
      const q = cam.project(P); if (q[2] < 7) continue;
      drawPuff(g, q[0], q[1], Math.min(240, (1.6 + life * 2) * cam.f / q[2]), life, 1300 + i * 17 + (f >> 1), { alpha: 0.85, rise: 0.5, lit: hx('f8e8c6'), shd: hx('c8b08a'), line: hx('917a5c') });
    }
    // the flash at lift-off
    if (s >= 0 && s < 3 / 24) { g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = css(hx('fff4d8'), [0.55, 0.3, 0.12][Math.floor(s * 24)]); g.fillRect(0, 0, W, H); g.restore(); }
    drawLeavesWorld(g, leaves, cam, lt, { size: 0.22, floor: -5 });
  };
  SHOTS.push(sh);
})();
// ---------- SHOT 9b: above the forest: a curve of light and mist into the golden sky ----------
// painted cumulus: a union of lobes, lilac shadow body, warm lit lobes pushed toward the sun, soft flat base
function paintCelCloud(g, cx, cy, w, h, rng, o = {}) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  const n = Math.max(5, Math.round(w / (h * 0.45))), L = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, r = h * (0.35 + 0.65 * Math.pow(Math.sin(Math.PI * t), 0.8)) * rng.range(0.7, 1.08);
    L.push([cx - w / 2 + w * t + rng.range(-0.15, 0.15) * h, cy - r * rng.range(0.35, 0.7), r]);
    if (r > h * 0.6 && rng.next() < 0.7) L.push([L[L.length - 1][0] + rng.range(-0.3, 0.3) * r, L[L.length - 1][1] - r * rng.range(0.4, 0.7), r * rng.range(0.45, 0.7)]);
  }
  const sx = o.sun[0] - cx, sy = o.sun[1] - cy, sl = Math.hypot(sx, sy) || 1, ux = sx / sl, uy = sy / sl;
  const ox = cx - w, oy = cy - h * 3, c = mkCanvas(Math.ceil(w * 2), Math.ceil(h * 3.1)), t = c.getContext('2d');
  t.beginPath(); t.rect(0, 0, w * 2, h * 3 + h * 0.08); t.clip();
  const fill = (col, k, off) => { t.fillStyle = css(col); t.beginPath(); for (const [x, y, r] of L) { const X = x - ox + ux * r * off, Y = y - oy + uy * r * off; t.moveTo(X + r * k, Y); t.arc(X, Y, r * k, 0, TAU); } t.fill(); };
  fill(o.shd, 1, 0);
  fill(o.mid || mixc(o.shd, o.lit, 0.5), 0.86, 0.16);
  fill(o.lit, 0.7, 0.3);
  t.globalAlpha = 0.8; fill(o.rim || hx('fffaf0'), 0.42, 0.55); t.globalAlpha = 1;
  // base dissolves into haze
  const grd = t.createLinearGradient(0, h * 2.5, 0, h * 3.1);
  grd.addColorStop(0, css(o.haze, 0)); grd.addColorStop(1, css(o.haze, 0.85));
  t.globalCompositeOperation = 'source-atop'; t.fillStyle = grd; t.fillRect(0, h * 2.5, w * 2, h * 0.6);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = o.a ?? 1; g.drawImage(c, ox, oy); g.restore();
}
(function () {
  const sh = { name: 'sky', dur: 4.8 };
  let bg, C, Tg, cam0, buf, bufG, leaves, birds, burst, Lsky;
  const P0 = [640, 930], P1 = [700, 170], P2 = [1290, 205];
  const scr = (u) => [(1 - u) * (1 - u) * P0[0] + 2 * u * (1 - u) * P1[0] + u * u * P2[0], (1 - u) * (1 - u) * P0[1] + 2 * u * (1 - u) * P1[1] + u * u * P2[1]];
  const dep = (u) => 85 * (1 + 7 * u * u);
  const uAt = (t) => t <= 0 ? 0 : (1 - Math.exp(-t * 0.8)) / (1 - Math.exp(-4.8 * 0.8));
  let path;
  sh.build = () => {
    buildLeaves();
    C = [-60, 24, 120]; Tg = [20, 52, 0];
    cam0 = new Cam(C, Tg, 40);
    const V = cam0.view, Rt = [V[0], V[4], V[8]], Up = [V[1], V[5], V[9]], Bk = [V[2], V[6], V[10]];
    path = (u) => { const q = scr(u), d = dep(u), x = (q[0] - W / 2) * d / cam0.f, y = -(q[1] - H / 2) * d / cam0.f; return V3.add(C, V3.add(V3.mul(Rt, x), V3.add(V3.mul(Up, y), V3.mul(Bk, -d)))); };
    const sunS = [1560, 330];
    const sunW = V3.norm(V3.sub(path(0.0).map((v, i) => v), C)); // placeholder, replaced below
    const sd = (() => { const d = 1000, x = (sunS[0] - W / 2) * d / cam0.f, y = -(sunS[1] - H / 2) * d / cam0.f; return V3.norm(V3.add(V3.mul(Rt, x), V3.add(V3.mul(Up, y), V3.mul(Bk, -d)))); })();
    bg = treetopsBG(cam0, { seed: 14, sun: sd, midY: 0.74, farY: 0.68, bushes: false, near: [[-60, 900, 300], [W + 160, 860, 330]] });
    Lsky = Object.assign({}, LIGHT_FOREST, { sun: sd, fog: [0.0022, 60], fogCol: [0.98, 0.9, 0.78], amb: [0.66, 0.66, 0.78] });
    // repaint the sky plate: a Ghibli dawn with cel cumulus
    { const pl = bg.P.sky, g = pl.g, PW = pl.w, PH = pl.h, sx = sunS[0] + BM, sy = sunS[1] + BM, rng = new RNG(1499);
      const grd = g.createLinearGradient(0, 0, 0, PH);
      grd.addColorStop(0, css(hx('5f7fae'))); grd.addColorStop(0.28, css(hx('93a8c8'))); grd.addColorStop(0.55, css(hx('e5cfb5'))); grd.addColorStop(0.75, css(hx('f8dcaa'))); grd.addColorStop(1, css(hx('fde9c4')));
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.fillStyle = grd; g.fillRect(0, 0, PW, PH);
      const r = g.createRadialGradient(sx, sy, 0, sx, sy, 1000);
      r.addColorStop(0, css(hx('fffdf0'), 1)); r.addColorStop(0.06, css(hx('fff4d0'), 1)); r.addColorStop(0.25, css(hx('fbd99c'), 0.6)); r.addColorStop(1, css(hx('f6c88e'), 0));
      g.fillStyle = r; g.fillRect(0, 0, PW, PH);
      // high streaks
      for (let i = 0; i < 14; i++) { const cx = rng.range(0, PW), cy = rng.range(40, PH * 0.32); for (let k = 0; k < 10; k++) dab(g, 'soft', rng.int(0, 1), cx + rng.range(-200, 200), cy + rng.range(-8, 8), rng.range(120, 260), rng.range(6, 12), rng.range(-0.08, -0.02), mixc(hx('f4dcc4'), hx('c6c4d6'), rng.next()), 0.35); }
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
      const sun = [sx, sy], haze = hx('f6dcb4');
      // far small banks near the horizon, then a big bank behind the flight path
      for (let i = 0; i < 9; i++) paintCelCloud(g, rng.range(0, PW), PH * rng.range(0.6, 0.68), rng.range(160, 360), rng.range(26, 50), rng, { sun, shd: hx('d9bcb6'), lit: hx('fbe2be'), haze, a: 0.85 });
      paintCelCloud(g, 360, PH * 0.6, 900, 210, rng, { sun, shd: hx('b8a4b8'), mid: hx('d8bfc0'), lit: hx('f8ddb8'), haze });
      paintCelCloud(g, 980, PH * 0.58, 520, 120, rng, { sun, shd: hx('c4adb8'), lit: hx('fbe3bc'), haze });
      paintCelCloud(g, 260, PH * 0.3, 640, 110, rng, { sun, shd: hx('a6a6c4'), mid: hx('c8bccb'), lit: hx('f2dcc4'), haze: hx('b7bfd2'), a: 0.95 });
      applyGrain(g, PW, PH, 0.1);
    }
    bg.sunS = sunS; sh.bg = bg;
    buf = mkCanvas(W, H); bufG = buf.getContext('2d');
    const rng = new RNG(1414);
    leaves = makeLeaves(46, [C[0] - 14, C[0] + 14, C[1] - 6, C[1] + 10, C[2] - 30, C[2] - 8], rng, { vy: 0.7, amp: 1.6, wind: 0.8 });
    // the hole it punches in the canopy: leaves and twigs flung up and outward
    const ex = path(0.04); burst = [];
    for (let i = 0; i < 50; i++) { const a = rng.next() * TAU; burst.push({ p: [ex[0], ex[1] - 6, ex[2]], ph: rng.next() * TAU, w: rng.range(3, 6), amp: 0.5, vy: -rng.range(10, 22), drift: [Math.cos(a) * rng.range(3, 9), Math.sin(a) * rng.range(3, 9)], r0: rng.range(-1, 1), col: rng.pick([0, 0, 1, 2]), size: rng.range(0.9, 1.6), t0: rng.range(0, 0.15), g: rng.range(7, 10) }); }
    birds = [];
    for (let i = 0; i < 18; i++) birds.push({ x: rng.range(380, 1000), y: rng.range(700, 820), vx: rng.range(50, 110) * (rng.next() < 0.3 ? -1 : 1), vy: -rng.range(20, 50), ph: rng.next() * 4, s: rng.range(5, 9), t0: rng.range(0.1, 0.5) });
  };
  sh.draw = (g, lt) => {
    const k = easeInOut(clamp(lt / sh.dur)), f = Math.floor(lt * 24);
    const cam = new Cam(V3.add(C, [0, 1.5 * k, -3 * k]), V3.add(Tg, [6 * k, 5 * k, 0]), 40);
    bg.draw(g, cam, {}, ['sky', 'far']);
    { const sp = bg.sunS; glowFx(g, sp[0], sp[1], 420, hx('fff3d0'), 0.45, 'screen'); glowFx(g, sp[0], sp[1], 110, hx('fffef6'), 0.7, 'screen');
      for (let i = 0; i < 7; i++) drawBeam(g, sp[0], sp[1], Math.PI * (0.55 + i * 0.13) + 0.04 * Math.sin(lt + i), 900, 6, 120, hx('fff0c8'), 0.08); }
    // trail: a cel-shaded contrail; each sample remembers when it was laid down
    const tq = Math.floor(lt * 24) / 24, uNow = uAt(tq);
    const tOf = (u) => { let lo = 0, hi = tq; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; uAt(m) < u ? lo = m : hi = m; } return lo; };
    const pts = [];
    for (let i = 0; i <= 170; i++) {
      const u = uNow * i / 170, age = Math.max(0, Math.floor((tq - tOf(u)) * 12) / 12), q = cam.project(path(u));
      if (q[2] < 1) continue;
      const ppm = cam.f / q[2];
      pts.push({ x: q[0] - age * 14, y: q[1] + age * 4 - age * age, hw: (0.8 + age * 1.5) * ppm, age, i });
    }
    const sunP = bg.sunS;
    const lobes = (pass) => {
      for (const p of pts) {
        const r2 = new RNG(4400 + p.i * 13);
        const a = clamp(1.1 - p.age * 0.2) * (p.age > 1.5 ? (0.55 + 0.45 * r2.next()) : 1); if (a <= 0.02) continue;
        const sx = sunP[0] - p.x, sy = sunP[1] - p.y, sl = Math.hypot(sx, sy) || 1;
        const nOff = r2.range(-0.45, 0.45) * p.hw * (1 + p.age * 0.3), rr = p.hw * r2.range(0.7, 1.05);
        const ox = pass ? sx / sl * rr * 0.3 : 0, oy = pass ? sy / sl * rr * 0.3 : 0;
        g.globalAlpha = a; g.beginPath(); g.arc(p.x + nOff * 0.3 + ox, p.y + nOff + oy, rr * (pass ? 0.66 : 1), 0, TAU); g.fill();
      }
    };
    g.save();
    g.fillStyle = css(hx('a993a6')); g.save(); g.translate(1.2, 1.6); lobes(0); g.restore();
    g.fillStyle = css(hx('d5c0c6')); lobes(0);
    g.fillStyle = css(hx('fff3e0')); lobes(1);
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1], p1 = pts[i], hot = clamp(1 - p1.age / 0.8); if (hot <= 0) continue;
      g.globalAlpha = hot * 0.8; g.strokeStyle = css(hx('ffd98a')); g.lineWidth = Math.max(1.5, p1.hw * 0.8);
      g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.stroke();
      g.globalAlpha = hot; g.strokeStyle = css(hx('ffffff')); g.lineWidth = Math.max(1, p1.hw * 0.28);
      g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.stroke();
    }
    g.restore();
    // the robot at the head of the trail, tilted along its path, jets blazing
    const Pw = path(uNow), dir = V3.norm(V3.sub(path(Math.min(1, uNow + 0.004)), Pw));
    {
      const Pp = samplePoseKeys([{ t: 0, P: LAUNCH.KF }], 0, () => 0);
      const R = M4.mul(M4.rotY(Math.atan2(dir[0], dir[2])), M4.rotX(Math.atan2(Math.hypot(dir[0], dir[2]), dir[1])));
      Pp.rootR = [0, 0, 0];
      const root0 = Pp.rootP;
      Pp.footL = V3.add(root0, [1.9, -6.35, -0.4]); Pp.footR = V3.add(root0, [-1.9, -6.3, -0.7]);
      const pose = poseFromParams(Pp, 0);
      pose.xf = M4.mul(M4.trans(Pw[0], Pw[1], Pw[2]), M4.mul(R, M4.trans(-root0[0], -root0[1], -root0[2])));
      bufG.clearRect(0, 0, W, H);
      robotLayer(bufG, cam, pose, Lsky, { seed: 95 + (f >> 1), lineW: 1.3, t: lt, moss: 1.35, growth: false, ground: false, inkFog: 0.003, mats: { core: 1, eye: 1, jet: 2 } });
      g.drawImage(buf, 0, 0);
      drawJets(g, cam, evalPose(pose), 1.25, f, { len: 6 });
    }
    bg.draw(g, cam, {}, ['mid']);
    // canopy torn open where it burst out
    drawLeavesWorld(g, burst.filter(b => lt - b.t0 < 1.3), cam, lt, { size: 0.3, floor: -50 });
    for (const b of birds) { const t = lt - b.t0; if (t < 0) continue; drawFlockBird(g, b.x + b.vx * t, b.y + b.vy * t - 6 * t * t, b.s, t * 9 + b.ph, hx('3b3330'), 0); }
    bg.draw(g, cam, {}, ['near']);
    drawLeavesWorld(g, leaves, cam, lt, { size: 0.25 });
    drawMotes(g, 30, 141, lt, [0, 0, W, H], hx('fff2d0'), 0.35);
  };
  SHOTS.push(sh);
})();
