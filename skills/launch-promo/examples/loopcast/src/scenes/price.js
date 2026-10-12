// 48.25 – 50.75 s: purple circle wipe out of the CLI mascot, loop ring draws round the mascot, "$0.27 a run.", FREE TO FORK sticker
(() => {
const { h, set, tf, p, spring, pop, lerp, clamp, ease, show, rise, noise1 } = L;
const INK = '#1F1D19', LIME = '#D1FD4E';

scene({
  name: 'price', t0: 48.25, t1: 50.76, hud: '08 — THE COST', grain: 0.24,
  build(root) {
    const S = this;
    S.bg = h('div', { class: 'full bg-purple' });
    S.bigWord = h('div', { style: { position: 'absolute', left: '700px', top: '640px', font: '900 330px Inter', letterSpacing: '-.07em', color: 'rgba(31,29,25,.10)', transform: 'rotate(-12deg)', whiteSpace: 'nowrap' } }, 'FORK');
    root.append(S.bg);
    // ring: ticks + lime arc that draws round, then becomes a loop arrow
    const R = 270, cx = 560, cy = 560;
    S.cx = cx; S.cy = cy; S.R = R;
    S.svg = h('svg', { viewBox: '0 0 1920 1080', width: 1920, height: 1080, style: { position: 'absolute', left: 0, top: 0, overflow: 'visible' } });
    S.ticks = h('g', {});
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2, long = i % 5 === 0, r0 = R + 26, r1 = R + (long ? 52 : 40);
      S.ticks.append(h('line', { x1: cx + r0 * Math.cos(a), y1: cy + r0 * Math.sin(a), x2: cx + r1 * Math.cos(a), y2: cy + r1 * Math.sin(a), stroke: 'rgba(241,239,235,.55)', 'stroke-width': long ? 4 : 2.5, 'stroke-linecap': 'round' }));
    }
    S.arc = h('circle', { cx, cy, r: R, fill: 'none', stroke: LIME, 'stroke-width': 24, 'stroke-linecap': 'round', transform: `rotate(-90 ${cx} ${cy})`, 'stroke-dasharray': `0 ${2 * Math.PI * R}` });
    S.arcShadow = h('circle', { cx: cx + 6, cy: cy + 8, r: R, fill: 'none', stroke: INK, 'stroke-width': 24, 'stroke-linecap': 'round', transform: `rotate(-90 ${cx + 6} ${cy + 8})`, 'stroke-dasharray': `0 ${2 * Math.PI * R}`, opacity: 0.35 });
    S.head = h('g', {}, h('circle', { r: 26, fill: '#F4F3EF', stroke: INK, 'stroke-width': 7 }));
    S.arrow = h('path', { d: 'M0,-34 L30,0 L0,34 Z', fill: LIME, stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' });
    S.svg.append(S.ticks, S.arcShadow, S.arc, S.arrow, S.head);
    root.append(S.svg);
    S.msz = 430;
    S.m = C.mascot({ size: S.msz });
    root.append(S.m);
    // copy
    S.big = rise([[['$0.27', { at: W('Twenty-seven') + 0.08 }]]]);
    set(S.big, { left: '960px', top: '176px', fontSize: '300px', color: '#F1EFEB' });
    S.run = rise([[['a', { at: W('a', 0, 48.8) + 0.02, cls: 'lime-t' }], ['run.', { at: W('run', 0, 48.8) + 0.02, cls: 'lime-t' }]]]);
    set(S.run, { left: '972px', top: '462px', fontSize: '150px' });
    S.note = h('div', { style: { position: 'absolute', left: '980px', top: '646px', font: '700 22px Mono', letterSpacing: '.18em', color: 'rgba(241,239,235,.72)' } }, 'TINYFISH SPEND · ONE FULL RUN');
    root.append(S.big, S.run, S.note);
    // sticker
    S.stk = h('div', { style: { position: 'absolute', left: '1010px', top: '742px', width: '700px', height: '276px', background: LIME, border: `6px solid ${INK}`, borderRadius: '34px', boxShadow: `14px 16px 0 ${INK}`, transformOrigin: '50% 50%' } },
      h('div', { style: { position: 'absolute', left: '62px', top: '20px', font: '900 172px Inter', letterSpacing: '-.075em', color: INK } }, 'FREE'),
      h('div', { style: { position: 'absolute', left: '66px', top: '196px', font: '700 31px Mono', letterSpacing: '.16em', color: INK } }, 'TO FORK · ONE COMMAND'));
    root.append(S.stk);
    sfx(48.27, 'wipe', 1.0); sfx(48.6, 'riser', 0.5, { dur: 0.8 });
    sfx(W('Twenty-seven') + 0.08, 'pop', 0.6); sfx(W('run', 0, 48.8), 'pop', 0.5);
    sfx(49.42, 'ding', 0.6);
    sfx(W('Free') - 0.02, 'impact', 1.0);
    sfx(50.35, 'whoosh', 0.8);
  },

  update(t) {
    const S = this;
    const ox = 161 + 174 / 2, oy = 551 + 174 / 2; // centre of the CLI mascot we grow out of
    const r = 2500 * ease.inCubic(clamp((t - 48.28) / 0.3));
    set(S.root, { clipPath: `circle(${r.toFixed(1)}px at ${ox}px ${oy}px)` });

    // mascot grows out of the CLI box into the ring centre, then jumps up out of frame at the end
    const k = spring(t, 48.3, 1.9, 0.72);
    const box0 = { x: 161, y: 551, s: 174 }, box1 = { x: S.cx - S.msz / 2, y: S.cy - S.msz / 2 + 8, s: S.msz };
    const sc = lerp(box0.s, box1.s, k) / S.msz;
    const jump = ease.inCubic(clamp((t - 50.35) / 0.3));
    const x = lerp(box0.x, box1.x, k), y = lerp(box0.y, box1.y, k) - jump * 900 + Math.sin(t * 3) * 4;
    set(S.m, { left: `${x.toFixed(1)}px`, top: `${y.toFixed(1)}px`, transform: tf({ s: sc, r: noise1(t * 1.5) * 3 }), transformOrigin: '0 0' });
    const squint = Math.max(0, 1 - Math.abs(t - 49.95) / 0.08) * 0.8;
    S.m.update({ blink: squint, open: t > 49.3 ? 1 : 0.2, armUp: 0.2 * Math.sin(t * 5) + (t > W('Free') ? 0.6 * Math.exp(-(t - W('Free')) * 4) : 0), sx: 1 + jump * -0.1, sy: 1 + jump * 0.2 });

    // ring draws round (knob travels), then the head turns into a loop arrowhead
    const C2 = 2 * Math.PI * S.R;
    const d = ease.inOutCubic(clamp((t - 48.62) / 0.8)) * 0.94;
    S.arc.setAttribute('stroke-dasharray', `${(d * C2).toFixed(1)} ${C2}`);
    S.arcShadow.setAttribute('stroke-dasharray', `${(d * C2).toFixed(1)} ${C2}`);
    const ang = -Math.PI / 2 + d * Math.PI * 2 + (t > 49.42 ? (t - 49.42) * 0.9 : 0);
    const hx = S.cx + S.R * Math.cos(ang), hy = S.cy + S.R * Math.sin(ang);
    const spinAll = t > 49.42 ? (t - 49.42) * 0.9 * 180 / Math.PI : 0;
    set(S.svg, { transform: `rotate(${spinAll.toFixed(2)}deg)`, transformOrigin: `${S.cx}px ${S.cy}px` });
    const hk = clamp((t - 48.62) / 0.1);
    S.head.setAttribute('transform', `translate(${(S.cx + S.R * Math.cos(-Math.PI / 2 + d * Math.PI * 2)).toFixed(1)},${(S.cy + S.R * Math.sin(-Math.PI / 2 + d * Math.PI * 2)).toFixed(1)}) scale(${(hk * (1 - p(t, 49.4, 0.12))).toFixed(3)})`);
    const ak = clamp(pop(t, 49.42, 3.6, 0.45), 0, 1.3);
    const ea = -Math.PI / 2 + d * Math.PI * 2;
    S.arrow.setAttribute('transform', `translate(${(S.cx + S.R * Math.cos(ea)).toFixed(1)},${(S.cy + S.R * Math.sin(ea)).toFixed(1)}) rotate(${(ea * 180 / Math.PI + 90).toFixed(1)}) scale(${ak.toFixed(3)})`);
    set(S.ticks, { opacity: String(p(t, 48.55, 0.3)) });

    // copy
    S.big.update(t); S.run.update(t);
    show(S.note, t > 49.25); set(S.note, { opacity: String(p(t, 49.25, 0.25)) });
    // sticker slams in from the lower right
    const sa = W('Free') - 0.04;
    const sk = ease.outCubic(clamp((t - sa) / 0.16));
    const settle = spring(t, sa + 0.12, 3.2, 0.45);
    show(S.stk, t >= sa);
    set(S.stk, { transform: tf({ x: (1 - sk) * 700, y: (1 - sk) * 420, r: lerp(-34, -11, sk) + (1 - clamp(settle, 0, 1.2)) * 3, s: lerp(1.9, 1, sk) }),
                 filter: sk < 1 ? `blur(${((1 - sk) * 10).toFixed(1)}px)` : 'none' });
    this.dark = true;
  },
});
})();
