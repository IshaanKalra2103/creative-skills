// ---------- a small songbird, built like the robot so it stays on-model in every view ----------
const BIRD = { parts: null, gm: null };
function buildBird() {
  if (BIRD.parts) return;
  const P = [];
  const add = (j, mesh, M, mat) => P.push({ j, mesh: finalize(xformMesh(mesh, M || M4.ident())), mat: Object.assign({ type: 4 }, mat) });
  const brown = hx('7a5a40'), dark = hx('4a3a2e'), breast = hx('d27a45'), cream = hx('eadcc0');
  // body along +z
  add('body', loft([[-0.17, 0.02, 0.02], [-0.12, 0.055, 0.05], [-0.02, 0.078, 0.07], [0.08, 0.072, 0.068], [0.14, 0.05, 0.05], [0.17, 0.02, 0.02]], { n: 16, smooth: 60 }), M4.mul(M4.rotX(Math.PI / 2), M4.scale(1, 1, 1)), { col: brown, id: 2001 });
  add('body', loft([[-0.09, 0.02, 0.02], [-0.04, 0.06, 0.058], [0.05, 0.062, 0.06], [0.11, 0.04, 0.04], [0.135, 0.01, 0.01]], { n: 16, smooth: 60 }), M4.mul(M4.trans(0, -0.014, 0.02), M4.rotX(Math.PI / 2)), { col: breast, id: 2001 });
  add('body', loft([[-0.12, 0.02, 0.02], [-0.06, 0.05, 0.05], [0.02, 0.05, 0.05], [0.06, 0.02, 0.02]], { n: 14, smooth: 60 }), M4.mul(M4.trans(0, -0.035, -0.03), M4.rotX(Math.PI / 2)), { col: cream, id: 2001 });
  // head + beak + eyes
  add('head', lathe([[0.001, -0.058], [0.04, -0.045], [0.058, 0], [0.04, 0.045], [0.001, 0.058]], { n: 16, smooth: 70 }), null, { col: brown, id: 2002 });
  add('head', lathe([[0.001, -0.04], [0.03, -0.03], [0.042, 0.0], [0.02, 0.03], [0.001, 0.035]], { n: 14, smooth: 70 }), M4.trans(0, -0.022, 0.022), { col: breast, id: 2002 });
  add('head', lathe([[0.016, 0], [0.001, 0.045]], { n: 10 }), M4.mul(M4.trans(0, -0.006, 0.05), M4.rotX(Math.PI / 2)), { col: hx('3a302a'), id: 2003 });
  for (const s of [1, -1]) add('head', lathe([[0.001, -0.011], [0.011, 0], [0.001, 0.011]], { n: 10 }), M4.trans(s * 0.04, 0.012, 0.03), { col: hx('141012'), id: 2004 });
  // wings (span along +x for L, chord along z)
  const wing = loft([[0, 0.012, 0.07, 2, 0, 0.0], [0.08, 0.01, 0.068, 2, 0, -0.01], [0.16, 0.008, 0.05, 2, 0, -0.035], [0.23, 0.004, 0.022, 2, 0, -0.06]], { n: 10, smooth: 40 });
  add('wingL', wing, M4.rotZ(-Math.PI / 2), { col: dark, id: 2005, twoSided: true });
  add('wingR', wing, M4.rotZ(Math.PI / 2), { col: dark, id: 2006, twoSided: true });
  // tail
  add('tail', loft([[0, 0.018, 0.006, 4], [0.12, 0.04, 0.004, 4]], { n: 10 }), M4.rotX(-Math.PI / 2), { col: dark, id: 2007, twoSided: true });
  // legs (shown when perched)
  for (const s of [1, -1]) add('legs', lathe([[0.006, 0], [0.005, 0.05]], { n: 6 }), M4.mul(M4.trans(s * 0.025, -0.1, 0.0), M4.rotX(Math.PI)), { col: hx('5a4a40'), id: 2008 });
  BIRD.parts = P;
}
// pose: {p, yaw, pitch, roll, flap (wing elevation rad), sweep (0 open .. 1 folded), headYaw, headPitch, tail, legs:0/1, s (scale)}
function birdItems(b) {
  buildBird();
  if (!BIRD.gm) BIRD.gm = BIRD.parts.map(p => glMesh(p.mesh));
  const s = b.s || 1;
  const root = MUL(T(...b.p), RY(b.yaw || 0), RX(-(b.pitch || 0)), RZ(b.roll || 0), M4.scale(s, s, s));
  const fold = b.sweep || 0;
  const J = {
    body: root,
    head: MUL(root, T(0, 0.07, 0.15), RY(b.headYaw || 0), RX(-(b.headPitch || 0))),
    wingL: MUL(root, T(0.045, 0.04, 0.04), RY(fold * 1.45), RZ((b.flap || 0) * (1 - fold * 0.9) - fold * 0.15)),
    wingR: MUL(root, T(-0.045, 0.04, 0.04), RY(-fold * 1.45), RZ(-((b.flap || 0) * (1 - fold * 0.9) - fold * 0.15))),
    tail: MUL(root, T(0, 0.02, -0.15), RX(-(b.tail || 0))),
    legs: MUL(root, T(0, 0, 0.02)),
  };
  const items = [];
  BIRD.parts.forEach((p, i) => {
    if (p.j === 'legs' && !b.legs) return;
    items.push({ gm: BIRD.gm[i], model: J[p.j], mat: p.mat, noShadow: !b.shadow });
  });
  return items;
}
