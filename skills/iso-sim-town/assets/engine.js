/* iso-sim-town engine: a late-1990s isometric sim game drawn entirely with Canvas 2D.
   No libraries, no images. Load it at the end of <body>, then call defineTowns([...]).

   CONTRACT
   defineTowns([{ name: 'Brownstone Heights', gen: () => map }, ...])
     Up to 9 towns. The folder button / M / 1-9 switch between them.

   A gen() builds a map with the helpers below and returns it:
     const m = newMap(kind, N)       kind: 'city' (lane markings + crosswalks on road tiles),
                                     'winter' (falling snow, placed props get snow), anything else.
     m.tiles[i * N + j] = T.G|T.R|T.W|T.S|T.K|T.Z   grass, road, sidewalk, snow, cobble path, plaza
     addObj(m, { kind:'bld', i, j, w, d, h, wall, trim, roof, roofCol, ...flags })   -> null if blocked
        roof: 'flat' | 'gable' | 'mansard' | 'pyramid'; rh = roof height; h = wall height (17 px / floor)
        win: 'rect' | 'arch' | 'tall' | 'wide'; fh floor height; cell window spacing
        flags: brick, timber, ivy, ivyFlowers:'#hex', shop:'#awning', sign, door, doorCol, stoop, wreath,
               shutters:'#hex', flowers, fire (fire escapes), tank (water tower), clock, spire,
               snow (snowy roof), warm (lit windows by day), icing, lights (blinking xmas lights)
     addObj(m, { kind, i, j, w?, d?, scale?, snow? })   props: tree conifer xmas lamp bench fountain
        statue bush pot snowman busstop hydrant (fountain/xmas can be w=d=2)
     m.cars.push({ axis:'a'|'b', lane, dir:±1, pos, v:0, speed, col, taxi?, jeep? })
        cars drive along roads on a 10-tile period (road bands at k*10, k*10+1); they yield at crossings
     loopPed(m, [[a,b], ...], R, speed)   a pedestrian walking a closed loop of tile coords
     m.cam = P(a, b)                      starting camera centre
   Utilities: P(a,b,z) iso projection, mulberry(seed) RNG, hash(i,j,k), pick(R, arr), free(m,i,j,w,d)

   RENDERING: scene -> 640x360-ish buffer (PIX=2) -> 8x9x7 palette + Bayer dither -> nearest-neighbour
   upscale. Objects are cached as sprites per zoom and day/night. Keys: drag/WASD pan, wheel/+/- zoom,
   N night, P pixel size, X dither, M next town, Esc cancel. URL: #2 opens town 2, #2n at night.
*/
(() => {
const style = document.createElement('style');
style.textContent = `
  @font-face{font-family:W98;src:url('https://cdn.jsdelivr.net/npm/98.css@0.1.21/fonts/converted/ms_sans_serif.woff2') format('woff2');font-weight:400}
  @font-face{font-family:W98;src:url('https://cdn.jsdelivr.net/npm/98.css@0.1.21/fonts/converted/ms_sans_serif_bold.woff2') format('woff2');font-weight:700}
  :root{--face:#c0c0c0;--hi:#fff;--lt:#dfdfdf;--sh:#808080;--dk:#0a0a0a}
  html,body{margin:0;height:100%;background:#000;overflow:hidden;font:11px W98,Tahoma,sans-serif;color:#000;user-select:none;-webkit-user-select:none;-webkit-font-smoothing:none}
  #view{display:block;width:100vw;height:100vh;touch-action:none;image-rendering:pixelated}
  #view.drag{cursor:move} #view.place{cursor:crosshair}
  .raised{background:var(--face);box-shadow:inset -1px -1px var(--dk),inset 1px 1px var(--hi),inset -2px -2px var(--sh),inset 2px 2px var(--lt)}
  .sunken{background:var(--face);box-shadow:inset -1px -1px var(--hi),inset 1px 1px var(--sh),inset -2px -2px var(--lt),inset 2px 2px var(--dk)}
  .bar{position:fixed;display:flex;align-items:center;padding:3px 4px 3px 3px;z-index:5}
  #tl{top:4px;left:4px} #tr{top:4px;right:4px}
  .grip{width:3px;height:30px;margin:0 4px 0 1px;box-shadow:inset -1px -1px var(--sh),inset 1px 1px var(--hi)}
  .sep{width:2px;height:30px;margin:0 4px;box-shadow:inset -1px 0 var(--hi),inset 1px 0 var(--sh)}
  .btn{width:38px;height:36px;border:0;padding:0;cursor:pointer;display:grid;place-items:center;background:var(--face);
       box-shadow:inset -1px -1px var(--dk),inset 1px 1px var(--hi),inset -2px -2px var(--sh),inset 2px 2px var(--lt)}
  .btn:active,.btn.on{box-shadow:inset -1px -1px var(--hi),inset 1px 1px var(--dk),inset -2px -2px var(--lt),inset 2px 2px var(--sh)}
  .btn.on{background:repeating-conic-gradient(#c0c0c0 0 25%,#fff 0 50%) 0 0/2px 2px}
  .btn:active canvas,.btn.on canvas{transform:translate(1px,1px)}
  .btn canvas{width:28px;height:26px;image-rendering:pixelated;pointer-events:none}
  .btn.sm{width:24px;height:22px} .btn.sm canvas{width:16px;height:15px}
  #status{position:fixed;left:0;right:0;bottom:0;height:28px;display:flex;align-items:center;gap:3px;padding:0 3px;z-index:5}
  .field{height:20px;line-height:20px;padding:0 8px;white-space:nowrap;overflow:hidden;box-sizing:border-box}
  #sTown{min-width:140px;font-weight:700} #sFunds{min-width:80px} #sPop{min-width:90px}
  .grow{flex:1}
  #lcd{width:200px;padding:3px 3px;background:#000}
  #lcd canvas{width:100%;height:14px;display:block;image-rendering:pixelated}
  #panel{position:fixed;top:54px;right:4px;width:334px;max-width:calc(100vw - 8px);padding:3px;display:none;z-index:6;box-sizing:border-box}
  #panel.open{display:block}
  .title{background:linear-gradient(90deg,#000080,#1084d0);color:#fff;font-weight:700;height:18px;display:flex;align-items:center;justify-content:space-between;padding:0 2px 0 4px}
  .title button{width:16px;height:14px;border:0;padding:0;font:700 8px W98,sans-serif;cursor:pointer}
  #tabs{display:flex;padding:6px 6px 0}
  #tabs button{width:40px;height:28px;border:0;margin-right:-1px;padding:0;cursor:pointer;display:grid;place-items:center;position:relative;top:2px;
       background:var(--face);border-radius:3px 3px 0 0;box-shadow:inset -1px 0 var(--dk),inset 1px 1px var(--hi),inset -2px 0 var(--sh)}
  #tabs button.on{top:0;height:30px;z-index:1}
  #tabs canvas{width:30px;height:26px;image-rendering:pixelated;pointer-events:none}
  .pane{margin:0 6px;padding:8px;box-shadow:inset -1px -1px var(--dk),inset 1px 1px var(--hi),inset -2px -2px var(--sh)}
  #grid{display:grid;grid-template-columns:repeat(4,70px);gap:4px;justify-content:center}
  #grid button{width:70px;height:62px;border:0;padding:0;cursor:pointer;background:#4d6b3c;
       box-shadow:inset -1px -1px var(--hi),inset 1px 1px var(--sh),inset -2px -2px var(--lt),inset 2px 2px var(--dk)}
  #grid button:hover{background:#5d7d49}
  #grid button.on{background:#7f9f5c;outline:1px dotted #000;outline-offset:1px}
  #grid canvas{width:70px;height:62px;display:block;image-rendering:pixelated;pointer-events:none}
  #label{margin:6px}
  #toast{position:fixed;left:50%;top:56px;transform:translateX(-50%);background:#ffffe1;border:1px solid #000;padding:3px 6px;display:none;z-index:9}
  #fade{position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .35s;z-index:8}
  @media (max-width:640px){ #sPop,#sDate,#sFunds{display:none} #lcd{width:110px} #sTown{min-width:0} }
`;
document.head.appendChild(style);
if (!document.querySelector('link[href*="VT323"]')) document.head.insertAdjacentHTML('beforeend', '<link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet">');
document.body.insertAdjacentHTML('afterbegin', `
<canvas id="view"></canvas>

<div class="bar raised" id="tl"><div class="grip"></div>
  <button class="btn" id="bSave" title="Save town"><canvas width="28" height="26"></canvas></button>
  <button class="btn" id="bOpen" title="Next town (M)"><canvas width="28" height="26"></canvas></button>
  <div class="sep"></div>
  <button class="btn" id="bZoomIn" title="Zoom in (+)"><canvas width="28" height="26"></canvas></button>
  <button class="btn" id="bZoomOut" title="Zoom out (-)"><canvas width="28" height="26"></canvas></button>
</div>
<div class="bar raised" id="tr"><div class="grip"></div>
  <button class="btn" id="bProps" title="Props"><canvas width="28" height="26"></canvas></button>
  <button class="btn" id="bDoze" title="Bulldoze"><canvas width="28" height="26"></canvas></button>
</div>
<div id="status" class="raised">
  <div class="field sunken" id="sTown"></div>
  <div class="field sunken" id="sPop"></div>
  <div class="field sunken" id="sFunds"></div>
  <div class="field sunken" id="sDate"></div>
  <div class="grow"></div>
  <button class="btn sm" id="bNight" title="Day / night (N)"><canvas width="16" height="15"></canvas></button>
  <button class="btn sm" id="bPrev" title="Previous track"><canvas width="16" height="15"></canvas></button>
  <button class="btn sm" id="bPlay" title="Play / pause music"><canvas width="16" height="15"></canvas></button>
  <button class="btn sm" id="bNext" title="Next track"><canvas width="16" height="15"></canvas></button>
  <div id="lcd" class="sunken field"><canvas width="194" height="14"></canvas></div>
</div>

<div id="panel" class="raised">
  <div class="title"><span>Props</span><button id="bClose" class="raised" aria-label="Close">✕</button></div>
  <div id="tabs"></div>
  <div class="pane"><div id="grid"></div></div>
  <div id="label" class="field sunken">&nbsp;</div>
</div>
<div id="toast"></div>
<div id="fade"></div>

`);
})();

'use strict';
/* ============================================================
   Iso Town: everything below is painted with Canvas 2D.
   World space: tile (a,b) -> screen x=(a-b)*32, y=(a+b)*16 - z
   ============================================================ */

// ---------- utils ----------
const P = (a, b, z = 0) => ({ x: (a - b) * 32, y: (a + b) * 16 - z });
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(i, j, k = 0) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1103515245)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];

