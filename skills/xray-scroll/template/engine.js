// X-ray scroll film engine. Loads a GLB, renders it as an x-ray (every surface adds density,
// more at grazing angles; a post pass turns density into film with Beer-Lambert), assembles it
// stage by stage, and plays film.js scrubbed by scroll (GSAP ScrollTrigger + Lenis).
// Shared by every film: edit it in the skill's template/, then run scripts/sync-engine.sh.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import film from './film.js';

const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);

const CFG = window.XRAY || {};
const qs = new URLSearchParams(location.search);
const FIXED_P = qs.has('p') ? parseFloat(qs.get('p')) : null; // ?p=0..100 jumps there, unsmoothed
const LOG_PARTS = qs.has('parts');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Build stages in the order the default film assembles them.
const STAGES = ['lead', 'base', 'frame', 'core', 'shell', 'skin'];
// Where each stage flies in from, in model-size units: [x·width, y·height, z·length]. x points outward.
const FROM = { lead: [0, 0, -0.31], base: [0.5, 0, 0], frame: [0, -0.75, 0], core: [0, 0.83, 0], shell: [0, 1.25, 0], skin: [0, 1.8, 0] };

/* ------------------------------------------------------------------ state */
// Everything the film animates lives here; the render loop only reads it.
const S = {
  // camera: azimuth/elevation (deg), world-size frame to fit (fw × fh), target, sideways pan (fraction of width)
  az: 0, el: 4, fw: 4, fh: 3, tx: 0, ty: 0.5, tz: 0, shift: 0,
  ...Object.fromEntries(STAGES.map((s) => [s, 1])),
  mirror: 0,
  // post-process
  gain: CFG.gain ?? 1.2, mosaic: 0, dark: 0, grid: 0, red: 0, scan: 0, stat: 0, smear: 0, blur: 0, jit: 0,
  // hud: tracker alpha and which set (0 front, 1 top, 2 detail)
  track: 0, trackSet: 0,
};

/* --------------------------------------------------------------- renderer */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const DPR = Math.min(devicePixelRatio, 1.5);
renderer.setPixelRatio(DPR);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(18, 1, 0.1, 100);
const root = new THREE.Group();
scene.add(root);

// Density accumulates additively in a float target; the post pass turns it into film.
const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4, depthBuffer: false });

/* ----------------------------------------------------------------- shaders */
const XRAY_VS = /* glsl */`
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = cameraPosition - wp.xyz;
    vY = wp.y;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

// Grazing angles add more density (a longer path through the shell): dark outlines, see-through middles.
const XRAY_FS = /* glsl */`
  uniform float uDensity;
  uniform float uReveal;
  uniform float uMirror;
  uniform float uFalloff;
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    float ndv = abs(dot(normalize(vN), normalize(vV)));
    float rim = pow(1.0 - ndv, 2.6);
    float d = uDensity * (0.03 + 0.42 * rim) * uReveal;
    if (uMirror > 0.0) d *= uMirror * exp(vY * uFalloff);
    gl_FragColor = vec4(d, 0.0, 0.0, 1.0);
  }
