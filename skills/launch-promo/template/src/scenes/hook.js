// HOOK (0 – 5.4 s): the pain, made visible. Headline rises on the VO, a tilted phone shows the post blowing up,
// the unanswered replies pile up as stickers + a pill flood, a stamp lands, the room goes dark and the phone drops.
(() => {
const { h, set, tf, p, spring, pop, lerp, clamp, ease, inv, show, txt, rise, noise1 } = L;
const { INK, PURPLE } = C.theme;

scene({
  name: 'hook', t0: 0, t1: 5.45, hud: '01 — THE PROBLEM',
  build(root) {
    const S = this;
    S.paper = h('div', { class: 'full bg-paper' });
    S.g1 = h('div', { class: 'glow', style: { left: '-260px', top: '-240px', width: '900px', height: '760px' } });
    S.g2 = h('div', { class: 'glow', style: { left: '1380px', top: '640px', width: '900px', height: '700px' } });
    S.night = h('div', { class: 'full', style: { background: 'radial-gradient(ellipse 62% 70% at 50% 46%, #433E55 0%, #2A2733 45%, #161618 100%)' } });
    root.append(S.paper, S.g1, S.g2, S.night);

    // ---- the pile of unanswered replies ----
    S.layer = h('div', { class: 'full', style: { transformOrigin: '42% 50%' } });
    root.append(S.layer);
    const pills = [['SK', 'pricing??', 120, 180], ['MR', 'Zapier too?', 820, 160], ['JD', 'free tier?', 840, 300], ['AL', 'API docs?', 90, 520],
      ['TW', 'is this AI?', 640, 640], ['PN', 'how fast?', 300, 860], ['EV', 'refunds?', 900, 820], ['RB', 'EU hosting?', 1010, 990],
      ['SK', 'does it do DMs', 560, 960], ['MR', 'waitlist?', 960, 560], ['JD', 'hello??', 1700, 180], ['AL', 'mobile app?', 1710, 760]];
    const avc = { SK: '#CFE3F7', MR: '#C9B8F5', JD: '#F5D565', AL: '#FFC9B8', TW: '#BFF0C9', PN: '#F7D0E6', EV: '#FCE7A8', RB: '#C3EEF0' };
    S.pills = pills.map(([a, tx, x, y], i) => { const el = C.pill(a, tx, avc[a]); set(el, { left: `${x}px`, top: `${y}px` }); S.layer.append(el);
      return { el, at: 3.55 + i * 0.035, r: (L.hash(i * 3.7) - 0.5) * 12 }; });
    S.A = C.sticker('@sam.builds', 'Works with Slack?', 'SK', '#CFE3F7');
    S.B = C.sticker('@mia.k', 'Is there a free tier? 🙏', 'MR', PURPLE);
    S.Cc = C.sticker('@jon', 'Pricing??', 'JD', '#F5D565');
    S.layer.append(S.A, S.B, S.Cc);
    S.cnt = h('div', { class: 'abs', style: { left: '72px', top: '905px' } },
      h('div', { style: { font: '700 19px Mono', letterSpacing: '.16em', color: '#55534E' } }, 'UNANSWERED'),
      S.cntN = h('div', { style: { font: '900 88px Inter', letterSpacing: '-.05em', lineHeight: '1' } }, '3'));
    S.layer.append(S.cnt);

    // ---- headline: one word per VO word ----
    S.hl1 = rise([[['Your', { at: W('Your') + 0.05 }], ['launch', { at: W('launch') + 0.03 }], ['post', { at: W('post') + 0.03 }], ['got', { at: W('got') + 0.03 }]]]);
    S.hl2 = rise([[['1,000', { at: W('thousand') + 0.03 }], ['replies.', { at: W('replies') + 0.02, cls: 'purple-t' }]]]);
    set(S.hl1, { left: '152px', top: '326px', fontSize: '92px' });
    set(S.hl2, { left: '148px', top: '420px', fontSize: '158px' });
    root.append(S.hl1, S.hl2);

    // ---- phone: a launch post whose reply count runs away ----
    S.ph = C.phone({ badge: true });
    set(S.ph, { left: '1245px', top: '96px' });
    const post = h('div', { class: 'full', style: { background: '#F0EEEA' } },
      h('div', { style: { position: 'absolute', left: '26px', top: '86px', display: 'flex', gap: '14px', alignItems: 'center' } },
        h('div', { style: { width: '56px', height: '56px', borderRadius: '50%', background: 'var(--lime)', border: `3px solid ${INK}`, font: '900 26px Inter', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, FILM.brand[0]),
        h('div', {}, h('div', { style: { font: '700 22px DM' } }, FILM.brand), h('div', { style: { font: '400 16px Mono', color: '#6F6D67' } }, '@' + FILM.brand.toLowerCase() + ' · 2h'))),
      h('div', { style: { position: 'absolute', left: '26px', right: '26px', top: '170px', font: '500 25px DM', lineHeight: '1.3' } }, 'We just launched 🚀 ' + FILM.brand + ' is live. Tell us what you think!'),
      h('div', { style: { position: 'absolute', left: '26px', right: '26px', top: '268px', height: '330px', borderRadius: '22px', border: `3px solid ${INK}`,
        background: 'linear-gradient(150deg, var(--lime) 0%, #B7F08A 45%, var(--purple) 100%)' } }),
      h('div', { style: { position: 'absolute', left: '26px', right: '26px', top: '622px', display: 'flex', justifyContent: 'space-between', font: '700 21px Mono' } },
        h('span', {}, '💬 ', S.nRep = h('span', {}, '12')), h('span', {}, '♥ ', S.nLike = h('span', {}, '40')), h('span', {}, '↻ ', S.nRt = h('span', {}, '6'))),
      S.stamp = h('div', { style: { position: 'absolute', left: '64px', top: '700px', border: '5px solid var(--red)', color: 'var(--red)', borderRadius: '12px', padding: '6px 18px',
        font: '700 30px Mono', letterSpacing: '.14em', whiteSpace: 'nowrap', background: 'rgba(240,238,234,.9)' } }, '✕ 0 ANSWERED'));
    S.ph.screen.append(post);
    root.append(S.ph);

    sfx(0.02, 'whoosh', 0.9);
    for (const k of ['Your', 'launch', 'post', 'got']) sfx(W(k) + 0.05, 'tick', 0.35);
    sfx(W('thousand'), 'pop', 0.6); sfx(W('replies') + 0.02, 'pop', 0.8);
    for (const k of ['And', "nobody's", 'answering']) sfx(W(k) + 0.1, 'swoosh', 0.6);
    S.pills.forEach((q, i) => i % 2 === 0 && sfx(q.at + 0.02, 'blip', 0.35));
    sfx(W('them') + 0.12, 'stamp', 1.0);
    sfx(4.95, 'whoosh_down', 0.8); sfx(5.1, 'fall', 0.7);
  },

  update(t) {
    const S = this;
    const night = p(t, 4.95, 0.22, ease.inOutCubic);
    set(S.night, { opacity: night.toFixed(3) });
    const gd = noise1(t * 0.35) * 30;
    set(S.g1, { transform: tf({ x: gd, y: -gd * 0.6 }) }); set(S.g2, { transform: tf({ x: -gd, y: gd * 0.5 }) });
    this.dark = night > 0.5;

    // headline leaves as the replies arrive
    S.hl1.update(t, W('And') - 0.1); S.hl2.update(t, W('And') - 0.1);

    // stickers fly to their spots with a spring; pills pop with overshoot; the whole layer pushes in slowly
    const stk = (el, at, x0, y0, x1, y1, r0, r1) => {
      const k = spring(t, at, 2.6, 0.62), s = pop(t, at, 3.4, 0.5);
      set(el, { left: `${lerp(x0, x1, k).toFixed(1)}px`, top: `${lerp(y0, y1, k).toFixed(1)}px`, transform: tf({ r: lerp(r0, r1, k), s: lerp(0.35, 1, clamp(s, 0, 1.3)) }), opacity: String(clamp((t - at) / 0.06)) });
      show(el, t >= at);
    };
    stk(S.A, W('And') + 0.1, 760, 420, 138, 140, -14, -4);
    stk(S.B, W("nobody's") + 0.1, 150, 470, 470, 372, 10, 3);
    stk(S.Cc, W('answering') + 0.1, 700, 760, 236, 650, -8, -2);
    for (const q of S.pills) { const s = pop(t, q.at, 3.6, 0.45); set(q.el, { transform: tf({ r: q.r, s: clamp(s, 0, 1.25) }), opacity: String(clamp((t - q.at) / 0.05)) }); show(q.el, t >= q.at); }
    const ca = 3.4; show(S.cnt, t >= ca);
    set(S.cnt, { opacity: String(clamp((t - ca) / 0.1)), transform: tf({ y: (1 - p(t, ca, 0.25)) * 30 }) });
    txt(S.cntN, L.fmt(3 + 1021 * Math.pow(inv(ca, 4.4, t), 1.6)));
    const dim = night;
    set(S.layer, { transform: tf({ s: 1 + 0.03 * p(t, 2.8, 2.4, ease.lin) + 0.12 * dim }),
                   filter: dim > 0.001 ? `invert(${(0.78 * dim).toFixed(3)}) brightness(${lerp(1, 0.56, dim).toFixed(3)}) blur(${(2.2 * dim).toFixed(2)}px)` : 'none' });
    show(S.layer, t > W('And'));

    // phone: springs in tilted, floats, drops out of frame at the end
    const fly = spring(t, 0, 2.1, 0.68), fl = noise1(t * 0.6 + 4), drop = p(t, 5.1, 0.28, ease.inCubic);
    set(S.ph, { transform: `translate(${(lerp(520, 0, fly) + fl * 6).toFixed(1)}px, ${(lerp(700, 0, fly) + fl * 8 + drop * 1100).toFixed(1)}px) ` +
      `perspective(2400px) rotateY(-14deg) rotateX(4deg) rotate(${(lerp(-28, -5, fly) + fl * 1.2 + drop * 24).toFixed(2)}deg)` });
    const k = inv(0.4, 4.4, t);
    txt(S.nRep, L.fmt(12 + 1012 * Math.pow(k, 1.4))); txt(S.nLike, L.fmt(40 + 3160 * k)); txt(S.nRt, L.fmt(6 + 480 * k));
    const ba = 1.2, n = Math.floor(1 + 98 * Math.pow(inv(ba, 3.6, t), 1.5));
    txt(S.ph.badge, n >= 99 ? '99+' : String(n)); show(S.ph.badge, t >= ba);
    set(S.ph.badge, { transform: tf({ s: clamp(pop(t, ba, 3.5, 0.45), 0, 1.3) }) });
    const sa = W('them') + 0.12, sk = p(t, sa, 0.16, ease.outCubic);
    show(S.stamp, t >= sa); set(S.stamp, { transform: tf({ r: -9, s: lerp(2.2, 1, sk) }), opacity: sk.toFixed(3) });
  },
});
})();
