// The caption, drawn over every scene from VO_WORDS, the way the reference reels do it: short phrase chunks (1-4 words)
// in the top band. A word appears when it is spoken; the word being spoken is bold white, the ones already said in the
// chunk turn grey, words not yet said are hidden (but keep their place, so nothing reflows). The line's *keyword*
// (asterisks in script.json) gets a Figma-style selection box the moment it is spoken. No box or scrim behind the text,
// just a soft shadow so it reads over the 3D render. A scene with `light: true` flips it to dark text.
(() => {
const { h, set, p, pop } = L;
const F = FILM, C = F.caption;
const words = window.VO_WORDS || [];
const MAX = C.chunk ?? 3;   // words per chunk (a multi-word keyword is never split)

// split one script line into chunks: break after punctuation, at MAX words, never inside a keyword run,
// and fold a lone trailing word into the chunk before it
function chunk(ws) {
  const out = []; let cur = [];
  ws.forEach((w, i) => {
    cur.push(w);
    const next = ws[i + 1];
    const inKey = w.k && next?.k;
    if (!next || (!inKey && (/[,.;:!?]$/.test(w.w) || cur.length >= MAX))) { out.push(cur); cur = []; }
  });
  if (out.length > 1 && out[out.length - 1].length === 1 && !out[out.length - 1][0].k && out[out.length - 2].length < MAX + 1) {
    out[out.length - 2].push(...out.pop());
  }
  return out;
}

scene({
  name: 'caption', t0: 0, t1: 1e9, z: 1000, overlay: true,
  build(root) {
    const S = this;
    S.chunks = [];
    const all = [];
    for (let k = 0; k < NLINES; k++) all.push(...chunk(words.filter(w => w.line === k)));
    all.forEach((ws, ci) => {
      const el = h('div', { class: 'cap', style: { top: C.top + 'px', left: (F.w - C.width) / 2 + 'px', width: C.width + 'px', fontSize: C.size + 'px' } });
      const items = [];
      let key = null;  // consecutive keyword words share one box
      ws.forEach((w, i) => {
        const em = C.emoji?.[w.w.toLowerCase().replace(/[^a-z0-9']/g, '')];
        const sp = h('span', { class: 'cw' }, (em ? em + ' ' : '') + w.w.replace(/[,;:]$/, ''));
        if (w.k) {
          if (!key) { key = { el: h('span', { class: 'key' }), box: h('span', { class: 'box' }, h('i'), h('i'), h('i'), h('i')), at: w.s }; key.el.append(key.box); el.append(key.el); }
          else key.el.insertBefore(document.createTextNode(' '), key.box);
          key.el.insertBefore(sp, key.box);
        } else {
          if (key) { items.push({ box: key }); key = null; }
          el.append(sp);
        }
        el.append(' ');
        items.push({ sp, s: w.s, e: ws[i + 1] ? ws[i + 1].s : w.e + 0.2 });
      });
      if (key) items.push({ box: key });
      root.append(el);
      let size = C.size;  // one line only: shrink a long chunk until it fits
      while (el.getBoundingClientRect().height > size * 1.2 + 4 && size > C.min) { size -= 2; el.style.fontSize = size + 'px'; }
      S.chunks.push({ el, items, s: ws[0].s, e: ws[ws.length - 1].e });
    });
    // a chunk stays up until the next one starts, but not through a long pause (> 0.9 s after its last word)
    S.chunks.forEach((c, i) => { const n = S.chunks[i + 1]; c.until = n ? Math.min(n.s - 0.04, c.e + 0.9) : 1e9; });
  },
  update(t) {
    const S = this;
    const light = !!window.CUR?.light;
    S.chunks.forEach(c => {
      const on = t >= c.s - 0.04 && t < c.until;
      L.show(c.el, on);
      if (!on) return;
      c.el.classList.toggle('light', light);
      const a = p(t, c.s - 0.04, 0.1);
      set(c.el, { transform: `translateY(${((1 - a) * 10).toFixed(1)}px)` });
      for (const it of c.items) {
        if (it.box) {
          const lit = t >= it.box.at - 0.02;
          set(it.box.box, { opacity: lit ? '1' : '0', transform: `scale(${(0.86 + 0.14 * pop(t, it.box.at - 0.02, 3.4, 0.5)).toFixed(4)})` });
          it.box.el.classList.toggle('lit', lit);
          continue;
        }
        const said = t >= it.s, now = said && t < it.e;
        it.sp.classList.toggle('on', now);
        set(it.sp, { opacity: said ? '1' : '0' });
      }
    });
  },
});
})();
