// Reel building blocks. Every one has update(t, ...) and is pure in t.
//   R.track(t, keys)            camera / any numbers along keyframes [[t, {x, y, s}], ...]
//   R.cam(el, t, keys)          apply a track as a transform to a stage div (travel inside one hero stage)
//   R.count(el, t, keys, fmt)   a number that lives on an object and changes on cue: [[t, 100], [t2, 76]]
//   R.label(text, x, y, dx, dy) small caps label + leader line from a dot at (x, y); .at(x, y) moves it
//   R.note(lines)               honesty footnote / source credit, bottom-left above IG's UI
//   R.legend([[color, name]])   colour key when the reel uses 2+ signal colours
//   R.shareSheet(names)         the ending: IG share sheet, a friend gets picked, Send is tapped
(() => {
const { h, set, p, pop, lerp, ease, clamp, txt } = L;
const F = FILM;
const R = {};

R.track = (t, keys, e = ease.inOutCubic) => {
  if (t <= keys[0][0]) return { ...keys[0][1] };
  for (let i = 1; i < keys.length; i++) {
    const [t1, b] = keys[i], [t0, a] = keys[i - 1];
    if (t < t1) {
      const k = e(clamp((t - t0) / Math.max(1e-6, t1 - t0)));
      const o = {};
      for (const key in b) o[key] = lerp(a[key] ?? b[key], b[key], k);
      return o;
    }
  }
  return { ...keys[keys.length - 1][1] };
};

// keys: [[t, {x, y, s, r}]] where (x, y) is the stage point to centre on screen and s the zoom
R.cam = (el, t, keys, cx = F.w / 2, cy = F.h * 0.56) => {
  const c = R.track(t, keys);
  const s = c.s ?? 1;
  set(el, { transformOrigin: '0 0', transform: `translate(${(cx - c.x * s).toFixed(2)}px,${(cy - c.y * s).toFixed(2)}px) scale(${s.toFixed(4)}) rotate(${(c.r || 0).toFixed(3)}deg)` });
  return c;
};

R.count = (el, t, keys, fmt = v => L.fmt(v)) => {
  const v = R.track(t, keys.map(([tt, val]) => [tt, { v: val }]), ease.outCubic).v;
  txt(el, fmt(v));
  return v;
};

R.label = (text, x, y, dx = 150, dy = -90, cls = '') => {
  const el = h('div', { class: 'lbl ' + cls });
  const line = h('line', { x1: x, y1: y, x2: x, y2: y });
  const dot = h('circle', { cx: x, cy: y, r: 6 });
  const svg = h('svg', { width: 1, height: 1 }, line, dot);
  const gap = 14 * Math.sign(dx || 1);
  const tx = h('div', { class: 'lbl-t', style: { transform: `translate(${dx < 0 ? '-100%' : '0'}, -50%)` } }, text);
  el.append(svg, tx);
  // el.at(x, y): move the anchor (for labels riding on a moving part); call before update
  el.at = (nx, ny) => { x = nx; y = ny; };
  el.update = (t, at, out = 1e9) => {
    const k = p(t, at, 0.32, ease.outCubic), o = 1 - p(t, out, 0.2);
    line.setAttribute('x1', x.toFixed(1)); line.setAttribute('y1', y.toFixed(1));
    line.setAttribute('x2', (x + dx * k).toFixed(1)); line.setAttribute('y2', (y + dy * k).toFixed(1));
    dot.setAttribute('cx', x.toFixed(1)); dot.setAttribute('cy', y.toFixed(1));
    set(tx, { left: `${(x + dx + gap).toFixed(1)}px`, top: `${(y + dy).toFixed(1)}px`, opacity: p(t, at + 0.18, 0.2).toFixed(3) });
    set(el, { opacity: (t >= at ? o : 0).toFixed(3) });
  };
  return el;
};

R.note = (lines, cls = '') => {
  const el = h('div', { class: 'note ' + cls, style: { bottom: `${F.safe.bottom + 30}px` } }, ...[].concat(lines).map(s => h('div', {}, s)));
  el.update = (t, at, out = 1e9) => set(el, { opacity: Math.min(p(t, at, 0.25), 1 - p(t, out, 0.2)).toFixed(3) });
  return el;
};

R.legend = (items, cls = '') => {
  const el = h('div', { class: 'legend ' + cls, style: { bottom: `${F.safe.bottom + 110}px` } },
    ...items.map(([c, name]) => h('span', {}, h('b', { style: { background: c, boxShadow: `0 0 14px ${c}` } }), name)));
  el.update = (t, at, out = 1e9) => set(el, { opacity: Math.min(p(t, at, 0.25), 1 - p(t, out, 0.2)).toFixed(3) });
  return el;
};

const AV = ['#f7c59f', '#b8e0d2', '#d6c3f7', '#ffd166', '#a0c4ff', '#ffadad', '#caffbf', '#fdffb6'];
R.shareSheet = (names = ['Maya', 'Leo', 'Sam', 'Priya', 'Jonah', 'Ana', 'Theo', 'Kim']) => {
  const el = h('div', { class: 'full' });
  const dim = h('div', { class: 'full', style: { background: 'rgba(0,0,0,.3)' } });
  const sheet = h('div', { class: 'sheet' }, h('div', { class: 'grab' }), h('div', { class: 'search' }, 'Search'));
  const grid = h('div', { class: 'grid' });
  const whos = names.slice(0, 8).map((n, i) => {
    const tick = h('div', { class: 'tick' }, '✓');
    const av = h('div', { class: 'av', style: { background: AV[i % AV.length] } }, n[0], tick);
    const who = h('div', { class: 'who' }, av, h('div', {}, n));
    grid.append(who);
    return { who, av, tick };
  });
  const send = h('div', { class: 'send' }, 'Send');
  const tap = h('div', { class: 'tap' });
  sheet.append(grid, send);
  el.append(dim, sheet, tap);
  // at: sheet rises; pick: the friend (index who) gets tapped; go: Send is tapped
  el.update = (t, at, who = 1, pick = at + 0.9, go = at + 1.8) => {
    const k = pop(t, at, 2.2, 0.82);
    set(dim, { opacity: p(t, at, 0.3).toFixed(3) });
    set(sheet, { transform: `translateY(${((1 - k) * 1500).toFixed(1)}px)` });
    whos.forEach((w, i) => {
      const on = i === who && t >= pick;
      set(w.tick, { opacity: on ? '1' : '0', transform: `scale(${on ? pop(t, pick, 3.5, 0.45).toFixed(3) : 0})` });
      set(w.av, { transform: `scale(${i === who ? (1 - 0.08 * Math.sin(Math.PI * clamp((t - pick) / 0.16))).toFixed(4) : 1})` });
    });
    set(send, { opacity: t >= pick ? '1' : '0.35', transform: `scale(${(1 - 0.05 * Math.sin(Math.PI * clamp((t - go) / 0.16))).toFixed(4)})` });
    txt(send, t >= go + 0.18 ? 'Sent ✓' : 'Send');
    // the touch ring: on the friend, then on Send (numbers mirror .sheet in style.css: top 840, grid 170, rows 196, send 560)
    const ty = 840 + (1 - k) * 1500;
    const col = who % 4, row = Math.floor(who / 4);
    const onSend = t >= go - 0.25;
    const tgt = onSend ? [F.w / 2, ty + 560 + 48] : [48 + (F.w - 96) / 8 * (2 * col + 1), ty + 170 + 62 + row * 196];
    const r = clamp((t - (onSend ? go : pick) + 0.12) / 0.45);
    set(tap, { left: `${tgt[0]}px`, top: `${tgt[1]}px`, opacity: (r > 0 && r < 1 ? 1 - r : 0).toFixed(3), transform: `scale(${(0.5 + r * 0.9).toFixed(3)})` });
  };
  return el;
};

window.R = R;
})();
