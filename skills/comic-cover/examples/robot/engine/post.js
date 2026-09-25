import * as THREE from 'three';

// Comic print composite.
// Reads the MRT scene (colour+light, normal+id, depth) and the masthead canvases, and draws one of three
// production stages — 0 pencils, 1 inks, 2 colours — with a wipe between stages.
export function createPost(renderer) {
  const depthTexture = new THREE.DepthTexture(1, 1);
  depthTexture.type = THREE.UnsignedIntType;
  const rt = new THREE.WebGLRenderTarget(1, 1, {
    count: 2, type: THREE.HalfFloatType, depthTexture,
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
  });
  rt.textures[0].name = 'color';
  rt.textures[1].name = 'normalId';

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  const qScene = new THREE.Scene();
  qScene.add(quad);
  const qCam = new THREE.Camera();

  const mat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: {
      tColor: {value: rt.textures[0]}, tNormal: {value: rt.textures[1]}, tDepth: {value: depthTexture},
      tMast: {value: null}, tMastInk: {value: null},
      res: {value: new THREE.Vector2(1, 1)}, px: {value: new THREE.Vector2(1, 1)}, dpr: {value: 1},
      near: {value: 0.05}, far: {value: 900},
      time: {value: 0}, boil: {value: 0},
      stageA: {value: 2}, stageB: {value: 2}, wipe: {value: 1},
      sense: {value: 0}, duoA: {value: new THREE.Color(0.05, 0.0, 0.03)}, duoB: {value: new THREE.Color(0.95, 0.08, 0.18)},
      flash: {value: 0}, mastShift: {value: new THREE.Vector2()},
      vp: {value: new THREE.Vector2(0.5, 2.0)},
      radar: {value: 0}, headUV: {value: new THREE.Vector2(0.5, 0.8)},
      spat: {value: [0, 1, 2, 3].map(() => new THREE.Vector4())}, nSpat: {value: 0},
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */`
#include <packing>
uniform sampler2D tColor, tNormal, tDepth, tMast, tMastInk;
uniform vec2 res, px, mastShift, vp, headUV;
uniform vec3 duoA, duoB;
uniform float dpr, near, far, time, boil, stageA, stageB, wipe, sense, flash, radar;
uniform vec4 spat[4]; uniform int nSpat;
varying vec2 vUv;

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }

float ld(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(tDepth, uv).r, near, far); }

// Ink: depth Laplacian (occlusion contours without grazing-angle false positives),
// normal creases, and id changes (clean silhouettes between objects).
float ink(vec2 uv, float r, out float idC){
  vec2 o = px * r;
  vec4 nC = texture2D(tNormal, uv); idC = nC.a;
  float d = ld(uv);
  vec2 offs[4]; offs[0] = vec2(o.x, 0.); offs[1] = vec2(0., o.y); offs[2] = vec2(o.x, o.y) * 0.7071; offs[3] = vec2(o.x, -o.y) * 0.7071;
  float de = 0., ne = 0., ie = 0.;
  for (int i = 0; i < 4; i++){
    vec2 a = uv + offs[i], b = uv - offs[i];
    float da = ld(a), db = ld(b);
    float lap = abs(da + db - 2.0 * d) / d;
    de = max(de, lap);
    vec4 na = texture2D(tNormal, a), nb = texture2D(tNormal, b);
    float dId = max(abs(na.a - idC), abs(nb.a - idC));
    ie = max(ie, step(0.05, dId));
    if (idC > 0.05 && dId < 0.05) {
      vec3 n0 = nC.rgb * 2. - 1., n1 = na.rgb * 2. - 1., n2 = nb.rgb * 2. - 1.;
      ne = max(ne, 1.0 - min(dot(n0, n1), dot(n0, n2)));
    }
  }
  float thr = idC > 0.55 ? 0.018 : 0.03;
  float e = smoothstep(thr, thr * 2.2, de);
  e = max(e, smoothstep(0.28, 0.5, ne));
  e = max(e, ie);
  if (idC < 0.05) e = ie; // sky: only silhouettes against it
  return e;
}

// Ink spatter: flicked droplets clustered round a few points (u, v from the top left, radius, density).
// At most one droplet per cell (1/185 of the cover height); droplets can outgrow their cell, so each pixel checks its neighbours.
// Fixed to the page (it doesn't boil).
float spatter(vec2 uv, vec2 fc){
  if (nSpat == 0) return 0.0;
  float m = 0.0;
  float cs = max(res.y / 185.0, 3.0 * dpr);   // droplet grid follows the cover's size, not the screen's density
  vec2 c0 = floor(fc / cs);
  for (int i = 0; i < 4; i++) {
    if (i >= nSpat) break;
    vec4 S = spat[i];
    vec2 d = (vec2(uv.x, 1.0 - uv.y) - S.xy) * vec2(res.x / res.y, 1.0);
    if (length(d) > S.z * 2.2) continue;
    for (int k = 0; k < 9; k++) {
      vec2 cell = c0 + vec2(float(k % 3) - 1.0, float(k / 3) - 1.0);
      vec2 cc = (cell + 0.5) * cs;
      vec2 dc = (vec2(cc.x / res.x, cc.y / res.y) - vec2(S.x, 1.0 - S.y)) * vec2(res.x / res.y, 1.0);
      float r = length(dc) / S.z;
      if (hash12(cell + float(i) * 17.0) >= S.w * exp(-r * r * 2.4)) continue;
      vec2 o = vec2(hash12(cell + 3.1), hash12(cell + 7.7)) - 0.5;
      float big = pow(hash12(cell + 11.3), 5.0) * (1.0 - smoothstep(0.2, 0.9, r));
      float rad = cs * mix(0.12, 0.5 + big * 1.3, pow(hash12(cell + 5.9), 2.2));
      float dd = length(fc - cc - o * cs * 0.4);
      m = max(m, 1.0 - smoothstep(rad - 0.7, rad + 0.7, dd));
    }
  }
  return m;
}

// Sky contour lines (stored by the sky shader in normal.r)
float skyLine(vec2 uv){ vec4 n = texture2D(tNormal, uv); return n.a < 0.05 ? n.r : 0.0; }

float halftone(vec2 fc, float cell, float amount, float ang){
  mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 p = R * fc / cell;
  vec2 f = fract(p) - 0.5;
  float r = sqrt(clamp(amount, 0., 1.)) * 0.62;
  float d = length(f);
  float aa = 0.7 / cell;
  return 1.0 - smoothstep(r - aa, r + aa, d);
}
float hatch(vec2 fc, float spacing, float width, float ang){
  vec2 dir = vec2(cos(ang), sin(ang));
  float t = dot(fc, dir) / spacing;
  float f = abs(fract(t) - 0.5) * spacing;
  return 1.0 - smoothstep(width * 0.5 - 0.6, width * 0.5 + 0.6, f);
}

vec3 render(float stage, vec2 uv, vec2 fc){
  float bt = boil;
  vec2 jit = (vec2(vnoise(uv * 38.0 + bt * 7.1), vnoise(uv * 38.0 + 13.0 + bt * 5.3)) - 0.5) * px * 1.6 * dpr;
  float idC;
  float d = ld(uv);
  float near01 = 1.0 - smoothstep(3.0, 40.0, d);
  float r = mix(0.7, 1.45, near01) * dpr;
  float e = ink(uv + jit, r, idC);
  vec4 col = texture2D(tColor, uv);
  // slight plate misregistration on the colour layer
  col.r = texture2D(tColor, uv + px * vec2(0.8, 0.4) * dpr).r;
  float light = col.a;
  bool hero = idC > 0.55; // hero, its hotspots/decals, webs
  bool sky = idC < 0.05;
  vec4 mast = texture2D(tMast, uv + mastShift);
  vec4 mastInk = texture2D(tMastInk, uv + mastShift);
  float mastA = hero ? 0.0 : mast.a;
  float sl = skyLine(uv + jit);
  vec3 paper = vec3(0.965, 0.945, 0.9);
  float grain = hash12(fc * 0.73 + floor(time * 12.0)) - 0.5;

  if (stage > 1.5) {
    // ---------------- COLOURS
    vec3 c = col.rgb;
    // halftone the shade side (Ben-Day dots), coarser on the backdrop
    if (!sky) {
      float cell = (hero ? 4.2 : 5.0) * dpr;
      float amt = (1.0 - light) * 0.85;
      float dots = halftone(fc, cell, amt, 0.785);
      vec3 shadeInk = hero ? vec3(0.28, 0.1, 0.32) : vec3(0.22, 0.16, 0.34);
      c = mix(c, c * shadeInk * 1.6, dots * 0.55);
    } else {
      float dots = halftone(fc, 5.5 * dpr, 0.25 + col.g * 0.2, 0.26);
      c = mix(c, c * vec3(0.8, 0.78, 0.95), dots * 0.35);
    }
    // radar sense: the world goes black, drawn only in glowing outlines and dots, with sonar rings
    // spreading from the hero's head; each ring lights up what it passes. The hero keeps full colour.
    if (sense > 0.0 && !hero && radar > 0.5) {
      vec2 dv = (uv - headUV) * vec2(res.x / res.y, 1.0);
      float rr = length(dv);
      float ph = rr * 6.5 - time * 1.15;
      float fr = fract(ph);
      float fw = fwidth(ph) * 1.2;
      float ring = 1.0 - smoothstep(fw * 0.5, fw * 1.5, min(fr, 1.0 - fr));
      float front = pow(fr, 5.0);
      float l = dot(col.rgb, vec3(0.3, 0.55, 0.15));
      vec3 rc = duoA;
      float dots = halftone(fc, 4.5 * dpr, clamp(l * 0.55 + front * 0.6, 0., 1.), 0.785);
      rc = mix(rc, duoB * 0.6, dots * (sky ? 0.3 : 0.85));
      rc = mix(rc, duoB * 1.1, clamp(max(e, sl * 0.35) * (0.5 + 0.7 * front), 0., 1.));
      rc = mix(rc, duoB, ring * 0.5 * (1.0 - smoothstep(0.15, 1.3, rr)));
      c = mix(c, rc, sense);
      e *= 1.0 - sense; sl *= 1.0 - sense;
    }
    // spider-sense: the world goes to a red/black duotone, hero stays in full colour
    if (sense > 0.0 && !hero && radar < 0.5) {
      float l = dot(c, vec3(0.3, 0.55, 0.15));
      vec3 duo = mix(duoA, duoB, smoothstep(0.08, 0.5, l));
      float dotsS = halftone(fc, 6.0 * dpr, 1.0 - smoothstep(0.05, 0.6, l), 0.785);
      duo = mix(duo, duoA * 1.5, dotsS * 0.8);
      c = mix(c, duo, sense);
    }
    // masthead sits between the backdrop and the hero
    c = mix(c, mast.rgb, mastA);
    vec3 inkC = vec3(0.07, 0.04, 0.09);
    float sp = hero ? 0.0 : spatter(uv, fc) * (1.0 - sense);
    c = mix(c, inkC, max(max(e, sl * 0.55), sp * 0.92) * (1.0 - mastA));
    c *= vec3(1.0, 0.985, 0.95);
    c += grain * 0.035;
    return c;
  }
  // luminance used for spotted blacks
  float lum = dot(col.rgb, vec3(0.3, 0.55, 0.15));
  if (stage > 0.5) {
    // ---------------- INKS
    float blk = 0.0;
    if (!sky) {
      // spot blacks: deep shadow on dark materials, window glass
      blk = max(blk, step(lum, 0.075));
      blk = max(blk, (1.0 - step(0.05, light)) * step(lum, 0.2));
      // hatching in the half tones, cross-hatching in the core shadow
      float s = (hero ? 4.5 : 5.5) * dpr;
      float h1 = hatch(fc, s, 1.1 * dpr, 0.785) * step(light, 0.5);
      float h2 = hatch(fc, s, 1.0 * dpr, -0.785) * step(light, 0.05);
      blk = max(blk, max(h1, h2) * 0.9);
    } else {
      // storm: contour lines only, plus a few dark cloud bellies
      blk = sl;
      float s = 6.0 * dpr;
      blk = max(blk, hatch(fc, s, 1.0 * dpr, 0.2) * step(texture2D(tNormal, uv).g, 0.24) * 0.8);
    }
    float line = max(max(e, blk), hero ? 0.0 : spatter(uv, fc));
    vec3 c = mix(paper, vec3(0.06, 0.05, 0.07), line);
    c = mix(c, mastInk.rgb, hero ? 0.0 : mastInk.a);
    c += grain * 0.03;
    return c;
  }
  // ---------------- PENCILS
  // sketchy double pass: two jittered ink samples, lighter graphite
  vec2 jit2 = (vec2(vnoise(uv * 21.0 + 51.0), vnoise(uv * 21.0 + 77.0)) - 0.5) * px * 3.2 * dpr;
  float idTmp;
  float e2 = ink(uv + jit2, r * 0.8, idTmp);
  float g = max(e * 0.92, e2 * 0.62);
  if (sky) g = max(g, sl * 0.45);
  // soft graphite tone in the shadows
  float tone = sky ? 0.0 : (1.0 - light) * 0.16 + step(lum, 0.075) * 0.1;
  float s = 7.0 * dpr;
  tone += sky ? 0.0 : hatch(fc + vnoise(uv * 9.0) * 6.0, s, 0.9 * dpr, 0.9) * step(light, 0.5) * 0.25;
  vec3 c = paper * vec3(0.99, 0.995, 1.0);
  c = mix(c, vec3(0.2, 0.21, 0.26), clamp(g + tone, 0., 1.));
  // non-photo-blue construction lines: vertical vanishing lines + a border box
  vec2 p = uv * res;
  vec2 v = vp * res;
  float ang = atan(p.x - v.x, v.y - p.y);
  float k = 34.0;
  float fl = abs(fract(ang * k / 3.14159) - 0.5) / (k / 3.14159);
  float distToVp = length(p - v);
  float blue = (1.0 - smoothstep(0.0, 1.2 * dpr / max(distToVp, 1.0), fl)) * 0.35 * step(mod(floor(ang * k / 3.14159), 3.0), 0.5);
  vec2 bb = abs(uv - 0.5);
  blue = max(blue, (1.0 - smoothstep(0.0, 1.0 * dpr, abs(max(bb.x * res.x - (0.5 * res.x - 22.0 * dpr), bb.y * res.y - (0.5 * res.y - 22.0 * dpr))))) * 0.5);
  c = mix(c, vec3(0.45, 0.72, 0.95), blue * (1.0 - g));
  c = mix(c, mix(paper, vec3(0.32, 0.33, 0.38), 0.85), hero ? 0.0 : mastInk.a * (1.0 - step(0.5, mastInk.r)) * 0.8);
  c += grain * 0.05;
  return c;
}

void main(){
  vec2 fc = gl_FragCoord.xy;
  // wipe: stage A on the right of the brush edge, stage B behind it
  float edgePos = vUv.x * 0.8 + (1.0 - vUv.y) * 0.2 + (vnoise(vUv * vec2(3.0, 40.0)) - 0.5) * 0.04;
  float w = wipe * 1.12 - 0.06;
  float useB = step(edgePos, w);
  vec3 c = render(useB > 0.5 ? stageB : stageA, vUv, fc);
  // brush edge while wiping
  if (wipe > 0.0 && wipe < 1.0) {
    float edge = 1.0 - smoothstep(0.0, 0.012, abs(edgePos - w));
    c = mix(c, vec3(0.06, 0.05, 0.07), edge * 0.85);
  }
  // vignette & flash
  vec2 q = vUv - 0.5;
  c *= 1.0 - dot(q, q) * 0.35;
  c += flash * 0.08;
  gl_FragColor = vec4(c, 1.0);
}`,
  });
  quad.material = mat;

  const U = mat.uniforms;
  let stage = 2, wipeStart = -1;

  function setSize(w, h, dpr) {
    rt.setSize(Math.round(w * dpr), Math.round(h * dpr));
    U.res.value.set(Math.round(w * dpr), Math.round(h * dpr));
    U.px.value.set(1 / (w * dpr), 1 / (h * dpr));
    U.dpr.value = dpr;
  }
  function setStage(n, now) {
    if (n === stage && U.wipe.value >= 1) return;
    U.stageA.value = U.wipe.value >= 0.5 ? U.stageB.value : U.stageA.value;
    U.stageB.value = n;
    U.wipe.value = 0;
    wipeStart = now;
    stage = n;
  }
  function update(now) {
    if (wipeStart >= 0) {
      const t = Math.min((now - wipeStart) / 0.85, 1);
      U.wipe.value = t < 1 ? t * t * (3 - 2 * t) : 1;
      if (t >= 1) { wipeStart = -1; U.stageA.value = U.stageB.value; }
    }
  }
  function render(scene, camera) {
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(qScene, qCam);
  }
  return {rt, uniforms: U, setSize, setStage, update, render, get stage() { return stage; }};
}