let NIGHT = false;
const rgbC = {}, colC = new Map();
function rgb(h) { if (rgbC[h]) return rgbC[h]; const n = parseInt(h.slice(1), 16); return rgbC[h] = [n >> 16, (n >> 8) & 255, n & 255]; }
// colour with shade factor k, alpha a; automatically goes moonlit at night
function C(h, k = 1, a = 1) {
  k = Math.round(k * 50) / 50;
  const key = h + k + a + NIGHT;
  let s = colC.get(key); if (s) return s;
  let [r, g, b] = rgb(h); r *= k; g *= k; b *= k;
  if (NIGHT) { r = r * .30 + 10; g = g * .34 + 16; b = b * .48 + 44; }
  s = `rgba(${Math.min(255, r | 0)},${Math.min(255, g | 0)},${Math.min(255, b | 0)},${a})`;
  colC.set(key, s); return s;
}
function poly(c, pts, fill, stroke, lw = 1) {
  c.beginPath(); c.moveTo(pts[0].x, pts[0].y);
  for (let k = 1; k < pts.length; k++) c.lineTo(pts[k].x, pts[k].y);
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}
function circle(c, x, y, r, fill) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }
function ellipse(c, x, y, rx, ry, fill) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); }
function line(c, p, q, stroke, lw = 1) { c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }

// iso box: a0..a1 x b0..b1 x z0..z1
function box(c, a0, b0, a1, b1, z0, z1, col, topCol) {
  poly(c, [P(a0, b1, z0), P(a1, b1, z0), P(a1, b1, z1), P(a0, b1, z1)], C(col, .96));
  poly(c, [P(a1, b1, z0), P(a1, b0, z0), P(a1, b0, z1), P(a1, b1, z1)], C(col, .72));
  poly(c, [P(a0, b0, z1), P(a1, b0, z1), P(a1, b1, z1), P(a0, b1, z1)], C(topCol || col, 1.12));
}
// run fn in a face's local 2D space: s along the wall (32px per tile), y up is negative
function onFace(c, side, a0, b0, a1, b1, z0, fn) {
  c.save();
  if (side === 'L') { const o = P(a0, b1, z0); c.transform(1, .5, 0, 1, o.x, o.y); fn((a1 - a0) * 32); }
  else { const o = P(a1, b1, z0); c.transform(1, -.5, 0, 1, o.x, o.y); fn((b1 - b0) * 32); }
  c.restore();
}

// low-res grain, stamped over every sprite and the ground like a cheap diffuse texture
const GRAIN = (() => {
  const p = document.createElement('canvas'); p.width = p.height = 48; const g = p.getContext('2d'), R = mulberry(9);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const r = R();
    if (r < .34) { g.fillStyle = `rgba(0,0,0,${.03 + R() * .05})`; g.fillRect(x, y, 1, 1); }
    else if (r < .56) { g.fillStyle = `rgba(255,255,255,${.02 + R() * .04})`; g.fillRect(x, y, 1, 1); }
  }
  return p;
})();
// brick texture tile, skewed onto faces by the face transform
const BRICK = (() => {
  const p = document.createElement('canvas'); p.width = 12; p.height = 6; const g = p.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(0, 2, 12, 1); g.fillRect(0, 5, 12, 1);
  g.fillRect(0, 0, 1, 2); g.fillRect(6, 3, 1, 2);
  g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(2, 0, 3, 2); g.fillRect(8, 3, 3, 2);
  g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(9, 0, 2, 2); g.fillRect(1, 3, 3, 2);
  return p;
})();

// ============================================================
//  BUILDINGS
// ============================================================
function faceContent(c, o, S, H, side) {
  const k = side === 'L' ? 1 : .74;
  const R = mulberry(o.seed * 7 + (side === 'L' ? 1 : 2));
  c.fillStyle = C(o.wall, k); c.fillRect(0, -H, S, H);
  if (o.brick) { c.fillStyle = c.createPattern(BRICK, 'repeat'); c.fillRect(0, -H, S, H); }
  // weathering streaks
  for (let n = 0; n < S / 10; n++) { c.fillStyle = `rgba(0,0,0,${.03 + R() * .05})`; c.fillRect(R() * S, -H + R() * H * .3, 1 + R() * 3, H * (.2 + R() * .6)); }

  const fh = o.fh || 17, nf = Math.max(1, Math.floor((H - 5) / fh));
  const cell = o.cell || 13, nc = Math.max(1, Math.floor((S - 4) / cell)), off = (S - nc * cell) / 2;
  const ww = o.win === 'wide' ? cell - 3 : 6, wh = o.win === 'tall' ? 11 : 9;

  if (o.timber) {
    c.fillStyle = C('#4a2d1e', k);
    for (let f = 0; f <= nf; f++) c.fillRect(0, -f * fh - 2, S, 2.5);
    for (let x = 0; x <= nc; x++) {
      const bx = off + x * cell - 1; c.fillRect(bx, -H, 2.5, H);
      if (x < nc && (x + nf) % 2 === 0) for (let f = 0; f < nf; f++) {
        c.beginPath(); c.moveTo(bx, -f * fh); c.lineTo(bx + cell, -(f + 1) * fh);
        c.strokeStyle = C('#4a2d1e', k); c.lineWidth = 2; c.stroke();
      }
    }
  }

  const wins = [];
  let startF = 0;
  const hasShop = o.shop && (side === 'L' || o.shopBoth);
  if (hasShop) {
    c.fillStyle = C('#2a2c30', k); c.fillRect(1, -fh + 1, S - 2, fh - 1);
    for (let x = 0; x < nc; x++) {
      const gx = off + x * cell + 1.5;
      c.fillStyle = C('#46606f', k); c.fillRect(gx, -fh + 5, cell - 3, fh - 7);
      c.fillStyle = C('#9fc0d0', k, .45); c.fillRect(gx + 1, -fh + 6, 2, fh - 9);
      wins.push([gx, -fh + 5, cell - 3, fh - 7, .75]);
    }
    // striped awning
    c.fillStyle = C(o.shop, k); c.fillRect(-1, -fh - 2, S + 2, 7);
    c.fillStyle = C('#f4efe4', k); for (let x = 2; x < S; x += 8) c.fillRect(x, -fh - 2, 4, 7);
    c.fillStyle = C('#000', 1, .25); c.fillRect(-1, -fh + 5, S + 2, 1.5);
    // sign
    if (S > 40) {
      c.fillStyle = C(o.sign || '#c62a2a', k); c.fillRect(S * .25, -fh - 11, S * .5, 8);
      c.fillStyle = C('#fff3d6', k); for (let x = S * .3; x < S * .7; x += 4) c.fillRect(x, -fh - 8.5, 2.5, 3);
    }
    startF = 1;
  }
  const doorCol = Math.floor(nc / 2);
  const hasDoor = o.door && side === 'L' && !hasShop;
  if (hasDoor) {
    const dx = off + doorCol * cell + cell / 2 - 4;
    c.fillStyle = C(o.trim, k); c.fillRect(dx - 2, -15, 12, 15);
    c.fillStyle = C(o.doorCol || '#4b2a1a', k); c.fillRect(dx, -13, 8, 13);
    if (o.warm || NIGHT) { c.fillStyle = 'rgba(255,205,120,.85)'; c.fillRect(dx + 1, -12, 6, 2); }
    if (o.stoop) { for (let s = 0; s < 3; s++) { c.fillStyle = C('#8a7c6e', k * (1 - s * .08)); c.fillRect(dx - 3 - s * 2, -3 + s * 1, 14 + s * 4, 2.2); } }
    if (o.wreath) { circle(c, dx + 4, -22, 4.5, C('#2f6b2f', k)); circle(c, dx + 4, -22, 2.2, C(o.wall, k)); circle(c, dx + 4, -18, 1.5, C('#d1202a', k)); }
  }
  for (let f = startF; f < nf; f++) {
    const y = -(f + 1) * fh + (fh - wh) / 2 - 1;
    for (let x = 0; x < nc; x++) {
      if (hasDoor && f === 0 && x === doorCol) continue;
      const wx = off + x * cell + (cell - ww) / 2;
      c.fillStyle = C(o.trim, k);
      if (o.win === 'arch') { c.beginPath(); c.moveTo(wx - 1, y + wh + 1); c.lineTo(wx - 1, y + 2); c.arc(wx + ww / 2, y + 2, ww / 2 + 1, Math.PI, 0); c.lineTo(wx + ww + 1, y + wh + 1); c.fill(); }
      else c.fillRect(wx - 1, y - 1, ww + 2, wh + 2);
      c.fillStyle = C(o.glass || '#26303a', k);
      if (o.win === 'arch') { c.beginPath(); c.moveTo(wx, y + wh); c.lineTo(wx, y + 2); c.arc(wx + ww / 2, y + 2, ww / 2, Math.PI, 0); c.lineTo(wx + ww, y + wh); c.fill(); }
      else c.fillRect(wx, y, ww, wh);
      c.fillStyle = C('#8fb3d0', k, .38); c.fillRect(wx, y, ww, wh * .4); // sky reflection
      c.fillStyle = C('#c9e0f0', k, .5); c.fillRect(wx + .5, y + .5, 1, wh * .4);
      c.fillStyle = C(o.trim, k * .9); c.fillRect(wx - 1.5, y + wh + 1, ww + 3, 1.5); // sill
      if (o.shutters) { c.fillStyle = C(o.shutters, k); c.fillRect(wx - 3.5, y, 2.2, wh); c.fillRect(wx + ww + 1.3, y, 2.2, wh); }
      if (o.flowers && f === startF + 0 && R() < .7) { for (let q = 0; q < 4; q++) circle(c, wx + q * 2, y + wh + 2, 1.3, C(pick(R, ['#d8283a', '#f26d9a', '#ffd23f']), k)); }
      wins.push([wx, y, ww, wh, .5]);
    }
    if (o.fire && side === 'R' && f >= 1) {
      c.strokeStyle = C('#15161a', 1); c.lineWidth = 1;
      const fx = off + cell * .2, fw = Math.min(S - fx - 2, cell * 2.2);
      c.strokeRect(fx, y + wh + 1, fw, 0.01);
      c.beginPath(); c.moveTo(fx, y + wh + 1); c.lineTo(fx, y + wh - 5); c.moveTo(fx + fw, y + wh + 1); c.lineTo(fx + fw, y + wh - 5); c.moveTo(fx, y + wh - 5); c.lineTo(fx + fw, y + wh - 5);
      c.moveTo(fx + fw * .15, y + wh + 1); c.lineTo(fx + fw * .85, y + wh + 1 + fh); c.stroke();
    }
  }
  // cornice
  c.fillStyle = C(o.trim, k * .95); c.fillRect(-1, -H, S + 2, 4);
  c.fillStyle = C('#000', 1, .2); c.fillRect(-1, -H + 4, S + 2, 1);
  c.fillStyle = C(o.trim, k * .8); for (let x = 1; x < S; x += 4) c.fillRect(x, -H + 5, 2, 2);
  if (o.icing) { c.fillStyle = C('#ffffff', k); for (let x = 0; x < S; x += 5) { c.beginPath(); c.arc(x + 2.5, -H + 4, 2.5, 0, Math.PI); c.fill(); } }
  if (o.ivy) {
    for (let n = 0; n < S * H / 60; n++) {
      const x = R() * S, y = -R() * R() * H * 1.05;
      circle(c, x, y, 1.5 + R() * 2.5, C(pick(R, ['#2f6a25', '#3d7f2e', '#4f9336', '#285a20']), k));
    }
    if (o.ivyFlowers) for (let n = 0; n < S * H / 120; n++) circle(c, R() * S, -R() * R() * H, 1.4, C(o.ivyFlowers, k));
  }
  if (o.clock) {
    const cx = S / 2, cy = -H + 24;
    circle(c, cx, cy, 11, C(o.trim, k * .8)); circle(c, cx, cy, 9, C('#f5ecd2', k));
    c.strokeStyle = C('#222', 1); c.lineWidth = 1.3; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy - 6); c.moveTo(cx, cy); c.lineTo(cx + 4, cy + 1); c.stroke();
  }
  // baked lighting: sky bounce at the top, ambient occlusion at the base, falloff across the wall
  { const g = c.createLinearGradient(0, -H, 0, 0); g.addColorStop(0, 'rgba(255,244,214,.12)'); g.addColorStop(.3, 'rgba(0,0,0,0)'); g.addColorStop(Math.max(.35, 1 - 18 / H), 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,10,30,.38)'); c.fillStyle = g; c.fillRect(0, -H, S, H); }
  { const g = c.createLinearGradient(0, 0, S, 0);
    if (side === 'L') { g.addColorStop(0, 'rgba(0,0,0,.10)'); g.addColorStop(1, 'rgba(255,250,230,.07)'); }
    else { g.addColorStop(0, 'rgba(0,0,20,.16)'); g.addColorStop(1, 'rgba(0,0,0,0)'); }
    c.fillStyle = g; c.fillRect(0, -H, S, H); }
  // night: lit windows (colour not moonlit)
  for (let n = 0; n < wins.length; n++) {
    const [x, y, w, h, p] = wins[n];
    const lit = o.warm ? hash(o.seed, n, 3) < .8 : NIGHT && hash(o.seed, n, 9) < p;
    if (!lit) continue;
    const warmDay = !NIGHT;
    c.fillStyle = warmDay ? 'rgba(255,196,96,.85)' : `rgba(255,${200 + hash(o.seed, n, 4) * 40 | 0},120,.95)`;
    c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(120,70,20,.35)'; c.fillRect(x + w / 2 - .4, y, .8, h);
  }
}

