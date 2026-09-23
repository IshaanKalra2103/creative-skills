// dither-reveal engine: an image drawn as a 1-bit dither that the cursor peels back to colour.
// Reads window.DITHER (see references/config.md). Classic script, no dependencies, WebGL2.
// Runs from file:// when the image is a data URI (scripts/prep-image.py writes one).
//
//   mode 'veil'    — the dither is a veil: the cursor burns a hole, the hole lingers and re-dithers,
//                    colour leaks into the ink dots at the edge, a tap blasts a big hole.
//   mode 'filings' — every ink dot is an iron filing with a home. The cursor is a magnet: it lifts
//                    filings into a spiky ferrofluid blob, the image shows where they left, and they
//                    slide home a few seconds later. A tap flips polarity and flings them.
(() => {
'use strict';

const DEFAULTS = {
  image: null,
  mode: 'veil',
  fit: 0.8,            // image width, fraction of the viewport
  maxH: 0.8,           // ...and at most this fraction of its height
  offsetY: -0.02,      // nudge the image up (fraction of viewport height) to leave room for captions
  cells: 260,          // dither cells across the shorter viewport side: sets the dot size
  invert: false,       // ink on the highlights instead of the shadows (needs a cut-out image)
  gamma: 1,
  contrast: 1.2,
  brightness: 0,       // + lightens the veil (fewer dots / filings)
  ink: '#161719',
  paper: '#f2f1ec',
  sheen: 0,            // 0..1: saturated colours swing in hue with the cursor (structural colour)
  onStats: null,       // fn(stats) called ~8×/s, e.g. to print a filing count
  veil: { radius: 0.3, linger: 1, colorDots: true, burst: true, burstScale: 3.2, burstDur: 0.6 },
  filings: { reach: 0.1, maxHeld: 3200, hold: [2.2, 4.5], spikes: 9 },
};
const user = window.DITHER || {};
const C = { ...DEFAULTS, ...user, veil: { ...DEFAULTS.veil, ...user.veil }, filings: { ...DEFAULTS.filings, ...user.filings } };
const rgb = hex => { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const INK = rgb(C.ink), PAPER = rgb(C.paper);
document.documentElement.style.background = C.paper;

let canvas = document.querySelector('canvas[data-dither]');
if (!canvas) { canvas = document.createElement('canvas'); document.body.prepend(canvas); }
Object.assign(canvas.style, { position: 'fixed', left: '0', top: '0', display: 'block', touchAction: 'none', cursor: 'crosshair' });
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
if (!gl) {
  document.body.insertAdjacentHTML('beforeend', '<p style="position:fixed;left:0;right:0;top:45%;text-align:center;font:14px system-ui">This page needs WebGL2.</p>');
  return;
}

// ---------- GL plumbing ----------
const FULL_VS = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const COMMON = `
uniform float uSheen, uTime, uDpr;
uniform vec2 uMag;
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
vec3 hueRotate(vec3 c, float a) {
  const vec3 k = vec3(0.57735);
  float ca = cos(a);
  return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);
}
// Structural colour: saturated pixels swing in hue with their angle to the cursor.
vec3 sheen(vec3 c) {
  if (uSheen <= 0.0) return c;
  float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
  float w = sin(dot((gl_FragCoord.xy - uMag) / uDpr, vec2(0.011, 0.007)) + uTime * 0.8);
  return mix(c, hueRotate(c, 0.35 * w * uSheen), smoothstep(0.1, 0.4, sat)) + sat * 0.3 * uSheen * smoothstep(0.55, 1.0, w);
}`;

function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function program(vs, fs, attribs = ['aPos']) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  attribs.forEach((a, i) => gl.bindAttribLocation(p, i, a));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) {
    const name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, '');
    u[name] = gl.getUniformLocation(p, name);
  }
  return { p, u };
}
function texture2D(filter) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function bindTextures(prog, pairs) {
  pairs.forEach(([name, tex], i) => {
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(prog.u[name], i);
  });
}
function setCommon(prog) {
  gl.uniform1f(prog.u.uSheen, C.sheen);
  gl.uniform1f(prog.u.uTime, time);
  gl.uniform1f(prog.u.uDpr, dpr);
  gl.uniform2f(prog.u.uMag, P.x * dpr, (vh - P.y) * dpr);
}

