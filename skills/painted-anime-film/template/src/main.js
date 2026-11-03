// ---------- compositor, timeline, playback ----------
const filmCanvas = document.getElementById('film');
filmCanvas.width = W; filmCanvas.height = H;
const ctx = filmCanvas.getContext('2d');


let TOTAL = 0;

// draw a multiplane plate given base camera and current camera
function drawPlate(g, pl, base, cam, opts = {}) {
  const cx = pl.ox + pl.w / 2, cy = pl.oy + pl.h / 2;
  if (!pl._world) pl._world = base.unproject(cx, cy, pl.depth);
  const p = cam.project(pl._world);
  const s = (pl.depth / p[2]) * (cam.f / base.f);
  const w = pl.w * s, h = pl.h * s;
  g.save();
  g.globalAlpha = opts.alpha ?? 1;
  if (opts.comp) g.globalCompositeOperation = opts.comp;
  g.drawImage(pl.c, p[0] - w / 2 + (opts.dx || 0), p[1] - h / 2 + (opts.dy || 0), w, h);
  g.restore();
}

function shotAt(t) {
  let acc = 0;
  for (let i = 0; i < SHOTS.length; i++) {
    if (t < acc + SHOTS[i].dur || i === SHOTS.length - 1) return { sh: SHOTS[i], lt: t - acc, i };
    acc += SHOTS[i].dur;
  }
}

function renderFrame(t) {
  const { sh, lt, i } = shotAt(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  sh.draw(ctx, lt, sh);
  if (sh.fadeIn && lt < sh.fadeIn) { ctx.fillStyle = `rgba(0,0,0,${1 - easeInOut(lt / sh.fadeIn)})`; ctx.fillRect(0, 0, W, H); }
  if (sh.fadeOut && lt > sh.dur - sh.fadeOut) { ctx.fillStyle = `rgba(0,0,0,${easeInOut((lt - (sh.dur - sh.fadeOut)) / sh.fadeOut)})`; ctx.fillRect(0, 0, W, H); }
  post(ctx, t, lt, sh);
}

// --- post: film grain + gentle vignette ---
let _grains = null, _vig = null;
function post(g, t, lt, sh) {
  if (!_grains) {
    _grains = [];
    for (let k = 0; k < 6; k++) {
      const c = mkCanvas(512, 512), q = c.getContext('2d'), img = q.createImageData(512, 512), rng = new RNG(900 + k);
      for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (rng.next() - 0.5) * 60; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      q.putImageData(img, 0, 0); _grains.push(c);
    }
    _vig = mkCanvas(W, H); const q = _vig.getContext('2d');
    const grd = q.createRadialGradient(W / 2, H * 0.52, H * 0.35, W / 2, H * 0.5, H * 1.05);
    grd.addColorStop(0, 'rgba(30,20,40,0)'); grd.addColorStop(1, 'rgba(30,20,40,0.42)');
    q.fillStyle = grd; q.fillRect(0, 0, W, H);
  }
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'multiply'; g.globalAlpha = sh.vignette ?? 0.8; g.drawImage(_vig, 0, 0);
  g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.22;
  const gi = Math.floor(t * FPS) % _grains.length;
  const pat = g.createPattern(_grains[gi], 'repeat'); g.fillStyle = pat; g.fillRect(0, 0, W, H);
  g.restore();
}

// ---------- load + playback ----------
let READY = false, playing = false, t0 = 0, tPause = 0, lastFrame = -1;
const ui = document.getElementById('ui');
async function load() {
  buildTips();
  if (window.initGL) initGL();
  let k = 0;
  for (const sh of SHOTS) {
    if (ui) ui.querySelector('.bar i').style.width = (k / SHOTS.length * 100) + '%';
    await new Promise(r => setTimeout(r, 0));
    if (sh.build) sh.build(sh);
    k++;
  }
  TOTAL = SHOTS.reduce((a, s) => a + s.dur, 0);
  // prewarm: draw a few frames of every shot so lazy caches/shaders don't hitch at the cuts
  { let acc = 0; for (const sh of SHOTS) { for (const u of [0.02, 0.5, 0.97]) renderFrame(acc + sh.dur * u); acc += sh.dur; await new Promise(r => setTimeout(r, 0)); } }
  READY = true; window.__ready = true; window.__total = TOTAL;
  if (ui) ui.classList.add('ready');
  const q = new URLSearchParams(location.search);
  renderFrame(parseFloat(q.get('t') || '0'));
}
window.__seek = (t) => { renderFrame(Math.floor(t * FPS + 1e-6) / FPS); return true; };

function tick(now) {
  if (playing) {
    const at = window.audioClock ? audioClock() : null;
    let t = at ?? (now - t0) / 1000;
    if (at != null) t0 = now - at * 1000; // keep the wall clock in step so pause/fallback resume in place
    if (t >= TOTAL) { t = TOTAL - 1e-3; playing = false; if (ui) ui.classList.remove('hidden'), ui.classList.add('ended'); }
    const f = Math.floor(t * FPS);
    if (f !== lastFrame) { lastFrame = f; renderFrame(f / FPS); if (window.audioAt) audioAt(f / FPS); }
  }
  requestAnimationFrame(tick);
}
function start(from = 0) {
  if (!READY) return;
  if (window.startAudio) startAudio(from);
  playing = true; t0 = performance.now() - from * 1000; lastFrame = -1;
  if (ui) ui.classList.add('hidden'), ui.classList.remove('ended');
}
if (ui) ui.addEventListener('click', () => start(0));
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    if (!READY) return;
    if (playing) { playing = false; tPause = (performance.now() - t0) / 1000; if (window.stopAudio) stopAudio(); }
    else start(tPause || 0);
    e.preventDefault();
  }
});
requestAnimationFrame(tick);
window.addEventListener('load', () => load());
