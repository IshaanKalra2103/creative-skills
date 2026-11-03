# Engine reference

The template is plain browser JS with no modules: every file adds globals, in the order given by `src/order.json`. `node build.mjs` writes `dev.html` (one script tag per file, for editing) and `film.html` (one self-contained file). Read the function headers in the source for every parameter; this page is the map.

## Files

| File | Provides |
|---|---|
| `core.js` | `W, H, FPS, TAU`, `RNG` (`next, range, int`), `vnoise2, fbm2, vnoise1, hash2i`, `clamp, lerp, invlerp, smooth`, easings, colour `hx('rrggbb')→[r,g,b]`, `mixc, mulc, css(c, a)`, `jit`, `V3`, `M4`, `Cam`, `SHOTS`, `fitCam` |
| `paint.js` | brush tips + `dab`, `resetG`, `taper`, `bez/qbez`, `fogPal`, `paintSky(g,w,h,stops,rng)`, `paintClouds`, `paintTreeline`, `leafMass`, `paintCrown`, `paintTrunk`, `paintBranch`, `paintGrassTuft`, `paintFern`, `paintFlowers`, `paintMist`, `applyGrain`, `paintLightPatch`, `Plate`, `mkCanvas` |
| `kit.js` | the default palette `PAL` and `fogged`; `paintTree`, `paintGround`, `paintGrassBand`, `paintShafts`, `glow`, `paintHaze`, `paintTrunkRow`, `paintForestFloor`, `paintTreeShadow`, `paintShadowStreak` |
| `gl.js` | `initGL`, `glMesh(mesh)`, `glUpdateMesh(gm, mesh)`, `glRender(items, cam, L, opts)`, `glProbe(sx, sy)→[z, id]` |
| `mesh.js` | `loft`, `lathe`, `rbox`, `ringSE`, `xformMesh`, `mergeMesh`, `finalize`; matrix shorthands `T, RX, RY, RZ, MUL` |
| `layer.js` | `BM`, `LIGHTS` presets, `lightMix`, `celLayer(g, cam, items, L, o)`, `catcherItem`, `onTwos`, `drawSeed`, `keyAt`, `keyLerp`, `shake` |
| `reveal.js` | two-state world: `platePair`, `pick`, `revealMatte`, `revealDraw`, `rvNoise` |
| `fx.js` | `buildLeaves`, `makeLeaves`, `drawLeavesWorld`, `drawPuff`, `glowFx`, `drawFlame`, `drawWindRing`, `drawFlockBird`, `drawMotes`, `drawGlint`, `drawBeam` |
| `bird.js` | `birdItems({p, yaw, pitch, roll, flap, sweep, headYaw, headPitch, tail, legs, s})`: a 3D cel songbird |
| `audio.js` | soundtrack element; `startAudio`, `stopAudio`, `audioClock` |
| `main.js` | `drawPlate`, `shotAt`, `renderFrame`, `post`, `load`, playback; `window.__seek(t)`, `__ready`, `__total` |

## A shot file

```js
(function () {
  const M = BM, PW = W + M * 2, PH = H + M * 2;          // BM = 110 plate margin (layer.js)
  const sh = { name: 'valley', dur: 6, fadeIn: 2.2 };
  sh.base = new Cam([0, 3, 40], [0, 4, 0], 36);           // where the plates were painted from
  sh.cam = (lt) => { const k = easeInOut(lt / sh.dur); return new Cam([0, 3, lerp(40, 36, k)], [0, 4, 0], 36); };
  sh.build = () => {                                     // runs once at load: paint plates here
    const P = {};
    P.sky = new Plate(PW, PH, 3000, -M, -M); paintSky(P.sky.g, PW, PH, [[0, hx('9fb3c9')], [1, hx('f2dcc0')]], new RNG(1));
    // ... more plates, back to front
    for (const k in P) applyGrain(P[k].g, P[k].w, P[k].h, 0.12);
    sh.P = P;
  };
  sh.draw = (g, lt) => {                                 // runs every frame
    const cam = sh.cam(lt), B = sh.base, P = sh.P, tt = onTwos(lt);
    drawPlate(g, P.sky, B, cam);
    celLayer(g, cam, myCharacterItems(tt), LIGHTS.morning, { seed: drawSeed(lt), ground: 0 });
  };
  SHOTS.push(sh);
})();
```

Shots play in `SHOTS` order, so list them in `order.json` in story order. `sh.vignette` overrides the vignette strength. Each frame begins with black, so a shot must cover the whole frame.

## Plates

- `drawPlate(g, plate, base, cam, {alpha, comp, dx, dy})` re-projects the plate's centre at its depth from `base` into `cam` and scales it by depth. Parallax and push-ins come out of that for free.
- Paint in plate pixels: the plate's (0, 0) sits at frame pixel `(ox, oy) = (-BM, -BM)`. To place things at a world point, use `const p = sh.base.project(world); x = p[0] + BM; y = p[1] + BM`.
- Call `resetG(g)` after `dab()`, because `dab` leaves a transform set.

## Cels

