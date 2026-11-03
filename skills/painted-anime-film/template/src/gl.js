// ---------- WebGL2 cel + ink renderer for 3D-assisted drawings ----------
const SS = 2; // supersample
let GL = null;

const GLSL_NOISE = `
float h3(vec3 p){ p = fract(p*0.3183099 + vec3(0.71,0.113,0.419)); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vn3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h3(i+vec3(0,0,0)),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm3(vec3 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*vn3(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5;} return s/0.9375; }
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float vn2(vec2 x){ vec2 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y); }
`;

const VS_GBUF = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aN;
uniform mat4 uModel, uVP, uView, uSunVP;
uniform float uJit; uniform float uSeed;
out vec3 vObj; out vec3 vW; out vec3 vN; out vec3 vNo; out vec4 vSh; out float vZ;
${GLSL_NOISE}
void main(){
  vObj = aPos; vNo = aN;
  vec4 w = uModel * vec4(aPos,1.0);
  // tiny per-drawing hand wobble so held drawings stay still but redrawn ones differ
  w.xyz += uJit * (vec3(vn3(w.xyz*0.35+uSeed), vn3(w.xyz*0.35+uSeed+11.0), vn3(w.xyz*0.35+uSeed+23.0)) - 0.5);
  vW = w.xyz; vN = mat3(uModel) * aN;
  vSh = uSunVP * w;
  vec4 v = uView * w; vZ = -v.z;
  gl_Position = uVP * w;
}`;

const FS_GBUF = `#version 300 es
precision highp float;
in vec3 vObj; in vec3 vW; in vec3 vN; in vec3 vNo; in vec4 vSh; in float vZ;
uniform mat4 uView; uniform vec3 uCamPos;
uniform int uMat; uniform vec3 uCol, uCol2; uniform float uId;
uniform vec3 uRestUp; uniform float uMoss, uRust, uChip, uEmit; uniform vec3 uEmitCol;
uniform vec3 uSun, uSunCol, uAmb, uAmb2; uniform sampler2D uShadow; uniform float uShadowOn;
uniform vec4 uGobo; uniform float uGoboMode; uniform vec3 uFogCol; uniform vec2 uFog;
uniform vec4 uShaft; // x0,y0 of shaft plane intercept (world xz), width, softness
uniform vec3 uShaftDir;
uniform float uStripe; uniform float uDirt; uniform vec3 uCoatCol; uniform vec2 uCoat; uniform float uClipY, uClipN, uCoatEmit, uSat;
layout(location=0) out vec4 oCol; layout(location=1) out vec4 oGeo;
${GLSL_NOISE}
float shadowAt(){
  if (uShadowOn < 0.5) return 1.0;
  vec3 p = vSh.xyz / vSh.w * 0.5 + 0.5;
  if (p.x<0.0||p.x>1.0||p.y<0.0||p.y>1.0) return 1.0;
  float s = 0.0;
  vec2 tx = vec2(1.0/2048.0);
  for (int i=-1;i<=1;i++) for(int j=-1;j<=1;j++){
    float d = texture(uShadow, p.xy + vec2(i,j)*tx*0.8).r;
    s += (p.z - 0.0015 > d) ? 0.0 : 1.0;
  }
  return step(4.5, s); // hard edged
}
// canopy light: dappled holes projected along the sun direction
float gobo(vec3 w){
  if (uGoboMode < 0.5) return 1.0;
  // project to a plane perpendicular-ish to sun
  vec3 s = normalize(uSun);
  vec3 a = normalize(cross(s, vec3(0,1,0))); vec3 b = cross(a, s);
  vec2 q = vec2(dot(w,a), dot(w,b));
  float n = fbm3(vec3(q*uGobo.x, uGobo.w));
  float g = step(uGobo.y, n);
  // explicit shaft (moving ray of first light)
  if (uShaft.z > 0.0) {
    float d = abs(dot(w, uShaftDir) - uShaft.x);
    g = max(g, step(d, uShaft.z) * step(uShaft.y, w.y));
  }
  return mix(1.0, g, uGobo.z);
}
void main(){
  // waterline / ground cut for things rising out of a surface; with uClipN > 0 the cut is ragged (a dissolve)
  if (vW.y + (uClipN > 0.0 ? uClipN * fbm3(vW*0.9) : 0.0) < uClipY) discard;
  vec3 N = normalize(vN);
  vec3 alb = uCol;
  vec3 o = vObj;
  float id = uId;
  // --- weathering (object space so it sticks to the armor) ---
  if (uMat == 0) {
    // painted accent stripe (band in object y), worn
    if (uStripe != 0.0) { float sb = step(abs(o.y - uStripe), 0.2) * step(0.36, fbm3(o*2.0+4.0)); alb = mix(alb, uCol2, sb); }
    // sun-faded paint patches
    alb *= mix(1.0, 0.93, step(0.57, fbm3(o*0.45 + 9.0)));
    float chipv = fbm3(o*1.5 + 3.0) + 0.3*(fbm3(o*9.0) - 0.5);
    float chip = step(0.74 - uChip*0.07, chipv);
    float speck = step(0.9, vn3(o*14.0)) * step(0.5, fbm3(o*1.0+2.0));
    vec3 primer = vec3(0.42,0.38,0.35);
    alb = mix(alb, primer, max(chip, speck));
    alb = mix(alb, vec3(0.47,0.28,0.17), chip * step(0.78, chipv + 0.1*vn3(o*6.0)) * uRust);
    // thin rust tears running down
    float st = fbm3(vec3(o.x*7.0, o.y*0.45, o.z*7.0) + 7.0);
    float streak = step(0.69 - uRust*0.04, st) * step(0.56, fbm3(o*0.7 + 1.0));
    alb = mix(alb, vec3(0.58,0.37,0.24), streak * 0.55);
  }
  if (uMat == 1) { // dark joint metal, a little rust
    float st = fbm3(o*2.5);
    alb = mix(alb, vec3(0.42,0.28,0.2), step(0.68, st)*0.6*uRust);
  }
  // dirt from the ground up (world space for kneeling)
  float coatM = 0.0;
  if (uDirt > -1e3) { coatM = step(vW.y + uCoat.y*fbm3(vW*0.9), uDirt) * uCoat.x; alb = mix(alb, uCoatCol, coatM); }
  if (uMat == 3) { alb = mix(uCol, uCol2, step(0.55, fbm3(o*3.0))); }
  // moss on surfaces that faced the sky while it knelt
  float mossM = 0.0;
  if (uMoss > 0.0 && (uMat == 0 || uMat == 1 || uMat == 3)) {
    float up = dot(normalize(vNo), uRestUp);
    float n = fbm3(o*1.1 + 5.0) + 0.25*(fbm3(o*5.0)-0.5);
    float m = up*0.78 + (n-0.5)*0.9 - (1.0 - uMoss*0.72) + 0.07*(vn3(o*13.0)-0.5);
    mossM = step(0.0, m);
    if (mossM > 0.5) {
      vec3 mc = mix(vec3(0.33,0.42,0.2), vec3(0.45,0.52,0.24), step(0.58, fbm3(o*1.9+2.0)));
      mc = mix(mc, vec3(0.55,0.6,0.3), step(0.84, vn3(o*9.0)) * 0.8);
      mc = mix(mc, vec3(0.24,0.31,0.17), step(m, 0.035)); // thick edge of the cushion
      alb = mc; id = 900.0;
    }
  }
  // --- cel lighting ---
  float ndl = dot(N, normalize(uSun));
  float sh = shadowAt();
  float gb = gobo(vW);
  float lit = step(0.08, ndl) * sh * gb;
  vec3 shade = alb * uAmb;
  // deeper second shadow on surfaces turned well away / down
  float deep = step(ndl, -0.45) * step(N.y, 0.1);
  shade = mix(shade, alb * uAmb2, deep);
  if (uMat == 6) { shade = mix(uCol2, uCol2 * 0.86, deep); shade = mix(shade, alb * uAmb, coatM); }
  vec3 col = mix(shade, alb * uSunCol, lit);
  // anime rim light: thin bright band where lit surfaces turn away from camera
  vec3 V = normalize(uCamPos - vW);
  if (uMat == 0 || uMat == 1 || uMat == 4 || uMat == 6) {
    float rim = step(0.8, 1.0 - max(dot(N, V), 0.0)) * step(0.25, ndl);
    col = mix(col, alb * uSunCol * 1.22 + vec3(0.04,0.03,0.0), lit * rim * (1.0 - mossM * 0.5));
  }
  if (uMat == 2) { // eye glass: dark with an anime catchlight
    vec3 ev = normalize(mat3(uView) * N);
    col = mix(alb * 0.45, alb, step(0.25, ev.y * 0.8 + ev.x * 0.3));
    float cl = step(0.86, dot(ev, normalize(vec3(-0.5, 0.6, 0.62))));
    col = mix(col, vec3(0.97, 0.96, 0.9), cl * (1.0 - clamp(uEmit, 0.0, 1.0)));
  }
  if (uMat != 7) col = mix(col, uEmitCol, clamp(uEmit, 0.0, 1.0) * (1.0 - coatM)); // glow, except under a coat
  col = mix(col, uCoatCol, coatM * uCoatEmit); // an emissive coat (a glowing dissolve edge) ignores the light
  if (uMat == 7) { // shadow catcher
    float s2 = 1.0 - sh;
    oCol = vec4(uAmb2 * vec3(0.55, 0.66, 0.68), s2 * 0.42); oGeo = vec4(0.0, 0.0, vZ, -2.0); return;
  }
  col = mix(vec3(dot(col, vec3(0.3, 0.59, 0.11))), col, uSat); // a world drained of colour drains its cels too
  // atmospheric perspective
  float f = 1.0 - exp(-max(vZ - uFog.y, 0.0) * uFog.x);
  col = mix(col, uFogCol, f);
  vec3 nv = normalize(mat3(uView) * N);
  oCol = vec4(col, 1.0);
  oGeo = vec4(nv.xy, vZ, id);
}`;

const VS_SHADOW = `#version 300 es
layout(location=0) in vec3 aPos;
uniform mat4 uModel, uSunVP;
void main(){ gl_Position = uSunVP * uModel * vec4(aPos,1.0); }`;
const FS_SHADOW = `#version 300 es
precision highp float; out vec4 o; void main(){ o = vec4(1.0); }`;

const VS_QUAD = `#version 300 es
layout(location=0) in vec2 aP; out vec2 vUv; void main(){ vUv = aP*0.5+0.5; gl_Position = vec4(aP,0.0,1.0); }`;

const FS_INK = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D tCol, tGeo; uniform vec2 uRes; uniform float uW, uSeed; uniform vec3 uInk; uniform float uInkFog;
uniform vec3 uFogCol; uniform float uCrease;
${GLSL_NOISE}
bool covered(vec4 c, vec4 g){ return c.a > 0.5 && g.w > 0.5; }
void main(){
  vec4 c = texture(tCol, vUv), g = texture(tGeo, vUv);
  bool cov = covered(c, g);
  // pressure: thickness drifts slowly along the line + a per-drawing seed
  vec2 fc = gl_FragCoord.xy;
  float pr = 0.7 + 0.6 * vn2(fc * 0.0045 + uSeed) ;
  float w = uW * pr;
  float edge = 0.0; float nearZ = cov ? g.z : 1e5;
  for (int i = 0; i < 16; i++) {
    float a = float(i) / 16.0 * 6.2831853;
    vec2 dir = vec2(cos(a), sin(a));
    vec2 u1 = vUv + dir * w / uRes;
    vec4 c1 = texture(tCol, u1), g1 = texture(tGeo, u1);
    bool cov1 = covered(c1, g1);
    if (cov1) nearZ = min(nearZ, g1.z);
    if (cov != cov1) { edge = 1.0; }
    else if (cov) {
      float zc = g.z, z1 = g1.z;
      if (abs(zc - z1) > 0.035 * min(zc, z1) + 0.25) edge = 1.0;
    }
    vec2 u2 = vUv + dir * w * 0.5 / uRes;
    vec4 c2 = texture(tCol, u2), g2 = texture(tGeo, u2);
    if (cov && covered(c2, g2)) {
      if (abs(g.w - g2.w) > 0.5) edge = max(edge, 0.9);
      vec3 n1 = vec3(g.xy, sqrt(max(0.0, 1.0 - dot(g.xy,g.xy))));
      vec3 n2 = vec3(g2.xy, sqrt(max(0.0, 1.0 - dot(g2.xy,g2.xy))));
      if (dot(n1, n2) < uCrease) edge = max(edge, 0.85);
    }
  }
  if (edge > 0.0) {
    vec3 ink = uInk;
    if (cov) ink = mix(uInk, c.rgb * 0.3, 0.25);
    // distant lines soften into the air
    float f = 1.0 - exp(-max(nearZ - 30.0, 0.0) * uInkFog);
    ink = mix(ink, uFogCol * 0.75, f);
    o = vec4(ink, 1.0);
    return;
  }
  if (cov) { o = vec4(c.rgb, 1.0); return; }
  // semi-transparent stuff (shadow catcher)
  if (g.w < -1.5 && c.a > 0.0) { o = vec4(c.rgb * c.a, c.a); return; }
  o = vec4(0.0);
}`;

