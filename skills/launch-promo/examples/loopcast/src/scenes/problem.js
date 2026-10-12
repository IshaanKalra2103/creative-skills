// 0 – 10.6 s: rival's reel goes viral -> team pings flood in -> 1 AM pasting links -> "every trend you miss is reach you lose"
(() => {
const { h, set, tf, p, spring, pop, lerp, clamp, ease, inv, show, txt, rise, type, noise1 } = L;
const INK = '#1F1D19';

scene({
  name: 'problem', t0: 0, t1: 10.66, hud: '01 — THE PROBLEM',
  build(root) {
    const S = this;
    // ---------- backgrounds ----------
    S.paper = h('div', { class: 'full bg-paper' });
    S.g1 = h('div', { class: 'glow', style: { left: '-260px', top: '-240px', width: '900px', height: '760px' } });
    S.g2 = h('div', { class: 'glow', style: { left: '1380px', top: '640px', width: '900px', height: '700px' } });
    S.night = h('div', { class: 'full', style: { background: 'radial-gradient(ellipse 62% 70% at 50% 46%, #433E55 0%, #2A2733 45%, #161618 100%)' } });
    S.grey = h('div', { class: 'full', style: { background: 'radial-gradient(ellipse 60% 70% at 48% 50%, #55534F 0%, #3A3936 42%, #1E1D19 100%)' } });
    S.nightDots = h('div', { class: 'full dots-light' });
    root.append(S.paper, S.g1, S.g2, S.night, S.grey, S.nightDots);

    // ---------- the team's pings (stickers + pills) ----------
    S.stkLayer = h('div', { class: 'full', style: { transformOrigin: '42% 50%' } });
    root.append(S.stkLayer);
    const pills = [
      ['SG', "what's the hook?", 210, 470], ['MC', 'trending audio?', 640, 640], ['LD', 'is this AI?', 90, 600], ['AK', 'format??', 470, 240],
      ['JR', 'make one like it', 820, 155], ['TW', 'by friday??', 1010, 610], ['PN', 'saw it on reddit', 330, 905], ['SG', 'reels or tiktok?', 760, 820],
      ['MC', 'copy it?', 1090, 340], ['EV', 'why\'d it blow up', 60, 300], ['LD', 'duet it?', 1735, 190], ['RB', '1.2M views 👀', 1700, 760],
      ['JR', 'what tool?', 590, 960], ['AK', 'ugc or animated?', 980, 905], ['TW', 'need this', 40, 1010], ['PN', 'remix it', 1100, 470],
      ['EV', 'who\'s on it?', 1720, 470], ['SG', 'same vibe pls', 300, 60], ['RB', 'brief?', 990, 60], ['MC', 'tonight??', 1730, 960],
      ['LD', 'hook in 1s 🤯', 420, 780], ['AK', 'send link', 1760, 640], ['JR', 'posted when?', 120, 160], ['TW', 'can we?', 860, 380],
    ];
    const avc = { SG: '#CFE3F7', MC: '#C9B8F5', LD: '#F5D565', AK: '#FFC9B8', JR: '#BFF0C9', TW: '#F7D0E6', PN: '#D8D4FF', EV: '#FCE7A8', RB: '#C3EEF0' };
    S.pills = pills.map(([av, tx, x, y], i) => {
      const el = C.pill(av, tx, avc[av]);
      set(el, { left: `${x}px`, top: `${y}px` });
      S.stkLayer.append(el);
      return { el, at: 3.62 + i * 0.028, r: (L.hash(i * 3.7) - 0.5) * 12 };
    });
    S.A = C.sticker('@sky.growth', 'What format?', 'SG', '#CFE3F7');
    S.B = C.sticker('@maya.content', 'Can we copy it? 🙏', 'MC', '#6233D9');
    S.Cs = C.sticker('@leo.design', 'By Friday??', 'LD', '#F5D565');
    for (const s of [S.A, S.B, S.Cs]) S.stkLayer.append(s);
    S.cnt = h('div', { class: 'abs', style: { left: '72px', top: '905px' } },
      h('div', { class: 'mono', style: { font: '700 19px Mono', letterSpacing: '.16em', color: '#55534E' } }, 'TEAM PINGS'),
      S.cntN = h('div', { style: { font: '880 88px Inter', letterSpacing: '-.05em', lineHeight: '1' } }, '3'));
    S.stkLayer.append(S.cnt);

    // ---------- headline ----------
    S.hl1 = rise([[['Your', { at: W('Your') + 0.05 }], ["rival’s", { at: W("rival's") + 0.04 }], ['reel', { at: W('reel') + 0.03 }], ['just', { at: W('just') + 0.03 }]]]);
    S.hl2 = rise([[['went', { at: W('went') + 0.03 }], ['viral.', { at: W('viral') + 0.02, cls: 'purple-t' }]]]);
    set(S.hl1, { left: '152px', top: '326px', fontSize: '92px' });
    set(S.hl2, { left: '148px', top: '420px', fontSize: '158px' });
    root.append(S.hl1, S.hl2);


    // ---------- phone ----------
    S.ph = C.phone({ badge: true });
    set(S.ph, { left: '1245px', top: '96px' });
    // reel screen
    S.reel = h('div', { class: 'full', style: { background: 'linear-gradient(168deg, #F5B064 0%, #EF8150 32%, #DD4F6A 70%, #BE2F71 100%)', color: '#fff' } },
      h('div', { style: { position: 'absolute', top: '74px', width: '100%', textAlign: 'center', font: '700 24px DM', opacity: '.92' } }, 'Reels'),
      h('svg', { viewBox: '0 0 100 100', width: 108, height: 108, style: { position: 'absolute', left: '150px', top: '330px', opacity: '.92' } }, h('path', { d: 'M22,10 L88,50 L22,90 Z', fill: '#fff' })),
      h('div', { style: { position: 'absolute', left: '30px', bottom: '46px', width: '300px' } },
        h('div', { style: { font: '700 26px DM' } }, '@rival.ai'),
        h('div', { style: { font: '500 20px DM', lineHeight: '1.3', opacity: '.95' } }, 'POV: my agent did the price checks for me 🤯')));
    const rail = (icon, id) => { const n = h('div', { style: { font: '700 20px Mono', marginTop: '4px' } }); S[id] = n;
      return h('div', { style: { textAlign: 'center', marginBottom: '22px' } }, icon, n); };
    const ic = d => h('svg', { viewBox: '0 0 24 24', width: 40, height: 40, style: { display: 'block', margin: '0 auto' } }, h('path', { d, fill: 'none', stroke: '#fff', 'stroke-width': 2.2, 'stroke-linejoin': 'round' }));
    S.reel.append(h('div', { style: { position: 'absolute', right: '16px', top: '520px', width: '84px' } },
      rail(h('svg', { viewBox: '0 0 24 24', width: 40, height: 40, style: { display: 'block', margin: '0 auto' } }, h('path', { d: 'M12,21 C3,14 2,10 2.5,7 C3,4 5.5,3 7.5,3 C9.5,3 11,4.5 12,6.5 C13,4.5 14.5,3 16.5,3 C18.5,3 21,4 21.5,7 C22,10 21,14 12,21 Z', fill: '#fff' })), 'likes'),
      rail(ic('M4,5 H20 V16 H11 L6,20 V16 H4 Z'), 'cmts'), rail(ic('M3,11 L21,3 L14,21 L11,13 Z M11,13 L21,3'), 'shares')));
    // notes screen (1 AM)
    S.notes = h('div', { class: 'full', style: { background: '#F0EEEA' } },
      h('div', { class: 'th-head' }, h('div', { class: 'av', style: { background: '#D1FD4E' } }, '📌'),
        h('div', {}, h('div', { class: 'nm' }, 'trends to copy'), h('div', { class: 'hd' }, 'notes · week 41'))),
      S.noteBody = h('div', { class: 'th-body' }, h('div', { class: 'day' }, 'Today · 1:02 AM')));
    const links = [['tiktok', 'tiktok.com/@mahdi.shafiei/vid…'], ['reels', 'instagram.com/reel/DeMwgtw…'],
                   ['shorts', 'youtube.com/shorts/mM2mtHb…'], ['reddit', 'reddit.com/r/TimeManagement/…'], ['tiktok', 'tiktok.com/@ai.tools.daily/…']];
    S.links = links.map(([k, u]) => { const el = h('div', { style: { margin: '8px 20px', padding: '12px 16px', borderRadius: '16px', background: '#5B2FE0', color: '#fff', font: '500 19px DM', lineHeight: '1.25', width: 'fit-content', maxWidth: '86%', transformOrigin: '0 50%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } },
      h('div', { style: { font: '700 13px Mono', letterSpacing: '.14em', opacity: '.75', textTransform: 'uppercase', marginBottom: '3px' } }, '↳ ' + k), u);
      S.noteBody.append(el); return el; });
    // DM thread (missed trend)
    S.chat = h('div', { class: 'full', style: { background: '#F0EEEA' } },
      h('div', { class: 'th-head' }, h('div', { class: 'av', style: { background: '#CFE3F7' } }, 'SG'),
        h('div', {}, h('div', { class: 'nm' }, 'sky.growth'), h('div', { class: 'hd' }, '@sky.growth'))),
      h('div', { class: 'th-body' },
        S.d1 = h('div', { class: 'day' }, '3 days ago'), S.b1 = h('div', { class: 'bub in' }, 'did we jump on the tab-hopping trend? 👀'),
        S.d2 = h('div', { class: 'day' }, '2 days ago'), S.b2 = h('div', { class: 'bub in' }, 'hello?? 😕'),
        S.d3 = h('div', { class: 'day' }, 'Today'), S.b3 = h('div', { class: 'bub in', style: { position: 'relative' } }, 'nvm, rival.ai posted it first 😒',
          S.stamp = h('div', { style: { position: 'absolute', left: '40px', top: '44px', border: '4px solid #E0364C', color: '#E0364C', borderRadius: '10px', padding: '4px 14px', font: '700 24px Mono', letterSpacing: '.16em', whiteSpace: 'nowrap', background: 'rgba(240,238,234,.85)' } }, '✕ TREND MISSED'))),
      h('div', { class: 'th-input' }, 'Message…'));
    S.ph.screen.append(S.reel, S.notes, S.chat);
    root.append(S.ph);
    // hearts float up along the phone's right edge, in front of it
    S.hearts = [];
    for (let i = 0; i < 11; i++) {
      const el = C.heart(i % 3 === 2 ? '#FBE3EA' : '#F0567A', 30 + (i * 7) % 18);
      root.append(el);
      S.hearts.push({ el, at: 0.72 + i * 0.13, x: 1615 + L.hash(i) * 95, y0: 660 - L.hash(i + 9) * 140, sw: L.hash(i + 3) * 6.28 });
    }

    S.trend = C.tag('🔥 Trending');
    set(S.trend, { left: '1032px', top: '160px' });
    root.append(S.trend);

    // ---------- 1 AM UI ----------
    S.clock = h('div', { class: 'abs', style: { left: '118px', top: '96px', color: '#F1EFEB', whiteSpace: 'nowrap' } },
      S.clockH = h('span', { style: { font: '900 196px Inter', letterSpacing: '-.075em' } }, '1:02'),
      h('span', { style: { font: '880 68px Inter', letterSpacing: '-.04em', marginLeft: '6px' } }, 'AM'));
    S.still = h('div', { class: 'abs', style: { left: '126px', top: '322px', font: '700 22px Mono', letterSpacing: '.18em', color: '#DAD8D2' } });
    S.saved = h('div', { class: 'abs', style: { left: '1300px', top: '326px', color: '#F1EFEB' } },
      h('div', { style: { font: '700 26px Mono', letterSpacing: '.22em' } }, 'SAVED'),
      S.savedN = h('div', { style: { font: '900 176px Inter', letterSpacing: '-.06em', lineHeight: '1', margin: '6px 0 0 -6px' } }, '0'),
      h('div', { style: { font: '880 58px Inter', letterSpacing: '-.05em', marginTop: '6px' } }, 'of ', S.ofN = h('span', { class: 'pink-t' }, '351'), ' reels'));
    S.kC = C.key('⌘C'); S.kV = C.key('⌘V');
    set(S.kC, { left: '522px', top: '560px' }); set(S.kV, { left: '522px', top: '706px' });
    root.append(S.clock, S.still, S.saved, S.kC, S.kV);

    // ---------- "every trend you miss… is reach you lose." ----------
    S.m1 = rise([[['Every', { at: W('Every') + 0.03 }], ['trend', { at: W('trend') + 0.03 }]], [['you', { at: W('you', 0, 8) + 0.03 }], ['miss…', { at: W('miss') + 0.03 }]]]);
    S.m2 = rise([[['…is', { at: W('is', 0, 8) + 0.03 }], ['reach', { at: W('reach') + 0.03 }]], [['you', { at: W('you', 1, 8) + 0.03 }], ['lose.', { at: W('lose') + 0.02, cls: 'pink-t' }]]]);
    set(S.m1, { left: '112px', top: '388px', fontSize: '104px', color: '#F1EFEB' });
    set(S.m2, { left: '1232px', top: '388px', fontSize: '104px', color: '#F1EFEB' });
    root.append(S.m1, S.m2);

    // ---------- sfx ----------
    sfx(0.02, 'whoosh', 0.9);
    for (const k of ['Your', "rival's", 'reel', 'just', 'went']) sfx(W(k) + 0.05, 'tick', 0.35);
    sfx(W('viral') + 0.02, 'pop', 0.8);
    sfx(1.35, 'pop', 0.6);
    sfx(W('What'), 'swoosh', 0.7); sfx(W('What') + 0.1, 'pop', 0.8);
    sfx(W('Can'), 'swoosh', 0.7); sfx(W('Can') + 0.1, 'pop', 0.8);
    sfx(W('By'), 'swoosh', 0.7); sfx(W('By') + 0.1, 'pop', 0.8);
    S.pills.forEach((q, i) => i % 2 === 0 && sfx(q.at + 0.02, 'blip', 0.35));
    sfx(4.3, 'whoosh_down', 0.9); sfx(4.45, 'flip', 0.7);
    for (let k = 0; k < 4; k++) { sfx(5.25 + k * 0.6, 'key', 0.8); sfx(5.55 + k * 0.6, 'key', 0.8); }
    sfx(6.0, 'type', 0.5, { dur: 0.9 });
    sfx(7.47, 'whoosh_down', 0.6);
    sfx(9.07, 'pop', 0.5);
    sfx(W('lose') + 0.1, 'stamp', 1.0);
    sfx(10.2, 'fall', 0.7);
  },

  update(t) {
    const S = this;
    // ---- background mode ----
    const toNight = p(t, 4.25, 0.28, ease.inOutCubic);
    const toGrey = p(t, 7.45, 0.3, ease.inOutCubic);
    const outDark = p(t, 10.18, 0.2, ease.inOutCubic); // problem -> dark before the mascot drops
    set(S.night, { opacity: (toNight * (1 - toGrey) + outDark).toFixed(3) });
    set(S.grey, { opacity: (toGrey * (1 - outDark)).toFixed(3) });
    set(S.nightDots, { opacity: (toNight * 0.9).toFixed(3) });
    const gd = noise1(t * 0.35) * 30;
    set(S.g1, { transform: tf({ x: gd, y: -gd * 0.6 }), opacity: (1 - toNight).toFixed(3) });
    set(S.g2, { transform: tf({ x: -gd, y: gd * 0.5 }), opacity: (1 - toNight).toFixed(3) });
    this.dark = toNight > 0.5;

    // ---- sticker layer: dims into the background at night ----
    const kN = toNight, kG = toGrey;
    const bright = lerp(1, 0.56, kN) + kG * 0.14;
    const flt = kN > 0.001 ? `invert(${(0.78 * kN).toFixed(3)}) brightness(${bright.toFixed(3)}) saturate(${(1 - 0.6 * kN).toFixed(3)}) blur(${(2.2 * kN + outDark * 6).toFixed(2)}px)` : 'none';
    const camS = 1 + 0.03 * p(t, 2, 2.3, ease.lin) + 0.17 * kN - 0.06 * kG + 0.02 * p(t, 7.6, 2.6, ease.lin);
    set(S.stkLayer, { filter: flt, transform: tf({ s: camS }), opacity: (1 - outDark).toFixed(3) });
    show(S.stkLayer, t > 2.2);
    const stk = (el, at, x0, y0, x1, y1, r0, r1) => {
      const k = spring(t, at, 2.6, 0.62), s = pop(t, at, 3.4, 0.5);
      set(el, { left: `${lerp(x0, x1, k).toFixed(1)}px`, top: `${lerp(y0, y1, k).toFixed(1)}px`, transform: tf({ r: lerp(r0, r1, k), s: lerp(0.35, 1, clamp(s, 0, 1.3)) }), opacity: String(clamp((t - at) / 0.06)) });
      show(el, t >= at);
    };
    stk(S.A, W('What'), 760, 420, 138, 132, -14, -4);
    stk(S.B, W('Can'), 150, 470, 556, 362, 10, 3);
    stk(S.Cs, W('By'), 700, 760, 236, 668, -8, -2);
    for (const q of S.pills) {
      const s = pop(t, q.at, 3.6, 0.45);
      set(q.el, { transform: tf({ r: q.r, s: clamp(s, 0, 1.25) }), opacity: String(clamp((t - q.at) / 0.05)) });
      show(q.el, t >= q.at);
    }
    const ca = 3.52;
    show(S.cnt, t >= ca);
    set(S.cnt, { opacity: (clamp((t - ca) / 0.1) * (1 - kN)).toFixed(3), transform: tf({ y: (1 - p(t, ca, 0.25)) * 30 }) });
    txt(S.cntN, String(Math.round(3 + 344 * Math.pow(inv(ca, 4.35, t), 1.6))));

    // ---- headline ----
    S.hl1.update(t, 2.1); S.hl2.update(t, 2.1);

    // ---- hearts float up the right edge of the phone ----
    for (const q of S.hearts) {
      const a = t - q.at, life = 1.15;
      if (a < 0 || a > life || t > 2.3) { show(q.el, false); continue; }
      show(q.el, true);
      const k = a / life, s = clamp(pop(t, q.at, 4, 0.5), 0, 1.3);
      set(q.el, { left: `${(q.x + Math.sin(q.sw + a * 5) * 16).toFixed(1)}px`, top: `${(q.y0 - k * 380).toFixed(1)}px`,
                  transform: tf({ s, r: Math.sin(q.sw + a * 4) * 14 }), opacity: (1 - p(t, q.at + life - 0.3, 0.3)).toFixed(3) });
    }

    const mins = 62 + Math.floor(clamp((t - 4.7) / 2.7) * 72);
    txt(S.clockH, `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`);
    // ---- phone ----
    const fly = spring(t, 0, 2.1, 0.68);
    const flipA = p(t, 4.4, 0.16, ease.inCubic), flipB = p(t, 4.56, 0.2, ease.outCubic);
    const move = p(t, 4.4, 0.36, ease.inOutCubic);
    let ry = lerp(-14, -90, flipA);
    if (t >= 4.56) ry = lerp(90, 0, flipB);
    const fl = noise1(t * 0.6 + 4) * (1 - move);
    const drop = p(t, 10.2, 0.26, ease.inCubic);
    set(S.ph, { transform: `translate(${(lerp(520, 0, fly) - 500 * move + fl * 6).toFixed(1)}px, ${(lerp(700, 0, fly) + fl * 8 + drop * 1050).toFixed(1)}px) ` +
      `perspective(2400px) rotateY(${ry.toFixed(2)}deg) rotateX(${(lerp(4, 0, move)).toFixed(2)}deg) rotate(${(lerp(-28, -5, fly) * (1 - move) + fl * 1.2 + drop * 24).toFixed(2)}deg)` });
    show(S.ph, t < 10.64);
    const scr = t < 4.56 ? 'reel' : t < 7.5 ? 'notes' : 'chat';
    show(S.reel, scr === 'reel'); show(S.notes, scr === 'notes' || (t >= 7.5 && t < 7.62)); show(S.chat, scr === 'chat');
    set(S.chat, { opacity: String(clamp((t - 7.5) / 0.12)) });
    set(S.ph.status, { color: scr === 'reel' ? '#fff' : INK });
    txt(S.ph.status.firstChild, scr === 'notes' ? S.clockH.textContent : '9:41');
    const lk = inv(0.4, 3.6, t);
    txt(S.likes, (36.2 + 12 * lk).toFixed(1) + 'K'); txt(S.cmts, L.fmt(2563 + 849 * lk)); txt(S.shares, (7.4 + 2.5 * lk).toFixed(1) + 'K');
    // badge counts the pings
    const ba = 2.35, bk = pop(t, ba, 3.5, 0.45);
    const n = Math.floor(1 + 98 * Math.pow(inv(ba, 3.95, t), 1.5));
    txt(S.ph.badge, n >= 99 ? '99+' : String(n));
    set(S.ph.badge, { transform: tf({ s: clamp(bk, 0, 1.3) * (1 + 0.12 * Math.max(0, Math.sin((t - ba) * 40)) * (t < 3.95 ? 1 : 0)) }) });
    show(S.ph.badge, t >= ba);
    // notes: one link pasted per ⌘V
    const pastes = [5.55, 6.15, 6.75, 7.35];
    S.links.forEach((el, i) => {
      const at = i === 0 ? 4.62 : pastes[i - 1];
      show(el, t >= at);
      const k = spring(t, at, 3, 0.6);
      set(el, { transform: tf({ s: lerp(0.6, 1, clamp(k, 0, 1.2)) }), opacity: String(clamp((t - at) / 0.06)) });
    });
    // chat bubbles
    const bub = (el, at, d) => { show(el, t >= at); show(d, t >= at); set(el, { transform: tf({ s: clamp(pop(t, at, 3.4, 0.55), 0, 1.2) }) }); };
    bub(S.b1, 7.6, S.d1); bub(S.b2, 7.92, S.d2); bub(S.b3, 9.07, S.d3);
    const sa = W('lose') + 0.1, sk = p(t, sa, 0.16, ease.outCubic);
    show(S.stamp, t >= sa);
    set(S.stamp, { transform: tf({ r: -11, s: lerp(2.2, 1, sk) }), opacity: sk.toFixed(3) });

    // ---- trending tag ----
    const tk = pop(t, 1.33, 3.2, 0.48), tout = p(t, 2.02, 0.22, ease.inCubic);
    show(S.trend, t >= 1.33 && tout < 1);
    set(S.trend, { transform: tf({ x: -tout * 160, y: -tout * 120, r: -9 - tout * 20, s: clamp(tk, 0, 1.3) * (1 - tout * 0.4) }), opacity: (1 - tout).toFixed(3) });

    // ---- 1 AM UI ----
    const nightOut = p(t, 7.42, 0.2, ease.inCubic);
    const nb = (el, at, dy = 30) => { const k = p(t, at, 0.3); show(el, t >= at && nightOut < 1);
      set(el, { opacity: (k * (1 - nightOut)).toFixed(3), transform: tf({ y: (1 - k) * dy }), filter: nightOut > 0 ? `blur(${(nightOut * 10).toFixed(1)}px)` : 'none' }); };
    nb(S.clock, 4.7, 50); nb(S.still, 6.0, 0); nb(S.saved, 4.95, 40);
    type(S.still, 'STILL PASTING LINKS…', t, 6.0, 24);
    txt(S.savedN, String(pastes.filter(x => t >= x).length));
    txt(S.ofN, String(Math.round(351 + 261 * inv(4.95, 7.4, t))));
    const key = (el, at, presses) => {
      const k = pop(t, at, 3.4, 0.5);
      let dn = 0; for (const pt of presses) { const a = t - pt; if (a >= 0 && a < 0.2) dn = Math.max(dn, a < 0.05 ? a / 0.05 : 1 - (a - 0.05) / 0.15); }
      show(el, t >= at && nightOut < 1);
      set(el, { transform: tf({ y: dn * 10, s: clamp(k, 0, 1.3) }), boxShadow: `0 ${12 - dn * 10}px 0 #8b8983, 0 ${12 - dn * 10}px 0 4px ${INK}`, opacity: (1 - nightOut).toFixed(3) });
    };
    key(S.kC, 5.0, [0, 1, 2, 3].map(k => 5.25 + k * 0.6)); key(S.kV, 5.1, pastes);

    // ---- miss / lose ----
    S.m1.update(t, 10.16); S.m2.update(t, 10.16);
  },
});
})();
