import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {facadeMaterial, propMaterial, skyMaterial, stoneMaterial, raw, ID} from './materials.js';

// Backdrops. Units are metres; the hero sits near the origin (model space after placement).
//   city  — a street ring of tenements around the hero + deep skyline + optional street-corner furniture
//   sky   — just sky, with a low skyline far below (a hero flying high over the city)
//   burst — a classic two-ink action burst radiating from behind the hero (studio cover, any subject)
//   church — a gothic church at night: lit lancet windows, buttresses with pinnacles and crosses, a bell tower
// Any kind can add `blocks` (masonry boxes for the hero to stand on) and `puffs` (posterized smoke).
// Each returns {colliders: Box3[], pickables: Object3D[], sky: Mesh, clickables?: [{id, words, sound, label}]}.

function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const TONES = ['#85789a', '#766c90', '#927e96', '#6c6688', '#80759a', '#98889e', '#72668a'];

function boxPiece(x0, x1, y0, y1, z0, z1, color, box, info) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const n = g.attributes.position.count;
  const c = new THREE.Color(color);
  const aColor = new Float32Array(n * 3), aBox = new Float32Array(n * 4), aInfo = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { aColor.set([c.r, c.g, c.b], i * 3); aBox.set(box, i * 4); aInfo.set(info, i * 3); }
  g.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
  g.setAttribute('aBox', new THREE.BufferAttribute(aBox, 4));
  g.setAttribute('aInfo', new THREE.BufferAttribute(aInfo, 3));
  return g;
}

function skyDome(scene, kind, burst) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), skyMaterial(kind, burst));
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  scene.add(sky);
  return sky;
}

export function buildSet(scene, cfg) {
  const kind = cfg.kind || 'city';
  let out;
  if (kind === 'burst') out = {colliders: [], pickables: [], sky: skyDome(scene, 'storm', cfg.burst || {}), storm: false};
  else if (kind === 'church') out = buildChurch(scene, cfg);
  else {
    out = buildCity(scene, cfg, kind === 'sky');
    if (cfg.corner) out.pickables.push(buildCorner(scene, cfg.corner, cfg.ground ?? -6.5));
  }
  out.clickables ??= [];
  if (cfg.blocks?.length) out.pickables.push(buildBlocks(scene, cfg.blocks, out.stone));
  if (cfg.spires?.length || cfg.arches?.length) out.pickables.push(buildSpires(scene, cfg, out.stone));
  if (cfg.puffs?.length) out.resolve = buildPuffs(scene, cfg.puffs);
  return out;
}

// ---------------------------------------------------------------- masonry helpers
const STONE_KIND = {ashlar: 0, tile: 1, slate: 2, plain: 3, gilt: 4, brick: 5};
// Tag a geometry with the per-vertex tone + kind the stone material reads; everything merges non-indexed.
function tag(g, color, kind) {
  g = g.index ? g.toNonIndexed() : g;
  const n = g.attributes.position.count;
  const c = raw(color);
  const aColor = new Float32Array(n * 3), aKind = new Float32Array(n).fill(typeof kind === 'string' ? STONE_KIND[kind] ?? 0 : kind);
  for (let i = 0; i < n; i++) aColor.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
  g.setAttribute('aKind', new THREE.BufferAttribute(aKind, 1));
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}
const euler = (r = [0, 0, 0]) => new THREE.Euler(...r.map((d) => THREE.MathUtils.degToRad(d)));
function placed(g, pos = [0, 0, 0], rot = [0, 0, 0]) {
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(euler(rot)), new THREE.Vector3(1, 1, 1)));
  return g;
}
// Two-centred (equilateral) pointed arch, base centre (x, y), width w, springing hs above the base.
// P is a THREE.Shape/Path or a canvas 2D context (same maths, different arc call).
function archPath(P, x, y, w, hs) {
  const arc = P.absarc ? P.absarc.bind(P) : P.arc.bind(P);
  P.moveTo(x - w / 2, y);
  P.lineTo(x + w / 2, y);
  P.lineTo(x + w / 2, y + hs);
  arc(x - w / 2, y + hs, w, 0, Math.PI / 3, false);
  arc(x + w / 2, y + hs, w, Math.PI * 2 / 3, Math.PI, false);
  P.lineTo(x - w / 2, y);
  return P;
}
const archShape = (x, y, w, hs) => archPath(new THREE.Shape(), x, y, w, hs);
function flatNormals(g) { g = g.index ? g.toNonIndexed() : g; g.computeVertexNormals(); return g; }
function pyramid(w, h, sides = 4) {
  const g = new THREE.ConeGeometry(w / 2 / Math.cos(Math.PI / sides), h, sides, 1);
  g.rotateY(Math.PI / sides);
  return flatNormals(g);
}

// blocks: [{size: [w, h, d], pos: [x, y, z], rot: [deg x, y, z], kind: 'ashlar'|'slate'|'brick'|…, color}]
function buildBlocks(scene, blocks, material) {
  const parts = blocks.map((b) => tag(placed(new THREE.BoxGeometry(...b.size), b.pos, b.rot), b.color || '#a39377', b.kind || 'ashlar'));
  const mesh = new THREE.Mesh(mergeGeometries(parts), material || stoneMaterial({id: ID.prop}));
  mesh.frustumCulled = false;
  scene.add(mesh);
  return mesh;
}

