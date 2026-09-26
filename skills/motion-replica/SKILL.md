---
name: motion-replica
description: Rebuild a reference motion-graphics video in code and render it to a matching MP4 (same size, fps, length, audio). Works for an app ad, product promo, UI walkthrough, grid reel, kinetic-type spot or screen recording. The result is a deterministic HTML page with DOM for UI and type, three.js layers for 3D props, rendered frame by frame. Scripts measure the reference (per-cell loop periods, cuts, contact sheets, 20 fps bursts for easing), compare replica and reference side by side, and render on the GPU with Playwright. A procedural 3D kit covers a foil pouch, $100 bills, basketball, watch, embossed/glass/cel-shaded coins, bevelled 3D digits and a GLB loader that repaints by material name, and a full worked example is included. Use whenever the user gives a video or GIF and says replicate, recreate, rebuild, copy this, make this in code or match this ad, or wants 3D assets like the ones in a reference video, even without mentioning HTML or three.js.
---

# Motion Replica

This skill reproduces an existing motion piece shot for shot, in code. There's no After Effects involved. One HTML page draws frame `t`. Layout and UI are DOM, and 3D props are three.js on transparent canvases stacked between DOM layers. A Playwright script steps `t` frame by frame and pipes screenshots to ffmpeg. The quality comes from measuring before building, then comparing against the reference at the same timestamps after every pass.

![the worked example, rebuilt](assets/cero-grid-frames.jpg)

| path | what it is |
|---|---|
| `scripts/study.py` | Measures the reference: size, fps and duration. Finds each cell's loop period and scene cuts, writes contact sheets, and makes `--burst` 20 fps strips for reading curves. |
| `scripts/render.py` | The page → MP4 renderer, or stills (`--stills`). Runs on the real GPU and muxes in audio. `--probe` checks WebGL. |
| `scripts/compare.py` | `stills`: reference \| replica at the same timestamps. `motion`: per-cell sheets with the reference row over the replica row. |
| `scripts/prep-glb.sh` | Shrinks a GLB (meshopt + webp), keeps material names and embeds it as base64 JS. |
| `scripts/font2typeface.py` | TTF (variable OK) → three.js typeface for extruded 3D type. |
| `templates/replica/` | Scaffold: `lib/replica.js` (timeline core, easing, odometer, rays, icons, boot), `lib/replica.css`, `assets/assets3d.js` (3D kit), a demo `index.html` and `lookdev.html`. |
| `examples/cero-grid/` | A complete 2×2 ad rebuilt this way: phone UIs, number rolls, a sunburst prize burst, 3D pack, car, coins and digits. Run `./fetch-assets.sh` once to get the car. |

## Setup

```sh
S=<this skill>
uvx playwright install chromium                       # once
cp -r $S/templates/replica <project>/replica && cd <project>/replica
uv run $S/scripts/render.py index.html --probe        # must say a real GPU, not SwiftShader
open index.html                                        # live preview; space pauses; ?t=2.4 freezes a frame
```

