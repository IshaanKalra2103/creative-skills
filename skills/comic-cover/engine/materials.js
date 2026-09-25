import * as THREE from 'three';

// Every scene material writes two targets in one pass (MRT):
//   gColor  = rgb: flat-painted colour (display space), a: light level 0..1 (drives hatching/halftone)
//   gNormal = rgb: view-space normal * .5 + .5,           a: object id (drives ink lines, masthead, picking)
// Ids above 0.55 count as "hero" (drawn over the masthead, never duotoned).
export const ID = {sky: 0.0, bolt: 0.1, building: 0.3, prop: 0.5, hotspot: 0.6, signal: 0.7, web: 0.9, hero: 1.0};
export const hotspotId = (i) => ID.hotspot + i * 0.02; // up to 4 hotspots: .60 .62 .64 .66

export const U = {
  uKey: {value: new THREE.Vector3(0.55, 0.62, 0.56).normalize()},
  uRim: {value: new THREE.Vector3(-0.75, 0.25, -0.6).normalize()},
  uCamPos: {value: new THREE.Vector3()},
  uTime: {value: 0},
  uFlash: {value: 0},
  uFlashDir: {value: new THREE.Vector3(0, 1, 0)},
  uWalk: {value: 0},
  uCount: {value: -1},
  uHandOn: {value: 1},
};

const OUT = /* glsl */`
layout(location = 0) out highp vec4 gColor;
layout(location = 1) out highp vec4 gNormal;
`;

const VS = /* glsl */`
varying vec3 vWN; varying vec3 vVN; varying vec3 vWP; varying vec2 vUv;
void main(){
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz;
  vWN = normalize(mat3(modelMatrix) * normal);
  vVN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

// Hero vertex shader: same outputs, plus GPU skinning so rigged models can hold an animation pose.
const HERO_VS = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
varying vec3 vWN; varying vec3 vVN; varying vec3 vWP; varying vec2 vUv;
void main(){
  vUv = uv;
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vec4 wp = modelMatrix * vec4(transformed, 1.0);
  vWP = wp.xyz;
  vWN = normalize(mat3(modelMatrix) * objectNormal);
  vVN = normalize(normalMatrix * objectNormal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const HEAD = /* glsl */`
uniform vec3 uKey, uRim, uCamPos, uFlashDir; uniform float uTime, uFlash, uWalk, uCount, uHandOn;
varying vec3 vWN; varying vec3 vVN; varying vec3 vWP; varying vec2 vUv;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float sdCapsule(vec2 p, vec2 a, vec2 b, float r){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - r; }
float sdBox(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
float sat(vec3 c){ float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)); return mx > 0. ? (mx - mn) / mx : 0.; }
// Cel bands: 0 = core shadow, .45 = half tone, 1 = lit
float bands(float ndl, out float lit, out float mid){
  float w = fwidth(ndl) + 0.015;
  lit = smoothstep(0.1 - w, 0.1 + w, ndl);
  mid = smoothstep(-0.28 - w, -0.28 + w, ndl);
  return mid * 0.45 + lit * 0.55;
}
`;

function mat(fragmentBody, uniforms = {}, opts = {}) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {...U, ...uniforms},
    vertexShader: opts.vertexShader || VS,
    fragmentShader: OUT + HEAD + fragmentBody,
    side: opts.side ?? THREE.FrontSide,
    defines: opts.defines || {},
    ...(opts.extra || {}),
  });
}

const v3 = (a) => new THREE.Vector3().fromArray(a);
// Config colours are display-space values; bypass three's sRGB→linear conversion so shaders get them as written.
export const raw = (c) => (Array.isArray(c) ? new THREE.Color().fromArray(c) : new THREE.Color().setStyle(c, THREE.LinearSRGBColorSpace));
const col = raw;

// ---------------------------------------------------------------- hero
// src: the model's own material (map or base colour is kept as the albedo)
// shared: {uHeroInv, decals, hotspots, shade} built once in main.js and shared by every hero mesh
export function heroMaterial(src, shared) {
  const map = src.map || null;
  if (map) { map.colorSpace = THREE.NoColorSpace; map.anisotropy = 8; } // shade in display space, like a colourist
  const base = src.color ? src.color.clone().convertLinearToSRGB() : new THREE.Color(1, 1, 1);
  const nD = shared.decals.length, nH = shared.hotspots.length, nX = shared.hide.length;
  const pad = (arr, n, fill) => (arr.length ? arr : Array.from({length: n}, fill));
  const sh = shared.shade;
  const uniforms = {
    map: {value: map}, uHasMap: {value: map ? 1 : 0}, uBase: {value: base},
    uHeroInv: shared.uHeroInv,
    uShadowWarm: {value: col(sh.warmShadow)}, uShadowCool: {value: col(sh.coolShadow)},
    uSpecCool: {value: col(sh.coolSpec)}, uRimCool: {value: col(sh.coolRim)}, uRimWarm: {value: col(sh.warmRim)},
    uDecalC: {value: pad(shared.decals.map((d) => d.c), 1, () => new THREE.Vector3())},
    uDecalN: {value: pad(shared.decals.map((d) => d.n), 1, () => new THREE.Vector3())},
    uDecalU: {value: pad(shared.decals.map((d) => d.u), 1, () => new THREE.Vector3())},
    uDecalS: {value: pad(shared.decals.map((d) => d.s), 1, () => new THREE.Vector3())},
    uDecalK: {value: pad(shared.decals.map((d) => d.kind), 1, () => 0)},
    uDecalCol: {value: pad(shared.decals.map((d) => d.color), 1, () => new THREE.Color())},
    uDecalKeep: {value: pad(shared.decals.map((d) => d.keepSat), 1, () => 0.55)},
    uHotMin: {value: pad(shared.hotspots.map((h) => h.min), 1, () => new THREE.Vector3())},
    uHotMax: {value: pad(shared.hotspots.map((h) => h.max), 1, () => new THREE.Vector3())},
    uHotMatch: {value: pad(shared.hotspots.map((h) => h.match), 1, () => 0)},
    uHideMin: {value: pad(shared.hide.map((h) => h.min), 1, () => new THREE.Vector3())},
    uHideMax: {value: pad(shared.hide.map((h) => h.max), 1, () => new THREE.Vector3())},
    uHideMatch: {value: pad(shared.hide.map((h) => h.match), 1, () => 0)},
    uHideCol: {value: pad(shared.hide.map((h) => h.color), 1, () => new THREE.Vector4())},
  };
  const m = mat(/* glsl */`
