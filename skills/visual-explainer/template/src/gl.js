// The 3D layer: one three.js world behind the DOM scenes, rendered once per seek(t).
// Real models (GLB), PBR + an environment map for reflections, soft shadows, depth of field, a little bloom for the
// gold glow. Motion blur comes from render.py (sub-frame averaging), so everything here must stay a pure function of t.
// A scene opts in with `gl: true`: it gets S.gl, a Group that is visible only inside the scene's [t0, t1) window.
// The hero and the camera belong to ONE scene that spans the whole reel (see src/scenes/set.js), so they never jump.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const F = window.FILM, G = F.gl || {};
const GLOW = 1;  // layer for additive glows: drawn, but left out of the depth pass so DOF doesn't treat them as solid

const canvas = document.createElement('canvas');
canvas.id = 'gl';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(F.w, F.h, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = G.exposure ?? 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(G.bg ?? F.theme.bg);
const camera = new THREE.PerspectiveCamera(G.fov ?? 30, F.w / F.h, 0.01, 200);
camera.layers.enable(GLOW);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = G.envIntensity ?? 0.6;

// default studio lights: a warm key with a soft shadow, a cool rim from behind, a dim fill. Scenes move or retune them.
const lights = {
  key: new THREE.DirectionalLight(0xfff1de, 2.2),
  rim: new THREE.DirectionalLight(0xcfe0ff, 1.6),
  fill: new THREE.HemisphereLight(0xbfcfe6, 0x1a1410, 0.25),
};
lights.key.position.set(2.5, 4, 3);
lights.key.castShadow = true;
lights.key.shadow.mapSize.set(2048, 2048);
lights.key.shadow.radius = 6;
lights.key.shadow.bias = -0.0004;
lights.key.shadow.normalBias = 0.02;
lights.rim.position.set(-3, 2, -4);
scene.add(lights.key, lights.key.target, lights.rim, lights.fill);

// post: render (MSAA) -> depth of field -> bloom (only the brightest bits, i.e. the glow) -> tone map + sRGB
const rt = new THREE.WebGLRenderTarget(F.w, F.h, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1);
composer.setSize(F.w, F.h);
composer.addPass(new RenderPass(scene, camera));
const dof = new BokehPass(scene, camera, { focus: 1, aperture: G.aperture ?? 0.012, maxblur: G.maxblur ?? 0.008 });
const dofRender = dof.render.bind(dof);
dof.render = (...a) => { camera.layers.disable(GLOW); dofRender(...a); camera.layers.enable(GLOW); };
composer.addPass(dof);
const bloom = new UnrealBloomPass(new THREE.Vector2(F.w, F.h), G.bloom?.strength ?? 0.55, G.bloom?.radius ?? 0.5, G.bloom?.threshold ?? 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---- assets ----
const gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();
const once = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };

// GL.glb(url) -> a fresh clone of the model's scene (skinned meshes cloned properly), shadows on
async function glb(url, { shadows = true } = {}) {
  const g = await once('glb:' + url, () => gltf.loadAsync(url));
  const root = SkeletonUtils.clone(g.scene);
  root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = shadows; } });
  root.userData.animations = g.animations;
  return root;
}
// GL.tex(url) -> colour texture (sRGB, mipmapped, anisotropic)
function tex(url, { srgb = true } = {}) {
  return once('tex:' + url + srgb, async () => {
    const t = await new THREE.TextureLoader().loadAsync(url);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  });
}
// GL.hdri(url): swap the studio environment for an equirect HDR (Poly Haven 1k/2k .hdr), optionally as the background
async function hdri(url, { background = false, intensity } = {}) {
  const t = await new HDRLoader().loadAsync(url);
  t.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = pmrem.fromEquirectangular(t).texture;
  if (background) { scene.background = scene.environment; scene.backgroundBlurriness = 0.4; }
  if (intensity != null) scene.environmentIntensity = intensity;
}

