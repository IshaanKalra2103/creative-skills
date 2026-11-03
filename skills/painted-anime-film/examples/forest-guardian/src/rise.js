// ---------- pose curves: keyed pose *parameters* (IK targets, root, joint eulers), auto-clamped tangents ----------
function m2q(m) {
  const m00 = m[0], m01 = m[4], m02 = m[8], m10 = m[1], m11 = m[5], m12 = m[9], m20 = m[2], m21 = m[6], m22 = m[10];
  const tr = m00 + m11 + m22; let q;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s]; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s]; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s]; }
  return q;
}
function q2m(q) {
  const [x, y, z, w] = q, m = M4.ident();
  m[0] = 1 - 2 * (y * y + z * z); m[4] = 2 * (x * y - z * w); m[8] = 2 * (x * z + y * w);
  m[1] = 2 * (x * y + z * w); m[5] = 1 - 2 * (x * x + z * z); m[9] = 2 * (y * z - x * w);
  m[2] = 2 * (x * z - y * w); m[6] = 2 * (y * z + x * w); m[10] = 1 - 2 * (x * x + y * y);
  return m;
}
function slerpM(a, b, t) {
  const qa = m2q(a); let qb = m2q(b);
  let d = qa[0] * qb[0] + qa[1] * qb[1] + qa[2] * qb[2] + qa[3] * qb[3];
  if (d < 0) { qb = qb.map(v => -v); d = -d; }
  let q;
  if (d > 0.9995) q = qa.map((v, i) => v + (qb[i] - v) * t);
  else { const th = Math.acos(d), s = Math.sin(th); q = qa.map((v, i) => (v * Math.sin((1 - t) * th) + qb[i] * Math.sin(t * th)) / s); }
  const l = Math.hypot(...q); return q2m(q.map(v => v / l));
}
const isMat = (v) => v instanceof Float32Array && v.length === 16;
function deepMerge(a, b) {
  if (b === undefined) return a;
  if (isMat(b) || Array.isArray(b) || typeof b !== 'object' || b === null) return b;
  const o = Object.assign({}, a);
  for (const k in b) o[k] = deepMerge(a ? a[k] : undefined, b[k]);
  return o;
}
// keys: [{t, P (params), hold?}] ; lag(path) -> seconds
function samplePoseKeys(keys, t, lag) {
  const walk = (path, getter) => {
    const v0 = getter(keys[0].P);
    if (typeof v0 === 'number') return scalarAt(keys.map(k => getter(k.P)), t - lag(path));
    if (isMat(v0)) return matAt(keys.map(k => getter(k.P)), t - lag(path));
    if (Array.isArray(v0)) return v0.map((_, i) => scalarAt(keys.map(k => getter(k.P)[i]), t - lag(path)));
    const o = {}; for (const k in v0) o[k] = walk(path ? path + '.' + k : k, (P) => getter(P)[k]); return o;
  };
  const idx = (tt) => { let i = 0; while (i < keys.length - 2 && tt > keys[i + 1].t) i++; return i; };
  function scalarAt(vs, tt) {
    if (tt <= keys[0].t) return vs[0];
    if (tt >= keys[keys.length - 1].t) return vs[vs.length - 1];
    const i = idx(tt), t0 = keys[i].t, t1 = keys[i + 1].t, h = t1 - t0, u = (tt - t0) / h;
    const tan = (j) => {
      if (keys[j].hold || j === 0 || j === keys.length - 1) return 0;
      const a = vs[j - 1], b = vs[j], c = vs[j + 1];
      if ((b - a) * (c - b) <= 0) return 0; // local extremum: flat (no overshoot past the key)
      return (c - a) / (keys[j + 1].t - keys[j - 1].t);
    };
    const m0 = tan(i) * h, m1 = tan(i + 1) * h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * m1;
  }
  function matAt(ms, tt) {
    if (tt <= keys[0].t) return ms[0];
    if (tt >= keys[keys.length - 1].t) return ms[ms.length - 1];
    const i = idx(tt), u = (tt - keys[i].t) / (keys[i + 1].t - keys[i].t);
    return slerpM(ms[i], ms[i + 1], u * u * (3 - 2 * u));
  }
  return walk('', (P) => P);
}
// params -> pose (handles the left hand riding on the left knee)
function poseFromParams(P, yaw) {
  const o = Object.assign({}, P, { yaw });
  let p = makePose(o);
  p.fingers = P.fingers;
  if (P.kneeW > 0.001) {
    const Mw = evalPose(p);
    const kL = M4.xform(M4.rotY(-yaw), jointPos(Mw, 'knL'));
    o.handL = V3.lerp(P.handL, V3.add(kL, P.handLRel), P.kneeW);
    p = makePose(o); p.fingers = P.fingers;
  }
  return p;
}