uniform sampler2D map; uniform float uHasMap; uniform vec3 uBase;
uniform mat4 uHeroInv;
uniform vec3 uShadowWarm, uShadowCool, uSpecCool, uRimCool, uRimWarm;
uniform vec3 uDecalC[MAXD], uDecalN[MAXD], uDecalU[MAXD], uDecalS[MAXD], uDecalCol[MAXD];
uniform float uDecalK[MAXD], uDecalKeep[MAXD];
uniform vec3 uHotMin[MAXH], uHotMax[MAXH]; uniform float uHotMatch[MAXH];
uniform vec3 uHideMin[MAXX], uHideMax[MAXX]; uniform float uHideMatch[MAXX]; uniform vec4 uHideCol[MAXX];

float seg7(vec2 p, int d){
  int bits = d == 0 ? 0x3F : d == 1 ? 0x06 : d == 2 ? 0x5B : d == 3 ? 0x4F : d == 4 ? 0x66 : d == 5 ? 0x6D : d == 6 ? 0x7D : d == 7 ? 0x07 : d == 8 ? 0x7F : 0x6F;
  float r = 1e3, w = 0.07;
  if ((bits & 1) != 0)  r = min(r, sdCapsule(p, vec2(-.28, .8), vec2(.28, .8), w));
  if ((bits & 2) != 0)  r = min(r, sdCapsule(p, vec2(.36, .72), vec2(.36, .08), w));
  if ((bits & 4) != 0)  r = min(r, sdCapsule(p, vec2(.36, -.08), vec2(.36, -.72), w));
  if ((bits & 8) != 0)  r = min(r, sdCapsule(p, vec2(-.28, -.8), vec2(.28, -.8), w));
  if ((bits & 16) != 0) r = min(r, sdCapsule(p, vec2(-.36, -.08), vec2(-.36, -.72), w));
  if ((bits & 32) != 0) r = min(r, sdCapsule(p, vec2(-.36, .72), vec2(-.36, .08), w));
  if ((bits & 64) != 0) r = min(r, sdCapsule(p, vec2(-.28, 0.), vec2(.28, 0.), w));
  return r;
}
// Pedestrian signal lens: hand (DON'T WALK) / walker (WALK) on the right half, countdown on the left.
vec3 walkSignal(vec2 p){
  vec2 q = (p - vec2(0.5, 0.02)) * vec2(2.0, 1.12);
  float hand = sdBox(q - vec2(0.0, -0.25), vec2(0.30, 0.30)) - 0.08;
  hand = min(hand, sdCapsule(q, vec2(-0.26, 0.0), vec2(-0.30, 0.52), 0.075));
  hand = min(hand, sdCapsule(q, vec2(-0.09, 0.05), vec2(-0.10, 0.70), 0.075));
  hand = min(hand, sdCapsule(q, vec2( 0.08, 0.05), vec2( 0.09, 0.66), 0.075));
  hand = min(hand, sdCapsule(q, vec2( 0.24, 0.0), vec2( 0.28, 0.46), 0.07));
  hand = min(hand, sdCapsule(q, vec2( 0.30, -0.35), vec2( 0.56, -0.02), 0.08));
  float walk = length(q - vec2(0.02, 0.62)) - 0.13;
  walk = min(walk, sdCapsule(q, vec2(0.0, 0.42), vec2(-0.04, -0.05), 0.1));
  walk = min(walk, sdCapsule(q, vec2(-0.04, -0.05), vec2(-0.26, -0.7), 0.08));
  walk = min(walk, sdCapsule(q, vec2(-0.04, -0.05), vec2(0.22, -0.66), 0.08));
  walk = min(walk, sdCapsule(q, vec2(0.0, 0.34), vec2(-0.3, 0.02), 0.07));
  walk = min(walk, sdCapsule(q, vec2(0.0, 0.34), vec2(0.28, 0.08), 0.07));
  vec2 g = fract(p * vec2(16.0, 9.0)) - 0.5;
  float led = smoothstep(0.45, 0.2, length(g));
  vec3 orange = vec3(1.0, 0.42, 0.08), white = vec3(0.92, 0.97, 1.0);
  float onHand = smoothstep(0.03, -0.03, hand) * uHandOn * (1.0 - uWalk);
  float onWalk = smoothstep(0.03, -0.03, walk) * uWalk;
  vec3 c = vec3(0.05, 0.035, 0.04);
  c += orange * onHand * (0.6 + 0.7 * led) + white * onWalk * (0.6 + 0.6 * led);
  c += (orange * (1.0 - uWalk) * uHandOn + white * uWalk) * exp(-max(min(hand, walk), 0.) * 6.0) * 0.18 * led;
  if (uCount >= 0.0) {
    int n = int(uCount);
    vec2 r = (p - vec2(-0.45, 0.0)) * vec2(3.2, 1.25);
    float dd = seg7(r - vec2(0.55, 0.0), n % 10);
    if (n >= 10) dd = min(dd, seg7(r + vec2(0.55, 0.0), n / 10));
    c += orange * smoothstep(0.03, -0.03, dd) * (0.6 + 0.7 * led);
  }
  c += vec3(0.1, 0.06, 0.05) * led;
  return c;
}
// Glow decal: a lit lens / reactor / emblem that pulses gently.
vec3 glowDecal(vec2 p, vec3 color){
  float r = length(p);
  float core = smoothstep(1.0, 0.55, r);
  float pulse = 0.85 + 0.15 * sin(uTime * 3.0);
  return mix(color * 0.35, mix(color, vec3(1.0), 0.45) * pulse, core);
}

