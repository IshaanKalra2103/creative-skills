# Timeline patterns

How a replica page is put together, and recipes for the effects in `examples/cero-grid`.
Line references are to `examples/cero-grid/index.html`. Search for the function names.

## Contents
1. The frame contract
2. Stage, cells, layers
3. Coordinates: DOM ↔ WebGL
4. Beats: `seg()` windows and easing
5. Recipes (text reveals, bursts, odometers, phone UIs, merges, DoF, 3D type)
6. Performance

## 1. The frame contract

`window.renderAt(t)` must fully determine the frame. Each cell's `update(t)` sets **every**
property it animates on every call, including resetting things a later beat changed. Resetting
matters because `render.py --stills 3.5,1.0` renders out of order. Visibility (`V`), filters
and `visible` flags need an explicit value in every branch. The example's bug where the MEGAPOT
scene showed a leftover ticket came from exactly that.

`Replica.boot` gives each looping cell its own clock (`t % period`). A cell without a
`period` plays once.

## 2. Stage, cells, layers

```
#stage  (W×H, scaled to the window)
 └ .cell  (one per panel, overflow hidden, own background)
    ├ .scene  DOM layer A   (background, UI that sits behind 3D)
    ├ canvas  A3.Stage      (3D, transparent)
    ├ canvas  A3.Stage      (a second depth plane, optional)
    └ .scene  DOM layer B   (UI/type on top of 3D)
```

Paint order is DOM insertion order, so create layers in the order they stack.
`new A3.Stage(root)` appends a canvas at that point; `{before: el}` inserts it earlier.
Push every Stage onto `Replica.STAGES` so its pixel ratio tracks the window scale, which
keeps it sharp at 4K. Scenes inside one cell are just sibling `.scene` divs toggled with
`V()`. A Stage can hold several `THREE.Scene`s (`st.addScene()`); render whichever one the
current beat needs.

## 3. Coordinates: DOM ↔ WebGL

- `A3.Stage` sets the camera so that at z = 0 one world unit is one cell pixel. Position
  props with `st.place(obj, x, y, z)` using the same pixel coordinates as the DOM (y down).
  +z comes toward the camera and makes things bigger.
- `at(x, y, s, extra)` centres a `.a` DOM element on (x, y). Combine with rotate/perspective
  in `extra`.
- `A3.cssRot(o, rx, ry, rz)` applies CSS-style degrees (`rotateZ rotateX rotateY`, y down)
  to a three object. Use it when porting a motion first prototyped in CSS.
- Camera pushes: scale a wrapper `.scene` for the DOM and `root.scale` for the Stage by
  the same factor around the same pivot (see the `cs` variable in `buildTL`).

## 4. Beats

```js
const p = E.outCubic(seg(t, 1.2, 1.6));    // 0→1 across the window, eased
x = lerp(x0, x1, p);
```

- One `seg()` window per motion in the beat table. Chain motions by feeding one lerp's output
  into the next (`y = lerp(lerp(a, b, p1), c, p2)`). Later windows override earlier ones.
- Staggers: `seg(t, s0 + i*gap, s0 + i*gap + dur)` per item.
- Idle life: add `amp * Math.sin(t * w + phase) * p` after the arrival, so it floats only once
  it's there.
- Hard cuts: `const A = t < 3.067; V(sceneA, A); V(sceneB, !A)`.
- Seeded randomness: `rng(seed)` for particle fields, never `Math.random()`.

## 5. Recipes

**Word-by-word rise** (`buildTR`, "Spend crypto as you go"): each word is an inline-block
span. Translate Y from +64 px with `outCubic` over 0.5 s and fade over 0.22 s, staggered
0.16 s. Start the first word before t = 0 (negative `seg` start) if the loop opens mid-reveal.

**Word swap with pop** (`buildBL`, "Meme → Meme trading → is → is now"): one element whose
`textContent` changes at measured times, with a scale curve per state (`outBack` pop on the
first). Squeeze `letterSpacing` into a cut to fake motion blur.

**Gradient sweep through a word** ("instant"): set `background-image` every frame to a
linear gradient whose bright stop position is a function of `t`, with `background-clip:text`.

**Sunburst burst**: `makeRays()` (a repeating conic gradient plus a radial mask to fade the
centre and edges). Scale it from about 0.05 with `outCubic` and rotate slowly (`7deg/s`). Add a
white radial glow that flashes on for 0.1 s. Prizes scale from 0.15 and fly from the burst
centre to their rest positions with `outExpo`, then drift (`v*el`) and tumble.

**Typed-on ticket amount**: mask the text with
`linear-gradient(90deg,#000 ${rv-4}%,transparent ${rv+3}%)` where `rv` eases 0→93.

**Number flow**: `new Odo(parent, {places, minPlaces, prefix, commas})`, then
`odo.flow(f, t, dt=.125, dur=.1)` every frame. `f` maps time to value. It must be
callable at any t because `flow` samples `f` at the step boundaries.

**Phone UIs**: build them in DOM at the reference's pixel sizes. To follow one element of a tall
phone through zooms, pin a phone-local y (`fy`) to a screen y (`sy`) at scale S:
`top = sy - fy*S` (the `cam()` helper in `buildBR`). Animating `fy`, `sy` and `S` separately
gives clean pan and zoom moves.

**Glass card pop-out → unlock**: a duplicate card outside the phone, scaled up in two phases
(`outCubic` then `inCubic` past the frame). Inside it, a lime radial blob grows from the
centre while a grey glass gradient fades out. The lock's shackle flips with `outBack`.

**Merge into a target** (coins → list icons, coins → balance): lerp position, scale
(`targetSize / d`) and rotation to the target over an `inOutCubic` window. Hide the 3D object
at the end while the DOM target fades in over the last 0.1 s.

**Depth of field**: two Stages. The far one holds the prizes and gets CSS
`filter: blur(n px)` ramping in; the near one holds the hero, sharp or blurred less. Also blur
the DOM background layer the same amount as the far canvas. Blurring one canvas for
everything makes the hero soft too.

**Extruded digits flip-in** (`makeMegapotText`): each glyph has its own pivot. Per glyph:
visible from its start, `scale .55→1` with `outBack(p, 2)`, `rotation.y 60°→0`,
`position.y -30→0`. Squash the group with `scale.x ≈ .74` and turn it `rotation.y ≈ 21°` for
the angled look. The group zooms from about 0.52 with `outCubic`.

## 6. Performance

Live preview can drop below 60 fps with several Stages; the render never does, because it
steps time. Keep `antialias: true`, and don't enable shadows unless the reference shows them
(render time roughly doubles). A 1080p render of 10 s at 60 fps took about 2.5 min on an
M1 Pro; 4K (device scale 2, JPEG frames) took about 3 min.
