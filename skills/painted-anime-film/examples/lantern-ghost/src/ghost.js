// ---------- the lantern ghost: a soft sheet spirit with a wick-curl at its crown ----------
// Body, sleeves, eyes and wick are rings of points pushed through one deform function per drawing,
// so everything bends together and stays on-model. Body local space: hem at y = 0, crown at y = 1.58, face +z.
const GH = {
  prof: spline([[0.58, 0.0], [0.55, 0.1], [0.49, 0.28], [0.43, 0.5], [0.39, 0.72], [0.375, 0.9], [0.385, 1.05], [0.39, 1.16],
    [0.375, 1.27], [0.33, 1.38], [0.25, 1.47], [0.15, 1.535], [0.05, 1.572], [0.004, 1.582]], 38),
  N: 48, gm: null,
  col: { body: [0.87, 0.89, 0.94], shade: [0.55, 0.57, 0.72], eye: [0.11, 0.09, 0.15], inside: [0.09, 0.08, 0.14],
    wick: [0.8, 0.84, 0.92], warm: [1.0, 0.88, 0.66], wickHot: [1.0, 0.78, 0.4], eyeGlow: [0.86, 0.95, 1.0], coat: [0.06, 0.055, 0.1], night: [0.42, 0.45, 0.62] },
};
// profile radius at height y (rest)
function ghR(y) {
  const P = GH.prof;
  if (y <= P[0][1]) return P[0][0];
  for (let i = 1; i < P.length; i++) if (y <= P[i][1]) return lerp(P[i - 1][0], P[i][0], (y - P[i - 1][1]) / (P[i][1] - P[i - 1][1]));
  return 0;
}
// default pose / state of one drawing
function ghostState(o = {}) {
  return Object.assign({
    p: [0, 0, 0], yaw: 0, s: 1,
    sy: 1, lean: [0, 0], flut: 1, ph: 0, drag: [0, 0], pull: 0, pullDepth: 1,
    armL: 0.15, armR: 0.15, fwdL: 0, fwdR: 0, look: [0, 0], blink: 0,
    wick: 0, emit: 0, eyeGlow: 0, coat: null, coatA: 1, coatCol: null, coatNoise: 0.22, coatEmit: 0, wickBend: 0, night: 0,
  }, o);
}
// the deform: rest point (body space) -> drawn point (body space)
function ghDeform(p, s) {
  let [x, y, z] = p;
  if (s.pull) { // hem drawn down into the pool like taffy
    const w = clamp(1 - y / 0.55), k = w * w * (3 - 2 * w);
    y -= s.pull * k * s.pullDepth; const sc = 1 - 0.6 * s.pull * k; x *= sc; z *= sc;
  }
  const h = clamp(1 - y / 0.8), w2 = h * h, th = Math.atan2(z, x);
  if (s.flut) {
    const dr = s.flut * w2 * (0.055 * Math.sin(3 * th + s.ph) + 0.032 * Math.sin(5 * th - 1.7 * s.ph + 1.3));
    const rr = Math.hypot(x, z) || 1e-6; x += x / rr * dr; z += z / rr * dr;
    y += s.flut * w2 * 0.04 * Math.sin(4 * th + 1.3 * s.ph);
  }
  x -= s.drag[0] * w2; z -= s.drag[1] * w2; y += Math.hypot(s.drag[0], s.drag[1]) * w2 * 0.35;
  y *= s.sy; const q = 1 / Math.sqrt(s.sy); x *= q; z *= q;
  const b = Math.pow(Math.max(0, y) / 1.58, 2);
  x += s.lean[0] * b; z += s.lean[1] * b; y -= 0.45 * (s.lean[0] ** 2 + s.lean[1] ** 2) * b;
  return [x, y, z];
}
function ghSurf(th, y, inset = 1) { const r = ghR(y) * inset; return [r * Math.cos(th), y, r * Math.sin(th)]; }
function ghSurfN(th, y) { // rest surface normal
  const dy = 0.01, dr = (ghR(y + dy) - ghR(y - dy)) / (2 * dy);
  return V3.norm([Math.cos(th), -dr, Math.sin(th)]);
}
function ghBodyRings(s) {
  const N = GH.N, rings = [];
  for (const [r, y] of GH.prof) {
    const ring = [];
    for (let j = 0; j < N; j++) {
      const th = j / N * TAU;
      let yy = y;
      if (y < 0.26) yy -= 0.075 * Math.pow(1 - y / 0.26, 1.5) * (0.5 + 0.5 * Math.cos(5 * th + 0.3)); // scalloped hem
      ring.push(ghDeform([r * Math.cos(th), yy, r * Math.sin(th)], s));
    }
    rings.push(ring);
  }
  return rings;
}
// an ellipsoid sitting on the surface at (th, y): semi-axes a (across), b (up), c (depth)
function ghBlobRings(th, y, a, b, c, s, m = 10, n = 16) {
  const C = ghSurf(th, y, 0.975), Nw = ghSurfN(th, y);
  const U = V3.norm(V3.cross([0, 1, 0], Nw)), Vv = V3.cross(Nw, U);
  const rings = [];
  for (let i = 0; i <= m; i++) {
    const v = -Math.PI / 2 + Math.PI * i / m, cv = Math.cos(v), sv = Math.sin(v), ring = [];
    for (let j = 0; j < n; j++) {
      const u = j / n * TAU;
      const P = V3.add(C, V3.add(V3.add(V3.mul(U, a * cv * Math.cos(u)), V3.mul(Vv, b * sv)), V3.mul(Nw, c * cv * Math.sin(u))));
      ring.push(ghDeform(P, s));
    }
    rings.push(ring);
  }
  return rings;
}
function ghSleeveRings(side, s) {
  const arm = side > 0 ? s.armR : s.armL, fwd = side > 0 ? s.fwdR : s.fwdL;
  const th = side > 0 ? 0.42 : Math.PI - 0.42, y0 = 0.98;
  const root = ghSurf(th, y0, 0.9);
  const out = [Math.cos(th), 0, Math.sin(th)];
  // hanging: out a little and down; raised: straight out and a bit up; fwd swings it toward the face
  const ang = lerp(-1.05, 0.4, arm);
  let d = V3.norm(V3.add(V3.mul(out, Math.cos(ang)), [0, Math.sin(ang), 0]));
  d = V3.norm(V3.add(V3.mul(d, 1 - Math.abs(fwd) * 0.6), [0, 0, fwd * 0.9]));
  const L = 0.4, sh0 = V3.add(root, V3.add(V3.mul(out, 0.1), [0, 0.015, 0]));
  const droop = -0.07 * (1 - arm * 0.7);
  const pts = spline([root, sh0, V3.add(sh0, V3.add(V3.mul(d, L * 0.5), [0, droop * 0.3, 0])), V3.add(sh0, V3.add(V3.mul(d, L), [0, droop + 0.025 * Math.sin(s.ph * 0.7) * s.flut, 0]))], 10);
  // fat where it leaves the body, narrow at the elbow, flared open cuff
  const rings = tubeRings(pts, (i, t) => lerp(0.13, 0.082, smooth(0, 0.55, t)) + 0.05 * smooth(0.6, 1, t), { n: 18, rz: 0.78 });
  const last = rings[rings.length - 1], c = last.reduce((a, p) => V3.add(a, V3.mul(p, 1 / last.length)), [0, 0, 0]);
  for (let j = 0; j < last.length; j++) { // scalloped cuff that flutters
    const k = 1 + 0.07 * Math.cos(j / last.length * TAU * 3 + 0.5) ;
    last[j] = V3.add(V3.add(c, V3.mul(V3.sub(last[j], c), k)), [0, 0.02 * Math.sin(j * 1.9 + s.ph) * s.flut - 0.02 * (0.5 + 0.5 * Math.cos(j / last.length * TAU * 3)), 0]);
  }
  return rings.map(r => r.map(p => ghDeform(p, s)));
}
function ghWickRings(s) {
  const bend = s.wickBend + 0.06 * Math.sin(s.ph * 1.3);
  const ctrl = [[0, 1.55, 0], [0.0, 1.66, -0.02], [0.03 + bend * 0.3, 1.77, -0.06], [0.03 + bend * 0.7, 1.86, -0.12], [-0.03 + bend, 1.9, -0.1]];
  const pts = spline(ctrl, 14);
  return tubeRings(pts, (i, t) => 0.06 * Math.pow(1 - t, 0.85) * (1 + 0.35 * Math.sin(t * Math.PI)), { n: 12 }).map(r => r.map(p => ghDeform(p, s)));
}
// GL items for one drawing. o: {seedless}; returns {items, M (model matrix), chest (world), crown (world)}
function ghostItems(st) {
  const s = ghostState(st);
  const C = GH.col;
  const meshes = {
    body: gridMesh(ghBodyRings(s)),
    cap: gridMesh([ghBodyRings(s)[3].map(p => [p[0] * 0.92, p[1] + 0.06, p[2] * 0.92])], { capA: true }),
    eyeL: gridMesh(ghBlobRings(Math.PI / 2 + 0.33 + s.look[0] * 0.28, 1.17 + s.look[1] * 0.08, 0.06, 0.092 * (1 - 0.92 * s.blink), 0.03, s), { capA: true, capB: true }),
    eyeR: gridMesh(ghBlobRings(Math.PI / 2 - 0.33 + s.look[0] * 0.28, 1.17 + s.look[1] * 0.08, 0.06, 0.092 * (1 - 0.92 * s.blink), 0.03, s), { capA: true, capB: true }),
    slvL: gridMesh(ghSleeveRings(-1, s), { capB: true }),
    slvR: gridMesh(ghSleeveRings(1, s), { capB: true }),
    wick: gridMesh(ghWickRings(s), { capA: true }),
  };
  if (!GH.gm) GH.gm = {};
  for (const k in meshes) { const f = finalize(meshes[k]); if (!GH.gm[k]) GH.gm[k] = glMesh(f); else glUpdateMesh(GH.gm[k], f); }
  const M = MUL(T(...s.p), RY(s.yaw), M4.scale(s.s, s.s, s.s));
  const coat = s.coat == null ? {} : { coat: s.coat, coatCol: s.coatCol || C.coat, coatA: s.coatA, coatNoise: s.coatNoise, coatEmit: s.coatEmit };
  const body = Object.assign({ type: 6, col: mixc(C.body, C.warm, s.emit * 0.22), col2: mixc(mixc(C.shade, C.night, s.night), mixc(C.shade, C.warm, 0.4), s.emit), id: 3001, emit: s.emit * 0.12, emitCol: C.warm, twoSided: true }, coat);
  const items = [
    { gm: GH.gm.body, model: M, mat: body },
    { gm: GH.gm.cap, model: M, mat: Object.assign({ type: 4, col: C.inside, id: 3007, twoSided: true }, coat) },
    { gm: GH.gm.slvL, model: M, mat: body },
    { gm: GH.gm.slvR, model: M, mat: body },
    { gm: GH.gm.eyeL, model: M, mat: { type: 2, col: C.eye, id: 3002, emit: s.eyeGlow, emitCol: C.eyeGlow, twoSided: true } },
    { gm: GH.gm.eyeR, model: M, mat: { type: 2, col: C.eye, id: 3003, emit: s.eyeGlow, emitCol: C.eyeGlow, twoSided: true } },
    { gm: GH.gm.wick, model: M, mat: Object.assign({ type: 5, col: mixc(C.wick, C.body, 0.3), id: 3006, emit: s.wick, emitCol: C.wickHot, twoSided: true }, coat) },
  ];
  const chest = M4.xform(M, ghDeform([0, 0.85, 0.1], s)), crown = M4.xform(M, ghDeform([0, 1.86, -0.08], s));
  const head = M4.xform(M, ghDeform([0, 1.2, 0.3], s));
  return { items, M, s, chest, crown, head, hem: (th) => M4.xform(M, ghDeform([0.58 * Math.cos(th), -0.02, 0.58 * Math.sin(th)], s)),
    surf: (th, y) => M4.xform(M, ghDeform(ghSurf(th, y), s)),
    cuff: (side) => { const r = ghSleeveRings(side, s), l = r[r.length - 1]; return M4.xform(M, l.reduce((a, p) => V3.add(a, V3.mul(p, 1 / l.length)), [0, 0, 0])); } };
}
// the ghost's own light, drawn in compositing: a soft core glow and a hot wick
function ghostGlow(g, cam, G, amt, o = {}) {
  if (amt <= 0.001) return;
  const c = cam.project(G.chest), w = cam.project(G.crown);
  const sc = cam.f / c[2] * (G.s.s || 1);
  glowFx(g, c[0], c[1], sc * 1.6 * (o.r || 1), o.col || [1, 0.86, 0.62], 0.28 * amt, 'screen');
  glowFx(g, w[0], w[1], sc * 0.35, o.wickCol || [1, 0.8, 0.45], 0.55 * amt * (o.wick ?? 1), 'lighter');
}