function glCompile(gl, vs, fs) {
  const p = gl.createProgram();
  for (const [t, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.log(gl.getShaderInfoLog(s)); throw new Error('shader'); }
    gl.attachShader(p, s);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.log(gl.getProgramInfoLog(p)); throw new Error('link'); }
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const inf = gl.getActiveUniform(p, i); u[inf.name] = gl.getUniformLocation(p, inf.name); }
  return { p, u };
}

function initGL() {
  const c = mkCanvas(W * SS, H * SS);
  const gl = c.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
  if (!gl) { console.log('no webgl2'); return; }
  gl.getExtension('EXT_color_buffer_float');
  GL = { gl, c };
  GL.gbuf = glCompile(gl, VS_GBUF, FS_GBUF);
  GL.shadow = glCompile(gl, VS_SHADOW, FS_SHADOW);
  GL.ink = glCompile(gl, VS_QUAD, FS_INK);
  // full-screen quad
  GL.quad = gl.createVertexArray(); gl.bindVertexArray(GL.quad);
  const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  // gbuffer
  const mkTex = (w, h, ifmt, fmt, type, filt) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const RW = W * SS, RH = H * SS;
  GL.tCol = mkTex(RW, RH, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, gl.NEAREST);
  GL.tGeo = mkTex(RW, RH, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, gl.NEAREST);
  GL.fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, GL.fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, GL.tCol, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, GL.tGeo, 0);
  const rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, RW, RH);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
  // shadow map
  GL.tShadow = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, GL.tShadow);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, 2048, 2048, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  GL.sfb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, GL.sfb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, GL.tShadow, 0);
  const dummy = mkTex(2048, 2048, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.NEAREST);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, dummy, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