function drawRoof(c, o) {
  const a0 = o.i, b0 = o.j, a1 = o.i + o.w, b1 = o.j + o.d, z = o.h, rc = o.roofCol;
  const snowLip = (p, q) => { if (o.snow) line(c, p, q, C('#ffffff'), 3); };
  if (o.roof === 'flat') {
    poly(c, [P(a0, b0, z), P(a1, b0, z), P(a1, b1, z), P(a0, b1, z)], C(o.trim, .9));
    const e = .1;
    poly(c, [P(a0 + e, b0 + e, z), P(a1 - e, b0 + e, z), P(a1 - e, b1 - e, z), P(a0 + e, b1 - e, z)], C(rc, 1));
    poly(c, [P(a0 + e, b0 + e, z), P(a1 - e, b0 + e, z), P(a1 - e, b0 + e + .06, z), P(a0 + e + .06, b0 + e + .06, z), P(a0 + e + .06, b1 - e, z), P(a0 + e, b1 - e, z)], C('#000', 1, .18));
    const R = mulberry(o.seed + 99);
    if (o.w * o.d >= 2) {
      const ha = a0 + .3 + R() * (o.w - .8), hb = b0 + .3 + R() * (o.d - .8);
      box(c, ha, hb, ha + .3, hb + .3, z, z + 5, '#8d8a86');
    }
    if (o.tank) {
      const ta = a0 + o.w * .3, tb = b0 + o.d * .3, p = P(ta, tb, z);
      c.strokeStyle = C('#2a2522'); c.lineWidth = 1.2;
      c.beginPath(); for (const dx of [-7, -2, 3, 7]) { c.moveTo(p.x + dx, p.y); c.lineTo(p.x + dx * .8, p.y - 14); } c.stroke();
      c.fillStyle = C('#7a4f2e', .95); c.fillRect(p.x - 9, p.y - 32, 18, 18);
      ellipse(c, p.x, p.y - 14, 9, 3.5, C('#7a4f2e', .8));
      c.fillStyle = C('#5d3a20'); for (let y = -30; y < -14; y += 4) c.fillRect(p.x - 9, p.y + y, 18, 1);
      c.beginPath(); c.moveTo(p.x - 10, p.y - 32); c.lineTo(p.x, p.y - 42); c.lineTo(p.x + 10, p.y - 32); c.fillStyle = C('#3b2a20'); c.fill();
    }
  } else if (o.roof === 'gable') {
    if (o.w >= o.d) {
      const bm = (b0 + b1) / 2, rh = o.rh || o.d * 13;
      poly(c, [P(a0, b0, z), P(a1, b0, z), P(a1, bm, z + rh), P(a0, bm, z + rh)], C(rc, .78));
      poly(c, [P(a1, b1, z), P(a1, b0, z), P(a1, bm, z + rh)], C(o.wall, .74));
      if (o.timber) line(c, P(a1, bm, z), P(a1, bm, z + rh * .8), C('#4a2d1e', .74), 2);
      poly(c, [P(a0, b1, z), P(a1, b1, z), P(a1, bm, z + rh), P(a0, bm, z + rh)], C(rc, 1));
      if (!o.snow) { c.save(); c.clip(); c.globalAlpha = .18; for (let t = .1; t < 1; t += .12) line(c, P(a0, b1 - (b1 - bm) * t, z + rh * t), P(a1, b1 - (b1 - bm) * t, z + rh * t), '#000', .8); c.restore(); }
      else { const R = mulberry(o.seed); for (let n = 0; n < o.w * 6; n++) { const t = R(), u = R(); const p = P(a0 + t * o.w, b1 - (b1 - bm) * u, z + rh * u); circle(c, p.x, p.y, 1 + R() * 1.5, 'rgba(180,200,225,.5)'); } }
      snowLip(P(a0, b1, z), P(a1, b1, z)); snowLip(P(a1, b1, z), P(a1, bm, z + rh)); snowLip(P(a1, bm, z + rh), P(a1, b0, z));
      line(c, P(a0, bm, z + rh), P(a1, bm, z + rh), o.snow ? C('#ffffff') : C(rc, .6), 1.5);
    } else {
      const am = (a0 + a1) / 2, rh = o.rh || o.w * 13;
      poly(c, [P(a0, b0, z), P(a0, b1, z), P(am, b1, z + rh), P(am, b0, z + rh)], C(rc, .9));
      poly(c, [P(a0, b1, z), P(a1, b1, z), P(am, b1, z + rh)], C(o.wall, 1));
      if (o.timber) line(c, P(am, b1, z), P(am, b1, z + rh * .8), C('#4a2d1e'), 2);
      poly(c, [P(a1, b0, z), P(a1, b1, z), P(am, b1, z + rh), P(am, b0, z + rh)], C(rc, .74));
      snowLip(P(a1, b0, z), P(a1, b1, z)); snowLip(P(a0, b1, z), P(am, b1, z + rh)); snowLip(P(am, b1, z + rh), P(a1, b1, z));
      line(c, P(am, b0, z + rh), P(am, b1, z + rh), o.snow ? C('#ffffff') : C(rc, .6), 1.5);
    }
  } else { // mansard / pyramid
    const e = o.roof === 'pyramid' ? Math.min(o.w, o.d) / 2 : .3, rh = o.rh || 16;
    const B00 = P(a0, b0, z), B10 = P(a1, b0, z), B11 = P(a1, b1, z), B01 = P(a0, b1, z);
    const T00 = P(a0 + e, b0 + e, z + rh), T10 = P(a1 - e, b0 + e, z + rh), T11 = P(a1 - e, b1 - e, z + rh), T01 = P(a0 + e, b1 - e, z + rh);
    poly(c, [B00, B10, T10, T00], C(rc, .7));
    poly(c, [B00, B01, T01, T00], C(rc, .85));
    poly(c, [T00, T10, T11, T01], C(o.roof === 'pyramid' ? rc : o.trim, .9));
    poly(c, [B01, B11, T11, T01], C(rc, 1));
    poly(c, [B10, B11, T11, T10], C(rc, .72));
    if (o.snow) { snowLip(B01, B11); snowLip(B11, B10); snowLip(B11, T11); }
    if (o.roof === 'mansard') { // dormers
      for (let t = .5; t < o.w; t += 1) { const p = P(a0 + t, b1 - e * .5, z + rh * .5); c.fillStyle = C(o.trim); c.fillRect(p.x - 4, p.y - 7, 8, 10); c.fillStyle = C('#26303a'); c.fillRect(p.x - 2.5, p.y - 5, 5, 7); }
    }
    if (o.spire) { const top = P((a0 + a1) / 2, (b0 + b1) / 2, z + rh); line(c, top, { x: top.x, y: top.y - 14 }, C('#2b2b2b'), 1.5); circle(c, top.x, top.y - 15, 2, C('#e8c547')); }
  }
}

function drawBuilding(c, o) {
  const a0 = o.i, b0 = o.j, a1 = o.i + o.w, b1 = o.j + o.d;
  const dx = Math.min(2.2, o.h / 48), dy = dx * .3; // hard pre-rendered sun shadow toward +a
  poly(c, [P(a0, b0), P(a1, b0), P(a1 + dx, b0 + dy), P(a1 + dx, b1 + dy), P(a0 + dx, b1 + dy), P(a0, b1)], 'rgba(18,18,44,.34)');
  onFace(c, 'L', a0, b0, a1, b1, 0, S => faceContent(c, o, S, o.h, 'L'));
  onFace(c, 'R', a0, b0, a1, b1, 0, S => faceContent(c, o, S, o.h, 'R'));
  line(c, P(a1, b1, 0), P(a1, b1, o.h), C('#000', 1, .25), 1);
  drawRoof(c, o);
}

// ============================================================
//  PROPS (world coords, centred on tile)
// ============================================================
const centre = o => P(o.i + o.w / 2, o.j + o.d / 2);
function shadow(c, p, rx, ry) { ellipse(c, p.x + rx * .45, p.y + ry * .3, rx * 1.15, ry, 'rgba(18,18,44,.32)'); }