// ---------- the rise ----------
const RISE = (() => {
  const I = M4.ident();
  const K0 = {
    rootP: [0, 3.75, -0.4], rootR: [0.12, 0.08, -0.04],
    rot: { waist: [0.2, 0.04, 0.04], chest: [0.3, 0.08, 0.06], neck: [0.24, -0.1, 0.04], head: [0.12, -0.14, 0.12] },
    footL: [2.15, 0.98, 3.0], kneeHintL: [0.15, 1, 0.6], footRotL: I,
    footR: [-1.8, 0.85, -1.2], kneeHintR: [0, -0.3, 1], footRotR: M4.mul(M4.rotY(0.1), M4.rotX(Math.PI / 2 * 0.9)),
    handL: [2.58, 4.27, 3.84], handLRel: [0.35, 0.35, 1.45], kneeW: 1, elbowHintL: [1, 0.3, -0.7], handRotL: M4.mul(M4.rotY(-0.25), M4.mul(M4.rotX(-0.55), M4.rotZ(0.2))),
    handR: [-4.55, 1.36, 2.3], elbowHintR: [-1, 0.25, -0.7], handRotR: M4.mul(M4.rotY(0.35), basis([0, -1, 0], [0, -0.05, -1], [1, 0, 0])),
    curl: { L: 0.7, R: 0.3 }, fingers: { fR0b: [0, 0, 0.3], fR1b: [0, 0, 0.25], fR2b: [0, 0, 0.35] },
  };
  const K = (base, o) => deepMerge(base, o);
  // anticipation: sinks, shoulders hunch, fingers dig into the rock
  const KA = K(K0, { rootP: [0, 3.48, -0.55], rootR: [0.2, 0.06, -0.05], rot: { waist: [0.27, 0.04, 0.04], chest: [0.42, 0.06, 0.06], neck: [0.3, -0.08, 0.04], head: [0.2, -0.12, 0.12] }, handR: [-4.55, 1.3, 2.3], curl: { L: 0.8, R: 0.6 } });
  const KA2 = K(KA, { rootP: [0, 3.4, -0.5], rootR: [0.24, 0.05, -0.05], rot: { chest: [0.45, 0.05, 0.05] } });
  // push: right knee peels off the ground, weight rolls forward over the left knee, hand pushing off the rock
  const KP = K(KA2, {
    rootP: [0, 5.0, 0.35], rootR: [0.46, 0.04, -0.03], rot: { waist: [0.16, 0.03, 0.03], chest: [0.22, 0.04, 0.04], neck: [0.34, -0.06, 0.03], head: [0.22, -0.1, 0.08] },
    footR: [-1.85, 1.5, -1.5], kneeHintR: [0, 0.1, 1], footRotR: M4.mul(M4.rotY(0.1), M4.rotX(0.8)), kneeHintL: [0.1, 0.8, 0.8],
    handR: [-4.8, 2.9, 2.6], handRotR: M4.mul(M4.rotY(0.3), M4.mul(M4.rotX(0.5), M4.rotZ(-0.3))), curl: { L: 0.75, R: 0.5 },
  });
  // the right foot comes up under it
  const KS = K(KP, {
    rootP: [0.02, 5.6, 0.65], rootR: [0.38, 0.03, -0.02],
    footR: [-1.9, 1.85, -1.15], footRotR: M4.rotX(0.3), kneeHintR: [0, 0.3, 1],
    handR: [-5.0, 3.6, 2.5], handL: [3.4, 4.5, 3.6], kneeW: 0.5, handRotR: M4.mul(M4.rotX(0.3), M4.rotZ(-0.25)), curl: { L: 0.6, R: 0.45 }, fingers: { fR0b: [0, 0, 0], fR1b: [0, 0, 0], fR2b: [0, 0, 0] },
  });
  // both feet planted, rising through the legs, arms come off and hang
  const KM = K(KS, {
    rootP: [0.06, 6.35, 0.9], rootR: [0.24, 0.02, -0.02], rot: { waist: [0.08, 0.02, 0.02], chest: [0.12, 0.02, 0.02], neck: [0.3, -0.04, 0.02], head: [0.18, -0.06, 0.05] },
    footR: [-1.9, 0.98, -0.9], footRotR: I, kneeHintR: [0, 0.1, 1], kneeHintL: [0.05, 0.3, 1],
    handL: [5.1, 4.7, 2.4], kneeW: 0, elbowHintL: [0.5, 0, -1], handRotL: M4.euler(0.2, 0, 0.1),
    handR: [-5.2, 4.6, 2.2], elbowHintR: [-0.5, 0, -1], handRotR: M4.euler(0.2, 0, -0.1), curl: { L: 0.5, R: 0.5 },
  });
  // full height, a touch past it (chest lifts, leans back)
  const KT = K(KM, {
    rootP: [0.1, 7.42, 1.05], rootR: [-0.06, 0, 0], rot: { waist: [-0.03, 0, 0], chest: [-0.07, 0, 0], neck: [0.26, -0.02, 0], head: [0.1, -0.04, 0.03] },
    kneeHintL: [0, 0, 1], handL: [5.5, 6.2, 1.4], handR: [-5.5, 6.1, 1.2], elbowHintL: [0.3, 0, -1], elbowHintR: [-0.3, 0, -1],
    handRotL: M4.euler(0, 0, 0.08), handRotR: M4.euler(0, 0, -0.08), curl: { L: 0.45, R: 0.45 },
  });
  // settles its weight
  const KE = K(KT, { rootP: [0.1, 7.15, 1.0], rootR: [0.05, 0, 0], rot: { waist: [0.04, 0, 0], chest: [0.06, 0, 0], neck: [0.3, 0, 0], head: [0.12, -0.02, 0.02] }, handL: [5.4, 5.85, 1.4], handR: [-5.4, 5.75, 1.2] });
  const keys = [
    { t: 0, P: K0, hold: true }, { t: 1.0, P: K0, hold: true }, { t: 2.0, P: KA }, { t: 2.6, P: KA2, hold: true },
    { t: 4.3, P: KP }, { t: 5.2, P: KS }, { t: 6.2, P: KM }, { t: 7.4, P: KT }, { t: 8.4, P: KE, hold: true }, { t: 12, P: KE, hold: true },
  ];
  const lag = (path) => path.startsWith('rot.head') ? 0.4 : path.startsWith('rot.neck') ? 0.3 : (/^(hand|elbow|curl|kneeW|fingers)/.test(path) ? 0.18 : 0);
  return { keys, lag, K0, KE };
})();
function P_RISE(t, o = {}) {
  robotInit();
  const tq = o.ones ? t : Math.floor(t * 12) / 12; // drawn on twos
  const P = samplePoseKeys(RISE.keys, tq, RISE.lag);
  return poseFromParams(o.edit ? o.edit(P) : P, o.yaw ?? R_YAW);
}
