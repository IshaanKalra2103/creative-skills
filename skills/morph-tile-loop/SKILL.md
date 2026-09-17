---
name: morph-tile-loop
description: Make a seamless geometric motion loop in vanilla JavaScript on one canvas — a single flat shape (circle) opens into concentric layered rings, morphs into a pinched star inside a square or hexagon, then the camera zooms out over an endless lattice of that tile until it becomes a halftone texture, and dives back into one shape so the loop is invisible. Shapes are superellipses morphing between circle, polygon and star, with gradient fills and a riso/print palette. Use when the user wants a looping geometric / Bauhaus / op-art motion piece, an infinite zoom tile pattern, a "circle turns into a star and tiles out" animation, a halftone zoom loop, a looping background for a site or social post, or asks to recreate a reference video of this kind with canvas code.
---

# Morph tile loop

One engine (`assets/engine.js`, no libraries) turns a **config** into the whole loop: timeline, zoom, lattice, shape drawing, controls. You never write drawing code; you describe one tile and when it changes. `template/index.html` is a teal/navy square-lattice loop (preview `assets/tile-loop.png`); `examples/hex-bloom.html` is a riso hex-lattice loop (`assets/hex-bloom.png`).

## How the loop works

- **One tile** = layers of the same shape family, drawn back to front at shrinking radii. Layer radius `r`, exponent `e`, rotation and visibility are functions of named channels.
- **Shape** is a polar superellipse with `points`-fold symmetry. `e = 1` circle; `e < 1` pushes out to a polygon (a square at 4 points; at 6 points it reads as a soft six-point star); `e > 1` pinches in to a concave star. Turning a star layer by `π/points` puts its points on the polygon's corners.
- **Channels** are eased keyframes (`[[t, v], …]`). The usual pair: `g` (rings open out of the flat circle) and `m` (circle → star/polygon). With every channel at 0, all layers collapse to the last layer's fill, so a single flat dot is the rest state — that's what makes the start, the halftone and the end match.
- **Camera** zooms out log-space to `1/depth`, then dives back to 1 at the end. Neighbours fade in as it zooms out, so frame 0 is one shape. The lattice turns by `spin` turns, which must be a symmetry of the lattice (square `1/4`, hex `1/6`) so the last frame equals the first.
- Tiles under 3 px are drawn in each layer's flat `tiny` colour. Mid-zoom the grid turns into a halftone tint. This is part of the look, so pick `tiny` colours on purpose (a warm grey-orange reads as grey from far away).

## Workflow

1. **Copy**: `mkdir <dest> && cp ~/.claude/skills/morph-tile-loop/assets/engine.js ~/.claude/skills/morph-tile-loop/template/index.html <dest>/`. Edit the `defineLoop({...})` block only; the contract is in the header of `engine.js`.
2. **Reference video?** Pull frames first. You can't guess the timeline:
   `ffmpeg -i ref.mp4 -vf "fps=4,scale=320:-1,tile=4x6" -frames:v 1 sheet.png` (and a second sheet at `fps=1` over the whole clip to find the loop length). Note the loop length, how many morph cycles, the lattice type and whether it rotates, and each layer's colour from a close crop.
3. **Palette + layers.** 3–5 flat colours on an off-white paper background, at most one gradient layer. Outer layer is the polygon (`e` → 0.12–0.3), middle layers are stars (`e` → 2–5, rotated), core is the colour of the plain dot. Make each star layer a bit bigger and more pinched than the one above so the points stack up.
4. **Timeline.** Start from the template's channels and retime. Keep a flat-dot rest state at `t = 0` and at `t = loop`, and put one morph cycle before the zoom gets deep plus one while it's small. Keep `zoom.out` starting after the first morph has begun, and `back` ≈ the last 10% of the loop.
5. **Look at it**, since you can't judge motion from code:
   `~/.claude/skills/morph-tile-loop/scripts/shot.sh <dest>/index.html /tmp/sheet.png [times…]` then read the PNG. Check: t=0 is a single flat shape; the star points actually show (raise `e` or radius if a layer is hidden under the next); the grid shows up by ~25% of the loop; the halftone phase isn't a flat wash; the last frame looks the same as frame 0. Compare side by side with the reference sheet if there is one.
6. **Render** (optional): `shot.sh <dest>/index.html out.mp4 --mp4 24 <loop seconds>`. This takes a few minutes because it runs one headless Chrome per frame. For a GIF: `ffmpeg -i out.mp4 -vf "fps=15,scale=480:-1" out.gif`.
7. Tell the user: space pauses, `?t=3.2` freezes a frame, `?speed=0.5`.

## Rules of the look

- Flat fills, hard edges, no shadows or blur. Paper background, never pure white.
- Every layer shares one symmetry and one centre. Motion comes from morph, zoom and spin only; tiles never move independently.
- Morphs ease in and out (the engine's cubic). A small `wobble` during the morph (±0.1 rad) keeps it from feeling mechanical. Don't go bigger than that.
- The thin dark `outline` flashes only on the plain circle just before the rings open. Keep it at about 2% of R.
- Seamless or it's broken: verify t=0 and t≈loop−0.05 look the same.
- Don't fork the engine per loop. If a loop needs something new (another lattice, per-tile phase offsets), add it to the engine contract, update the header comment, and keep both existing files working.
