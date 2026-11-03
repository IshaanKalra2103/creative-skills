// ---------- overgrowth: painted plants living on the robot and around it ----------
const PPM = 150; // sprite pixels per metre
const GSPR = {}; // name -> [{c, ax, ay}]
function sprCanvas(wm, hm) { const c = mkCanvas(Math.ceil(wm * PPM), Math.ceil(hm * PPM)); return c; }
const GPAL = {
  grass: [hx('4f6332'), hx('6c7f3c'), hx('8f9a4c'), hx('3a4c2c'), hx('a9a75a')],
  fern: { dark: hx('2c4228'), mid: hx('4d6a36'), light: hx('8ea150') },
  leaf: { deep: hx('1f3326'), dark: hx('2e4a32'), mid: hx('4f6c3c'), light: hx('8c9e52'), hi: hx('e2c77c'), sky: hx('f6e6c8') },
  trunk: { dark: hx('2c2a26'), mid: hx('4d4838'), light: hx('857b5e'), rim: hx('efc27a'), moss: hx('5b6e36') },
  vine: { dark: hx('263a24'), mid: hx('42603a'), light: hx('7d9449') },
};
const LDIR = [0.72, -0.69];
function paintTuftSprite(seed, o = {}) {
  const rng = new RNG(seed), wm = o.w || 1.4, hm = o.h || 1.0;
  const c = sprCanvas(wm, hm), g = c.getContext('2d'), cx = c.width / 2, by = c.height - 6;
  // mossy cushion at the root
  leafMass(g, cx, by - 8, c.width * 0.36, 16, hx('3f5530'), rng, 12, { stamp: 0.8 });
  leafMass(g, cx + 6, by - 14, c.width * 0.26, 10, hx('63793a'), rng, 10, { stamp: 0.7 });
  for (let k = 0; k < (o.clumps || 4); k++) {
    paintGrassTuft(g, cx + rng.range(-0.3, 0.3) * c.width, by - rng.range(2, 10), { h: c.height * rng.range(0.45, 0.85), n: o.n || 9, cols: GPAL.grass, lean: rng.range(-0.3, 0.3), w: 3.2 }, rng);
  }
  if (o.flowers) for (let k = 0; k < o.flowers; k++) paintFlowers(g, cx + rng.range(-0.3, 0.3) * c.width, by - rng.range(14, c.height * 0.55), rng.range(10, 30), 5, o.fcols || PAL.flowers, rng, rng.range(3.5, 6));
  resetG(g);
  return { c, ax: cx, ay: by, m: hm };
}
function paintFernSprite(seed) {
  const rng = new RNG(seed), c = sprCanvas(2.0, 1.3), g = c.getContext('2d'), cx = c.width / 2, by = c.height - 4;
  for (let i = 0; i < 7; i++) {
    const s = i % 2 ? 1 : -1;
    paintFern(g, cx + rng.range(-8, 8), by, { len: rng.range(100, 170), ang: -Math.PI / 2 + s * rng.range(0.25, 1.1), curl: rng.range(0.5, 1.1), dir: s, cols: GPAL.fern, leaf: rng.range(12, 18), litSide: 1 }, rng);
  }
  leafMass(g, cx, by - 6, 40, 10, hx('3a4f2c'), rng, 10, { stamp: 0.7 });
  return { c, ax: cx, ay: by, m: 1.3 };
}
function paintSaplingSprite(seed, hm = 4.2) {
  const rng = new RNG(seed), c = sprCanvas(3.4, hm), g = c.getContext('2d'), cx = c.width * 0.45, by = c.height - 6;
  paintTree(g, { x: cx, base: by, h: c.height * 0.72, w0: 12, w1: 5, lean: 0.06, seed, lpal: GPAL.leaf, tpal: GPAL.trunk, light: LDIR, flare: 0.5, moss: 0.4,
    crowns: [{ dx: 0, dy: -10, rx: c.width * 0.3, ry: c.height * 0.17, leaf: 11 }, { dx: -c.width * 0.12, dy: c.height * 0.14, rx: c.width * 0.2, ry: c.height * 0.1, leaf: 10 }, { dx: c.width * 0.14, dy: c.height * 0.1, rx: c.width * 0.17, ry: c.height * 0.09, leaf: 10 }] });
  leafMass(g, cx, by - 6, 60, 14, hx('3f5530'), rng, 12, { stamp: 0.8 });
  paintGrassTuft(g, cx - 20, by - 4, { h: 60, n: 8, cols: GPAL.grass, w: 3 }, rng);
  paintGrassTuft(g, cx + 24, by - 4, { h: 50, n: 7, cols: GPAL.grass, w: 3 }, rng);
  return { c, ax: cx, ay: by, m: hm };
}
function ivyLeaf(g, x, y, s, a, col, shd, rng) {
  g.save(); g.translate(x, y); g.rotate(a);
  const w = s * rng.range(0.42, 0.55), path = () => {
    g.beginPath(); g.moveTo(0, 0);
    g.bezierCurveTo(w * 0.9, -s * 0.05, w * 1.1, s * 0.45, 0, s);
    g.bezierCurveTo(-w * 1.1, s * 0.45, -w * 0.9, -s * 0.05, 0, 0); g.closePath();
  };
  path(); g.fillStyle = css(col); g.fill();
  g.save(); path(); g.clip(); g.fillStyle = css(shd);
  g.beginPath(); g.moveTo(-w * 1.3, -2); g.lineTo(s * 0.05 * rng.range(-1, 1), -2); g.lineTo(s * 0.08, s + 2); g.lineTo(-w * 1.3, s + 2); g.fill();
  g.restore();
  g.strokeStyle = css(mixc(shd, col, 0.3), 0.8); g.lineWidth = Math.max(0.8, s * 0.05);
  g.beginPath(); g.moveTo(0, s * 0.08); g.quadraticCurveTo(s * 0.04, s * 0.5, 0, s * 0.85); g.stroke();
  g.restore();
}
function paintVineSprite(seed, lm) {
  const rng = new RNG(seed), c = sprCanvas(1.6, lm), g = c.getContext('2d'), cx = c.width / 2;
  const H = c.height - 10, P = GPAL.vine;
  const strands = [];
  const ns = rng.int(2, 4);
  for (let k = 0; k < ns; k++) {
    const len = H * (k === 0 ? 1 : rng.range(0.35, 0.8)), n = Math.max(8, Math.round(len / 9));
    let x = cx + rng.range(-10, 10), dx = rng.range(-0.6, 0.6);
    const pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n; dx += rng.range(-0.35, 0.35); dx *= 0.92; x += dx; pts.push([x + Math.sin(t * 7 + k) * 3, 6 + t * len]); }
    strands.push(pts);
  }
  // stems (back to front)
  for (const pts of strands) taper(g, pts, pts.map((_, i) => 4.2 * (1 - i / pts.length) + 1.2), P.dark);
  // leaves hanging off the stems; bigger near the top, sparser toward the tip
  for (const pts of strands) {
    for (let i = 1; i < pts.length; i++) {
      const t = i / pts.length;
      if (rng.next() < 0.25 + t * 0.35) continue;
      const p = pts[i], side = rng.sign();
      const sz = rng.range(14, 30) * (1 - t * 0.45);
      const a = side * rng.range(0.35, 1.15) + rng.range(-0.15, 0.15);
      const lit = side < 0 ? rng.next() < 0.7 : rng.next() < 0.3;
      const base = lit ? mixc(P.mid, P.light, rng.range(0.3, 0.9)) : mixc(P.dark, P.mid, rng.range(0.2, 0.8));
      ivyLeaf(g, p[0], p[1], sz, a, jit(base, rng, 0.03), mixc(base, hx('1f2c26'), 0.38), rng);
    }
  }
  // clump at the top where it grips the armor
  leafMass(g, cx, 10, 30, 9, hx('3f5530'), rng, 8, { stamp: 0.7 });
  resetG(g);
  return { c, ax: cx, ay: 4, m: lm, hang: true };
}
function buildGrowthSprites() {
  if (GSPR.tuft) return;
  GSPR.tuft = [0, 1, 2, 3, 4, 5].map(i => paintTuftSprite(500 + i, { h: 0.9, w: 1.3, flowers: i % 3 === 0 ? 3 : 0 }));
  GSPR.flower = [0, 1, 2, 3].map(i => paintTuftSprite(520 + i, { h: 0.8, w: 1.4, clumps: 2, n: 7, flowers: 8 }));
  GSPR.fern = [0, 1, 2].map(i => paintFernSprite(540 + i));
  GSPR.sapling = [paintSaplingSprite(560, 4.6), paintSaplingSprite(561, 2.6)];
  GSPR.vine = [0, 1, 2, 3, 4, 5, 6, 7].map(i => paintVineSprite(580 + i, 2.4 + (i % 4) * 1.3));
}
// fog-tinted copies (quantised)
function sprFog(s, col, k) {
  const q = Math.round(clamp(k) * 12);
  if (!q) return s.c;
  s._f = s._f || {};
  const key = q + ':' + col.map(v => Math.round(v * 50)).join(',');
  if (!s._f[key]) {
    const c = mkCanvas(s.c.width, s.c.height), g = c.getContext('2d');
    g.drawImage(s.c, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = css(col); g.globalAlpha = q / 12; g.fillRect(0, 0, c.width, c.height);
    s._f[key] = c;
  }
  return s._f[key];
}

// attachment points sampled from the rest (kneeling) pose
let GROWTH = null;
function buildGrowth() {
  if (GROWTH) return GROWTH;
  buildGrowthSprites();
  const rest = P_KNEEL();
  const Mw = evalPose(rest);
  const rng = new RNG(777);
  const tops = [], sides = [];
  ROBOT.parts.forEach((p, pi) => {
    const m = p.mat; if (!(m.moss >= 0.6) || (m.type !== 0 && m.type !== 1)) return;
    const M = M4.mul(Mw[JIDX[p.joint]], p.local);
    const pos = p.mesh.pos, nrm = p.mesh.nrm;
    for (let i = 0; i < pos.length; i += 3 * 3) {
      const lp = [pos[i], pos[i + 1], pos[i + 2]], ln = [nrm[i], nrm[i + 1], nrm[i + 2]];
      const wp = M4.xform(M, lp), wn = V3.norm(M4.xdir(M, ln));
      const jl = M4.xform(p.local, lp), jn = V3.norm(M4.xdir(p.local, ln));
      const e = { joint: p.joint, off: jl, n: jn, rest: wp, restN: wn, moss: m.moss };
      if (wn[1] > 0.82) tops.push(e); else if (Math.abs(wn[1]) < 0.3 && wp[1] > 3) sides.push(e);
    }
  });
  const pick = (arr, n, minD, out = []) => {
    for (let tries = 0; tries < n * 40 && out.length < n; tries++) {
      const e = arr[rng.int(0, arr.length - 1)];
      if (out.some(o => V3.len(V3.sub(o.rest, e.rest)) < minD)) continue;
      out.push(Object.assign({}, e));
    }
    return out;
  };
  const list = [];
  // saplings: highest point on the left pauldron, and a small one on the head
  const best = (j) => tops.filter(e => e.joint === j).sort((a, b) => b.rest[1] - a.rest[1])[3];
  const sL = best('shL'), hd = best('head');
  if (sL) list.push(Object.assign({}, sL, { type: 'sapling', v: 0, size: 1.35, keep: true }));
  if (hd) list.push(Object.assign({}, hd, { type: 'sapling', v: 1, size: 0.8, keep: true, dx: 0.1 }));
  const LAND = [0.45, 1.55, 0.95];
  const tops2 = tops.filter(e => !(e.joint === 'shL' && V3.len(V3.sub(e.off, LAND)) < 1.3));
  const tufts = pick(tops2, 34, 0.75, list.slice());
  for (const e of tufts.slice(list.length)) {
    const r = rng.next();
    e.type = r < 0.55 ? 'tuft' : r < 0.82 ? 'flower' : 'fern';
    e.v = rng.int(0, 5); e.size = rng.range(0.75, 1.35); e.keep = rng.next() < 0.45;
    list.push(e);
  }
  for (const e of pick(sides.filter(e => e.moss >= 0.8 && e.joint !== 'head'), 22, 0.7)) { e.type = 'vine'; e.v = rng.int(0, 7); e.size = rng.range(0.8, 1.3); e.keep = false; list.push(e); }
  list.forEach((e, i) => { e.seed = i * 7.31; e.rel = rng.range(0, 1); });
  GROWTH = list;
  return list;
}
// world-anchored ground plants for a shot: pts [[x,z,type,size]]
function groundGrowth(pts, seed = 1) {
  const rng = new RNG(seed);
  return pts.map(([x, z, type, size]) => ({ world: [x, 0, z], restN: [0, 1, 0], type, v: rng.int(0, 7), size: size || rng.range(0.8, 1.3), keep: true, seed: rng.next() * 100 }));
}

// figure out where each attachment is now; o: {Mw, t (shot time), fall:{t0, poseAt}}
function growthPlace(list, cam, Mw, o = {}) {
  const out = [];
  const tq = Math.floor((o.t || 0) * 12) / 12; // sway on twos
  for (const e of list) {
    let p, n, fallen = 0, spin = 0, fdt = 0;
    if (e.world) { p = e.world; n = [0, 1, 0]; }
    else {
      const M = Mw[JIDX[e.joint]];
      p = M4.xform(M, e.off); n = V3.norm(M4.xdir(M, e.n));
      if (o.fall && !e.keep) {
        const tr = o.fall.t0 + e.rel * (o.fall.spread || 2.0);
        const dt = (o.t || 0) - tr;
        if (dt > 0) {
          if (!e._rel || e._relKey !== o.fall.key) { const M0 = evalPose(o.fall.poseAt(tr))[JIDX[e.joint]]; e._rel = M4.xform(M0, e.off); e._relKey = o.fall.key; e._vx = Math.sin(e.seed * 3) * 0.8; e._vz = Math.cos(e.seed * 5) * 0.8; }
          const y = e._rel[1] - 4.9 * dt * dt * 0.8;
          p = [e._rel[0] + e._vx * dt, Math.max(y, 0.2), e._rel[2] + e._vz * dt];
          fallen = y < 0.2 ? 2 : 1; fdt = dt;
          spin = e.type === 'vine' ? Math.sin(dt * 4 + e.seed) * 0.22 * clamp(dt * 3) : dt * (1.5 + (e.seed % 1) * 2) * (e.seed % 2 > 1 ? 1 : -1);
          n = [0, 1, 0];
          if (fallen === 2) continue; // vanished into the undergrowth
        }
      }
    }
    const sp = cam.project(p);
    if (sp[2] < 0.6) continue;
    const ppm = cam.f / sp[2];
    const arr = GSPR[e.type]; const s = arr[e.v % arr.length];
    // facing: skip items on surfaces facing straight away when the base is hidden
    out.push({ e, p, n, sp, ppm, s, fallen, spin, fdt, sway: Math.sin(tq * 2.1 + e.seed) * 0.03 + Math.sin(tq * 5.3 + e.seed * 2) * 0.012 });
  }
  return out;
}
function growthDraw(g, items, L, o = {}) {
  for (const it of items) {
    const { s, sp, ppm, e } = it;
    let hpx = s.m * ppm * e.size; const wpx = s.c.width / s.c.height * hpx;
    if (it.fallen && s.hang) hpx *= Math.max(0.35, 1 - it.fdt * 0.7); // a falling vine bunches up
    if (hpx < 2) continue;
    const fk = 1 - Math.exp(-Math.max(sp[2] - (L.fog ? L.fog[1] : 18), 0) * (L.fog ? L.fog[0] : 0));
    const img = sprFog(s, L.fogCol || [1, 1, 1], fk * 0.9 + (o.shade || 0));
    g.save();
    g.translate(sp[0] + (e.dx || 0) * ppm, sp[1]);
    g.rotate(it.spin + (s.hang ? it.sway * 0.6 : it.sway));
    if ((e.seed | 0) % 2) g.scale(-1, 1);
    if (s.hang) { // vines stop at the ground
      const maxPx = Math.max(0, (it.p[1] - 0.15) * ppm), k = clamp(maxPx / hpx, 0, 1);
      if (k > 0.02) g.drawImage(img, 0, 0, s.c.width, s.c.height * k, -s.ax / s.c.width * wpx, -s.ay / s.c.height * hpx, wpx, hpx * k);
    } else g.drawImage(img, -s.ax / s.c.width * wpx, -s.ay / s.c.height * hpx, wpx, hpx);
    g.restore();
  }
}
// plants crowding the robot's knees, hand and foot + a scatter around the clearing
function baseGrowth(seed) {
  const rng = new RNG(seed), pts = [];
  const ring = (cx, cz, r, n, types) => { for (let i = 0; i < n; i++) { const a = rng.next() * TAU, d = r * Math.sqrt(rng.range(0.3, 1)); pts.push([cx + Math.cos(a) * d, cz + Math.sin(a) * d, rng.pick(types), rng.range(0.8, 1.5)]); } };
  const sz = (a, b) => { const n = pts.length; return () => { pts[pts.length - 1][3] = rng.range(a, b); }; };
  const ringS = (cx, cz, r, n, types, a, b) => { for (let i = 0; i < n; i++) { const an = rng.next() * TAU, d = r * Math.sqrt(rng.range(0.15, 1)); pts.push([cx + Math.cos(an) * d, cz + Math.sin(an) * d, rng.pick(types), rng.range(a, b)]); } };
  ringS(0, 0.6, 5.0, 46, ['tuft', 'tuft', 'flower', 'fern', 'fern'], 1.6, 3.0);
  ringS(0, 0.6, 10, 34, ['tuft', 'flower', 'fern', 'fern'], 1.4, 2.6);
  return groundGrowth(pts, seed);
}
// drop ground plants that would sit between a close camera and its subject
function clearView(plants, C, target, rad = 2.2) {
  const d = V3.sub(target, C), L = V3.len(d), u = V3.mul(d, 1 / L);
  return plants.filter(p => {
    if (!p.world) return true;
    const w = V3.sub(p.world, C), s = V3.dot(w, u);
    if (s < 0 || s > L - 0.4) return true;
    const perp = V3.len(V3.sub(w, V3.mul(u, s)));
    return perp > rad * (0.4 + 0.6 * s / L) + p.size * 0.4;
  });
}