void main(){
  vec3 N = normalize(vWN);
  vec3 V = normalize(uCamPos - vWP);
  vec3 alb = uHasMap > 0.5 ? texture(map, vUv).rgb * uBase : uBase;
  vec3 mp = (uHeroInv * vec4(vWP, 1.0)).xyz;            // model space (what the probe reports)
  // hide / recolor: cut a stray lump out of a sculpt, or repaint it (match 1 spares saturated texels,
  // e.g. the red club a khaki lump is draped over)
  for (int i = 0; i < NUM_X; i++) {
    if (all(greaterThan(mp, uHideMin[i])) && all(lessThan(mp, uHideMax[i])) && (uHideMatch[i] < 0.5 || sat(alb) < 0.45)) {
      if (uHideCol[i].a < 0.5) discard;
      alb = uHideCol[i].rgb * (0.45 + 1.1 * dot(alb, vec3(0.3, 0.55, 0.15)));
    }
  }
  float lit, mid;
  float light = bands(dot(N, uKey), lit, mid);
  bool cool = alb.b > alb.r * 1.02;
  vec3 shadowT = cool ? uShadowCool : uShadowWarm;
  vec3 midT = mix(shadowT, vec3(1.0), 0.55);
  vec3 c = alb * mix(mix(shadowT, midT, mid), vec3(1.08, 1.03, 0.99), lit);
  bool white = min(alb.r, min(alb.g, alb.b)) > 0.72;
  if (white) { c = alb * mix(vec3(0.82, 0.84, 0.95), vec3(1.0), lit); light = 1.0; }

  // hard specular: blue "shine" on dark cool materials, a warm glint on the rest
  vec3 H = normalize(uKey + V);
  float sp = smoothstep(0.42, 0.5, pow(max(dot(N, H), 0.), cool ? 22.0 : 48.0));
  c += sp * (cool ? uSpecCool : vec3(0.32, 0.16, 0.14));
  // cool back rim
  float rim = pow(1.0 - max(dot(N, V), 0.), 2.2) * smoothstep(-0.1, 0.35, dot(N, uRim));
  c += smoothstep(0.32, 0.4, rim) * (cool ? uRimCool : uRimWarm);
  // lightning bounce
  c += uFlash * max(dot(N, uFlashDir), 0.) * vec3(0.35, 0.38, 0.55);

  float id = 1.0;
  vec3 mn = normalize(mat3(uHeroInv) * N);
  float s = sat(alb);
  float maxc = max(alb.r, max(alb.g, alb.b));
  bool vivid = s > 0.45 && maxc > 0.45;                 // a glove / costume, not a painted prop
  for (int i = 0; i < NUM_H; i++) {
    bool inBox = all(greaterThan(mp, uHotMin[i])) && all(lessThan(mp, uHotMax[i]));
    // match 0: everything in the box; 1: only the prop (skip vivid costume colours, cool darks and whites)
    bool ok = uHotMatch[i] < 0.5 || (!vivid && !white && !cool);
    if (inBox && ok) id = 0.6 + float(i) * 0.02;
  }
  for (int i = 0; i < NUM_D; i++) {
    vec3 d = mp - uDecalC[i];
    vec3 n = uDecalN[i], ua = uDecalU[i], va = cross(n, ua);
    vec2 lp = vec2(dot(d, ua), dot(d, va)) / (uDecalS[i].xy * 0.5);
    if (abs(lp.x) < 1.0 && abs(lp.y) < 1.0 && abs(dot(d, n)) < uDecalS[i].z && dot(mn, n) > 0.5 && !(s > uDecalKeep[i] && maxc > 0.45)) {
      c = uDecalK[i] < 0.5 ? walkSignal(lp) : glowDecal(lp, uDecalCol[i]);
      light = 1.0;
      if (uDecalK[i] < 0.5) id = ${ID.signal.toFixed(2)};
    }
  }
  gColor = vec4(c, light);
  gNormal = vec4(normalize(vVN) * 0.5 + 0.5, id);
}`, uniforms, {
    vertexShader: HERO_VS,
    defines: {NUM_D: nD, NUM_H: nH, NUM_X: nX, MAXD: Math.max(nD, 1), MAXH: Math.max(nH, 1), MAXX: Math.max(nX, 1)},
    side: src.side === THREE.DoubleSide ? THREE.DoubleSide : THREE.FrontSide,
  });
  return m;
}

// ---------------------------------------------------------------- props (poles, signs, towers, anything in a set)
export function propMaterial({color = 0x3a3440, map = null, id = ID.prop, emissive = 0, side, alphaTest = 0} = {}) {
  if (map) map.colorSpace = THREE.NoColorSpace;
  return mat(/* glsl */`
