import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {U, ID, heroMaterial, raw} from './materials.js';
import {buildSet} from './sets.js';
import {createPost} from './post.js';
import {drawMasthead} from './masthead.js';
import {createFX} from './fx.js';
import * as audio from './audio.js';

// ------------------------------------------------------------------ config
const DEFAULTS = {
  model: 'assets/model.glb',
  hero: {
    name: 'the hero', scale: 1, position: [0, 0, 0], rotation: [0, 0, 0],
    emitter: null, emitterBone: null, head: null, headBone: null, pose: null, decals: [], hotspots: [], hide: [], recolor: [], words: ['POW!'],
    shade: {warmShadow: [0.5, 0.27, 0.5], coolShadow: [0.3, 0.32, 0.52], coolSpec: [0.3, 0.46, 0.78], coolRim: [0.22, 0.36, 0.7], warmRim: [0.34, 0.2, 0.5]},
  },
  camera: {az: -0.5, el: -0.35, dist: null, roll: -0.2, fov: 37, target: null, drag: true},
  set: {kind: 'city', sky: 'storm'},
  power: {kind: 'web', words: ['THWIP!'], sound: 'thwip', color: null},
  skyClick: null,
  sense: {label: 'Spider-sense', key: 'S', duotone: ['#0d0008', '#f2142e'], squiggles: true, sound: 'tingle', style: 'duotone'},
  masthead: {title: 'TITLE', kicker: '', credits: '', font: 'Bangers', pattern: 'none'},
  dress: {issue: '1', month: 'SEPT', price: '$3.99', emblem: null, caption: [], barcode: '7 25274 00001 9  01'},
  spatter: [],
  hint: null,
};
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
function merge(a, b) {
  if (b === null) return null;
  if (!isObj(a) || !isObj(b)) return b === undefined ? a : b;
  const o = {...a};
  for (const k of Object.keys(b)) o[k] = merge(a[k], b[k]);
  return o;
}
const params = new URLSearchParams(location.search);
const C = merge(DEFAULTS, window.COVER || {});
if (params.has('seed')) C.set.seed = +params.get('seed'); // try city layouts without editing the config
const num = (k, d) => (params.has(k) ? parseFloat(params.get(k)) : d);
const still = params.has('still') || matchMedia('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------------ DOM (cover furniture comes from the config)
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const cover = document.getElementById('cover');
const DEFAULT_EMBLEM = '<svg viewBox="-50 -50 100 100"><path d="M8-46 -26 6h22l-10 40 36-54H0z" fill="#0e0b10"/></svg>';
cover.innerHTML = `
  <canvas id="gl"></canvas>
  <div class="fx" id="fx"></div>
  <svg class="sense" id="sense" viewBox="-100 -100 200 200" aria-hidden="true"></svg>
  <div class="dress" id="dress">
    <div class="corner">
      <div class="cb-top"><span class="cb-no">No.</span><span class="cb-num">${esc(C.dress.issue)}</span></div>
      <div class="cb-art">${C.dress.emblem || DEFAULT_EMBLEM}</div>
      <div class="cb-bot"><span>${esc(C.dress.month)}</span><span>${esc(C.dress.price)}</span></div>
    </div>
    ${C.dress.caption?.length ? `<div class="caption">${C.dress.caption.map((l) => `<span>${esc(l)}</span>`).join('')}</div>` : ''}
    <div class="barcode"><div class="bc-label">DIRECT EDITION</div><svg id="bars" viewBox="0 0 95 40" preserveAspectRatio="none" aria-hidden="true"></svg><div class="bc-digits">${esc(C.dress.barcode)}</div></div>
  </div>
  <div class="gloss" aria-hidden="true"></div>
  <div class="loading" id="loading"><div class="ld-word">PRINTING<span>…</span></div><div class="ld-bar"><i id="ldbar"></i></div></div>`;
cover.setAttribute('aria-label', `Interactive comic cover: ${C.masthead.title}`);
const stage = cover.closest('.stage') || document.body;
const nav = document.createElement('nav');
nav.className = 'toolbar';
nav.setAttribute('aria-label', 'Cover controls');
nav.innerHTML = `
  <div class="seg" role="radiogroup" aria-label="Art stage">
    <button role="radio" data-stage="0" aria-checked="false"><kbd>1</kbd> Pencils</button>
    <button role="radio" data-stage="1" aria-checked="false"><kbd>2</kbd> Inks</button>
    <button role="radio" data-stage="2" aria-checked="true"><kbd>3</kbd> Colors</button>
  </div>
  ${C.sense ? `<button class="chip" id="senseBtn" aria-pressed="false"><kbd>${esc(C.sense.key)}</kbd> ${esc(C.sense.label)}</button>` : ''}
  <button class="chip icon" id="muteBtn" aria-pressed="false" aria-label="Mute sound">
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path class="wave" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
  </button>`;
stage.appendChild(nav);
const hintEl = document.createElement('p');
hintEl.className = 'hint';
stage.appendChild(hintEl);

const $ = (id) => document.getElementById(id);
const canvas = $('gl'), dress = $('dress'), senseEl = $('sense');

// ------------------------------------------------------------------ renderer / scene
const renderer = new THREE.WebGLRenderer({canvas, antialias: false, powerPreference: 'high-performance'});
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(num('fov', C.camera.fov), 0.6463, 0.05, 900);
const set = buildSet(scene, C.set);
const post = createPost(renderer);
if (C.sense?.duotone) { post.uniforms.duoA.value.copy(raw(C.sense.duotone[0])); post.uniforms.duoB.value.copy(raw(C.sense.duotone[1])); }
post.uniforms.radar.value = C.sense?.style === 'radar' ? 1 : 0;
(C.spatter || []).slice(0, 4).forEach((sp, i) => post.uniforms.spat.value[i].set(sp[0], sp[1], sp[2] ?? 0.12, sp[3] ?? 0.5));
post.uniforms.nSpat.value = Math.min((C.spatter || []).length, 4);
let fx = createFX({scene, camera, layer: $('fx'), power: C.power});

const RIG = {
  target: new THREE.Vector3(),
  az: num('az', C.camera.az), el: num('el', C.camera.el), dist: num('dist', C.camera.dist ?? 3), roll: num('roll', C.camera.roll),
};
if (C.camera.target) RIG.target.fromArray(C.camera.target);
const view = {yaw: 0, pitch: 0, vyaw: 0, vpitch: 0, mx: 0, my: 0, tmx: 0, tmy: 0};
const state = {sense: 0, senseOn: false, walk: 0, walkOn: false, count: -1, hoverId: -1, loaded: false, mast: false};
const hero = {root: new THREE.Group(), emitter: new THREE.Vector3(), head: new THREE.Vector3(), center: new THREE.Vector3(), box: new THREE.Box3(), mixer: null, play: false};
hero.root.position.fromArray(C.hero.position);
hero.root.rotation.set(...C.hero.rotation.map((d) => THREE.MathUtils.degToRad(d)));
hero.root.scale.setScalar(C.hero.scale);
scene.add(hero.root);

function placeCamera(t) {
  const drift = still ? 0 : Math.sin(t * 0.23) * 0.015;
  const az = RIG.az + view.yaw + view.mx * 0.09 + drift;
  const el = THREE.MathUtils.clamp(RIG.el + view.pitch - view.my * 0.05, -1.2, 1.2);
  const d = RIG.dist;
  camera.position.set(
    RIG.target.x + d * Math.sin(az) * Math.cos(el),
    RIG.target.y + d * Math.sin(el),
    RIG.target.z + d * Math.cos(az) * Math.cos(el));
  camera.up.set(0, 1, 0);
  camera.lookAt(RIG.target);
  camera.rotateZ(RIG.roll + view.yaw * 0.08);
  camera.updateMatrixWorld();
}

// ------------------------------------------------------------------ sizing + masthead
let size = {w: 1, h: 1, dpr: 1};
let mastTex = null, mastInkTex = null;
const font = C.masthead.font || 'Bangers';
if (!['Bangers'].includes(font)) {
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}&display=block`;
  document.head.appendChild(l);
}
const fontsReady = Promise.all([
  document.fonts.load(`80px "${font}"`), document.fonts.load('80px Bangers'), document.fonts.load('700 20px Oswald'), document.fonts.load('500 20px Oswald'),
]).catch(() => {});
async function resize() {
  const w = cover.clientWidth, h = cover.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (w === size.w && h === size.h && dpr === size.dpr) return;
  size = {w, h, dpr};
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  post.setSize(w, h, dpr);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  await fontsReady;
  const m = drawMasthead(Math.round(w * dpr), Math.round(h * dpr), {...C.masthead, font: `"${font}"`});
  mastTex?.dispose(); mastInkTex?.dispose();
  mastTex = new THREE.CanvasTexture(m.color);
  mastInkTex = new THREE.CanvasTexture(m.ink);
  for (const t of [mastTex, mastInkTex]) { t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; }
  post.uniforms.tMast.value = mastTex;
  post.uniforms.tMastInk.value = mastInkTex;
  state.mast = true;
}
{
  const c = document.createElement('canvas'); c.width = c.height = 1;
  post.uniforms.tMast.value = new THREE.CanvasTexture(c);
  post.uniforms.tMastInk.value = new THREE.CanvasTexture(c);
}
new ResizeObserver(() => resize()).observe(cover);

// ------------------------------------------------------------------ hero
const v3 = (a) => new THREE.Vector3().fromArray(a);
const shared = {
  uHeroInv: {value: new THREE.Matrix4()},
  shade: C.hero.shade,
  decals: (C.hero.decals || []).map((d) => {
    const n = v3(d.normal).normalize();
    const u = new THREE.Vector3().crossVectors(v3(d.up || [0, 1, 0]), n).normalize();
    return {c: v3(d.center), n, u, s: new THREE.Vector3(d.size[0], d.size[1], d.depth ?? 0.035),
      kind: d.kind === 'walk-signal' ? 0 : 1, color: raw(d.color || '#7fe8ff'), keepSat: d.keepSat ?? 0.55};
  }),
  hotspots: (C.hero.hotspots || []).slice(0, 4).map((h) => ({min: v3(h.box[0]), max: v3(h.box[1]), match: h.match === 'all' ? 0 : 1})),
  // hide: [{box, match}] discards; recolor: [{box, match, color}] repaints (both share the shader slots, max 4)
  hide: [...(C.hero.hide || []), ...(C.hero.recolor || [])].slice(0, 4).map((h) => {
    const c = h.color ? raw(h.color) : null;
    return {min: v3(h.box[0]), max: v3(h.box[1]), match: h.match === 'all' ? 0 : 1, color: new THREE.Vector4(c?.r ?? 0, c?.g ?? 0, c?.b ?? 0, c ? 1 : 0)};
  }),
};
let bones = {};
const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.186.0/examples/jsm/libs/draco/gltf/');
new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setDRACOLoader(draco).load(C.model, (gltf) => {
  const root = gltf.scene;
  root.traverse((o) => {
    if (o.isBone) bones[o.name] = o;
    if (o.isMesh) {
      o.material = Array.isArray(o.material) ? o.material.map((m) => heroMaterial(m, shared)) : heroMaterial(o.material, shared);
      o.frustumCulled = false;
    }
  });
  hero.root.add(root);
  if (C.hero.pose && gltf.animations.length) {
    const p = C.hero.pose;
    const clip = typeof p.clip === 'number' ? gltf.animations[p.clip] : THREE.AnimationClip.findByName(gltf.animations, p.clip) || gltf.animations[0];
    hero.mixer = new THREE.AnimationMixer(root);
    hero.mixer.clipAction(clip).play();
    hero.mixer.setTime(p.time ?? 0);
    hero.play = !!p.play;
  }
  hero.root.updateMatrixWorld(true);
  hero.box.setFromObject(hero.root, true);
  hero.box.getCenter(hero.center);
  const hSize = hero.box.getSize(new THREE.Vector3());
  shared.uHeroInv.value.copy(hero.root.matrixWorld).invert();
  fx = createFX({scene, camera, layer: $('fx'), power: C.power, scale: Math.max(hSize.y, 0.2) / 1.2});
  // default framing: fit the hero, leave the top fifth for the masthead
  if (!C.camera.target) RIG.target.copy(hero.center).add(new THREE.Vector3(0, hSize.y * 0.14, 0));
  if (!C.camera.dist && !params.has('dist')) {
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    RIG.dist = Math.max(hSize.y * 0.5 * 1.3 / t, Math.max(hSize.x, hSize.z) * 0.5 * 1.2 / (t * 0.6463));
  }
  renderer.compile(scene, camera);
  state.loaded = true;
  $('ldbar').style.width = '100%';
  fontsReady.then(() => setTimeout(() => $('loading').classList.add('done'), 150));
}, (e) => {
  if (e.total) $('ldbar').style.width = `${Math.round(e.loaded / e.total * 92)}%`;
}, (err) => {
  console.error(err);
  document.querySelector('.ld-word').textContent = 'MISPRINT!';
});

// model-space point (or bone) → world
const tmpV = new THREE.Vector3();
function heroPoint(point, bone, fallback, out) {
  if (bone && bones[bone]) return bones[bone].getWorldPosition(out);
  if (point) return hero.root.localToWorld(out.fromArray(point));
  return out.copy(fallback);
}
function refreshHeroPoints() {
  const top = new THREE.Vector3(hero.center.x, hero.box.max.y, hero.center.z);
  heroPoint(C.hero.emitter, C.hero.emitterBone, top, hero.emitter);
  heroPoint(C.hero.head, C.hero.headBone, top.clone().setY(hero.box.max.y - (hero.box.max.y - hero.box.min.y) * 0.1), hero.head);
}

// ------------------------------------------------------------------ picking
const pickBuf = new Uint16Array(4);
function pickId(u, v) {
  const x = Math.floor(u * post.rt.width), y = Math.floor((1 - v) * post.rt.height);
  if (x < 0 || y < 0 || x >= post.rt.width || y >= post.rt.height) return -1;
  renderer.readRenderTargetPixels(post.rt, x, y, 1, 1, pickBuf, undefined, 1);
  return THREE.DataUtils.fromHalfFloat(pickBuf[3]);
}
const isHero = (id) => id > 0.95;
const isSignal = (id) => Math.abs(id - ID.signal) < 0.03;
const hotspotAt = (id) => (id > 0.59 && id < 0.67 ? Math.round((id - 0.6) / 0.02) : -1);
const isSky = (id) => id >= 0 && id < 0.05;

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function rayAt(u, v) {
  ndc.set(u * 2 - 1, -(v * 2 - 1));
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray;
}
function hitWorld(u, v) {
  const ray = rayAt(u, v);
  let best = null;
  const p = new THREE.Vector3();
  for (const b of set.colliders) {
    if (!ray.intersectBox(b, p)) continue;
    const d = p.distanceTo(ray.origin);
    if (best && d >= best.d) continue;
    const n = new THREE.Vector3(), e = 0.02;
    if (Math.abs(p.x - b.min.x) < e) n.set(-1, 0, 0); else if (Math.abs(p.x - b.max.x) < e) n.set(1, 0, 0);
    else if (Math.abs(p.z - b.min.z) < e) n.set(0, 0, -1); else if (Math.abs(p.z - b.max.z) < e) n.set(0, 0, 1);
    else n.set(0, 1, 0);
    best = {d, point: p.clone(), normal: n};
  }
  for (const g of set.pickables) {
    const hits = raycaster.intersectObject(g, true);
    if (hits.length && (!best || hits[0].distance < best.d)) {
      const n = hits[0].face ? hits[0].face.normal.clone().transformDirection(hits[0].object.matrixWorld) : ray.direction.clone().negate();
      best = {d: hits[0].distance, point: hits[0].point.clone(), normal: n};
    }
  }
  return best;
}

// ------------------------------------------------------------------ actions
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const SOUNDS = {thwip: audio.thwip, zap: audio.zap, pow: audio.pow, tingle: audio.tingle, click: audio.click, thunder: audio.thunder,
  bell: audio.bell, swish: audio.swish, clack: audio.clack, radar: audio.radar, none: () => {}};
const play = (name) => (SOUNDS[name] || SOUNDS.none)();

function usePower(u, v) {
  const P = C.power;
  const hit = hitWorld(u, v);
  const ray = rayAt(u, v);
  const to = hit ? hit.point : ray.at(Math.max(RIG.dist * 3, 12), new THREE.Vector3());
  if (P.kind === 'club') {
    // the words land with the club, not when it leaves the hand
    fx.throwClub(hero.emitter, to, hit ? hit.normal : null, hit ? (p) => {
      fx.sfx(pick(P.words), p, {size: 0.85, style: 2, dy: -4});
      audio.clack();
    } : null);
    play(P.sound || 'swish');
    return;
  }
  if (P.kind === 'web') fx.shootWeb(hero.emitter, to, hit ? hit.normal : null);
  else if (P.kind === 'beam') fx.fireBeam(hero.emitter, to);
  const at = P.kind === 'web' ? hero.emitter : {x: u * 100, y: v * 100};
  fx.sfx(pick(P.words), at, {size: 0.9, style: P.kind === 'web' ? 1 : 0, dx: P.kind === 'web' ? 4 : 0, dy: P.kind === 'web' ? -9 : 0});
  play(P.sound);
}
function boltThrough(u, v) {
  const D = 150;
  const top = rayAt(u + (Math.random() - 0.5) * 0.1, Math.max(v - 0.24, 0.02)).direction.clone().multiplyScalar(D).add(camera.position);
  const bot = rayAt(u + (Math.random() - 0.5) * 0.2, Math.min(v + 0.3, 0.98)).direction.clone().multiplyScalar(D).add(camera.position);
  fx.lightning(top, bot);
}
function strike(u, v) {
  boltThrough(u, v);
  fx.sfx(pick(['KRAKOOM!', 'KRA-KATHOOM!', 'BRAKOOOM!']), {x: u * 100, y: v * 100}, {size: 1.05, style: 0});
  setTimeout(() => audio.thunder(), 120);
}
function skyClick(u, v) {
  const mode = C.skyClick || (set.storm ? 'lightning' : 'power');
  if (mode === 'lightning') strike(u, v);
  else if (mode === 'power') usePower(u, v);
  else fx.sfx(pick(C.hero.words), {x: u * 100, y: v * 100});
}
function setSense(on) {
  if (!C.sense) return;
  state.senseOn = on;
  $('senseBtn')?.setAttribute('aria-pressed', String(on));
  if (on) play(C.sense.sound);
}
function heroClick(u, v) {
  if (C.sense) setSense(!state.senseOn);
  else { fx.sfx(pick(C.hero.words), {x: u * 100, y: v * 100}, {size: 0.9}); audio.pow(); }
}
let walkTimer = null;
function toggleWalk() {
  state.walkOn = !state.walkOn;
  audio.click();
  clearInterval(walkTimer);
  state.count = -1;
  if (state.walkOn) {
    state.count = 9;
    walkTimer = setInterval(() => {
      state.count--;
      if (state.count < 0) { clearInterval(walkTimer); state.walkOn = false; }
    }, 1000);
  }
  const d = C.hero.decals.find((x) => x.kind === 'walk-signal');
  const p = d ? fx.toCover(hero.root.localToWorld(v3(d.center))) : {x: 50, y: 70};
  fx.sfx(state.walkOn ? 'CHIRP!' : 'CLICK!', p, {size: 0.55, style: state.walkOn ? 1 : 0, dx: -12, dy: 3});
}
function hotspot(i, u, v) {
  const h = C.hero.hotspots[i];
  if (!h) return;
  if (h.action === 'walk') toggleWalk();
  else if (h.action === 'sense') setSense(!state.senseOn);
  else if (h.action === 'power') usePower(u, v);
  else { fx.sfx(pick(h.words || C.hero.words), {x: u * 100, y: v * 100}, {size: 0.7}); play(h.sound || 'click'); }
}
function setStage(n) {
  if (n === post.stage) return;
  post.setStage(n, performance.now() / 1000);
  document.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.stage === n)));
  dress.classList.toggle('inks', n === 1);
  dress.classList.toggle('pencils', n === 0);
  audio.pencil();
}
// clickable set pieces (a bell tower…): their own id, a word, a sound, and optionally a sense pulse
let pulseTimer = null;
function propClick(p, u, v) {
  fx.sfx(pick(p.words), {x: u * 100, y: v * 100}, {size: p.size ?? 1, style: p.style ?? 1});
  play(p.sound || 'click');
  if (p.pulse && C.sense && !state.senseOn) {
    setSense(true);
    clearTimeout(pulseTimer);
    pulseTimer = setTimeout(() => setSense(false), p.pulse * 1000);
  }
}
const propAt = (id) => set.clickables.find((p) => Math.abs(id - p.id) < 0.008);
function clickAt(u, v) {
  const id = pickId(u, v);
  if (isHero(id)) heroClick(u, v);
  else if (isSignal(id)) toggleWalk();
  else if (hotspotAt(id) >= 0) hotspot(hotspotAt(id), u, v);
  else if (propAt(id)) propClick(propAt(id), u, v);
  else if (isSky(id)) skyClick(u, v);
  else usePower(u, v);
  return id;
}

// hint line
{
  const parts = [];
  if (C.camera.drag) parts.push('Drag to look around');
  const word = (C.power.words[0] || '').replace(/[!?.]+$/, '').toLowerCase();
  if (C.power.kind !== 'none') parts.push(`click ${set.colliders.length || set.pickables.length ? 'a building' : 'the background'} to <b>${esc(word)}</b>`);
  if (set.storm) parts.push('click the sky');
  for (const h of C.hero.hotspots) if (h.label) parts.push(`click the ${esc(h.label)}`);
  for (const p of set.clickables) if (p.label) parts.push(`click the ${esc(p.label)}`);
  parts.push(`click ${esc(C.hero.name)}`);
  hintEl.innerHTML = C.hint ?? parts.join(' · ');
}

// ------------------------------------------------------------------ input
let drag = null;
let hoverUV = null;
const localUV = (e) => ({u: e.offsetX / canvas.clientWidth, v: e.offsetY / canvas.clientHeight});
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  drag = {x: e.clientX, y: e.clientY, yaw0: view.yaw, pitch0: view.pitch, moved: false, uv: localUV(e)};
});
canvas.addEventListener('pointermove', (e) => {
  hoverUV = localUV(e);
  if (!drag || !C.camera.drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) > 6) { drag.moved = true; cover.classList.add('dragging'); }
  if (drag.moved) {
    const k = 1 / cover.clientWidth;
    view.yaw = THREE.MathUtils.clamp(drag.yaw0 - dx * k * 2.2, -1.1, 1.1);
    view.pitch = THREE.MathUtils.clamp(drag.pitch0 + dy * k * 1.2, -0.35, 0.55);
    view.vyaw = view.vpitch = 0;
  }
});
function endDrag(e) {
  if (!drag) return;
  if (!drag.moved && e.type === 'pointerup' && state.loaded) clickAt(drag.uv.u, drag.uv.v);
  drag = null;
  cover.classList.remove('dragging');
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('pointerleave', () => { hoverUV = null; });
window.addEventListener('pointermove', (e) => {
  view.tmx = THREE.MathUtils.clamp((e.clientX / innerWidth) * 2 - 1, -1, 1);
  view.tmy = THREE.MathUtils.clamp((e.clientY / innerHeight) * 2 - 1, -1, 1);
});
document.addEventListener('pointerleave', () => { view.tmx = view.tmy = 0; });
document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => setStage(+b.dataset.stage)));
$('senseBtn')?.addEventListener('click', () => setSense(!state.senseOn));
$('muteBtn').addEventListener('click', (e) => {
  const m = !audio.isMuted();
  audio.setMuted(m);
  e.currentTarget.setAttribute('aria-pressed', String(m));
  e.currentTarget.setAttribute('aria-label', m ? 'Unmute sound' : 'Mute sound');
});
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '1' || e.key === '2' || e.key === '3') setStage(+e.key - 1);
  else if (C.sense && e.key.toLowerCase() === C.sense.key.toLowerCase()) setSense(!state.senseOn);
  else if (e.key === 'm' || e.key === 'M') $('muteBtn').click();
});

// barcode + spider-sense squiggles
{
  let x = 0, html = '';
  const r = ((s) => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
  while (x < 95) {
    const w = [1, 1, 1, 2, 2, 3][Math.floor(r() * 6)];
    const guard = x < 3 || (x > 46 && x < 49) || x > 91;
    html += `<rect x="${x}" y="0" width="${w * 0.9}" height="${guard ? 40 : 35}" fill="#0e0b10"/>`;
    x += w + [1, 1, 2, 3][Math.floor(r() * 4)];
  }
  $('bars').innerHTML = html;
  let paths = '';
  for (const a of [-160, -128, -100, -72, -44, -16, 14, 160, 190]) {
    const rad = a * Math.PI / 180, dir = [Math.cos(rad), Math.sin(rad)], perp = [-dir[1], dir[0]];
    let d = '';
    for (let i = 0; i <= 24; i++) {
      const s = i / 24, rr = 50 + s * 38, w = Math.sin(s * Math.PI * 3.5) * 5.5 * (1 - s * 0.3);
      d += (i ? 'L' : 'M') + (dir[0] * rr + perp[0] * w).toFixed(1) + ' ' + (dir[1] * rr + perp[1] * w).toFixed(1);
    }
    paths += `<path d="${d}"/><path class="hi" d="${d}"/>`;
  }
  senseEl.innerHTML = `<g>${paths}</g>`;
}

// ------------------------------------------------------------------ loop
let last = performance.now() / 1000;
let nextBolt = last + 7 + Math.random() * 6;
let frameNo = 0, poseClock = 0;
const vpTmp = new THREE.Vector3();
if (params.has('stage')) setTimeout(() => setStage(+params.get('stage')), 50);

function frame(nowMs) {
  const t = nowMs / 1000;
  const dt = Math.min(t - last, 0.05);
  last = t;
  frameNo++;

  const k = 1 - Math.exp(-dt * 6);
  view.mx += (view.tmx - view.mx) * k;
  view.my += (view.tmy - view.my) * k;
  if (!drag || !drag.moved) {
    view.vyaw += (-38 * view.yaw - 9.5 * view.vyaw) * dt;
    view.vpitch += (-38 * view.pitch - 9.5 * view.vpitch) * dt;
    view.yaw += view.vyaw * dt;
    view.pitch += view.vpitch * dt;
  }
  placeCamera(t);
  cover.style.setProperty('--rx', `${(-view.my * 4.5).toFixed(2)}deg`);
  cover.style.setProperty('--ry', `${(view.mx * 6.5).toFixed(2)}deg`);
  cover.style.setProperty('--gx', view.mx.toFixed(3));

  // animated heroes pose on twos (12 fps), like drawn animation
  if (hero.mixer && hero.play) {
    poseClock += dt;
    if (poseClock >= 1 / 12) { hero.mixer.update(poseClock); poseClock = 0; }
  }
  if (state.loaded) refreshHeroPoints();
  if (state.loaded && set.resolve) { set.resolve(camera); set.resolve = null; } // page-anchored set pieces

  state.sense += ((state.senseOn ? 1 : 0) - state.sense) * (1 - Math.exp(-dt * 7));
  state.walk += ((state.walkOn ? 1 : 0) - state.walk) * (1 - Math.exp(-dt * 10));
  U.uWalk.value = state.walk;
  U.uCount.value = state.walkOn ? state.count : -1;
  U.uCamPos.value.copy(camera.position);
  U.uTime.value = t;
  if (set.sky.material.uniforms.uBurstDir) set.sky.material.uniforms.uBurstDir.value.copy(hero.center).sub(camera.position).normalize();

  if (set.storm && !still && t > nextBolt && state.loaded) {
    for (let i = 0; i < 6; i++) {
      const u = 0.08 + Math.random() * 0.84, v = 0.24 + Math.random() * 0.16;
      if (isSky(pickId(u, v))) { boltThrough(u, v); setTimeout(() => audio.thunder(), 300 + Math.random() * 500); break; }
    }
    nextBolt = t + 10 + Math.random() * 12;
  }
  const flash = fx.update(t);
  U.uFlash.value = flash;

  const P = post.uniforms;
  P.time.value = t;
  P.boil.value = still ? 0 : Math.floor(t * 8) % 3;
  P.flash.value = flash * 0.6;
  P.sense.value = state.sense;
  P.mastShift.value.set(-view.mx * 0.0035, view.my * 0.0025);
  vpTmp.copy(camera.position).add(new THREE.Vector3(0, 1e4, 0)).project(camera);
  P.vp.value.set(vpTmp.x * 0.5 + 0.5, vpTmp.y * 0.5 + 0.5);
  post.update(t);
  post.render(scene, camera);

  if (state.loaded && hoverUV && !drag && frameNo % 4 === 0) {
    const id = pickId(hoverUV.u, hoverUV.v);
    state.hoverId = id;
    cover.classList.toggle('hot', isHero(id) || isSignal(id) || hotspotAt(id) >= 0 || !!propAt(id));
  } else if (!hoverUV) state.hoverId = -1;
  const showSense = C.sense?.squiggles && (state.senseOn || isHero(state.hoverId));
  senseEl.classList.toggle('on', !!showSense && state.loaded);
  const hp = fx.toCover(hero.head);
  senseEl.style.left = `${hp.x}%`;
  senseEl.style.top = `${hp.y}%`;
  P.headUV.value.set(hp.x / 100, 1 - hp.y / 100);

  if (state.loaded && state.mast && !window.__ready && frameNo > 3) window.__ready = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// hooks for scripted checks (shot.mjs) and console poking
window.cover = {
  clickAt, strike, usePower, setStage, setSense, toggleWalk, pickId, state, view, RIG, camera, scene, hero, THREE,
  get fx() { return fx; },
  project: (p) => fx.toCover(hero.root.localToWorld(v3(p))), // model-space point → % of the cover
};