function drawTree(c, o) {
  const p = centre(o), R = mulberry(o.seed), s = o.scale || 1;
  shadow(c, p, 20 * s, 9 * s);
  c.fillStyle = C('#4f3622'); c.fillRect(p.x - 2.5 * s, p.y - 26 * s, 5 * s, 26 * s);
  c.fillStyle = C('#3a2718'); c.fillRect(p.x + .5 * s, p.y - 26 * s, 2 * s, 26 * s);
  const cy = p.y - 46 * s, greens = o.snow ? ['#2d4a2c', '#3a5e38', '#4a7045'] : ['#23461d', '#2f5a24', '#3d6f2c', '#4f8636'];
  const blobs = [];
  for (let n = 0; n < 22; n++) { const ang = R() * Math.PI * 2, rr = R() * 20 * s; blobs.push([p.x + Math.cos(ang) * rr * 1.1, cy + Math.sin(ang) * rr * .9, (8 + R() * 7) * s]); }
  blobs.sort((u, v) => u[1] - v[1]);
  for (const [x, y, r] of blobs) circle(c, x + 2, y + 2, r, C(greens[0]));
  for (const [x, y, r] of blobs) {
    const light = (p.x - x) * .02 + (cy - y) * .03; // light from upper-left
    circle(c, x, y, r * .85, C(greens[Math.max(1, Math.min(3, Math.round(1.8 + light)))] || greens[2]));
  }
  for (let n = 0; n < 40; n++) { const x = p.x + (R() - .6) * 36 * s, y = cy + (R() - .7) * 34 * s; c.fillStyle = C(R() < .5 ? '#6aa447' : '#1b3a17', 1, .8); c.fillRect(x, y, 2, 2); }
  if (o.snow) for (let n = 0; n < 14; n++) { const b = blobs[n]; ellipse(c, b[0] - 2, b[1] - b[2] * .6, b[2] * .5, 2, C('#f2f7fb')); }
}
function drawConifer(c, o) {
  const p = centre(o), s = o.scale || 1;
  shadow(c, p, 14 * s, 6 * s);
  c.fillStyle = C('#4a3322'); c.fillRect(p.x - 2 * s, p.y - 10 * s, 4 * s, 10 * s);
  for (let L = 0; L < 4; L++) {
    const top = p.y - (70 - L * 13) * s, bot = top + 26 * s, hw = (8 + L * 5) * s;
    c.beginPath(); c.moveTo(p.x, top); c.lineTo(p.x - hw, bot); c.lineTo(p.x, bot + 3 * s); c.closePath(); c.fillStyle = C('#3d6e3a'); c.fill();
    c.beginPath(); c.moveTo(p.x, top); c.lineTo(p.x + hw, bot); c.lineTo(p.x, bot + 3 * s); c.closePath(); c.fillStyle = C('#244a28'); c.fill();
    if (o.snow) { c.beginPath(); c.moveTo(p.x, top); c.lineTo(p.x - hw * .45, top + 12 * s); c.lineTo(p.x + hw * .3, top + 10 * s); c.closePath(); c.fillStyle = C('#f4f8fc'); c.fill(); ellipse(c, p.x - hw * .5, bot - 1, hw * .35, 1.8, C('#f4f8fc')); }
  }
}
function drawXmas(c, o) {
  const p = centre(o), s = 1.9;
  for (let n = 0; n < 5; n++) { const q = P(o.i + .45 + (n % 3) * .45, o.j + 1.45 + (n % 2) * .3); box(c, o.i + .45 + (n % 3) * .5, o.j + 1.4 + (n % 2) * .25, o.i + .8 + (n % 3) * .5, o.j + 1.7 + (n % 2) * .25, 0, 7, ['#c7262e', '#2f7d3a', '#e2b33b', '#2f5fb3', '#c7262e'][n]); }
  drawConifer(c, { ...o, scale: s, snow: true });
  const R = mulberry(o.seed);
  for (let n = 0; n < 22; n++) { const t = R(), y = p.y - 128 + t * 118, hw = t * 38; circle(c, p.x + (R() - .5) * 2 * hw, y, 2.4, C(pick(R, ['#d1202a', '#e8c547', '#2d6bd1', '#e8e8e8']))); }
  // star
  c.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 4 : 9, an = -Math.PI / 2 + k * Math.PI / 5; c.lineTo(p.x + Math.cos(an) * r, p.y - 136 + Math.sin(an) * r); }
  c.fillStyle = '#ffd84a'; c.fill();
}
function drawLamp(c, o) {
  const p = centre(o);
  ellipse(c, p.x, p.y, 5, 2.5, 'rgba(0,0,0,.25)');
  c.fillStyle = C('#1d1e22'); c.fillRect(p.x - 3, p.y - 6, 6, 6); c.fillRect(p.x - 1.5, p.y - 44, 3, 44);
  c.fillStyle = C('#34363c'); c.fillRect(p.x - 1.5, p.y - 44, 1, 44);
  // flower basket
  for (let n = 0; n < 7; n++) circle(c, p.x - 5 + (n % 4) * 3.3, p.y - 26 + (n > 3 ? 3 : 0), 2.6, C(n % 2 ? '#c5202c' : '#e0313b'));
  circle(c, p.x - 6, p.y - 22, 2, C('#2f6b2a')); circle(c, p.x + 6, p.y - 22, 2, C('#2f6b2a'));
  // lantern
  c.fillStyle = C('#1d1e22'); c.beginPath(); c.moveTo(p.x - 7, p.y - 58); c.lineTo(p.x, p.y - 64); c.lineTo(p.x + 7, p.y - 58); c.fill();
  c.fillRect(p.x - 5, p.y - 46, 10, 2);
  c.fillStyle = NIGHT ? '#fff1c2' : '#f4f1e6'; c.fillRect(p.x - 5, p.y - 57, 10, 11);
  c.fillStyle = C('#1d1e22'); c.fillRect(p.x - .5, p.y - 57, 1, 11);
  if (o.snow) ellipse(c, p.x, p.y - 61, 6, 2.5, C('#ffffff'));
}
function drawBench(c, o) {
  const a = o.i + .5, b = o.j + .5;
  shadow(c, P(a, b), 18, 5);
  box(c, a - .34, b - .14, a + .34, b - .09, 5, 15, '#9a592b');
  for (const e of [-.3, .27]) box(c, a + e, b - .1, a + e + .04, b + .14, 0, 7, '#1f1f22');
  box(c, a - .34, b - .09, a + .34, b + .14, 5, 7, '#b56e36');
  if (o.snow) poly(c, [P(a - .34, b - .09, 7.5), P(a + .34, b - .09, 7.5), P(a + .34, b + .14, 7.5), P(a - .34, b + .14, 7.5)], C('#f4f8fc'));
}
function drawFountain(c, o) {
  const p = centre(o), s = o.w;
  ellipse(c, p.x, p.y + 2, 30 * s, 15 * s, 'rgba(0,0,0,.18)');
  ellipse(c, p.x, p.y, 28 * s, 14 * s, C('#bfc4c8', .8));
  ellipse(c, p.x, p.y - 4, 28 * s, 14 * s, C('#dfe2e4'));
  ellipse(c, p.x, p.y - 4, 23 * s, 11 * s, C('#3f86c4'));
  ellipse(c, p.x - 3 * s, p.y - 6, 14 * s, 5 * s, C('#7fbbe8', 1, .6));
  c.fillStyle = C('#c9ccd0'); c.fillRect(p.x - 3 * s, p.y - 18 * s, 6 * s, 14 * s);
  ellipse(c, p.x, p.y - 18 * s, 13 * s, 6 * s, C('#dfe2e4'));
  ellipse(c, p.x, p.y - 18 * s, 10 * s, 4.5 * s, C('#4a93d0'));
  c.fillStyle = C('#c9ccd0'); c.fillRect(p.x - 1.5 * s, p.y - 27 * s, 3 * s, 9 * s);
  ellipse(c, p.x, p.y - 27 * s, 6 * s, 2.5 * s, C('#dfe2e4'));
}
function dynFountain(c, o, t) {
  const p = centre(o), s = o.w;
  c.fillStyle = NIGHT ? 'rgba(170,200,240,.6)' : 'rgba(225,242,255,.85)';
  for (let n = 0; n < 16; n++) {
    const ph = (t * .9 + n / 16) % 1, ang = n / 16 * Math.PI * 2;
    const x = p.x + Math.cos(ang) * 11 * s * ph, y = p.y - 27 * s - 10 * s * Math.sin(ph * Math.PI) + Math.sin(ang) * 5 * s * ph + 9 * s * ph;
    c.fillRect(x - 1, y - 1, 2, 2);
  }
}
function drawStatue(c, o) {
  const p = centre(o), a = o.i + .5, b = o.j + .5;
  shadow(c, p, 16, 7);
  box(c, a - .26, b - .26, a + .26, b + .26, 0, 4, '#bdbdb6');
  box(c, a - .2, b - .2, a + .2, b + .2, 4, 22, '#d9d9d2');
  const y = p.y - 22;
  c.fillStyle = C('#cfcfc7');
  c.beginPath(); // rearing horse + rider silhouette
  c.moveTo(p.x - 10, y); c.lineTo(p.x - 8, y - 12); c.lineTo(p.x - 2, y - 16); c.lineTo(p.x + 4, y - 26); c.lineTo(p.x + 9, y - 28);
  c.lineTo(p.x + 8, y - 22); c.lineTo(p.x + 4, y - 18); c.lineTo(p.x + 6, y - 12); c.lineTo(p.x + 2, y - 8); c.lineTo(p.x + 3, y);
  c.lineTo(p.x - 1, y); c.lineTo(p.x - 2, y - 8); c.lineTo(p.x - 6, y - 7); c.lineTo(p.x - 6, y); c.closePath(); c.fill();
  c.fillStyle = C('#a9a9a2'); c.beginPath(); c.moveTo(p.x + 1, y - 17); c.lineTo(p.x + 6, y - 12); c.lineTo(p.x + 2, y - 8); c.lineTo(p.x + 3, y); c.lineTo(p.x + 1, y); c.fill();
  circle(c, p.x - 2, y - 22, 3, C('#d5d5ce')); c.fillStyle = C('#c4c4bc'); c.fillRect(p.x - 4, y - 20, 4, 7);
  if (o.snow) { ellipse(c, p.x, y - .5, 9, 3, C('#fff')); }
}
function drawBush(c, o) {
  const p = centre(o), R = mulberry(o.seed);
  shadow(c, p, 12, 5);
  for (let n = 0; n < 9; n++) circle(c, p.x + (R() - .5) * 18, p.y - 5 - R() * 8, 4 + R() * 3, C(pick(R, ['#2f6327', '#3c7a2f', '#4c8c38'])));
  for (let n = 0; n < 10; n++) { c.fillStyle = C('#78b554', 1, .7); c.fillRect(p.x + (R() - .6) * 16, p.y - 14 + R() * 8, 1.6, 1.6); }
  if (o.snow) ellipse(c, p.x - 2, p.y - 13, 8, 3, C('#fff'));
}
function drawPot(c, o) {
  const p = centre(o);
  shadow(c, p, 9, 4);
  c.fillStyle = C('#9c5a38'); c.beginPath(); c.moveTo(p.x - 7, p.y - 10); c.lineTo(p.x + 7, p.y - 10); c.lineTo(p.x + 5, p.y); c.lineTo(p.x - 5, p.y); c.fill();
  c.fillStyle = C('#7a4128'); c.fillRect(p.x + 1, p.y - 10, 5, 10);
  const g = c.createRadialGradient(p.x - 3, p.y - 20, 1, p.x, p.y - 17, 10);
  g.addColorStop(0, C('#ff7a6a')); g.addColorStop(.5, C('#d7212a')); g.addColorStop(1, C('#7d0f16'));
  circle(c, p.x, p.y - 17, 9, g);
  for (let n = 0; n < 6; n++) { const an = n; c.strokeStyle = C('#8d121b', 1, .6); c.lineWidth = .8; c.beginPath(); c.arc(p.x + Math.cos(an) * 3, p.y - 17 + Math.sin(an) * 3, 3, 0, 2); c.stroke(); }
}
function drawSnowman(c, o) {
  const p = centre(o);
  shadow(c, p, 12, 5);
  const ball = (y, r) => { circle(c, p.x, y, r, C('#f3f7fb')); c.save(); c.beginPath(); c.arc(p.x, y, r, 0, Math.PI * 2); c.clip(); circle(c, p.x + r * .7, y + r * .3, r, C('#b9cce0', 1, .55)); c.restore(); };
  ball(p.y - 9, 10); ball(p.y - 24, 7.5); ball(p.y - 36, 5.5);
  c.fillStyle = C('#c42a2a'); c.fillRect(p.x - 6, p.y - 31, 12, 3); c.fillRect(p.x + 2, p.y - 31, 3, 9);
  c.fillStyle = C('#15151a'); c.fillRect(p.x - 5.5, p.y - 42, 11, 2); c.fillRect(p.x - 3.5, p.y - 50, 7, 8);
  c.fillRect(p.x - 2, p.y - 38, 1.5, 1.5); c.fillRect(p.x + 1.5, p.y - 38, 1.5, 1.5);
  for (const y of [-26, -21, -12]) c.fillRect(p.x - .7, p.y + y, 1.5, 1.5);
  c.fillStyle = C('#ee7b22'); c.beginPath(); c.moveTo(p.x, p.y - 36); c.lineTo(p.x - 7, p.y - 34); c.lineTo(p.x, p.y - 34.5); c.fill();
  c.strokeStyle = C('#5b3a22'); c.lineWidth = 1.2; c.beginPath(); c.moveTo(p.x - 7, p.y - 24); c.lineTo(p.x - 15, p.y - 31); c.moveTo(p.x + 7, p.y - 24); c.lineTo(p.x + 14, p.y - 29); c.stroke();
}
function drawBusstop(c, o) {
  const a = o.i + .5, b = o.j + .5;
  shadow(c, P(a, b), 20, 6);
  for (const e of [-.4, .4]) box(c, a + e, b - .2, a + e + .04, b - .16, 0, 26, '#c0c6cc');
  poly(c, [P(a - .4, b - .18, 3), P(a + .44, b - .18, 3), P(a + .44, b - .18, 24), P(a - .4, b - .18, 24)], 'rgba(160,210,240,.45)', C('#9fb4c4'));
  box(c, a - .1, b - .16, a + .3, b + .02, 0, 18, '#3c78b6');
  poly(c, [P(a - .06, b + .02, 3), P(a + .26, b + .02, 3), P(a + .26, b + .02, 15), P(a - .06, b + .02, 15)], C('#f1f1ee'));
  box(c, a - .46, b - .24, a + .5, b + .24, 26, 28, '#2f5f9a');
}
function drawHydrant(c, o) {
  const p = centre(o);
  shadow(c, p, 6, 3);
  c.fillStyle = C('#c6232b'); c.fillRect(p.x - 3.5, p.y - 14, 7, 14);
  c.fillStyle = C('#8f141b'); c.fillRect(p.x + 1, p.y - 14, 2.5, 14);
  ellipse(c, p.x, p.y - 15, 4.5, 2.5, C('#e04a4a')); c.fillRect(p.x - 6, p.y - 10, 12, 3);
}