// GL.picture(url, {h, frame, depth}) -> a real image placed as an object: a framed print, a book, a card.
// frame: 'thin' (black gallery frame + white mat), 'wood', 'card' (rounded, no frame), 'book' (thick, cover on front)
async function picture(url, { h = 1, frame = 'thin', depth } = {}) {
  const t = await tex(url);
  const w = h * t.image.width / t.image.height;
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 }));
  face.receiveShadow = true;
  if (frame === 'card' || frame === 'book') {
    const d = depth ?? (frame === 'book' ? h * 0.12 : h * 0.012);
    const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h) * (frame === 'book' ? 0.01 : 0.04)),
      new THREE.MeshStandardMaterial({ color: frame === 'book' ? 0xf2efe8 : 0xffffff, roughness: 0.6 }));
    body.position.z = -d / 2; body.castShadow = body.receiveShadow = true;
    face.position.z = 0.0005;
    if (frame === 'card') { face.material.map = t; face.geometry = new RoundedPlane(w, h, Math.min(w, h) * 0.04); }
    g.add(body, face);
  } else {
    const m = frame === 'wood' ? 0.07 * h : 0.045 * h, mat = frame === 'wood' ? 0 : 0.08 * h, d = depth ?? 0.035 * h;
    const fw = w + 2 * (m + mat), fh = h + 2 * (m + mat);
    const frameMat = new THREE.MeshStandardMaterial(frame === 'wood' ? { color: 0x6b4a2f, roughness: 0.55 } : { color: 0x111111, roughness: 0.35, metalness: 0.2 });
    const body = new THREE.Mesh(new RoundedBoxGeometry(fw, fh, d, 2, d * 0.15), frameMat);
    body.position.z = -d / 2; body.castShadow = body.receiveShadow = true;
    const matte = new THREE.Mesh(new THREE.PlaneGeometry(w + 2 * mat, h + 2 * mat), new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.9 }));
    matte.position.z = 0.0004; face.position.z = 0.0008; matte.receiveShadow = true;
    g.add(body, matte, face);
  }
  g.userData.size = [w, h];
  return g;
}
class RoundedPlane extends THREE.ShapeGeometry {
  constructor(w, h, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    super(s, 8);
    const uv = this.attributes.uv, p = this.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
  }
}

// GL.screen(material, {w, h, draw}) -> a live screen: draw(ctx, t, w, h) paints a 2D canvas each frame (UI, call screen,
// share sheet) and it lights the device's screen. Use it on the model's screen material (see assets/models/SOURCES.md).
function screen(material, { w = 1179, h = 2556, draw, glow = 1 }) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.flipY = material.map ? material.map.flipY : false;
  material.map = t; material.emissiveMap = t; material.emissive = new THREE.Color(0xffffff); material.emissiveIntensity = glow;
  material.color = new THREE.Color(0x000000); material.roughness = 0.08; material.metalness = 0; material.needsUpdate = true;
  let last = null;
  return { canvas: c, ctx, texture: t, material,
    update(time) { const key = draw(ctx, time, w, h); if (key === undefined || key !== last) { t.needsUpdate = true; last = key; } } };
}

// GL.glow(color, opacity) -> additive, unlit material for the invisible actor (gold IR, charge, signal)
function glow(color = F.theme.signal, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.2), transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
}
// put an object (and its children) on the glow layer only
const onGlow = o => { o.traverse(c => c.layers.set(GLOW)); return o; };