// spires: free-standing pinnacled piers [{pos: [x, z], top, width, base, cross: true, color}]
// arches: screen walls with a pointed opening between two points [{a: [x, z], b: [x, z], top, sill, thick, color}]
function buildSpires(scene, cfg, material) {
  const parts = [];
  const gilt = cfg.church?.gilt || '#e2b54a';
  const box = (xa, xb, ya, yb, za, zb, color, kind) => {
    const g = new THREE.BoxGeometry(xb - xa, yb - ya, zb - za);
    g.translate((xa + xb) / 2, (ya + yb) / 2, (za + zb) / 2);
    parts.push(tag(g, color, kind));
  };
  for (const p of cfg.spires || []) {
    const [x, z] = p.pos, w = p.width ?? 0.8, top = p.top ?? 8, y0 = p.base ?? -20, col = p.color || '#bba684';
    box(x - w / 2, x + w / 2, y0, top, z - w / 2, z + w / 2, col, 'ashlar');
    for (const y of [top * 0.45, top - 1.4]) box(x - w * 0.6, x + w * 0.6, y, y + 0.22, z - w * 0.6, z + w * 0.6, col, 'plain');
    box(x - w * 0.66, x + w * 0.66, top, top + 0.26, z - w * 0.66, z + w * 0.66, col, 'plain');
    const sp = pyramid(w * 1.02, w * 1.6);
    sp.translate(x, top + 0.26 + w * 0.8, z);
    parts.push(tag(sp, col, 'plain'));
    if (p.cross !== false) {
      const cy = top + 0.26 + w * 1.6 - 0.05, s = p.crossSize ?? w * 1.5;
      box(x - 0.055 * s, x + 0.055 * s, cy, cy + 1.3 * s, z - 0.055 * s, z + 0.055 * s, gilt, 'gilt');
      box(x - 0.36 * s, x + 0.36 * s, cy + 0.82 * s, cy + 0.93 * s, z - 0.055 * s, z + 0.055 * s, gilt, 'gilt');
    }
  }
  for (const a of cfg.arches || []) {
    const [ax, az] = a.a, [bx, bz] = a.b;
    const len = Math.hypot(bx - ax, bz - az), t = a.thick ?? 0.6, top = a.top ?? 7, y0 = a.base ?? -20, col = a.color || '#bba684';
    const sh = new THREE.Shape();
    sh.moveTo(0, y0); sh.lineTo(len, y0); sh.lineTo(len, top); sh.lineTo(0, top); sh.closePath();
    const m = a.margin ?? 0.35, ow = len - m * 2, sill = a.sill ?? y0;
    sh.holes.push(archPath(new THREE.Path(), len / 2, sill, ow, Math.max(top - 0.5 - sill - ow * 0.866, 0.2)));
    const g = new THREE.ExtrudeGeometry(sh, {depth: t, bevelEnabled: false, curveSegments: 16});
    g.translate(0, 0, -t / 2);
    g.rotateY(-Math.atan2(bz - az, bx - ax));
    g.translate(ax, 0, az);
    parts.push(tag(g, col, 'ashlar'));
    const cap = new THREE.BoxGeometry(len + 0.1, 0.25, t + 0.16);
    cap.translate(len / 2, top + 0.12, 0);
    cap.rotateY(-Math.atan2(bz - az, bx - ax));
    cap.translate(ax, 0, az);
    parts.push(tag(cap, col, 'plain'));
  }
  const mesh = new THREE.Mesh(mergeGeometries(parts), material || stoneMaterial({id: ID.building}));
  mesh.frustumCulled = false;
  scene.add(mesh);
  return mesh;
}