const DRAW = { bld: drawBuilding, tree: drawTree, conifer: drawConifer, xmas: drawXmas, lamp: drawLamp, bench: drawBench, fountain: drawFountain, statue: drawStatue, bush: drawBush, pot: drawPot, snowman: drawSnowman, busstop: drawBusstop, hydrant: drawHydrant };
const DYN = {
  fountain: dynFountain,
  xmas(c, o, t) { const p = centre(o), R = mulberry(o.seed + 5); for (let n = 0; n < 30; n++) { const u = R(), y = p.y - 124 + u * 110, x = p.x + (R() - .5) * 2 * u * 36; if (((n + Math.floor(t * 3)) % 3) === 0) { circle(c, x, y, 2, ['#ff4d4d', '#ffe066', '#66d9ff', '#9dff7a'][n % 4]); } } },
  bld(c, o, t) {
    if (!o.lights) return;
    const cols = ['#ff4a4a', '#ffd84a', '#4ad2ff', '#6bff6b'], ph = Math.floor(t * 2.5);
    const edge = (p, q, n0) => { const n = Math.max(2, Math.round(Math.hypot(q.x - p.x, q.y - p.y) / 7)); for (let k = 0; k <= n; k++) { const x = p.x + (q.x - p.x) * k / n, y = p.y + (q.y - p.y) * k / n + 2 + Math.sin(k * 1.3) * 1.2; circle(c, x, y, NIGHT ? 2 : 1.6, cols[(k + n0 + ph) % 4]); } };
    edge(P(o.i, o.j + o.d, o.h), P(o.i + o.w, o.j + o.d, o.h), 0);
    edge(P(o.i + o.w, o.j + o.d, o.h), P(o.i + o.w, o.j, o.h), 1);
  },
};
const PROPS = {
  bench: { name: 'Victorian Bench', cat: 'park' }, lamp: { name: 'Gas Lamp with Roses', cat: 'park' }, fountain: { name: 'Tiered Fountain', cat: 'park' },
  statue: { name: 'Equestrian Statue', cat: 'park' }, pot: { name: 'Rose Topiary', cat: 'park' }, bush: { name: 'Hedge Bush', cat: 'trees' },
  tree: { name: 'Oak Tree', cat: 'trees' }, conifer: { name: 'Pine Tree', cat: 'trees' }, snowman: { name: 'Snowman', cat: 'winter' },
  xmas: { name: 'Christmas Tree', cat: 'winter', w: 2 }, busstop: { name: 'Bus Shelter', cat: 'street' }, hydrant: { name: 'Fire Hydrant', cat: 'street' },
};

function bounds(o) {
  if (o.kind === 'bld') {
    const x0 = P(o.i, o.j + o.d).x - 6, x1 = P(o.i + o.w, o.j).x + 84, y0 = P(o.i, o.j).y - o.h - (o.rh || 45) - 50, y1 = P(o.i + o.w, o.j + o.d).y + 60;
    return { x: Math.floor(x0), y: Math.floor(y0), w: Math.ceil(x1 - x0), h: Math.ceil(y1 - y0) };
  }
  const p = centre(o), s = o.kind === 'xmas' ? 1.6 : 1, hw = 44 * Math.max(o.w, 1) * s;
  return { x: Math.floor(p.x - hw), y: Math.floor(p.y - 125 * s * (o.scale || 1) - 20), w: Math.ceil(hw * 2), h: Math.ceil(125 * s * (o.scale || 1) + 44) };
}

// ============================================================
//  MAPS
// ============================================================
const T = { G: 0, R: 1, W: 2, S: 3, K: 4, Z: 5 };
const TILECOL = ['#4f6f2d', '#66696c', '#cdc3ae', '#e6eef5', '#bda99e', '#d8ccb4'];

function newMap(kind, N) { return { kind, N, tiles: new Uint8Array(N * N), objs: [], cars: [], peds: [], occ: new Array(N * N).fill(null), seedN: 1 }; }
function tileAt(m, i, j) { return (i < 0 || j < 0 || i >= m.N || j >= m.N) ? -1 : m.tiles[i * m.N + j]; }
function free(m, i, j, w = 1, d = 1) {
  for (let a = i; a < i + w; a++) for (let b = j; b < j + d; b++) { const t = tileAt(m, a, b); if (t < 0 || t === T.R || m.occ[a * m.N + b]) return false; }
  return true;
}
function addObj(m, o) {
  o.w = o.w || 1; o.d = o.d || 1; o.seed = o.seed || (m.seedN++ * 7919 + m.N);
  if (!free(m, o.i, o.j, o.w, o.d)) return null;
  o.bb = bounds(o); o.depth = o.i + o.w / 2 + o.j + o.d / 2;
  for (let a = o.i; a < o.i + o.w; a++) for (let b = o.j; b < o.j + o.d; b++) m.occ[a * m.N + b] = o;
  m.objs.push(o); return o;
}
function removeObj(m, o) {
  m.objs.splice(m.objs.indexOf(o), 1);
  for (let a = o.i; a < o.i + o.w; a++) for (let b = o.j; b < o.j + o.d; b++) m.occ[a * m.N + b] = null;
}
function loopPed(m, pts, R, speed = 1) {
  const segs = []; let tot = 0;
  for (let k = 0; k < pts.length; k++) { const p = pts[k], q = pts[(k + 1) % pts.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]); segs.push([p, q, L]); tot += L; }
  m.peds.push({ segs, tot, s: R() * tot, v: (R() < .5 ? -1 : 1) * (.55 + R() * .4) * speed, ph: R() * 6, shirt: pick(R, ['#e8c12e', '#f0d23a', '#d64040', '#3f7bd1', '#ffffff', '#2f9e5a', '#f28a2e']), skin: pick(R, ['#f1c9a5', '#c68b5c', '#8d5a3b', '#f5d6b8']), off: (R() - .5) * .35 });
}


let MAPS = [], mapIdx = 0, M = null;

// ============================================================
//  RENDERING
// ============================================================
const cv = document.getElementById('view'), out = cv.getContext('2d');
// The scene is painted into a small buffer, then blown up with nearest-neighbour
// scaling so every art pixel becomes a PIX x PIX block (P cycles 1..4).
const buf = document.createElement('canvas'), ctx = buf.getContext('2d', { willReadFrequently: true });
const DEV = Math.min(2, window.devicePixelRatio || 1);
let PIX = 2, RS = 1 / PIX, VW = 0, VH = 0, GROUND_GRAIN = null;
// fixed zoom steps; at x2 a 64x32 tile is exactly 64x32 art pixels
const ZOOMS = [1, 2, 4];
let zIdx = 1, ZOOM = ZOOMS[zIdx];
let cam = { x: 0, y: 0 };
function resize() { VW = innerWidth; VH = innerHeight; cv.width = Math.round(VW * DEV); cv.height = Math.round(VH * DEV); buf.width = Math.ceil(VW * RS); buf.height = Math.ceil(VH * RS); }
addEventListener('resize', resize); resize();

function sprite(o) {
  const s = ZOOM * RS, key = s + '|' + NIGHT;
  if (o.spr && o.spr.key === key) return o.spr;
  const b = o.bb, cw = Math.ceil(b.w * s), ch = Math.ceil(b.h * s);
  const cvs = (o.spr && o.spr.cv) || document.createElement('canvas');
  cvs.width = cw; cvs.height = ch;
  const g = cvs.getContext('2d', { willReadFrequently: false });
  g.setTransform(s, 0, 0, s, -b.x * s, -b.y * s);
  DRAW[o.kind](g, o);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = g.createPattern(GRAIN, 'repeat'); g.fillRect(b.x, b.y, b.w, b.h);
  g.globalCompositeOperation = 'source-over';
  return o.spr = { key, cv: cvs };
}

