// BRAND REVEAL (≈ 5.25 – 8.95 s): the mascot drops into the dark and squashes, an accent + brand-colour ring wipe
// floods the frame, the wordmark letters drop in on the brand word, the tagline rises with a toggle that flips on
// "autopilot", the mascot spins, and the next scene takes over. Every time here hangs off a VO word, so re-timing
// the voiceover re-times the scene.
(() => {
const { h, set, tf, p, spring, pop, lerp, clamp, ease, show, rise, noise1 } = L;
const { INK } = C.theme;
const T0 = W('Meet') - 0.2;   // scene clock: the mascot starts falling just before "Meet"

scene({
  name: 'brand', t0: T0 - 0.05, t1: 9.0, hud: '02 — MEET ' + FILM.brand.toUpperCase(), grain: 0.24,
  build(root) {
    const S = this;
    S.paper = h('div', { class: 'full bg-paper' });
    S.veil = h('div', { class: 'full', style: { background: '#161618' } });
    root.append(S.paper, S.veil);
    S.lime = h('div', { class: 'full', style: { background: 'var(--lime)' } });
    S.purple = h('div', { class: 'full bg-purple' });
    S.rings = h('svg', { viewBox: '0 0 1920 1080', width: 1920, height: 1080, style: { position: 'absolute', left: 0, top: 0 } });
    S.ringEls = [1, 2, 3, 4, 5, 6].map(i => { const c = h('circle', { cx: 960, cy: 540, r: i * 175, fill: 'none', stroke: 'rgba(255,255,255,.16)', 'stroke-width': 2.5 }); S.rings.append(c); return c; });
    S.purple.append(S.rings);
    S.white = h('div', { style: { position: 'absolute', borderRadius: '50%', border: '30px solid #F4F3EF' } });
    root.append(S.lime, S.purple, S.white);

    // lockup: mascot + wordmark, centred (measured once; fonts are loaded before build)
    S.word = C.wordmark(FILM.brand, 236, '#F1EFEB');
    root.append(S.word);
    const ww = S.word.getBoundingClientRect().width;
    S.msz = 370;
    S.lx = Math.round((1920 - (S.msz - 6 + ww)) / 2); S.ly = 168;
    set(S.word, { left: `${S.lx + S.msz - 6}px`, top: `${S.ly + 86}px` });
    S.m = C.mascot({ size: S.msz });
    root.append(S.m);

    // tagline: "Your replies, on [toggle] autopilot."
    S.tag1 = rise([[['Your', { at: W('your', 0, T0) + 0.03 }], ['replies,', { at: W('replies', 0, T0) + 0.03 }], ['on', { at: W('on', 0, T0) + 0.03 }]]]);
    S.tag2 = rise([[['autopilot.', { at: W('autopilot') + 0.06, cls: 'lime-t' }]]]);
    set(S.tag1, { top: '590px', fontSize: '84px', color: '#F1EFEB' }); set(S.tag2, { top: '690px', fontSize: '84px' });
    S.tog = C.toggle(); set(S.tog, { position: 'absolute', top: '708px' });
    root.append(S.tag1, S.tag2, S.tog);
    const w1 = S.tag1.getBoundingClientRect().width, w2 = S.tag2.getBoundingClientRect().width, row = 112 + 22 + w2;
    set(S.tag1, { left: `${Math.round(960 - w1 / 2)}px` });
    set(S.tog, { left: `${Math.round(960 - row / 2)}px` }); set(S.tag2, { left: `${Math.round(960 - row / 2 + 134)}px` });

    S.k = { land: T0 + 0.16, ring: T0 + 0.34, togIn: W('on', 0, T0) - 0.1, togOn: W('autopilot') + 0.25, spin: W('autopilot') + 0.4 };
    sfx(T0, 'fall', 0.8); sfx(S.k.land, 'land', 1.0); sfx(S.k.ring, 'whoosh', 1.0);
    S.word.letters.forEach((_, i) => sfx(W(FILM.brand) + i * 0.055, 'tick', 0.4));
    sfx(W(FILM.brand) - 0.02, 'impact', 0.45);
    sfx(S.k.togIn, 'pop', 0.5); sfx(S.k.togOn, 'toggle', 0.9); sfx(S.k.spin, 'swoosh', 0.7);
  },

  update(t) {
    const S = this, K = S.k;
    set(S.veil, { opacity: lerp(1, 0.28, p(t, T0 + 0.02, 0.14, ease.inOutCubic)).toFixed(3) });
    // ring wipe: accent disc, then the brand colour right behind it, with a white rim that fades
    const cx = 960, cy = 540;
    const rl = 2400 * ease.inCubic(clamp((t - K.ring) / 0.3)), rp = 2400 * ease.inCubic(clamp((t - K.ring - 0.05) / 0.3));
    set(S.lime, { clipPath: `circle(${rl.toFixed(1)}px at ${cx}px ${cy}px)` });
    set(S.purple, { clipPath: `circle(${rp.toFixed(1)}px at ${cx}px ${cy}px)` });
    const rw = Math.max(0, rp * 0.5 - 30), wo = 1 - p(t, K.ring + 0.2, 0.25);
    set(S.white, { left: `${cx - rw}px`, top: `${cy - rw}px`, width: `${rw * 2}px`, height: `${rw * 2}px`, opacity: (rp > 1 ? wo : 0).toFixed(3) });
    S.ringEls.forEach((c, i) => c.setAttribute('r', ((i + 1) * 175 + ((t * 40) % 175)).toFixed(1)));
    show(S.lime, t > K.ring); show(S.purple, t > K.ring + 0.05);

    // mascot: fall (stretch), land (squash + ring-out), spring up into the lockup, blink, spin on the tagline
    const sz = S.msz, fall = ease.inQuad(clamp((t - T0) / (K.land - T0)));
    let x = cx - sz / 2, y = lerp(-sz - 80, cy - sz / 2, fall);
    const toLogo = spring(t, K.ring + 0.06, 2.0, 0.7);
    x = lerp(x, S.lx, toLogo); y = lerp(y, S.ly, toLogo);
    const imp = t >= K.land ? Math.exp(-(t - K.land) * 9) * Math.cos((t - K.land) * 34) : 0;
    let sx = 1 + 0.38 * imp, sy = 1 - 0.38 * imp;
    if (t < K.land) { sx = 1 - 0.12 * fall; sy = 1 + 0.16 * fall; }
    const spin = ease.inOutCubic(clamp((t - K.spin) / 0.42)), hop = Math.sin(Math.PI * spin) * 40;
    set(S.m, { left: `${x.toFixed(1)}px`, top: `${(y - hop).toFixed(1)}px`, transform: tf({ r: spin * 360 + noise1(t * 1.3) * 2 }) });
    const blink = Math.max(0, 1 - Math.abs(t - (K.ring + 0.6)) / 0.06);
    S.m.update({ sx, sy, blink, open: t > K.land ? 1 : 0.2, arms: clamp((t - K.land) / 0.08), armUp: imp * 0.8 + Math.sin(t * 6) * 0.06, lookX: 8 * p(t, K.ring + 0.2, 0.2) });

    S.word.update(t, W(FILM.brand) + 0.02, 0.055); show(S.word, t > W(FILM.brand) - 0.05);
    S.tag1.update(t); S.tag2.update(t);
    show(S.tog, t > K.togIn); set(S.tog, { transform: tf({ s: clamp(pop(t, K.togIn, 3.4, 0.5), 0, 1.3) }) });
    S.tog.update(ease.outBack(clamp((t - K.togOn) / 0.18)));
    this.dark = t > K.ring + 0.15;
  },
});
})();