// Posterized smoke: camera-facing puffs, three flat tones with a hard edge.
// puffs: [{pos: [x, y, z], size: [w, h] metres, tone}] or, anchored to the page, [{at: [u, v], depth, size: [w, h]}]
// where u, v are cover fractions (top left 0, 0), depth is metres along that ray from the starting camera,
// and size is a fraction of the cover's width at that depth. Returns a resolver main.js calls with the camera.
function buildPuffs(scene, puffs) {
  const tex = puffTexture();
  const items = puffs.map((p) => {
    const m = propMaterial({map: tex, color: raw(p.tone || '#c3d0ca'), emissive: 1, id: ID.building + 0.04, alphaTest: 0.5});
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
    if (p.pos) { s.position.fromArray(p.pos); s.scale.set(p.size[0], p.size[1] ?? p.size[0], 1); }
    else s.visible = false;
    s.onBeforeRender = (r, sc, cam) => { s.quaternion.copy(cam.quaternion); };
    scene.add(s);
    return {p, s};
  });
  return (camera) => {
    const width = (d) => 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect;
    for (const {p, s} of items) {
      if (!p.at) continue;
      const d = p.depth ?? 4;
      const dir = new THREE.Vector3(p.at[0] * 2 - 1, -(p.at[1] * 2 - 1), 0.5).unproject(camera).sub(camera.position).normalize();
      s.position.copy(camera.position).addScaledVector(dir, d);
      s.scale.set(p.size[0] * width(d), (p.size[1] ?? p.size[0]) * width(d), 1);
      s.visible = true;
    }
  };
}
function puffTexture() {
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const r = rng(5);
  const blobs = Array.from({length: 26}, () => {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.3;
    return [0.5 + Math.cos(a) * d, 0.55 + Math.sin(a) * d * 0.7, 0.09 + r() * 0.12];
  });
  // three tones: shade (bottom right), mid, light (top left)
  for (const [tone, dx, dy, k] of [['#9a9a9a', 0.02, 0.03, 1], ['#d2d2d2', 0, 0, 0.9], ['#ffffff', -0.03, -0.035, 0.62]]) {
    g.fillStyle = tone;
    for (const [x, y, rad] of blobs) { g.beginPath(); g.arc((x + dx) * S, (y + dy) * S, rad * k * S, 0, 7); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c);
  return t;
}

// Lancet window: two lights under a foiled oculus, quarry glazing, glowing from within.
function windowTexture(w, h, hs, {glow = ['#fff4c8', '#ffc861', '#e8812e', '#9c3f16'], bar = '#b3662a', ink = '#24130b'} = {}) {
  const PX = 180;                                   // pixels per metre
  const W = Math.round(w * PX), H = Math.round(h * PX);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.translate(W / 2, H); g.scale(PX, -PX);          // metres, origin bottom centre, y up
  const arch = (x, y, ww, hh) => { g.beginPath(); archPath(g, x, y, ww, hh); g.closePath(); };
  const grad = g.createRadialGradient(0, h * 0.55, 0.1, 0, h * 0.5, h * 0.62);
  grad.addColorStop(0, glow[0]); grad.addColorStop(0.35, glow[1]); grad.addColorStop(0.75, glow[2]); grad.addColorStop(1, glow[3]);
  g.fillStyle = grad;
  g.fillRect(-w, 0, w * 2, h);
  // quarry glazing
  g.save();
  arch(0, 0, w, hs); g.clip();
  g.strokeStyle = 'rgba(120,52,14,0.35)'; g.lineWidth = 0.018;
  for (let k = -h; k < h * 2; k += 0.22) { g.beginPath(); g.moveTo(-w, k); g.lineTo(w, k + w * 1.6); g.stroke(); g.beginPath(); g.moveTo(w, k); g.lineTo(-w, k + w * 1.6); g.stroke(); }
  g.restore();
  // tracery: every bar is stroked twice, ink then stone; foils are cusped and lighter than the bars
  const bw = w * 0.042;
  const lw = (w - bw * 3) / 2, lhs = hs * 0.78;
  const bars = [];
  bars.push([() => { g.beginPath(); g.moveTo(0, 0); g.lineTo(0, lhs + lw * 0.3); }, 1]);             // mullion
  for (const s of [-1, 1]) bars.push([() => arch(s * (lw / 2 + bw / 2), 0, lw, lhs), 0.9]);           // lancet heads
  for (const y of [hs * 0.26, hs * 0.52]) bars.push([() => { g.beginPath(); g.moveTo(-w / 2, y); g.lineTo(w / 2, y); }, 0.8]); // transoms
  const oc = [0, lhs + lw * 0.866 + w * 0.2], oR = w * 0.2;
  // a foil: n lobe circles on a ring; the outline runs round the outside of each lobe from the notch
  // it shares with the previous lobe to the notch with the next (the outer intersection of the two circles)
  const foil = (cx, cy, R, n, rot) => {
    g.beginPath();
    const half = Math.PI / n, dl = R * 0.52, rl = dl * Math.sin(half) * 1.3;
    const rp = dl * Math.cos(half) + Math.sqrt(rl * rl - dl * dl * Math.sin(half) ** 2); // notch radius
    for (let i = 0; i < n; i++) {
      const a = rot + i / n * Math.PI * 2;
      const lx = cx + Math.cos(a) * dl, ly = cy + Math.sin(a) * dl;
      const p0 = [cx + Math.cos(a - half) * rp - lx, cy + Math.sin(a - half) * rp - ly];
      const p1 = [cx + Math.cos(a + half) * rp - lx, cy + Math.sin(a + half) * rp - ly];
      const a0 = Math.atan2(p0[1], p0[0]), a1 = Math.atan2(p1[1], p1[0]);
      g.moveTo(lx + p0[0], ly + p0[1]);
      g.arc(lx, ly, rl, a0, a1, false);
    }
  };
  bars.push([() => { g.beginPath(); g.arc(oc[0], oc[1], oR, 0, Math.PI * 2); }, 1]);
  bars.push([() => foil(oc[0], oc[1], oR, 6, Math.PI / 2), 0.55]);
  for (const s of [-1, 1]) {
    const cx = s * (lw / 2 + bw / 2), cy = lhs + lw * 0.32, R = lw * 0.34;
    bars.push([() => { g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); }, 0.8]);
    bars.push([() => foil(cx, cy, R, 4, Math.PI / 4), 0.5]);
  }
  bars.push([() => arch(0, 0, w, hs), 1.2]);
  g.lineJoin = 'round'; g.lineCap = 'round';
  for (const [col, k] of [[ink, 1.8], [bar, 1]]) for (const [b, bk] of bars) { b(); g.strokeStyle = col; g.lineWidth = bw * k * bk; g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}
// A flat mesh cut to the arch, uv 0..1 over its bounding box.
function archPane(w, hs) {
  const g = new THREE.ShapeGeometry(archShape(0, 0, w, hs), 12);
  const h = hs + w * 0.866, uv = g.attributes.uv, pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h);
  return g;
}

