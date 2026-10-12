// Core helpers. Everything here is pure: seek(t) must give the same frame for the same t, in any order.
(() => {
const L = {};
L.clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
L.lerp = (a, b, k) => a + (b - a) * k;
L.inv = (a, b, x) => L.clamp((x - a) / (b - a));
L.ease = {
  lin: k => k,
  inQuad: k => k * k,
  outQuad: k => 1 - (1 - k) * (1 - k),
  inCubic: k => k * k * k,
  outCubic: k => 1 - Math.pow(1 - k, 3),
  inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  outQuart: k => 1 - Math.pow(1 - k, 4),
  outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
  inExpo: k => (k <= 0 ? 0 : Math.pow(2, 10 * k - 10)),
  inOutExpo: k => (k <= 0 ? 0 : k >= 1 ? 1 : k < 0.5 ? Math.pow(2, 20 * k - 10) / 2 : (2 - Math.pow(2, -20 * k + 10)) / 2),
  outBack: (k, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2),
  inBack: (k, s = 1.70158) => (s + 1) * k * k * k - s * k * k,
};
// progress of t through [t0, t0+d] with an easing
L.p = (t, t0, d, e = L.ease.outCubic) => e(L.clamp((t - t0) / d));
// closed-form damped spring from 0 -> 1 started at t0 (f = natural freq in Hz, z = damping ratio)
L.spring = (t, t0, f = 2.2, z = 0.55) => {
  const x = t - t0;
  if (x <= 0) return 0;
  const w = 2 * Math.PI * f;
  if (z >= 1) return 1 - (1 + w * x) * Math.exp(-w * x);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + (z * w / wd) * Math.sin(wd * x));
};
// pop-in scale: 0 -> overshoot -> 1
L.pop = (t, t0, f = 3.2, z = 0.42) => L.spring(t, t0, f, z);
// fade window: in over [a, a+di], out over [b, b+do]
L.win = (t, a, b, di = 0.2, dout = 0.2) => Math.min(L.p(t, a, di, L.ease.outCubic), 1 - L.p(t, b, dout, L.ease.inCubic));
// deterministic noise
L.hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
L.noise1 = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return L.lerp(L.hash(i), L.hash(i + 1), u) * 2 - 1; };
L.rng = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// DOM
L.h = (tag, attrs = {}, ...kids) => {
  const svg = ['svg', 'path', 'circle', 'rect', 'g', 'line', 'polyline', 'polygon', 'ellipse', 'defs', 'clipPath', 'mask', 'text', 'linearGradient', 'radialGradient', 'stop'].includes(tag);
  const el = svg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
};
// set transform/opacity/etc. Only writes when changed (keeps seek cheap).
L.set = (el, props) => {
  const s = el.style;
  for (const k in props) {
    const v = props[k];
    if (el['_' + k] !== v) { el['_' + k] = v; s[k] = v; }
  }
};
L.show = (el, on) => L.set(el, { display: on ? '' : 'none' });
L.tf = (o) => {
  let s = '';
  if (o.persp) s += `perspective(${o.persp}px) `;
  if (o.x != null || o.y != null) s += `translate(${(o.x || 0).toFixed(2)}px,${(o.y || 0).toFixed(2)}px) `;
  if (o.z != null) s += `translateZ(${o.z.toFixed(2)}px) `;
  if (o.rx) s += `rotateX(${o.rx.toFixed(3)}deg) `;
  if (o.ry) s += `rotateY(${o.ry.toFixed(3)}deg) `;
  if (o.r) s += `rotate(${o.r.toFixed(3)}deg) `;
  if (o.s != null) s += `scale(${o.s.toFixed(4)}) `;
  if (o.sx != null || o.sy != null) s += `scale(${(o.sx ?? 1).toFixed(4)},${(o.sy ?? 1).toFixed(4)}) `;
  return s || 'none';
};

// Headline whose words rise out of a mask. spec: [[word, {cls, at}], ...] split into lines by '\n'.
L.rise = (lines, cls = '') => {
  const root = L.h('div', { class: 'hl ' + cls });
  const words = [];
  for (const line of lines) {
    const ln = L.h('div', { class: 'hl-line' });
    for (const [txt, opt = {}] of line) {
      const inner = L.h('span', { class: 'hl-in ' + (opt.cls || '') }, txt);
      const w = L.h('span', { class: 'hl-w' }, inner);
      ln.append(w, ' ');
      words.push({ inner, at: opt.at ?? 0, dur: opt.dur ?? 0.34 });
    }
    root.append(ln);
  }
  root.update = (t, outAt = 1e9, outDur = 0.18) => {
    for (const w of words) {
      const k = L.p(t, w.at, w.dur, L.ease.outCubic);
      L.set(w.inner, { transform: `translateY(${((1 - k) * 108).toFixed(2)}%)` });
    }
    const o = L.p(t, outAt, outDur, L.ease.inCubic);
    L.set(root, { opacity: (1 - o).toFixed(3), filter: o > 0 ? `blur(${(o * 14).toFixed(1)}px)` : 'none',
                  transform: o > 0 ? `scale(${(1 + o * 0.04).toFixed(4)})` : 'none' });
    L.show(root, t >= Math.min(...words.map(w => w.at)) - 0.05 && o < 1);
  };
  return root;
};

// typewriter text
L.type = (el, full, t, t0, cps = 28, caret = false) => {
  const n = L.clamp(Math.floor((t - t0) * cps), 0, full.length);
  const s = t < t0 ? '' : full.slice(0, n);
  const c = caret && t >= t0 && (n < full.length || Math.floor(t * 2.2) % 2 === 0) ? '<span class="caret"></span>' : '';
  const html = s.replace(/&/g, '&amp;').replace(/</g, '&lt;') + c;
  if (el._html !== html) { el._html = html; el.innerHTML = html; }
  return n;
};
L.txt = (el, s) => { if (el._txt !== s) { el._txt = s; el.textContent = s; } };
L.fmt = n => Math.round(n).toLocaleString('en-US');

window.L = L;
})();