`;

const POST_FS = /* glsl */`
  precision highp float;
  uniform sampler2D tScene;
  uniform vec2 uRes;
  uniform float uDpr, uTime, uGain, uMosaic, uDark, uGrid, uRed, uScan, uStatic, uSmear, uBlur, uJitter;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // Beer-Lambert: transmitted light falls off exponentially with accumulated density
  float absorb(vec2 uv) {
    return 1.0 - exp(-texture2D(tScene, uv).r * uGain);
  }

  float sampleA(vec2 uv) {
    if (uBlur < 0.5) return absorb(uv);
    vec2 px = uBlur * uDpr / uRes;
    float s = absorb(uv);
    for (int i = 0; i < 12; i++) {
      float fi = float(i) + 0.5;
      float r = sqrt(fi / 12.0);
      float th = fi * 2.39996;
      s += absorb(uv + vec2(cos(th), sin(th)) * r * px);
    }
    return s / 13.0;
  }

  void main() {
    vec2 css = gl_FragCoord.xy / uDpr;
    vec2 vp = uRes / uDpr;
    vec2 uv = vUv;
    float tq = floor(uTime * 12.0);

    // horizontal tearing (scroll velocity) + datamosh row smear
    if (uSmear > 0.001 || uJitter > 0.001) {
      float bh = 4.0 + 44.0 * hash(vec2(floor(css.y / 52.0), tq));
      float band = floor(css.y / bh);
      float r1 = hash(vec2(band, tq));
      float r2 = hash(vec2(band, tq + 7.0));
      uv.x += (r1 - 0.5) * 0.08 * uJitter * step(0.55, r2);
      float anchor = hash(vec2(band, tq + 3.0));
      uv.x = mix(uv.x, anchor + (uv.x - anchor) * 0.06, uSmear * step(0.3, r2));
      uv.x += (r1 - 0.5) * 0.25 * uSmear;
    }

    if (uMosaic > 1.0) {
      vec2 cell = vec2(uMosaic * uDpr) / uRes;
      uv = (floor(uv / cell) + 0.5) * cell;
    }

    float a = sampleA(uv);

    vec3 paper = vec3(0.957, 0.957, 0.949);
    vec3 ink = vec3(0.035);
    vec3 lightCol = mix(paper, ink, a);
    vec3 redTint = vec3(1.25, 0.06, 0.05);
    vec3 darkCol = vec3(a) * mix(vec3(1.0), redTint, uRed);
    darkCol += vec3(0.35, 0.0, 0.0) * uRed * smoothstep(0.55, 0.95, a); // hot edges
    vec3 col = mix(lightCol, darkCol, uDark);

    // datamosh: posterised black/white streaks
    if (uSmear > 0.001) {
      float hc = step(0.5, fract(a * 2.5 + hash(vec2(floor(css.y / 2.0), tq)) * 0.25));
      col = mix(col, vec3(hc), uSmear * 0.85);
    }

    // black field + green dot grid + glyphs
    if (uGrid > 0.001) {
      float gs = 22.0;
      vec2 g = mod(css, gs) - gs * 0.5;
      vec2 gid = floor(css / gs);
      float dotm = step(max(abs(g.x), abs(g.y)), 1.3);
      float h = hash(gid + tq * 0.37);
      float plus = max(step(abs(g.x), 0.7) * step(abs(g.y), 4.5), step(abs(g.y), 0.7) * step(abs(g.x), 4.5));
      float minus = step(abs(g.y), 0.7) * step(abs(g.x), 4.5);
      float glyph = h > 0.93 ? plus : (h > 0.8 ? minus : 0.0);
      vec3 green = vec3(0.23, 0.95, 0.6);
      float empty = 1.0 - smoothstep(0.12, 0.4, a);
      vec3 gcol = vec3(a) + green * (dotm * empty * 0.95 + glyph * smoothstep(0.3, 0.6, a) * 0.85);
      gcol = mix(gcol, vec3(0.0), step(0.985, hash(gid * 1.7 + tq)) * step(0.3, a));
      float edge = min(min(css.x, vp.x - css.x), min(css.y, vp.y - css.y));
      gcol = mix(gcol, green, 1.0 - step(1.5, edge));
      col = mix(col, gcol, uGrid);
    }

    // red scanline waveform: lines pushed up by the density underneath
    if (uScan > 0.001) {
      float sp = 7.0;
      float wob = sin(css.x * 0.06 + uTime * 3.0) * 1.6 + sin(css.x * 0.21 - uTime * 5.0) * 0.9;
      float disp = a * 42.0 + wob * a;
      float l = abs(fract((css.y + disp) / sp) - 0.5) * sp;
      float line = 1.0 - smoothstep(0.55, 1.35, l);
      float keep = step(0.18, hash(vec2(floor((css.y + disp) / sp), floor(uTime * 6.0))));
      vec3 scol = vec3(0.92, 0.04, 0.04) * line * keep * (0.5 + 0.5 * a);
      col = mix(col, scol, uScan);
    }

    // NO SIGNAL static
    if (uStatic > 0.001) {
      float n = hash(floor(css / 2.0) + fract(uTime * 13.7) * 91.0);
      float speck = step(0.955, n) * (0.35 + 0.65 * hash(css + uTime));
      float ghost = a * 0.35 * step(0.75, n);
      float roll = smoothstep(0.1, 0.0, abs(fract(vUv.y - uTime * 0.3) - 0.5));
      vec3 st = vec3(0.8, 0.03, 0.03) * (speck + ghost) * (1.0 + roll * 0.8);
      col = mix(col, st, uStatic);
    }

    col += (hash(css + fract(uTime) * 100.0) - 0.5) * 0.028; // grain
    gl_FragColor = vec4(col, 1.0);
  }