- Build meshes once (in `build()` or lazily) with `glMesh(finalize(loft(...)))`. For a shape that deforms per drawing, keep the JS mesh, edit `pos`/`nrm`, and call `glUpdateMesh(gm, finalize(mesh))`, but only when the drawing changes (on twos).
- An item is `{gm, model: M4, mat: {type, col, col2, id, emit, emitCol, coat, coatCol, coatA, twoSided, ...}, noShadow}`. Material types are listed at the top of `glRender` in `gl.js`. Give each part a distinct `id` so the ink pass draws lines between touching parts.
- `celLayer(g, cam, items, L, {seed, lineW, ink, clipY, ground})` renders the items and composites them. Use `clipY` to cut the mesh at a surface it is rising through. Use `ground: 0` to add the shadow catcher at y = 0.
- `LIGHTS.morning` is a warm low sun, `LIGHTS.predawn` is a cool sunless dusk, and `LIGHTS.noon` is high and warm. `lightMix(A, B, k)` blends between them inside a shot.

## Two-state world (`reveal.js`)

1. In `build()`, paint each plate that changes with `platePair(w, h, depth, ox, oy, (g, which) => {...})`, using the same seeds and `pick(which, before, after)` for every colour.
2. Each frame, call `revealMatte(cam, (hit, sx, sy) => arrivalSeconds, onTwos(lt), {soft, band})`. Here `hit` is where the pixel's ray meets the ground (or `null` for sky). Return a time, such as distance from the source divided by speed plus `rvNoise(hit[0], hit[2]) * 1.5`.
3. Draw the stack with `revealDraw(g, (gg, which) => { drawPlate(gg, P.sky[which], B, cam); ... }, {edge: 0.5})`. Use the same matte for the front plates, drawn after the cels.
4. A frame can hold several mattes. Build one, draw the plates it governs, then build the next. For example, the sky warms outward from the sun, then the land fills outward from the character.

Rules that keep the two states aligned:
- Both states must make identical RNG draws. Anything painted in one state only (sky, far ridges seen only grey) uses its own `new RNG(seed + 1)`.
- Every `[before, after]` pair passed to a painter needs a real after value. A `0` placeholder paints black. Render the after state of every plate you will show before you call it done.
- Shadow colours that are dark in the before palette can turn pale in the after palette, and then contact shadows read as glass. Darken after-state shadows toward the material's dark tone.

Arrival times for surfaces that are not the ground: intersect the pixel's ray with the plane yourself (a wall front at z = k, a hillside at the plate's depth). Alternatively, for a plate at depth D, use `A = cam.unproject(0, 0, D)`, with `Bx`/`By` as the one-pixel steps, and then `x = A + Bx*sx + By*sy`. Fronts read as painted when `soft` is 0.14–0.18, `band` is about 0.5, and the noise is fine (`noise(x*5, y*5) * 0.12`). Coarse noise or a wide `soft` makes dark smoky blotches.

## Tools

| Command | Does |
|---|---|
| `node build.mjs` | writes dev.html and film.html |
| `node tools/contact.mjs out/c.png --shots` | contact sheet: each shot at 10/50/90% |
| `node tools/contact.mjs out/c.png --shot rise 12` | 12 frames through one shot (check timing and holds) |
| `RANDOM=8 node tools/contact.mjs out/r.png` | random frames (the "any frame is a still" test) |
| `node tools/render.mjs out/f 12.5 13` | individual full-size PNGs |
| `node tools/eval.mjs "SHOTS.map(s=>s.name)"` | evaluate JS in the loaded page |
| `node tools/film.mjs render/picture.mp4 [from] [to]` | pipe every frame into ffmpeg (no PNGs on disk) |
| `sh tools/mux.sh` | picture plus audio/soundtrack.wav give render/<name>.mp4 and -share.mp4 |

`dev.html?t=12.5` opens paused on a frame. Loading paints every plate (expect 30 s to 2 min). Rendering costs about 0.15–0.3 s per frame.

## Gotchas

- `dab()` leaves the context scaled and rotated, so call `resetG(g)` before plain drawing.
- Heavy `fog` in a light preset washes out far cels. For subjects more than 40 units away, lower `fog[0]` or raise `fog[1]`.
- Leaves in `fx.js` have no gravity, so give them `vy`.
- Puffs or effects very close to the camera fill the frame. Cull by depth.
- A mesh with low `n` or `smooth` shows facets as ink creases. Raise `smooth` (60–80) on soft shapes, or the `crease` option (0.8 → 0.6 draws fewer lines).
- `glRender` returns its own canvas, which is overwritten on the next call. Draw it (`celLayer` does) before rendering anything else.
- World points behind the camera project flipped, into the sky. Skip any point with `q[2] < 1` before drawing ground strokes, ruts or wires.
- Houses in an angled row must be painted furthest first (sort by distance to the camera). Otherwise near walls come out as grey slabs over the far ones.
- For a camera that trucks (slides sideways), make the plate wider than `W + 2*BM` by the travel in pixels at that plate's depth, plus the vertical travel.
- For a cel standing on a plate, place it at `base.unproject(sx, sy, plateDepth)` and scale it by that depth, so it moves with the plate.
- Yaw convention: positive yaw turns the face (local +z) toward +x, screen right. World +x in body space is `(cos yaw, sin yaw)`, so lean and drag along travel use that vector.
- `src/order.json` lists files with their `.js` extension. Take any lab or scratch file out of it before the final build.
