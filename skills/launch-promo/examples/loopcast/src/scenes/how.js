// 13.5 – 24.1 s: how it works. Text it a niche -> a sourced reel lands in your texts -> it grades its drafts and waits for your yes.
(() => {
const { h, set, tf, p, spring, pop, lerp, clamp, ease, inv, show, txt, rise, type, noise1 } = L;
const INK = '#1F1D19', LIME = '#D1FD4E', VIOLET = '#5B2FE0';

const CSS = `
.sc-how .eyb { position:absolute; left:150px; top:236px; font:700 22px Mono; letter-spacing:.16em; color:#2E2C28; white-space:nowrap; }
.sc-how .hl { font-size:122px; }
.sc-how .keycard { position:absolute; background:${LIME}; border:4px solid ${INK}; border-radius:20px; box-shadow:9px 11px 0 ${INK};
  padding:20px 38px 26px 34px; white-space:nowrap; transform-origin:30% 60%; }
.sc-how .keycard .lab { font:700 21px Mono; letter-spacing:.2em; color:#2E2C28; }
.sc-how .keycard .val { font:700 64px Mono; letter-spacing:-.01em; line-height:1.05; margin-top:4px; }
.sc-how .ph-head { position:absolute; left:0; right:0; top:62px; height:94px; border-bottom:2px solid #E2DFD8; display:flex; align-items:center; gap:12px; padding:0 20px 0 22px; }
.sc-how .ph-head .nm { font:700 23px DM; line-height:1.1; }
.sc-how .ph-head .hd { font:400 15px Mono; color:#6F6D67; white-space:nowrap; }
.sc-how .auto { margin-left:auto; border:3px solid ${INK}; background:${LIME}; border-radius:20px; padding:4px 11px 5px; font:700 13px Mono; letter-spacing:.12em; white-space:nowrap; }
.sc-how .body { position:absolute; left:0; right:0; top:156px; bottom:94px; overflow:hidden; }
.sc-how .scroll { position:absolute; left:0; right:0; top:0; }
.sc-how .bub { font-size:20.5px; margin:7px 18px; max-width:84%; }
.sc-how .bub.me { margin-left:auto; }
.sc-how .bub.in { background:#E9E6E0; border:none; }
.sc-how .hi { white-space:nowrap; padding:0 4px; margin:0 -2px; border-radius:6px; background-repeat:no-repeat; background-image:linear-gradient(${VIOLET},${VIOLET}); }
.sc-how .btn { margin-top:10px; border-radius:12px; background:${LIME}; color:${INK}; border:2px solid ${INK}; font:700 19px DM; text-align:center; padding:9px 10px 10px; }
.sc-how .dots { display:flex; gap:7px; padding:4px 2px; }
.sc-how .dots i { width:11px; height:11px; border-radius:50%; background:#fff; display:block; }
.sc-how .draft { display:flex; gap:12px; margin-top:10px; align-items:flex-start; }
.sc-how .draft img { width:92px; height:164px; object-fit:cover; border-radius:10px; border:2px solid ${INK}; flex:none; }
.sc-how .draft .hook { font:600 18.5px DM; line-height:1.3; }
.sc-how .draft .cite { margin-top:8px; font:700 12.5px Mono; letter-spacing:.12em; opacity:.8; text-transform:uppercase; }
.sc-how .note { font:500 14px DM; opacity:.75; margin-top:3px; }
.sc-how .sysrow { margin:10px 18px 6px; padding:10px 14px; border-radius:14px; background:#E9E6E0; font:500 17px DM; color:#55534E; }
.sc-how .ftag { position:absolute; background:#F8F8F6; border:4px solid ${INK}; border-radius:18px; box-shadow:8px 10px 0 ${INK}; display:flex; align-items:center; gap:16px;
  padding:16px 28px 18px 18px; white-space:nowrap; transform-origin:0 50%; }
.sc-how .ftag .ic { width:56px; height:56px; border-radius:14px; border:3px solid ${INK}; background:${LIME}; display:flex; align-items:center; justify-content:center; flex:none; }
.sc-how .ftag .big { font:880 37px Inter; letter-spacing:-.05em; line-height:1; }
.sc-how .ftag .small { font:700 16px Mono; letter-spacing:.2em; margin-top:6px; color:#3A3833; }
.sc-how .opts { position:absolute; width:800px; background:#F8F8F6; border:4px solid ${INK}; border-radius:24px; box-shadow:10px 12px 0 ${INK}; padding:24px 26px 26px; transform-origin:20% 50%; }
.sc-how .opts .lab { font:700 20px Mono; letter-spacing:.2em; color:#2E2C28; margin:0 0 12px 6px; text-transform:uppercase; }
.sc-how .orow { display:flex; align-items:center; justify-content:space-between; gap:20px; border-radius:16px; padding:16px 20px 18px 22px; margin-top:8px; }
.sc-how .orow .ti { font:700 34px DM; letter-spacing:-.02em; line-height:1.1; }
.sc-how .orow .su { font:500 22px DM; color:#55534E; margin-top:4px; }
.sc-how .trail { position:absolute; width:14px; height:14px; border-radius:50%; background:${VIOLET}; margin:-7px 0 0 -7px; }
`;

scene({
  name: 'how', t0: 13.5, t1: 24.1, hud: '03 — TEXT → REEL',
  build(root) {
    const S = this;
    root.classList.add('sc-how');
    document.head.append(h('style', { text: CSS }));

    // ---------- background ----------
    S.bg = h('div', { class: 'full bg-paper' });
    S.g1 = h('div', { class: 'glow', style: { left: '-220px', top: '-200px', width: '880px', height: '760px' } });
    S.g2 = h('div', { class: 'glow', style: { left: '1420px', top: '600px', width: '880px', height: '720px' } });
    root.append(S.bg, S.g1, S.g2);

    // everything except the phone + mascot (they have their own exit)
    S.wrap = h('div', { class: 'full' });
    root.append(S.wrap);
    S.eyb = h('div', { class: 'eyb' });
    S.wrap.append(S.eyb);

    // headlines
    const t1 = W('Text', 0, 13);
    S.hlA = rise([[['Text', { at: t1 + 0.04 }], ['it', { at: W('it', 0, 13.9) + 0.03 }]],
                  [['a', { at: W('a', 0, 14.6) + 0.03 }], ['niche', { at: W('niche') + 0.02 }]]]);
    S.hlB = rise([[['The', { at: 16.8 }], ['reel', { at: 16.9 }], ['lands', { at: 17.0 }]],
                  [['in', { at: W('in', 0, 18) + 0.02, cls: 'purple-t' }], ['your', { at: W('your', 0, 18.2) + 0.02, cls: 'purple-t' }], ['texts.', { at: W('texts') + 0.02, cls: 'purple-t' }]]]);
    S.hlC = rise([[['Even', { at: W('Even') + 0.03 }], ['better.', { at: W('better') + 0.02, cls: 'purple-t' }]]]);
    set(S.hlA, { left: '150px', top: '292px' });
    set(S.hlB, { left: '150px', top: '292px' });
    set(S.hlC, { left: '150px', top: '284px' });
    S.wrap.append(S.hlA, S.hlB, S.hlC);

    // NICHE keyword card
    S.key = h('div', { class: 'keycard' }, h('div', { class: 'lab' }, 'NICHE'), h('div', { class: 'val' }, '“AI PRODUCTIVITY”'));
    set(S.key, { left: '148px', top: '596px' });
    S.wrap.append(S.key);

    // options card
    S.tog1 = C.toggle(); S.tog2 = C.toggle();
    S.row1 = h('div', { class: 'orow' }, h('div', {}, h('div', { class: 'ti' }, 'Persona QA first'), h('div', { class: 'su' }, '3 synthetic critics score every frame')), S.tog1);
    S.row2 = h('div', { class: 'orow' }, h('div', {}, h('div', { class: 'ti' }, 'Wait for my yes'), h('div', { class: 'su' }, 'Nothing posts until you approve')), S.tog2);
    S.opts = h('div', { class: 'opts' }, S.optsIn = h('div', {}, h('div', { class: 'lab' }, 'More options'), S.row1, S.row2));
    set(S.opts, { left: '150px', top: '448px' });
    S.wrap.append(S.opts);

    // starburst behind the phone
    S.burst = C.burst(350, 245, 15, 11);
    set(S.burst, { left: '945px', top: '232px', transformOrigin: '380px 380px' });
    S.wrap.append(S.burst);

    // ---------- phone ----------
    S.ph = C.phone({});
    set(S.ph, { left: '1124px', top: '160px' });
    const head = () => h('div', { class: 'ph-head' },
      h('div', { style: { position: 'relative', width: '52px', height: '52px', flex: 'none' } }, Object.assign(C.loopIcon('lime', 52), {})),
      h('div', {}, h('div', { class: 'nm' }, 'Loopcast'), h('div', { class: 'hd' }, 'via iMessage')),
      h('div', { class: 'auto' }, '● AUTOMATED'));
    const thread = (...kids) => {
      const sc = h('div', { class: 'scroll' }, ...kids);
      const el = h('div', { class: 'full', style: { background: '#F0EEEA' } }, head(), h('div', { class: 'body' }, sc), h('div', { class: 'th-input' }, 'iMessage'));
      el.sc = sc; return el;
    };
    // beat 1: you text it a niche
    S.hi = h('span', { class: 'hi' }, 'AI productivity');
    S.a0 = h('div', { class: 'day' }, 'Today · 9:41');
    S.a1 = h('div', { class: 'bub in' }, 'Text me a brand + niche and I’ll make you a reel 🎬');
    S.a2 = h('div', { class: 'bub me' }, 'tinyfish.ai — find trending ', S.hi, ' content and make a reel 🙏');
    S.th1 = thread(S.a0, S.a1, S.a2);
    // beat 2: the draft lands
    S.b0 = h('div', { class: 'day' }, 'Today · 9:41');
    S.b1 = h('div', { class: 'bub me' }, 'tinyfish.ai — find trending AI productivity content and make a reel 🙏');
    S.bTyping = h('div', { class: 'bub botl', style: { width: '86px' } }, h('div', { class: 'dots' }, h('i'), h('i'), h('i')));
    S.bDraft = h('div', { class: 'bub botl', style: { transformOrigin: '0 0' } },
      h('div', { style: { font: '700 20.5px DM' } }, 'Draft v1 is ready 🎬'),
      h('div', { class: 'draft' }, h('img', { src: 'assets/tin13_v1_f0.jpg' }),
        h('div', {}, h('div', { class: 'hook' }, 'Hook: “Still tab-hopping to compare prices?”'), h('div', { class: 'cite' }, '· every claim cited'))),
      S.bBtn = h('div', { class: 'btn' }, '▶ Watch draft'));
    S.b3 = h('div', { class: 'bub me' }, 'ooh 👀');
    S.th2 = thread(S.b0, S.b1, S.bTyping, S.bDraft, S.b3);
    // beat 3: QA, then it waits for your yes
    S.c0 = h('div', { class: 'day' }, 'Today');
    S.c1 = h('div', { class: 'sysrow' }, '↩ QA ran on draft v1');
    S.cBtn = h('div', { class: 'btn' }, 'Rewriting…');
    S.c2 = h('div', { class: 'bub botl' }, '3 critics scored v1 5.3/10 — captions cover the product. Rewriting ✍️', S.cBtn);
    S.c3 = h('div', { class: 'bub botl' }, 'Still under the bar. Best draft is v1, with QA’s notes. Reply APPROVE 🔒');
    S.c4 = h('div', { class: 'bub me' }, 'APPROVE 🙌');
    S.c5 = h('div', { class: 'bub botl' }, 'Approved ✓ Queued for Instagram', h('div', { class: 'note' }, '(posting simulated)'));
    S.th3 = thread(S.c0, S.c1, S.c2, S.c3, S.c4, S.c5);
    S.blackout = h('div', { class: 'full', style: { background: '#201E1A', opacity: '0' } });
    S.ph.screen.append(S.th1, S.th2, S.th3, S.blackout);
    set(S.ph.status, { color: INK, zIndex: '6' });
    root.append(S.ph);

    // ---------- things in front of the phone ----------
    S.front = h('div', { class: 'full' });
    root.append(S.front);
    S.run = C.tag('<span class="chk">✓</span>Run started');
    set(S.run, { left: '896px', top: '808px', transformOrigin: '100% 50%' });
    S.trail = [];
    for (let i = 0; i < 12; i++) { const d = h('div', { class: 'trail' }); S.front.append(d); S.trail.push(d); }
    S.plane = C.plane(118);
    S.front.append(S.run, S.plane);
    const bolt = h('svg', { viewBox: '0 0 24 24', width: 30, height: 30 }, h('path', { d: 'M13,2 L4,14 H11 L10,22 L20,9 H13 Z', fill: INK }));
    S.drafted = h('div', { class: 'ftag' }, h('div', { class: 'ic' }, bolt),
      h('div', {}, h('div', { class: 'big' }, 'Drafted in 4:43'), h('div', { class: 'small' }, 'FULLY AUTOMATIC')));
    set(S.drafted, { left: '1418px', top: '372px' });
    S.plus = C.tag('+1 reel queued', 'lime');
    set(S.plus, { left: '1440px', top: '930px', font: '700 22px Mono', transformOrigin: '0 50%' });
    S.front.append(S.drafted, S.plus);

    // ---------- mascot on top of the phone ----------
    S.m = C.mascot({ size: 174 });
    set(S.m, { transformOrigin: '0 0' });
    root.append(S.m);

    // measure bubble heights once (fonts are loaded before build) for the chat auto-scroll
    for (const th of [S.th1, S.th2, S.th3]) th.style.display = '';
    S.ph.style.display = '';
    const H = el => el.offsetHeight + parseFloat(getComputedStyle(el).marginTop) + parseFloat(getComputedStyle(el).marginBottom);
    S.hgt = new Map();
    for (const el of [S.a0, S.a1, S.a2, S.b0, S.b1, S.bTyping, S.bDraft, S.b3, S.c0, S.c1, S.c2, S.c3, S.c4, S.c5]) S.hgt.set(el, H(el));
    S.bodyH = S.th1.querySelector('.body').offsetHeight || 610;

    // ---------- sfx ----------
    sfx(13.5, 'wipe', 0.9);
    sfx(13.82, 'pop', 0.6);
    sfx(14.12, 'send', 0.5);
    sfx(W('niche') + 0.04, 'pop', 0.9);
    sfx(15.04, 'swoosh', 0.6);
    sfx(W('boom'), 'impact', 0.9);
    sfx(W('boom') + 0.06, 'send', 0.8);
    sfx(16.62, 'whoosh', 0.5);
    sfx(17.02, 'blip', 0.4);
    sfx(17.42, 'pop', 0.7);
    sfx(18.6, 'pop', 0.8);
    sfx(19.02, 'blip', 0.5);
    sfx(19.68, 'pop', 0.7);
    sfx(W('grades'), 'toggle', 0.9);
    sfx(W('grades') + 0.06, 'blip', 0.5);
    sfx(21.2, 'ding', 0.4);
    sfx(W('waits'), 'toggle', 0.9);
    sfx(W('waits') + 0.06, 'blip', 0.5);
    sfx(22.25, 'send', 0.5);
    sfx(22.6, 'blip', 0.5);
    sfx(22.9, 'pop', 0.8);
    sfx(23.68, 'whoosh', 0.9);
  },

  update(t) {
    const S = this;
    this.dark = false;
    // ---- entry wipe from the right ----
    const wi = p(t, 13.52, 0.22, ease.inOutCubic);
    const enterX = (1 - wi) * 260;
    S.root.style.clipPath = wi < 1 ? `inset(0 0 0 ${((1 - wi) * 100).toFixed(2)}%)` : 'none';

    // ---- exit timings ----
    const fadeOut = p(t, 23.55, 0.2, ease.inCubic);
    const black = p(t, 23.55, 0.12, ease.outCubic);
    const zoom = p(t, 23.7, 0.25, ease.inCubic);
    const turn = p(t, 23.66, 0.22, ease.inOutCubic);
    this.dark = zoom > 0.6;

    // ---- background ----
    const gd = noise1(t * 0.35 + 9) * 30;
    set(S.g1, { transform: tf({ x: gd + enterX, y: -gd * 0.6 }) });
    set(S.g2, { transform: tf({ x: -gd + enterX, y: gd * 0.5 }) });
    set(S.bg, { transform: tf({ x: enterX * 0.4 }) });

    // ---- camera drift on the 2D layer ----
    const cx = noise1(t * 0.4 + 2) * 7, cy = noise1(t * 0.33 + 5) * 5;
    set(S.wrap, { transform: tf({ x: enterX + cx, y: cy }), opacity: (1 - fadeOut).toFixed(3),
                  filter: fadeOut > 0 ? `blur(${(fadeOut * 12).toFixed(1)}px)` : 'none' });
    set(S.front, { transform: tf({ x: enterX + cx * 1.3, y: cy * 1.3 }), opacity: (1 - fadeOut).toFixed(3),
                   filter: fadeOut > 0 ? `blur(${(fadeOut * 12).toFixed(1)}px)` : 'none' });

    // ---- eyebrow types on ----
    type(S.eyb, 'HOW IT WORKS — TEXT → REEL', t, 13.72, 60);

    // ---- headlines ----
    S.hlA.update(t, 16.6, 0.2);
    S.hlB.update(t, 19.3, 0.2);
    S.hlC.update(t, 99);

    // ---- NICHE card ----
    const ka = W('niche') + 0.04;
    const kk = pop(t, ka, 3.1, 0.42), kout = p(t, 16.62, 0.2, ease.inCubic);
    show(S.key, t >= ka && kout < 1);
    set(S.key, { transform: tf({ r: -3.2 + (1 - clamp(kk)) * -8, s: clamp(kk, 0, 1.35) * (1 - 0.1 * kout), y: kout * 20 }),
                 opacity: (clamp((t - ka) / 0.05) * (1 - kout)).toFixed(3), filter: kout > 0 ? `blur(${(kout * 10).toFixed(1)}px)` : 'none' });

    // ---- options card ----
    const oa = 19.68, ok = pop(t, oa, 2.8, 0.5);
    show(S.opts, t >= oa);
    set(S.opts, { transform: tf({ r: -2.2, s: lerp(0.55, 1, clamp(ok, 0, 1.2)), y: (1 - clamp(ok)) * 40 }), opacity: String(clamp((t - oa) / 0.08)) });
    set(S.optsIn, { opacity: p(t, oa + 0.16, 0.18).toFixed(3) });
    const k1 = p(t, W('grades'), 0.16, ease.outCubic), k2 = p(t, W('waits'), 0.16, ease.outCubic);
    S.tog1.update(k1); S.tog2.update(k2);
    set(S.row1, { background: `rgba(209,253,78,${(k1 * 0.55).toFixed(3)})` });
    set(S.row2, { background: `rgba(209,253,78,${(k2 * 0.55).toFixed(3)})` });

    // ---- starburst ----
    const ba = W('boom');
    const bk = pop(t, ba, 2.6, 0.45);
    show(S.burst, t >= ba);
    set(S.burst, { transform: tf({ s: clamp(bk, 0, 1.25), r: (t - ba) * 9 - 18 * (1 - clamp(bk)) }) });

    // ---- phone pose ----
    const fl = noise1(t * 0.55 + 7);
    const ry = lerp(-17, 0, turn), rx = lerp(3, 0, turn), rz = lerp(2.4 + fl * 1.1, 0, turn);
    const px = 1124 + 215, py = 160 + 444; // phone center
    const zx = lerp(0, 960 - px, zoom), zy = lerp(0, 540 - py, zoom);
    const s = lerp(0.9, 5.6, zoom);
    set(S.ph, { transform: `translate(${(enterX * 1.15 + zx + fl * 6).toFixed(1)}px, ${(zy + noise1(t * 0.5 + 1) * 8).toFixed(1)}px) ` +
      `perspective(2000px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) rotate(${rz.toFixed(2)}deg) scale(${s.toFixed(4)})` });
    set(S.blackout, { opacity: black.toFixed(3) });

    // ---- phone threads ----
    const scr = t < 16.7 ? 1 : t < 19.62 ? 2 : 3;
    show(S.th1, scr === 1); show(S.th2, scr === 2); show(S.th3, scr === 3);
    const swap = scr === 2 ? p(t, 16.7, 0.14) : scr === 3 ? p(t, 19.62, 0.14) : 1;
    set(scr === 1 ? S.th1 : scr === 2 ? S.th2 : S.th3, { opacity: swap.toFixed(3) });
    // message appear helper: returns appear progress (for scroll), sets transform
    const msg = (el, at, kind = 'pop') => {
      const on = t >= at; show(el, on);
      if (!on) return 0;
      const k = kind === 'pop' ? pop(t, at, 3.6, 0.55) : spring(t, at, 3.2, 0.7);
      set(el, { transform: tf({ s: clamp(k, 0, 1.15) }), opacity: String(clamp((t - at) / 0.06)) });
      return clamp((t - at) / 0.22);
    };
    const scroll = (th, items) => {
      let tot = 0;
      for (const [el, k] of items) tot += S.hgt.get(el) * k;
      set(th.sc, { transform: tf({ y: -Math.max(0, tot - S.bodyH + 14) }) });
    };
    if (scr === 1) {
      const k0 = msg(S.a0, 13.5), k1a = msg(S.a1, 13.5), k2a = msg(S.a2, 14.1);
      const hk = p(t, W('niche') + 0.02, 0.22, ease.outCubic);
      set(S.hi, { backgroundSize: `${(hk * 100).toFixed(1)}% 100%`, color: hk > 0.55 ? '#fff' : INK });
      scroll(S.th1, [[S.a0, k0], [S.a1, k1a], [S.a2, k2a]]);
    } else if (scr === 2) {
      const typingOn = t >= 17.0 && t < 17.42;
      show(S.bTyping, typingOn);
      if (typingOn) {
        set(S.bTyping, { transform: tf({ s: clamp(pop(t, 17.0, 3.6, 0.55), 0, 1.15) }) });
        [...S.bTyping.querySelectorAll('i')].forEach((d, i) => set(d, { transform: tf({ y: -Math.max(0, Math.sin((t - 17) * 14 - i * 0.9)) * 6 }) }));
      }
      const k0 = msg(S.b0, 16.7), kb1 = msg(S.b1, 16.7);
      const kd = msg(S.bDraft, 17.42, 'spring');
      set(S.bBtn, { opacity: p(t, 17.62, 0.15).toFixed(3) });
      const k3 = msg(S.b3, 19.02);
      scroll(S.th2, [[S.b0, k0], [S.b1, kb1], [S.bDraft, kd], [S.b3, k3]]);
    } else {
      const k0 = msg(S.c0, 19.62), k1c = msg(S.c1, 19.72);
      const k2c = msg(S.c2, W('grades') + 0.06);
      txt(S.cBtn, t < 21.2 ? 'Rewriting…' : '✓ v2 + v3 done');
      set(S.cBtn, { opacity: t < 21.2 ? (0.55 + 0.45 * Math.abs(Math.sin((t - 20.4) * 6))).toFixed(3) : '1' });
      const k3c = msg(S.c3, W('waits') + 0.06);
      const k4 = msg(S.c4, 22.25), k5 = msg(S.c5, 22.6);
      scroll(S.th3, [[S.c0, k0], [S.c1, k1c], [S.c2, k2c], [S.c3, k3c], [S.c4, k4], [S.c5, k5]]);
    }

    // ---- RUN STARTED tag slides out from the phone's left edge ----
    const ra = 15.04, rk = spring(t, ra, 2.8, 0.62), rout = p(t, 16.62, 0.2, ease.inCubic);
    show(S.run, t >= ra && rout < 1);
    set(S.run, { transform: tf({ x: (1 - rk) * 220, r: -3.5, s: lerp(0.8, 1, clamp(rk)) }), opacity: (clamp((t - ra) / 0.06) * (1 - rout)).toFixed(3) });

    // ---- paper plane + dotted trail (on "boom") ----
    const pa = W('boom') + 0.04, pd = 0.62;
    const P0 = [1215, 640], P1 = [1120, 330], P2 = [1360, 250], P3 = [1610, 70];
    const bez = u => { const a = 1 - u; return [0, 1].map(i => a * a * a * P0[i] + 3 * a * a * u * P1[i] + 3 * a * u * u * P2[i] + u * u * u * P3[i]); };
    const pu = (t - pa) / pd;
    show(S.plane, pu >= 0 && pu <= 1);
    if (pu >= 0 && pu <= 1) {
      const e = ease.inOutCubic(pu), [x, y] = bez(e), [x2, y2] = bez(Math.min(1, e + 0.02));
      const ang = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI + 22;
      set(S.plane, { left: `${(x - 59).toFixed(1)}px`, top: `${(y - 47).toFixed(1)}px`, transform: tf({ r: ang, s: 0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, pu * 1.4)) }) });
    }
    S.trail.forEach((d, i) => {
      const u = (i + 1) / (S.trail.length + 1);
      const born = pa + pd * ease.inOutCubic(u) * 0.95;
      const a = t - born;
      show(d, a >= 0 && a < 0.55);
      if (a >= 0 && a < 0.55) { const [x, y] = bez(u); set(d, { left: `${x.toFixed(1)}px`, top: `${y.toFixed(1)}px`, transform: tf({ s: 1 - a / 0.55 }), opacity: (1 - a / 0.55).toFixed(3) }); }
    });

    // ---- drafted tag + "+1 reel queued" ----
    const da = 18.6, dk = pop(t, da, 3.0, 0.45);
    show(S.drafted, t >= da && t < 19.6);
    set(S.drafted, { transform: tf({ r: 4, s: clamp(dk, 0, 1.3) * (1 - p(t, 19.36, 0.2, ease.inCubic)) }) });
    const qa = 22.9, qk = pop(t, qa, 3.0, 0.45);
    show(S.plus, t >= qa);
    set(S.plus, { transform: tf({ r: -5, s: clamp(qk, 0, 1.3) }) });

    // ---- mascot: peeks over the phone, then hands off to team.js at {left 1616, top 101, size 174} ----
    const mk = pop(t, 13.8, 3.0, 0.5);
    const bob = Math.sin(t * 3.1) * 4;
    const mx = lerp(1350 + enterX * 1.15 + fl * 6, 1616, turn), my = lerp(66 + bob, 101, turn);
    const ms = 1;
    show(S.m, t >= 13.8);
    set(S.m, { transform: `translate(${mx.toFixed(1)}px, ${my.toFixed(1)}px) scale(${(ms * clamp(mk, 0, 1.25)).toFixed(4)})`, left: '0px', top: '0px' });
    const blinkT = [15.2, 17.9, 20.1, 22.4];
    let bl = 0; for (const b of blinkT) { const a = t - b; if (a >= 0 && a < 0.16) bl = 1 - Math.abs(a - 0.08) / 0.08; }
    const look = t < 16.7 ? [-10, 8] : t < 19.6 ? [-6, 12] : [-12, 6];
    S.m.update({ blink: bl, open: t > W('boom') && t < W('boom') + 0.5 ? 1 : (t > 22.25 && t < 23.0 ? 1 : 0.3),
                 lookX: look[0] * (1 - turn), lookY: look[1] * (1 - turn), armUp: t > 22.9 && t < 23.4 ? Math.sin((t - 22.9) * 12) * 0.6 : 0,
                 sy: 1 + 0.08 * Math.max(0, 1 - Math.abs(t - W('boom') - 0.05) / 0.12) * -1, sx: 1 + 0.08 * Math.max(0, 1 - Math.abs(t - W('boom') - 0.05) / 0.12) });
  },
});
})();