The page opens straight from disk (file://). Local libraries are classic `<script>`s and three.js comes from jsDelivr through an import map, so preview needs internet.

## Workflow

### 1. Measure the reference first

```sh
uv run $S/scripts/study.py ref.mp4 --grid 2x2 --out study     # use 1x1 for a single-panel video
```

Read `study/overview.png` and every `study/cell_*.png`, then write a **beat table per cell**: time window → what's on screen → motion (from → to, easing guess). Use the measured loop period and cut times as the skeleton. Where a motion is ambiguous, take a burst (`--burst tl 1.25 1.95 --fps 20`) and write down the frames where a state is reached: "edge-on at 1.40, back face 1.50, edge-on 1.65, front 2.02". Those numbers become the `seg()` windows. See `references/study.md` for reading easing, counters, colours and type off frames.

Also note the output spec: pixel size, fps, exact duration (frames ÷ fps) and whether there's audio. The final render must match all four.

### 2. Scaffold the page

Copy the template. Set `W`/`H` to the reference's pixel size and add one `.cell` per independent panel. Write one `buildX()` per cell returning `{ period, update(t) }`. The template's demo cell shows each pattern: DOM scenes, a `Stage`, DOM above the 3D, hard cuts with `V()`, `seg()` windows and odometer flow. Read `references/timeline.md` before writing cells. It has the layer rules, the camera/coordinate conventions, and recipes for every effect in the example.

**Everything in `update(t)` must be a function of `t` only.** The renderer jumps to arbitrary times, so any state carried between frames will render differently from the live preview.

### 3. Build flat first, beat by beat

Build each cell's layout and UI in DOM before adding any 3D. Use stand-in boxes for the props. After each beat, render stills at that beat's timestamps and compare:

```sh
uv run $S/scripts/render.py index.html --width 3840 --height 2160 --stills 0.5,1.8,3.4
uv run $S/scripts/compare.py stills ref.mp4 stills --times 0.5,1.8,3.4 --out cmp
```

Fix position, size, font and colour against the reference crop until they overlay. Fonts: identify by eye and use the nearest Google Font (load with `display=block`). Say which ones you substituted.

### 4. 3D props: lookdev, then wire in

Iterate on props in `lookdev.html` (`render.py lookdev.html --stills 0`). A lookdev round takes seconds, while a timeline round takes minutes. Then move them onto a `Stage` in the cell. Decide per prop:
- **Procedural** (the kit in `assets3d.js`): packaging, coins, notes, balls, watches and 3D type. These are quick to restyle and have no licensing baggage.
- **Sourced GLB**: complex hard-surface objects like cars, sneakers and phones. Take them from a licence-clear library (Khronos glTF-Sample-Assets lists licences in `metadata.json`), run them through `prep-glb.sh`, and repaint by material name.

Check the silhouette from the angle the reference shows it before wiring anything in. A prop that's the wrong shape can't be fixed with materials (see the Spider → coupe note in gotchas). `references/3d-assets.md` has the kit's API, material recipes and sourcing notes.

### 5. Verify motion, not just frames

```sh
uv run $S/scripts/render.py index.html --audio ref.mp4 --out draft.mp4          # 1080p draft, ~2.5 min per 10 s @ 60
uv run $S/scripts/compare.py motion ref.mp4 draft.mp4 --grid 2x2 --fps 4 --out cmp
```

A motion sheet puts reference and replica rows on the same clock, so a beat landing 3 frames early is obvious. Stills hide that. Fix drift by moving `seg()` windows, and re-check.

### 6. Final render and report

```sh
uv run $S/scripts/render.py index.html --width 3840 --height 2160 --audio ref.mp4 --out final-4k.mp4
ffprobe -v error -show_entries stream=width,height,r_frame_rate,nb_frames -of compact final-4k.mp4
```

Confirm the size, fps and frame count match the reference. Then tell the user plainly what differs from the original. Name every substituted font, every stand-in asset (for example "cat emoji, not the meme photo"), and any sourced model's licence and required credit. If audio was copied from the reference rather than recreated, say so too.

## Principles

- **Measure, don't eyeball timing.** Loop periods and cut times come from `study.py`, and curves come from bursts. Timing you guessed is the first thing viewers feel is off.
- **Compare at the same timestamp after every change.** Keep the comparison images; they're the proof the pass worked.
- **One coordinate system.** `Stage` puts 1 world unit = 1 cell pixel at z = 0, so a prop can take its x/y straight from the DOM layout or the reference crop.
- **Depth through layers.** Stack DOM → WebGL → DOM, and use separate WebGL canvases per depth plane with CSS `blur()` for depth of field.
- **Real UI behaviour.** Counters step and roll (`Odo.flow`) rather than smear. Phones are DOM, not screenshots, so the numbers can animate.
- **When the user says something looks weird, rebuild it.** In the example, a roof patched onto an open-top car and a flat card pretending to be a pouch both read as wrong until they were replaced with the right shape.

## Gotchas

These were paid for once already. The full list with fixes is in `references/gotchas.md`:
- Headless Chromium uses SwiftShader unless GPU flags are passed. `render.py` passes them; run `--probe` on new machines.
- `file://` blocks local ES-module imports and `fetch()`. Keep local code in classic scripts and embed binaries as base64 JS.
- `gltf-transform optimize` defaults merge materials and drop their names. `prep-glb.sh` disables that.
- Canvas `destination-out` erases nothing with a transparent `fillStyle`.
- Extruded text uses material index 0 for caps and 1 for sides. Darken the sides or the type reads flat.
- CSS and three.js rotation conventions differ. Use `A3.cssRot(o, rx, ry, rz)` to reuse CSS-style degrees.
