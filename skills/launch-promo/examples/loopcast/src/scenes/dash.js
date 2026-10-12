// 37.7 – 41.45 s: "Watch it all from iMessage or the dashboard." Phone (Loopcast iMessage thread) + the run dashboard.
(() => {
const { h, set, tf, p, spring, pop, lerp, clamp, ease, show, txt, noise1 } = L;
const INK = '#1F1D19', LIME = '#D1FD4E', PURPLE = '#5B2FE0';
const M0 = { left: 224, top: 379, size: 435 };   // hand-off from scan.js at 37.72
const M1 = { left: 46, top: 930, size: 100 };    // bottom-left corner
const MB = 435;                                   // mascot built at this size, scaled down from there

const CSS = `
.sc-dash .win { position: absolute; left: 145px; top: 190px; width: 1190px; height: 800px; border: 5px solid ${INK}; border-radius: 26px;
  background: #F6F5F1; box-shadow: 13px 15px 0 ${INK}; overflow: hidden; transform-origin: 30% 60%; }
.sc-dash .tb { position: absolute; left: 0; right: 0; top: 0; height: 64px; border-bottom: 3px solid #DEDBD4; background: #EFEDE8; }
.sc-dash .tb .dot { position: absolute; top: 22px; width: 18px; height: 18px; border-radius: 50%; border: 2.5px solid ${INK}; }
.sc-dash .tb .url { position: absolute; left: 112px; top: 12px; height: 40px; padding: 0 18px; border-radius: 12px; background: #F9F8F5; border: 2px solid #DEDBD4;
  font: 400 19px Mono; display: flex; align-items: center; color: #3A3833; letter-spacing: .02em; }
.sc-dash .tb .st { position: absolute; right: 20px; top: 12px; height: 40px; padding: 0 16px; border-radius: 20px; background: ${LIME}; border: 2.5px solid ${INK};
  font: 700 15px Mono; letter-spacing: .14em; display: flex; align-items: center; gap: 8px; }
.sc-dash .lbl { font: 700 14px Mono; letter-spacing: .18em; color: #8A877F; text-transform: uppercase; }
.sc-dash .tile { position: absolute; width: 262px; height: 116px; border-radius: 16px; background: #FBFAF7; border: 2px solid #E2DFD8; padding: 16px 18px; }
.sc-dash .tile .t1 { font: 700 20px DM; } .sc-dash .tile .t2 { font: 500 16px DM; color: #78756E; margin-top: 2px; }
.sc-dash .tile .t3 { font: 700 15px Mono; color: #2E8F4E; margin-top: 12px; letter-spacing: .04em; }
.sc-dash .tile .ic { position: absolute; right: 16px; top: 16px; width: 34px; height: 34px; border-radius: 10px; background: #E8F9C0; border: 2px solid #CDE58A;
  display: flex; align-items: center; justify-content: center; font: 700 16px Mono; color: #3a5a10; }
.sc-dash .card2 { position: absolute; border-radius: 18px; background: #FBFAF7; border: 2px solid #E2DFD8; }
.sc-dash .thumb { position: absolute; width: 112px; height: 199px; }
.sc-dash .thumb .im { position: absolute; inset: 0; border-radius: 12px; overflow: hidden; border: 3px solid ${INK}; background: #ccc; }
.sc-dash .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sc-dash .score { position: absolute; left: 50%; bottom: -16px; transform: translateX(-50%); padding: 4px 10px; border-radius: 10px; background: #F9F8F5;
  border: 2.5px solid ${INK}; font: 700 15px Mono; white-space: nowrap; }
.sc-dash .apv { position: absolute; padding: 0 26px; height: 58px; border-radius: 30px; background: ${LIME}; border: 3.5px solid ${INK}; box-shadow: 0 6px 0 ${INK};
  font: 800 22px Inter; letter-spacing: -.02em; display: flex; align-items: center; gap: 10px; white-space: nowrap; }
.sc-dash .bigtag { font: 700 30px Mono; letter-spacing: .14em; padding: 14px 26px; border-width: 4px; border-radius: 16px; box-shadow: 8px 9px 0 ${INK}; }
`;

scene({
  name: 'dash', t0: 37.7, t1: 41.45, z: 40.5, hud: '06 — iMESSAGE + DASHBOARD',
  build(root) {
    const S = this;
    root.classList.add('sc-dash');
    document.head.append(h('style', { text: CSS }));
    // light panel that rises over the lime scan scene (the mascot stays outside the clip)
    S.panel = h('div', { class: 'full' });
    S.panel.append(h('div', { class: 'full bg-paper' }),
      S.g1 = h('div', { class: 'glow', style: { left: '-300px', top: '-260px', width: '900px', height: '760px', opacity: '.55' } }),
      S.g2 = h('div', { class: 'glow', style: { left: '1400px', top: '660px', width: '900px', height: '700px', opacity: '.6' } }));
    root.append(S.panel);

    // ---------- dashboard window ----------
    S.win = h('div', { class: 'win' });
    const tb = h('div', { class: 'tb' },
      h('div', { class: 'dot', style: { left: '24px' } }), h('div', { class: 'dot', style: { left: '52px' } }), h('div', { class: 'dot', style: { left: '80px' } }),
      h('div', { class: 'url' }, 'localhost:8501 · gtm serve'),
      h('div', { class: 'st' }, h('span', { style: { width: '10px', height: '10px', borderRadius: '50%', background: INK, display: 'inline-block' } }), 'AWAITING APPROVAL'));
    S.win.append(tb);
    const body = h('div', { class: 'abs', style: { left: '0', top: '64px', right: '0', bottom: '0' } });
    S.win.append(body);
    const icon = C.loopIcon('lime', 52); set(icon, { left: '34px', top: '26px', filter: 'none' }); body.append(icon);
    body.append(h('div', { class: 'abs', style: { left: '100px', top: '22px' } },
      h('div', { class: 'lbl' }, 'Loopcast · growth loop'),
      h('div', { style: { font: '880 34px Inter', letterSpacing: '-.04em', marginTop: '2px' } }, 'AI browser agents')));
    body.append(h('div', { class: 'abs', style: { left: '420px', top: '48px', font: '400 16px Mono', color: '#6F6C65', letterSpacing: '.02em' } },
      'run tinyfish-demo-1 · TinyFish spend $0.27 · 16.9 min'));
    body.append(h('div', { class: 'abs lbl', style: { left: '34px', top: '104px' } }, 'Who did what'));
    const tiles = [['TinyFish Search', 'discover URLs', '4 calls · $0.000', 'S'], ['TinyFish Fetch', 'read pages', '1 call · $0.000', 'F'],
                   ['TinyFish Agent', 'work YouTube filters', '1 call · $0.256', 'A'], ['TinyFish Browser', 'brand screenshots', '5 calls · $0.015', 'B']];
    S.tiles = tiles.map(([a, b, c, d], i) => {
      const el = h('div', { class: 'tile', style: { left: `${34 + i * 280}px`, top: '134px' } },
        h('div', { class: 't1' }, a), h('div', { class: 't2' }, b), h('div', { class: 't3' }, c), h('div', { class: 'ic' }, d));
      body.append(el); return el;
    });
    // drafts card
    const dc = h('div', { class: 'card2', style: { left: '34px', top: '274px', width: '660px', height: '418px' } });
    dc.append(h('div', { class: 'abs lbl', style: { left: '24px', top: '20px' } }, 'Drafts · persona QA'),
      h('div', { class: 'abs', style: { right: '24px', top: '16px', font: '700 15px Mono', letterSpacing: '.12em', color: '#B2402F', background: '#FBE3DF', border: '2px solid #F0B9AF', borderRadius: '10px', padding: '4px 10px' } }, 'NEEDS A HUMAN'));
    S.thumbs = [['v1', '5.3'], ['v2', '5.7'], ['v3', '5.7']].map(([v, s], i) => {
      const el = h('div', { class: 'thumb', style: { left: `${28 + i * 140}px`, top: '66px' } }, h('div', { class: 'im' }, h('img', { src: `assets/dash_${v}.jpg` })),
        h('div', { class: 'score' }, `${v} · ${s}`));
      dc.append(el); return el;
    });
    dc.append(h('div', { class: 'abs', style: { left: '462px', top: '78px', width: '176px', font: '500 17px DM', lineHeight: '1.35', color: '#55534E' } },
      '3 synthetic personas + compliance reviewed every draft. Best: ', h('b', { style: { color: INK } }, 'v1.')));
    S.apv = h('div', { class: 'apv', style: { left: '462px', top: '300px' } }, '✓ Approve');
    dc.append(S.apv);
    body.append(dc);
    // sources donut card (real counts: Search threads 8, news 10, TikTok + Reels 20, Agent Shorts 8)
    const sc = h('div', { class: 'card2', style: { left: '718px', top: '274px', width: '428px', height: '418px' } });
    sc.append(h('div', { class: 'abs lbl', style: { left: '24px', top: '20px' } }, 'Sources this week'));
    const segs = [['Threads', 8, '#5B2FE0'], ['News', 10, '#9C86F0'], ['TikTok + Reels', 20, LIME], ['Shorts (Agent)', 8, INK]];
    const tot = segs.reduce((a, s) => a + s[1], 0);
    const R = 74, CIRC = 2 * Math.PI * R;
    const svg = h('svg', { viewBox: '0 0 200 200', width: 200, height: 200, style: { position: 'absolute', left: '24px', top: '64px' } });
    let acc = 0;
    S.arcs = segs.map(([n, v, col]) => {
      const c = h('circle', { cx: 100, cy: 100, r: R, fill: 'none', stroke: col, 'stroke-width': 34, transform: 'rotate(-90 100 100)' });
      c._off = acc; c._len = (v / tot) * CIRC; acc += c._len; svg.append(c); return c;
    });
    svg.append(h('text', { x: 100, y: 104, 'text-anchor': 'middle', style: { font: '900 40px Inter', letterSpacing: '-.04em' } }, '46'),
               h('text', { x: 100, y: 128, 'text-anchor': 'middle', style: { font: '700 12px Mono', letterSpacing: '.14em', fill: '#8A877F' } }, 'POSTS'));
    sc.append(svg);
    segs.forEach(([n, v, col], i) => sc.append(h('div', { class: 'abs', style: { left: '244px', top: `${84 + i * 42}px`, display: 'flex', alignItems: 'center', gap: '10px', font: '500 17px DM', whiteSpace: 'nowrap' } },
      h('span', { style: { width: '16px', height: '16px', borderRadius: '5px', background: col, border: `2px solid ${INK}`, display: 'inline-block' } }), n,
      h('b', { style: { font: '700 16px Mono', marginLeft: '2px' } }, String(v)))));
    sc.append(h('div', { class: 'abs', style: { left: '24px', top: '290px', right: '24px', font: '500 16px DM', lineHeight: '1.35', color: '#55534E' } },
      'Top Short: “This AI Agent Built A whole Browser In 7 Days” · ', h('b', { style: { color: INK } }, '1.6M views')));
    body.append(sc);
    S.panel.append(S.win);

    // ---------- phone: Loopcast iMessage thread ----------
    S.ph = C.phone();
    set(S.ph, { left: '745px', top: '96px' });
    const av = h('div', { class: 'av', style: { background: LIME, border: `3px solid ${INK}` } });
    const li = C.loopIcon('lime', 48); set(li, { position: 'relative', filter: 'none' }); av.append(li);
    set(av, { overflow: 'hidden', padding: '0', border: 'none', background: 'transparent' });
    const bub = (cls, ...kids) => h('div', { class: 'bub ' + cls, style: { font: '500 20px DM' } }, ...kids);
    S.b4 = bub('botl', 'Approved ✓ Queued for Instagram', h('div', { style: { font: '500 14px DM', opacity: '.75', marginTop: '3px' } }, '(posting is simulated in this demo)'));
    S.thread = h('div', { class: 'thread' },
      h('div', { class: 'th-head' }, av, h('div', {}, h('div', { class: 'nm' }, 'Loopcast'), h('div', { class: 'hd' }, 'iMessage'))),
      h('div', { class: 'th-body' },
        h('div', { class: 'day' }, 'Today · 9:12 AM'),
        bub('botl', h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } },
          h('div', { style: { width: '74px', height: '132px', borderRadius: '10px', overflow: 'hidden', border: '2px solid rgba(255,255,255,.8)', flex: 'none' } },
            h('img', { src: 'assets/dash_tin13.jpg', style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } })),
          h('div', {}, 'Draft v1 is ready 🎬', h('div', { style: { font: '500 16px DM', opacity: '.85', marginTop: '4px' } }, 'hook: “Still tab-hopping to compare prices?”')))),
        bub('botl', 'QA scored it 5.3/10. Best draft is v1, with QA’s notes. Reply APPROVE 🔒'),
        bub('me', 'APPROVE 🙌'),
        S.b4),
      h('div', { class: 'th-input' }, 'iMessage'));
    S.ph.screen.append(S.thread);
    S.tagA = C.tag('iMessage'); S.tagA.classList.add('bigtag');
    S.tagB = C.tag('No app needed'); S.tagB.classList.add('bigtag');
    set(S.tagA, { left: '278px', top: '176px', textTransform: 'none' });
    S.tagA.innerHTML = '<span>i<span style="text-transform:uppercase">Message</span></span>';
    set(S.tagB, { left: '236px', top: '286px' });
    S.ph.append(S.tagA, S.tagB);
    S.panel.append(S.ph);

    S.live = C.tag('Live dashboard · every run'); S.live.classList.add('bigtag');
    set(S.live, { left: '330px', top: '940px' });
    S.panel.append(S.live);

    S.cur = C.cursor('you', PURPLE);
    S.panel.append(S.cur);

    // ---------- mascot (outside the clip) ----------
    S.mas = C.mascot({ size: MB });
    set(S.mas, { left: '0px', top: '0px', transformOrigin: '0 0' });
    root.append(S.mas);

    // ---------- sfx ----------
    sfx(37.72, 'wipe', 0.8);
    sfx(37.9, 'whoosh', 0.8);
    sfx(38.45, 'pop', 0.45);
    sfx(W('iMessage') + 0.02, 'pop', 0.8);
    sfx(W('iMessage') + 0.2, 'pop', 0.55);
    sfx(39.24, 'swoosh', 0.85);
    sfx(39.82, 'pop', 0.7);
    sfx(40.8, 'click', 0.9);
    sfx(40.86, 'blip', 0.5);
  },

  update(t) {
    const S = this;
    this.dark = false;
    // panel rises from the bottom
    const up = p(t, 37.72, 0.23, ease.inOutCubic);
    set(S.panel, { clipPath: up >= 1 ? 'none' : `inset(${((1 - up) * 100).toFixed(2)}% 0 0 0)` });
    const gd = noise1(t * 0.35 + 7) * 30;
    set(S.g1, { transform: tf({ x: gd, y: -gd * 0.5 }) }); set(S.g2, { transform: tf({ x: -gd, y: gd * 0.4 }) });

    // ---------- mascot: scan hand-off box -> bottom-left corner ----------
    const mk = p(t, 37.72, 0.5, ease.inOutCubic);
    const hop = Math.sin(mk * Math.PI) * -60;
    const box = { left: lerp(M0.left, M1.left, mk), top: lerp(M0.top, M1.top, mk) + hop, size: lerp(M0.size, M1.size, mk) };
    const k = box.size / MB;
    const squash = 1 + 0.08 * Math.sin(clamp((t - 38.22) / 0.3) * Math.PI) * (t > 38.22 ? 1 : 0);
    set(S.mas, { transform: `translate(${box.left.toFixed(1)}px,${box.top.toFixed(1)}px) scale(${k.toFixed(4)})` });
    const bl = (a) => clamp(1 - Math.abs(t - a) / 0.07);
    S.mas.update({ blink: Math.max(bl(38.95), bl(40.25)), lookX: lerp(0, 9, p(t, 39.4, 0.3)), lookY: lerp(0, -4, p(t, 39.4, 0.3)),
                   sx: squash, sy: 2 - squash, open: 1, armUp: t > 39.8 && t < 40.4 ? 0.4 * Math.sin((t - 39.8) * 10) : 0 });
    show(S.mas, t < 41.05); // cli.js takes over the mascot at 41.05

    // ---------- phone ----------
    const fly = spring(t, 37.9, 2.5, 0.74);
    const mv = spring(t, 39.28, 1.8, 0.8);
    const fl = noise1(t * 0.7 + 2);
    const x = lerp(0, 598, mv), y = lerp(1000, 0, fly) + lerp(0, 22, mv) + fl * 5;
    const rz = lerp(-14, -4, clamp(fly)) * (1 - mv) + lerp(0, 5, mv) + fl * 0.8;
    const ry = lerp(3, -12, mv), rx = lerp(3, 2, mv);
    set(S.ph, { transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) perspective(2400px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) rotate(${rz.toFixed(2)}deg) scale(${lerp(1, 0.94, mv).toFixed(4)})` });
    const b4 = pop(t, 38.45, 3.4, 0.55);
    set(S.b4, { transform: tf({ s: clamp(b4, 0, 1.2) }), opacity: String(clamp((t - 38.45) / 0.05)) });
    const ta = pop(t, W('iMessage') + 0.02, 3.2, 0.5), tb = pop(t, W('iMessage') + 0.2, 3.2, 0.5);
    const grow = p(t, 39.35, 0.35, ease.outBack);
    show(S.tagA, t >= W('iMessage')); show(S.tagB, t >= W('iMessage') + 0.18);
    set(S.tagA, { transform: tf({ r: -6, s: clamp(ta, 0, 1.25) }) });
    set(S.tagB, { transform: tf({ r: 4, s: clamp(tb, 0, 1.25) * lerp(0.5, 0.82, grow) }) });

    // ---------- dashboard window slides in from the left, behind the phone ----------
    const wk = spring(t, 39.22, 1.7, 0.78);
    show(S.win, t >= 39.2);
    set(S.win, { transform: `perspective(2200px) translateX(${lerp(-1250, 0, wk).toFixed(1)}px) rotateY(${lerp(32, 0, clamp(wk)).toFixed(2)}deg) scale(${lerp(0.84, 1, clamp(wk)).toFixed(4)})` });
    S.tiles.forEach((el, i) => { const a = 39.45 + i * 0.05; set(el, { opacity: String(clamp((t - a) / 0.15)), transform: tf({ y: (1 - p(t, a, 0.3)) * 18 }) }); });
    S.arcs.forEach((c, i) => {
      const g = p(t, 39.6 + i * 0.08, 0.35, ease.outCubic);
      c.setAttribute('stroke-dasharray', `${(c._len * g).toFixed(2)} 1000`); c.setAttribute('stroke-dashoffset', (-c._off).toFixed(2));
    });
    const lv = pop(t, 39.82, 3.2, 0.5);
    show(S.live, t >= 39.82);
    set(S.live, { transform: tf({ r: -2, s: clamp(lv, 0, 1.25) }) });

    // ---------- cursor: drifts in, hovers the drafts, clicks Approve ----------
    // stage coordinates of targets (window at left 145, top 190 + 64 bar + 5 border)
    const pts = [[40.0, 760, 1030], [40.32, 410, 650], [40.5, 545, 640], [40.74, 720, 870], [41.0, 880, 800], [41.4, 930, 770]];
    let cx = pts[0][1], cy = pts[0][2];
    for (let i = 1; i < pts.length; i++) {
      const [ta2, x2, y2] = pts[i], [ta1] = pts[i - 1];
      const kk = ease.inOutCubic(clamp((t - ta1) / (ta2 - ta1)));
      if (t >= ta1) { cx = lerp(pts[i - 1][1], x2, kk); cy = lerp(pts[i - 1][2], y2, kk); }
    }
    show(S.cur, t >= 39.98);
    set(S.cur, { transform: tf({ x: cx, y: cy }), opacity: String(clamp((t - 39.98) / 0.12)) });
    const press = t >= 40.78 && t < 40.98 ? Math.sin(((t - 40.78) / 0.2) * Math.PI) : 0;
    set(S.apv, { transform: tf({ y: press * 5, s: 1 - press * 0.05 }), boxShadow: `0 ${(6 - press * 5).toFixed(1)}px 0 ${INK}`,
                 background: t >= 40.84 ? '#BDF02C' : LIME });
    txt(S.apv, t >= 40.84 ? '✓ Approved' : '✓ Approve');
    S.thumbs.forEach((el, i) => {
      const hov = i === 0 ? p(t, 40.3, 0.15) * (1 - p(t, 40.62, 0.15)) : 0;
      set(el, { transform: tf({ y: -hov * 8, s: 1 + hov * 0.04 }), boxShadow: hov > 0 ? `0 ${(hov * 10).toFixed(1)}px 0 ${LIME}` : 'none' });
    });
  },
});
})();