// ---- camera ----
const V = (a) => new THREE.Vector3(...a);
const cr = (p0, p1, p2, p3, u) => {  // centripetal-ish Catmull-Rom on numbers (uniform; keys are spaced by the edit)
  const u2 = u * u, u3 = u2 * u;
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
};
// GL.cam(t, keys): keys = [[t, {pos:[x,y,z], at:[x,y,z], fov, focus, aperture, roll, ease}], ...]
// The camera flows THROUGH the keys on a spline (no stop at each key unless you repeat a key), so every change of view
// is one continuous move. `ease` on a key shapes the segment that arrives at it (default inOutSine; 'linear' to glide).
// Holds still drift: give a hold two keys a few cm apart. focus defaults to the distance to `at`.
function cam(t, keys) {
  const n = keys.length;
  let i = 0;
  while (i < n - 1 && t >= keys[i + 1][0]) i++;
  const k1 = keys[i][1], k2 = keys[Math.min(i + 1, n - 1)][1];
  const t1 = keys[i][0], t2 = keys[Math.min(i + 1, n - 1)][0];
  let u = t2 > t1 ? L.clamp((t - t1) / (t2 - t1), 0, 1) : 0;
  u = (L.ease[k2.ease || 'inOutSine'] || L.ease.inOutSine)(u);
  const k0 = keys[Math.max(i - 1, 0)][1], k3 = keys[Math.min(i + 2, n - 1)][1];
  const pick = (f, d) => [k0, k1, k2, k3].map(k => k[f] ?? d);
  const path = f => { const [a, b, c, d] = pick(f); return [0, 1, 2].map(j => cr(a[j], b[j], c[j], d[j], u)); };
  const num = (f, d) => { const [a, b, c, e] = pick(f, d); return cr(a, b, c, e, u); };
  const pos = path('pos'), at = path('at');
  camera.position.set(...pos);
  camera.up.set(0, 1, 0);
  camera.lookAt(...at);
  const roll = num('roll', 0);
  if (roll) camera.rotateZ(roll * Math.PI / 180);
  const fov = num('fov', G.fov ?? 30);
  if (Math.abs(camera.fov - fov) > 1e-6) { camera.fov = fov; camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld();
  const dist = Math.hypot(pos[0] - at[0], pos[1] - at[1], pos[2] - at[2]);
  dof.uniforms.focus.value = keys.some(k => k[1].focus != null) ? num('focus', dist) : dist;
  dof.uniforms.aperture.value = num('aperture', G.aperture ?? 0.012);
  return { pos, at };
}

// GL.inShot(t, keys, sx, sy, dist) -> {pos, quat}: where an object must sit to land at screen fraction (sx, sy) (0..1 from
// the top-left), dist metres in front of the camera at time t on that camera path, facing the camera. Use it to put a sourced
// photo card into the set as a real object, so it parallaxes, takes the light and rides the camera move like everything else.
function inShot(t, keys, sx, sy, dist) {
  cam(t, keys);
  const d = new THREE.Vector3(sx * 2 - 1, 1 - sy * 2, 0.5).unproject(camera).sub(camera.position).normalize();
  return { pos: camera.position.clone().addScaledVector(d, dist), quat: camera.quaternion.clone() };
}

// GL.project(objOrVec3) -> {x, y, z, on}: screen px of a 3D point, for pinning DOM labels and numbers to parts
const _v = new THREE.Vector3();
function project(p) {
  if (p.isObject3D) { p.updateWorldMatrix(true, false); _v.setFromMatrixPosition(p.matrixWorld); }
  else if (Array.isArray(p)) _v.set(...p); else _v.copy(p);
  _v.project(camera);
  return { x: (_v.x * 0.5 + 0.5) * F.w, y: (-_v.y * 0.5 + 0.5) * F.h, z: _v.z, on: _v.z < 1 && Math.abs(_v.x) < 1.2 && Math.abs(_v.y) < 1.2 };
}

// fit the key light's shadow camera around an object (call after placing the hero)
function shadowFit(obj, pad = 1.3) {
  const b = new THREE.Box3().setFromObject(obj), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const r = Math.max(s.x, s.y, s.z) * pad;
  const sc = lights.key.shadow.camera;
  Object.assign(sc, { left: -r, right: r, top: r, bottom: -r, near: 0.01, far: r * 8 });
  sc.updateProjectionMatrix();
  lights.key.target.position.copy(c);
  lights.key.position.copy(c).add(lights.key.position.clone().sub(c).normalize().multiplyScalar(r * 3));
}

const screens = [];
window.GL = {
  THREE, renderer, scene, camera, lights, composer, dof, bloom, canvas, GLOW,
  glb, tex, hdri, picture, glow, onGlow, cam, inShot, project, shadowFit, RoundedBoxGeometry, RoundedPlane,
  screen: (m, o) => { const s = screen(m, o); screens.push(s); return s; },
  render(t) { for (const s of screens) s.update(t); composer.render(); },
};
window.dispatchEvent(new Event('gl-ready'));
