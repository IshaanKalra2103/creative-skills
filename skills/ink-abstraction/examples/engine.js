'use strict';
// ink-abstraction engine: twelve states of one subject on a paper sheet, from a hatched ink sketch
// (I-IV) through a cross-stitch grid (V), patterned cells that get coarser (VI-XI), to a few
// overshooting lines and one hatched knot (XII). A subject file calls defineSheet({...}); see template/.
//
// Subject contract (unit box: x 0..200, y 8..120, subject facing left reads best):
//   polys      [[x,y]...][]   closed parts; the silhouette is their union
//   strokes    [{pts, w, close, knock}]  details drawn with the outline in I-IV (horns, tail, a mustard zigzag);
//              knock: px of paper laid under the line so it stays readable on dark hatching
//   shade(x,y) -> 0..1        darkness; decides hatch density, black masses (III, IV) and which mark fills a cell
//   anchor     [x,y]          the spot that survives to XII as a hatched knot (a head, a face, an eye)
//   dark       0..1           shade threshold for the black mass in III (IV uses dark + .13). default .55
//   details(pen, stage, R)    optional extra marks for stages 0..3, drawn last (faces, seeds);
//                             pen = {stroke(pts,{amp,w,alpha,close,knock}), resample, dot(x,y,r,fill|'paper'), X, Y}
//   anchorSwirl false         skip the little swirl drawn at the anchor in I-IV
//   title                     document title
//
// Page: click = new variation, B = toggle boil, ?still = no boil, ?seed=N = pick a variation.
// Needs a <canvas id="c"> and the page CSS from the template.

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const LW = 1400, LH = 960;                 // logical sheet size
const INK = '#1d1c1b', PAPER = '#e8e6e1';
const params = new URLSearchParams(location.search);
let boil = !params.has('still'), variant = +(params.get('seed') || 1);

