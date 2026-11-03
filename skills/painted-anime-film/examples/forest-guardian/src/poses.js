// ---------- key poses for the Guardian (authored facing +z, turned by yaw) ----------
function basis(X, Y, Z) { const m = M4.ident(); m.set([...X, 0, ...Y, 0, ...Z, 0, 0, 0, 0, 1]); return m; }
function P_STAND(o = {}) {
  robotInit();
  return makePose({
    yaw: o.yaw || 0,
    rootP: [0, 7.55, 0], rot: { waist: [0.02, 0, 0], chest: [0.03, 0, 0], neck: [0.05, 0, 0], head: [-0.05, 0, 0] },
    footL: [1.9, 0.98, 0.2], footR: [-1.9, 0.98, -0.2],
    handL: [5.4, 6.0, 0.6], handR: [-5.4, 6.0, 0.4], elbowHintL: [0.3, 0, -1], elbowHintR: [-0.3, 0, -1],
    handRotL: M4.euler(0, 0, 0.08), handRotR: M4.euler(0, 0, -0.08), curl: { L: 0.45, R: 0.45 },
  });
}
// slumped kneel: right knee down, left foot planted, right hand on the ground, left arm on the raised knee
function P_KNEEL(o = {}) {
  robotInit();
  const slump = o.slump ?? 1, headUp = o.headUp ?? 0, rise = o.rise ?? 0;
  const p = makePose({
    yaw: o.yaw || 0,
    rootP: [0, lerp(3.75, 4.6, rise), -0.4], rootR: [0.12 * slump, 0.08, -0.04],
    rot: { waist: [0.2 * slump, 0.04, 0.04], chest: [0.3 * slump, 0.08, 0.06], neck: [0.24 * slump - headUp * 0.65, -0.1, 0.04], head: [0.12 * slump - headUp * 0.5, -0.14, 0.12 * slump] },
    footL: [2.15, 0.98, 3.0], kneeHintL: [0.15, 1, 0.6],
    footR: [-1.8, 0.85, -1.2], kneeHintR: [0, -0.3, 1], footRotR: M4.mul(M4.rotY(0.1), M4.rotX(Math.PI / 2 * 0.9)),
    curl: { L: 0.7, R: 0.3 },
  });
  const Mw = evalPose(p);
  const kL = jointPos(Mw, 'knL');
  const Ry = p.Ry;
  p.ik.shL = { target: V3.add(kL, M4.xdir(Ry, [0.35, 0.35, 1.45])), hint: M4.xdir(Ry, [1, 0.3, -0.7]), L1: 3.35, L2: 3.9, mid: 'elL', end: 'wrL', endRot: M4.mul(Ry, M4.mul(M4.rotY(-0.25), M4.mul(M4.rotX(-0.55), M4.rotZ(0.2)))) };
  p.ik.shR = { target: M4.xform(Ry, [-4.55, 1.36, 2.3]), hint: M4.xdir(Ry, [-1, 0.25, -0.7]), L1: 3.35, L2: 3.9, mid: 'elR', end: 'wrR', endRot: M4.mul(Ry, M4.mul(M4.rotY(0.35), basis([0, -1, 0], [0, -0.05, -1], [1, 0, 0]))) };
  p.fingers = { fR0b: [0, 0, 0.3], fR1b: [0, 0, 0.25], fR2b: [0, 0, 0.35] };
  return p;
}
