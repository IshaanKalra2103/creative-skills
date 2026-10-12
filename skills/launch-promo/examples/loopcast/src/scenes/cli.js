// 41.05 – 48.62 s: "Or just run one command. Research, script, render, review, right from your terminal."
(() => {
const { h, set, tf, p, spring, pop, lerp, clamp, ease, show, txt, type, noise1, fmt } = L;
const INK = '#1F1D19', LIME = '#D1FD4E', PURPLE = '#5B2FE0';
const MA = { left: 46, top: 930, size: 100 };    // dash.js corner box (taken over at 41.05)
const MU = { left: 96, top: 392, size: 214 };    // lifted with the rising panel (reference 41.2)
const MB = { left: 161, top: 551, size: 174 };   // held through 48.62; price.js grows from here
const MS = 214;

const CSS = `
.sc-cli .eyebrow2 { position: absolute; left: 150px; top: 166px; font: 700 21px Mono; letter-spacing: .15em; color: ${LIME}; white-space: nowrap; }
.sc-cli .conn { position: absolute; height: 6px; background: ${LIME}; border-radius: 3px; transform-origin: 0 50%; }
.sc-cli .node { position: absolute; width: 14px; height: 14px; border-radius: 50%; background: #F1EFEB; border: 3px solid ${LIME}; margin: -7px 0 0 -7px; }
.sc-cli .tlabel { position: absolute; width: 200px; margin-left: -100px; text-align: center; font: 700 18px Mono; letter-spacing: .16em; color: #A9A69F; }
.sc-cli .chip { position: absolute; left: 150px; height: 58px; padding: 0 26px; border-radius: 30px; border: 3px solid #4A4740; background: #2A2824;
  color: #E9E7E2; font: 700 23px Mono; letter-spacing: .13em; display: flex; align-items: center; gap: 12px; white-space: nowrap; transform-origin: 0 50%; }
.sc-cli .chip.sq { border-radius: 12px; letter-spacing: .02em; font-weight: 400; }
.sc-cli .term { position: absolute; left: 850px; top: 118px; width: 930px; height: 852px; border-radius: 32px; background: #F0EEEA;
  box-shadow: 18px 18px 0 ${LIME}; overflow: hidden; transform-origin: 20% 50%; }
.sc-cli .term .head { position: absolute; left: 0; right: 0; top: 0; height: 90px; border-bottom: 3px solid #DFDCD5; }
.sc-cli .tabs { position: absolute; left: 28px; top: 19px; height: 54px; padding: 4px; border-radius: 16px; background: #E4E1DA; display: flex; gap: 4px; }
.sc-cli .tab { height: 46px; padding: 0 20px; border-radius: 12px; display: flex; align-items: center; gap: 10px; font: 700 22px Mono; color: #57544E; }
.sc-cli .tab.on { background: #FBFAF7; border: 3px solid ${INK}; color: ${INK}; height: 46px; }
.sc-cli .conn-pill { position: absolute; right: 26px; top: 22px; height: 48px; padding: 0 18px; border-radius: 26px; background: ${LIME}; border: 3px solid ${INK};
  font: 700 17px Mono; letter-spacing: .14em; display: flex; align-items: center; gap: 10px; white-space: nowrap; }
.sc-cli .log { position: absolute; left: 28px; right: 28px; top: 112px; bottom: 120px; overflow: hidden;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 30px); mask-image: linear-gradient(to bottom, transparent 0, #000 30px); }
.sc-cli .log-in { position: absolute; left: 0; right: 0; top: 0; }
.sc-cli .cmd { margin: 0 0 14px; padding: 14px 20px; border-radius: 14px; background: ${LIME}; border: 3px solid ${INK}; font: 400 20px Mono; color: ${INK};
  white-space: nowrap; transform-origin: 0 50%; }
.sc-cli .cmd b { color: ${PURPLE}; font-weight: 700; margin-right: 12px; }
.sc-cli .row { margin: 0 0 14px; display: flex; align-items: center; gap: 14px; height: 54px; transform-origin: 0 50%; }
.sc-cli .row .pill2 { height: 52px; padding: 0 18px; border-radius: 12px; background: #E8E5DE; border: 2px solid #DAD6CE; display: flex; align-items: center; gap: 12px;
  font: 400 19px Mono; color: #2F2D29; white-space: nowrap; }
.sc-cli .row .tm { margin-left: auto; font: 700 16px Mono; color: #8E8B84; letter-spacing: .06em; }
.sc-cli .ck { width: 26px; height: 26px; border-radius: 50%; flex: none; position: relative; }
.sc-cli .stats { margin: 0 0 14px 58px; padding: 18px 20px 20px; border-radius: 18px; background: #FBFAF7; border: 2px solid #DFDCD5; transform-origin: 0 0; }
.sc-cli .stats .k { display: flex; gap: 14px; margin-top: 14px; }
.sc-cli .stats .cell { flex: 1; padding: 14px 16px; border-radius: 14px; background: #ECE9E2; }
.sc-cli .stats .v { font: 900 44px Inter; letter-spacing: -.05em; line-height: 1; }
.sc-cli .stats .l { font: 500 18px DM; color: #55534E; margin-top: 6px; }
.sc-cli .stats .d { font: 700 14px Mono; color: #2E8F4E; margin-top: 6px; letter-spacing: .06em; }
.sc-cli .input { position: absolute; left: 28px; right: 28px; bottom: 26px; height: 66px; border-radius: 16px; border: 2px solid #D6D3CC; background: #F8F7F4;
  display: flex; align-items: center; padding: 0 84px 0 24px; font: 400 20px Mono; color: ${INK}; white-space: nowrap; overflow: hidden; }
.sc-cli .send { position: absolute; right: 12px; top: 10px; width: 44px; height: 44px; border-radius: 10px; background: ${INK}; color: #fff; display: flex; align-items: center;
  justify-content: center; font: 700 22px DM; }
.sc-cli .slam { position: absolute; left: 690px; top: 884px; padding: 14px 28px; border-radius: 16px; background: ${LIME}; border: 4px solid ${INK};
  box-shadow: 8px 9px 0 ${INK}; font: 800 34px Inter; letter-spacing: -.03em; white-space: nowrap; transform-origin: 50% 50%; }
`;

// a check / spinner badge
const badge = () => {
  const el = h('div', { class: 'ck' });
  el.spin = h('svg', { viewBox: '0 0 26 26', width: 26, height: 26, style: { position: 'absolute', inset: '0' } },
    h('circle', { cx: 13, cy: 13, r: 10, fill: 'none', stroke: '#CFCBC2', 'stroke-width': 3.5 }),
    h('path', { d: 'M13,3 A10,10 0 0 1 23,13', fill: 'none', stroke: PURPLE, 'stroke-width': 3.5, 'stroke-linecap': 'round' }));
  el.done = h('svg', { viewBox: '0 0 26 26', width: 26, height: 26, style: { position: 'absolute', inset: '0' } },
    h('circle', { cx: 13, cy: 13, r: 12, fill: '#2E9E4F' }), h('path', { d: 'M7.5,13.5 L11.3,17 L18.5,9', fill: 'none', stroke: '#fff', 'stroke-width': 3.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  el.append(el.spin, el.done);
  el.update = (t, a, b) => { // spinning from a, done from b
    show(el.spin, t < b); show(el.done, t >= b);
    set(el.spin, { transform: `rotate(${((t - a) * 720) % 360}deg)` });
    set(el.done, { transform: tf({ s: clamp(pop(t, b, 4, 0.5), 0, 1.25) }) });
  };
  return el;
};

scene({
  name: 'cli', t0: 41.05, t1: 48.62, hud: '07 — ONE COMMAND',
  build(root) {
    const S = this;
    root.classList.add('sc-cli');
    document.head.append(h('style', { text: CSS }));
    S.panel = h('div', { class: 'full bg-dark' });
    root.append(S.panel);

    // ---------- left column ----------
    S.eb = h('div', { class: 'eyebrow2' });
    S.hl = L.rise([[['Just', { at: W('just', 0, 41) + 0.03 }], ['one', { at: W('one', 0, 41) + 0.03 }]],
                   [['command.', { at: W('command') + 0.03, cls: 'lime-t' }]]]);
    set(S.hl, { left: '150px', top: '212px', fontSize: '138px', color: '#F1EFEB' });
    S.panel.append(S.eb, S.hl);
    // connector row: mascot body centre (246, 638)
    S.c1 = h('div', { class: 'conn', style: { left: '330px', top: '637px', width: '70px' } });
    S.n1 = h('div', { class: 'node', style: { left: '366px', top: '640px' } });
    S.c2 = h('div', { class: 'conn', style: { left: '538px', top: '637px', width: '66px' } });
    S.n2 = h('div', { class: 'node', style: { left: '571px', top: '640px' } });
    S.tA = C.tile('imsg', 130); set(S.tA, { left: '402px', top: '573px', transformOrigin: '50% 50%' });
    S.tB = C.tile('term', 130); set(S.tB, { left: '606px', top: '573px', transformOrigin: '50% 50%' });
    S.l1 = h('div', { class: 'tlabel', style: { left: '467px', top: '722px' } }, 'iMESSAGE');
    S.l2 = h('div', { class: 'tlabel', style: { left: '671px', top: '722px' } }, 'TERMINAL');
    S.ch1 = h('div', { class: 'chip', style: { top: '772px' } }, '+ EVERY ROLE IS A CLI');
    S.ch2 = h('div', { class: 'chip sq', style: { top: '852px' } }, h('span', { style: { color: LIME, fontWeight: '700' } }, '$'), 'uv run gtm run');
    S.panel.append(S.c1, S.c2, S.n1, S.n2, S.tA, S.tB, S.l1, S.l2, S.ch1, S.ch2);

    // ---------- terminal panel ----------
    S.term = h('div', { class: 'term' });
    S.term.append(h('div', { class: 'head' },
      h('div', { class: 'tabs' }, h('div', { class: 'tab on' }, h('span', { style: { color: PURPLE } }, '›_'), 'zsh'), h('div', { class: 'tab' }, 'gtm serve')),
      h('div', { class: 'conn-pill' }, h('span', { style: { width: '12px', height: '12px', borderRadius: '50%', background: '#2E9E4F', display: 'inline-block', border: `2px solid ${INK}` } }), 'TINYFISH · CONNECTED')));
    S.log = h('div', { class: 'log' }); S.logIn = h('div', { class: 'log-in' }); S.log.append(S.logIn);
    S.term.append(S.log);
    S.inp = h('div', { class: 'input' }); S.inpTxt = h('span'); S.inp.append(S.inpTxt, h('div', { class: 'send' }, '↵'));
    S.term.append(S.inp);
    S.panel.append(S.term);

    // log items, in order. Each: {el, at, kind}
    const C1 = 'uv run gtm run --brand-url tinyfish.ai --niche "AI browser agents"';
    const C2 = 'uv run gtm report tinyfish-demo-1';
    const C3 = 'uv run gtm approve tinyfish-demo-1';
    S.cmds = [{ text: C1, t0: 43.4, t1: 43.84 }, { text: C2, t0: 45.6, t1: 45.86 }, { text: C3, t0: 46.5, t1: 46.74 }];
    const cmdEl = s => h('div', { class: 'cmd' }, h('b', {}, '$'), s);
    const rowEl = (txt1, tm) => {
      const b = badge(); const ic = C.loopIcon('lime', 44); set(ic, { position: 'relative', filter: 'none', flex: 'none' });
      const el = h('div', { class: 'row' }, ic, h('div', { class: 'pill2' }, b, txt1), h('div', { class: 'tm' }, tm)); el.badge = b; return el;
    };
    const rowAt = w => W(w, 0, 43.5);
    S.items = [
      { el: cmdEl(C1), at: 43.88 },
      { el: rowEl('research · search 4 · fetch 1 · agent 1 · browser 5', '431s'), at: rowAt('Research') + 0.02, done: rowAt('Research') + 0.24 },
      { el: rowEl('analysis + strategy · template + cited script', '115s'), at: rowAt('script') - 0.1, done: rowAt('script') + 0.16 },
      { el: rowEl('video · 9:16 · v1', '60s'), at: rowAt('render') - 0.1, done: rowAt('render') + 0.16 },
      { el: rowEl('qa · v1 5.3 → v2 5.7 → v3 5.7 · needs_human', '410s'), at: rowAt('review') - 0.1, done: rowAt('review') + 0.22 },
      { el: cmdEl(C2), at: 45.9 },
      { el: null, at: 46.02, kind: 'stats' },
      { el: cmdEl(C3), at: 46.78 },
      { el: rowEl('approved · queued to publish (simulated)', ''), at: 46.88, done: 47.05 },
    ];
    // stats card (real tinyfish-demo-1 values)
    const cell = (v, l, d) => { const vv = h('div', { class: 'v' }, v); return { vv, el: h('div', { class: 'cell' }, vv, h('div', { class: 'l' }, l), h('div', { class: 'd' }, d)) }; };
    S.sv = [cell('$0.27', 'TinyFish spend', 'AGENT $0.256'), cell('16.9 min', 'Wall-clock', '1017 S TOTAL'), cell('46', 'Posts scanned', '20 REELS + 8 SHORTS')];
    S.items[6].el = h('div', { class: 'stats' }, h('div', { style: { font: '700 15px Mono', letterSpacing: '.16em', color: PURPLE } }, 'TINYFISH-DEMO-1 · THIS RUN'),
      h('div', { class: 'k' }, ...S.sv.map(c => c.el)));
    for (const it of S.items) S.logIn.append(it.el);

    S.slam = h('div', { class: 'slam' }, '✓ Right from your terminal');
    S.panel.append(S.slam);

    // ---------- mascot (unclipped, above the rising panel) ----------
    S.mas = C.mascot({ size: MS });
    set(S.mas, { left: '0px', top: '0px', transformOrigin: '0 0' });
    root.append(S.mas);

    // ---------- sfx ----------
    sfx(41.12, 'wipe', 0.9);
    sfx(41.5, 'land', 0.5);
    sfx(41.6, 'swoosh', 0.8);
    sfx(42.1, 'blip', 0.6); sfx(42.2, 'pop', 0.6);
    sfx(42.85, 'blip', 0.6); sfx(42.95, 'pop', 0.6);
    sfx(43.3, 'pop', 0.45); sfx(43.42, 'pop', 0.45);
    for (const c of S.cmds) { sfx(c.t0, 'type', 0.5, { dur: c.t1 - c.t0 }); sfx(c.t1 + 0.03, 'send', 0.6); }
    for (const it of S.items) if (it.done) sfx(it.done, 'tick', 0.6);
    sfx(46.05, 'blip', 0.5);
    sfx(47.1, 'impact', 0.9);
  },

  layout() { // measure item heights once (fonts are loaded before build)
    if (this._h) return;
    this._h = this.items.map(it => { const d = it.el.style.display; it.el.style.display = ''; const r = it.el.offsetHeight + 14; it.el.style.display = d; return r; });
    this._view = this.log.clientHeight;
  },

  update(t) {
    const S = this;
    this.dark = true;
    this.layout();
    // dark panel rises from the bottom with rounded top corners
    const up = p(t, 41.12, 0.24, ease.inOutCubic);
    const rad = lerp(150, 0, up);
    set(S.panel, { clipPath: up >= 1 ? 'none' : `inset(${((1 - up) * 100).toFixed(2)}% 0 0 0 round ${rad.toFixed(1)}px ${rad.toFixed(1)}px 0 0)` });

    // ---------- mascot: corner -> lifted with the panel -> row box ----------
    const a = p(t, 41.05, 0.2, ease.outCubic), b = spring(t, 41.24, 2.4, 0.62);
    const m = t < 41.24 ? { left: lerp(MA.left, MU.left, a), top: lerp(MA.top, MU.top, a), size: lerp(MA.size, MU.size, a) }
                        : { left: lerp(MU.left, MB.left, b), top: lerp(MU.top, MB.top, b), size: lerp(MU.size, MB.size, b) };
    if (t >= 41.7) Object.assign(m, MB);
    set(S.mas, { transform: `translate(${m.left.toFixed(1)}px,${m.top.toFixed(1)}px) scale(${(m.size / MS).toFixed(4)})` });
    const bl = x => clamp(1 - Math.abs(t - x) / 0.07);
    const land = t > 41.45 && t < 41.75 ? Math.sin(((t - 41.45) / 0.3) * Math.PI) * 0.1 : 0;
    S.mas.update({ blink: Math.max(bl(43.15), bl(45.05), bl(47.75)), lookX: lerp(0, 10, p(t, 43.4, 0.3)), lookY: lerp(0, -3, p(t, 43.4, 0.3)),
                   sx: 1 + land, sy: 1 - land, open: 1, armUp: t > 44.0 && t < 45.6 ? 0.35 * Math.sin((t - 44) * 9) : 0 });

    // ---------- left column ----------
    show(S.eb, t >= 41.35);
    type(S.eb, 'LOOPCAST CLI · RUN IT FROM YOUR TERMINAL', t, 41.35, 70);
    S.hl.update(t);
    const conn = (el, node, a0) => {
      const k = p(t, a0, 0.18, ease.outCubic);
      set(el, { transform: `scaleX(${k.toFixed(3)})` }); show(el, t >= a0);
      show(node, t >= a0 + 0.12); set(node, { transform: tf({ s: clamp(pop(t, a0 + 0.12, 4, 0.5), 0, 1.3) }) });
    };
    conn(S.c1, S.n1, 42.05); conn(S.c2, S.n2, 42.8);
    const tile = (el, lb, a0) => { const k = pop(t, a0, 3.2, 0.5); show(el, t >= a0); show(lb, t >= a0 + 0.08);
      set(el, { transform: tf({ s: clamp(k, 0, 1.25), r: (1 - clamp(k)) * -10 }) }); set(lb, { opacity: String(clamp((t - a0 - 0.08) / 0.15)) }); };
    tile(S.tA, S.l1, 42.18); tile(S.tB, S.l2, 42.93);
    const chip = (el, a0) => { const k = spring(t, a0, 3, 0.6); show(el, t >= a0); set(el, { transform: tf({ x: (1 - k) * -40 }), opacity: String(clamp((t - a0) / 0.12)) }); };
    chip(S.ch1, 43.28); chip(S.ch2, 43.4);

    // ---------- terminal panel flies in from the right ----------
    const tk = spring(t, 41.56, 2.0, 0.76);
    show(S.term, t >= 41.55);
    set(S.term, { transform: `perspective(2200px) translateX(${lerp(760, 0, tk).toFixed(1)}px) rotateY(${lerp(-26, 0, clamp(tk)).toFixed(2)}deg) rotate(${lerp(5, 0, clamp(tk)).toFixed(2)}deg) scale(${lerp(0.9, 1, clamp(tk)).toFixed(4)})`,
                  filter: tk < 0.98 ? `brightness(${lerp(0.7, 1, clamp(tk)).toFixed(3)})` : 'none' });

    // input line: typing each command, cleared on send
    let inTxt = '';
    for (const c of S.cmds) if (t >= c.t0 && t < c.t1 + 0.03) inTxt = c.text.slice(0, Math.floor(clamp((t - c.t0) / (c.t1 - c.t0)) * c.text.length));
    const caret = Math.floor(t * 2.4) % 2 === 0 ? '<span class="caret" style="height:.9em"></span>' : '';
    const html = inTxt ? `<span style="color:${PURPLE};font-weight:700;margin-right:12px">$</span>${inTxt.replace(/&/g, '&amp;').replace(/</g, '&lt;')}${caret}`
                       : `<span style="color:#A5A29B">type a command…</span>`;
    if (S.inpTxt._html !== html) { S.inpTxt._html = html; S.inpTxt.innerHTML = html; }

    // log items + scroll (pure: each item's arrival eases the scroll toward its target)
    let cum = 0, scroll = 0, prevTarget = 0;
    S.items.forEach((it, i) => {
      const on = t >= it.at;
      show(it.el, on);
      cum += S._h[i];
      const target = Math.max(0, cum - S._view);
      scroll += (target - prevTarget) * p(t, it.at, 0.3, ease.outCubic);
      prevTarget = target;
      if (!on) return;
      const k = clamp(pop(t, it.at, 3.6, 0.6), 0, 1.15);
      set(it.el, { transform: tf({ s: lerp(0.85, 1, k), y: (1 - clamp(k)) * 16 }), opacity: String(clamp((t - it.at) / 0.08)) });
      if (it.el.badge) it.el.badge.update(t, it.at, it.done);
    });
    set(S.logIn, { transform: `translateY(${(-scroll).toFixed(1)}px)` });
    // stats count up
    const sk = lerp(0.6, 1, p(t, 46.05, 0.55, ease.outCubic));
    txt(S.sv[0].vv, '$' + (0.2713 * sk).toFixed(2)); txt(S.sv[1].vv, (16.9 * sk).toFixed(1) + ' min'); txt(S.sv[2].vv, String(Math.round(46 * sk)));

    // ---------- sticker slam ----------
    const sl = p(t, 47.1, 0.2, ease.outQuart);
    show(S.slam, t >= 47.1);
    set(S.slam, { transform: tf({ x: (1 - sl) * -260, y: (1 - sl) * 160, r: lerp(-28, -6, sl), s: lerp(3.4, 1, sl) }), opacity: lerp(0.25, 1, sl).toFixed(3) });
  },
});
})();
