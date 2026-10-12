// FEATURES (≈ 8.8 – 15.6 s): dark panel rises over the brand scene, title rises on the VO, three cards stagger up,
// and each card lifts with an accent border + glow while its mini demo plays, on the VO word that names it.
// Inactive cards keep their finished demo, so the row reads as a finished checklist by the end.
(() => {
const { h, set, tf, p, spring, pop, lerp, clamp, ease, show, txt, type, rise, noise1 } = L;
const { INK, LIME } = C.theme;

scene({
  name: 'features', t0: 8.78, t1: 15.62, hud: '03 — HOW IT WORKS',
  build(root) {
    const S = this;
    S.bg = h('div', { class: 'full bg-dark' });
    root.append(S.bg);
    S.eye = h('div', { class: 'eyebrow', style: { left: '150px', top: '150px', color: LIME } });
    S.title = rise([[['Three', { at: W('reads') - 0.6 }], ['agents.', { at: W('reads') - 0.45 }], ['Zero', { at: W('reads') - 0.3, cls: 'lime-t' }], ['inbox.', { at: W('reads') - 0.15, cls: 'lime-t' }]]]);
    set(S.title, { left: '146px', top: '186px', fontSize: '112px', color: '#F1EFEB' });
    root.append(S.eye, S.title);

    const spec = [
      { n: '01', name: 'Read', sub: 'EVERY REPLY,<br>EVERY CHANNEL', icon: 'lime', on: W('reads'), off: W('drafts') },
      { n: '02', name: 'Draft', sub: 'IN YOUR VOICE,<br>WITH SOURCES', icon: 'purple', on: W('drafts'), off: W('waits') },
      { n: '03', name: 'Approve', sub: 'NOTHING SENDS<br>WITHOUT YOU', icon: 'outline', on: W('waits'), off: 15.3 },
    ];
    S.cards = spec.map((c, i) => {
      const el = h('div', { class: 'card', style: { left: `${150 + i * 548}px`, top: '400px', width: '510px', height: '560px', transformOrigin: '50% 100%' } });
      const ic = C.loopIcon(c.icon, 84); set(ic, { left: '32px', top: '34px' });
      el.append(ic, h('div', { class: 'num' }, `${c.n} / 03`), h('div', { class: 'ttl' }, c.name), h('div', { class: 'sub', html: c.sub }));
      const well = h('div', { class: 'well' }); el.append(well);
      root.append(el);
      return { ...c, el, well, rise: 9.15 + i * 0.12 };
    });

    // 01 Read: rows of real-looking replies tick in, then a count chip
    const rows = [['X', 'does it work with Slack?'], ['REDDIT', 'free tier for students?'], ['DISCORD', 'API docs link pls'], ['X', 'pricing??']];
    const R = S.cards[0];
    R.rows = rows.map(([tag, msg], i) => { const el = h('div', { style: { margin: '10px 16px 0', display: 'flex', gap: '10px', alignItems: 'center', font: '500 19px DM', color: '#E8E6E1', whiteSpace: 'nowrap' } },
      h('span', { style: { font: '700 13px Mono', letterSpacing: '.1em', color: INK, background: LIME, borderRadius: '6px', padding: '3px 7px', minWidth: '84px', textAlign: 'center', flex: 'none' } }, tag), msg);
      R.well.append(el); return { el, at: R.on + 0.15 + i * 0.16 }; });
    R.chip = h('div', { style: { position: 'absolute', left: '16px', bottom: '16px', font: '700 17px Mono', letterSpacing: '.12em', color: INK, background: LIME, borderRadius: '10px', padding: '8px 14px' } });
    R.well.append(R.chip);
    // 02 Draft: a reply types itself into an outlined bubble, then a sources chip
    const D = S.cards[1];
    D.bub = h('div', { style: { position: 'absolute', left: '16px', right: '16px', top: '16px', border: `2px solid ${LIME}`, borderRadius: '16px', padding: '14px 16px', font: '500 20px DM', lineHeight: '1.32', color: '#F1EFEB', minHeight: '128px' } });
    D.chip = h('div', { style: { position: 'absolute', left: '16px', bottom: '16px', font: '700 17px Mono', letterSpacing: '.12em', color: INK, background: LIME, borderRadius: '10px', padding: '8px 14px' } }, '✓ DRAFTED · 3 SOURCES');
    D.well.append(D.bub, D.chip);
    // 03 Approve: a toggle flips on "okay", a stamp lands, a big +count pops
    const A = S.cards[2];
    A.tog = C.toggle(); set(A.tog, { position: 'absolute', left: '22px', top: '24px' });
    A.lab = h('div', { style: { position: 'absolute', left: '154px', top: '30px', font: '700 22px DM', color: '#F1EFEB' } }, 'Send approved drafts');
    A.stamp = h('div', { style: { position: 'absolute', left: '26px', top: '118px', border: `4px solid ${LIME}`, color: LIME, borderRadius: '12px', padding: '6px 16px', font: '700 26px Mono', letterSpacing: '.14em' } }, 'SENT ✓');
    A.plus = h('div', { style: { position: 'absolute', right: '22px', bottom: '14px', font: '900 76px Inter', letterSpacing: '-.05em', color: LIME } });
    A.well.append(A.tog, A.lab, A.stamp, A.plus);

    sfx(8.8, 'wipe', 0.9);
    S.cards.forEach(c => { sfx(c.rise, 'swoosh', 0.5); sfx(c.on, 'pop', 0.6); });
    R.rows.forEach(r => sfx(r.at, 'blip', 0.4)); sfx(R.on + 0.9, 'blip', 0.5);
    sfx(D.on + 0.15, 'type', 0.5, { dur: 1.3 }); sfx(D.on + 1.6, 'blip', 0.5);
    sfx(W('okay'), 'toggle', 0.9); sfx(W('okay') + 0.35, 'stamp', 0.8); sfx(W('okay') + 0.7, 'ding', 0.6);
  },

  update(t) {
    const S = this;
    // dark panel rises from the bottom with rounded top corners that flatten as it lands
    const k = ease.inOutCubic(clamp((t - 8.8) / 0.24)), top = (1 - k) * 1080, rad = 60 * (1 - k);
    set(S.root, { clipPath: `inset(${top.toFixed(1)}px 0 0 0 round ${rad.toFixed(1)}px ${rad.toFixed(1)}px 0 0)` });
    type(S.eye, 'HOW IT WORKS →', t, 9.0, 30);
    S.title.update(t, 15.2, 0.2);
    const drift = noise1(t * 0.3) * 6;
    set(S.title, { translate: `${drift.toFixed(1)}px 0` });

    for (const c of S.cards) {
      const rk = spring(t, c.rise, 2.4, 0.7);
      const act = Math.min(p(t, c.on - 0.05, 0.22), 1 - p(t, c.off - 0.1, 0.25));
      const out = p(t, 15.2, 0.25, ease.inCubic);
      set(c.el, { transform: tf({ y: (1 - rk) * 700 - act * 34 + out * 60, s: 1 + act * 0.03 }), opacity: (clamp((t - c.rise) / 0.08) * (1 - out)).toFixed(3),
                  borderColor: act > 0.02 ? `color-mix(in srgb, var(--lime) ${Math.round(act * 100)}%, #3a3731)` : '#3a3731',
                  boxShadow: act > 0.02 ? `0 0 ${Math.round(60 * act)}px color-mix(in srgb, var(--lime) ${Math.round(act * 35)}%, transparent)` : 'none' });
    }
    const [R, D, A] = S.cards;
    for (const r of R.rows) { show(r.el, t >= r.at); set(r.el, { transform: tf({ x: (1 - p(t, r.at, 0.2)) * -24 }), opacity: String(p(t, r.at, 0.15)) }); }
    const ca = R.on + 0.9; show(R.chip, t >= ca); set(R.chip, { transform: tf({ s: clamp(pop(t, ca, 3.4, 0.5), 0, 1.25) }) });
    txt(R.chip, `✓ ${L.fmt(Math.min(1024, 4 + 1020 * clamp((t - ca) / 0.8)))} READ`);
    type(D.bub, 'Yes! Slack works today, and the free tier covers one workspace →', t, D.on + 0.15, 48, true);
    const dc = D.on + 1.6; show(D.chip, t >= dc); set(D.chip, { transform: tf({ s: clamp(pop(t, dc, 3.4, 0.5), 0, 1.25) }) });
    const ok = W('okay');
    A.tog.update(ease.outBack(clamp((t - ok) / 0.18)));
    const sk = p(t, ok + 0.35, 0.16); show(A.stamp, t >= ok + 0.35); set(A.stamp, { transform: tf({ r: -8, s: lerp(2.2, 1, sk) }), opacity: sk.toFixed(3) });
    show(A.plus, t >= ok + 0.7); set(A.plus, { transform: tf({ s: clamp(pop(t, ok + 0.7, 3.2, 0.45), 0, 1.3) }) });
    txt(A.plus, '+' + L.fmt(Math.min(1024, 1024 * clamp((t - ok - 0.7) / 0.6))));
    this.dark = true;
  },
});
})();