function drawGround(m, v) {
  const N = m.N, city = m.kind === 'city';
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const cx = (i - j) * 32, cy = (i + j + 1) * 16;
    if (cx < v.x0 - 34 || cx > v.x1 + 34 || cy < v.y0 - 18 || cy > v.y1 + 18) continue;
    const t = m.tiles[i * N + j], col = C(TILECOL[t], .95 + hash(i, j, 1) * .08);
    ctx.beginPath(); ctx.moveTo(cx, cy - 16); ctx.lineTo(cx + 32, cy); ctx.lineTo(cx, cy + 16); ctx.lineTo(cx - 32, cy); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();
    if (t === T.G || t === T.S || t === T.R) {
      const dk = t === T.G ? C('#3b5a22') : t === T.S ? C('#c9d7e4') : C('#55585b'), lt = t === T.G ? C('#6a8b3e') : t === T.S ? C('#ffffff') : C('#7b7e81');
      for (let n = 0; n < 6; n++) { const p = P(i + hash(i, j, 10 + n), j + hash(i, j, 20 + n)); ctx.fillStyle = n % 2 ? dk : lt; ctx.fillRect(p.x - 1.5, p.y - .5, 3, 1.3); }
    }
    if (t === T.W || t === T.Z) {
      const lc = C(t === T.W ? '#b1a791' : '#c2b59b');
      line(ctx, P(i + .5, j), P(i + .5, j + 1), lc, .7); line(ctx, P(i, j + .5), P(i + 1, j + .5), lc, .7);
      if (t === T.W) {
        const curb = C('#8b8474');
        if (tileAt(m, i - 1, j) === T.R) line(ctx, P(i, j), P(i, j + 1), curb, 2);
        if (tileAt(m, i + 1, j) === T.R) line(ctx, P(i + 1, j), P(i + 1, j + 1), curb, 2);
        if (tileAt(m, i, j - 1) === T.R) line(ctx, P(i, j), P(i + 1, j), curb, 2);
        if (tileAt(m, i, j + 1) === T.R) line(ctx, P(i, j + 1), P(i + 1, j + 1), curb, 2);
      }
    }
    if (t === T.K) { ctx.fillStyle = C('#9d8a80'); for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) { const p = P(i + .17 + x * .33, j + .17 + y * .33); ctx.fillRect(p.x - 5, p.y - .5, 10, 1); } }
    if (t === T.R && city) {
      const u = i % 10, w = j % 10, stripe = C('#ecebe4'), dash = C('#e3c04a');
      if (w < 2 && u >= 2) {
        if (w === 0) line(ctx, P(i + .15, j + 1), P(i + .6, j + 1), dash, 1.6);
        if (u === 2 || u === 9) for (let s = 0; s < 5; s++) { const b0 = j + .06 + s * .2; const a0 = u === 2 ? i + .1 : i + .4; poly(ctx, [P(a0, b0), P(a0 + .5, b0), P(a0 + .5, b0 + .1), P(a0, b0 + .1)], stripe); }
      } else if (u < 2 && w >= 2) {
        if (u === 0) line(ctx, P(i + 1, j + .15), P(i + 1, j + .6), dash, 1.6);
        if (w === 2 || w === 9) for (let s = 0; s < 5; s++) { const a0 = i + .06 + s * .2; const b0 = w === 2 ? j + .1 : j + .4; poly(ctx, [P(a0, b0), P(a0 + .1, b0), P(a0 + .1, b0 + .5), P(a0, b0 + .5)], stripe); }
      }
    }
  }
}

function drawCar(c, car) {
  const L = .36, Wd = .19, along = car.axis === 'a';
  const a = along ? car.pos : car.lane, b = along ? car.lane : car.pos;
  const a0 = along ? a - L : a - Wd, a1 = along ? a + L : a + Wd, b0 = along ? b - Wd : b - L, b1 = along ? b + Wd : b + L;
  poly(c, [P(a0 - .03, b0 + .05), P(a1 + .08, b0 + .05), P(a1 + .08, b1 + .08), P(a0 - .03, b1 + .08)], 'rgba(0,0,0,.35)');
  const hz = car.jeep ? 10 : 8;
  box(c, a0, b0, a1, b1, 2.5, hz, car.col);
  // cabin sits toward the back of the car
  const back = -car.dir * .06;
  const ca0 = along ? a0 + .14 + back : a0 + .02, ca1 = along ? a1 - .14 + back : a1 - .02, cb0 = along ? b0 + .02 : b0 + .14 + back, cb1 = along ? b1 - .02 : b1 - .14 + back;
  box(c, ca0, cb0, ca1, cb1, hz, hz + (car.jeep ? 7 : 6), '#26323c', car.col);
  if (car.taxi) { box(c, (ca0 + ca1) / 2 - .05, (cb0 + cb1) / 2 - .05, (ca0 + ca1) / 2 + .05, (cb0 + cb1) / 2 + .05, hz + 6, hz + 9, '#fff3b0'); }
  c.fillStyle = C('#15161a');
  if (along) { for (const e of [a0 + .12, a1 - .12]) { const p = P(e, b1, 2.5); ellipse(c, p.x, p.y, 3, 2.6, C('#15161a')); } }
  else { for (const e of [b0 + .12, b1 - .12]) { const p = P(a1, e, 2.5); ellipse(c, p.x, p.y, 3, 2.6, C('#15161a')); } }
  if (car.taxi) { if (along) line(c, P(a0, b1, 5.5), P(a1, b1, 5.5), C('#222'), 1); else line(c, P(a1, b0, 5.5), P(a1, b1, 5.5), C('#222'), 1); }
}
function drawPed(c, p, t) {
  let s = ((p.s % p.tot) + p.tot) % p.tot, seg;
  for (seg of p.segs) { if (s <= seg[2]) break; s -= seg[2]; }
  const [A, B, L] = seg, f = L ? s / L : 0;
  const nx = (B[1] - A[1]) / (L || 1), ny = -(B[0] - A[0]) / (L || 1);
  const a = A[0] + (B[0] - A[0]) * f + nx * p.off, b = A[1] + (B[1] - A[1]) * f + ny * p.off;
  p.a = a; p.b = b;
  const q = P(a, b), step = Math.sin(t * 9 + p.ph), bob = Math.abs(step) * 1.2;
  ellipse(c, q.x + 1, q.y, 4.5, 2, 'rgba(0,0,0,.28)');
  c.strokeStyle = C('#2b2f3a'); c.lineWidth = 1.8; c.beginPath(); c.moveTo(q.x - 1, q.y - 7); c.lineTo(q.x - 1 + step * 2, q.y); c.moveTo(q.x + 1, q.y - 7); c.lineTo(q.x + 1 - step * 2, q.y); c.stroke();
  c.fillStyle = C(p.shirt); c.beginPath(); c.roundRect(q.x - 3, q.y - 15 - bob, 6, 9, 2); c.fill();
  c.fillStyle = C(p.shirt, .75); c.fillRect(q.x + 1, q.y - 14 - bob, 2, 7);
  circle(c, q.x, q.y - 18.5 - bob, 3, C(p.skin));
}

function carBlocked(c, cars) {
  for (const o of cars) if (o !== c && o.axis === c.axis && o.lane === c.lane) { const d = (o.pos - c.pos) * c.dir; if (d > 0 && d < 1.05) return true; }
  const band = x => ((x % 10) + 10) % 10 < 2, front = c.pos + c.dir * .42, look = front + c.dir * .3;
  if (band(look) && !band(front)) {
    const bs = Math.floor(look / 10) * 10, cross = Math.floor(c.lane / 10) * 10;
    for (const o of cars) if (o.axis !== c.axis && o.lane >= bs && o.lane < bs + 2) {
      if (c.axis === 'b' && o.pos > cross - .9 && o.pos < cross + 2.9) return true;
      if (c.axis === 'a' && o.pos > cross - .2 && o.pos < cross + 2.2) return true;
    }
  }
  return false;
}

// snow particles (screen space)
const flakes = Array.from({ length: 180 }, () => ({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.8, s: .02 + Math.random() * .05, ph: Math.random() * 6 }));

let mode = null, placeKind = null, hover = null, hoverObj = null, lastT = performance.now();
const items = [];

function frame(now) {
  const dt = Math.min(.05, (now - lastT) / 1000), t = now / 1000; lastT = now;
  const m = M;
  for (const k in keys) if (keys[k]) { const sp = 600 * dt / ZOOM; if (k === 'ArrowLeft' || k === 'a') cam.x -= sp; if (k === 'ArrowRight' || k === 'd') cam.x += sp; if (k === 'ArrowUp' || k === 'w') cam.y -= sp; if (k === 'ArrowDown' || k === 's') cam.y += sp; }
  clampCam();
  for (const c of m.cars) { const target = carBlocked(c, m.cars) ? 0 : c.speed; c.v += (target - c.v) * Math.min(1, dt * 4); c.pos += c.dir * c.v * dt; if (c.pos < -1.5) c.pos += m.N + 3; if (c.pos > m.N + 1.5) c.pos -= m.N + 3; }
  for (const p of m.peds) p.s += p.v * dt;

  ctx.setTransform(RS, 0, 0, RS, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
  const tx = Math.round(RS * (VW / 2 - cam.x * ZOOM)), ty = Math.round(RS * (VH / 2 - cam.y * ZOOM));
  ctx.setTransform(RS * ZOOM, 0, 0, RS * ZOOM, tx, ty);
  const v = { x0: cam.x - VW / 2 / ZOOM, x1: cam.x + VW / 2 / ZOOM, y0: cam.y - VH / 2 / ZOOM, y1: cam.y + VH / 2 / ZOOM };
  drawGround(m, v);
  ctx.save(); poly(ctx, [P(0, 0), P(m.N, 0), P(m.N, m.N), P(0, m.N)]); ctx.clip();
  ctx.fillStyle = GROUND_GRAIN || (GROUND_GRAIN = ctx.createPattern(GRAIN, 'repeat')); ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); ctx.restore();

  items.length = 0;
  for (const o of m.objs) { const b = o.bb; if (b.x + b.w < v.x0 || b.x > v.x1 || b.y + b.h < v.y0 || b.y > v.y1) { if (o.spr && now - (o.seen || 0) > 4000) o.spr = null; continue; } o.seen = now; items.push(o); }
  for (const c of m.cars) { c.depth = (c.axis === 'a' ? c.pos + c.lane : c.lane + c.pos) + .5; items.push(c); }
  for (const p of m.peds) { if (p.a === undefined) drawPed({ beginPath() { }, moveTo() { }, lineTo() { }, stroke() { }, fill() { }, roundRect() { }, arc() { }, ellipse() { }, fillRect() { } }, p, t); p.depth = p.a + p.b + .5; items.push(p); }
  items.sort((u, w) => u.depth - w.depth);

  const glows = [];
  for (const it of items) {
    if (it.axis) { drawCar(ctx, it); if (NIGHT) glows.push([P(it.axis === 'a' ? it.pos + it.dir * .4 : it.lane, it.axis === 'a' ? it.lane : it.pos + it.dir * .4, 5), 22, 'rgba(255,240,190,.5)']); continue; }
    if (it.segs) { drawPed(ctx, it, t); continue; }
    const s = sprite(it);
    if (hoverObj === it) ctx.globalAlpha = .55 + Math.sin(t * 10) * .2;
    ctx.drawImage(s.cv, it.bb.x, it.bb.y, it.bb.w, it.bb.h);
    ctx.globalAlpha = 1;
    if (DYN[it.kind]) DYN[it.kind](ctx, it, t);
    if (NIGHT) {
      if (it.kind === 'lamp') glows.push([{ x: centre(it).x, y: centre(it).y - 52 }, 46, 'rgba(255,214,140,.32)'], [{ x: centre(it).x, y: centre(it).y - 4 }, 34, 'rgba(255,200,120,.18)']);
      if (it.kind === 'xmas') glows.push([{ x: centre(it).x, y: centre(it).y - 70 }, 120, 'rgba(255,190,120,.3)']);
      if (it.kind === 'bld' && (it.warm || it.lights)) glows.push([P(it.i + it.w / 2, it.j + it.d, 10), 40 + it.w * 10, 'rgba(255,180,90,.2)']);
    }
  }

  // placement ghost / bulldoze highlight
  if (hover && mode === 'place') {
    const def = PROPS[placeKind], w = def.w || 1, ok = free(m, hover.i, hover.j, w, w);
    poly(ctx, [P(hover.i, hover.j), P(hover.i + w, hover.j), P(hover.i + w, hover.j + w), P(hover.i, hover.j + w)], ok ? 'rgba(120,255,140,.25)' : 'rgba(255,60,60,.3)', ok ? '#8f8' : '#f55', 1.5);
    ctx.globalAlpha = .7; DRAW[placeKind](ctx, { kind: placeKind, i: hover.i, j: hover.j, w, d: w, seed: 3, snow: m.kind === 'winter' }); ctx.globalAlpha = 1;
  }
  if (mode === 'doze' && hoverObj) { const o = hoverObj; poly(ctx, [P(o.i, o.j), P(o.i + o.w, o.j), P(o.i + o.w, o.j + o.d), P(o.i, o.j + o.d)], 'rgba(255,40,40,.35)', '#f44', 2); }

  if (NIGHT && glows.length) {
    ctx.globalCompositeOperation = 'lighter';
    for (const [p, r, col] of glows) { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2); }
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.setTransform(RS, 0, 0, RS, 0, 0);
  if (m.kind === 'winter') {
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (const f of flakes) { f.y += f.s * dt * 3; if (f.y > 1.02) { f.y = -.02; f.x = Math.random(); } const x = (f.x * VW + Math.sin(t + f.ph) * 12 + VW) % VW; ctx.beginPath(); ctx.arc(x, f.y * VH, f.r, 0, 7); ctx.fill(); }
  }
  if (DITHER) palettize();
  out.imageSmoothingEnabled = false;
  out.drawImage(buf, 0, 0, buf.width * PIX * DEV, buf.height * PIX * DEV);
  updStatus(dt);
  drawLCD(t);
  requestAnimationFrame(frame);
}

