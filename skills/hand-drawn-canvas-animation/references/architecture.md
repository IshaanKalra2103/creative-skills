# Architecture, API, puppets, rendering, pitfalls

## Files of a film

```
my-film/
  core.js            copied from assets/, never edited per film
  my-film.html       copied from assets/film-template.html, edited
  render.mjs         copied from scripts/
  package.json       copied from scripts/, then npm i
  out/               my-film-frames/, my-film.mp4, my-film-contact.jpg
```

`my-film.html` has five sections in this order: brief and beat sheet (a
comment), palette, puppets, scenes, score, and the `defineFilm` call.

## Format and resolution

The frame is logical: the short side is always 1080 units and the long side
follows the aspect ratio, so a 16:9 film is 1920 x 1080 units and a 9:16 film
is 1080 x 1920. Scenes draw in these units and place things relative to `CX`,
`CY`, `W` and `H`, never at literal pixel positions, and the same scene then
works in any format. Output resolution is a separate choice made at render
time: `--width 1920` scales everything by `S` on the way to the canvas, lines
and dots included, so a 4K render is as crisp as a 1080 one.

```bash
node render.mjs film.html --grid 24 --ar 9:16              # vertical, short side 1080
node render.mjs film.html --ar 16:9 --width 3840           # 4K landscape
```

`defineFilm({ format: { ar: '16:9', width: 1920 } })` sets the film's default;
the query string (`?ar=16:9&w=1920`) overrides it. `layer()` canvases made at
file scope follow the format automatically. Output height is forced even, as
libx264 needs it.

## Invariants

- `drawFrame(i)` is a pure function of the drawn-frame index. Scenes keep no
  state between frames and never read the clock. Same `i`, same pixels, on
  any machine.
- A scene is `sceneX(c, tau, i)`: `c` a 2D context (main canvas or a layer),
  `tau` seconds since the scene started, `i` the global drawn frame.
- The timeline is `[{name, dur, fn}]`. Boundaries are the cuts. Duration and
  frame count derive from it.
- World units are pixels at zoom 1. `cam(c, x, y, zoom, rot)` puts world
  point `(x, y)` at the frame centre. Puppets draw in local coordinates,
  origin at the body centre, forward = up (negative y); place them with
  `translate`, `rotate`, `scale`.
- Compositing uses layers: render A into `L1`, B into `L2`, compose on the
  main context (`blot`, `iris`, `mosaic`, `flicker`, `blit`). Make layers once
  with `layer()` at file scope; draw a layer full-frame with `blit(c, L)`, not
  `drawImage(L, 0, 0)`, because layers live in output pixels.
- `PAL` is global and mutable through `usePalette`. A scene that needs a
  different look calls `usePalette` at its top; the next scene sets its own.
- Hooks for the renderer: `window.__frame(i)` returns the frame as a PNG data
  URL straight from the canvas (no screenshot, so CSS and device pixel ratio
  never matter), `window.__grid(n)` returns a sheet of n evenly spaced frames,
  `window.__NDRAW`, `window.__size`, `window.__ready`; query string
  `?frame=N&bare=1&ar=16:9&w=1920&grid=24`.

## API index (assets/core.js)

| section | names |
|---|---|
| config | `W`, `H`, `CX`, `CY`, `S`, `OUT_W`, `OUT_H`, `SHORT`, `setFormat({ar, width})`, `FPS_DRAW`, `FPS_OUT`, `TAU`, `HAND_FONT` |
| colour | `lerp`, `clamp`, `parseColor`, `toHex`, `mix`, `tint`, `shade`, `alpha`, `hsl`, `withHsl`, `rotateHue`, `saturate`, `lighten`, `ramp`, `harmony` |
| palettes | `PALETTES`, `PAL`, `usePalette`, `makePalette`, `derivePalette`, `duotone` |
| random, easing | `rng(seed)`, `easeIO`, `easeOut`, `easeIn`, `sm(a, b, t, ease)`, `flicker(i, period)`, `pulse(i, every, hold)` |
| geometry | `ellPts`, `ellPath`, `circPath`, `rectPath`, `roundRectPath`, `polyPath`, `pathLength`, `bez`, `layer(w, h)`, `cam`, `resetT`, `blit(c, layer)` |
| marks | `wob`, `crayon`, `hatch(c, path, box, opts)`, `grain`, `scribble`, `cross`, `construction`, `squiggleText`, `handText` |
| finishes | `surface(c, path, box, opts)`, `dotScreen`, `plate()`, `printPlate`, `paper`, `night` |
| lattices, particles | `hexPath`, `hexCells`, `hexLattice`, `aster`, `dotBurst`, `speedLines`, `loops` |
| motifs | `seedDot`, `ripples`, `dashedRing`, `dottedArc`, `plant`, `tornEdge`, `section`, `stickyNote`, `thread`, `signOff` |
| reveals, composition | `selfDraw`, `blot`, `iris`, `mosaic`, `montage`, `badges`, `flash` |
| sheets | `styleSheet`, `paletteSheet` |
| runtime | `defineFilm({palette, timeline, score, format})`, `gridSheet(n, cellW)`, `note`, `noiseBurst`, `pentHz`; hooks `window.__frame(i)` (PNG data URL), `window.__grid(n)`, `window.__size`, `window.__ready` |

