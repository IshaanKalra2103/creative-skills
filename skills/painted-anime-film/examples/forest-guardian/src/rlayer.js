// ---------- robot layer: render the 3D-assisted cel drawing into the composite ----------
let GROUND_GM = null;
function robotInit() {
  if (ROBOT.built) return;
  buildRobot(); bakeRestUp(P_KNEEL());
  GROUND_GM = glMesh(finalize(loft([[0, 60, 60, 2]], { n: 48, capB: false })));
}
// morning forest light: low sun behind-right of the robot, cool sky fill
const LIGHT_FOREST = {
  sun: [0.86, 0.34, 0.38], sunCol: [1.08, 0.99, 0.84], amb: [0.6, 0.64, 0.74], amb2: [0.47, 0.5, 0.62],
  fogCol: [0.93, 0.87, 0.77], fog: [0.011, 18], gobo: [0.32, 0.5, 1, 0], shadowCenter: [0, 4, 0], shadowR: 16,
};
// draw robot + overgrowth; o: {mats, ground, alpha, lineW, seed, growth:true|false, ground plants: gplants, t, fall}
function robotLayer(g, cam, pose, L, o = {}) {
  if (!GL) return null;
  robotInit();
  const { items, Mw } = robotItems(pose, o.mats || {});
  if (o.extra) items.push(...o.extra);
  if (o.ground !== false) items.push({ gm: GROUND_GM, model: M4.trans(0, o.groundY || 0, 0), mat: { type: 7, col: [0, 0, 0], twoSided: true }, noShadow: true });
  const c = glRender(items, cam, L, { lineW: o.lineW || 1.5, seed: o.seed || 0, jit: o.jit, inkFog: o.inkFog ?? 0.012, crease: o.crease, moss: o.moss, dirt: o.dirt });
  let front = [], behind = [];
  if (o.growth !== false) {
    const list = buildGrowth().concat(o.gplants || []);
    const placed = growthPlace(list, cam, Mw, { t: o.t, fall: o.fall });
    for (const it of placed) {
      const [zr] = glProbe(it.sp[0], it.sp[1] - 1);
      (it.sp[2] <= zr + 0.45 ? front : behind).push(it);
    }
    const byDepth = (a, b) => b.sp[2] - a.sp[2];
    behind.sort(byDepth); front.sort(byDepth);
    growthDraw(g, behind, L, { shade: 0.0 });
  }
  g.save();
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.globalAlpha = o.alpha ?? 1;
  g.drawImage(c, 0, 0, W, H);
  g.restore();
  if (front.length) growthDraw(g, front, L);
  return Mw;
}
// mossy boulder the right hand rests on (world space, for the kneel at R_YAW)
let ROCK_GM = null;
function handRockItems() {
  if (!ROCK_GM) {
    const deform = (p) => { const n = fbm2(p[0] * 0.9 + 3, p[2] * 0.9 + p[1] * 0.7) - 0.5; const k = 1 + n * 0.35; p[0] *= k; p[2] *= k * 0.92; p[1] *= 1 + n * 0.25; return p; };
    ROCK_GM = glMesh(finalize(lathe([[0.01, -0.3], [1.5, -0.2], [1.85, 0.35], [1.7, 0.75], [1.2, 1.0], [0.5, 1.1], [0.01, 1.12]], { n: 28, smooth: 60, deform })));
  }
  const Ry = M4.rotY(R_YAW);
  const at = M4.xform(Ry, [-4.2, 0, 3.2]);
  return [{ gm: ROCK_GM, model: M4.mul(M4.trans(at[0], -0.08, at[2]), M4.mul(M4.rotY(0.7), M4.scale(1.25, 1.0, 1.05))), mat: { type: 3, col: hx('8a8779'), col2: hx('767465'), id: 777, moss: 1.0 }, restUp: [0, 1, 0] }];
}
