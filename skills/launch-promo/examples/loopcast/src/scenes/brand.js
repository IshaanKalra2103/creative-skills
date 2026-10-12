// 10.44 – 13.8 s: mascot drops in, ring wipe to purple, "Loopcast" wordmark, "Your content loop, on [toggle] autopilot."
(() => {
const { h, set, tf, p, spring, pop, lerp, clamp, ease, show, rise, noise1 } = L;

scene({
  name: 'brand', t0: 10.44, t1: 13.8, hud: '02 — MEET LOOPCAST', grain: 0.24,
  build(root) {
    const S = this;
    S.paper = h('div', { class: 'full bg-paper' });
    S.g1 = h('div', { class: 'glow', style: { left: '-300px', top: '-260px', width: '900px', height: '760px' } });
    S.g2 = h('div', { class: 'glow', style: { left: '1380px', top: '620px', width: '900px', height: '720px' } });
    S.veil = h('div', { class: 'full', style: { background: '#161618' } });
    root.append(S.paper, S.g1, S.g2, S.veil);
    // debris: the pings fall out of frame
    S.debris = [];
    for (let i = 0; i < 12; i++) {
      const el = h('div', { style: { position: 'absolute', width: `${60 + (i * 37) % 70}px`, height: '26px', borderRadius: '14px', background: '#F8F8F6', border: '3px solid #1F1D19', boxShadow: '3px 4px 0 #1F1D19' } });
      root.append(el);
      S.debris.push({ el, x: 520 + L.hash(i * 1.7) * 900, y0: 760 + L.hash(i * 2.3) * 160, at: 10.5 + L.hash(i * 5.1) * 0.12, vr: (L.hash(i) - 0.5) * 500 });
    }
    // ring wipe -> purple
    S.lime = h('div', { class: 'full', style: { background: '#D1FD4E' } });
    S.purple = h('div', { class: 'full bg-purple' });
    S.rings = h('svg', { viewBox: '0 0 1920 1080', width: 1920, height: 1080, style: { position: 'absolute', left: 0, top: 0 } });
    S.ringEls = [1, 2, 3, 4, 5, 6].map(i => { const c = h('circle', { cx: 960, cy: 540, r: i * 175, fill: 'none', stroke: 'rgba(255,255,255,.16)', 'stroke-width': 2.5 }); S.rings.append(c); return c; });
    S.purple.append(S.rings);
    S.white = h('div', { style: { position: 'absolute', borderRadius: '50%', border: '30px solid #F4F3EF' } });
    root.append(S.lime, S.purple, S.white);

    // logo lockup: mascot + wordmark, centred
    S.word = C.wordmark('Loopcast', 236, '#F1EFEB');
    root.append(S.word);
    const ww = S.word.getBoundingClientRect().width || 900; // layout is ready at build time (fonts loaded)
    S.msz = 370;
    const total = S.msz - 6 + ww;
    S.lx = Math.round((1920 - total) / 2);
    S.ly = 168;
    set(S.word, { left: `${S.lx + S.msz - 6}px`, top: `${S.ly + 86}px` });
    S.m = C.mascot({ size: S.msz });
    root.append(S.m);

    // tagline
    S.tag1 = rise([[['Your', { at: W('your', 0, 11) + 0.03 }], ['content', { at: W('content') + 0.03 }], ['loop,', { at: W('loop') + 0.03 }], ['on', { at: W('on', 0, 12) + 0.03 }]]]);
    set(S.tag1, { top: '590px', fontSize: '84px', color: '#F1EFEB' });
    S.tag2 = rise([[['autopilot.', { at: W('autopilot') + 0.06, cls: 'lime-t' }]]]);
    set(S.tag2, { top: '690px', fontSize: '84px' });
    S.tog = C.toggle();
    set(S.tog, { position: 'absolute', top: '708px' });
    root.append(S.tag1, S.tag2, S.tog);
    // centre the tagline lines (measure once)
    const w1 = S.tag1.getBoundingClientRect().width, w2 = S.tag2.getBoundingClientRect().width;
    set(S.tag1, { left: `${Math.round(960 - w1 / 2)}px` });
    const row = 112 + 22 + w2;
    set(S.tog, { left: `${Math.round(960 - row / 2)}px` });
    set(S.tag2, { left: `${Math.round(960 - row / 2 + 134)}px` });

    sfx(10.46, 'fall', 0.8); sfx(10.62, 'land', 1.0);
    sfx(10.8, 'whoosh', 1.0);
    S.word.letters.forEach((_, i) => sfx(W('Loopcast') + i * 0.06, 'tick', 0.4));
    sfx(W('Loopcast') - 0.02, 'impact', 0.45);
    sfx(12.32, 'pop', 0.5); sfx(12.8, 'toggle', 0.9);
    sfx(12.95, 'swoosh', 0.7);
    sfx(13.5, 'wipe', 0.9);
  },

  update(t) {
    const S = this;
    // background: dark -> dimmed paper (mascot lands) -> purple ring wipe
    set(S.veil, { opacity: lerp(1, 0.28, p(t, 10.48, 0.14, ease.inOutCubic)).toFixed(3) });
    const gd = noise1(t * 0.4) * 24;
    set(S.g1, { transform: tf({ x: gd, y: -gd }) }); set(S.g2, { transform: tf({ x: -gd, y: gd }) });

    const cx = 960, cy = 540;
    const rl = 2400 * ease.inCubic(clamp((t - 10.8) / 0.3));
    const rp = 2400 * ease.inCubic(clamp((t - 10.85) / 0.3));
    set(S.lime, { clipPath: `circle(${rl.toFixed(1)}px at ${cx}px ${cy}px)` });
    set(S.purple, { clipPath: `circle(${rp.toFixed(1)}px at ${cx}px ${cy}px)` });
    const rw = Math.max(0, rp * 0.5 - 30), wo = 1 - p(t, 11.0, 0.25);
    set(S.white, { left: `${cx - rw}px`, top: `${cy - rw}px`, width: `${rw * 2}px`, height: `${rw * 2}px`, opacity: (rp > 1 ? wo : 0).toFixed(3) });
    S.ringEls.forEach((c, i) => c.setAttribute('r', ((i + 1) * 175 + ((t * 40) % 175)).toFixed(1)));
    show(S.lime, t > 10.8); show(S.purple, t > 10.85);

    // debris falling out of frame
    for (const d of S.debris) {
      const a = t - d.at;
      show(d.el, a > 0 && a < 0.7);
      if (a > 0) set(d.el, { left: `${d.x + a * 60}px`, top: `${d.y0 + a * a * 1900}px`, transform: tf({ r: d.vr * a }) });
    }

    // mascot: drop, squash, rise to the lockup, blink, spin, exit left
    const sz = S.msz, land = 10.62;
    const fall = ease.inQuad(clamp((t - 10.46) / (land - 10.46)));
    const mx0 = cx - sz / 2, my0 = cy - sz / 2;
    let x = mx0, y = lerp(-sz - 80, my0, fall);
    const toLogo = spring(t, 10.86, 2.0, 0.7);
    x = lerp(x, S.lx, toLogo); y = lerp(y, S.ly, toLogo);
    const imp = t >= land ? Math.exp(-(t - land) * 9) * Math.cos((t - land) * 34) : 0;
    let sx = 1 + 0.38 * imp, sy = 1 - 0.38 * imp;
    if (t < land) { sx = 1 - 0.12 * fall; sy = 1 + 0.16 * fall; }
    const spin = ease.inOutCubic(clamp((t - 12.95) / 0.42));
    const hop = Math.sin(Math.PI * spin) * 40;
    const exitX = -300 * ease.inOutCubic(clamp((t - 13.52) / 0.22));
    set(S.m, { left: `${(x + exitX).toFixed(1)}px`, top: `${(y - hop).toFixed(1)}px`, transform: tf({ r: spin * 360 + noise1(t * 1.3) * 2 }) });
    const blink = Math.max(Math.max(0, 1 - Math.abs(t - 11.38) / 0.06), Math.max(0, 1 - Math.abs(t - 13.52) / 0.06));
    S.m.update({ sx, sy, blink, open: t > land ? 1 : 0.2, arms: clamp((t - land) / 0.08), armUp: imp * 0.8 + Math.sin(t * 6) * 0.06, lookX: t > 11.0 ? 8 * p(t, 11.0, 0.2) : 0 });

    // wordmark + tagline
    S.word.update(t, W('Loopcast') + 0.02, 0.055);
    show(S.word, t > W('Loopcast') - 0.05);
    S.tag1.update(t); S.tag2.update(t);
    const tk = pop(t, 12.32, 3.4, 0.5);
    show(S.tog, t > 12.32);
    set(S.tog, { transform: tf({ s: clamp(tk, 0, 1.3) }) });
    S.tog.update(ease.outBack(clamp((t - 12.8) / 0.18)));
    for (const el of [S.word, S.tag1, S.tag2]) set(el, { translate: `${exitX.toFixed(1)}px 0` });
    set(S.tog, { translate: `${exitX.toFixed(1)}px 0` });
    this.dark = t > 10.95;
  },
});
})();
