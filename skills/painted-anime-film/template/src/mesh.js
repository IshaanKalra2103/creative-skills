// ---------- mesh builders: loft / lathe / rounded box, merged and uploaded with glMesh ----------
// mesh helpers -------------------------------------------------------------
function ringSE(n, rx, rz, p = 2, cx = 0, cz = 0, phase = 0) {
  const r = [];
  for (let j = 0; j < n; j++) {
    const a = j / n * TAU + phase, c = Math.cos(a), s = Math.sin(a);
    r.push([cx + rx * Math.sign(c) * Math.pow(Math.abs(c), 2 / p), cz + rz * Math.sign(s) * Math.pow(Math.abs(s), 2 / p)]);
  }
  return r;
}
// sections: [{y, ring:[[x,z]...]}] or [y, rx, rz, p?, cx?, cz?]
function loft(secs, o = {}) {
  const n = o.n || 24;
  const S = secs.map(s => Array.isArray(s) ? { y: s[0], ring: ringSE(n, s[1], s[2], s[3] ?? o.p ?? 2, s[4] || 0, s[5] || 0, o.phase || 0) } : s);
  const R = S.length, N = S[0].ring.length;
  // grid positions
  let G = S.map(s => s.ring.map(([x, z]) => [x, s.y, z]));
  if (o.deform) G = G.map(row => row.map(p => o.deform(p.slice())));
  const pos = [], nrm = [], idx = [];
  const faces = []; // {v:[p0,p1,p2,p3], n, grid:[[i,j]...]}
  const fn = (a, b, c) => V3.norm(V3.cross(V3.sub(b, a), V3.sub(c, a)));
  const closed = o.open ? N - 1 : N;
  for (let i = 0; i < R - 1; i++) for (let j = 0; j < closed; j++) {
    const j1 = (j + 1) % N;
    const q = [G[i][j], G[i][j1], G[i + 1][j1], G[i + 1][j]];
    let nn = fn(q[0], q[1], q[2]);
    if (!isFinite(nn[0]) || V3.len(nn) < 0.5) nn = fn(q[0], q[2], q[3]);
    faces.push({ q, n: nn, g: [[i, j], [i, j1], [i + 1, j1], [i + 1, j]] });
  }
  // orient outward using centroid of the whole loft along each ring
  for (const f of faces) {
    const fc = V3.mul(V3.add(V3.add(f.q[0], f.q[1]), V3.add(f.q[2], f.q[3])), 0.25);
    const i = f.g[0][0];
    const cen = [0, 0, 0]; for (const p of G[i]) { cen[0] += p[0]; cen[1] += p[1]; cen[2] += p[2]; }
    const cen2 = [0, 0, 0]; for (const p of G[i + 1]) { cen2[0] += p[0]; cen2[1] += p[1]; cen2[2] += p[2]; }
    const cc = V3.mul(V3.add(cen, cen2), 0.5 / N);
    if (V3.dot(f.n, V3.sub(fc, cc)) < 0) { f.q.reverse(); f.g.reverse(); f.n = V3.mul(f.n, -1); }
  }
  // auto smooth
  const cosT = Math.cos((o.smooth ?? 40) * Math.PI / 180);
  const adj = new Map();
  const key = (i, j) => i * 10000 + j;
  for (const f of faces) for (const [i, j] of f.g) { const k = key(i, j); if (!adj.has(k)) adj.set(k, []); adj.get(k).push(f.n); }
  for (const f of faces) {
    const base = pos.length / 3;
    for (let k = 0; k < 4; k++) {
      const [i, j] = f.g[k];
      let s = [0, 0, 0];
      for (const nn of adj.get(key(i, j))) if (V3.dot(nn, f.n) >= cosT) s = V3.add(s, nn);
      s = V3.norm(s);
      pos.push(...f.q[k]); nrm.push(...s);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  // caps
  const cap = (row, up) => {
    const cen = [0, 0, 0]; for (const p of row) { cen[0] += p[0] / N; cen[1] += p[1] / N; cen[2] += p[2] / N; }
    let nn = [0, up ? 1 : -1, 0];
    // compute actual normal from polygon
    let acc = [0, 0, 0];
    for (let j = 0; j < N; j++) acc = V3.add(acc, V3.cross(V3.sub(row[j], cen), V3.sub(row[(j + 1) % N], cen)));
    if (V3.len(acc) > 1e-6) { acc = V3.norm(acc); if (V3.dot(acc, nn) < 0) acc = V3.mul(acc, -1); nn = acc; }
    const base = pos.length / 3;
    pos.push(...cen); nrm.push(...nn);
    for (let j = 0; j < N; j++) { pos.push(...row[j]); nrm.push(...nn); }
    for (let j = 0; j < N; j++) {
      const a = base + 1 + j, b = base + 1 + (j + 1) % N;
      const t = V3.cross(V3.sub(row[j], cen), V3.sub(row[(j + 1) % N], cen));
      if (V3.dot(t, nn) >= 0) idx.push(base, a, b); else idx.push(base, b, a);
    }
  };
  if (o.capB !== false) cap(G[0], false);
  if (o.capT !== false) cap(G[R - 1], true);
  return { pos, nrm, idx };
}
// lathe profile [[r,y],...] around Y
function lathe(prof, o = {}) { return loft(prof.map(([r, y]) => [y, r, r, 2]), Object.assign({ n: o.n || 24 }, o)); }
function xformMesh(m, M) {
  const pos = [], nrm = [];
  for (let i = 0; i < m.pos.length; i += 3) {
    const p = M4.xform(M, [m.pos[i], m.pos[i + 1], m.pos[i + 2]]);
    const n = V3.norm(M4.xdir(M, [m.nrm[i], m.nrm[i + 1], m.nrm[i + 2]]));
    pos.push(...p); nrm.push(...n);
  }
  return { pos, nrm, idx: m.idx.slice() };
}
function mergeMesh(list) {
  const pos = [], nrm = [], idx = [];
  for (const m of list) { const b = pos.length / 3; pos.push(...m.pos); nrm.push(...m.nrm); for (const i of m.idx) idx.push(i + b); }
  return { pos, nrm, idx };
}
function finalize(m) { return { pos: new Float32Array(m.pos), nrm: new Float32Array(m.nrm), idx: new Uint32Array(m.idx) }; }
// boxy helper: rounded box w,h,d centered, y from -h/2..h/2
function rbox(w, h, d, p = 6, o = {}) {
  return loft([[-h / 2, w / 2 * 0.92, d / 2 * 0.92, p], [-h / 2 + (o.b ?? 0.06), w / 2, d / 2, p], [h / 2 - (o.b ?? 0.06), w / 2, d / 2, p], [h / 2, w / 2 * 0.92, d / 2 * 0.92, p]], Object.assign({ n: 16, smooth: 50 }, o));
}
const T = M4.trans, RX = M4.rotX, RY = M4.rotY, RZ = M4.rotZ, MUL = (...ms) => ms.reduce((a, b) => M4.mul(a, b));

// ---------- deformable meshes: rings of points -> indexed mesh with smooth normals ----------
// rings: [[ [x,y,z] x n ] x R], each ring goes around the same way. Rebuild every drawing for soft bodies
// (cloth, ghosts, tails): it is cheap (a few thousand vertices). o: {capA, capB} close the first / last ring
// with a fan, {open:true} leaves the seam open (no wrap). Returns {pos, nrm, idx} plain arrays; pass to finalize().
function gridMesh(rings, o = {}) {
  const R = rings.length, n = rings[0].length, wrap = !o.open;
  const P = (i, j) => rings[Math.max(0, Math.min(R - 1, i))][wrap ? (j + n) % n : Math.max(0, Math.min(n - 1, j))];
  const cen = rings.map(r => { const c = [0, 0, 0]; for (const p of r) { c[0] += p[0] / n; c[1] += p[1] / n; c[2] += p[2] / n; } return c; });
  const pos = [], nrm = [], idx = [];
  for (let i = 0; i < R; i++) for (let j = 0; j < n; j++) {
    const p = P(i, j);
    let du = V3.sub(P(i, j + 1), P(i, j - 1)), dv = V3.sub(P(i + 1, j), P(i - 1, j));
    let nn = V3.cross(du, dv);
    if (V3.len(nn) < 1e-9) nn = V3.sub(p, cen[Math.max(0, i - 1)]);
    nn = V3.norm(nn);
    const out = V3.sub(p, cen[i]);
    if (V3.len(out) > 1e-6 && V3.dot(nn, out) < 0) nn = V3.mul(nn, -1);
    pos.push(...p); nrm.push(...nn);
  }
  const cols = wrap ? n : n - 1;
  for (let i = 0; i < R - 1; i++) for (let j = 0; j < cols; j++) {
    const a = i * n + j, b = i * n + (j + 1) % n, c = (i + 1) * n + (j + 1) % n, d = (i + 1) * n + j;
    idx.push(a, b, c, a, c, d);
  }
  const cap = (i, sign) => {
    const base = pos.length / 3, c = cen[i];
    const ax = V3.norm(V3.sub(cen[i], cen[i - sign] || cen[i]));
    pos.push(...c); nrm.push(...(isFinite(ax[0]) ? ax : [0, sign, 0]));
    for (let j = 0; j < n; j++) { pos.push(...rings[i][j]); nrm.push(...(isFinite(ax[0]) ? ax : [0, sign, 0])); }
    for (let j = 0; j < n; j++) idx.push(base, base + 1 + j, base + 1 + (j + 1) % n);
  };
  if (o.capA) cap(0, -1);
  if (o.capB) cap(R - 1, 1);
  // winding does not matter for the cel shader (normals are explicit); render with twoSided if a cap faces inward
  return { pos, nrm, idx };
}
// rings around a 3D path (parallel-transport frames): pts [[x,y,z]...], radii number | [r...] | (i, t) => r
// o: {n: segments, rz: ellipse ratio, twist}
function tubeRings(pts, radii, o = {}) {
  const n = o.n || 12, R = pts.length;
  const rad = (i) => typeof radii === 'function' ? radii(i, i / (R - 1)) : Array.isArray(radii) ? radii[i] : radii;
  let t0 = V3.norm(V3.sub(pts[1], pts[0]));
  let Nn = V3.norm(V3.cross(t0, Math.abs(t0[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
  const rings = [];
  for (let i = 0; i < R; i++) {
    const t = V3.norm(V3.sub(pts[Math.min(R - 1, i + 1)], pts[Math.max(0, i - 1)]));
    Nn = V3.norm(V3.sub(Nn, V3.mul(t, V3.dot(Nn, t))));
    const B = V3.cross(t, Nn), r = rad(i), tw = (o.twist || 0) * i / (R - 1);
    const ring = [];
    for (let j = 0; j < n; j++) {
      const a = j / n * TAU + tw;
      ring.push(V3.add(pts[i], V3.add(V3.mul(Nn, Math.cos(a) * r), V3.mul(B, Math.sin(a) * r * (o.rz || 1)))));
    }
    rings.push(ring);
  }
  return rings;
}
function tube(pts, radii, o = {}) { return gridMesh(tubeRings(pts, radii, o), { capA: o.capA !== false, capB: o.capB !== false }); }
// Catmull-Rom through control points -> m samples (for smooth profiles and paths)
function spline(ctrl, m) {
  const out = [], k = ctrl.length - 1;
  for (let s = 0; s < m; s++) {
    const u = s / (m - 1) * k, i = Math.min(k - 1, Math.floor(u)), t = u - i;
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(k, i + 2)];
    out.push(p1.map((_, d) => 0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t * t + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t * t * t)));
  }
  return out;
}
