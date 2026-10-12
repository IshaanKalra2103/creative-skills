// 50.45 – 57.5 s: curved light wipe, Loopcast lockup, "Every trend, turned into a reel.", mascot -> app icon, CTA click
(() => {
const { h, set, tf, p, spring, pop, lerp, clamp, ease, show, rise, type, noise1 } = L;
const INK = '#1F1D19', LIME = '#D1FD4E';

scene({
  name: 'end', t0: 50.45, t1: 57.51, hud: '09 — LOOPCAST',
  build(root) {
    const S = this;
    S.paper = h('div', { class: 'full bg-paper' });
    S.g1 = h('div', { class: 'glow', style: { left: '-280px', top: '-220px', width: '940px', height: '780px' } });
    S.g2 = h('div', { class: 'glow', style: { left: '1360px', top: '600px', width: '940px', height: '760px' } });
    root.append(S.paper, S.g1, S.g2);
    // lockup
    S.word = C.wordmark('Loopcast', 236, INK);
    root.append(S.word);
    const ww = S.word.getBoundingClientRect().width || 900;
    S.msz = 370;
    S.lx = Math.round((1920 - (S.msz - 6 + ww)) / 2); S.ly = 196;
    set(S.word, { left: `${S.lx + S.msz - 6}px`, top: `${S.ly + 86}px` });
    S.m = C.mascot({ size: S.msz });
    S.icon = C.mascot({ size: S.msz, arms: false, face: false, iconMode: true });
    root.append(S.m, S.icon);
    // tagline with a lime highlight under "a reel."
    S.hi = h('div', { style: { position: 'absolute', height: '88px', background: LIME, borderRadius: '10px', transformOrigin: '0 50%' } });
    root.append(S.hi);
    S.tag = rise([[['Every', { at: W('Every', 0, 51) + 0.03 }], ['trend,', { at: W('trend', 0, 51) + 0.03 }], ['turned', { at: W('turned') + 0.03 }], ['into', { at: W('into', 0, 52) + 0.03 }],
                   ['a', { at: W('a', 0, 52.3) + 0.03, cls: 'end-a' }], ['reel.', { at: W('reel', 0, 52) + 0.03, cls: 'end-reel' }]]]);
    set(S.tag, { top: '652px', fontSize: '96px', color: INK });
    root.append(S.tag);
    const tw = S.tag.getBoundingClientRect().width;
    set(S.tag, { left: `${Math.round(960 - tw / 2)}px` });
    // highlight box from "a" to the end
    const a = S.tag.querySelector('.end-a').parentElement.getBoundingClientRect(), r = S.tag.querySelector('.end-reel').parentElement.getBoundingClientRect();
    set(S.hi, { left: `${a.left - 14}px`, top: `${a.top + 18}px`, width: `${r.right - a.left + 18}px` });
    // CTA row
    S.btn = h('div', { style: { position: 'absolute', height: '104px', padding: '0 46px', borderRadius: '60px', background: LIME, border: `5px solid ${INK}`, boxShadow: `9px 11px 0 ${INK}`,
      display: 'flex', alignItems: 'center', gap: '18px', font: '880 46px Inter', letterSpacing: '-.04em', whiteSpace: 'nowrap', color: INK } }, 'Fork it free', h('span', { style: { fontWeight: 700 } }, '→'));
    S.url = h('div', { style: { position: 'absolute', font: '700 38px Mono', letterSpacing: '.02em', color: INK, whiteSpace: 'nowrap' } });
    S.plat = h('div', { style: { position: 'absolute', height: '62px', padding: '0 24px', border: `4px solid ${INK}`, borderRadius: '14px', display: 'flex', alignItems: 'center',
      font: '700 25px Mono', letterSpacing: '.16em', color: INK, whiteSpace: 'nowrap' } }, 'iMESSAGE · CLI · WEB');
    root.append(S.btn, S.url, S.plat);
    S.url.textContent = 'built on tinyfish.ai';
    const bw = S.btn.getBoundingClientRect().width, uw = S.url.getBoundingClientRect().width, pw = S.plat.getBoundingClientRect().width;
    const gap = 42, rowW = bw + gap + uw + gap + pw, rx = Math.round(960 - rowW / 2);
    S.bx = rx; S.by = 846;
    set(S.btn, { left: `${rx}px`, top: '846px' });
    set(S.url, { left: `${rx + bw + gap}px`, top: '874px' });
    set(S.plat, { left: `${rx + bw + gap + uw + gap}px`, top: '867px' });
    S.url.textContent = '';
    S.ripple = h('div', { style: { position: 'absolute', borderRadius: '50%', border: `4px solid ${INK}` } });
    S.cur = C.cursor(null);
    root.append(S.ripple, S.cur);

    sfx(50.45, 'wipe', 0.9);
    S.word.letters.forEach((_, i) => sfx(W('Loopcast', 0, 50) + i * 0.055, 'tick', 0.4));
    sfx(W('Loopcast', 0, 50) - 0.04, 'land', 0.7);
    sfx(W('reel', 0, 52) + 0.3, 'swoosh', 0.5);
    sfx(54.55, 'impact', 1.0);
    sfx(55.0, 'pop', 0.8); sfx(55.12, 'type', 0.4, { dur: 0.6 }); sfx(55.3, 'pop', 0.5);
    sfx(56.32, 'click', 1.0);
  },

  update(t) {
    const S = this;
    // curved wipe in from the right (a huge circle centred off-screen)
    const R = lerp(1350, 3300, ease.inOutCubic(clamp((t - 50.45) / 0.3)));
    set(S.root, { clipPath: `circle(${R.toFixed(1)}px at 3280px 540px)` });
    const gd = noise1(t * 0.35) * 26;
    set(S.g1, { transform: tf({ x: gd, y: -gd * 0.6 }) }); set(S.g2, { transform: tf({ x: -gd, y: gd * 0.5 }) });

    // mascot drops in from above (it just jumped out of the ring) and lands in the lockup
    const land = W('Loopcast', 0, 50) - 0.04;
    const fall = ease.inQuad(clamp((t - 50.5) / (land - 50.5)));
    const imp = t >= land ? Math.exp(-(t - land) * 8) * Math.cos((t - land) * 30) : 0;
    const morph = ease.inOutCubic(clamp((t - 54.5) / 0.22));
    const pulse = 1 + 0.12 * Math.sin(Math.PI * clamp((t - 54.5) / 0.3));
    const x = S.lx, y = lerp(-S.msz - 60, S.ly, fall);
    set(S.m, { left: `${x}px`, top: `${y.toFixed(1)}px`, transform: tf({ s: pulse, r: noise1(t * 1.4) * 2 * (1 - morph) }), opacity: (1 - morph).toFixed(3) });
    S.m.update({ sx: 1 + 0.32 * imp, sy: 1 - 0.32 * imp, open: t > land ? 1 : 0.2, blink: Math.max(0, 1 - Math.abs(t - 53.7) / 0.06),
                 lookX: t > 51.3 ? 6 : 0, lookY: t > 51.3 ? 8 : 0, armUp: imp * 0.6 + 0.05 * Math.sin(t * 5) });
    show(S.icon, morph > 0);
    set(S.icon, { left: `${x}px`, top: `${S.ly}px`, opacity: morph.toFixed(3), transform: tf({ s: pulse }) });

    S.word.update(t, W('Loopcast', 0, 50) + 0.0, 0.055);
    show(S.word, t > W('Loopcast', 0, 50) - 0.05);
    S.tag.update(t);
    const hk = ease.outCubic(clamp((t - (W('reel', 0, 52) + 0.28)) / 0.32));
    set(S.hi, { transform: `scaleX(${hk.toFixed(3)})`, opacity: hk > 0 ? '1' : '0' });

    // CTA row
    const bk = pop(t, 55.0, 3.4, 0.5);
    const click = 56.32, dn = t >= click && t < click + 0.22 ? (t < click + 0.06 ? (t - click) / 0.06 : 1 - (t - click - 0.06) / 0.16) : 0;
    show(S.btn, t >= 55.0);
    set(S.btn, { transform: tf({ s: clamp(bk, 0, 1.25), x: dn * 6, y: dn * 8 }), boxShadow: `${9 - dn * 6}px ${11 - dn * 8}px 0 ${INK}` });
    type(S.url, 'built on tinyfish.ai', t, 55.12, 34);
    const pk = pop(t, 55.3, 3.4, 0.5);
    show(S.plat, t >= 55.3); set(S.plat, { transform: tf({ s: clamp(pk, 0, 1.25) }) });
    // cursor glides in and clicks the button
    const ck = ease.inOutCubic(clamp((t - 55.75) / 0.55));
    const tx = S.bx + 300, ty = S.by + 62;
    show(S.cur, t > 55.75);
    set(S.cur, { left: `${lerp(1500, tx, ck).toFixed(1)}px`, top: `${lerp(1140, ty, ck).toFixed(1)}px`, transform: tf({ s: 1.3 - dn * 0.15 }) });
    const rk = clamp((t - click) / 0.45);
    show(S.ripple, rk > 0 && rk < 1);
    const rr = 20 + rk * 90;
    set(S.ripple, { left: `${tx - rr}px`, top: `${ty - rr}px`, width: `${rr * 2}px`, height: `${rr * 2}px`, opacity: (1 - rk).toFixed(3) });
    this.dark = false;
  },
});
})();
