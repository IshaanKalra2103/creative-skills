// Stage, theme -> CSS vars, scene registry, seek(t), grain, optional HUD, and a scrubber for previewing in a browser.
(() => {
const { h, set, clamp } = L;
const F = window.FILM;
const Q = new URLSearchParams(location.search);
const RENDER = Q.has('render');
const DUR = F.dur, FPS = F.fps, W = F.w, H = F.h;
const stage = document.getElementById('stage');
const SFX = window.SFX;
const scenes = window.SCENE_DEFS;

// palette -> the CSS variables style.css and the scenes use
const VARS = { paper: '--paper', ink: '--ink', accent: '--lime', accent2: '--purple', accent2Text: '--violet', dark: '--dark', card: '--card', well: '--well', alert: '--red', pink: '--pink' };
for (const [k, v] of Object.entries(F.theme || {})) if (VARS[k]) document.documentElement.style.setProperty(VARS[k], v);
document.documentElement.style.setProperty('--W', `${W}px`); document.documentElement.style.setProperty('--H', `${H}px`);

function buildAll() {
  scenes.sort((a, b) => (a.z ?? a.t0) - (b.z ?? b.t0));
  for (const s of scenes) {
    s.root = h('div', { class: 'scene', 'data-scene': s.name });
    stage.append(s.root);
    s.build(s.root);
    s.root.style.display = 'none';
  }
}

// grain: a few pre-baked noise tiles, picked per frame
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

// optional corner HUD (?hud=1)
const hud = h('div', { id: 'hud' });
const hudL = h('div', { style: { position: 'absolute', left: '64px', top: '40px' } });
const hudR = h('div', { style: { position: 'absolute', right: '64px', top: '40px' } }, F.hud?.right || '');
const hudBL = h('div', { style: { position: 'absolute', left: '64px', bottom: '36px' } }, F.hud?.footer || '');
const hudTC = h('div', { style: { position: 'absolute', right: '64px', bottom: '36px' } });
hud.append(hudL, hudR, hudBL, hudTC,
  h('div', { class: 'br', style: { left: '32px', top: '24px', borderWidth: '3px 0 0 3px' } }),
  h('div', { class: 'br', style: { right: '32px', top: '24px', borderWidth: '3px 3px 0 0' } }),
  h('div', { class: 'br', style: { left: '32px', bottom: '24px', borderWidth: '0 0 3px 3px' } }),
  h('div', { class: 'br', style: { right: '32px', bottom: '24px', borderWidth: '0 3px 3px 0' } }));
if (Q.get('hud') === '1') hud.classList.add('on');

// seek(t) must be a pure function of t: the renderer jumps to arbitrary times in parallel workers.
window.seek = (t, frame) => {
  t = clamp(t, 0, DUR);
  const f = frame ?? Math.round(t * FPS);
  let cur = null;
  for (const s of scenes) {
    const on = t >= s.t0 && t < s.t1;
    s.root.style.display = on ? '' : 'none';
    if (on) { s.update(t); if (!s.overlay) cur = s; }
  }
  // grain is keyed to the frame, so the sub-frames of one frame share it and motion blur doesn't average it away
  const g = L.rng(f * 7919 + 13);
  set(grain, { backgroundImage: tiles[f % tiles.length], backgroundPosition: `${Math.floor(g() * 384)}px ${Math.floor(g() * 384)}px`,
               opacity: String(cur?.grain ?? 0.2) });
  if (hud.classList.contains('on') && cur) {
    set(hud, { color: cur.dark ? 'rgba(241,239,235,.75)' : 'rgba(31,29,25,.7)' });
    L.txt(hudL, `${F.hud?.left || ''}  ${cur.hud || ''}`);
    const fr = Math.floor((t % 1) * 24), s = Math.floor(t);
    L.txt(hudTC, `00:00:${String(s).padStart(2, '0')}:${String(fr).padStart(2, '0')}`);
  }
  window.__t = t;
};

async function boot() {
  await document.fonts.ready;
  await Promise.all((F.fonts || []).map(f => document.fonts.load(f)));
  bakeGrain();
  buildAll();
  stage.append(grain, hud);
  window.SCENES = scenes.map(s => ({ name: s.name, t0: s.t0, t1: s.t1 }));
  SFX.sort((a, b) => a.t - b.t);
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
  const rng = h('input', { type: 'range', min: 0, max: DUR, step: 1 / FPS, value: t0, style: { flex: 1 } });
  const lab = h('span', {}, t0.toFixed(2));
  const audio = h('audio', { src: F.preview?.audio || 'build/mix.wav', preload: 'auto' });
  bar.append(h('span', {}, 'space: play'), rng, lab, audio);
  document.body.append(bar);
  const go = t => { seek(t); rng.value = t; lab.textContent = t.toFixed(2); };
  rng.oninput = () => { audio.pause(); go(+rng.value); };
  let playing = false, start = 0, from = 0;
  const loop = () => { if (!playing) return; const t = from + (performance.now() - start) / 1000; if (t >= DUR) { playing = false; return; } go(t); requestAnimationFrame(loop); };
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
