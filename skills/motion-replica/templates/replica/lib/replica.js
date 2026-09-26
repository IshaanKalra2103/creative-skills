/* Timeline core for motion replicas — classic script (works from file://), defines globals.

   The contract: every frame is a pure function of time. Each cell is
   { period, update(t) } and update() sets every property it owns from t alone —
   no accumulated state, no rAF deltas — so render.py can jump to any frame and
   the export is identical to what you preview.

   Replica.boot({ W, H, fonts, before, build, duration }) wires up renderAt(t),
   stage fitting, WebGL pixel ratios, ?t=<sec> freeze-frames, ?export=1 and
   space-to-pause live playback. */

/* ---------- math + easing ---------- */
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
// progress of t through the window [a, b], clamped to 0..1 — the workhorse: E.outCubic(seg(t, 1.2, 1.6))
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  lin: x => x,
  inQuad: x => x * x, outQuad: x => 1 - (1 - x) * (1 - x),
  inCubic: x => x * x * x, outCubic: x => 1 - Math.pow(1 - x, 3),
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outQuint: x => 1 - Math.pow(1 - x, 5),
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
  outBack: (x, s = 1.7) => { const c = s + 1; return 1 + c * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); },
};
// seeded PRNG — use for scattered particles/grain so every render is identical
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- DOM helpers ---------- */
function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function add(p, html) { const e = h(html); p.appendChild(e); return e; }
const T = (e, s) => { e.style.transform = s; };
const O = (e, v) => { e.style.opacity = v; };
const V = (e, b) => { e.style.visibility = b ? 'visible' : 'hidden'; };   // hard cuts between scenes
const blur = n => n > 0.05 ? `blur(${n.toFixed(2)}px)` : 'none';
// centre an element on (x, y) in cell pixels, then scale — for .a elements positioned at 0,0
const at = (x, y, s = 1, extra = '') => `translate(${x}px,${y}px) translate(-50%,-50%) scale(${s}) ${extra}`;
const fmt = (v, d = 0) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ---------- odometer: number-flow style digit rolls ----------
   Real UI counters don't smear continuously: the value is sampled every `dt` s and
   each digit rolls to its next glyph over `dur`, then rests. flow() does that, with
   vertical motion blur only while a digit moves and digits that grow in as the
   number gains places. Font size comes from the parent's CSS. */
class Odo {
  constructor(parent, { places = 4, minPlaces = 1, prefix = '', commas = false, style = '' }) {
    Replica.ensureFilters();
    this.places = places; this.minPlaces = minPlaces;
    this.el = add(parent, `<div class="odo" style="${style}"></div>`);
    if (prefix) add(this.el, `<span>${prefix}</span>`);
    this.w = []; this.c = [];
    for (let p = places - 1; p >= 0; p--) {
      const w = add(this.el, `<span class="wheel"><span class="strip">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => `<b>${d}</b>`).join('')}</span></span>`);
      this.w[p] = { el: w, strip: w.firstChild };
      if (commas && p % 3 === 0 && p > 0) this.c[p] = add(this.el, `<span>,</span>`);
    }
    const fs = parseFloat(getComputedStyle(this.el).fontSize);
    const pr = add(this.el, `<span style="position:absolute;visibility:hidden;font-size:${fs * 10}px">0000000000</span>`);
    this.dw = pr.offsetWidth / 100; pr.remove();
    const cp = add(this.el, `<span style="position:absolute;visibility:hidden;font-size:${fs * 10}px">,,,,,,,,,,</span>`);
    this.cw = cp.offsetWidth / 100; cp.remove();
    this.fs = fs;
  }
  // f(t) → value; pass the cell's local t
  flow(f, t, dt = .125, dur = .1) {
    const k = Math.floor(t / dt), x = clamp((t - k * dt) / dur), p = E.outCubic(x);
    const a = Math.round(f((k - 1) * dt)), b = Math.round(f(k * dt));
    const rate = x < 1 ? 3 * (1 - x) * (1 - x) / dur : 0;
    for (let q = 0; q < this.places; q++) {
      const P = 10 ** q, da = Math.floor(a / P) % 10, db = Math.floor(b / P) % 10;
      const delta = b >= a ? ((db - da) % 10 + 10) % 10 : -(((da - db) % 10 + 10) % 10);
      const pos = (((da + delta * p) % 10) + 10) % 10;
      const lvl = Math.min(12, Math.round(this.fs * .00022 * Math.abs(delta) * rate / 2));
      const { el, strip } = this.w[q];
      strip.style.transform = `translateY(${(-pos * 1.25).toFixed(4)}em)`;
      strip.style.filter = lvl ? `url(#vb${lvl})` : 'none';
      const va = q < this.minPlaces || a >= P ? 1 : 0, vb = q < this.minPlaces || b >= P ? 1 : 0, vis = lerp(va, vb, p);
      el.style.width = (this.dw * vis) + 'px'; el.style.opacity = vis;
      if (this.c[q]) { this.c[q].style.width = (this.cw * vis) + 'px'; this.c[q].style.opacity = vis; }
    }
  }
}

/* ---------- sunburst rays (conic gradient + radial mask) ---------- */
function makeRays(parent, { n = 16, duty = .5, color = '#cdf55a', size = 2400, mask = 'radial-gradient(circle closest-side,transparent 6%,#000 30%)', soft = 1.4 } = {}) {
  const per = 360 / n, w = per * duty;
  return add(parent, `<div class="a rays" style="width:${size}px;height:${size}px;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,0) 0deg,${color} ${soft}deg,${color} ${w - soft}deg,rgba(255,255,255,0) ${w}deg,rgba(255,255,255,0) ${per}deg);-webkit-mask-image:${mask};mask-image:${mask}"></div>`);
}