// 8x9x7 colour palette with a 4x4 Bayer ordered dither, like an 8-bit display mode
let DITHER = true;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function quant(levels) {
  const t = new Uint8Array(256 * 16), st = 255 / (levels - 1);
  for (let v = 0; v < 256; v++) for (let b = 0; b < 16; b++) t[v << 4 | b] = Math.round(Math.max(0, Math.min(levels - 1, Math.round(v / st + (b / 16 - .47) * .8))) * st);
  return t;
}
const QR = quant(8), QG = quant(9), QB = quant(7);
function palettize() {
  const w = buf.width, h = buf.height, img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let y = 0, i = 0; y < h; y++) {
    const row = (y & 3) << 2;
    for (let x = 0; x < w; x++, i += 4) { const b = BAYER[row | (x & 3)]; d[i] = QR[d[i] << 4 | b]; d[i + 1] = QG[d[i + 1] << 4 | b]; d[i + 2] = QB[d[i + 2] << 4 | b]; }
  }
  ctx.putImageData(img, 0, 0);
}

// sim-game status bar
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
let statT = 1, gameMonths = 0, funds = 48210;
function updStatus(dt) {
  statT += dt; if (statT < .5) return; statT = 0;
  let pop = 0; for (const o of M.objs) if (o.kind === 'bld') pop += Math.round(o.h / 17) * o.w * o.d * 9;
  gameMonths += .1; funds += Math.round(pop * .004);
  document.getElementById('sTown').textContent = MAPS[mapIdx].name;
  document.getElementById('sPop').textContent = 'Pop. ' + pop.toLocaleString();
  document.getElementById('sFunds').textContent = '§' + funds.toLocaleString();
  document.getElementById('sDate').textContent = MONTHS[Math.floor(gameMonths) % 12] + ' ' + (1999 + Math.floor(gameMonths / 12));
}

function clampCam() {
  const N = M.N; cam.x = Math.max(-N * 32, Math.min(N * 32, cam.x)); cam.y = Math.max(-40, Math.min(N * 32, cam.y));
}

// ============================================================
//  INPUT
// ============================================================
const keys = {};
function screenToWorld(sx, sy) { return { x: (sx - VW / 2) / ZOOM + cam.x, y: (sy - VH / 2) / ZOOM + cam.y }; }
function tileUnder(sx, sy) { const w = screenToWorld(sx, sy); return { i: Math.floor(w.y / 32 + w.x / 64), j: Math.floor(w.y / 32 - w.x / 64) }; }
function objectUnder(sx, sy) {
  const w = screenToWorld(sx, sy), s = ZOOM * RS;
  for (let k = items.length - 1; k >= 0; k--) {
    const o = items[k]; if (!o.bb || !o.spr) continue;
    const b = o.bb; if (w.x < b.x || w.x > b.x + b.w || w.y < b.y || w.y > b.y + b.h) continue;
    const px = Math.floor((w.x - b.x) * s), py = Math.floor((w.y - b.y) * s);
    const a = o.spr.cv.getContext('2d').getImageData(px, py, 1, 1).data[3];
    if (a > 60) return o;
  }
  const tl = tileUnder(sx, sy); return (tl.i >= 0 && tl.j >= 0 && tl.i < M.N && tl.j < M.N) ? M.occ[tl.i * M.N + tl.j] : null;
}
let drag = null;
cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false }; });
cv.addEventListener('pointermove', e => {
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) { drag.moved = true; cv.classList.add('drag'); }
    if (drag.moved) { cam.x = drag.cx - dx / ZOOM; cam.y = drag.cy - dy / ZOOM; }
  }
  hover = mode === 'place' ? tileUnder(e.clientX, e.clientY) : null;
  hoverObj = mode === 'doze' ? objectUnder(e.clientX, e.clientY) : null;
});
cv.addEventListener('pointerup', e => {
  cv.classList.remove('drag');
  if (drag && !drag.moved) {
    if (mode === 'place') {
      const tl = tileUnder(e.clientX, e.clientY), def = PROPS[placeKind];
      const o = addObj(M, { kind: placeKind, i: tl.i, j: tl.j, w: def.w || 1, d: def.w || 1, snow: M.kind === 'winter', scale: placeKind === 'tree' ? .9 + Math.random() * .3 : undefined, seed: (Math.random() * 1e6) | 0 });
      sfx(o ? 'place' : 'nope');
    } else if (mode === 'doze') {
      const o = objectUnder(e.clientX, e.clientY);
      if (o) { removeObj(M, o); hoverObj = null; sfx('doze'); }
    }
  }
  drag = null;
});
cv.addEventListener('wheel', e => { e.preventDefault(); setZoom(zIdx + (e.deltaY < 0 ? 1 : -1)); }, { passive: false });
addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === '+' || e.key === '=') setZoom(zIdx + 1);
  if (e.key === '-') setZoom(zIdx - 1);
  if (e.key === 'n') toggleNight();
  if (e.key === 'x') { DITHER = !DITHER; toast(DITHER ? '256 COLORS' : 'TRUE COLOR'); }
  if (e.key === 'p') { PIX = PIX % 4 + 1; RS = 1 / PIX; resize(); toast('PIXEL SIZE ' + PIX); }
  if (e.key === 'm') loadMap((mapIdx + 1) % MAPS.length);
  if (e.key === 'Escape') setMode(null);
  if (e.key >= '1' && e.key <= '9' && +e.key <= MAPS.length) loadMap(+e.key - 1);
});
addEventListener('keyup', e => { keys[e.key] = false; });
function setZoom(z) { zIdx = Math.max(0, Math.min(ZOOMS.length - 1, z)); ZOOM = ZOOMS[zIdx]; }
function toggleNight() { NIGHT = !NIGHT; colC.clear(); document.getElementById('bNight').classList.toggle('on', NIGHT); }

function setMode(md, kind) {
  mode = md; placeKind = kind || null; hover = null; hoverObj = null;
  cv.classList.toggle('place', !!md);
  document.getElementById('bDoze').classList.toggle('on', md === 'doze');
  document.querySelectorAll('#grid button').forEach(b => b.classList.toggle('on', md === 'place' && b.dataset.kind === kind));
}

function saveKey(k) { return 'isotown:' + MAPS[k].name; }
function loadMap(k) {
  const fade = document.getElementById('fade');
  const go = () => {
    mapIdx = k; M = MAPS[k].gen();
    try {
      const saved = JSON.parse(localStorage.getItem(saveKey(k)) || 'null');
      if (saved) { M.objs = []; M.occ.fill(null); for (const o of saved) addObj(M, o); }
    } catch (e) { }
    cam = { ...M.cam }; setMode(null); toast(MAPS[k].name); fade.style.opacity = 0;
  };
  if (!M) return go();
  fade.style.opacity = 1; setTimeout(go, 350);
}
function toast(msg) { const el = document.getElementById('toast'); el.textContent = msg; el.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => el.style.display = 'none', 1600); }