// ---------------------------------------------------------------- church
// A gothic nave seen from the side: bays of lancet windows between stepped buttresses, each buttress
// topped by a pinnacle and a gilt cross; a steep tiled roof; a bell tower and spire; an open arcade on the
// right so there's sky. Local frame: the window wall faces +z at z = 0; y is world height.
// cfg.church: {at: [x, y, z], yaw (deg), bays, bay, wall: [x0, x1], windowSill, windowWidth, towerX, glow: colour,
//              stone, roof, gilt (colours), crosses: true, arcade: true, bell: {words, sound, label} | false}
function buildChurch(scene, cfg) {
  const C = cfg.church || {};
  const at = C.at || [0, 0, -14];
  const yaw = THREE.MathUtils.degToRad(C.yaw || 0);
  const stoneC = C.stone || '#bba684', roofC = C.roof || '#7a3a2c', giltC = C.gilt || '#e2b54a', darkC = '#2a2426';
  const Y0 = C.base ?? -16;
  const bay = C.bay ?? 6.5, bays = C.bays ?? 4;
  const x1 = C.right ?? 1.2, x0 = x1 - bay * bays - 1.2;
  const top = C.eave ?? 10;                         // wall top
  const sill = C.windowSill ?? 1.4, ww = C.windowWidth ?? 2.7, whs = C.windowSpring ?? 5.4;
  const parts = [], tower = [], panes = [];
  const box = (list, xa, xb, ya, yb, za, zb, color, kind) => {
    const g = new THREE.BoxGeometry(xb - xa, yb - ya, zb - za);
    g.translate((xa + xb) / 2, (ya + yb) / 2, (za + zb) / 2);
    list.push(tag(g, color, kind));
  };
  const cross = (list, x, y, z, s) => {
    box(list, x - 0.07 * s, x + 0.07 * s, y, y + 1.25 * s, z - 0.07 * s, z + 0.07 * s, giltC, 'gilt');
    box(list, x - 0.36 * s, x + 0.36 * s, y + 0.78 * s, y + 0.92 * s, z - 0.07 * s, z + 0.07 * s, giltC, 'gilt');
  };
  const pinnacle = (list, x, z, y, w, h, withCross) => {
    box(list, x - w / 2, x + w / 2, y, y + h, z - w / 2, z + w / 2, stoneC, 'ashlar');
    box(list, x - w * 0.62, x + w * 0.62, y + h, y + h + 0.22, z - w * 0.62, z + w * 0.62, stoneC, 'plain');
    const sp = pyramid(w * 1.05, w * 2.6);
    sp.translate(x, y + h + 0.22 + w * 1.3, z);
    list.push(tag(sp, stoneC, 'plain'));
    if (withCross && C.crosses !== false) cross(list, x, y + h + 0.22 + w * 2.6 - 0.05, z, w * 1.1);
  };

  // nave wall with a sill course and a corbelled cornice
  const wd = 1.4;
  box(parts, x0, x1, Y0, top, -wd, 0, stoneC, 'ashlar');
  box(parts, x0, x1, sill - 0.35, sill, 0, 0.25, stoneC, 'plain');
  box(parts, x0, x1, top - 0.5, top, 0, 0.45, stoneC, 'plain');
  box(parts, x0, x1, top, top + 0.35, -wd, 0.6, stoneC, 'plain');
  for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.62) box(parts, x, x + 0.26, top - 0.85, top - 0.5, 0, 0.3, stoneC, 'plain');
  // roof: two tiled slopes and a ridge
  const span = C.span ?? 14, rise = C.rise ?? 9;
  const slope = Math.atan2(rise, span / 2), L = Math.hypot(rise, span / 2) + 0.9;
  for (const s of [1, -1]) {
    const g = new THREE.BoxGeometry(x1 - x0 + 0.6, 0.35, L);
    g.translate(0, 0, s * (L / 2 - 0.45));
    g.rotateX(s * slope);
    g.translate((x0 + x1) / 2, top + 0.35 + rise, -span / 2);
    parts.push(tag(g, roofC, 'tile'));
  }
  box(parts, x0, x1 + 0.3, top + rise + 0.2, top + rise + 0.6, -span / 2 - 0.25, -span / 2 + 0.25, darkC, 'plain');
  // the right gable: a stone triangle closing the roof, with a cross on the apex
  {
    const sh = new THREE.Shape();
    sh.moveTo(0.3, top); sh.lineTo(-span - 0.3, top); sh.lineTo(-span / 2, top + rise + 0.7); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, {depth: 0.9, bevelEnabled: false});
    g.rotateY(-Math.PI / 2);
    g.translate(x1 + 0.9, 0, 0);
    parts.push(tag(g, stoneC, 'ashlar'));
    cross(parts, x1 + 0.45, top + rise + 0.6, -span / 2, 1.3);
  }

  // bays: window + frame, buttress with setbacks, pinnacle with a cross
  const winGlow = C.glow || '#ff9a3c';
  const tex = windowTexture(ww, whs + ww * 0.866, whs);
  const glows = [];
  for (let i = 0; i < bays; i++) {
    const cx = x1 - 1.2 - bay * (i + 0.5);
    // frame: an arch ring standing proud of the wall
    const outer = archShape(cx, sill - 0.1, ww + 0.7, whs + 0.1);
    outer.holes.push(archPath(new THREE.Path(), cx, sill, ww, whs));
    const fr = new THREE.ExtrudeGeometry(outer, {depth: 0.45, bevelEnabled: false, curveSegments: 14});
    parts.push(tag(fr, stoneC, 'plain'));
    const pane = archPane(ww, whs);
    pane.translate(cx, sill, 0.03);
    panes.push(pane);
    glows.push(new THREE.Vector3(cx, sill + whs * 0.6, 2.2));
  }
  for (let i = 0; i <= bays; i++) {
    const bx = x1 - 1.2 - bay * i + (i === 0 ? 0.6 : 0);
    const bw = 1.15;
    box(parts, bx - bw / 2, bx + bw / 2, Y0, sill + 1.2, 0, 3.0, stoneC, 'ashlar');
    box(parts, bx - bw / 2 - 0.08, bx + bw / 2 + 0.08, sill + 1.2, sill + 1.5, 0, 3.1, stoneC, 'plain');
    box(parts, bx - bw / 2, bx + bw / 2, sill + 1.5, top - 1.2, 0, 1.9, stoneC, 'ashlar');
    box(parts, bx - bw / 2 - 0.08, bx + bw / 2 + 0.08, top - 1.2, top - 0.9, 0, 2.0, stoneC, 'plain');
    box(parts, bx - bw / 2, bx + bw / 2, top - 0.9, top + 1.4, 0, 1.2, stoneC, 'ashlar');
    pinnacle(parts, bx, 0.6, top + 1.4, 0.8, 2.6, true);
  }

  // open arcade to the right: a screen wall with one tall pointed opening, ending in a free pier
  if (C.arcade !== false) {
    const ax0 = x1 + 0.9, ax1 = ax0 + (C.arcadeWidth ?? 4.2), az = C.arcadeZ ?? 3.2;
    const sh = new THREE.Shape();
    sh.moveTo(ax0, Y0); sh.lineTo(ax1, Y0); sh.lineTo(ax1, top - 1.5); sh.lineTo(ax0, top - 1.5); sh.closePath();
    const ow = ax1 - ax0 - 1.4;
    sh.holes.push(archPath(new THREE.Path(), (ax0 + ax1) / 2, sill - 3.5, ow, top - 1.5 - (sill - 3.5) - ow * 0.866 - 1.0));
    const g = new THREE.ExtrudeGeometry(sh, {depth: 0.8, bevelEnabled: false, curveSegments: 14});
    g.translate(0, 0, az - 0.8);
    parts.push(tag(g, stoneC, 'ashlar'));
    box(parts, ax0, ax1, top - 1.5, top - 1.1, az - 0.9, az + 0.1, stoneC, 'plain');
    const pw = 1.3;
    box(parts, ax1 - 0.1, ax1 + pw, Y0, top + 1.0, az - 1.0, az + pw - 0.6, stoneC, 'ashlar');
    box(parts, ax1 - 0.2, ax1 + pw + 0.1, top + 1.0, top + 1.3, az - 1.1, az + pw - 0.5, stoneC, 'plain');
    pinnacle(parts, ax1 + pw / 2 - 0.05, az + pw / 2 - 0.8, top + 1.3, 0.85, 3.2, true);
  }

  // bell tower + spire; its own id so it can be clicked. Built round its own base, then placed either behind
  // the nave (church-local towerX) or anywhere in the world (tower.pos = [x, z]), e.g. off to one side in the sky.
  const T = C.tower === false ? null : {pos: null, width: 5.2, top: top + rise + (C.towerHeight ?? 9), base: top - 2, spire: C.spireHeight ?? 13, ...(C.tower || {})};
  if (T) {
    const tw = T.width, tTop = T.top, spH = T.spire;
    box(tower, -tw / 2, tw / 2, T.base, tTop, -tw / 2, tw / 2, stoneC, 'ashlar');
    box(tower, -tw / 2 - 0.2, tw / 2 + 0.2, tTop, tTop + 0.45, -tw / 2 - 0.2, tw / 2 + 0.2, stoneC, 'plain');
    box(tower, -tw / 2 - 0.12, tw / 2 + 0.12, tTop - 5.3, tTop - 5.0, -tw / 2 - 0.12, tw / 2 + 0.12, stoneC, 'plain');
    for (const [nx, nz] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
      // belfry: two dark louvred lancets per face, each in a stone frame
      for (const s of [-1, 1]) {
        const g = new THREE.ShapeGeometry(archShape(s * tw * 0.2, 0, tw * 0.26, 2.4), 10);
        g.translate(0, tTop - 4.6, tw / 2 + 0.02);
        g.rotateY(Math.atan2(nx, nz));
        tower.push(tag(g, darkC, 'plain'));
        const lo = new THREE.Shape();
        archPath(lo, s * tw * 0.2, -0.05, tw * 0.26 + 0.3, 2.45);
        lo.holes.push(archPath(new THREE.Path(), s * tw * 0.2, 0, tw * 0.26, 2.4));
        const fg = new THREE.ExtrudeGeometry(lo, {depth: 0.2, bevelEnabled: false, curveSegments: 10});
        fg.translate(0, tTop - 4.6, tw / 2);
        fg.rotateY(Math.atan2(nx, nz));
        tower.push(tag(fg, stoneC, 'plain'));
      }
    }
    const sp = pyramid(tw * 0.92, spH, 8);
    sp.translate(0, tTop + 0.45 + spH / 2, 0);
    tower.push(tag(sp, roofC, 'tile'));
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pinnacle(tower, dx * (tw / 2 - 0.3), dz * (tw / 2 - 0.3), tTop + 0.45, 0.55, 1.2, false);
    // lucarnes: small gabled dormers on the spire faces
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const lb = tag(new THREE.BoxGeometry(0.9, 1.3, 1.2).translate(0, 0.65, 0), stoneC, 'plain');
      const lr = tag(pyramid(1.25, 1.1, 4).scale(1, 1, 1.1).translate(0, 1.85, 0), roofC, 'tile');
      const lo = tag(new THREE.ShapeGeometry(archShape(0, 0.15, 0.45, 0.55), 8).translate(0, 0, 0.61), darkC, 'plain');
      for (const g of [lb, lr, lo]) {
        g.translate(0, 0, tw * 0.33);
        g.rotateY(a);
        g.translate(0, tTop + 2.4, 0);
        tower.push(g);
      }
    }
    cross(tower, 0, tTop + 0.45 + spH - 0.2, 0, 1.6);
  }

  const glowPos = glows[C.glowBay ?? 0] || new THREE.Vector3();
  const material = stoneMaterial({glowPos: glowPos.toArray(), glowColor: winGlow, glowRange: C.glowRange ?? 9, haze: C.haze || '#6f8f88'});
  const towerMat = stoneMaterial({glowRange: 0, haze: C.haze || '#6f8f88', id: ID.building + 0.14});
  const group = new THREE.Group();
  const body = new THREE.Mesh(mergeGeometries(parts), material);
  const glass = new THREE.Mesh(mergeGeometries(panes), propMaterial({map: tex, color: 0xffffff, emissive: 1}));
  for (const m of [body, glass]) { m.frustumCulled = false; group.add(m); }
  group.position.fromArray(at);
  group.rotation.y = yaw;
  scene.add(group);
  let bell = null;
  if (T) {
    bell = new THREE.Mesh(mergeGeometries(tower), towerMat);
    bell.frustumCulled = false;
    if (T.pos) { bell.position.set(T.pos[0], 0, T.pos[1]); scene.add(bell); }
    else { bell.position.set(C.towerX ?? x1 - bay * 1.9, 0, -span / 2); group.add(bell); }
  }
  group.updateMatrixWorld(true);
  material.uniforms.uGlowPos.value.copy(glowPos).applyMatrix4(group.matrixWorld);

  const sky = skyDome(scene, cfg.sky || 'teal');
  const clickables = [];
  if (bell && C.bell !== false) clickables.push({id: ID.building + 0.14, words: ['BONNNG!', 'DONNNG!', 'BWONNG!'], sound: 'bell', label: 'bell tower', ...(C.bell || {})});
  return {colliders: [], pickables: [body, glass, ...(bell ? [bell] : [])], sky, storm: false, clickables, stone: stoneMaterial({id: ID.prop, glowPos: glowPos.clone().applyMatrix4(group.matrixWorld).toArray(), glowColor: winGlow, glowRange: C.glowRange ?? 9, haze: C.haze || '#6f8f88'})};
}