const fullVao = gl.createVertexArray();
gl.bindVertexArray(fullVao);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
const photoTex = texture2D(gl.LINEAR);

// ---------- layout + dither (shared) ----------
const img = new Image();
let dpr = 1, vw = 0, vh = 0, px = 3, cols = 0, rows = 0, time = 0;
const rect = { x: 0, y: 0, w: 0, h: 0 };

// Floyd–Steinberg with a serpentine scan. Returns 1 per ink cell, rows top-down.
function dither() {
  const oc = document.createElement('canvas');
  oc.width = cols; oc.height = rows;
  const ctx = oc.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, cols, rows);
  const d = ctx.getImageData(0, 0, cols, rows).data;
  const v = new Float32Array(cols * rows);
  for (let i = 0; i < v.length; i++) {
    const l = Math.pow((0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255, C.gamma);
    const a = d[i * 4 + 3] / 255;
    const t = 1 + ((C.invert ? 1 - l : l) - 1) * a;          // transparent reads as paper
    v[i] = (t - 0.5) * C.contrast + 0.5 + C.brightness;
  }
  const ink = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    const ltr = (y & 1) === 0, dir = ltr ? 1 : -1;
    for (let k = 0; k < cols; k++) {
      const x = ltr ? k : cols - 1 - k, i = y * cols + x;
      const paper = v[i] >= 0.5 ? 1 : 0, e = v[i] - paper;
      ink[i] = 1 - paper;
      const xn = x + dir;
      if (xn >= 0 && xn < cols) v[i + dir] += e * 7 / 16;
      if (y + 1 < rows) {
        const j = i + cols;
        if (x - dir >= 0 && x - dir < cols) v[j - dir] += e * 3 / 16;
        v[j] += e * 5 / 16;
        if (xn >= 0 && xn < cols) v[j + dir] += e / 16;
      }
    }
  }
  return ink;
}

function layout() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  vw = innerWidth; vh = innerHeight;
  canvas.style.width = vw + 'px';
  canvas.style.height = vh + 'px';
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
  px = Math.max(2, Math.round(Math.min(vw, vh) / C.cells));
  const aspect = img.naturalWidth / img.naturalHeight;
  let w = vw * C.fit, h = w / aspect;
  if (h > vh * C.maxH) { h = vh * C.maxH; w = h * aspect; }
  cols = Math.floor(w / px); rows = Math.floor(h / px);
  rect.w = cols * px; rect.h = rows * px;
  rect.x = Math.round((vw - rect.w) / 2);
  rect.y = Math.round((vh - rect.h) / 2 + vh * C.offsetY);
  mode.layout(dither());
  wake();
}
const rectUniform = prog => gl.uniform4f(prog.u.uRect, rect.x * dpr, (vh - rect.y - rect.h) * dpr, rect.w * dpr, rect.h * dpr);

// ---------- pointer ----------
const P = { on: false, x: -1e4, y: -1e4, downAt: 0, dx: 0, dy: 0 };
window.addEventListener('pointermove', e => {
  P.x = e.clientX; P.y = e.clientY;
  P.on = e.pointerType === 'mouse' || e.buttons > 0;
  wake();
});
window.addEventListener('pointerdown', e => {
  P.x = e.clientX; P.y = e.clientY; P.on = true;
  P.downAt = performance.now(); P.dx = e.clientX; P.dy = e.clientY;
  mode.down?.();
  wake();
});
window.addEventListener('pointerup', e => {
  if (performance.now() - P.downAt < 350 && Math.hypot(e.clientX - P.dx, e.clientY - P.dy) < 8) mode.tap(e.clientX, e.clientY);
  if (e.pointerType !== 'mouse') P.on = false;
  wake();
});
document.documentElement.addEventListener('pointerleave', () => { P.on = false; mode.leave?.(); });
window.addEventListener('blur', () => { P.on = false; mode.leave?.(); });