uniform vec3 uColor; uniform sampler2D uMap; uniform float uHasMap, uId, uEmissive, uAlphaTest;
void main(){
  vec3 N = normalize(vWN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCamPos - vWP);
  vec3 alb = uColor;
  if (uHasMap > 0.5) { vec4 t = texture(uMap, vUv); if (t.a < uAlphaTest) discard; alb *= t.rgb; }
  float lit, mid;
  float light = bands(dot(N, uKey), lit, mid);
  vec3 c = alb * mix(mix(vec3(0.42, 0.34, 0.56), vec3(0.74, 0.66, 0.84), mid), vec3(1.06, 1.02, 0.98), lit);
  float rim = pow(1.0 - max(dot(N, V), 0.), 2.5) * smoothstep(-0.1, 0.35, dot(N, uRim));
  c += smoothstep(0.35, 0.45, rim) * vec3(0.2, 0.26, 0.5) * 0.7;
  c += uFlash * max(dot(N, uFlashDir), 0.) * vec3(0.3, 0.32, 0.5);
  if (uEmissive > 0.) { c = alb; light = 1.0; }
  gColor = vec4(c, light);
  vec3 vn = normalize(vVN); if (!gl_FrontFacing) vn = -vn;
  gNormal = vec4(vn * 0.5 + 0.5, uId);
}`, {
    uColor: {value: new THREE.Color(color)},
    uMap: {value: map},
    uHasMap: {value: map ? 1 : 0},
    uId: {value: id},
    uEmissive: {value: emissive},
    uAlphaTest: {value: alphaTest},
  }, {side});
}

// ---------------------------------------------------------------- facades
// Per-vertex: aColor (brick tone), aBox (x0, z0, x1, z1), aInfo (seed, top y, kind: 0 wall / 1 trim)
export function facadeMaterial(ground) {
  const vs = /* glsl */`
