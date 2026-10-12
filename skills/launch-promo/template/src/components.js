// Reusable visual parts. Each builder returns a DOM node (often with an update(...) method).
(() => {
const { h, set, tf, clamp, lerp } = L;
const C = {};
const TH = (window.FILM && window.FILM.theme) || {};
const INK = TH.ink || '#1F1D19', LIME = TH.accent || '#D1FD4E', PURPLE = TH.accent2Text || '#5B2FE0', PAPER = '#F4F3EF';
C.theme = { INK, LIME, PURPLE, PAPER, ACCENT2: TH.accent2 || '#6233D9' };

// ---------- Loopcast mascot: lime rounded square, one "loop" eye (a circular arrow around the pupil), stick arms ----------
function loopArrow(cx, cy, r, a0 = -48, sweep = 296, sw = 11, color = INK) {
  const rad = d => (d * Math.PI) / 180;
  const a1 = a0 + sweep;
  const p0 = [cx + r * Math.cos(rad(a0)), cy + r * Math.sin(rad(a0))];
  const p1 = [cx + r * Math.cos(rad(a1)), cy + r * Math.sin(rad(a1))];
  const arc = `M${p0[0].toFixed(2)},${p0[1].toFixed(2)} A${r},${r} 0 1 1 ${p1[0].toFixed(2)},${p1[1].toFixed(2)}`;
  // arrowhead at p1 pointing along the clockwise tangent
  const tdir = [-Math.sin(rad(a1)), Math.cos(rad(a1))];
  const nrm = [Math.cos(rad(a1)), Math.sin(rad(a1))];
  const L1 = r * 0.42, W1 = r * 0.36;
  const tip = [p1[0] + tdir[0] * L1 * 0.62, p1[1] + tdir[1] * L1 * 0.62];
  const b1 = [p1[0] - tdir[0] * L1 * 0.38 + nrm[0] * W1, p1[1] - tdir[1] * L1 * 0.38 + nrm[1] * W1];
  const b2 = [p1[0] - tdir[0] * L1 * 0.38 - nrm[0] * W1, p1[1] - tdir[1] * L1 * 0.38 - nrm[1] * W1];
  return h('g', {},
    h('path', { d: arc, fill: 'none', stroke: color, 'stroke-width': sw, 'stroke-linecap': 'round' }),
    h('path', { d: `M${tip.join(',')} L${b1.join(',')} L${b2.join(',')} Z`, fill: color, stroke: color, 'stroke-width': sw * 0.45, 'stroke-linejoin': 'round' }));
}

C.mascot = ({ size = 300, arms = true, face = true, iconMode = false } = {}) => {
  // viewBox 0..320; body square 46..266
  const svg = h('svg', { viewBox: '-40 -40 400 400', width: size * 400 / 320, height: size * 400 / 320, style: { overflow: 'visible', position: 'absolute', left: `${-size * 40 / 320}px`, top: `${-size * 40 / 320}px` } });
  const armL = h('g', {}, h('path', { d: 'M58,196 C30,206 18,226 16,252', fill: 'none', stroke: INK, 'stroke-width': 10, 'stroke-linecap': 'round' }),
    h('circle', { cx: 16, cy: 262, r: 17, fill: PAPER, stroke: INK, 'stroke-width': 9 }));
  const armR = h('g', {}, h('path', { d: 'M254,196 C282,206 294,226 296,252', fill: 'none', stroke: INK, 'stroke-width': 10, 'stroke-linecap': 'round' }),
    h('circle', { cx: 296, cy: 262, r: 17, fill: PAPER, stroke: INK, 'stroke-width': 9 }));
  const shadow = h('rect', { x: 58, y: 62, width: 220, height: 220, rx: 58, fill: INK });
  const bodyFill = h('rect', { x: 46, y: 50, width: 220, height: 220, rx: 58, fill: LIME, stroke: INK, 'stroke-width': 12 });
  const eyeC = iconMode ? [156, 160] : [156, 140];
  const eyeR = iconMode ? 66 : 56;
  const pupil = h('circle', { cx: eyeC[0], cy: eyeC[1], r: iconMode ? 22 : 19, fill: INK });
  const hl = h('circle', { cx: eyeC[0] - 8, cy: eyeC[1] - 9, r: 6, fill: '#fff' });
  const eye = h('g', { style: { transformBox: 'view-box', transformOrigin: `${eyeC[0]}px ${eyeC[1]}px` } },
    loopArrow(eyeC[0], eyeC[1], eyeR, -48, 296, iconMode ? 13 : 11), h('g', {}, pupil, hl));
  const mouthOpen = h('g', {}, h('path', { d: 'M126,214 Q156,213 186,214 Q184,248 156,248 Q128,248 126,214 Z', fill: INK }),
    h('ellipse', { cx: 156, cy: 239, rx: 15, ry: 7, fill: PURPLE }));
  const mouthSmile = h('path', { d: 'M132,222 Q156,240 180,222', fill: 'none', stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round' });
  const body = h('g', { style: { transformBox: 'view-box', transformOrigin: '156px 270px' } }, shadow, bodyFill, eye, face ? mouthOpen : null, face ? mouthSmile : null);
  if (arms) svg.append(armL, armR);
  svg.append(body);
  const root = h('div', { class: 'mascot', style: { position: 'absolute', width: `${size}px`, height: `${size}px` } }, svg);
  // state: {blink 0..1, open 0..1 (mouth), lookX, lookY (px in viewbox), sx, sy (squash), armUp -1..1, arms 0..1 visible}
  root.update = (st = {}) => {
    const b = clamp(st.blink ?? 0);
    set(eye, { transform: `scaleY(${(1 - b * 0.88).toFixed(3)})` });
    const lx = st.lookX ?? 0, ly = st.lookY ?? 0;
    pupil.setAttribute('transform', `translate(${lx.toFixed(1)},${ly.toFixed(1)})`);
    hl.setAttribute('transform', `translate(${lx.toFixed(1)},${ly.toFixed(1)})`);
    const o = clamp(st.open ?? 1);
    if (face) { set(mouthOpen, { opacity: o > 0.5 ? 1 : 0 }); set(mouthSmile, { opacity: o > 0.5 ? 0 : 1 }); }
    set(body, { transform: `scale(${(st.sx ?? 1).toFixed(3)},${(st.sy ?? 1).toFixed(3)})` });
    const a = st.armUp ?? 0, av = st.arms ?? 1;
    set(armL, { transform: `rotate(${(-a * 28).toFixed(2)}deg) scale(${av})`, transformOrigin: '58px 196px', transformBox: 'view-box', opacity: av > 0.02 ? 1 : 0 });
    set(armR, { transform: `rotate(${(a * 28).toFixed(2)}deg) scale(${av})`, transformOrigin: '254px 196px', transformBox: 'view-box', opacity: av > 0.02 ? 1 : 0 });
  };
  root.update({});
  return root;
};

// small app icon with the loop eye (for cards / chips). variant: lime | purple | outline | white
C.loopIcon = (variant = 'lime', size = 96) => {
  const bg = { lime: LIME, purple: PURPLE, outline: '#1d1b18', white: '#F4F3EF' }[variant];
  const fg = { lime: INK, purple: '#fff', outline: LIME, white: INK }[variant];
  const border = variant === 'outline' ? LIME : INK;
  const svg = h('svg', { viewBox: '0 0 100 100', width: size, height: size },
    h('rect', { x: 3, y: 3, width: 94, height: 94, rx: 22, fill: bg, stroke: border, 'stroke-width': 5 }),
    loopArrow(50, 46, 22, -48, 296, 6, fg), h('circle', { cx: 50, cy: 46, r: 7.5, fill: fg }),
    h('path', { d: 'M40,77 Q50,84 60,77', fill: 'none', stroke: fg, 'stroke-width': 5, 'stroke-linecap': 'round' }));
  return h('div', { style: { position: 'absolute', width: `${size}px`, height: `${size}px`, filter: 'drop-shadow(0 6px 0 rgba(0,0,0,.35))' } }, svg);
};

// ---------- phone ----------
C.phone = ({ badge = false, time = '9:41', dark = false } = {}) => {
  const screen = h('div', { class: 'screen' });
  const status = h('div', { class: 'status', style: { color: dark ? '#fff' : INK } }, h('span', { class: 'time' }, time), h('span', { class: 'batt' }));
  screen.append(status);
  const b = badge ? h('div', { class: 'badge' }, '1') : null;
  const root = h('div', { class: 'phone' }, h('div', { class: 'side' }), h('div', { class: 'shell' }), screen, h('div', { class: 'island' }), b);
  root.screen = screen; root.badge = b; root.status = status;
  return root;
};

// ---------- sticker card / pill / tag ----------
C.sticker = (who, msg, av, avBg) => {
  const el = h('div', { class: 'stk' },
    h('div', { class: 'av', style: { background: avBg, color: avBg === PURPLE || avBg === C.theme.ACCENT2 ? '#fff' : INK } }, av),
    h('div', {}, h('div', { class: 'who' }, who), h('div', { class: 'msg' }, msg)));
  return el;
};
C.pill = (av, text, avBg = '#E8E5DF') => h('div', { class: 'pill' }, h('div', { class: 'av', style: { background: avBg } }, av), text);
C.tag = (html, cls = '') => h('div', { class: 'tag ' + cls, html });

// ---------- starburst behind the phone ----------
C.burst = (R = 360, r = 250, n = 15, seed = 7) => {
  const rnd = L.rng(seed);
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? R * (0.88 + rnd() * 0.18) : r * (0.92 + rnd() * 0.12);
    pts.push(`${(R + 30 + rr * Math.cos(a)).toFixed(1)},${(R + 30 + rr * Math.sin(a)).toFixed(1)}`);
  }
  const S = (R + 30) * 2;
  return h('svg', { viewBox: `0 0 ${S} ${S}`, width: S, height: S, style: { position: 'absolute', overflow: 'visible' } },
    h('polygon', { points: pts.join(' '), fill: INK, transform: 'translate(10,12)' }),
    h('polygon', { points: pts.join(' '), fill: LIME, stroke: INK, 'stroke-width': 8, 'stroke-linejoin': 'round' }));
};

C.heart = (fill = '#F0567A', size = 44) => h('svg', { viewBox: '0 0 48 44', width: size, height: size * 44 / 48, style: { position: 'absolute', overflow: 'visible' } },
  h('path', { d: 'M24,41 C6,28 2,19 3,12 C4,5 10,2 15,2 C19,2 22,4 24,8 C26,4 29,2 33,2 C38,2 44,5 45,12 C46,19 42,28 24,41 Z', fill, stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }));

C.plane = (size = 120) => h('svg', { viewBox: '0 0 100 80', width: size, height: size * 0.8, style: { position: 'absolute', overflow: 'visible' } },
  h('path', { d: 'M4,38 L96,4 L64,76 L46,48 Z', fill: LIME, stroke: INK, 'stroke-width': 5, 'stroke-linejoin': 'round' }),
  h('path', { d: 'M46,48 L96,4', stroke: INK, 'stroke-width': 4 }));

C.cursor = (label, color = PURPLE, txt = '#fff') => h('div', { style: { position: 'absolute', width: '0px', height: '0px' } },
  h('svg', { viewBox: '0 0 24 30', width: 38, height: 48, style: { position: 'absolute', left: '-4px', top: '-3px', overflow: 'visible' } },
    h('path', { d: 'M2,2 L2,25 L8,19 L12.5,28 L16.5,26 L12,17.5 L20,17.5 Z', fill: INK, stroke: '#fff', 'stroke-width': 2, 'stroke-linejoin': 'round' })),
  label ? h('div', { style: { position: 'absolute', left: '28px', top: '34px', background: color, color: txt, font: '700 17px DM', padding: '4px 11px 5px', borderRadius: '10px', border: `2px solid ${INK}`, whiteSpace: 'nowrap' } }, label) : null);

C.key = sym => h('div', { class: 'key' }, sym);

C.toggle = () => { const knob = h('div', { class: 'knob' }); const el = h('div', { class: 'tog' }, knob); el.knob = knob;
  el.update = k => { set(knob, { transform: `translateX(${(k * 46).toFixed(1)}px)` }); set(el, { background: k > 0.5 ? LIME : '#2a2925' }); };
  return el; };

// simple glyph icons (iMessage bubble, terminal, browser) drawn as app tiles
C.tile = (kind, size = 120) => {
  const ink = INK;
  const glyph = {
    imsg: [h('rect', { x: 0, y: 0, width: 100, height: 100, rx: 24, fill: '#3DD15A', stroke: ink, 'stroke-width': 5 }),
      h('path', { d: 'M50,24 C30,24 18,35 18,48 C18,56 23,63 31,67 L28,78 L41,71 C44,72 47,72 50,72 C70,72 82,61 82,48 C82,35 70,24 50,24 Z', fill: '#fff' })],
    term: [h('rect', { x: 0, y: 0, width: 100, height: 100, rx: 24, fill: '#2B2925', stroke: ink, 'stroke-width': 5 }),
      h('path', { d: 'M26,36 L42,50 L26,64', fill: 'none', stroke: LIME, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      h('path', { d: 'M48,66 L72,66', stroke: '#F1EFEB', 'stroke-width': 7, 'stroke-linecap': 'round' })],
  }[kind];
  return h('div', { style: { position: 'absolute', width: `${size}px`, height: `${size}px` } },
    h('svg', { viewBox: '-4 -4 108 108', width: size, height: size, style: { overflow: 'visible', filter: `drop-shadow(8px 9px 0 ${LIME})` } }, ...glyph));
};

// "Loopcast" wordmark: one span per letter so they can drop in; measure() returns its laid-out width
C.wordmark = (text = 'Loopcast', size = 230, color = '#F1EFEB') => {
  const el = h('div', { style: { position: 'absolute', font: `900 ${size}px Inter`, letterSpacing: '-.065em', color, whiteSpace: 'nowrap', lineHeight: '1' } });
  el.letters = [...text].map(ch => { const s = h('span', { style: { display: 'inline-block', transformOrigin: '50% 80%' } }, ch); el.append(s); return s; });
  el.update = (t, t0, step = 0.06) => el.letters.forEach((s, i) => {
    const a = t0 + i * step, k = L.spring(t, a, 2.8, 0.62), o = L.clamp((t - a) / 0.08);
    L.set(s, { transform: L.tf({ x: (1 - k) * 46, y: (1 - k) * 80, r: (1 - k) * 16, s: 1 + (1 - L.clamp(k, 0, 1)) * 0.3 }), opacity: o.toFixed(3) });
  });
  return el;
};

window.C = C;
})();
