// ---------- the Guardian: original giant robot, built from lofted forms ----------
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

// palette (albedo under neutral light)
const RCOL = {
  ivory: hx('d8cfb4'), ivory2: hx('cbbf9f'), slate: hx('6f7d86'), joint: hx('45474f'), dark: hx('2e3037'),
  red: hx('a8604a'), glass: hx('1e2b33'), glow: hx('c9fff2'), moss: hx('5d7a2c'), moss2: hx('7f9638'), bark: hx('5a4a3a'),
};

// rig ------------------------------------------------------------------------
const JOINTS = [
  // name, parent, offset
  ['root', null, [0, 0, 0]],
  ['waist', 'root', [0, 0.8, 0]],
  ['chest', 'waist', [0, 1.5, 0]],
  ['neck', 'chest', [0, 4.05, 0.35]],
  ['head', 'neck', [0, 0.75, 0.15]],
  ['shL', 'chest', [3.95, 3.05, 0.1]], ['elL', 'shL', [0, -3.35, 0]], ['wrL', 'elL', [0, -3.9, 0]],
  ['shR', 'chest', [-3.95, 3.05, 0.1]], ['elR', 'shR', [0, -3.35, 0]], ['wrR', 'elR', [0, -3.9, 0]],
  ['hipL', 'root', [1.75, -0.7, 0]], ['knL', 'hipL', [0, -3.2, 0]], ['anL', 'knL', [0, -3.0, 0]],
  ['hipR', 'root', [-1.75, -0.7, 0]], ['knR', 'hipR', [0, -3.2, 0]], ['anR', 'knR', [0, -3.0, 0]],
  ['back', 'chest', [0, 2.0, -2.9]],
];
for (const s of ['L', 'R']) for (let f = 0; f < 4; f++) {
  JOINTS.push([`f${s}${f}a`, 'wr' + s, [0, 0, 0]]); JOINTS.push([`f${s}${f}b`, `f${s}${f}a`, [0, -0.62, 0]]);
}
const JIDX = {}; JOINTS.forEach((j, i) => JIDX[j[0]] = i);

const ROBOT = { parts: [], built: false };
function addPart(joint, mesh, M, mat) { ROBOT.parts.push({ joint, mesh: finalize(mesh), local: M || M4.ident(), mat }); }