// ---------------------------------------------------------------- city
function buildCity(scene, cfg, skylineOnly) {
  const G = cfg.ground ?? (skylineOnly ? -70 : -6.5);
  const rand = rng(cfg.seed ?? 11);
  const street = cfg.street ?? 19;                 // distance from the hero to the facing facades
  const [hMin, hMax] = cfg.heights ?? [11, 22];    // building heights (m) in the ring
  const pieces = [], colliders = [], roofs = [], facing = [];

  function building(x0, x1, z0, z1, h, face) {
    const top = G + h;
    const tone = TONES[Math.floor(rand() * TONES.length)];
    const seed = rand();
    const box = [x0, z0, x1, z1];
    pieces.push(boxPiece(x0, x1, G, top, z0, z1, tone, box, [seed, top, 0]));
    const o = 0.35;
    pieces.push(boxPiece(x0 - o, x1 + o, top - 0.2, top + 0.55, z0 - o, z1 + o, tone, box, [seed, top, 1]));
    pieces.push(boxPiece(x0 - 0.12, x1 + 0.12, top - 1.1, top - 0.2, z0 - 0.12, z1 + 0.12, new THREE.Color(tone).multiplyScalar(0.8), box, [seed, top, 1]));
    colliders.push(new THREE.Box3(new THREE.Vector3(x0, G, z0), new THREE.Vector3(x1, top + 0.55, z1)));
    roofs.push({x0, x1, z0, z1, top: top + 0.55});
    if (face) facing.push({x0, x1, z0, z1, face, top});
  }

  // A row of buildings along one side of the street ring. `axis` 'x': row runs along x at z=±street.
  function row(side, along0, along1, depth, hRange, gapEvery = 4) {
    let a = along0, n = 0;
    while (a < along1) {
      const w = 7 + rand() * 8;
      if (++n % gapEvery === 0) { a += 5 + rand() * 2; continue; } // side street
      const h = hRange[0] + rand() * (hRange[1] - hRange[0]);
      const b0 = a, b1 = Math.min(a + w, along1);
      if (side === 'north') building(b0, b1, -street - depth, -street, h, [0, 0, 1]);
      if (side === 'south') building(b0, b1, street, street + depth, h, [0, 0, -1]);
      if (side === 'west') building(-street - depth, -street, b0, b1, h, [1, 0, 0]);
      if (side === 'east') building(street, street + depth, b0, b1, h, [-1, 0, 0]);
      a = b1;
    }
  }
  if (!skylineOnly) {
    const L = street + 18;
    row('north', -L, L, 15, [hMin, hMax]);
    row('south', -L, L, 15, [hMin, hMax]);
    row('west', -street, street, 15, [hMin * 0.9, hMax * 0.8], 3);
    row('east', -street, street, 15, [hMin * 0.9, hMax * 0.8], 3);
  }
  // deep skyline ring, so every direction has a horizon
  const R = skylineOnly ? 160 : 85;
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + rand() * 0.05;
    const r = R + rand() * 25, w = 6 + rand() * 8, h = (skylineOnly ? 30 : 22) + rand() * 32;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
    building(cx - w / 2, cx + w / 2, cz - w / 2, cz + w / 2, h);
  }

  const city = new THREE.Mesh(mergeGeometries(pieces), facadeMaterial(G));
  city.frustumCulled = false;
  scene.add(city);

  const ground = new THREE.Mesh(new THREE.BoxGeometry(400, 0.2, 400, 32, 1, 32), propMaterial({color: 0x2c2632}));
  ground.position.y = G - 0.1;
  scene.add(ground);
  if (!skylineOnly) {
    const walk = propMaterial({color: 0x514860});
    const w = 3, L = (street + 18) * 2;
    for (const [x, z, sx, sz] of [[0, -street + w / 2, L, w], [0, street - w / 2, L, w], [-street + w / 2, 0, w, street * 2], [street - w / 2, 0, w, street * 2]]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.25, sz), walk);
      s.position.set(x, G + 0.12, z);
      scene.add(s);
    }
  }

  // water towers on a few roofs, fire escapes on a few facades facing the hero
  const wood = propMaterial({color: 0x6b4a3c}), iron = propMaterial({color: 0x2a2430});
  const ringRoofs = roofs.slice(0, roofs.length - 64);
  for (let i = 0; i < Math.min(6, ringRoofs.length); i++) {
    const r = ringRoofs[Math.floor(rand() * ringRoofs.length)];
    waterTower(scene, (r.x0 + r.x1) / 2 + (rand() - 0.5) * 3, (r.z0 + r.z1) / 2 + (rand() - 0.5) * 3, r.top, 0.9 + rand() * 0.3, wood, iron);
  }
  const fe = propMaterial({color: 0x241f2a});
  for (let i = 0; i < facing.length; i += 3) {
    const f = facing[i];
    if (f.top - G < 12) continue;
    fireEscape(scene, f, G, fe);
  }

  const sky = skyDome(scene, cfg.sky || 'storm');
  return {colliders, pickables: [], sky, storm: (cfg.sky || 'storm') === 'storm' && cfg.storm !== false};
}