attribute vec3 aColor; attribute vec4 aBox; attribute vec3 aInfo;
varying vec3 vWN; varying vec3 vVN; varying vec3 vWP; varying vec2 vUv;
varying vec3 vColor; varying vec4 vBox; varying vec3 vInfo;
void main(){
  vUv = uv; vColor = aColor; vBox = aBox; vInfo = aInfo;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz;
  vWN = normalize(mat3(modelMatrix) * normal);
  vVN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
  return mat(/* glsl */`
varying vec3 vColor; varying vec4 vBox; varying vec3 vInfo;
uniform float uGround; uniform vec3 uHaze;
void main(){
  vec3 N = normalize(vWN);
  float seed = vInfo.x, top = vInfo.y, kind = vInfo.z;
  float lit, mid;
  float light = bands(dot(N, uKey), lit, mid);
  vec3 base = vColor;
  float u = 0.0, len = 1.0;
  if (abs(N.x) > 0.5) { u = (vWP.z - vBox.y); len = vBox.w - vBox.y; if (N.x < 0.) u = len - u; }
  else { u = (vWP.x - vBox.x); len = vBox.z - vBox.x; if (N.z < 0.) u = len - u; }
  float v = vWP.y - uGround;
  vec3 c = base;
  float winMask = 0.0; vec3 winCol = vec3(0.0);
  if (kind < 0.5 && abs(N.y) < 0.5) {
    float colW = 2.5 + fract(seed * 7.13) * 0.6;
    float floorH = 3.2 + fract(seed * 3.7) * 0.35;
    float nCol = max(floor((len - 1.2) / colW), 1.0);
    float margin = (len - nCol * colW) * 0.5;
    float cu = (u - margin) / colW;
    float cv = (v - 4.6) / floorH;
    vec2 cell = floor(vec2(cu, cv));
    vec2 f = fract(vec2(cu, cv));
    bool inGrid = cu > 0.0 && cu < nCol && cv > 0.0 && v < top - uGround - 2.2;
    if (inGrid) {
      float ww = 0.23 + fract(seed * 11.1) * 0.06;
      float win = step(ww, f.x) * step(f.x, 1.0 - ww) * step(0.22, f.y) * step(f.y, 0.8);
      float lintel = step(ww - 0.05, f.x) * step(f.x, 1.05 - ww) * step(0.8, f.y) * step(f.y, 0.88);
      float sill = step(ww - 0.03, f.x) * step(f.x, 1.03 - ww) * step(0.17, f.y) * step(f.y, 0.22);
      c = mix(c, base * 1.32 + 0.04, max(lintel, sill));
      // ink the window opening like a penciller would: a dark rim around the glass
      float fw2 = 0.035;
      float frame = step(ww - fw2, f.x) * step(f.x, 1.0 - ww + fw2) * step(0.22 - fw2 * 1.4, f.y) * step(f.y, 0.8 + fw2 * 1.4);
      c = mix(c, vec3(0.08, 0.06, 0.1), frame);
      float h = hash12(cell + seed * 91.0);
      float lampOn = step(0.9, h);
      float glint = step(0.8, fract((f.x + f.y * 0.8) * 1.6 + h)) * 0.5;
      vec3 glass = mix(vec3(0.09, 0.08, 0.14), vec3(0.2, 0.2, 0.32), glint);
      glass = mix(glass, vec3(1.0, 0.78, 0.38), lampOn);
      float mull = step(abs(f.x - 0.5), 0.02) + step(abs(f.y - 0.52), 0.02);
      glass = mix(glass, base * 0.45, clamp(mull, 0., 1.) * (1.0 - lampOn * 0.6));
      winMask = win; winCol = glass;
    }
    if (v < 4.2) c = mix(base * 0.55, vec3(0.12, 0.1, 0.16), step(0.6, v) * step(v, 3.4) * step(0.12, fract(u / 4.0)));
    c *= 1.0 - 0.18 * step(fract((v - 4.6) / (floorH * 3.0)), 0.03);
  }
  if (kind > 0.5 && kind < 1.5) c = base * 1.18 + 0.03;
  if (abs(N.y) > 0.5) c = base * 0.7;
  c *= mix(mix(vec3(0.42, 0.36, 0.6), vec3(0.72, 0.66, 0.86), mid), vec3(1.04, 1.0, 1.0), lit);
  c = mix(c, winCol * mix(0.75, 1.0, lit), winMask);
  if (winMask > 0.5 && winCol.r > 0.9) light = 1.0;
  float haze = smoothstep(18.0, 140.0, length(vWP - uCamPos));
  c = mix(c, uHaze, haze * 0.75);
  light = mix(light, 1.0, haze);
  c += uFlash * (0.06 + 0.25 * max(dot(N, uFlashDir), 0.)) * vec3(0.32, 0.32, 0.5);
  gColor = vec4(c, light);
  gNormal = vec4(normalize(vVN) * 0.5 + 0.5, ${ID.building.toFixed(2)});
}`, {uGround: {value: ground}, uHaze: {value: new THREE.Color(0.42, 0.38, 0.5)}}, {vertexShader: vs});
}

