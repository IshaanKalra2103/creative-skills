// ---------- core: rng, noise, math, color ----------
const TAU = Math.PI * 2;
const W = 1776, H = 960; // 1.85:1 frame
const FPS = 24;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
class RNG {
  constructor(seed) { this.r = mulberry32((seed * 2654435761) >>> 0); }
  next() { return this.r(); }
  range(a, b) { return a + (b - a) * this.r(); }
  int(a, b) { return Math.floor(a + (b - a + 1) * this.r()); }
  pick(a) { return a[Math.floor(this.r() * a.length) % a.length]; }
  sign() { return this.r() < 0.5 ? -1 : 1; }
  gauss() { let u = 0, v = 0; while (!u) u = this.r(); while (!v) v = this.r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
}

function hash2i(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function hash1(x) { return hash2i(x | 0, 9137); }
function vnoise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2i(xi, yi), b = hash2i(xi + 1, yi), c = hash2i(xi, yi + 1), d = hash2i(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm2(x, y, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise2(x * f + i * 17.3, y * f - i * 9.1); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
function vnoise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash1(i) * (1 - u) + hash1(i + 1) * u; }

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const invlerp = (a, b, x) => clamp((x - a) / (b - a));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeIn = (t) => t * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t) => t * t * t;

// hex -> [r,g,b] 0..1
function hx(s) {
  s = s.replace('#', '');
  return [parseInt(s.slice(0, 2), 16) / 255, parseInt(s.slice(2, 4), 16) / 255, parseInt(s.slice(4, 6), 16) / 255];
}
function mixc(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function mulc(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
function mulc3(a, b) { return [a[0] * b[0], a[1] * b[1], a[2] * b[2]]; }
function addc(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function css(c, a = 1) {
  const r = Math.round(clamp(c[0]) * 255), g = Math.round(clamp(c[1]) * 255), b = Math.round(clamp(c[2]) * 255);
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
}
// jitter a color in a painterly way (value + slight hue drift)
function jit(c, rng, v = 0.04, h = 0.02) {
  const dv = (rng.next() - 0.5) * 2 * v;
  return [clamp(c[0] + dv + (rng.next() - 0.5) * h), clamp(c[1] + dv + (rng.next() - 0.5) * h), clamp(c[2] + dv + (rng.next() - 0.5) * h)];
}

// ---------- vec / mat (column-major) ----------
const V3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)],
};
const M4 = {
  ident() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  },
  trans(x, y, z) { const m = M4.ident(); m[12] = x; m[13] = y; m[14] = z; return m; },
  scale(x, y, z) { const m = M4.ident(); m[0] = x; m[5] = y; m[10] = z; return m; },
  rotX(a) { const m = M4.ident(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; },
  rotY(a) { const m = M4.ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; },
  rotZ(a) { const m = M4.ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; },
  // euler order: Y * X * Z (yaw, pitch, roll) applied to local
  euler(x, y, z) { return M4.mul(M4.rotY(y), M4.mul(M4.rotX(x), M4.rotZ(z))); },
  persp(fovy, asp, n, f) {
    const m = new Float32Array(16), t = 1 / Math.tan(fovy / 2);
    m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m;
  },
  ortho(l, r, b, t, n, f) {
    const m = M4.ident();
    m[0] = 2 / (r - l); m[5] = 2 / (t - b); m[10] = -2 / (f - n);
    m[12] = -(r + l) / (r - l); m[13] = -(t + b) / (t - b); m[14] = -(f + n) / (f - n); return m;
  },
  lookAt(eye, at, up) {
    const z = V3.norm(V3.sub(eye, at)), x = V3.norm(V3.cross(up, z)), y = V3.cross(z, x);
    const m = M4.ident();
    m[0] = x[0]; m[4] = x[1]; m[8] = x[2];
    m[1] = y[0]; m[5] = y[1]; m[9] = y[2];
    m[2] = z[0]; m[6] = z[1]; m[10] = z[2];
    m[12] = -V3.dot(x, eye); m[13] = -V3.dot(y, eye); m[14] = -V3.dot(z, eye);
    return m;
  },
  xform(m, p) { // point
    const x = p[0], y = p[1], z = p[2];
    return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
  },
  xdir(m, p) {
    const x = p[0], y = p[1], z = p[2];
    return [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z];
  },
  invRigid(m) { // inverse of rotation+translation (+uniform scale ok-ish)
    const o = M4.ident();
    o[0] = m[0]; o[1] = m[4]; o[2] = m[8];
    o[4] = m[1]; o[5] = m[5]; o[6] = m[9];
    o[8] = m[2]; o[9] = m[6]; o[10] = m[10];
    o[12] = -(m[0] * m[12] + m[1] * m[13] + m[2] * m[14]);
    o[13] = -(m[4] * m[12] + m[5] * m[13] + m[6] * m[14]);
    o[14] = -(m[8] * m[12] + m[9] * m[13] + m[10] * m[14]);
    return o;
  },
};

// Camera helper: position + target + fov; project world point to frame pixels
class Cam {
  constructor(pos, tgt, fov, roll = 0) { this.set(pos, tgt, fov, roll); }
  set(pos, tgt, fov, roll = 0) {
    this.pos = pos; this.tgt = tgt; this.fov = fov; this.roll = roll;
    let up = [Math.sin(roll), Math.cos(roll), 0];
    this.view = M4.lookAt(pos, tgt, [0, 1, 0]);
    if (roll) this.view = M4.mul(M4.rotZ(roll), this.view);
    this.proj = M4.persp(fov * Math.PI / 180, W / H, 0.5, 4000);
    this.vp = M4.mul(this.proj, this.view);
    this.f = (H / 2) / Math.tan(fov * Math.PI / 360);
    return this;
  }
  // -> [sx, sy, depth]
  project(p) {
    const v = M4.xform(this.view, p);
    const z = -v[2];
    return [W / 2 + v[0] / z * this.f, H / 2 - v[1] / z * this.f, z];
  }
  // frame pixel + depth -> world
  unproject(sx, sy, z) {
    const vx = (sx - W / 2) / this.f * z, vy = -(sy - H / 2) / this.f * z;
    const inv = M4.invRigid(this.view);
    return M4.xform(inv, [vx, vy, -z]);
  }
}
const SHOTS = [];
// aim a camera at C so that world points land near screen targets: pts = [[world, [sx, sy]], ...]
function fitCam(C, fov, pts, tg0, roll = 0) {
  const err = (tg) => { const cam = new Cam(C, tg, fov, roll); let e = 0; for (const [p, t] of pts) { const q = cam.project(p); e += (q[0] - t[0]) ** 2 + (q[1] - t[1]) ** 2; } return e; };
  let tg = (tg0 || pts[0][0]).slice(), step = 2, e0 = err(tg);
  for (let it = 0; it < 300; it++) {
    let imp = false;
    for (let a = 0; a < 3; a++) for (const d of [-step, step]) { const t2 = tg.slice(); t2[a] += d; const e = err(t2); if (e < e0) { tg = t2; e0 = e; imp = true; } }
    if (!imp) { step *= 0.6; if (step < 1e-3) break; }
  }
  return tg;
}