Signatures worth knowing by heart:

```js
surface(c, path, box, { finish, color, seed, density, angle, gap, len, alpha, width, grain, cell })
hatch(c, path, box, { angle, gap, len, jitter, color, alpha, width, seed })
dotScreen(c, path, box, { cell, color, density /* number or (x,y)=>0..1 */, angle, jitter, seed, alpha, square })
printPlate(c, plateCanvas, { cell, ink, angle, jitter, seed, gain, maxCov, blend, al })
scribble(c, path, cx, cy, { colors, amp, alpha, width, seed })
construction(c, cx, cy, R, seed, color, alpha)
blot(c, srcLayer, cx, cy, R, seed, fringeColor)     // screen coords
iris(c, cx, cy, r, fn, outsideColor)                // fn(c) draws inside the circle
montage(c, cards, tau, per, i)                      // cards: [(c, tau, i) => void]
badges(c, cards, { cx, cy, r0, gap, size, ring, seed, progress, count, scale })
signOff(c, a, b, { x, y, size, ink, ink2, progressA, progressB })
```

`box` is `[x, y, w, h]` bounding the path in the same coordinates as the
path. It bounds the hatch or dot grid; a box that is too small leaves bare
patches, one too large only costs time.

## Building a puppet

1. **Parts.** 3 to 8 parts as ellipses, circles, rounded rects or polygons in
   local coordinates, about 200 px tall at scale 1. Keep the arguments in an
   `ARGS` object and build a `Path2D` per part from them; `ellPts(...ARGS.x)`
   reuses them for the wobbly outline.
2. **Pose.** 3 to 6 numbers: `walk`, `twitch`, `wing`, `flap`, `tuck`,
   `tilt`. Nothing else.
3. **Order.** Limbs behind, translucent parts, body parts back to front,
   face, accents on top.
4. **Per part.** `fill(path)` → `surface(c, path, box, {seed})` → `wob`
   outline. Markings are thick curved strokes clipped to the part. That is
   the whole ink pipeline, and it re-textures itself when the palette changes
   finish.
5. **Blueprint.** Chalk `wob` outlines only, weight 2.4 to 2.8, lattices in
   chalk at alpha 0.75.
6. **Details.** Hex-lattice eyes shaded toward a highlight (`mix(shade(blush), tint(blush), l)`),
   one `scribble` on the largest part, `construction` around the puppet in
   establishing shots.
7. **Motion.** Limbs from `sin(phase)`; blur by drawing a part three times
   at ±angle with alpha; never tween the texture.
8. **Test.** Put the puppet on the style sheet at scales 0.6, 1 and 1.8.
   Render frame 0. It must read at 240 px.

Non-creature subjects use the same recipe: parts are `roundRectPath`s and
circles, eyes become LEDs (small hex discs), hatch runs along panel
directions, markings become vents or traces, and `construction` lines make
the object read as a technical drawing.

## Riso plates

```js
function card(c) {
  paper(c);
  const inks = PAL.inks.slice(0, 3), angles = [.26, 1.31, 0];
  inks.forEach((ink, k) => {
    const P = plate(), g = P.getContext('2d');   // white plate, draw coverage in black
    g.fillStyle = '#000';
    if (k === 0) { /* blue shapes */ }
    if (k === 1) { /* pink shapes */ }
    if (k === 2) { /* yellow shapes */ }
    printPlate(c, P, { cell: 7, ink, angle: angles[k], seed: 30 + k });
  });
}
```