// ---------------------------------------------------------------- masonry (churches, towers, parapets)
// Per-vertex: aColor (display-space tone), aKind: 0 ashlar, 1 roof tile, 2 slate, 3 plain, 4 gilt, 5 brick.
// Joints are box-projected in the mesh's own space, so a rotated building keeps its coursing.
// A warm point glow (a lit window) washes every face that turns toward it.
export function stoneMaterial({glowPos = [0, 0, 0], glowColor = '#ff9a3c', glowRange = 0, haze = '#6f8f88', hazeNear = 25, hazeFar = 160, id = ID.building} = {}) {
  const vs = /* glsl */`
attribute vec3 aColor; attribute float aKind;
varying vec3 vWN; varying vec3 vVN; varying vec3 vWP; varying vec2 vUv;
varying vec3 vColor; varying float vKind; varying vec3 vLP; varying vec3 vLN;
void main(){
  vUv = uv; vColor = aColor; vKind = aKind; vLP = position; vLN = normal;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz;
  vWN = normalize(mat3(modelMatrix) * normal);
  vVN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
  return mat(/* glsl */`
varying vec3 vColor; varying float vKind; varying vec3 vLP; varying vec3 vLN;
uniform vec3 uGlowPos, uGlowCol, uHaze; uniform float uGlowRange, uId, uHazeNear, uHazeFar;
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
// Mortar joints of a running bond; fades out before the courses get small enough to moiré.
float joints(vec2 p, vec2 size, out vec2 cell){
  vec2 q = p / size;
  q.x += 0.5 * step(0.5, fract(q.y * 0.5));
  cell = floor(q);
  vec2 f = fract(q), w = fwidth(q);
  vec2 e = min(f, 1.0 - f);
  vec2 lw = max(w * 0.9, vec2(0.025, 0.05));
  float l = max(1.0 - smoothstep(lw.y - w.y, lw.y + w.y, e.y), 1.0 - smoothstep(lw.x - w.x, lw.x + w.x, e.x));
  return l * (1.0 - smoothstep(0.12, 0.3, max(w.x, w.y)));
}
void main(){
  vec3 N = normalize(vWN);
  vec3 V = normalize(uCamPos - vWP);
  vec3 A = abs(normalize(vLN));
  vec2 p = A.y > max(A.x, A.z) ? vLP.xz : (A.x > A.z ? vLP.zy : vLP.xy);
  int kind = int(vKind + 0.5);
  vec3 alb = vColor;
  vec2 cell = vec2(0.0);
  float j = 0.0;
  if (kind == 0) j = joints(p, vec2(0.72, 0.36), cell);
  else if (kind == 1) j = joints(p, vec2(0.42, 0.26), cell);
  else if (kind == 2) j = joints(p, vec2(0.6, 0.34), cell);
  else if (kind == 5) j = joints(p, vec2(0.46, 0.16), cell);
  if (kind != 3 && kind != 4) {
    alb *= 0.93 + 0.14 * hash12(cell + 17.0);                 // block-to-block tone
    float grime = smoothstep(0.6, 0.85, vnoise(p * 0.9 + 3.0) * 0.6 + vnoise(p * 4.1) * 0.4);
    alb *= 1.0 - grime * 0.12;
    alb *= 1.0 - j * 0.42;
  }
  float lit, mid;
  float light = bands(dot(N, uKey), lit, mid);
  vec3 c = alb * mix(mix(vec3(0.3, 0.37, 0.48), vec3(0.6, 0.64, 0.72), mid), vec3(1.02, 0.97, 0.9), lit);
  if (kind == 4) {                                           // gilt: hard highlight, warm shade
    c = alb * mix(vec3(0.55, 0.4, 0.3), vec3(1.05), lit);
    vec3 H = normalize(uKey + V);
    c += smoothstep(0.5, 0.56, pow(max(dot(N, H), 0.), 18.0)) * vec3(0.5, 0.42, 0.2);
  }
  // window glow wash
  if (uGlowRange > 0.0) {
    vec3 L = uGlowPos - vWP; float d = length(L);
    float wash = max(dot(N, L / d), 0.) * (1.0 - smoothstep(0.0, uGlowRange, d));
    wash = smoothstep(0.05, 0.35, wash);
    c = mix(c, alb * uGlowCol * 1.35, wash * 0.8);
    light = max(light, wash);
  }
  float rim = pow(1.0 - max(dot(N, V), 0.), 2.5) * smoothstep(-0.1, 0.35, dot(N, uRim));
  c += smoothstep(0.35, 0.45, rim) * vec3(0.16, 0.24, 0.3) * 0.6;
  float haze = smoothstep(uHazeNear, uHazeFar, length(vWP - uCamPos));
  c = mix(c, uHaze, haze * 0.8);
  light = mix(light, 1.0, haze);
  c += uFlash * (0.06 + 0.25 * max(dot(N, uFlashDir), 0.)) * vec3(0.32, 0.32, 0.5);
  gColor = vec4(c, light);
  gNormal = vec4(normalize(vVN) * 0.5 + 0.5, uId);
}`, {
    uGlowPos: {value: v3(glowPos)}, uGlowCol: {value: raw(glowColor)}, uGlowRange: {value: glowRange},
    uHaze: {value: raw(haze)}, uHazeNear: {value: hazeNear}, uHazeFar: {value: hazeFar}, uId: {value: id},
  }, {vertexShader: vs});
}

// ---------------------------------------------------------------- sky dome: posterized clouds, or an action burst
export const SKIES = {
  storm: {c: ['#171320', '#332b3b', '#5c4f61', '#a3919e'], horizon: '#806170', zenith: 0.75, clouds: 1},
  dusk: {c: ['#2a1633', '#6b2c4d', '#c8544f', '#ffb36b'], horizon: '#ff9a5c', zenith: 0.6, clouds: 1},
  night: {c: ['#070a1c', '#111a3a', '#203060', '#3d5390'], horizon: '#4b3f6e', zenith: 0.7, clouds: 0.8},
  day: {c: ['#5b8fd6', '#7fb0ec', '#bfe0ff', '#ffffff'], horizon: '#dff1ff', zenith: 0.95, clouds: 1},
  teal: {c: ['#0c1517', '#16272a', '#28403f', '#4a6862'], horizon: '#7fa597', zenith: 0.6, clouds: 0.55, stars: 1},
};

// kind: a SKIES name, or a palette object {c: [4 colours], horizon, zenith, clouds, stars}
export function skyMaterial(kind = 'storm', burst = null) {
  const pal = typeof kind === 'object' ? {...SKIES.storm, ...kind} : SKIES[kind] || SKIES.storm;
  const toV = raw;
  return mat(/* glsl */`
uniform vec3 uC0, uC1, uC2, uC3, uHorizon, uBurstDir, uB0, uB1;
uniform float uZenith, uBurst, uRays, uClouds, uStars;
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = 0.5; for (int i = 0; i < 5; i++){ s += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
void main(){
  vec3 d = normalize(vWP - uCamPos);
  if (uBurst > 0.5) {
    // action burst: rays radiating from behind the hero, two inks, ruled edges
    vec3 f = normalize(uBurstDir);
    vec3 r = normalize(cross(f, vec3(0, 1, 0)));
    vec3 u = cross(r, f);
    float ang = atan(dot(d, u), dot(d, r));
    vec2 cs = vec2(cos(ang), sin(ang));
    float wob = noise(cs * 2.5 + 7.0) * 0.35;               // continuous across the atan wrap
    float k = ang / 6.28318 * uRays + wob;
    float k2 = atan(-dot(d, u), -dot(d, r)) / 6.28318 * uRays + wob; // same field, seam on the other side
    float band = fract(k);
    float fw = min(fwidth(k), fwidth(k2)) + 1e-4;
    float ray = smoothstep(0.5 - fw, 0.5 + fw, band);
    float centre = acos(clamp(dot(d, f), -1., 1.));
    vec3 c = mix(uB0, uB1, ray);
    c *= mix(1.15, 0.7, smoothstep(0.1, 0.9, centre));
    float line = 1.0 - smoothstep(fw * 0.8, fw * 2.2, min(abs(band - 0.5), min(band, 1.0 - band)));
    c *= 1.0 - line * 0.5;
    gColor = vec4(c, 1.0);
    gNormal = vec4(line, ray * 0.5 + 0.2, 0.0, 0.0); // dark rays (g<.24) get hatched in the Inks stage
    return;
  }
  float el = d.y;
  vec2 p = d.xz / (max(el, 0.0) + 0.18) * 1.1;
  p += vec2(uTime * 0.012, uTime * 0.004);
  vec2 w = vec2(fbm(p * 0.9 + 3.1), fbm(p * 0.9 + 7.7));
  float n = fbm(p * 1.3 + w * 1.6);
  n = clamp((n - 0.22) * 1.75, 0.0, 1.0);
  n = mix(0.35 + n * 0.3, n, uClouds);                          // clouds < 1: a calmer, flatter sky
  float bands = n * 4.0;
  float fb = fract(bands);
  float fw = fwidth(bands) + 1e-4;
  float L = clamp((floor(bands) + smoothstep(0.5 - fw, 0.5 + fw, fb)) / 4.0, 0., 1.);
  float t3 = L * 3.0;
  vec3 c = t3 < 1.0 ? mix(uC0, uC1, t3) : t3 < 2.0 ? mix(uC1, uC2, t3 - 1.0) : mix(uC2, uC3, min(t3 - 2.0, 1.0));
  float hz = 1.0 - smoothstep(0.0, 0.4, el);
  c = mix(c, uHorizon, hz * 0.6);
  c *= mix(1.0, uZenith, smoothstep(0.5, 1.0, el));
  float line = 1.0 - smoothstep(fw * 0.8, fw * 2.2, abs(fb - 0.5));
  line *= 1.0 - hz;
  c *= 1.0 - line * 0.35;
  if (uStars > 0.0) {
    // stars: one candidate per cell of a lat/long grid, dimmed toward the horizon haze
    vec2 sp = vec2(atan(d.z, d.x) * 70.0, asin(clamp(d.y, -1., 1.)) * 70.0);
    vec2 cell = floor(sp), f = fract(sp) - 0.5;
    float h = hash12(cell + 3.7);
    vec2 o = (vec2(hash12(cell + 9.1), hash12(cell + 5.3)) - 0.5) * 0.6;
    float r = mix(0.05, 0.16, pow(hash12(cell + 1.3), 3.0));
    float tw = 0.75 + 0.25 * sin(uTime * (1.5 + h * 3.0) + h * 40.0);
    float star = step(1.0 - 0.07 * uStars, h) * (1.0 - smoothstep(r * 0.6, r, length(f - o))) * smoothstep(0.08, 0.3, el);
    c = mix(c, vec3(0.95, 0.97, 0.9), star * tw);
  }
  float fl = max(dot(d, uFlashDir), 0.);
  c += uFlash * (0.08 + 0.9 * pow(fl, 10.0)) * vec3(0.7, 0.72, 0.95) * (0.3 + L);
  gColor = vec4(c, 1.0);
  gNormal = vec4(line, L, 0.0, ${ID.sky.toFixed(2)});
}`, {
    uC0: {value: toV(pal.c[0])},
    uC1: {value: toV(pal.c[1])}, uC2: {value: toV(pal.c[2])}, uC3: {value: toV(pal.c[3])},
    uHorizon: {value: toV(pal.horizon)}, uZenith: {value: pal.zenith}, uClouds: {value: pal.clouds ?? 1}, uStars: {value: pal.stars ?? 0},
    uBurst: {value: burst ? 1 : 0}, uBurstDir: {value: new THREE.Vector3(0, 0, -1)},
    uB0: {value: toV(burst?.colors?.[0] || '#ffd23f')}, uB1: {value: toV(burst?.colors?.[1] || '#ff7a1a')},
    uRays: {value: burst?.rays || 28},
  }, {side: THREE.BackSide, extra: {depthWrite: true}});
}

// ---------------------------------------------------------------- flat unlit (bolt, web, beam, splats)
export function flatMaterial({color = 0xffffff, id = ID.web, map = null, alphaTest = 0} = {}) {
  if (map) map.colorSpace = THREE.NoColorSpace;
  return mat(/* glsl */`
uniform vec3 uColor; uniform float uId, uHasMap, uAlphaTest, uOpacity; uniform sampler2D uMap;
void main(){
  vec4 t = uHasMap > 0.5 ? texture(uMap, vUv) : vec4(1.0);
  if (t.a < uAlphaTest || uOpacity < 0.01) discard;
  vec3 c = uColor * t.rgb;
  vec3 N = normalize(vWN); if (!gl_FrontFacing) N = -N;
  float l = 0.8 + 0.2 * max(dot(N, uKey), 0.);
  gColor = vec4(c * l, 1.0);
  vec3 vn = normalize(vVN); if (!gl_FrontFacing) vn = -vn;
  gNormal = vec4(vn * 0.5 + 0.5, uId);
}`, {
    uColor: {value: new THREE.Color(color)},
    uId: {value: id},
    uMap: {value: map},
    uHasMap: {value: map ? 1 : 0},
    uAlphaTest: {value: alphaTest},
    uOpacity: {value: 1},
  }, {side: THREE.DoubleSide});
}

export {v3};
