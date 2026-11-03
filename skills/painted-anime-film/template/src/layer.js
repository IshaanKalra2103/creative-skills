// ---------- cel layer: render 3D-assisted drawings into the 2D composite ----------
const BM = 110; // plate margin in px: plates are W + 2*BM wide so camera pushes never show an edge
// Lighting presets. sun = direction TO the sun; amb/amb2 = shadow and deep-shadow multipliers (cool, coloured);
// gobo = dappled canopy light [scale, threshold, amount, seed]; fog = [density, start distance].
const LIGHTS = {
  // low morning sun behind-right, cool sky fill, warm haze (the forest-guardian look)
  morning: { sun: [0.86, 0.34, 0.38], sunCol: [1.08, 0.99, 0.84], amb: [0.6, 0.64, 0.74], amb2: [0.47, 0.5, 0.62],
    fogCol: [0.93, 0.87, 0.77], fog: [0.011, 18], gobo: [0.32, 0.5, 1, 0], shadowCenter: [0, 4, 0], shadowR: 16 },
  // the blue hour before dawn: no direct sun, everything in cool shadow
  predawn: { sun: [-0.3, 0.8, 0.5], sunCol: [0.62, 0.66, 0.8], amb: [0.5, 0.53, 0.66], amb2: [0.4, 0.42, 0.55],
    fogCol: [0.55, 0.58, 0.68], fog: [0.008, 25], noShadow: true, shadowCenter: [0, 2, 0], shadowR: 10 },
  // open midday: high warm sun, short shadows
  noon: { sun: [0.4, 0.85, 0.35], sunCol: [1.1, 1.06, 0.96], amb: [0.66, 0.7, 0.82], amb2: [0.52, 0.56, 0.7],
    fogCol: [0.86, 0.9, 0.96], fog: [0.006, 30], shadowCenter: [0, 2, 0], shadowR: 12 },
};
const LIGHT_FOREST = LIGHTS.morning; // name used by the forest backgrounds in examples/

// lerp two lighting presets (for a scene whose light changes inside a shot)
function lightMix(A, B, k) {
  const o = Object.assign({}, k < 0.5 ? A : B);
  for (const key of ['sun', 'sunCol', 'amb', 'amb2', 'fogCol']) if (A[key] && B[key]) o[key] = mixc(A[key], B[key], k);
  if (A.fog && B.fog) o.fog = [lerp(A.fog[0], B.fog[0], k), lerp(A.fog[1], B.fog[1], k)];
  return o;
}

// a ground disc that only shows cast shadows (mat type 7)
let _CATCHER = null;
function catcherItem(y = 0, r = 60) {
  if (!_CATCHER) _CATCHER = glMesh(finalize(loft([[0, r, r, 2]], { n: 48, capB: false })));
  return { gm: _CATCHER, model: M4.trans(0, y, 0), mat: { type: 7, col: [0, 0, 0], twoSided: true }, noShadow: true };
}

// render a list of GL items with the cel + ink passes and lay the result over g.
// o: {lineW, seed, jit, ink, inkFog, crease, clipY, clipN, sat, alpha, ground:false|y, comp}
// Change o.seed only when the drawing changes (on twos) so held frames are identical.
function celLayer(g, cam, items, L, o = {}) {
  if (!GL) return null;
  const list = items.slice();
  if (o.ground !== false && o.ground !== undefined) list.push(catcherItem(o.ground));
  const c = glRender(list, cam, L, { lineW: o.lineW || 1.5, seed: o.seed || 0, jit: o.jit, ink: o.ink, inkFog: o.inkFog ?? 0.012, crease: o.crease, clipY: o.clipY, clipN: o.clipN, sat: o.sat, moss: o.moss, dirt: o.dirt });
  g.save();
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.globalAlpha = o.alpha ?? 1;
  if (o.comp) g.globalCompositeOperation = o.comp;
  g.drawImage(c, 0, 0, W, H);
  g.restore();
  return c;
}

// held-drawing helpers ------------------------------------------------------
// frame index on twos (or threes) so motion updates 12 (8) times a second while the camera can move on ones
const onTwos = (lt, n = 2) => Math.floor(lt * FPS / n) * n / FPS;
// a per-drawing seed for the ink boil: same value for every frame of one drawing
const drawSeed = (lt, n = 2) => Math.floor(lt * FPS / n);
// step through a keyframe table [[frame, value], ...] like a timing sheet (no interpolation)
function keyAt(keys, f) { let v = keys[0][1]; for (const [k, x] of keys) { if (f >= k) v = x; else break; } return v; }
// interpolated version (for slow drifts between key poses)
function keyLerp(keys, f, ease = easeInOut) {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (f < keys[i][0]) {
    const [a, x] = keys[i - 1], [b, y] = keys[i]; const k = ease((f - a) / (b - a));
    return Array.isArray(x) ? x.map((v, j) => lerp(v, y[j], k)) : lerp(x, y, k);
  }
  return keys[keys.length - 1][1];
}
// camera shake on ones, decaying: amp px, from t0, over dur seconds
function shake(lt, t0, amp, dur, seed = 1) {
  if (lt < t0 || lt > t0 + dur) return [0, 0];
  const f = Math.floor(lt * FPS), k = 1 - (lt - t0) / dur, a = amp * k * k;
  return [(hash2i(f, seed) - 0.5) * 2 * a, (hash2i(f, seed + 7) - 0.5) * 2 * a];
}