// ---------- mode: veil ----------
function Veil() {
  const V = C.veil, DIV = 4;
  const maskProg = program(FULL_VS, `#version 300 es
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uRes, uA, uB;
uniform float uR, uOn, uDecay;
uniform vec3 uBursts[4];
out vec4 o;
void main() {
  vec2 p = gl_FragCoord.xy;
  float m = texture(uPrev, p / uRes).r - uDecay;
  vec2 ab = uB - uA;
  float h = clamp(dot(p - uA, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
  m = max(m, uOn * (1.0 - smoothstep(uR * 0.15, uR, length(p - uA - ab * h))));
  for (int i = 0; i < 4; i++)
    if (uBursts[i].z > 0.0) m = max(m, 1.0 - smoothstep(uBursts[i].z * 0.55, uBursts[i].z, length(p - uBursts[i].xy)));
  o = vec4(vec3(clamp(m, 0.0, 1.0)), 1.0);
}`);
  // Ink dither -> dots tinted by the image -> ordered-dither handoff to the full image.
  const viewProg = program(FULL_VS, `#version 300 es
precision highp float;
${COMMON}
uniform sampler2D uPhoto, uDither, uMask;
uniform vec4 uRect;
uniform vec2 uGrid, uView;
uniform float uCell, uDots;
uniform vec3 uInk, uPaper;
out vec4 o;
void main() {
  vec2 local = gl_FragCoord.xy - uRect.xy;
  if (any(lessThan(local, vec2(0.0))) || any(greaterThanEqual(local, uRect.zw))) { o = vec4(uPaper, 1.0); return; }
  vec2 cell = floor(local / uCell);
  vec2 cuv = (cell + 0.5) / uGrid, uv = local / uRect.zw;
  cuv.y = 1.0 - cuv.y; uv.y = 1.0 - uv.y;
  float m = texture(uMask, (uRect.xy + (cell + 0.5) * uCell) / uView).r;
  vec4 cc = texture(uPhoto, cuv), fc = texture(uPhoto, uv);
  vec3 ink = mix(uInk, mix(uPaper, cc.rgb, cc.a), uDots * smoothstep(0.02, 0.3, m));
  vec3 veil = mix(ink, uPaper, texture(uDither, cuv).r);
  vec3 full = sheen(mix(uPaper, fc.rgb, fc.a));
  o = vec4(bayer8(cell) < smoothstep(0.3, 0.85, m) ? full : veil, 1.0);
}`);
  const ditherTex = texture2D(gl.NEAREST);
  const masks = [0, 1].map(() => ({ tex: texture2D(gl.LINEAR), fb: gl.createFramebuffer() }));
  const bursts = [], burstU = new Float32Array(12);
  let cur = 0, MW = 1, MH = 1, ax = 0, ay = 0, fresh = true, busyUntil = 0;

  return {
    layout(ink) {
      const paper = new Uint8Array(ink.length);
      for (let i = 0; i < ink.length; i++) paper[i] = ink[i] ? 0 : 255;
      gl.bindTexture(gl.TEXTURE_2D, ditherTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, cols, rows, 0, gl.RED, gl.UNSIGNED_BYTE, paper);
      MW = Math.ceil(vw / DIV); MH = Math.ceil(vh / DIV);
      for (const m of masks) {
        gl.bindTexture(gl.TEXTURE_2D, m.tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, MW, MH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, m.fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, m.tex, 0);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },
    tap(x, y) {
      if (!V.burst) return;
      bursts.push({ x: x / DIV, y: MH - y / DIV, t0: performance.now() });
      if (bursts.length > 4) bursts.shift();
    },
    leave() { fresh = true; },
    stats() { return { cells: cols * rows }; },
    frame(dt, now) {
      const bx = P.x / DIV, by = MH - P.y / DIV;
      if (fresh || !P.on) { ax = bx; ay = by; fresh = !P.on; }
      if (P.on || bursts.length) busyUntil = now + (V.linger + V.burstDur) * 1000 + 150;
      const R = V.radius * rect.h / DIV;
      burstU.fill(0);
      for (let i = bursts.length - 1; i >= 0; i--) {
        const t = (now - bursts[i].t0) / 1000 / V.burstDur;
        if (t >= 1) { bursts.splice(i, 1); continue; }
        const ease = 1 - Math.pow(1 - t, 3);
        burstU.set([bursts[i].x, bursts[i].y, R * (0.4 + (V.burstScale - 0.4) * ease)], i * 3);
      }
      const src = masks[cur], dst = masks[1 - cur];
      gl.bindVertexArray(fullVao);
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
      gl.viewport(0, 0, MW, MH);
      gl.useProgram(maskProg.p);
      bindTextures(maskProg, [['uPrev', src.tex]]);
      gl.uniform2f(maskProg.u.uRes, MW, MH);
      gl.uniform2f(maskProg.u.uA, ax, ay);
      gl.uniform2f(maskProg.u.uB, bx, by);
      gl.uniform1f(maskProg.u.uR, R);
      gl.uniform1f(maskProg.u.uOn, P.on ? 1 : 0);
      gl.uniform1f(maskProg.u.uDecay, dt / V.linger);
      gl.uniform3fv(maskProg.u.uBursts, burstU);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      cur = 1 - cur; ax = bx; ay = by;

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(viewProg.p);
      bindTextures(viewProg, [['uPhoto', photoTex], ['uDither', ditherTex], ['uMask', dst.tex]]);
      setCommon(viewProg);
      rectUniform(viewProg);
      gl.uniform2f(viewProg.u.uGrid, cols, rows);
      gl.uniform2f(viewProg.u.uView, canvas.width, canvas.height);
      gl.uniform1f(viewProg.u.uCell, px * dpr);
      gl.uniform1f(viewProg.u.uDots, V.colorDots ? 1 : 0);
      gl.uniform3fv(viewProg.u.uInk, INK);
      gl.uniform3fv(viewProg.u.uPaper, PAPER);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return now < busyUntil;
    },
  };
}

// ---------- mode: filings ----------
function Filings() {
  const F = C.filings, BLOCK = 4, GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const HOME = 0, RIDING = 1, RETURNING = 2;
  // Paper, with the image showing wherever filings have left home.
  const paperProg = program(FULL_VS, `#version 300 es
precision highp float;
${COMMON}
uniform sampler2D uPhoto, uExpose;
uniform vec4 uRect;
uniform float uCell;
uniform vec3 uPaper;
out vec4 o;
void main() {
  vec2 local = gl_FragCoord.xy - uRect.xy;
  vec3 col = uPaper;
  if (all(greaterThanEqual(local, vec2(0.0))) && all(lessThan(local, uRect.zw))) {
    vec2 uv = local / uRect.zw;
    uv.y = 1.0 - uv.y;
    if (bayer8(floor(local / uCell)) < smoothstep(0.03, 0.55, texture(uExpose, uv).r)) {
      vec4 ph = texture(uPhoto, uv);
      col = sheen(mix(uPaper, ph.rgb, ph.a));
    }
  }
  o = vec4(col, 1.0);
}`);
  // One point sprite per filing: a square dot at home, a thin stroke along the field when moving.
  const filingProg = program(`#version 300 es
in vec4 aP;
uniform vec2 uCss;
uniform float uPx, uDpr;
out float vAng, vLen;
void main() {
  gl_Position = vec4(aP.x / uCss.x * 2.0 - 1.0, 1.0 - aP.y / uCss.y * 2.0, 0.0, 1.0);
  gl_PointSize = uPx * uDpr * 3.0;
  vAng = aP.z;
  vLen = aP.w;
}`, `#version 300 es
precision highp float;
uniform vec3 uInk;
in float vAng, vLen;
out vec4 o;
void main() {
  vec2 q = (gl_PointCoord - 0.5) * 3.0;
  float c = cos(vAng), s = sin(vAng);
  vec2 r = vec2(c * q.x + s * q.y, -s * q.x + c * q.y);
  if (abs(r.x) > vLen * 0.5 || abs(r.y) > (vLen > 1.01 ? 0.36 : 0.5)) discard;
  o = vec4(uInk, 1.0);
}`, ['aP']);
  const filingVao = gl.createVertexArray();
  gl.bindVertexArray(filingVao);
  const filingBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, filingBuf);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  const exposeTex = texture2D(gl.LINEAR);

  let N = 0, HX, HY, X, Y, VX, VY, ST, SLOT, TM, BLK, drawBuf;
  let BW = 1, BH = 1, blkInk, blkAway, exposeBytes, slotUsed;
  let firstFree = 0, maxUsed = -1, held = 0, away = 0, calm = 0;
  const mag = { lx: 0, ly: 0, vx: 0, vy: 0 };

  function takeSlot() {
    while (firstFree < F.maxHeld && slotUsed[firstFree]) firstFree++;
    if (firstFree >= F.maxHeld) return -1;
    const k = firstFree++;
    slotUsed[k] = 1;
    if (k > maxUsed) maxUsed = k;
    return k;
  }
  function release(i, flight) {
    const k = SLOT[i];
    slotUsed[k] = 0;
    if (k < firstFree) firstFree = k;
    while (maxUsed >= 0 && !slotUsed[maxUsed]) maxUsed--;
    held--;
    ST[i] = RETURNING;
    TM[i] = flight;
  }

  return {
    layout(ink) {
      const cells = [];
      for (let i = 0; i < ink.length; i++) if (ink[i]) cells.push(i);
      N = cells.length;
      HX = new Float32Array(N); HY = new Float32Array(N); X = new Float32Array(N); Y = new Float32Array(N);
      VX = new Float32Array(N); VY = new Float32Array(N);
      ST = new Uint8Array(N); SLOT = new Int32Array(N); TM = new Float32Array(N); BLK = new Int32Array(N);
      BW = Math.ceil(cols / BLOCK); BH = Math.ceil(rows / BLOCK);
      blkInk = new Uint16Array(BW * BH); blkAway = new Uint16Array(BW * BH); exposeBytes = new Uint8Array(BW * BH);
      cells.forEach((cell, i) => {
        const cx = cell % cols, cy = (cell / cols) | 0;
        X[i] = HX[i] = rect.x + (cx + 0.5) * px;
        Y[i] = HY[i] = rect.y + (cy + 0.5) * px;
        BLK[i] = ((cy / BLOCK) | 0) * BW + ((cx / BLOCK) | 0);
        blkInk[BLK[i]]++;
      });
      slotUsed = new Uint8Array(F.maxHeld);
      firstFree = 0; maxUsed = -1; held = 0; away = 0;
      drawBuf = new Float32Array(N * 4);
      gl.bindBuffer(gl.ARRAY_BUFFER, filingBuf);
      gl.bufferData(gl.ARRAY_BUFFER, drawBuf.byteLength, gl.DYNAMIC_DRAW);
      gl.bindTexture(gl.TEXTURE_2D, exposeTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, BW, BH, 0, gl.RED, gl.UNSIGNED_BYTE, exposeBytes);
    },
    down() { mag.lx = P.x; mag.ly = P.y; },
    // Flip polarity: everything on the magnet is flung off and nearby filings get kicked.
    tap(x, y) {
      const R = F.reach * Math.min(vw, vh) * 1.8;
      for (let i = 0; i < N; i++) {
        let dx = X[i] - x, dy = Y[i] - y;
        const d = Math.hypot(dx, dy) || 1;
        dx /= d; dy /= d;
        if (ST[i] === RIDING) {
          const sp = 500 + Math.random() * 1100;
          VX[i] = dx * sp + (Math.random() - 0.5) * 200;
          VY[i] = dy * sp + (Math.random() - 0.5) * 200;
          release(i, 0.2 + Math.random() * 0.35);
        } else if (d < R) {
          const p = 1 - d / R, sp = (300 + Math.random() * 900) * p;
          VX[i] += dx * sp; VY[i] += dy * sp;
          ST[i] = RETURNING;
          TM[i] = Math.max(TM[i], 0.1 + Math.random() * 0.3 * p);
        }
      }
      calm = 0.7;
    },
    stats() { return { filings: N, held, away }; },
    frame(dt) {
      const k = 1 - Math.exp(-dt * 12);
      mag.vx += ((P.x - mag.lx) / dt - mag.vx) * k;
      mag.vy += ((P.y - mag.ly) / dt - mag.vy) * k;
      mag.lx = P.x; mag.ly = P.y;
      const sp = Math.hypot(mag.vx, mag.vy);
      if (sp > 2500) { mag.vx *= 2500 / sp; mag.vy *= 2500 / sp; }
      calm -= dt;
      const reach = F.reach * Math.min(vw, vh), reach2 = reach * reach;
      const catching = P.on && calm <= 0;
      const spacing = px * 0.6, rMax = spacing * Math.sqrt(maxUsed + 1.5);
      const phase = time * 0.7, catchRate = 18 * dt;
      away = 0;

      for (let i = 0; i < N; i++) {
        const st = ST[i];
        if (st === HOME) {
          if (!catching || held >= F.maxHeld) continue;
          const dx = P.x - HX[i], dy = P.y - HY[i], d2 = dx * dx + dy * dy;
          if (d2 > reach2) continue;
          const p = 1 - Math.sqrt(d2) / reach;
          if (Math.random() > p * p * catchRate) continue;
          const s = takeSlot();
          if (s < 0) continue;
          ST[i] = RIDING; SLOT[i] = s; held++; away++;
          TM[i] = F.hold[0] + Math.random() * (F.hold[1] - F.hold[0]);
          continue;
        }
        away++;
        if (st === RIDING) {
          TM[i] -= dt;
          if (TM[i] <= 0 || !P.on) {
            release(i, 0);
          } else {
            // Sunflower packing round the magnet; the outer ring rises into rotating spikes
            // and the blob trails behind fast moves.
            const s = SLOT[i], th = s * GOLDEN;
            let r = spacing * Math.sqrt(s + 0.5);
            const rel = Math.min(r / rMax, 1);
            if (rel > 0.5) r *= 1 + 0.6 * Math.pow(Math.max(0, Math.cos(F.spikes * th + phase)), 8) * (rel - 0.5) * 2;
            const tx = P.x + r * Math.cos(th) - mag.vx * 0.05 * rel;
            const ty = P.y + r * Math.sin(th) - mag.vy * 0.05 * rel;
            VX[i] += ((tx - X[i]) * 220 - VX[i] * 22) * dt;
            VY[i] += ((ty - Y[i]) * 220 - VY[i] * 22) * dt;
            X[i] += VX[i] * dt; Y[i] += VY[i] * dt;
            continue;
          }
        }
        // Returning: a moment of free flight after a blast, then a spring back home.
        TM[i] -= dt;
        if (TM[i] > 0) {
          const drag = Math.exp(-2.5 * dt);
          VX[i] *= drag; VY[i] *= drag;
        } else {
          VX[i] += ((HX[i] - X[i]) * 38 - VX[i] * 9.5) * dt;
          VY[i] += ((HY[i] - Y[i]) * 38 - VY[i] * 9.5) * dt;
        }
        X[i] += VX[i] * dt; Y[i] += VY[i] * dt;
        if (TM[i] <= 0 && Math.abs(HX[i] - X[i]) + Math.abs(HY[i] - Y[i]) < 0.6 && VX[i] * VX[i] + VY[i] * VY[i] < 400) {
          ST[i] = HOME; X[i] = HX[i]; Y[i] = HY[i]; VX[i] = VY[i] = 0;
        }
      }

      // Exposure: the share of each block's filings that are away from home.
      blkAway.fill(0);
      for (let i = 0; i < N; i++) if (ST[i] !== HOME) blkAway[BLK[i]]++;
      for (let b = 0; b < exposeBytes.length; b++) exposeBytes[b] = blkInk[b] ? Math.min(255, (blkAway[b] / blkInk[b]) * 330) : 0;
      for (let i = 0, o = 0; i < N; i++, o += 4) {
        drawBuf[o] = X[i]; drawBuf[o + 1] = Y[i];
        if (ST[i] === HOME) { drawBuf[o + 2] = 0; drawBuf[o + 3] = 1; continue; }
        if (ST[i] === RIDING) {
          const dx = X[i] - P.x, dy = Y[i] - P.y;
          drawBuf[o + 2] = Math.atan2(dy, dx);
          drawBuf[o + 3] = 1.5 + 1.1 * Math.min(1, Math.hypot(dx, dy) / rMax);
        } else {
          drawBuf[o + 2] = Math.atan2(VY[i], VX[i]);
          drawBuf[o + 3] = 1 + Math.min(1.6, Math.hypot(VX[i], VY[i]) / 400);
        }
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.bindVertexArray(fullVao);
      gl.useProgram(paperProg.p);
      bindTextures(paperProg, [['uPhoto', photoTex], ['uExpose', exposeTex]]);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, BW, BH, gl.RED, gl.UNSIGNED_BYTE, exposeBytes);
      setCommon(paperProg);
      rectUniform(paperProg);
      gl.uniform1f(paperProg.u.uCell, px * dpr);
      gl.uniform3fv(paperProg.u.uPaper, PAPER);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindVertexArray(filingVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, filingBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, drawBuf);
      gl.useProgram(filingProg.p);
      gl.uniform2f(filingProg.u.uCss, vw, vh);
      gl.uniform1f(filingProg.u.uPx, px);
      gl.uniform1f(filingProg.u.uDpr, dpr);
      gl.uniform3fv(filingProg.u.uInk, INK);
      gl.drawArrays(gl.POINTS, 0, N);
      return away > 0 || C.sheen > 0 && P.on;
    },
  };
}

// ---------- loop ----------
const mode = C.mode === 'filings' ? Filings() : Veil();
let running = false, last = 0, statsAt = 0;
function wake() {
  if (running || !cols) return;
  running = true;
  last = performance.now();
  requestAnimationFrame(frame);
}
function frame(now) {
  const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000));
  last = now; time += dt;
  const busy = mode.frame(dt, now);
  window.__ready = true;
  if (C.onStats && now - statsAt > 120) { C.onStats(mode.stats()); statsAt = now; }
  if (busy || P.on) requestAnimationFrame(frame);
  else { running = false; C.onStats?.(mode.stats()); }
}

window.dither = { config: C, rect, stats: () => mode.stats(), tap: (x, y) => { mode.tap(x, y); wake(); } };

img.onload = () => {
  gl.bindTexture(gl.TEXTURE_2D, photoTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  layout();
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(layout, 150); });
};
img.onerror = () => console.error('dither-reveal: could not load window.DITHER.image');
if (!C.image) console.error('dither-reveal: set window.DITHER.image (a data URI from scripts/prep-image.py, or a same-origin URL)');
else img.src = C.image;
})();