function buildRobot() {
  const A = (o) => Object.assign({ type: 0, col: RCOL.ivory, rust: 0.6, chip: 0.6, moss: 0.6 }, o);
  const J = (o) => Object.assign({ type: 1, col: RCOL.joint, rust: 0.7, moss: 0.35 }, o);
  let id = 1; const nid = () => (id += 1);
  // ---- pelvis ----
  addPart('root', loft([[-1.0, 1.5, 1.15], [-0.55, 2.15, 1.5], [0.35, 2.3, 1.6], [0.85, 1.85, 1.35]], { p: 3, n: 20 }), null, J({ col: RCOL.slate, id: nid() }));
  // skirt plates
  const skirt = (w, h) => loft([[-h / 2, w / 2, 0.16, 8], [h / 2, w / 2, 0.16, 8]], { n: 16, deform: (p) => { p[2] -= 0.12 * p[0] * p[0]; return p; } });
  addPart('root', skirt(2.4, 1.5), MUL(T(0, -0.75, 1.62), RX(-0.22)), A({ id: nid(), stripe: 0.45, col2: RCOL.red }));
  addPart('root', skirt(2.6, 1.4), MUL(T(0, -0.7, -1.62), RY(Math.PI), RX(-0.2)), A({ id: nid() }));
  for (const s of [1, -1]) addPart('root', skirt(2.0, 1.7), MUL(T(s * 2.35, -0.55, 0), RY(s * Math.PI / 2), RX(-0.18)), A({ id: nid() }));
  // ---- waist (segmented) ----
  addPart('waist', loft([[-0.3, 1.55, 1.2], [0.35, 1.7, 1.3], [0.6, 1.6, 1.25]], { p: 2.6, n: 20 }), null, J({ col: RCOL.slate, id: nid() }));
  addPart('waist', loft([[0.65, 1.75, 1.35], [1.2, 1.9, 1.45], [1.45, 1.8, 1.4]], { p: 2.6, n: 20 }), null, J({ col: RCOL.slate, id: nid() }));
  // ---- chest barrel ----
  addPart('chest', loft([[0.0, 2.4, 1.8, 2.6, 0, 0.1], [0.55, 3.0, 2.2, 2.6, 0, 0.25], [1.5, 3.45, 2.5, 2.7, 0, 0.36], [2.7, 3.55, 2.48, 2.7, 0, 0.32], [3.5, 3.25, 2.25, 2.6, 0, 0.12], [4.05, 2.55, 1.85, 2.4, 0, 0.0]], { n: 32, smooth: 45 }), null, A({ id: nid(), moss: 0.75, stripe: 0, dirt: 0 }));
  // chest front armor plate (raised panel)
  addPart('chest', loft([[0.9, 2.1, 0.18, 6], [3.1, 2.3, 0.18, 6]], { n: 16, deform: (p) => { p[2] += 2.62 - 0.11 * p[0] * p[0]; return p; } }), null, A({ id: nid(), col: RCOL.ivory2 }));
  // core hatch ring + glass + grille
  const coreM = MUL(T(0, 2.05, 2.78), RX(Math.PI / 2));
  addPart('chest', lathe([[1.15, -0.05], [1.18, 0.25], [0.98, 0.38], [0.82, 0.28], [0.8, 0.0]], { n: 28, smooth: 40 }), coreM, J({ id: nid(), col: RCOL.slate }));
  addPart('chest', lathe([[0.82, 0.0], [0.6, 0.12], [0.0, 0.16]], { n: 28, smooth: 60, capB: false }), MUL(coreM, T(0, -0.05, 0)), { type: 5, col: hx('2a3a40'), id: nid(), emit: 0, emitCol: RCOL.glow, isCore: true });
  for (let k = -1; k <= 1; k++) addPart('chest', rbox(0.13, 1.55 - Math.abs(k) * 0.3, 0.16, 4), T(k * 0.42, 2.05, 2.97), J({ id: nid(), col: RCOL.dark }));
  addPart('chest', rbox(1.7, 0.2, 0.16, 4), T(0, 2.05, 2.95), J({ id: nid(), col: RCOL.dark }));
  // collar
  addPart('chest', lathe([[1.75, 3.85], [1.8, 4.15], [1.55, 4.45], [1.35, 4.5]], { n: 24 }), T(0, 0, 0.15), J({ id: nid(), col: RCOL.slate, moss: 0.7 }));
  // upper chest vents
  for (const s of [1, -1]) for (let k = 0; k < 3; k++) addPart('chest', rbox(0.9, 0.12, 0.2, 6), MUL(T(s * 2.0, 3.25 - k * 0.24, 2.18 - k * 0.05), RY(s * -0.45), RX(-0.4)), J({ id: nid(), col: RCOL.dark }));
  // ---- back: twin engines + spine ----
  for (const s of [1, -1]) {
    const eng = lathe([[0.75, -2.3], [1.05, -1.9], [1.1, 1.4], [1.0, 2.0], [0.85, 2.15]], { n: 24 });
    addPart('back', eng, MUL(T(s * 1.75, 0, 0), RX(-0.12)), A({ id: nid(), col: RCOL.ivory2, moss: 0.85, stripe: 1.0, col2: RCOL.red }));
    addPart('back', lathe([[0.9, 2.05], [0.95, 2.45], [0.75, 2.5]], { n: 24 }), MUL(T(s * 1.75, 0, 0), RX(-0.12)), J({ id: nid(), col: RCOL.dark }));
    // nozzle bell
    addPart('back', lathe([[0.55, -2.1], [0.75, -2.55], [0.95, -3.05], [0.85, -3.1]], { n: 24, capB: false }), MUL(T(s * 1.75, 0, 0), RX(-0.12)), J({ id: nid(), col: RCOL.dark, twoSided: true }));
    addPart('back', lathe([[0.6, -2.4], [0.0, -2.42]], { n: 20, capT: false }), MUL(T(s * 1.75, 0, 0), RX(-0.12)), { type: 5, col: hx('302826'), id: nid(), emit: 0, emitCol: hx('fff2c8'), isJet: true });
  }
  addPart('back', loft([[-1.6, 0.5, 0.9, 3], [1.6, 0.6, 1.0, 3], [2.3, 0.3, 0.6, 3]], { n: 16 }), T(0, 0, 0.3), A({ id: nid(), moss: 0.9 }));
  // ---- neck ----
  addPart('neck', loft([[-0.2, 0.72, 0.7], [0.2, 0.78, 0.76], [0.35, 0.68, 0.66], [0.55, 0.74, 0.72], [0.85, 0.62, 0.6]], { n: 20 }), null, J({ id: nid() }));
  // ---- head ----
  const headFlat = (p) => { if (p[2] > 0.85) p[2] = 0.85 + (p[2] - 0.85) * 0.45; return p; };
  addPart('head', loft([[-0.35, 0.95, 0.9, 2.4, 0, 0.1], [0.15, 1.32, 1.22, 2.5, 0, 0.15], [0.95, 1.42, 1.32, 2.5, 0, 0.1], [1.65, 1.28, 1.18, 2.4, 0, 0.0], [2.15, 0.85, 0.8, 2.2, 0, -0.05], [2.42, 0.3, 0.3, 2, 0, -0.1]], { n: 32, deform: headFlat, smooth: 50 }), null, A({ id: nid(), moss: 0.95, chip: 0.7 }));
  // heavy brow hood
  addPart('head', loft([[-0.16, 1.25, 0.34, 5], [0.16, 1.22, 0.3, 5]], { n: 20, deform: (p) => { p[2] = p[2] + 1.1 - 0.28 * p[0] * p[0]; return p; } }), MUL(T(0, 1.3, 0.05), RX(0.32)), A({ id: nid(), moss: 1.0, stripe: 0, col: RCOL.ivory2 }));
  // eye sockets + lenses
  for (const s of [1, -1]) {
    addPart('head', lathe([[0.4, 0], [0.43, 0.4], [0.38, 0.5], [0.31, 0.47], [0.3, 0.3]], { n: 24, capT: false }), MUL(T(s * 0.6, 0.86, 0.8), RX(Math.PI / 2), M4.scale(1.2, 1.2, 1.2)), J({ id: nid(), col: RCOL.slate, moss: 0, twoSided: true }));
    addPart('head', lathe([[0.31, 0], [0.24, 0.07], [0.0, 0.1]], { n: 24, capB: false }), MUL(T(s * 0.6, 0.86, 1.16), RX(Math.PI / 2), M4.scale(1.2, 1.2, 1.2)), { type: 2, col: RCOL.glass, id: nid(), emit: 0, emitCol: RCOL.glow, isEye: true });
  }
  // mouth grille
  addPart('head', rbox(1.1, 0.5, 0.3, 6), T(0, 0.22, 0.98), J({ id: nid(), col: RCOL.slate, moss: 0 }));
  for (let k = -2; k <= 2; k++) addPart('head', rbox(0.08, 0.42, 0.14, 4), T(k * 0.2, 0.22, 1.14), J({ id: nid(), col: RCOL.dark, moss: 0 }));
  // ear pods + antennae (one bent)
  for (const s of [1, -1]) {
    addPart('head', lathe([[0.55, -0.3], [0.58, 0.15], [0.45, 0.3], [0.2, 0.32]], { n: 20 }), MUL(T(s * 1.3, 0.95, -0.05), RZ(-s * Math.PI / 2)), J({ id: nid(), col: RCOL.slate, moss: 0.8 }));
  }
  addPart('head', lathe([[0.09, 0], [0.06, 1.7], [0.03, 1.75]], { n: 10 }), MUL(T(1.55, 1.1, -0.15), RZ(-0.35), RX(-0.25)), J({ id: nid(), col: RCOL.dark, moss: 0 }));
  addPart('head', lathe([[0.09, 0], [0.08, 0.9], [0.07, 0.92]], { n: 10 }), MUL(T(-1.55, 1.1, -0.15), RZ(0.35), RX(-0.25)), J({ id: nid(), col: RCOL.dark, moss: 0 }));
  addPart('head', lathe([[0.075, 0], [0.05, 0.7], [0.02, 0.72]], { n: 10 }), MUL(T(-1.55, 1.1, -0.15), RZ(0.35), RX(-0.25), T(0, 0.9, 0), RZ(1.9), RX(0.3)), J({ id: nid(), col: RCOL.dark, moss: 0 }));
  // ---- arms ----
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    // shoulder ball
    addPart('sh' + s, lathe([[0.01, -1.0], [0.75, -0.7], [1.0, 0], [0.75, 0.7], [0.01, 1.0]], { n: 20, smooth: 60 }), null, J({ id: nid() }));
    // pauldron dome
    addPart('sh' + s, lathe([[2.05, -1.25], [2.22, -0.65], [2.12, 0.15], [1.75, 0.85], [1.05, 1.3], [0.25, 1.48], [0.0, 1.5]], { n: 32, smooth: 50, capB: false }), MUL(T(sx * 0.55, 0.25, 0), RZ(-sx * 0.12)), A({ id: nid(), moss: 1.0, stripe: -0.75, col2: RCOL.red, twoSided: true }));
    addPart('sh' + s, lathe([[2.1, -1.25], [2.15, -1.45], [1.6, -1.5]], { n: 32 }), MUL(T(sx * 0.55, 0.25, 0), RZ(-sx * 0.12)), J({ id: nid(), col: RCOL.slate }));
    // upper arm
    addPart('sh' + s, loft([[-0.2, 0.72, 0.72], [-1.2, 0.8, 0.8], [-3.0, 0.72, 0.72], [-3.2, 0.62, 0.62]], { n: 20 }), null, J({ id: nid(), col: RCOL.slate }));
    addPart('el' + s, lathe([[0.01, -0.85], [0.65, -0.6], [0.88, 0], [0.65, 0.6], [0.01, 0.85]], { n: 20, smooth: 60 }), null, J({ id: nid() }));
    // forearm armor
    addPart('el' + s, loft([[-0.3, 0.92, 0.98, 4], [-0.75, 1.15, 1.22, 4], [-2.9, 1.05, 1.12, 4], [-3.55, 0.85, 0.9, 4]], { n: 24, smooth: 45 }), null, A({ id: nid(), moss: 0.8, stripe: -1.2, col2: RCOL.red }));
    addPart('el' + s, loft([[-3.5, 0.78, 0.82], [-3.95, 0.72, 0.76]], { n: 20 }), null, J({ id: nid(), col: RCOL.dark }));
    // hand
    addPart('wr' + s, rbox(0.62, 1.15, 1.3, 4), T(0, -0.55, 0.02), J({ id: nid(), col: RCOL.slate, moss: 0.5 }));
    const fz = [0.42, 0.0, -0.42];
    for (let f = 0; f < 4; f++) {
      const thumb = f === 3;
      const off = thumb ? [sx * -0.15, -0.35, 0.72] : [0, -1.12, fz[f]];
      // finger joint base offsets are written into the joint table at pose time
      ROBOT['fo' + s + f] = off;
      addPart(`f${s}${f}a`, loft([[0.05, 0.24, 0.22, 3], [-0.6, 0.22, 0.2, 3]], { n: 12 }), null, J({ id: nid(), col: RCOL.joint, moss: 0.4 }));
      addPart(`f${s}${f}b`, loft([[0.02, 0.21, 0.19, 3], [-0.45, 0.19, 0.17, 3], [-0.58, 0.12, 0.1, 2]], { n: 12 }), null, J({ id: nid(), col: RCOL.slate, moss: 0.4 }));
    }
  }
  // ---- legs ----
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    addPart('hip' + s, lathe([[0.01, -0.9], [0.7, -0.6], [0.95, 0], [0.7, 0.6], [0.01, 0.9]], { n: 20, smooth: 60 }), null, J({ id: nid() }));
    addPart('hip' + s, loft([[-0.2, 0.92, 0.95], [-1.5, 1.0, 1.02], [-3.0, 0.85, 0.88]], { n: 20 }), null, J({ id: nid(), col: RCOL.slate, moss: 0.6 }));
    addPart('hip' + s, loft([[-0.4, 0.85, 0.18, 6], [-2.6, 0.75, 0.18, 6]], { n: 16, deform: (p) => { p[2] += 0.98 - 0.25 * p[0] * p[0]; return p; } }), null, A({ id: nid(), moss: 0.9 }));
    addPart('kn' + s, lathe([[0.01, -0.85], [0.65, -0.6], [0.86, 0], [0.65, 0.6], [0.01, 0.85]], { n: 20, smooth: 60 }), null, J({ id: nid() }));
    addPart('kn' + s, lathe([[0.95, 0], [0.9, 0.3], [0.6, 0.55], [0.0, 0.62]], { n: 24, capB: false }), MUL(T(0, 0.05, 0.55), RX(Math.PI / 2)), A({ id: nid(), moss: 0.9, twoSided: true }));
    // shin
    addPart('kn' + s, loft([[-0.2, 1.0, 1.08, 3.5, 0, 0.12], [-0.7, 1.25, 1.35, 3.5, 0, 0.22], [-2.2, 1.15, 1.25, 3.5, 0, 0.12], [-2.85, 0.88, 0.98, 3.2, 0, 0.0]], { n: 24, smooth: 45 }), null, A({ id: nid(), stripe: -1.4, col2: RCOL.red, moss: 0.6, dirt: 1 }));
    for (let k = 0; k < 3; k++) addPart('kn' + s, rbox(0.12, 0.9, 0.7, 6), T(sx * 1.2, -1.2 - k * 0.0, -0.2 + (k - 1) * 0.32), J({ id: nid(), col: RCOL.dark, dirt: 1 }));
    addPart('an' + s, lathe([[0.01, -0.65], [0.5, -0.45], [0.66, 0], [0.5, 0.45], [0.01, 0.65]], { n: 16, smooth: 60 }), null, J({ id: nid(), dirt: 1 }));
    // foot wedge
    addPart('an' + s, loft([[-0.05, 0.78, 0.95, 4, 0, 0.3], [-0.5, 1.0, 1.55, 4, 0, 0.6], [-0.98, 1.05, 1.72, 4, 0, 0.66]], { n: 24, smooth: 45 }), null, A({ id: nid(), col: RCOL.ivory2, dirt: 1, moss: 0.4 }));
    addPart('an' + s, loft([[-0.3, 0.9, 0.2, 6], [-0.95, 0.95, 0.2, 6]], { n: 16, deform: (p) => { p[2] += 2.25 - 0.2 * p[0] * p[0]; return p; } }), MUL(T(0, 0, 0), RX(0.0)), J({ id: nid(), col: RCOL.slate, dirt: 1 }));
  }
  ROBOT.built = true;
  ROBOT.maxId = id;
}