function waterTower(scene, x, z, top, s, wood, iron) {
  const g = new THREE.Group();
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.5 * s, 1.6 * s, 3.2 * s, 18), wood);
  tank.position.y = 3.4 * s;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.75 * s, 1.5 * s, 18), wood);
  roof.position.y = 5.75 * s;
  g.add(tank, roof);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2 + 0.6;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.08 * s, 1.9 * s, 6), iron);
    leg.position.set(Math.cos(a) * 1.1 * s, 0.95 * s, Math.sin(a) * 1.1 * s);
    g.add(leg);
  }
  for (const y of [2.6, 4.1]) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(1.56 * s, 0.05 * s, 4, 24), iron);
    hoop.rotation.x = Math.PI / 2; hoop.position.y = y * s;
    g.add(hoop);
  }
  g.position.set(x, top, z);
  scene.add(g);
}

function fireEscape(scene, f, G, mat) {
  // build facing +z at the origin, then rotate onto the facade
  const g = new THREE.Group();
  const floors = 3, floorH = 3.35, y0 = G + 4.4;
  for (let k = 0; k < floors; k++) {
    const y = y0 + k * floorH;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.1, 1.2), mat); slab.position.set(0, y, 0.6);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.06, 0.06), mat); rail.position.set(0, y + 0.95, 1.18);
    const rail2 = rail.clone(); rail2.position.y = y + 0.5;
    g.add(slab, rail, rail2);
    for (const dx of [-2.05, -0.7, 0.7, 2.05]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.06), mat);
      post.position.set(dx, y + 0.48, 1.18); g.add(post);
    }
    if (k < floors - 1) {
      const stair = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(3.0, floorH), 0.08, 0.55), mat);
      stair.position.set(-0.1, y + floorH / 2, 0.45);
      stair.rotation.z = Math.atan2(floorH, 3.0) * (k % 2 ? 1 : -1);
      g.add(stair);
    }
  }
  const [nx, , nz] = f.face;
  g.rotation.y = Math.atan2(nx, nz);
  const cx = (f.x0 + f.x1) / 2, cz = (f.z0 + f.z1) / 2;
  const hx = (f.x1 - f.x0) / 2, hz = (f.z1 - f.z0) / 2;
  g.position.set(cx + nx * hx, 0, cz + nz * hz);
  scene.add(g);
}