/* ---------- UI icons (24-unit strokes) + iOS status bar ---------- */
const PATHS = {
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  download: '<path d="M12 3v11.5M6.5 9.5 12 15l5.5-5.5M4.5 20.5h15"/>',
  upload: '<path d="M12 16.5V5M6.5 10.5 12 5l5.5 5.5M4.5 20.5h15"/>',
  transfer: '<path d="M4 8.5h15l-3.5-3.5M20 15.5H5l3.5 3.5"/>',
  eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3.2"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/>',
  chev: '<path d="M9.5 6l6 6-6 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M14 10c.8.8.8 3.2 0 4M17 9c1.4 1.4 1.4 4.6 0 6"/>',
  wallet: '<path d="M19 7.5V6a2 2 0 0 0-2-2H5.5A2.5 2.5 0 0 0 3 6.5v11A2.5 2.5 0 0 0 5.5 20H17a2 2 0 0 0 2-2v-1.5"/><path d="M21 9h-5.5a3 3 0 0 0 0 6H21z"/>',
  home: '<path d="M4 11 12 4l8 7v8.5a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  hand: '<path d="M9 11.5V5.2a1.6 1.6 0 0 1 3.2 0v5.3M12.2 10V8.4a1.6 1.6 0 0 1 3.2 0V11M15.4 10.2a1.6 1.6 0 0 1 3.2 0v3.3a7 7 0 0 1-7 7h-.8a6 6 0 0 1-5-2.8l-2.2-3.7a1.6 1.6 0 0 1 2.6-1.8L9 14.6"/>',
  spark: '<path d="M12 3c.6 4.8 3.9 8.2 9 9-5.1.8-8.4 4.2-9 9-.6-4.8-3.9-8.2-9-9 5.1-.8 8.4-4.2 9-9z"/>',
};
const ic = (n, size, color = 'currentColor', sw = 2, fill = 'none') => `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${PATHS[n]}</svg>`;
const SIG = (s = 1) => `<svg viewBox="0 0 34 22" width="${34 * s}" height="${22 * s}" fill="currentColor"><rect x="0" y="14" width="6" height="8" rx="1.6"/><rect x="9" y="9.5" width="6" height="12.5" rx="1.6"/><rect x="18" y="5" width="6" height="17" rx="1.6"/><rect x="27" y="0" width="6" height="22" rx="1.6"/></svg>`;
const WIFI = (s = 1) => `<svg viewBox="0 0 30 22" width="${30 * s}" height="${22 * s}" fill="none" stroke="currentColor" stroke-width="3.8" stroke-linecap="round"><path d="M3 8.6a17 17 0 0 1 24 0"/><path d="M8.2 13.6a10 10 0 0 1 13.6 0"/><circle cx="15" cy="19" r="2.5" fill="currentColor" stroke="none"/></svg>`;
const BATT = (s = 1) => `<svg viewBox="0 0 50 24" width="${50 * s}" height="${24 * s}"><rect x="1.2" y="1.2" width="43" height="21.6" rx="7" fill="currentColor"/><path d="M47 8.5v7a3.5 3.5 0 0 0 0-7z" fill="currentColor" fill-opacity=".45"/></svg>`;
const SBI = s => `${SIG(s)}${WIFI(s)}${BATT(s)}`;

/* ---------- boot ---------- */
const Replica = {
  STAGES: [],  // push every A3.Stage here so fit() keeps its pixel ratio sharp
  ensureFilters() {
    if (document.getElementById('vb1')) return;
    let s = ''; for (let i = 1; i <= 12; i++) s += `<filter id="vb${i}" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="0 ${i * 2}"/></filter>`;
    document.body.insertAdjacentHTML('beforeend', `<svg width="0" height="0" style="position:absolute"><defs>${s}</defs></svg>`);
  },
  async boot({ W, H, fonts = [], before = null, build, duration = null }) {
    this.ensureFilters();
    await Promise.all(fonts.map(f => document.fonts.load(f)));
    if (before) await before();
    const cells = build();
    const stage = document.getElementById('stage');
    stage.style.width = W + 'px'; stage.style.height = H + 'px';
    const fit = () => {
      const s = Math.min(innerWidth / W, innerHeight / H);
      stage.style.transform = `translate(${(innerWidth - W * s) / 2}px,${(innerHeight - H * s) / 2}px) scale(${s})`;
      for (const st of this.STAGES) st.setPixelRatio(s * devicePixelRatio);
    };
    // looping cells get their own local clock; a cell without a period plays once
    window.renderAt = t => { for (const c of cells) c.update(c.period ? ((t % c.period) + c.period) % c.period : t); };
    if (duration) window.DURATION = duration;
    fit(); addEventListener('resize', fit);
    const q = new URLSearchParams(location.search), t0 = q.has('t') ? parseFloat(q.get('t')) : null;
    renderAt(t0 ?? 0);
    window.__ready = true;
    if (q.has('export') || t0 !== null) return;
    let start = performance.now(), paused = false, pausedAt = 0;
    addEventListener('keydown', e => { if (e.code === 'Space') { paused = !paused; if (paused) pausedAt = (performance.now() - start) / 1000; else start = performance.now() - pausedAt * 1000; } });
    const loop = () => { if (!paused) renderAt((performance.now() - start) / 1000); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  },
};