// ============================================================
//  UI ICONS (painted)
// ============================================================
function icon(id, fn) { const c = document.querySelector('#' + id + ' canvas'), g = c.getContext('2d'), k = c.width / 84; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.setTransform(k, 0, 0, k, 0, 0); fn(g); }
function tri(g, pts, fill) { g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath(); g.fillStyle = fill; g.fill(); }
icon('bSave', g => {
  g.fillStyle = '#2d3138'; g.beginPath(); g.roundRect(16, 10, 52, 56, 4); g.fill();
  g.fillStyle = '#b9bfc6'; g.fillRect(28, 10, 28, 20); g.fillStyle = '#2d3138'; g.fillRect(46, 14, 6, 12);
  g.fillStyle = '#f1f1ec'; g.fillRect(24, 38, 36, 24); g.fillStyle = '#c33'; g.fillRect(24, 38, 36, 4);
  g.fillStyle = '#9aa'; for (let y = 47; y < 60; y += 5) g.fillRect(28, y, 28, 1.5);
});
icon('bOpen', g => {
  g.fillStyle = '#c9942f'; g.beginPath(); g.moveTo(10, 18); g.lineTo(32, 18); g.lineTo(37, 24); g.lineTo(72, 24); g.lineTo(72, 64); g.lineTo(10, 64); g.fill();
  g.fillStyle = '#6fc25a'; g.save(); g.translate(44, 34); g.rotate(-.2); g.fillRect(-16, -16, 30, 30); g.fillStyle = '#4e9a3c'; g.fillRect(-12, -10, 20, 3); g.fillRect(-12, -4, 20, 3); g.restore();
  g.fillStyle = '#f1c35a'; g.beginPath(); g.moveTo(8, 34); g.lineTo(76, 34); g.lineTo(70, 66); g.lineTo(12, 66); g.fill();
});
function mag(g, sign) {
  g.strokeStyle = '#1b2a55'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(50, 46); g.lineTo(68, 64); g.stroke();
  const gr = g.createRadialGradient(30, 26, 2, 36, 32, 20); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#8fd0ff');
  g.beginPath(); g.arc(36, 32, 18, 0, 7); g.fillStyle = gr; g.fill(); g.lineWidth = 5; g.strokeStyle = '#e8eef7'; g.stroke();
  g.fillStyle = '#d92a2a'; g.fillRect(27, 30, 18, 5); if (sign === '+') g.fillRect(33.5, 23, 5, 18);
}
icon('bZoomIn', g => mag(g, '+')); icon('bZoomOut', g => mag(g, '-'));
icon('bProps', g => {
  g.strokeStyle = '#6b4424'; g.lineWidth = 6; g.beginPath(); g.moveTo(52, 30); g.lineTo(74, 70); g.stroke();
  g.fillStyle = '#9aa3ad'; g.save(); g.translate(52, 26); g.rotate(-.5); g.fillRect(-12, -6, 24, 11); g.restore();
  const gr = g.createLinearGradient(0, 14, 0, 56); gr.addColorStop(0, '#ffb04a'); gr.addColorStop(1, '#d1601a');
  g.beginPath(); g.moveTo(8, 52); g.quadraticCurveTo(10, 16, 34, 16); g.quadraticCurveTo(58, 16, 58, 52); g.fillStyle = gr; g.fill();
  g.fillStyle = '#b44f12'; g.fillRect(2, 50, 62, 8); g.fillStyle = '#ffd08a'; g.fillRect(30, 16, 7, 34);
});
icon('bDoze', g => {
  g.fillStyle = '#2a2a2a'; g.beginPath(); g.roundRect(14, 52, 54, 16, 8); g.fill();
  g.fillStyle = '#555'; for (let x = 22; x < 64; x += 10) { g.beginPath(); g.arc(x, 60, 4, 0, 7); g.fill(); }
  g.fillStyle = '#f5c21b'; g.fillRect(20, 34, 42, 18); g.fillStyle = '#e2a90f'; g.fillRect(40, 16, 20, 20);
  g.fillStyle = '#9fd4ff'; g.fillRect(44, 20, 12, 10);
  g.fillStyle = '#c9c9c9'; tri(g, [[2, 30], [14, 30], [16, 60], [4, 64]], '#b8b8b8');
  g.fillStyle = '#e2a90f'; g.fillRect(12, 40, 10, 5);
});
icon('bNight', g => { g.beginPath(); g.arc(40, 38, 22, 0, 7); g.fillStyle = '#ffd84a'; g.fill(); g.beginPath(); g.arc(52, 30, 20, 0, 7); g.globalCompositeOperation = 'destination-out'; g.fill(); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#fff6'; g.beginPath(); g.arc(30, 44, 3, 0, 7); g.fill(); });
icon('bPrev', g => { g.fillStyle = '#fff'; g.fillRect(20, 20, 6, 36); tri(g, [[62, 18], [62, 58], [28, 38]], '#fff'); });
function playIcon(on) { icon('bPlay', g => { g.fillStyle = '#fff'; if (on) { g.fillRect(26, 20, 10, 36); g.fillRect(46, 20, 10, 36); } else tri(g, [[26, 16], [26, 60], [64, 38]], '#fff'); }); }
playIcon(false);
icon('bNext', g => { g.fillStyle = '#fff'; g.fillRect(58, 20, 6, 36); tri(g, [[22, 18], [22, 58], [56, 38]], '#fff'); });

// props panel
const panel = document.getElementById('panel'), tabsEl = document.getElementById('tabs'), grid = document.getElementById('grid'), label = document.getElementById('label');
const CATS = [['all', 'fountain'], ['park', 'bench'], ['trees', 'tree'], ['winter', 'snowman'], ['street', 'hydrant']];
function previewProp(canvas, kind, scale) {
  const g = canvas.getContext('2d'), wasNight = NIGHT; NIGHT = false;
  const def = PROPS[kind], w = def.w || 1, o = { kind, i: 0, j: 0, w, d: w, seed: 11, scale: 1 };
  const p = centre(o), sc = scale / (kind === 'xmas' ? 2.2 : 1);
  g.setTransform(sc, 0, 0, sc, canvas.width / 2 - p.x * sc, canvas.height * .82 - p.y * sc);
  DRAW[kind](g, o);
  NIGHT = wasNight; colC.clear();
}
let cat = 'all';
function buildGrid() {
  grid.innerHTML = '';
  for (const [kind, def] of Object.entries(PROPS)) {
    if (cat !== 'all' && def.cat !== cat) continue;
    const b = document.createElement('button'); b.dataset.kind = kind; b.title = def.name;
    const c = document.createElement('canvas'); c.width = 70; c.height = 62; b.appendChild(c); previewProp(c, kind, .95);
    b.onmouseenter = () => label.textContent = def.name;
    b.onclick = () => { setMode(mode === 'place' && placeKind === kind ? null : 'place', kind); label.textContent = mode ? def.name + ' — click the map to place, Esc to stop' : def.name; };
    b.classList.toggle('on', mode === 'place' && placeKind === kind);
    grid.appendChild(b);
  }
}
for (const [name, rep] of CATS) {
  const b = document.createElement('button'); b.title = name; const c = document.createElement('canvas'); c.width = 30; c.height = 26; b.appendChild(c);
  previewProp(c, rep, .42);
  b.onclick = () => { cat = name; tabsEl.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); buildGrid(); };
  if (name === 'all') b.classList.add('on');
  tabsEl.appendChild(b);
}
buildGrid();

const $ = id => document.getElementById(id);
$('bProps').onclick = () => { panel.classList.toggle('open'); $('bProps').classList.toggle('on', panel.classList.contains('open')); };
$('bClose').onclick = () => { panel.classList.remove('open'); $('bProps').classList.remove('on'); setMode(null); };
$('bDoze').onclick = () => setMode(mode === 'doze' ? null : 'doze');
$('bZoomIn').onclick = () => setZoom(zIdx + 1);
$('bZoomOut').onclick = () => setZoom(zIdx - 1);
$('bNight').onclick = toggleNight;
$('bOpen').onclick = () => loadMap((mapIdx + 1) % MAPS.length);
$('bSave').onclick = () => {
  try { localStorage.setItem(saveKey(mapIdx), JSON.stringify(M.objs, (k, v) => (k === 'spr' || k === 'bb' || k === 'seen') ? undefined : v)); toast('SAVED ' + MAPS[mapIdx].name.toUpperCase()); }
  catch (e) { toast('SAVE FAILED'); }
};

// ============================================================
//  MUSIC: generated ambient pads (Web Audio)
// ============================================================
const TRACKS = [
  { name: 'AMBIENT_1.MP3', root: 50, chords: [[0, 7, 11, 16], [5, 12, 16, 19], [2, 9, 12, 17], [7, 14, 17, 23]], bells: [0, 2, 4, 7, 9] },
  { name: 'SNOWFALL.MP3', root: 55, chords: [[0, 4, 7, 14], [-3, 4, 9, 12], [5, 9, 12, 16], [7, 11, 14, 19]], bells: [0, 4, 7, 11, 12] },
  { name: 'PARK_AFTERNOON.MP3', root: 53, chords: [[0, 7, 9, 16], [-5, 5, 9, 14], [2, 7, 10, 17], [-2, 5, 9, 12]], bells: [0, 2, 5, 7, 9] },
];
let AC = null, playing = false, track = 0, bus = null, sched = null, nextBar = 0, bar = 0;
const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
function initAudio() {
  AC = new (window.AudioContext || window.webkitAudioContext)();
  const master = AC.createGain(); master.gain.value = .5; master.connect(AC.destination);
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; lp.connect(master);
  const dl = AC.createDelay(); dl.delayTime.value = .42; const fb = AC.createGain(); fb.gain.value = .38;
  dl.connect(fb); fb.connect(dl); dl.connect(lp);
  bus = AC.createGain(); bus.connect(lp); bus.connect(dl);
}
function note(freq, t0, dur, type, vol, atk) {
  const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + atk); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  o.connect(g); g.connect(bus); o.start(t0); o.stop(t0 + dur + .05);
}
function tick() {
  const tr = TRACKS[track];
  while (nextBar < AC.currentTime + .6) {
    const ch = tr.chords[bar % tr.chords.length];
    for (const iv of ch) { note(mtof(tr.root + iv), nextBar, 5.5, 'triangle', .045, 1.4); note(mtof(tr.root + iv) * 1.004, nextBar, 5.5, 'sine', .04, 1.8); }
    note(mtof(tr.root + ch[0] - 12), nextBar, 4.5, 'sine', .09, .5);
    for (let s = 0; s < 8; s++) if (Math.random() < .45) note(mtof(tr.root + 24 + tr.bells[Math.floor(Math.random() * tr.bells.length)]), nextBar + s * .5, 1.6, 'sine', .05, .01);
    nextBar += 4; bar++;
  }
}
function setPlaying(on) {
  if (!AC) initAudio();
  playing = on; playIcon(on);
  if (on) { AC.resume(); nextBar = AC.currentTime + .1; tick(); sched = setInterval(tick, 200); }
  else { clearInterval(sched); AC.suspend(); }
}
$('bPlay').onclick = () => setPlaying(!playing);
$('bNext').onclick = () => { track = (track + 1) % TRACKS.length; bar = 0; };
$('bPrev').onclick = () => { track = (track + TRACKS.length - 1) % TRACKS.length; bar = 0; };
function sfx(kind) {
  if (!AC) initAudio(); AC.resume();
  const t0 = AC.currentTime;
  if (kind === 'place') { note(880, t0, .15, 'square', .05, .005); note(1320, t0 + .06, .2, 'square', .04, .005); }
  else if (kind === 'doze') { for (let n = 0; n < 6; n++) note(90 + Math.random() * 60, t0 + n * .04, .12, 'sawtooth', .06, .005); }
  else note(160, t0, .2, 'square', .05, .005);
  if (!playing) setTimeout(() => { if (!playing) AC.suspend(); }, 600);
}

// LCD marquee
const lcd = document.querySelector('#lcd canvas'), lg = lcd.getContext('2d');
function drawLCD(t) {
  const W = lcd.width, H = lcd.height;
  lg.fillStyle = '#000'; lg.fillRect(0, 0, W, H);
  const txt = `${track + 1}. ${TRACKS[track].name} - ${playing ? 'PLAYING' : 'STOPPED'} -   `;
  lg.font = `${H + 2}px VT323, monospace`; lg.textBaseline = 'middle';
  const w = lg.measureText(txt).width, x = Math.round(-((t * 24) % w));
  lg.fillStyle = '#35ff5a'; lg.fillText(txt, x, H / 2 + 1); lg.fillText(txt, x + w, H / 2 + 1);
}

// #1 / #2 / #3 picks a town, trailing "n" starts at night (e.g. #2n)

function defineTowns(list) {
  MAPS = list;
  const hm = location.hash.match(/^#([1-9])(n?)/);
  loadMap(hm ? Math.min(+hm[1], MAPS.length) - 1 : 0);
  if (hm && hm[2]) toggleNight();
  requestAnimationFrame(frame);
}