// --- pose evaluation ---
// pose: {root:{p,r}, rot:{joint:[x,y,z]}, world:{joint: M4 rotation}, curl:{L,R}}
function solveIK(H, A, L1, L2, hint, refX) {
  let d = V3.sub(A, H); let dl = V3.len(d);
  const maxL = (L1 + L2) * 0.999;
  if (dl > maxL) { d = V3.mul(V3.norm(d), maxL); dl = maxL; }
  const dn = V3.norm(d);
  const a = (L1 * L1 - L2 * L2 + dl * dl) / (2 * dl);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  let perp = V3.sub(hint, V3.mul(dn, V3.dot(hint, dn))); perp = V3.norm(perp);
  const K = V3.add(H, V3.add(V3.mul(dn, a), V3.mul(perp, h)));
  let n = V3.norm(V3.cross(dn, perp));
  if (V3.dot(n, refX) < 0) n = V3.mul(n, -1);
  return { K, A2: V3.add(H, d), hinge: n };
}
function basisFromY(yDir, xHint) {
  const y = V3.norm(yDir);
  let x = V3.sub(xHint, V3.mul(y, V3.dot(xHint, y))); x = V3.norm(x);
  const z = V3.cross(x, y);
  const m = M4.ident();
  m[0] = x[0]; m[1] = x[1]; m[2] = x[2]; m[4] = y[0]; m[5] = y[1]; m[6] = y[2]; m[8] = z[0]; m[9] = z[1]; m[10] = z[2];
  return m;
}
function rotOnly(m) { const o = new Float32Array(m); o[12] = o[13] = o[14] = 0; return o; }
function evalPose(pose) {
  const Mw = new Array(JOINTS.length);
  const rootM = MUL(T(...pose.root.p), M4.euler(...pose.root.r));
  const ik = pose.ik || {};
  for (let i = 0; i < JOINTS.length; i++) {
    const [name, parent, off0] = JOINTS[i];
    if (!parent) { Mw[i] = rootM; continue; }
    let off = off0;
    if (name[0] === 'f' && name.endsWith('a')) off = ROBOT['fo' + name[1] + name[2]];
    const Pm = Mw[JIDX[parent]];
    const pos = M4.xform(Pm, off);
    let R;
    if (pose.world && pose.world[name]) R = pose.world[name];
    else {
      let r = (pose.rot && pose.rot[name]) || [0, 0, 0];
      if (name[0] === 'f') {
        const s = name[1], f = +name[2], c = (pose.curl && pose.curl[s]) ?? 0.4;
        const sx = s === 'L' ? 1 : -1;
        if (f === 3) r = name.endsWith('a') ? [0.5 + c * 0.6, 0, -sx * (0.5 + c * 0.4)] : [c * 0.7, 0, -sx * 0.2];
        else r = [0, 0, -sx * c * (name.endsWith('a') ? 0.9 : 1.1) + (pose.spread ? pose.spread * (f - 1) * 0 : 0)];
        if (pose.fingers && pose.fingers[name]) r = V3.add(r, pose.fingers[name]);
      }
      R = MUL(rotOnly(Pm), M4.euler(...r));
    }
    const M = new Float32Array(R); M[12] = pos[0]; M[13] = pos[1]; M[14] = pos[2];
    Mw[i] = M;
    // IK hooks: after computing a hip/shoulder position, set chain world rotations
    if (ik[name]) {
      const c = ik[name]; // {target, hint, L1, L2, end:'anL', endRot}
      const refX = M4.xdir(rootM, [1, 0, 0]);
      const sol = solveIK(pos, c.target, c.L1, c.L2, c.hint, refX);
      const yA = V3.sub(pos, sol.K), yB = V3.sub(sol.K, sol.A2);
      pose.world = pose.world || {};
      const m1 = basisFromY(yA, sol.hinge), m2 = basisFromY(yB, sol.hinge);
      const R1 = new Float32Array(m1); R1[12] = pos[0]; R1[13] = pos[1]; R1[14] = pos[2];
      Mw[i] = R1;
      pose.world[c.mid] = m2;
      if (c.endRot) pose.world[c.end] = c.endRot;
    }
  }
  if (pose.xf) for (let i = 0; i < Mw.length; i++) Mw[i] = M4.mul(pose.xf, Mw[i]); // whole-body placement (flight)
  return Mw;
}

