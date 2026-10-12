// 34.15 – 37.98 s: lime "SCANS 046 POSTS" beat. Source names cycle like the reference's languages, then the Reddit thread -> hook.
(() => {
const { h, set, tf, p, spring, pop, lerp, clamp, ease, show, txt, noise1 } = L;

const CSS = `
.sc-scan .lbl { position: absolute; left: 820px; top: 214px; display: flex; align-items: baseline; gap: 18px; white-space: nowrap; color: #1F1D19; }
.sc-scan .lbl .m { font: 700 26px Mono; letter-spacing: .2em; }
.sc-scan .lbl .n { font: 900 84px Inter; letter-spacing: -.06em; line-height: 1; }
.sc-scan .mask { position: absolute; left: 812px; top: 318px; width: 1100px; height: 214px; overflow: hidden; }
.sc-scan .word { position: absolute; left: 4px; top: 6px; font: 900 168px Inter; letter-spacing: -.065em; line-height: 1.08; white-space: nowrap; color: #1F1D19; }
.sc-scan .rule { position: absolute; left: 820px; top: 560px; height: 7px; border-radius: 4px; background: #1F1D19; transform-origin: 0 50%; }
.sc-scan .q { position: absolute; left: 818px; top: 314px; background: #F8F8F6; border: 4px solid #1F1D19; border-radius: 20px; box-shadow: 9px 11px 0 #1F1D19;
  padding: 18px 30px 22px; white-space: nowrap; transform-origin: 20% 50%; }
.sc-scan .q .src { font: 700 18px Mono; letter-spacing: .14em; color: #55534E; margin-bottom: 6px; }
.sc-scan .q .tx { font: 820 40px Inter; letter-spacing: -.035em; line-height: 1.12; color: #1F1D19; }
.sc-scan .pb { position: absolute; left: 852px; top: 516px; background: #5B2FE0; border: 4px solid #1F1D19; border-radius: 20px; box-shadow: 9px 11px 0 #1F1D19;
  padding: 18px 30px 20px; white-space: nowrap; color: #fff; font: 820 40px Inter; letter-spacing: -.035em; transform-origin: 80% 50%; }
.sc-scan .pb .k { font: 700 22px Mono; letter-spacing: .12em; opacity: .8; margin-right: 10px; vertical-align: 4px; }
.sc-scan .chip { position: absolute; left: 820px; top: 664px; background: #1F1D19; color: #D1FD4E; border-radius: 9px; padding: 12px 22px;
  font: 700 24px Mono; letter-spacing: .14em; white-space: nowrap; }
`;

scene({
  name: 'scan', t0: 34.15, t1: 37.98, z: 40, hud: '05 — EVERY PLATFORM',
  build(root) {
    const S = this;
    root.classList.add('sc-scan');
    document.head.append(h('style', { text: CSS }));
    root.append(h('div', { class: 'full bg-lime' }));

    S.lbl = h('div', { class: 'lbl' }, h('span', { class: 'm' }, 'SCANS'), S.n = h('span', { class: 'n' }, '001'), h('span', { class: 'm' }, 'POSTS'));
    S.mask = h('div', { class: 'mask' });
    // real sources from runs/tinyfish-demo-1/evidence.json (46 posts: 8 threads + 10 news + 20 TikTok/Reels + 8 Shorts)
    const list = [['TikTok', 34.24], ['Reels', 34.36], ['Shorts', 34.47], ['YouTube', 34.58], ['TechCrunch', W('TechCrunch') - 0.01],
                  ['Substack', 34.93], ['r/AI_Agents', 35.05], ['this week.', 35.2]];
    S.words = list.map(([w, at]) => { const el = h('div', { class: 'word' }, w); S.mask.append(el); return { el, at }; });
    S.rule = h('div', { class: 'rule', style: { width: '980px' } });
    S.q = h('div', { class: 'q' }, h('div', { class: 'src' }, 'r/TimeManagement · this week'),
      h('div', { class: 'tx' }, 'Is AI actually saving you time—'), h('div', { class: 'tx' }, 'or just adding another tab? ⏳'));
    S.pb = h('div', { class: 'pb' }, h('span', { class: 'k' }, 'HOOK →'), '“Still tab-hopping to compare prices?”');
    S.chip = h('div', { class: 'chip' }, '✓ READ · REDDIT · PAIN POINT → HOOK');
    S.m = C.mascot({ size: 435 });
    set(S.m, { left: '224px', top: '379px' });
    root.append(S.lbl, S.mask, S.rule, S.q, S.pb, S.chip, S.m);

    const yes = W('yes', 0, 36);
    S.T = { wipe: 34.18, land: 34.84, out: yes - 0.02, q: yes + 0.08, pb: W('Reddit') + 0.02, chip: W('Reddit') + 0.3 };
    const T = S.T;
    sfx(T.wipe, 'wipe', 0.9);
    S.words.forEach(w => sfx(w.at, 'tick', 0.45));
    sfx(T.land, 'land', 0.7);
    sfx(T.out, 'whoosh', 0.5);
    sfx(T.q, 'pop', 0.8); sfx(T.pb - 0.04, 'swoosh', 0.7); sfx(T.pb + 0.08, 'pop', 0.7); sfx(T.chip, 'blip', 0.6);
  },

  update(t) {
    const S = this, T = S.T;
    this.dark = false;
    // diagonal lime wipe from the bottom-right: lime where x >= c + 0.5 y
    const wk = p(t, T.wipe, 0.2, ease.inOutCubic);
    const c = lerp(1930, -560, wk);
    set(this.root, { clipPath: wk >= 1 ? 'none' : `polygon(${c.toFixed(1)}px 0px, 2000px 0px, 2000px 1080px, ${(c + 540).toFixed(1)}px 1080px)` });

    // label + counter
    const lk = p(t, T.wipe + 0.06, 0.25);
    set(S.lbl, { opacity: lk.toFixed(3), transform: tf({ y: (1 - lk) * 20 }) });
    const ck = clamp((t - 34.24) / (35.2 - 34.24));
    const n = Math.round(1 + 45 * Math.pow(ck, 1.7));
    txt(S.n, String(n).padStart(3, '0'));

    // words scroll through the mask
    const out = p(t, T.out, 0.14, ease.inCubic);
    S.words.forEach((w, i) => {
      const nx = S.words[i + 1];
      // old and new word roll together (same curve) so they never overlap
      const inK = i === 0 ? p(t, w.at, 0.09, ease.outCubic) : p(t, w.at, 0.09, ease.inOutCubic);
      const exK = nx ? p(t, nx.at, 0.09, ease.inOutCubic) : out;
      const vis = t >= w.at && exK < 1;
      show(w.el, vis);
      if (vis) set(w.el, { transform: `translateY(${((1 - inK) * 105 - exK * 105).toFixed(2)}%)` });
    });
    // progress rule grows with the counter, leaves with the word
    const rk = Math.pow(ck, 1.7);
    show(S.rule, t >= 34.24 && out < 1);
    set(S.rule, { transform: `scaleX(${(0.04 + 0.96 * rk).toFixed(4)})`, opacity: (1 - out).toFixed(3) });

    // reddit thread -> hook -> chip
    const qk = clamp(pop(t, T.q, 3.2, 0.5), 0, 1.25);
    show(S.q, t >= T.q);
    set(S.q, { transform: tf({ r: -2, s: lerp(0.4, 1, qk), y: (1 - clamp(qk)) * 30 }), opacity: clamp((t - T.q) / 0.06).toFixed(3) });
    const pk = spring(t, T.pb, 2.8, 0.62);
    show(S.pb, t >= T.pb);
    set(S.pb, { transform: tf({ x: (1 - pk) * 620, r: lerp(9, 2, clamp(pk)) }), opacity: clamp((t - T.pb) / 0.06).toFixed(3) });
    const chk = p(t, T.chip, 0.22, ease.outCubic);
    show(S.chip, t >= T.chip);
    set(S.chip, { clipPath: `inset(0 ${((1 - chk) * 100).toFixed(1)}% 0 0)`, transform: tf({ x: (1 - chk) * -16 }) });

    // mascot: falls in from the top as the wipe lands, squashes, then "talks" through the cycle
    // drops in top-centre (above the label, like the reference), then dashes down-left into its box
    const drop = spring(t, T.wipe + 0.02, 2.6, 0.62);
    const fly = p(t, T.land - 0.27, 0.27, ease.inOutCubic);
    const arc = Math.sin(fly * Math.PI) * -70;
    const mx = lerp(965, 0, fly), my = lerp(lerp(-950, -443, drop), 0, fly) + arc;
    const land = t >= T.land ? Math.exp(-(t - T.land) * 9) * Math.cos((t - T.land) * 26) : 0;
    let talk = 0;
    for (const w of S.words) { const a = t - w.at; if (a >= 0 && a < 0.1 && t < 35.3) talk = Math.max(talk, Math.sin(a / 0.1 * Math.PI)); }
    const calm = 1 - p(t, 37.5, 0.15);   // settle exactly into the hand-off box by 37.70
    const pq = t >= T.q ? Math.exp(-(t - T.q) * 7) * Math.sin((t - T.q) * 30) * 0.5 : 0;
    const sx = 1 + land * 0.22 + talk * 0.07 + pq * 0.05, sy = 1 - land * 0.2 - talk * 0.07 - pq * 0.05;
    const blinks = [35.32, 36.05, 37.2];
    let b = 0; for (const bt of blinks) { const a = t - bt; if (a >= 0 && a < 0.14) b = Math.max(b, 1 - Math.abs(a - 0.07) / 0.07); }
    const lookR = t >= T.q ? 1 : t >= 34.3 ? 0.7 : 0;
    S.m.update({ blink: b, open: talk > 0.3 || (t > T.q && t < T.q + 0.3) || (t > T.pb && t < T.pb + 0.3) ? 1 : 0,
                 lookX: 12 * lookR, lookY: t >= T.q ? -6 : -2, sx, sy, armUp: (0.2 + 0.5 * Math.max(0, Math.sin(t * 4.2)) + talk * 0.3) * calm });
    show(S.m, t < 37.72);
    set(S.m, { transform: tf({ x: mx, y: my, s: lerp(0.68, 1, fly), r: (noise1(t * 1.3 + 7) * 4 + (1 - fly) * -8 * clamp(drop)) * calm }) });
  },
});
})();