`;

const postMat = new THREE.ShaderMaterial({
  uniforms: {
    tScene: { value: rt.texture },
    uRes: { value: new THREE.Vector2(1, 1) },
    uDpr: { value: DPR },
    uTime: { value: 0 },
    uGain: { value: 1 }, uMosaic: { value: 0 }, uDark: { value: 0 }, uGrid: { value: 0 },
    uRed: { value: 0 }, uScan: { value: 0 }, uStatic: { value: 0 }, uSmear: { value: 0 },
    uBlur: { value: 0 }, uJitter: { value: 0 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: POST_FS,
  depthTest: false,
  depthWrite: false,
});
const postScene = new THREE.Scene();
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));
const postCam = new THREE.Camera();

/* ------------------------------------------------------------- the model */
const U_MIRROR = { value: 0 };
const U_FALLOFF = { value: 2 };
const REVEAL_U = Object.fromEntries(STAGES.map((s) => [s, { value: 1 }]));
const DENSITY = (CFG.density || []).map(([re, v]) => [new RegExp(re), v]);
const densityFor = (name) => (DENSITY.find(([re]) => re.test(name)) || [0, CFG.defaultDensity ?? 0.8])[1];
const parts = [];
let M = { l: 1, w: 1, h: 1 }; // model size after normalising
let focus = new THREE.Vector3();
let focusSize = 1; // bbox diagonal of the close-up target

function xrayMaterial(density, revealU) {
  return new THREE.ShaderMaterial({
    uniforms: { uDensity: { value: density }, uReveal: revealU, uMirror: U_MIRROR, uFalloff: U_FALLOFF },
    vertexShader: XRAY_VS,
    fragmentShader: XRAY_FS,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  });
}

// Turn the model's front to -Z (glTF convention is +Z), sit it on y=0, centre it on x/z,
// and scale its largest extent to model.size.
function normalise(src) {
  const turn = { '-z': 0, '+z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 };
  src.rotation.y = turn[CFG.model?.forward || '+z'] ?? 0;
  src.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(src);
  const size = box.getSize(new THREE.Vector3());
  src.scale.setScalar((CFG.model?.size || 4.5) / (Math.max(size.x, size.y, size.z) || 1));
  src.updateMatrixWorld(true);
  box.setFromObject(src);
  const c = box.getCenter(new THREE.Vector3());
  src.position.set(-c.x, -box.min.y, -c.z);
  src.updateMatrixWorld(true);
  box.setFromObject(src).getSize(size);
  return { l: size.z, w: size.x, h: size.y };
}

const _b = new THREE.Box3();
const _v3 = new THREE.Vector3();
const centerOf = (o) => _b.setFromObject(o).getCenter(new THREE.Vector3());

/* ------------------------------------------------ splitting merged meshes */
// AI sculpts, scans and many downloads are one merged mesh, so there is nothing to assemble.
// split: 'auto' (when the model has < 6 meshes) | 'islands' | 'slices' | false.
// Islands = welded connected pieces (a kitbashed model); slices = a front band + five height bands.
function splitModel(src) {
  const mode = CFG.split ?? 'auto';
  const meshes = [];
  src.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh) meshes.push(o); });
  if (mode === false || (mode === 'auto' && meshes.length >= 6)) return;
  for (const mesh of meshes) {
    const geo = mesh.geometry;
    const tris = (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
    if (tris < 500) continue;
    const isl = mode === 'slices' ? [] : islands(geo);
    const useIslands = isl.length >= 6;
    const groups = useIslands ? groupIslands(geo, isl) : slices(mesh, tris);
    groups.forEach((g, i) => {
      const m = new THREE.Mesh(subGeometry(geo, g.tris), mesh.material);
      m.name = `${mesh.name || 'mesh'}_${useIslands ? 'island' : 'slice'}${i}`;
      m.position.copy(mesh.position); m.quaternion.copy(mesh.quaternion); m.scale.copy(mesh.scale);
      m.userData.stageHint = g.stage;
      (g.nodes || []).forEach((box, j) => m.add(helperNode(box, `${m.name}_node${j}`)));
      mesh.parent.add(m);
    });
    mesh.parent.remove(mesh);
    console.info(`[xray] split ${mesh.name || 'mesh'} (${tris} tris) into ${groups.length} ${useIslands ? `parts from ${isl.length} islands` : 'slices'}`);
  }
  src.updateMatrixWorld(true);
}

const vIndex = (geo) => { const idx = geo.index?.array; return idx ? (t, k) => idx[t * 3 + k] : (t, k) => t * 3 + k; };

function islands(geo) {
  const pos = geo.attributes.position;
  const tris = (geo.index ? geo.index.count : pos.count) / 3;
  const vi = vIndex(geo);
  geo.computeBoundingBox();
  const q = geo.boundingBox.getSize(_v3).length() * 1e-5 || 1e-6;
  // weld by position first: UV and normal seams split vertices that belong to one piece
  const weld = new Int32Array(pos.count);
  const keys = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = `${Math.round(pos.getX(i) / q)}|${Math.round(pos.getY(i) / q)}|${Math.round(pos.getZ(i) / q)}`;
    let w = keys.get(k);
    if (w === undefined) keys.set(k, (w = keys.size));
    weld[i] = w;
  }
  const up = new Int32Array(keys.size);
  for (let i = 0; i < up.length; i++) up[i] = i;
  const find = (a) => { while (up[a] !== a) a = up[a] = up[up[a]]; return a; };
  for (let t = 0; t < tris; t++) {
    const a = find(weld[vi(t, 0)]);
    const b = find(weld[vi(t, 1)]);
    if (a !== b) up[b] = a;
    const c = find(weld[vi(t, 2)]);
    if (c !== a) up[c] = a;
  }
  const byRoot = new Map();
  for (let t = 0; t < tris; t++) {
    const r = find(weld[vi(t, 0)]);
    let e = byRoot.get(r);
    if (!e) byRoot.set(r, (e = { tris: [], box: new THREE.Box3() }));
    e.tris.push(t);
    for (let k = 0; k < 3; k++) { const v = vi(t, k); e.box.expandByPoint(_v3.set(pos.getX(v), pos.getY(v), pos.getZ(v))); }
  }
  return [...byRoot.values()];
}

// The 40 biggest islands become parts; the rest merge into a 3×3×3 grid so crumbs aren't draw calls.
function groupIslands(geo, isl) {
  const diag = (e) => e.box.getSize(_v3).length();
  isl.sort((a, b) => diag(b) - diag(a));
  const out = isl.slice(0, 40).map((e) => ({ tris: e.tris }));
  const bb = geo.boundingBox, s = bb.getSize(new THREE.Vector3());
  const buckets = new Map();
  for (const e of isl.slice(40)) {
    const c = e.box.getCenter(_v3);
    const key = [0, 1, 2].map((ax) => Math.min(2, Math.floor(((c.getComponent(ax) - bb.min.getComponent(ax)) / (s.getComponent(ax) || 1)) * 3))).join();
    let b = buckets.get(key);
    if (!b) buckets.set(key, (b = { tris: [] }));
    for (const t of e.tris) b.tris.push(t);
  }
  return [...out, ...buckets.values()];
}

// One piece: slice by triangle centre into the six stages, and keep each slice's densest cells
// as invisible boxes so the tracker has nodes to lock onto.
function slices(mesh, tris) {
  const pos = mesh.geometry.attributes.position, vi = vIndex(mesh.geometry);
  const cx = new Float32Array(tris), cy = new Float32Array(tris), cz = new Float32Array(tris);
  const c = new THREE.Vector3();
  for (let t = 0; t < tris; t++) {
    c.set(0, 0, 0);
    for (let k = 0; k < 3; k++) { const v = vi(t, k); c.x += pos.getX(v); c.y += pos.getY(v); c.z += pos.getZ(v); }
    c.multiplyScalar(1 / 3).applyMatrix4(mesh.matrixWorld);
    cx[t] = c.x; cy[t] = c.y; cz[t] = c.z;
  }
  const isLead = (t) => cz[t] < -0.38 * M.l;
  const ys = [];
  for (let t = 0; t < tris; t++) if (!isLead(t)) ys.push(cy[t]);
  ys.sort((a, b) => a - b);
  const cut = [1, 2, 3, 4].map((i) => ys[Math.floor((ys.length * i) / 5)] ?? Infinity);
  const out = STAGES.map((stage) => ({ stage, tris: [], nodes: [] }));
  for (let t = 0; t < tris; t++) {
    if (isLead(t)) { out[0].tris.push(t); continue; }
    let band = 0;
    while (band < 4 && cy[t] >= cut[band]) band++;
    out[1 + band].tris.push(t);
  }
  const cell = 0.12 * M.l;
  for (const o of out) {
    const cells = new Map();
    for (const t of o.tris) {
      const key = `${Math.floor(cx[t] / cell)}|${Math.floor(cy[t] / cell)}|${Math.floor(cz[t] / cell)}`;
      let e = cells.get(key);
      if (!e) cells.set(key, (e = { n: 0, box: new THREE.Box3() }));
      e.n++;
      for (let k = 0; k < 3; k++) { const v = vi(t, k); e.box.expandByPoint(_v3.set(pos.getX(v), pos.getY(v), pos.getZ(v))); }
    }
    o.nodes = [...cells.values()].sort((a, b) => b.n - a.n).slice(0, 3).map((e) => e.box);
  }
  return out.filter((o) => o.tris.length);
}

let stamp = new Int32Array(0), remap = new Int32Array(0), stampId = 0;
function subGeometry(geo, tris) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, vi = vIndex(geo);
  if (stamp.length < pos.count) { stamp = new Int32Array(pos.count); remap = new Int32Array(pos.count); }
  const id = ++stampId;
  const P = [], N = [], I = new Uint32Array(tris.length * 3);
  let n = 0;
  for (let j = 0; j < tris.length; j++) {
    for (let k = 0; k < 3; k++) {
      const v = vi(tris[j], k);
      if (stamp[v] !== id) {
        stamp[v] = id; remap[v] = n++;
        P.push(pos.getX(v), pos.getY(v), pos.getZ(v));
        if (nor) N.push(nor.getX(v), nor.getY(v), nor.getZ(v));
      }
      I[j * 3 + k] = remap[v];
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setIndex(new THREE.BufferAttribute(I, 1));
  if (nor) g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  else g.computeVertexNormals();
  return g;
}

function helperNode(box, name) {
  const s = box.getSize(new THREE.Vector3()).max(new THREE.Vector3(1e-4, 1e-4, 1e-4));
  const h = new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z));
  box.getCenter(h.position);
  h.name = name;
  h.visible = false;
  h.userData.helper = true;
  return h;
}

// Walk the scene; the first object whose name matches a stage claims its whole subtree.
// Unmatched meshes go to CFG.fallback (default 'shell'), or with stages: 'auto' get split bottom-up.
function claimParts(src) {
  const auto = !CFG.stages || CFG.stages === 'auto';
  const rules = auto ? [] : STAGES.map((s) => [s, (CFG.stages[s] || []).map((r) => new RegExp(r))]);
  const claimed = [];
  const visit = (o) => {
    const hit = o !== src && o.name && rules.find(([, res]) => res.some((re) => re.test(o.name)));
    if (hit) return void claimed.push([o, hit[0]]);
    if (o.isMesh) return void claimed.push([o, null]);
    [...o.children].forEach(visit);
  };
  visit(src);

  // split pieces carry a stage hint (slices are the stages); honour it before any other rule
  claimed.forEach((e) => { if (!e[1] && e[0].userData.stageHint) e[1] = e[0].userData.stageHint; });
  const loose = claimed.filter(([, s]) => !s);
  if (auto) {
    // front 12% of the length leads; the rest builds bottom-up in five equal bands
    const withC = loose.map((e) => [e, centerOf(e[0])]);
    const lead = withC.filter(([, c]) => c.z < -0.38 * M.l);
    lead.forEach(([e]) => { e[1] = 'lead'; });
    const rest = withC.filter(([e]) => !e[1]).sort((a, b) => a[1].y - b[1].y);
    rest.forEach(([e], i) => { e[1] = STAGES[1 + Math.min(4, Math.floor((i / rest.length) * 5))]; });
  } else {
    loose.forEach((e) => { e[1] = CFG.fallback || 'shell'; });
    if (loose.length) console.info(`[xray] ${loose.length} unmatched meshes → ${CFG.fallback || 'shell'}`);
  }
  return claimed;
}

function setupModel(gltf) {
  const src = gltf.scene;
  M = normalise(src);
  splitModel(src);
  U_FALLOFF.value = 2.6 / M.h;
  const claimed = claimParts(src); // after normalise: auto-staging reads M
  for (const [o, stage] of claimed) {
    const c = centerOf(o);
    root.attach(o); // flatten hierarchy, keep world transform
    o.userData.stage = stage;
    o.traverse((m) => {
      if (!m.isMesh || m.userData.helper) return;
      if (!m.geometry.attributes.normal) m.geometry.computeVertexNormals();
      m.material = xrayMaterial(densityFor(m.name), REVEAL_U[stage]);
      m.frustumCulled = false;
    });
    const f = CFG.from?.[stage] || FROM[stage];
    const off = new THREE.Vector3(f[0] * M.w * (Math.sign(c.x) || 1), f[1] * M.h, f[2] * M.l);
    parts.push({ o, stage, base: o.position.clone(), off });
  }
  root.updateMatrixWorld(true);

  const counts = Object.fromEntries(STAGES.map((s) => [s, parts.filter((p) => p.stage === s).length]));
  console.info('[xray] size', `l=${M.l.toFixed(2)} w=${M.w.toFixed(2)} h=${M.h.toFixed(2)}`, 'stages', JSON.stringify(counts));
  STAGES.filter((s) => !counts[s]).forEach((s) => console.warn(`[xray] stage "${s}" is empty — the film will show nothing new there`));
  if (LOG_PARTS) {
    for (const p of parts) {
      const size = _b.setFromObject(p.o).getSize(new THREE.Vector3());
      const c = centerOf(p.o);
      console.info(`[xray] part ${p.stage.padEnd(5)} ${(p.o.name || '(unnamed)').padEnd(22)} centre ${c.toArray().map((v) => v.toFixed(2)).join(',')} size ${size.toArray().map((v) => v.toFixed(2)).join(',')}`);
    }
  }
}
// 'wheel_fr' → that node; 'wheel_fr/tire' → its first descendant whose name starts with 'tire'
function find(path) {
  const [head, ...rest] = path.split('/');
  let o = root.getObjectByName(head);
  for (const seg of rest) {
    if (!o) break;
    let hit = null;
    o.traverse((c) => { if (!hit && c !== o && c.name.startsWith(seg)) hit = c; });
    o = hit;
  }
  if (!o) console.warn('[xray] no node for', path);
  return o;
}

/* ------------------------------------------------------- tracking boxes */
const hud = document.getElementById('hud');
const hctx = hud.getContext('2d');
let TRACK_SETS = [];

function meshInfo() {
  const out = [];
  root.traverse((m) => {
    if (!m.isMesh) return;
    _b.setFromObject(m);
    const size = _b.getSize(new THREE.Vector3());
    out.push({ m, c: _b.getCenter(new THREE.Vector3()), diag: size.length(), vol: size.x * size.y * size.z });
  });
  return out;
}

// Mid-sized parts, spread out, ordered left to right.
function autoPick(list, n, near) {
  const pool = list
    .filter((e) => e.diag > 0.05 * M.l && e.diag < 0.35 * M.l && (!near || e.c.distanceTo(near) < 0.22 * M.l))
    .sort((a, b) => b.vol - a.vol);
  const picked = [];
  for (const e of pool) {
    if (picked.length >= n) break;
    if (picked.every((p) => p.c.distanceTo(e.c) > (near ? 0.02 : 0.15) * M.l)) picked.push(e);
  }
  return picked.sort((a, b) => a.c.x - b.c.x).map((e) => e.m);
}

function setupTracking() {
  const info = meshInfo();
  focusSize = 0.25 * M.l;
  const node = typeof CFG.focus === 'string' && find(CFG.focus);
  if (Array.isArray(CFG.focus)) focus.fromArray(CFG.focus);
  else if (node) { focus.copy(centerOf(node)); focusSize = _b.getSize(_v3).length(); }
  else {
    // a front corner that sits screen-left from overhead (+x)
    const best = info.filter((e) => e.diag > 0.05 * M.l && e.diag < 0.35 * M.l)
      .sort((a, b) => (b.c.x / M.w - b.c.z / M.l) - (a.c.x / M.w - a.c.z / M.l))[0];
    if (best) { focus.copy(best.c); focusSize = best.diag; }
  }
  const want = { front: 5, top: 6, detail: 5 };
  TRACK_SETS = Object.keys(want).map((k) => {
    const list = CFG.track?.[k];
    if (list?.length) return list.map(find).filter(Boolean);
    return autoPick(info, want[k], k === 'detail' ? focus : null);
  });
}

const _box = new THREE.Box3();
const _v = new THREE.Vector3();
function screenRect(obj, W, H) {
  _box.setFromObject(obj);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    _v.set(i & 1 ? _box.max.x : _box.min.x, i & 2 ? _box.max.y : _box.min.y, i & 4 ? _box.max.z : _box.min.z);
    _v.project(camera);
    const sx = (_v.x * 0.5 + 0.5) * W;
    const sy = (0.5 - _v.y * 0.5) * H;
    x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
  }
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

function drawHud(W, H) {
  hctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  hctx.clearRect(0, 0, W, H);
  const nodes = TRACK_SETS[Math.round(S.trackSet)];
  if (!nodes || S.track <= 0.001) return;

  const pts = [];
  hctx.lineWidth = 1;
  hctx.font = '9px "IBM Plex Mono", monospace';
  nodes.forEach((obj, i) => {
    const vis = Math.min(1, S.track * nodes.length - i);
    if (vis <= 0 || !obj) return;
    let top = obj;
    while (top.parent && top.parent !== root) top = top.parent;
    if (S[top.userData.stage] < 0.6) return; // part hasn't landed yet
    if (vis < 1 && Math.random() < 0.4) return; // flicker while locking on
    const r = screenRect(obj, W, H);
    const pad = 4;
    hctx.strokeStyle = '#3bf29a';
    hctx.strokeRect(Math.round(r.x0 - pad) + 0.5, Math.round(r.y0 - pad) + 0.5, Math.round(r.x1 - r.x0 + pad * 2), Math.round(r.y1 - r.y0 + pad * 2));
    hctx.fillStyle = '#3bf29a';
    hctx.fillRect(Math.round(r.cx) - 1, Math.round(r.cy) - 1, 3, 3);
    hctx.fillText(`ND-0${i + 1}`, Math.round(r.x0 - pad), Math.round(r.y0 - pad - 4));
    pts.push(r);
  });

  if (pts.length < 2) return;
  const path = () => {
    hctx.beginPath();
    pts.forEach((p, i) => (i ? hctx.lineTo(p.cx, p.cy) : hctx.moveTo(p.cx, p.cy)));
    if (pts.length > 2) { hctx.moveTo(pts[0].cx, pts[0].cy); hctx.lineTo(pts[2].cx, pts[2].cy); }
    hctx.stroke();
  };
  // white link lines, with a faint shadow so they survive on paper
  hctx.strokeStyle = 'rgba(0,0,0,.18)';
  hctx.save(); hctx.translate(0.6, 0.6); path(); hctx.restore();
  hctx.strokeStyle = 'rgba(255,255,255,.92)';
  path();
  hctx.strokeStyle = '#3bf29a';
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i].cx + pts[i - 1].cx) / 2, my = (pts[i].cy + pts[i - 1].cy) / 2;
    hctx.strokeRect(Math.round(mx) - 2.5, Math.round(my) - 2.5, 5, 5);
  }
}

/* ------------------------------------------------------------ overlay DOM */
const $ = (s) => document.querySelector(s);
const markers = $('.markers');
for (let i = 0; i < 9; i++) {
  const d = document.createElement('i');
  d.className = 'mk';
  d.innerHTML = '<svg viewBox="0 0 3 3" shape-rendering="crispEdges"><path d="M0 0h1v1H0zM2 0h1v1H2zM1 1h1v1H1zM0 2h1v1H0zM2 2h1v1H2z"/></svg>';
  markers.appendChild(d);
}
const elPct = $('.pct'), elTc = $('.tc'), elCh = $('.chname'), elBar = $('.progress span');
const chapters = [...document.querySelectorAll('.chap')];
const chapterEnds = [];
chapters.reduce((acc, c) => { chapterEnds.push(acc + +c.style.getPropertyValue('--len')); return chapterEnds.at(-1); }, 0);
if (Math.abs(chapterEnds.at(-1) - 100) > 0.01) console.warn(`[xray] chapter --len values sum to ${chapterEnds.at(-1)}, not 100 — captions will drift from the film`);

// decode-style text reveal
const GLYPHS = '█▓▒░<>/\\|-_=+*#01';
function scramble(el) {
  const final = el.dataset.text ?? (el.dataset.text = el.textContent);
  const t0 = performance.now();
  const dur = 380 + final.length * 9;
  cancelAnimationFrame(el._raf);
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    const n = Math.floor(final.length * k);
    let s = final.slice(0, n);
    for (let i = n; i < final.length; i++) s += final[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    el.textContent = s;
    if (k < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}

/* ------------------------------------------------------------ timeline */
// 100 units long; chapter <section> heights (--len × 13vh) in index.html use the same units.
const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
const ALL0 = Object.fromEntries(STAGES.map((s) => [s, 0]));
const WHITE = { dark: 0, grid: 0, mosaic: 0, red: 0, scan: 0, stat: 0, smear: 0 };
const kit = {
  tl, S, STAGES, ALL0, WHITE,
  get M() { return M; },
  get focus() { return focus; },
  get focusSize() { return focusSize; },
  set: (t, v) => tl.set(S, v, t),
  to: (t, dur, v, ease = 'none') => tl.to(S, { ...v, duration: dur, ease }, t),
  show: (sel, t, dur = 0.4, extra = {}) => tl.to(sel, { autoAlpha: 1, duration: dur, ...extra }, t),
  hide: (sel, t, dur = 0.4) => tl.to(sel, { autoAlpha: 0, duration: dur }, t),
  flash: (t, dur, on, off) => { tl.set(S, on, t); tl.set(S, off, t + dur); },
};

/* --------------------------------------------------------------- frame */
let W = 1, H = 1;
function resize() {
  W = innerWidth; H = innerHeight;
  renderer.setSize(W, H, false);
  rt.setSize(Math.floor(W * DPR), Math.floor(H * DPR));
  postMat.uniforms.uRes.value.set(Math.floor(W * DPR), Math.floor(H * DPR));
  hud.width = Math.floor(W * DPR); hud.height = Math.floor(H * DPR);
  camera.aspect = W / H;
}
addEventListener('resize', resize);

const D2R = Math.PI / 180;
function placeCamera() {
  const t = Math.tan((camera.fov * D2R) / 2);
  const fw = camera.aspect < 1 && S.el < 45 ? S.fw * 0.74 : S.fw; // portrait front views: fill more width, like a 4:5 film
  const dist = Math.max(fw / 2 / (t * camera.aspect), S.fh / 2 / t);
  const az = S.az * D2R, el = S.el * D2R;
  const pan = S.shift * (camera.aspect < 1 ? 0.4 : 1) * 2 * dist * t * camera.aspect;
  const tx = S.tx - Math.cos(az) * pan, tz = S.tz - Math.sin(az) * pan; // along screen-right
  camera.position.set(
    tx + dist * Math.sin(az) * Math.cos(el),
    S.ty + dist * Math.sin(el),
    tz - dist * Math.cos(az) * Math.cos(el),
  );
  camera.lookAt(tx, S.ty, tz);
  camera.near = dist * 0.05;
  camera.far = dist * 6;
  camera.updateProjectionMatrix();
}

function placeParts() {
  for (const s of STAGES) {
    const r = S[s];
    REVEAL_U[s].value = r * r * (3 - 2 * r);
  }
  for (const p of parts) {
    const r = S[p.stage];
    const e = 1 - Math.pow(1 - r, 3);
    p.o.position.copy(p.base).addScaledVector(p.off, 1 - e);
    p.o.visible = r > 0.001;
  }
}

let lenis = null;
let vel = 0;
let lastCh = -1;
const t0 = performance.now();

function frame() {
  const time = (performance.now() - t0) / 1000;
  placeCamera();
  placeParts();
  root.scale.y = 1;
  root.updateMatrixWorld(true);

  renderer.setRenderTarget(rt);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  U_MIRROR.value = 0;
  renderer.render(scene, camera);
  if (S.mirror > 0.01) {
    // floor reflection: the same scene flipped under y=0, fading with depth
    renderer.autoClear = false;
    root.scale.y = -1;
    root.updateMatrixWorld(true);
    U_MIRROR.value = S.mirror;
    renderer.render(scene, camera);
    root.scale.y = 1;
    root.updateMatrixWorld(true);
    renderer.autoClear = true;
  }

  // scrolling fast tears the image a little
  const v = lenis ? Math.min(1, Math.abs(lenis.velocity) / 70) : 0;
  vel += (v - vel) * 0.12;

  const u = postMat.uniforms;
  u.uTime.value = REDUCED ? 0 : time;
  u.uGain.value = S.gain; u.uMosaic.value = S.mosaic; u.uDark.value = S.dark; u.uGrid.value = S.grid;
  u.uRed.value = S.red; u.uScan.value = S.scan; u.uStatic.value = S.stat; u.uSmear.value = S.smear;
  u.uBlur.value = S.blur; u.uJitter.value = Math.min(1, S.jit + (REDUCED ? 0 : vel * 0.8));
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCam);

  drawHud(W, H);

  // readouts
  const p = tl.time();
  elPct.textContent = p.toFixed(1).padStart(5, '0');
  const secs = p * 0.12;
  elTc.textContent = `T+${String(Math.floor(secs / 60)).padStart(2, '0')}:${(secs % 60).toFixed(3).padStart(6, '0')}`;
  elBar.style.transform = `scaleX(${p / 100})`;
  let ch = chapterEnds.findIndex((end) => p < end);
  if (ch < 0) ch = chapters.length - 1;
  if (ch !== lastCh && chapters[ch]) { lastCh = ch; elCh.dataset.text = chapters[ch].dataset.ch; scramble(elCh); }
  window.__ready = true;
}

/* ---------------------------------------------------------------- boot */
async function boot() {
  resize();
  const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/');
  const ktx2 = new KTX2Loader().setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/basis/').detectSupport(renderer);
  const loader = new GLTFLoader().setDRACOLoader(draco).setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
  const lpct = $('.lpct');
  const gltf = await loader.loadAsync(CFG.model?.url || 'assets/model.glb', (e) => {
    if (e.total) lpct.textContent = `${String(Math.round((e.loaded / e.total) * 100)).padStart(3, '0')}%`;
  });
  setupModel(gltf);
  setupTracking();
  tl.to({}, { duration: 100 }, 0);
  film(kit);
  resize();

  // ?p= → unsmoothed scroll to that point; otherwise Lenis smooths the wheel and ScrollTrigger scrubs
  const debug = FIXED_P !== null;
  if (!debug && !REDUCED) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.85, touchMultiplier: 1.4 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  ScrollTrigger.create({ trigger: '.track', start: 'top top', end: 'bottom bottom', scrub: debug ? true : 0.6, animation: tl });
  chapters.forEach((sec) => {
    const cap = sec.querySelector('.cap');
    if (!cap) return;
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 45%',
      end: 'bottom 45%',
      onToggle: (st) => {
        cap.classList.toggle('on', st.isActive);
        if (st.isActive) cap.querySelectorAll('[data-scr]').forEach(scramble);
      },
    });
  });
  if (debug) {
    history.scrollRestoration = 'manual';
    scrollTo(0, (FIXED_P / 100) * (document.documentElement.scrollHeight - innerHeight));
    ScrollTrigger.update();
  }

  window.xray = { S, tl, camera, root, parts, find, get M() { return M; }, focus, TRACK_SETS };
  gsap.ticker.add(frame);
  $('.loader').classList.add('done');
}

boot().catch((err) => {
  console.error(err);
  const l = $('.loader');
  l.classList.add('err');
  l.querySelector('p').textContent = 'SIGNAL FAILED — SEE CONSOLE';
});
