---
name: iso-sim-town
description: Build a playable late-1990s isometric sim/city-builder scene in vanilla JavaScript on one canvas — procedural brownstone cities, snowy villages or parks with pre-rendered-looking buildings, baked shadows, low-res grain textures, a dithered 256-colour-style palette, chunky nearest-neighbour pixels, a fixed isometric camera, traffic and pedestrians, day/night, a Props window to place and bulldoze objects, generated ambient music and a Windows 98 toolbar/status-bar UI. Use when the user wants a SimCity 3000 / RollerCoaster Tycoon / Lego Loco style town, a retro Windows-era simulation game look, a pixelated isometric city in the browser, "pre-rendered 3D" iso graphics drawn in code, or asks to recreate a reference video of an isometric town builder with canvas.
---

# Iso sim town

One engine (`assets/engine.js`, no libraries, no images) turns **town generators** into the whole game: renderer, buildings, props, traffic, pedestrians, Props window, bulldozer, day/night, save, music player and the Win98 chrome. You write `gen()` functions that lay out tiles and objects; you don't write drawing code. `template/index.html` is one brownstone city; `examples/three-towns.html` adds a snowy Christmas village and a Victorian park (preview `assets/three-towns.png`).

## How the look is built

The late-90s pre-rendered feel is a pipeline, not a filter. Keep all five stages:

1. **Iso world at native tile size.** `P(a,b,z) = ((a−b)·32, (a+b)·16 − z)`: 64×32 tiles, `a` runs to screen lower-right, `b` to lower-left. Walls are painted in face space (`onFace` skews a 2D context onto the wall plane), so windows, brick pattern, awnings, ivy and fire escapes sit on the wall correctly.
2. **Baked lighting, like a render.** Sun from the left: left faces 1.0, right faces 0.74, tops 1.12. Every wall gets a sky-bounce at the top and ambient occlusion at the base. Windows carry a sky reflection. Buildings cast a hard shadow toward +a whose length scales with height; props get offset contact shadows.
3. **Low-res textures.** A 48×48 grain is stamped `source-atop` over every sprite and over the ground, plus a skewed brick pattern on masonry. Surfaces must never be a flat fill.
4. **Low resolution, hard pixels.** The scene is drawn into a buffer at `1/PIX` of the window (PIX=2 → ~640×360), at zoom ×2 so one 64×32 tile is exactly 64×32 art pixels, then blown up with `imageSmoothingEnabled = false`. Zoom is fixed steps (1, 2, 4), like the old games.
5. **Limited palette.** Each frame is quantised to 8×9×7 levels with a 4×4 Bayer ordered dither. Gradients, glows and night turn into dither patterns; that's the 256-colour look.

Objects are cached as sprites per zoom and day/night (evicted when offscreen) and depth-sorted each frame with cars and pedestrians by `a + b` of their centre. Night recolours everything through `C()` (moonlit mix), bakes lit windows into sprites, then adds lamp/headlight/window glows with `lighter`.

## Workflow

1. **Copy**: `mkdir <dest> && cp ~/.claude/skills/iso-sim-town/assets/engine.js ~/.claude/skills/iso-sim-town/template/index.html <dest>/`. Edit only the town script in `index.html`; the full contract (tiles, building flags, prop kinds, cars, pedestrians) is the header comment of `engine.js`. For more towns, crib `genWinter` / `genPark` from `examples/three-towns.html`.
2. **Reference video?** Pull frames before designing: `ffmpeg -i ref.mp4 -vf "fps=2,scale=480:-1,tile=4x3" sheet%02d.png`, plus one full-res frame. Note the tile scale, building styles and roof types, ground materials, what moves, and the UI layout.
3. **Lay out the town** on a 10-tile period: 2 road tiles, 1 sidewalk each side, a 6×6 lot. Fill lots with strips of buildings 1–3 wide and 2–3 deep, with a treed yard strip between them sometimes. Make one block in six a park (plaza cross, fountain, benches, statue, lamps). Put lamps on sidewalk corners, plus the odd tree, hydrant and bus shelter. Give every lane 2–3 cars and every block ring 3 pedestrians.
4. **Styles**: pick 6–8 building palettes (brownstone, red brick with fire escapes, cream with arched windows, tan Victorian with a pyramid roof, green mansard...). Vary floors 3–7 and add shops (`shop`) to about a third, so rows read as rows of different houses.
5. **Look at it**: `~/.claude/skills/iso-sim-town/scripts/shot.sh <dest>/index.html /tmp/sheet.png 1 1n` (views are URL hashes: `#2` = town 2, `n` = night), then read the PNG. It prints any page console errors. Check that no building is blocked (`addObj` returns null silently), that shadows fall on roads rather than off the map, that there's variety along each street, that night has lit windows and lamp pools, and that the dither reads as texture rather than static.
6. Tell the user the controls: drag/WASD pan, wheel or +/− zoom, hard-hat opens Props (click the map to place, Esc stops), bulldozer removes, moon = night, save button keeps edits per town in localStorage, `P` pixel size, `X` dither on/off, `M` or 1–9 switch towns.

## Rules of the look

- Everything goes through `C(hex, shade)` so night works. Never `fillStyle = '#hex'` for scene content (lit windows and glows are the exception on purpose).
- Keep the light direction consistent: left faces lit, right faces and shadows toward +a. A prop that shades differently breaks the "one render" illusion.
- Grain + dither together are strong. If a screenshot looks like TV static, lower the grain alpha before touching the palette.
- Chunky beats detailed: details under 2 art pixels vanish in the dither. Draw windows at least 6×9, and make trees clumps of 8–15 px blobs with speckles.
- UI is Win98 and never modern: #c0c0c0 bevels (white/dark-grey 2px insets), a navy→blue gradient title bar, MS Sans Serif 11px, sunken status fields, tiny pixel icons painted on 28×26 canvases with `image-rendering: pixelated`.
- Don't fork the engine per town. New building flags or prop kinds go into the engine (`DRAW`, `DYN`, `PROPS`, `bounds`) with a line in the header contract, and both the template and example must keep working.

## Known limits

- It reads as a 90s game with simple art rather than a full SimCity 3000 model pass, because buildings are boxes with painted detail. The next step up is more geometry per style: bay windows, bracketed cornices, stoops with railings, dormers, chimneys.
- Depth sort is by centre, so long adjacent footprints can overlap wrongly at corners. Lamp glows can also bleed over a building in front at night.
- Cars pass through each other only in rare multi-car intersection timings.
