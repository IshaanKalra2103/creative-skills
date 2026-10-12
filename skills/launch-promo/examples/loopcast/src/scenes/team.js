// 23.95 – 34.8 s: "Behind it, four TinyFish primitives." Four dark cards; each lights up while its mini demo plays.
(() => {
const { h, set, tf, p, spring, pop, lerp, clamp, ease, show, txt, rise, type, noise1 } = L;

const CSS = `
.sc-team .card { width: 388px; height: 558px; transform-origin: 50% 60%; }
.sc-team .card .sub { max-width: 330px; }
.sc-team .card .icn { position: absolute; left: 36px; top: 38px; }
.sc-team .fld { position: absolute; left: 16px; right: 16px; top: 12px; height: 42px; border-radius: 12px; background: #2B2925; border: 2px solid #3E3A34;
  font: 400 14px Mono; color: #E9E7E2; display: flex; align-items: center; gap: 8px; padding: 0 11px; white-space: nowrap; overflow: hidden; }
.sc-team .row { position: absolute; left: 16px; right: 16px; height: 26px; display: flex; align-items: center; gap: 9px; font: 500 15px DM; color: #D9D6CF;
  white-space: nowrap; overflow: hidden; transform-origin: 0 50%; }
.sc-team .src { flex: none; font: 700 11px Mono; letter-spacing: .12em; text-transform: uppercase; padding: 3px 7px; border-radius: 6px; background: #3A3731; color: #D1FD4E; }
.sc-team .tt { overflow: hidden; text-overflow: ellipsis; }
.sc-team .chipL { position: absolute; left: 16px; height: 34px; padding: 0 12px; border-radius: 9px; background: #D1FD4E; color: #1F1D19; font: 700 13px Mono;
  letter-spacing: .08em; display: flex; align-items: center; white-space: nowrap; transform-origin: 0 50%; }
.sc-team .url { position: absolute; left: 16px; top: 12px; height: 32px; padding: 0 12px; border-radius: 9px; background: #2B2925; border: 2px solid #3E3A34;
  font: 400 13px Mono; color: #CFCCC5; display: flex; align-items: center; white-space: nowrap; transform-origin: 0 50%; }
.sc-team .skel { position: absolute; left: 16px; height: 8px; border-radius: 4px; background: #3A3731; transform-origin: 0 50%; }
.sc-team .quote { position: absolute; left: 16px; right: 18px; top: 84px; font: 500 16px DM; line-height: 1.38; color: #E9E7E2; }
.sc-team .hlp { position: relative; white-space: nowrap; color: #fff; }
.sc-team .hlp i { position: absolute; left: -3px; right: -3px; top: 0; bottom: -1px; background: #5B2FE0; border-radius: 4px; z-index: -1; transform-origin: 0 50%; }
.sc-team .otag { position: absolute; left: 16px; top: 138px; height: 28px; padding: 0 10px; border-radius: 7px; border: 2px solid #D1FD4E; color: #D1FD4E;
  font: 700 12px Mono; letter-spacing: .12em; display: flex; align-items: center; white-space: nowrap; }
.sc-team .lbub { position: absolute; left: 16px; right: 16px; top: 176px; padding: 9px 13px; border-radius: 13px; background: #D1FD4E; color: #1F1D19;
  font: 600 15px DM; line-height: 1.28; transform-origin: 0 50%; }
.sc-team .yt { position: absolute; left: 16px; top: 12px; font: 400 12px Mono; color: #8E8B84; white-space: nowrap; letter-spacing: .02em; }
.sc-team .fchip { position: absolute; top: 38px; height: 32px; padding: 0 11px; border-radius: 9px; background: #2B2925; border: 2px solid #46423B;
  font: 700 13px Mono; color: #E9E7E2; display: flex; align-items: center; white-space: nowrap; }
.sc-team .res { position: absolute; left: 16px; right: 16px; font: 500 15px DM; line-height: 1.32; color: #E9E7E2; }
.sc-team .res b { font: 700 14px Mono; color: #D1FD4E; margin-right: 6px; }
.sc-team .stmp { position: absolute; left: 92px; top: 166px; padding: 4px 12px; border: 3px solid #D1FD4E; border-radius: 9px; color: #D1FD4E;
  background: rgba(21,19,17,.86); font: 700 19px Mono; letter-spacing: .14em; white-space: nowrap; }
.sc-team .ph0 { position: absolute; left: 16px; top: 18px; width: 112px; height: 200px; border-radius: 12px; border: 2px dashed #4A463F; }
.sc-team .shot { position: absolute; left: 16px; top: 18px; width: 112px; height: 200px; border-radius: 12px; overflow: hidden; border: 3px solid #F1EFEB;
  background: #fff url(assets/shot_0.jpg) center top / cover no-repeat; transform-origin: 50% 50%; }
.sc-team .flash { position: absolute; inset: 0; background: #fff; }
.sc-team .lab { position: absolute; left: 146px; font: 400 14px Mono; color: #8E8B84; white-space: nowrap; }
.sc-team .dom { position: absolute; left: 146px; top: 46px; font: 700 21px DM; color: #F1EFEB; }
.sc-team .plus { position: absolute; left: 270px; top: 104px; font: 900 46px Inter; letter-spacing: -.04em; color: #D1FD4E; }
`;

scene({
  name: 'team', t0: 23.95, t1: 34.8, hud: '04 — THE PRIMITIVES',
  build(root) {
    const S = this;
    root.classList.add('sc-team');
    document.head.append(h('style', { text: CSS }));
    root.append(h('div', { class: 'full bg-dark' }));
    S.grp = h('div', { class: 'full' });
    root.append(S.grp);

    // ---- header ----
    S.eye = h('div', { class: 'eyebrow', style: { left: '150px', top: '120px', color: '#D1FD4E', fontSize: '26px', letterSpacing: '.2em' } }, 'BEHIND IT →');
    S.title = rise([[['Four', { at: W('four') + 0.03 }], ['TinyFish', { at: W('TinyFish') + 0.03, cls: 'lime-t' }], ['primitives.', { at: W('primitives') + 0.03, cls: 'lime-t' }]]]);
    set(S.title, { left: '150px', top: '150px', fontSize: '106px', color: '#F1EFEB' });
    S.grp.append(S.eye, S.title);

    // ---- cards ----
    const defs = [
      ['Search', "FINDS THIS WEEK'S POSTS", 'lime'], ['Fetch', 'READS EVERY SOURCE', 'purple'],
      ['Agent', "CLICKS WHAT FETCH CAN'T", 'outline'], ['Browser', 'CAPTURES THE PIXELS', 'white'],
    ];
    S.cards = defs.map(([ttl, sub, icon], i) => {
      const well = h('div', { class: 'well' });
      const ic = C.loopIcon(icon, 94); ic.classList.add('icn');
      const el = h('div', { class: 'card' }, ic, h('div', { class: 'num' }, `0${i + 1} / 04`), h('div', { class: 'ttl' }, ttl), h('div', { class: 'sub' }, sub), well);
      set(el, { left: `${152 + i * 430}px`, top: '340px' });
      S.grp.append(el);
      return { el, well, ic };
    });
    const [w1, w2, w3, w4] = S.cards.map(c => c.well);

    // 1. Search
    S.fld = h('div', { class: 'fld' },
      h('svg', { viewBox: '0 0 20 20', width: 17, height: 17, style: { flex: 'none' } }, h('circle', { cx: 8, cy: 8, r: 6, fill: 'none', stroke: '#D1FD4E', 'stroke-width': 2.4 }),
        h('path', { d: 'M12.5,12.5 L18,18', stroke: '#D1FD4E', 'stroke-width': 2.4, 'stroke-linecap': 'round' })),
      S.fldT = h('span', {}));
    const row = (src, tt, top) => h('div', { class: 'row', style: { top: `${top}px` } }, h('span', { class: 'src' }, src), h('span', { class: 'tt' }, tt));
    S.rows1 = [row('TikTok', 'Spam your favorite ai productivity tool in the comments', 62),
               row('Reel', 'Think AI automatically makes you more productive? 🤖', 90),
               row('Reddit', 'Is AI actually saving you time—or just adding another tab', 118),
               row('Shorts', 'Why I actually use AI for content #ai #productivity', 146)];
    S.chip1 = h('div', { class: 'chipL', style: { top: '186px', fontSize: '12px', letterSpacing: '.05em' } });
    w1.append(S.fld, ...S.rows1, S.chip1);

    // 2. Fetch
    S.url = h('div', { class: 'url' }, '🔗 reddit.com/r/TimeManagement/…');
    S.sk = [h('div', { class: 'skel', style: { top: '56px', width: '262px' } }), h('div', { class: 'skel', style: { top: '70px', width: '196px' } })];
    S.hlBar = h('i');
    S.quote = h('div', { class: 'quote' }, '“…or just adding ', h('span', { class: 'hlp' }, S.hlBar, 'another tab'), ' to your browser?”');
    S.otag = h('div', { class: 'otag' }, '🔥 PAIN POINT · CITED');
    S.lbub = h('div', { class: 'lbub' }, '→ becomes a script claim, with its source ✓');
    w2.append(S.url, ...S.sk, S.quote, S.otag, S.lbub);

    // 3. Agent
    S.yt = h('div', { class: 'yt' }, 'youtube.com · “AI browser agents”');
    S.fchips = [['Filters', 16], ['This week', 104], ['View count', 214]].map(([s, x]) => h('div', { class: 'fchip', style: { left: `${x}px` } }, s));
    S.cur = C.cursor(null);
    S.res1 = h('div', { class: 'res', style: { top: '82px' } }, h('b', {}, '1.6M'), 'This AI Agent Built A whole Browser In 7 Days');
    S.res2 = h('div', { class: 'res', style: { top: '130px', color: '#8E8B84' } }, h('b', { style: { color: '#8E8B84' } }, '1.1K'), 'A Browser for AI Agent');
    S.stmp = h('div', { class: 'stmp' }, '8 SHORTS FOUND');
    w3.append(S.yt, ...S.fchips, S.res1, S.res2, S.stmp, S.cur);

    // 4. Browser
    S.ph0 = h('div', { class: 'ph0' });
    S.flash = h('div', { class: 'flash' });
    S.shot = h('div', { class: 'shot' }, S.flash);
    S.lab = h('div', { class: 'lab', style: { top: '22px' } }, '1080 × 1920');
    S.dom = h('div', { class: 'dom' }, 'tinyfish.ai');
    S.lab2 = h('div', { class: 'lab', style: { top: '80px' } }, 'phone-framed');
    S.chip4 = h('div', { class: 'chipL', style: { left: '146px', top: '184px' } }, '✓ 4 SHOTS · $0.015');
    S.plus = h('div', { class: 'plus' }, '+4');
    S.wflash = h('div', { class: 'flash', style: { opacity: 0 } });
    w4.append(S.ph0, S.shot, S.lab, S.dom, S.lab2, S.chip4, S.plus, S.wflash);

    // ---- mascot (top-right) ----
    S.m = C.mascot({ size: 174 });
    set(S.m, { left: '1616px', top: '101px' });
    S.grp.append(S.m);

    // ---- timing ----
    S.act = [
      [W('Search') - 0.06, W('Fetch') - 0.1],
      [W('Fetch') - 0.06, W('Agent') - 0.06],
      [W('Agent') - 0.06, W('Browser') - 0.06],
      [W('Browser') - 0.06, 34.0],
    ];
    S.rise = [0, 1, 2, 3].map(i => 24.95 + i * 0.09);
    const a1 = S.act[0][0], a2 = S.act[1][0], a3 = S.act[2][0], a4 = S.act[3][0];
    S.T = {
      type1: a1 + 0.12, rows: [27.12, 27.32, 27.52, 28.62], chip1: W('threads') + 0.1, chip1b: 28.66,
      url: a2 + 0.08, sk: a2 + 0.16, quote: a2 + 0.26, hl: a2 + 0.42, otag: a2 + 0.56, lbub: a2 + 0.72,
      yt: a3 + 0.06, fch: a3 + 0.1, clicks: [31.06, 31.4, 31.74], res1: 31.98, res2: 32.1, stmp: 32.3,
      shot: W('grabs') + 0.02, lab: W('grabs') + 0.2, chip4: W('pixels') + 0.12, plus: W('pixels') + 0.36,
    };
    const T = S.T;
    // ---- sfx ----
    sfx(24.12, 'swoosh', 0.4);
    S.rise.forEach((at, i) => sfx(at + 0.02, 'swoosh', 0.45 - i * 0.05));
    S.act.forEach(([a]) => sfx(a, 'pop', 0.7));
    sfx(T.type1, 'type', 0.45, { dur: 0.7 });
    T.rows.forEach(x => sfx(x, 'blip', 0.4));
    sfx(T.chip1, 'pop', 0.55); sfx(T.chip1b, 'blip', 0.5);
    sfx(T.url, 'blip', 0.4); sfx(T.quote, 'blip', 0.35); sfx(T.otag, 'pop', 0.5); sfx(T.lbub, 'pop', 0.55);
    T.clicks.forEach(x => sfx(x, 'click', 0.7));
    sfx(T.res1, 'blip', 0.45); sfx(T.stmp, 'stamp', 0.8);
    sfx(T.shot, 'shutter', 0.9); sfx(T.chip4, 'pop', 0.55); sfx(T.plus, 'ding', 0.7);
    sfx(33.98, 'whoosh', 0.5);
  },

  update(t) {
    const S = this, T = S.T;
    this.dark = true;
    // camera: slow push, then pan up as the lime wipe takes over
    const out = p(t, 33.96, 0.38, ease.inCubic);
    const drift = p(t, 25.3, 8.6, ease.lin);
    set(S.grp, { transform: tf({ x: -6 * drift, y: -10 * drift - out * 190, s: 1 + 0.012 * drift }), transformOrigin: '50% 40%' });

    // header
    const ek = p(t, 24.12, 0.3);
    set(S.eye, { opacity: ek.toFixed(3), transform: tf({ y: (1 - ek) * 18 }) });
    S.title.update(t);

    // cards
    const scat = [[-5, -70, -30], [3, -25, -10], [-3, 8, 10], [4, -30, 20]];
    S.cards.forEach((c, i) => {
      const k = spring(t, S.rise[i], 2.3, 0.72);
      const [a, d] = S.act[i];
      const on = clamp(spring(t, a, 3.2, 0.62)) - clamp(spring(t, d, 3.2, 0.75));
      const lift = clamp(on, -0.2, 1.15);
      const sc = scat[i];
      set(c.el, {
        transform: tf({ x: sc[2] * out, y: (1 - k) * 300 - lift * 34 + sc[1] * out, r: (1 - k) * (i % 2 ? 7 : -7) + sc[0] * out, s: 1 + 0.035 * lift }),
        opacity: clamp((t - S.rise[i]) / 0.18).toFixed(3),
        borderColor: on > 0.5 ? '#D1FD4E' : '#3a3731', borderWidth: on > 0.5 ? '4px' : '3px',
        boxShadow: on > 0.02 ? `0 0 ${(44 * clamp(on)).toFixed(0)}px rgba(209,253,78,${(0.32 * clamp(on)).toFixed(3)}), 0 18px 40px rgba(0,0,0,${(0.35 * clamp(on)).toFixed(3)})` : 'none',
        zIndex: on > 0.02 ? 2 : 1,
      });
      show(c.el, t >= S.rise[i] - 0.01);
    });

    // --- 1. Search ---
    show(S.fld, t >= S.act[0][0]);
    set(S.fld, { opacity: clamp((t - S.act[0][0]) / 0.12).toFixed(3) });
    type(S.fldT, '"AI productivity" · past week', t, T.type1, 42, t < S.act[1][0]);
    S.rows1.forEach((r, i) => {
      const at = T.rows[i], k = spring(t, at, 3.2, 0.7);
      show(r, t >= at); set(r, { opacity: clamp((t - at) / 0.1).toFixed(3), transform: tf({ x: (1 - k) * 26 }) });
    });
    txt(S.chip1, t < T.chip1b ? '✓ 20 REELS · 8 THREADS' : '✓ 20 REELS · 8 THREADS · 10 SHORTS');
    const c1 = Math.max(clamp(pop(t, T.chip1, 3.6, 0.5), 0, 1.25) * (t < T.chip1b ? 1 : 0), t >= T.chip1b ? clamp(pop(t, T.chip1b, 4, 0.5), 0, 1.15) : 0);
    show(S.chip1, t >= T.chip1); set(S.chip1, { transform: tf({ s: t < T.chip1b ? c1 : 0.85 + 0.15 * c1 }) });

    // --- 2. Fetch ---
    const fade = (el, at, dy = 10) => { const k = p(t, at, 0.2); show(el, t >= at); set(el, { opacity: k.toFixed(3), transform: tf({ y: (1 - k) * dy }) }); };
    const url = clamp(spring(t, T.url, 3.4, 0.62), 0, 1.15);
    show(S.url, t >= T.url); set(S.url, { transform: tf({ s: url }) });
    S.sk.forEach((e, i) => { const k = p(t, T.sk + i * 0.05, 0.22); show(e, t >= T.sk); set(e, { transform: `scaleX(${k.toFixed(3)})` }); });
    fade(S.quote, T.quote);
    set(S.hlBar, { transform: `scaleX(${p(t, T.hl, 0.22).toFixed(3)})` });
    const ot = clamp(pop(t, T.otag, 3.6, 0.5), 0, 1.3);
    show(S.otag, t >= T.otag); set(S.otag, { transform: tf({ r: -3, s: ot }) });
    const lb = clamp(pop(t, T.lbub, 3.2, 0.55), 0, 1.2);
    show(S.lbub, t >= T.lbub); set(S.lbub, { transform: tf({ s: lb }) });

    // --- 3. Agent ---
    fade(S.yt, T.yt, 6);
    S.fchips.forEach((e, i) => {
      const k = clamp(spring(t, T.fch + i * 0.05, 3.4, 0.65), 0, 1.15), ck = T.clicks[i];
      show(e, t >= T.fch + i * 0.05);
      const hit = t >= ck, press = t >= ck && t < ck + 0.09 ? 0.9 : 1;
      set(e, { transform: tf({ s: k * press }), background: hit ? '#D1FD4E' : '#2B2925', color: hit ? '#1F1D19' : '#E9E7E2', borderColor: hit ? '#1F1D19' : '#46423B' });
    });
    // cursor path: in from the bottom-right, then to each chip
    const pts = [[300, 222], [55, 56], [154, 56], [270, 56]];
    const legs = [[T.fch + 0.08, T.clicks[0] - 0.02], [T.clicks[0] + 0.06, T.clicks[1] - 0.02], [T.clicks[1] + 0.06, T.clicks[2] - 0.02]];
    let cx = pts[0][0], cy = pts[0][1];
    legs.forEach(([a, b], i) => { const k = p(t, a, b - a, ease.inOutCubic); if (t >= a) { cx = lerp(pts[i][0], pts[i + 1][0], k); cy = lerp(pts[i][1], pts[i + 1][1], k); } });
    const press = T.clicks.some(c => t >= c && t < c + 0.08) ? 0.82 : 1;
    const curOut = p(t, T.res1 - 0.05, 0.2);
    show(S.cur, t >= T.fch + 0.06 && curOut < 1);
    set(S.cur, { left: `${cx.toFixed(1)}px`, top: `${(cy + curOut * 40).toFixed(1)}px`, transform: tf({ s: 0.62 * press }), opacity: (1 - curOut).toFixed(3) });
    fade(S.res1, T.res1); fade(S.res2, T.res2);
    const st = p(t, T.stmp, 0.15, ease.outCubic);
    show(S.stmp, t >= T.stmp); set(S.stmp, { transform: tf({ r: -7, s: lerp(1.9, 1, st) }), opacity: st.toFixed(3) });

    // --- 4. Browser ---
    show(S.ph0, t < T.shot + 0.05);
    const sk = clamp(spring(t, T.shot - 0.04, 3, 0.6), 0, 1.15);
    show(S.shot, t >= T.shot - 0.04); set(S.shot, { transform: tf({ s: lerp(0.7, 1, sk) }) });
    set(S.flash, { opacity: (1 - p(t, T.shot + 0.02, 0.3, ease.outQuad)).toFixed(3) });
    const wf = t >= T.shot ? (1 - p(t, T.shot, 0.22, ease.outQuad)) * 0.55 : 0;
    set(S.wflash, { opacity: wf.toFixed(3) });
    fade(S.lab, T.lab, 8); fade(S.dom, T.lab + 0.06, 8); fade(S.lab2, T.lab + 0.12, 8);
    const c4 = clamp(pop(t, T.chip4, 3.6, 0.5), 0, 1.25);
    show(S.chip4, t >= T.chip4); set(S.chip4, { transform: tf({ s: c4 }) });
    const pl = clamp(pop(t, T.plus, 3.8, 0.45), 0, 1.35), plf = p(t, T.plus, 0.9, ease.outCubic);
    show(S.plus, t >= T.plus); set(S.plus, { transform: tf({ s: pl, y: -plf * 10 }) });

    // --- mascot: wobble, blink, look at the active card ---
    let ai = 0; S.act.forEach(([a], i) => { if (t >= a) ai = i; });
    const look = t < S.act[0][0] ? -6 : [-14, -11, -8, -3][ai];
    const blinks = [25.72, 28.3, 31.02, 33.28, 24.4];
    let b = 0; for (const bt of blinks) { const a = t - bt; if (a >= 0 && a < 0.14) b = Math.max(b, 1 - Math.abs(a - 0.07) / 0.07); }
    const bump = S.act.reduce((m, [a]) => Math.max(m, t >= a && t < a + 0.35 ? Math.sin((t - a) / 0.35 * Math.PI) : 0), 0);
    S.m.update({ blink: b, open: ai >= 0 && bump > 0.3 ? 1 : 0, lookX: look * p(t, 23.95, 0.4), lookY: 6 * p(t, 23.95, 0.4), sx: 1 + bump * 0.06, sy: 1 - bump * 0.06,
                 armUp: (0.35 + 0.35 * Math.sin(t * 3.1)) * p(t, 23.95, 0.4) + bump * 0.4 });
    const wob = p(t, 23.95, 0.4, ease.inOutCubic);   // starts exactly in how.js's hand-off box
    set(S.m, { transform: tf({ r: (noise1(t * 0.9 + 2) * 5) * wob, y: (Math.sin(t * 2.2) * 4) * wob - bump * 8 }) });
  },
});
})();