// upload a mesh {pos:Float32Array, nrm:Float32Array, idx:Uint32Array}
function glMesh(m) {
  const gl = GL.gl;
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const b0 = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b0); gl.bufferData(gl.ARRAY_BUFFER, m.pos, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  const b1 = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b1); gl.bufferData(gl.ARRAY_BUFFER, m.nrm, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, n: m.idx.length, b0, b1, ib };
}
function glUpdateMesh(gm, m) {
  const gl = GL.gl;
  gl.bindBuffer(gl.ARRAY_BUFFER, gm.b0); gl.bufferData(gl.ARRAY_BUFFER, m.pos, gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, gm.b1); gl.bufferData(gl.ARRAY_BUFFER, m.nrm, gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gm.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.DYNAMIC_DRAW);
  gm.n = m.idx.length;
}

// draw list: [{gm, model, mat:{type,col,col2,id,restUp,moss,rust,chip,emit,emitCol,stripe,coat,coatCol,coatA,coatNoise,twoSided}, noShadow}]
// mat.type: 0 painted metal (chips, rust, faded patches)  1 dark joint metal  2 eye glass (catchlight; emit lights it)
//           3 two-tone stone/bark (col/col2 noise)  4 plain cel  5 lamp/emissive  6 soft cel with a designer shadow colour (col2)
//           7 shadow catcher (ground that only shows cast shadows)
// opts: {lineW, seed (change per drawing = boil), jit, ink:[r,g,b], inkFog, crease, moss, dirt, clipY, clipN (noise on the cut = dissolve), sat (0 grey .. 1 full colour)}
// mat.coat: world height below which the part wears coatCol (shadow pouring off, or with coatEmit 1 a glowing dissolve edge)
// L: lighting {sun, sunCol, amb, amb2, gobo:[scale,thresh,amount,seed], goboMode, fogCol, fog:[density,start], shaft, shaftDir, shadowCenter, shadowR}
function glRender(items, cam, L, opts = {}) {
  const gl = GL.gl;
  const RW = W * SS, RH = H * SS;
  // sun camera
  const sc = L.shadowCenter || [0, 6, 0], sr = L.shadowR || 16;
  const sd = V3.norm(L.sun);
  const sunView = M4.lookAt(V3.add(sc, V3.mul(sd, 60)), sc, Math.abs(sd[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0]);
  const sunVP = M4.mul(M4.ortho(-sr, sr, -sr, sr, 1, 140), sunView);
  // shadow pass
  gl.bindFramebuffer(gl.FRAMEBUFFER, GL.sfb);
  gl.viewport(0, 0, 2048, 2048);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.BLEND);
  gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
  gl.useProgram(GL.shadow.p);
  gl.uniformMatrix4fv(GL.shadow.u.uSunVP, false, sunVP);
  gl.disable(gl.CULL_FACE);
  for (const it of items) {
    if (it.noShadow || it.mat.type === 7) continue;
    gl.uniformMatrix4fv(GL.shadow.u.uModel, false, it.model);
    gl.bindVertexArray(it.gm.vao); gl.drawElements(gl.TRIANGLES, it.gm.n, gl.UNSIGNED_INT, 0);
  }
  // gbuffer pass
  gl.bindFramebuffer(gl.FRAMEBUFFER, GL.fb);
  gl.viewport(0, 0, RW, RH);
  gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]);
  gl.clearBufferfv(gl.COLOR, 1, [0, 0, 1e4, 0]);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  const P = GL.gbuf; gl.useProgram(P.p); const u = P.u;
  gl.uniformMatrix4fv(u.uVP, false, cam.vp); gl.uniformMatrix4fv(u.uView, false, cam.view); gl.uniformMatrix4fv(u.uSunVP, false, sunVP); gl.uniform3fv(u.uCamPos, cam.pos);
  gl.uniform3fv(u.uSun, sd); gl.uniform3fv(u.uSunCol, L.sunCol); gl.uniform3fv(u.uAmb, L.amb); gl.uniform3fv(u.uAmb2, L.amb2 || mulc(L.amb, 0.75));
  gl.uniform4fv(u.uGobo, L.gobo || [0.2, 0.5, 0, 0]); gl.uniform1f(u.uGoboMode, L.gobo ? 1 : 0);
  gl.uniform3fv(u.uFogCol, L.fogCol || [1, 1, 1]); gl.uniform2fv(u.uFog, L.fog || [0, 0]);
  gl.uniform4fv(u.uShaft, L.shaft || [0, 0, 0, 0]); gl.uniform3fv(u.uShaftDir, L.shaftDir || [1, 0, 0]);
  gl.uniform1f(u.uShadowOn, L.noShadow ? 0 : 1); gl.uniform1f(u.uClipY, opts.clipY ?? -1e4); gl.uniform1f(u.uClipN, opts.clipN || 0); gl.uniform1f(u.uSat, opts.sat ?? 1);
  gl.uniform1f(u.uJit, opts.jit ?? 0.04); gl.uniform1f(u.uSeed, opts.seed || 0);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, GL.tShadow); gl.uniform1i(u.uShadow, 0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
  for (const it of items) {
    const m = it.mat;
    if (m.twoSided) gl.disable(gl.CULL_FACE); else gl.enable(gl.CULL_FACE);
    gl.uniformMatrix4fv(u.uModel, false, it.model);
    gl.uniform1i(u.uMat, m.type || 0);
    gl.uniform3fv(u.uCol, m.col); gl.uniform3fv(u.uCol2, m.col2 || m.col);
    gl.uniform1f(u.uId, m.id || 1);
    gl.uniform3fv(u.uRestUp, it.restUp || [0, 1, 0]);
    gl.uniform1f(u.uMoss, (m.moss || 0) * (opts.moss ?? 1)); gl.uniform1f(u.uRust, m.rust ?? 0.6); gl.uniform1f(u.uChip, m.chip ?? 0.6);
    gl.uniform1f(u.uEmit, m.emit || 0); gl.uniform3fv(u.uEmitCol, m.emitCol || [1, 1, 1]);
    gl.uniform1f(u.uStripe, m.stripe || 0);
    // coat: m.coat = world height it reaches (null = none), m.coatCol, m.coatA (0..1), m.coatNoise; m.dirt is the old soil coat
    if (m.coat != null) { gl.uniform1f(u.uDirt, m.coat); gl.uniform3fv(u.uCoatCol, m.coatCol || [0.08, 0.07, 0.12]); gl.uniform2fv(u.uCoat, [m.coatA ?? 1, m.coatNoise ?? 0.6]); gl.uniform1f(u.uCoatEmit, m.coatEmit || 0); }
    else if (m.dirt) { gl.uniform1f(u.uDirt, m.dirt * (opts.dirt ?? 1)); gl.uniform3fv(u.uCoatCol, [0.36, 0.31, 0.24]); gl.uniform2fv(u.uCoat, [0.7, 0.6]); gl.uniform1f(u.uCoatEmit, 0); }
    else gl.uniform1f(u.uDirt, -1e4);
    gl.bindVertexArray(it.gm.vao); gl.drawElements(gl.TRIANGLES, it.gm.n, gl.UNSIGNED_INT, 0);
  }
  // ink pass -> canvas
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, RW, RH);
  gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  const I = GL.ink; gl.useProgram(I.p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, GL.tCol); gl.uniform1i(I.u.tCol, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, GL.tGeo); gl.uniform1i(I.u.tGeo, 1);
  gl.uniform2fv(I.u.uRes, [RW, RH]);
  gl.uniform1f(I.u.uW, (opts.lineW || 1.6) * SS);
  gl.uniform1f(I.u.uSeed, (opts.seed || 0) * 3.7);
  gl.uniform3fv(I.u.uInk, opts.ink || [0.17, 0.12, 0.11]);
  gl.uniform1f(I.u.uInkFog, opts.inkFog ?? 0.0);
  gl.uniform3fv(I.u.uFogCol, L.fogCol || [1, 1, 1]);
  gl.uniform1f(I.u.uCrease, opts.crease ?? 0.8);
  gl.bindVertexArray(GL.quad); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindVertexArray(null);
  return GL.c;
}

// read back view depth (and id) of the last G-buffer at frame pixel coords; returns [z, id]
const _rb = new Float32Array(4);
function glProbe(sx, sy) {
  const gl = GL.gl;
  const x = Math.round(sx * SS), y = Math.round((H - sy) * SS);
  if (x < 0 || y < 0 || x >= W * SS || y >= H * SS) return [1e4, 0];
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, GL.fb);
  gl.readBuffer(gl.COLOR_ATTACHMENT1);
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.FLOAT, _rb);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  return [_rb[3] > 0.5 ? _rb[2] : 1e4, _rb[3]];
}