// ---------------------------------------------------------------- street corner: pole, signs, lamp, brackets
function signTexture(text, {w = 1024, h = 220, bg = '#f1ead7', fg = '#15121a', arrow = false} = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.strokeStyle = fg; x.lineWidth = h * 0.07; x.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12);
  x.textBaseline = 'middle'; x.textAlign = 'center';
  if (arrow) {
    x.fillStyle = fg;
    x.beginPath();
    const m = h * 0.2;
    x.moveTo(m, h * 0.32); x.lineTo(w - h * 0.62, h * 0.32); x.lineTo(w - h * 0.62, h * 0.14); x.lineTo(w - m * 0.6, h * 0.5);
    x.lineTo(w - h * 0.62, h * 0.86); x.lineTo(w - h * 0.62, h * 0.68); x.lineTo(m, h * 0.68); x.closePath();
    x.fill();
    x.fillStyle = bg; x.font = `700 ${h * 0.3}px Oswald, Impact, sans-serif`;
    x.fillText(text, w * 0.45, h * 0.51);
  } else {
    x.fillStyle = fg; x.font = `700 ${h * 0.62}px Oswald, Impact, sans-serif`;
    x.fillText(text, w / 2, h * 0.55);
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

// cfg: {pole: [x, z], top, color, signs: [{text, y, yaw, length, along, oneWay}], lamp: {yaw, reach} | false,
//       brackets: [[x, y, z, sx, sy, sz], ...]}
function buildCorner(scene, cfg, G) {
  const group = new THREE.Group();
  const metal = propMaterial({color: cfg.color ?? 0x4a4250});
  const [px, pz] = cfg.pole ?? [0.6, -0.4];
  const top = cfg.top ?? 5.2;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, top - G, 20), metal);
  pole.position.set(px, (top + G) / 2, pz);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 1.4, 20), metal);
  base.position.set(px, G + 0.7, pz);
  group.add(pole, base);
  for (const [x, y, z, sx, sy, sz] of cfg.brackets ?? []) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), metal);
    b.position.set(x, y, z); group.add(b);
  }
  for (const s of cfg.signs ?? []) {
    const len = s.length ?? (s.oneWay ? 0.92 : 0.2 + s.text.length * 0.19);
    const h = s.oneWay ? 0.3 : 0.44;
    const tex = s.oneWay ? signTexture(s.text || 'ONE WAY', {bg: '#f4efe4', fg: '#141117', h: 300, arrow: true}) : signTexture(s.text);
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, 0.03), propMaterial({map: tex, color: 0xffffff}));
    const yaw = s.yaw ?? 0;
    const along = s.along ?? len / 2 + 0.05; // how far the sign sticks out from the pole
    m.position.set(px + Math.cos(yaw) * along, s.y, pz - Math.sin(yaw) * along);
    m.rotation.y = yaw;
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.2), metal);
    clamp.position.set(px, s.y + h * 0.4, pz);
    group.add(m, clamp);
  }
  if (cfg.lamp !== false) {
    const yaw = cfg.lamp?.yaw ?? Math.PI * 0.85, reach = cfg.lamp?.reach ?? 3.4;
    const dir = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const P = (d, y) => new THREE.Vector3(px, y, pz).addScaledVector(dir, d);
    const curve = new THREE.CatmullRomCurve3([P(0, top - 0.6), P(0, top + 0.4), P(reach * 0.15, top + 1.05), P(reach * 0.6, top + 1.35), P(reach, top + 1.3)]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.06, 10), metal));
    const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.7, 6, 12), metal);
    head.position.copy(P(reach + 0.15, top + 1.15));
    head.rotation.set(0, yaw, Math.PI / 2);
    const glow = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 10), propMaterial({color: 0xfff1b8, emissive: 1}));
    glow.position.copy(head.position).add(new THREE.Vector3(0, -0.1, 0));
    glow.rotation.copy(head.rotation);
    group.add(head, glow);
  }
  scene.add(group);
  return group;
}