// convenience to build a pose with leg/arm IK targets
function makePose(o) {
  // targets/hints/rotations are authored facing +z; yaw turns the whole pose about the world origin
  const yaw = o.yaw || 0, Ry = M4.rotY(yaw);
  const P = (v) => v && M4.xform(Ry, v), D = (v) => v && M4.xdir(Ry, v), R = (m) => M4.mul(Ry, m || M4.ident());
  const rr = o.rootR || [0, 0, 0];
  const p = { root: { p: P(o.rootP), r: [rr[0], rr[1] + yaw, rr[2]] }, rot: Object.assign({}, o.rot || {}), world: {}, ik: {}, curl: o.curl || { L: 0.4, R: 0.4 }, fingers: o.fingers, Ry };
  const fwd = [0, 0, 1];
  if (o.footL) p.ik.hipL = { target: P(o.footL), hint: D(o.kneeHintL || fwd), L1: 3.2, L2: 3.0, mid: 'knL', end: 'anL', endRot: R(o.footRotL) };
  if (o.footR) p.ik.hipR = { target: P(o.footR), hint: D(o.kneeHintR || fwd), L1: 3.2, L2: 3.0, mid: 'knR', end: 'anR', endRot: R(o.footRotR) };
  if (o.handL) p.ik.shL = { target: P(o.handL), hint: D(o.elbowHintL || [0, 0, -1]), L1: 3.35, L2: 3.9, mid: 'elL', end: 'wrL', endRot: o.handRotL && R(o.handRotL) };
  if (o.handR) p.ik.shR = { target: P(o.handR), hint: D(o.elbowHintR || [0, 0, -1]), L1: 3.35, L2: 3.9, mid: 'elR', end: 'wrR', endRot: o.handRotR && R(o.handRotR) };
  return p;
}

