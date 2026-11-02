// Stage, theme -> CSS vars, scene registry, seek(t), grain, and a scrubber for previewing in a browser.
(() => {
const { h, set, clamp } = L;
const F = window.FILM;
const Q = new URLSearchParams(location.search);
const RENDER = Q.has('render');
const FPS = F.fps, W = F.w, H = F.h;
const stage = document.getElementById('stage');
const scenes = window.SCENE_DEFS;

for (const [k, v] of Object.entries(F.theme || {})) document.documentElement.style.setProperty('--' + k, v);
document.documentElement.style.setProperty('--W', `${W}px`); document.documentElement.style.setProperty('--H', `${H}px`);

// build may be async (loading models): scenes build in order, each awaited. `gl: true` -> S.gl, a three.js Group in the world.
async function buildAll() {
  scenes.sort((a, b) => (a.z ?? a.t0) - (b.z ?? b.t0));
  for (const s of scenes) {
    s.root = h('div', { class: 'scene', 'data-scene': s.name });
    stage.append(s.root);
    if (s.gl === true) { s.gl = new GL.THREE.Group(); s.gl.name = s.name; GL.scene.add(s.gl); }
    await s.build(s.root);
    s.root.style.display = 'none';
  }
}

// grain: a few pre-baked noise tiles, picked per frame (keeps flat dark areas from banding after x264)
const grain = h('div', { id: 'grain' });
const tiles = [];
function bakeGrain() {
  for (let k = 0; k < 6; k++) {
    const c = document.createElement('canvas'); c.width = c.height = 384;
    const x = c.getContext('2d'); const im = x.createImageData(384, 384); const r = L.rng(1234 + k * 977);
    for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (r() - 0.5) * 255 * 0.9; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0); tiles.push(`url(${c.toDataURL()})`);
  }
}

// seek(t) must be a pure function of t: the renderer jumps to arbitrary times in parallel workers.
window.seek = (t, frame) => {
  t = clamp(t, 0, F.dur);
  const f = frame ?? Math.round(t * FPS);
  let cur = null;
  window.CUR = null;  // overlays (the caption) sort last and read CUR.light to flip to dark text on white scenes
  for (const s of scenes) {
    const on = t >= s.t0 && t < s.t1;
    s.root.style.display = on ? '' : 'none';
    if (s.gl?.isObject3D) s.gl.visible = on;
    if (on) { if (!s.overlay) window.CUR = cur = s; s.update(t); }
  }
  window.GL?.render(t);
  const g = L.rng(f * 7919 + 13);
  set(grain, { backgroundImage: tiles[f % tiles.length], backgroundPosition: `${Math.floor(g() * 384)}px ${Math.floor(g() * 384)}px`,
               opacity: String(cur?.grain ?? 0.1) });
  window.__t = t;
};

async function boot() {
  await document.fonts.ready;
  await Promise.all((F.fonts || []).map(f => document.fonts.load(f)));
  bakeGrain();
  if (window.GL) stage.prepend(GL.canvas);
  await buildAll();
  stage.append(grain);
  window.SCENES = scenes.filter(s => !s.overlay).map(s => ({ name: s.name, t0: s.t0, t1: s.t1 }));
  window.SFX.sort((a, b) => a.t - b.t);
  const t0 = parseFloat(Q.get('t') || '0');
  seek(t0);
  window.READY = true;
  if (!RENDER) previewUI(t0);
}

// preview: scrubber, space plays with the mix, arrows step a frame (shift: a second)
function previewUI(t0) {
  document.body.style.background = '#111';
  for (const el of [document.documentElement, document.body]) { el.style.overflow = 'auto'; el.style.height = 'auto'; }
  const bar = h('div', { style: { position: 'fixed', left: 0, right: 0, bottom: 0, height: '44px', background: '#111', display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px', zIndex: 999, color: '#ddd', font: '13px Mono' } });
  const rng = h('input', { type: 'range', min: 0, max: F.dur, step: 1 / FPS, value: t0, style: { flex: 1 } });
  const lab = h('span', {}, t0.toFixed(2));
  const audio = h('audio', { src: F.preview?.audio || 'build/mix.wav', preload: 'auto' });
  bar.append(h('span', {}, 'space: play'), rng, lab, audio);
  document.body.append(bar);
  const go = t => { seek(t); rng.value = t; lab.textContent = t.toFixed(2); };
  rng.oninput = () => { audio.pause(); go(+rng.value); };
  let playing = false, start = 0, from = 0;
  const loop = () => { if (!playing) return; const t = from + (performance.now() - start) / 1000; if (t >= F.dur) { playing = false; return; } go(t); requestAnimationFrame(loop); };
  addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); playing = !playing; if (playing) { from = +rng.value; start = performance.now(); audio.currentTime = from; audio.play().catch(() => {}); loop(); } else audio.pause(); }
    if (e.code === 'ArrowRight') go(+rng.value + (e.shiftKey ? 1 : 1 / FPS));
    if (e.code === 'ArrowLeft') go(+rng.value - (e.shiftKey ? 1 : 1 / FPS));
  });
  const fit = () => { const k = Math.min(innerWidth / W, (innerHeight - 44) / H); stage.style.transform = `scale(${k})`; stage.style.transformOrigin = '0 0'; };
  addEventListener('resize', fit); fit();
}

window.addEventListener('load', boot);
})();