// ---------- random ----------
function rng(seed){ let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function inPoly(x, y, poly){
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const inside = (x, y) => SUBJECT.polys.some(p => inPoly(x, y, p));   // union of every part
const shade = (x, y) => Math.max(0, Math.min(1, SUBJECT.shade(x, y)));
// ---------- pen ----------
// All marks go through here: coordinates in unit space, wobble from the jitter rng.
let P, J; // P = panel transform {ox, oy, k}, J = jitter rng
const X = x => P.ox + x * P.k, Y = y => P.oy + y * P.k;
function stroke(pts, { amp = .6, w = 1, alpha = 1, close = false, knock = 0 } = {}){
  if (knock) { const ink = ctx.strokeStyle; ctx.strokeStyle = PAPER; stroke(pts, { amp: 0, w: w + knock, close }); ctx.strokeStyle = ink; }   // paper under the line so it reads over dark marks
  ctx.globalAlpha = alpha; ctx.lineWidth = w; ctx.beginPath();
  pts.forEach(([x, y], i) => { const px = X(x) + (J() - .5) * amp * 2, py = Y(y) + (J() - .5) * amp * 2; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
  if (close) ctx.closePath(); ctx.stroke(); ctx.globalAlpha = 1;
}
function resample(pts, step, close){ // add points along segments so wobble reads as hand-drawn
  const out = [], n = pts.length;
  for (let i = 0; i < (close ? n : n - 1); i++){
    const a = pts[i], b = pts[(i + 1) % n], d = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.round(d / step));
    for (let k = 0; k < m; k++) out.push([a[0] + (b[0] - a[0]) * k / m, a[1] + (b[1] - a[1]) * k / m]);
  }
  if (!close) out.push(pts[n - 1]); return out;
}
function outline(passes, amp, w = 1.1){
  for (let p = 0; p < passes; p++){
    SUBJECT.polys.forEach(poly => stroke(resample(poly, 3, true), { amp, w, alpha: p ? .6 : 1, close: true }));
    (SUBJECT.strokes || []).forEach(s => stroke(resample(s.pts, 2.5, !!s.close), { amp: amp * .7, w: w * (s.w || 1), close: !!s.close, knock: s.knock || 0 }));
  }
}
function swirl(x, y, r){ const pts = []; for (let a = 0; a < 12; a += .35) pts.push([x + Math.cos(a) * r * a / 12, y + Math.sin(a) * r * a / 12]); stroke(pts, { amp: .25, w: .9 }); }
function sample(R, test){ for (let t = 0; t < 50; t++){ const x = 5 + R() * 190, y = 12 + R() * 102; if (inside(x, y) && test(x, y)) return [x, y]; } return null; }

// ---------- stages ----------
function hatchSketch(R, n, { cross = false, lenMul = 1, dark = 2, stipple = 0 } = {}){
  for (let i = 0; i < n; i++){
    const p = sample(R, (x, y) => R() < .15 + shade(x, y) * .85); if (!p) continue;
    const [x, y] = p, s = shade(x, y), a = -.5 + Math.sin(x * .05) * .6 + (cross && R() < .4 ? 1.4 : 0), L = (3 + R() * 7) * lenMul;
    stroke([[x, y], [x + Math.cos(a) * L, y + Math.sin(a) * L]], { amp: .35, w: .55 + s * .5, alpha: .55 + s * .4 });
  }
  if (dark < 1){   // solid dark mass, drawn as a dense scribble
    for (let i = 0; i < 2600; i++){
      const p = sample(R, (x, y) => shade(x, y) > dark); if (!p) continue;
      const [x, y] = p, a = R() * 3;
      stroke([[x, y], [x + Math.cos(a) * 4, y + Math.sin(a) * 4]], { amp: .3, w: 1.6, alpha: .8 });
    }
  }
  for (let i = 0; i < stipple; i++){ const p = sample(R, (x, y) => shade(x, y) < (dark < 1 ? dark : .6)); if (!p) continue; ctx.fillStyle = INK; ctx.globalAlpha = .7; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), .9, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  if (SUBJECT.anchorSwirl !== false) swirl(SUBJECT.anchor[0], SUBJECT.anchor[1] - 2, 6);
}
function stippleGrid(R, cell){
  for (let y = 10; y < 118; y += cell) for (let x = 2; x < 200; x += cell){
    const cx = x + cell / 2, cy = y + cell / 2; if (!inside(cx, cy) && !(R() < .25 && (inside(cx + cell, cy) || inside(cx - cell, cy)))) continue;
    const s = shade(cx, cy), h = cell * .38;
    if (s > .25 || R() < .5) stroke([[cx - h, cy], [cx + h, cy]], { amp: .25, w: .8 });
    if (s > .35 || R() < .3) stroke([[cx, cy - h], [cx, cy + h]], { amp: .25, w: .8 });
    if (s > .6) { stroke([[cx - h, cy - h], [cx + h, cy + h]], { amp: .25, w: .9 }); stroke([[cx + h, cy - h], [cx - h, cy + h]], { amp: .25, w: .9 }); }
  }
}
// quantize the silhouette into cells and fill each with a mark that stands for its darkness
function cells(cell, R, { fill = 1, rim = 0, outlineCells = true, headScribble = false } = {}){
  const cols = Math.ceil(200 / cell), rows = Math.ceil(125 / cell), on = [];
  for (let r = 0; r < rows; r++){ on[r] = []; for (let c = 0; c < cols; c++){ const x = c * cell + cell / 2, y = 8 + r * cell + cell / 2; on[r][c] = inside(x, y) || (rim && R() < rim && (inside(x + cell * .6, y) || inside(x, y + cell * .6))); } }
  const at = (r, c) => r >= 0 && c >= 0 && r < rows && c < cols && on[r][c];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++){
    if (!on[r][c]) continue;
    const x0 = c * cell, y0 = 8 + r * cell, cx = x0 + cell / 2, cy = y0 + cell / 2, s = shade(cx, cy), m = cell * .18;
    if (outlineCells && R() < .8) stroke(resample([[x0, y0], [x0 + cell, y0], [x0 + cell, y0 + cell], [x0, y0 + cell]], cell / 3, true), { amp: .3, w: .6, alpha: .7, close: true });
    if (R() > fill) continue;
    const kind = Math.min(5, Math.floor(s * 6 + (R() - .5) * 1.2));
    if (kind <= 0) { for (let k = 0; k < 4; k++){ ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(X(x0 + m + R() * (cell - 2 * m)), Y(y0 + m + R() * (cell - 2 * m)), .8, 0, 7); ctx.fill(); } }
    else if (kind === 1) { for (const [u, v] of [[.3, .3], [.7, .3], [.3, .7], [.7, .7]]){ const pts = []; for (let a = 0; a < 6.6; a += .9) pts.push([x0 + u * cell + Math.cos(a) * cell * .11, y0 + v * cell + Math.sin(a) * cell * .11]); stroke(pts, { amp: .2, w: .7 }); } }
    else if (kind === 2) { for (const [u, v] of [[.3, .3], [.7, .3], [.3, .7], [.7, .7]]){ const h = cell * .1, px = x0 + u * cell, py = y0 + v * cell; stroke([[px - h, py - h], [px + h, py + h]], { amp: .2, w: .8 }); stroke([[px + h, py - h], [px - h, py + h]], { amp: .2, w: .8 }); } }
    else if (kind === 3) { for (let k = 0; k < 4; k++){ const px = x0 + cell * (.22 + k * .18); stroke([[px, y0 + m], [px + cell * .06, y0 + cell - m]], { amp: .2, w: .8 }); } if (R() < .5) stroke([[x0 + m, y0 + cell * .7], [x0 + cell - m, y0 + cell * .35]], { amp: .2, w: .8 }); }
    else if (kind === 4) { ctx.save(); ctx.beginPath(); ctx.rect(X(x0), Y(y0), cell * P.k, cell * P.k); ctx.clip(); for (let k = -3; k <= 3; k++){ const d = k * cell * .24; stroke([[x0 + d - cell * .1, y0 + cell * 1.1], [x0 + d + cell * 1.1, y0 - cell * .1]], { amp: .25, w: .85 }); } ctx.restore(); }
    else { for (let k = 0; k < 7; k++){ stroke([[x0 + R() * cell, y0 + R() * cell], [x0 + R() * cell, y0 + R() * cell]], { amp: .3, w: 1.2 }); } }
  }
  // union outline: every cell edge with an empty neighbour, drawn a little long
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++){
    if (!on[r][c]) continue; const x0 = c * cell, y0 = 8 + r * cell, o = cell * .12;
    if (!at(r - 1, c)) stroke([[x0 - o * J(), y0], [x0 + cell + o * J(), y0]], { amp: .45, w: 1.1 });
    if (!at(r + 1, c)) stroke([[x0 - o * J(), y0 + cell], [x0 + cell + o * J(), y0 + cell]], { amp: .45, w: 1.1 });
    if (!at(r, c - 1)) stroke([[x0, y0 - o * J()], [x0, y0 + cell + o * J()]], { amp: .45, w: 1.1 });
    if (!at(r, c + 1)) stroke([[x0 + cell, y0 - o * J()], [x0 + cell, y0 + cell + o * J()]], { amp: .45, w: 1.1 });
  }
  if (headScribble) headKnot(R, cell * .55);
}
function headKnot(R, rad){ // the hatched circle that survives to the last panel
  const [hx, hy] = SUBJECT.anchor;
  const ring = []; for (let a = 0; a < 7.2; a += .3) ring.push([hx + Math.cos(a) * rad * (1 + (R() - .5) * .15), hy + Math.sin(a) * rad * .85]); stroke(ring, { amp: .5, w: 1.1 });
  for (let k = -4; k <= 4; k++){ const d = k * rad * .2, h = Math.sqrt(Math.max(0, rad * rad - d * d)) * .8; stroke([[hx + d - h * .6, hy + h * .8], [hx + d + h * .6, hy - h * .8]], { amp: .4, w: 1 }); }
  stroke([[hx - rad * 2.2, hy - rad * .4], [hx - rad * .6, hy]], { amp: .5, w: 1 });
}
function finalLine(R){
  // the coarsest cells, as a handful of long straight strokes that overshoot their corners
  const cell = 34, cols = 6, rows = 4, on = [];
  for (let r = 0; r < rows; r++){ on[r] = []; for (let c = 0; c < cols; c++){ let n = 0; for (let k = 0; k < 16; k++) if (inside(c * cell + R() * cell, 8 + r * cell + R() * cell)) n++; on[r][c] = n > 7; } }
  const at = (r, c) => r >= 0 && c >= 0 && r < rows && c < cols && on[r][c];
  const edges = [];
  for (let r = 0; r <= rows; r++){ let run = null; for (let c = 0; c <= cols; c++){ const e = c < cols && at(r - 1, c) !== at(r, c); if (e && !run) run = c; if (!e && run !== null){ edges.push([[run * cell, 8 + r * cell], [c * cell, 8 + r * cell]]); run = null; } } }
  for (let c = 0; c <= cols; c++){ let run = null; for (let r = 0; r <= rows; r++){ const e = r < rows && at(r, c - 1) !== at(r, c); if (e && run === null) run = r; if (!e && run !== null){ edges.push([[c * cell, 8 + run * cell], [c * cell, 8 + r * cell]]); run = null; } } }
  for (const [a, b] of edges){ const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, o1 = 1 + R() * 5, o2 = 1 + R() * 5, tilt = (R() - .5) * 3;
    stroke(resample([[a[0] - ux * o1, a[1] - uy * o1 + tilt], [b[0] + ux * o2, b[1] + uy * o2 - tilt]], 6, false), { amp: .5, w: 1.05 }); }
  headKnot(R, 12);
}

const details = (stage, R) => SUBJECT.details && SUBJECT.details(PEN, stage, R);
const NUMERALS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
const STAGES = [
  R => { hatchSketch(R, 1300, { stipple: 60 }); outline(2, 1.2); details(0, R); },
  R => { hatchSketch(R, 2000, { cross: true, lenMul: 1.2, stipple: 30 }); outline(3, 1.5); details(1, R); },
  R => { hatchSketch(R, 700, { dark: SUBJECT.dark ?? .55, stipple: 260 }); outline(2, .9, 1.4); details(2, R); },
  R => { hatchSketch(R, 450, { dark: (SUBJECT.dark ?? .55) + .13, stipple: 380, lenMul: .8 }); outline(1, .6, 1.2); details(3, R); },
  R => stippleGrid(R, 4.2),
  R => cells(7, R, { rim: .35 }),
  R => cells(8.5, R, { rim: .3 }),
  R => cells(10, R, { rim: .25, headScribble: false }),
  R => cells(12, R, { rim: .2, fill: .85 }),
  R => cells(17, R, { fill: .5, outlineCells: false, headScribble: true }),
  R => cells(22, R, { fill: .4, outlineCells: false, headScribble: true }),
  R => finalLine(R),
];

// ---------- paper ----------
const paper = document.createElement('canvas'); paper.width = LW; paper.height = LH;
{ const g = paper.getContext('2d'), R = rng(7); g.fillStyle = PAPER; g.fillRect(0, 0, LW, LH);
  for (let i = 0; i < 90; i++){ const x = R() * LW, y = R() * LH, r = 40 + R() * 160, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${R() < .5 ? '255,255,250' : '205,200,190'},.07)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  const d = g.getImageData(0, 0, LW, LH); for (let i = 0; i < d.data.length; i += 4){ const n = (R() - .5) * 10; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; } g.putImageData(d, 0, 0); }

// ---------- draw ----------
let DPR = 1;
function resize(){ if (!SUBJECT) return; DPR = Math.min(devicePixelRatio || 1, 2); cv.width = innerWidth * DPR; cv.height = innerHeight * DPR; draw(); }
function draw(){
  const tick = boil ? Math.floor(performance.now() / 160) % 3 : 0;   // three boil states
  const s = Math.min(cv.width / LW, cv.height / LH), ox = (cv.width - LW * s) / 2, oy = (cv.height - LH * s) / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = PAPER; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(s, 0, 0, s, ox, oy); ctx.drawImage(paper, 0, 0);
  ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  STAGES.forEach((fn, k) => {
    const col = k % 4, row = Math.floor(k / 4), pw = LW / 4, ph = LH / 3;
    P = { k: pw * .66 / 200, ox: col * pw + pw * .17, oy: row * ph + ph * .14 };
    J = rng(variant * 1000 + k * 17 + tick * 7919);
    fn(rng(variant * 31 + k));
    ctx.fillStyle = INK; ctx.globalAlpha = .75; ctx.font = '13px "Times New Roman", serif'; ctx.textAlign = 'center';
    ctx.fillText(NUMERALS[k], col * pw + pw / 2, row * ph + ph * .74); ctx.globalAlpha = 1;
  });
}
let lastTick = -1;
function loop(){ const tick = Math.floor(performance.now() / 160) % 3; if (boil && tick !== lastTick){ lastTick = tick; draw(); } requestAnimationFrame(loop); }
addEventListener('resize', resize);
cv.addEventListener('click', () => { variant++; draw(); });
addEventListener('keydown', e => { if (e.key === 'b') { boil = !boil; draw(); } });
function defineSheet(subject){ SUBJECT = subject; if (subject.title) document.title = subject.title; resize(); loop(); }
let SUBJECT = null;

// pen for subject details; r is in unit coords, fill defaults to ink ('paper' for a knocked-out disc)
const PEN = { stroke, resample, X, Y, dot: (x, y, r = .6, fill = INK) => { ctx.fillStyle = fill === 'paper' ? PAPER : fill; ctx.beginPath(); ctx.arc(X(x), Y(y), r * P.k, 0, 7); ctx.fill(); } };