// GPU upload + draw list for a pose
const RGPU = { meshes: null };
function robotItems(pose, mats = {}) {
  if (!RGPU.meshes) RGPU.meshes = ROBOT.parts.map(p => glMesh(p.mesh));
  const Mw = evalPose(pose);
  const items = [];
  ROBOT.parts.forEach((p, i) => {
    const model = M4.mul(Mw[JIDX[p.joint]], p.local);
    let mat = p.mat;
    if (mat.isEye && mats.eye != null) mat = Object.assign({}, mat, { emit: mats.eye });
    if (mat.isCore && mats.core != null) mat = Object.assign({}, mat, { emit: mats.core });
    if (mat.isJet && mats.jet != null) mat = Object.assign({}, mat, { emit: mats.jet });
    if (mats.mossK != null && mat.moss) mat = Object.assign({}, mat, { moss: mat.moss * mats.mossK });
    items.push({ gm: RGPU.meshes[i], model, mat, restUp: ROBOT.restUp ? ROBOT.restUp[i] : [0, 1, 0], part: p });
  });
  return { items, Mw };
}
// compute object-space "up" for each part in the kneeling pose (for moss)
function bakeRestUp(kneelPose) {
  const Mw = evalPose(JSON.parse(JSON.stringify(kneelPose, (k, v) => v instanceof Float32Array ? Array.from(v) : v), (k, v) => v));
  ROBOT.restUp = ROBOT.parts.map(p => {
    const M = M4.mul(Mw[JIDX[p.joint]], p.local);
    const inv = M4.invRigid(M);
    return V3.norm(M4.xdir(inv, [0, 1, 0]));
  });
}
function jointPos(Mw, name, off = [0, 0, 0]) { return M4.xform(Mw[JIDX[name]], off); }