Grey on a plate is partial coverage; a canvas gradient on a plate becomes a
dot-size ramp; white on a plate is a knockout. Print order is the palette's
`inks` order; the darkest ink last. Overlaps multiply, so blue over yellow is
green and pink over blue is purple, which is how the reference gets six
colours from three inks.

## Performance budget (offline render)

| thing | budget |
|---|---|
| one drawn frame | 50 to 300 ms |
| hatch or dot screen layer | one `beginPath` + one `stroke`/`fill`, up to ~50k segments |
| `printPlate` | one `getImageData` on a 160 px coverage map plus ~25k arcs per plate; three plates per card is fine |
| grain | ≤ 8k rects per layer |
| mosaic cell | ≥ 12 px |
| static heavy layer | draw once per scene into a cached layer, then `drawImage` |

Cache pattern:

```js
const cache = {};
function sceneRoom(c, tau, i) {
  if (!cache.room) { cache.room = layer(); drawRoomStatic(cache.room.getContext('2d')); }
  resetT(c); c.drawImage(cache.room, 0, 0);
  // moving things on top
}
```

## Rendering

- One frame in a browser: open `<film>.html?frame=37` (with the player),
  `<film>.html?grid=24` (a sheet of 24 evenly spaced frames), or add
  `&bare=1` for the canvas alone.
- First look without a window: `node render.mjs <film>.html --grid 24` writes
  `out/<film>-grid.jpg` in a few seconds. Look at it before anything else.
- Spot check: `node render.mjs <film>.html --only 0,37,74` writes
  `out/<film>-frames/NNNN.png` and stops.
- Full render: `node render.mjs <film>.html`. One headless Chrome through
  `puppeteer-core`, every drawn frame screenshotted, then ffmpeg packs the
  mp4 on twos and builds `out/<film>-contact.jpg` with two tiles per second.
  A frame that throws is reported with its number and time, and no mp4 is
  built.
- Frames come from `canvas.toDataURL`, not from screenshots. Do not spawn one
  Chrome per frame with `--screenshot`; it hangs on the second frame.
- Manual packing of PNGs exported from the page:
  `ffmpeg -framerate 12 -i %04d.png -r 24 -pix_fmt yuv420p -crf 18 out.mp4`.
- Remotion, if the project already uses it: call `drawFrame` from a component
  on a canvas ref with `useCurrentFrame()`; `fps: 24` and
  `drawFrame(Math.floor(frame / 2))`.

## Pitfalls

- `Math.random` anywhere → boiling textures. Use `rng(seed)`.
- A `stroke()` per hatch segment → seconds per frame. One path per layer.
- Forgetting `resetT(c)` (or `paper`/`night`, which reset) before a
  full-frame fill → the background lands in world space.
- `clip` without `save`/`restore` → every later draw is clipped.
- `selfDraw` needs the real perimeter for the dash pattern; `pathLength`
  computes it.
- `getImageData` fails on a canvas that ever drew a cross-origin image. This
  style uses no images.
- Ghost copies at alpha 0.34 each stack to near-opaque; divide by the count.
- The in-page PNG export needs a click (File System Access API); automated
  renders go through `render.mjs`.
- `blot`, `iris`, `mosaic`, `badges` work in screen coordinates and reset the
  transform themselves; pass screen-space centres.
- A mosaic of a navy blueprint frame samples mostly navy; mosaic the colour
  frame.
- Plates without knockouts tint the subject with every sky; paint the
  subject white on the plates that should not touch it.
- `printPlate` with `maxCov` 1 and three plates gives a muddy full-bleed;
  keep the default 0.78 and leave paper in every card.
- `handText` and `signOff` depend on the host's fonts (`HAND_FONT` falls
  back to `cursive`); check the render on the machine that produces the
  final file.
- A literal `540` in a scene is a bug waiting for the first vertical render;
  use `CX`, `CY`, `W`, `H`.
- `drawImage(layer, 0, 0)` draws the layer at output-pixel size; under a
  scaled format it lands wrong. Use `blit(c, layer)` or pass `W, H`.
- Loading `core.js` twice, or redefining `W`, `H`, `PAL` in the film, throws
  at load: top-level `const`s are shared across classic scripts.
