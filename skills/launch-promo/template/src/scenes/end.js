// END CARD (≈ 15.25 – 20 s): curved wipe in, mascot drops into the lockup, wordmark letters drop on the brand word,
// tagline rises with an accent highlight sweeping under the payoff, the mascot morphs into the app icon on the
// final music hit, then the CTA row pops and a cursor clicks the button.
(() => {
const { h, set, tf, p, pop, lerp, clamp, ease, show, rise, type, noise1 } = L;
const { INK, LIME } = C.theme;
const T0 = 15.25;
const BRAND_AT = W(FILM.brand, 0, T0);   // the 2nd "Orbit" in the VO (first one after T0)
const CTA = { label: 'Start free', url: FILM.brand.toLowerCase() + '.example', chip: 'WEB · SLACK · API', hit: 18.4, click: 19.25 };

scene({
  name: 'end', t0: T0, t1: FILM.dur + 0.01, hud: '04 — ' + FILM.brand.toUpperCase(),
  build(root) {
    const S = this;
    S.paper = h('div', { class: 'full bg-paper' });
    S.g1 = h('div', { class: 'glow', style: { left: '-280px', top: '-220px', width: '940px', height: '780px' } });
    S.g2 = h('div', { class: 'glow', style: { left: '1360px', top: '600px', width: '940px', height: '760px' } });
    root.append(S.paper, S.g1, S.g2);
    S.word = C.wordmark(FILM.brand, 236, INK);
    root.append(S.word);
    const ww = S.word.getBoundingClientRect().width;
    S.msz = 370; S.lx = Math.round((1920 - (S.msz - 6 + ww)) / 2); S.ly = 196;
    set(S.word, { left: `${S.lx + S.msz - 6}px`, top: `${S.ly + 86}px` });
    S.m = C.mascot({ size: S.msz });
    S.icon = C.mascot({ size: S.msz, arms: false, face: false, iconMode: true });
    root.append(S.m, S.icon);
    // tagline "Every reply, answered." with an accent box under the payoff word
    S.hi = h('div', { style: { position: 'absolute', height: '88px', background: LIME, borderRadius: '10px', transformOrigin: '0 50%' } });
    root.append(S.hi);
    S.tag = rise([[['Every', { at: W('Every', 0, T0) + 0.03 }], ['reply,', { at: W('reply', 0, T0) + 0.03 }], ['answered.', { at: W('answered') + 0.03, cls: 'end-pay' }]]]);
    set(S.tag, { top: '652px', fontSize: '96px', color: INK });
    root.append(S.tag);
    set(S.tag, { left: `${Math.round(960 - S.tag.getBoundingClientRect().width / 2)}px` });
    const pay = S.tag.querySelector('.end-pay').parentElement.getBoundingClientRect();
    set(S.hi, { left: `${pay.left - 14}px`, top: `${pay.top + 18}px`, width: `${pay.width + 10}px` });
    // CTA row: button · url (typed) · platform chip, centred as a row
    S.btn = h('div', { style: { position: 'absolute', height: '104px', padding: '0 46px', borderRadius: '60px', background: LIME, border: `5px solid ${INK}`, boxShadow: `9px 11px 0 ${INK}`,
      display: 'flex', alignItems: 'center', gap: '18px', font: '880 46px Inter', letterSpacing: '-.04em', whiteSpace: 'nowrap', color: INK } }, CTA.label, h('span', { style: { fontWeight: 700 } }, '→'));
    S.url = h('div', { style: { position: 'absolute', font: '700 38px Mono', color: INK, whiteSpace: 'nowrap' } }, CTA.url);
    S.plat = h('div', { style: { position: 'absolute', height: '62px', padding: '0 24px', border: `4px solid ${INK}`, borderRadius: '14px', display: 'flex', alignItems: 'center',
      font: '700 25px Mono', letterSpacing: '.16em', color: INK, whiteSpace: 'nowrap' } }, CTA.chip);
    root.append(S.btn, S.url, S.plat);
    const bw = S.btn.getBoundingClientRect().width, uw = S.url.getBoundingClientRect().width, pw = S.plat.getBoundingClientRect().width;
    const gap = 42, rx = Math.round(960 - (bw + gap + uw + gap + pw) / 2);
    S.bx = rx; S.by = 846;
    set(S.btn, { left: `${rx}px`, top: '846px' }); set(S.url, { left: `${rx + bw + gap}px`, top: '874px' }); set(S.plat, { left: `${rx + bw + gap + uw + gap}px`, top: '867px' });
    S.url.textContent = '';
    S.ripple = h('div', { style: { position: 'absolute', borderRadius: '50%', border: `4px solid ${INK}` } });
    S.cur = C.cursor(null);
    root.append(S.ripple, S.cur);

    S.ctaAt = W('Start') ; S.land = BRAND_AT - 0.04;
    sfx(T0, 'wipe', 0.9); sfx(S.land, 'land', 0.7);
    S.word.letters.forEach((_, i) => sfx(BRAND_AT + i * 0.055, 'tick', 0.4));
    sfx(W('answered') + 0.3, 'swoosh', 0.5);
    sfx(S.ctaAt, 'pop', 0.8); sfx(S.ctaAt + 0.12, 'type', 0.4, { dur: 0.5 }); sfx(S.ctaAt + 0.3, 'pop', 0.5);
    sfx(CTA.hit, 'impact', 1.0); sfx(CTA.click, 'click', 1.0);
  },

  update(t) {
    const S = this;
    // curved wipe: a huge circle whose centre sits off-screen right
    const R = lerp(1350, 3300, ease.inOutCubic(clamp((t - T0) / 0.3)));
    set(S.root, { clipPath: `circle(${R.toFixed(1)}px at 3280px 540px)` });
    const gd = noise1(t * 0.35) * 26;
    set(S.g1, { transform: tf({ x: gd, y: -gd * 0.6 }) }); set(S.g2, { transform: tf({ x: -gd, y: gd * 0.5 }) });

    const fall = ease.inQuad(clamp((t - (T0 + 0.05)) / (S.land - T0 - 0.05)));
    const imp = t >= S.land ? Math.exp(-(t - S.land) * 8) * Math.cos((t - S.land) * 30) : 0;
    const morph = ease.inOutCubic(clamp((t - CTA.hit) / 0.22)), pulse = 1 + 0.12 * Math.sin(Math.PI * clamp((t - CTA.hit) / 0.3));
    const y = lerp(-S.msz - 60, S.ly, fall);
    set(S.m, { left: `${S.lx}px`, top: `${y.toFixed(1)}px`, transform: tf({ s: pulse, r: noise1(t * 1.4) * 2 * (1 - morph) }), opacity: (1 - morph).toFixed(3) });
    S.m.update({ sx: 1 + 0.32 * imp, sy: 1 - 0.32 * imp, open: t > S.land ? 1 : 0.2, blink: Math.max(0, 1 - Math.abs(t - (S.land + 1.6)) / 0.06),
                 lookX: 6 * p(t, S.land + 0.5, 0.2), lookY: 8 * p(t, S.land + 0.5, 0.2), armUp: imp * 0.6 + 0.05 * Math.sin(t * 5) });
    show(S.icon, morph > 0);
    set(S.icon, { left: `${S.lx}px`, top: `${S.ly}px`, opacity: morph.toFixed(3), transform: tf({ s: pulse }) });

    S.word.update(t, BRAND_AT, 0.055); show(S.word, t > BRAND_AT - 0.05);
    S.tag.update(t);
    const hk = ease.outCubic(clamp((t - (W('answered') + 0.28)) / 0.32));
    set(S.hi, { transform: `scaleX(${hk.toFixed(3)})`, opacity: hk > 0 ? '1' : '0' });

    const a = S.ctaAt, dn = t >= CTA.click && t < CTA.click + 0.22 ? (t < CTA.click + 0.06 ? (t - CTA.click) / 0.06 : 1 - (t - CTA.click - 0.06) / 0.16) : 0;
    show(S.btn, t >= a);
    set(S.btn, { transform: tf({ s: clamp(pop(t, a, 3.4, 0.5), 0, 1.25), x: dn * 6, y: dn * 8 }), boxShadow: `${9 - dn * 6}px ${11 - dn * 8}px 0 ${INK}` });
    type(S.url, CTA.url, t, a + 0.12, 34);
    show(S.plat, t >= a + 0.3); set(S.plat, { transform: tf({ s: clamp(pop(t, a + 0.3, 3.4, 0.5), 0, 1.25) }) });
    const ck = ease.inOutCubic(clamp((t - (CTA.click - 0.57)) / 0.55)), tx = S.bx + 240, ty = S.by + 62;
    show(S.cur, t > CTA.click - 0.57);
    set(S.cur, { left: `${lerp(1500, tx, ck).toFixed(1)}px`, top: `${lerp(1140, ty, ck).toFixed(1)}px`, transform: tf({ s: 1.3 - dn * 0.15 }) });
    const rk = clamp((t - CTA.click) / 0.45), rr = 20 + rk * 90;
    show(S.ripple, rk > 0 && rk < 1);
    set(S.ripple, { left: `${tx - rr}px`, top: `${ty - rr}px`, width: `${rr * 2}px`, height: `${rr * 2}px`, opacity: (1 - rk).toFixed(3) });
    this.dark = false;
  },
});
})();
