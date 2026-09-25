---
name: dither-diorama
description: Build a live isometric cutaway diorama of any place — a restaurant, laundromat, office, shop, clinic, warehouse floor — rendered in three.js through a 1-bit-ish square-dot dither shader (one square per 3-px cell sized by tone, soft grey contour ink, one accent colour kept in colour), with a crowd that walks in through the door, queues, gets served, sits, uses machines and leaves on grid pathfinding, staff at posts or on patrol or running orders, and a scroll story that highlights one group at a time (everything else washes out to ghost outlines), then pulls back so the store closes up and a city grows around it with traffic and location pins. Also does open-air scenes with no room (a pit stop, a stage, a street corner) where every person is choreographed. Use when the user wants the meuze.ai-style "how it works" workspace animation, a dithered/halftone/pixel-dot isometric scene with people, a scroll-driven explainer where parts of a room light up per step, an "our store in the city" pull-back, or asks to make any business, room or operation into an animated isometric diorama.
---

# Dither diorama

One engine (`assets/engine.js`, three.js from a CDN importmap, no build step) turns a config into the whole piece: the room shell, the crowd simulation, the three-pass dither render, the step UI and the city. You write `build(k)` with box calls, then list staff, a visitor route and steps. You don't write shaders, pathfinding or scroll code. The full contract is in `references/config.md`, so read it before writing a config.

- `template/index.html` — a counter-service restaurant. Guests queue at 2 registers, a runner brings trays, guests sit and eat, and a clerk counts stock in the back room. Its steps are Floor / Staff / Stock / City. Preview: `assets/restaurant-steps.png`.
- `examples/laundromat.html` — "Spin Cycle", a 24-hour laundromat at 2:47 a.m. People arrive with baskets and load washers, which spin up when loaded. They read on the bench, then fold. An attendant mops, a black cat walks the dryer tops, and a neon "24" glows in coral. Preview: `assets/laundromat.png`. It shows custom items, `k.tick` machines that react to people, `chance` stations and a non-crowd highlight group (the cat).
- `examples/pit-stop.html` — "Box, box", a Formula 1 pit stop out in the open (`room.open`: no walls, you draw the ground). The car brakes into its box, 17 scripted crew run out, jacks go in, wheel guns fire, tyres swap between hub and hands, and the lollipop flips. The car launches and the crew walk back carrying the old set. A live clock counts the stop. Steps highlight the wheel crews, then the jacks and release, then play a quarter-speed replay (`speed: .25`), then the pit wall. Preview: `assets/pit-stop.png` (frozen at 3.6 / 5.0 / 5.5 / 6.75 s). It shows choreography with `kit.person` + `k.tick`, a `kit.display` readout, custom `stats`, and `?t=`.

## How the look is built

Keep all of these; each one is part of why it reads as "that" style and not just a dithered 3D scene.

1. **Everything is boxes, in greys.** A tone of 0.9–0.97 for surfaces and 0.1–0.35 for equipment, screens, hair and cars. There is exactly one saturated colour (`accent`), plus a blue marker used only in the city. Colour survives the dither, so spend it on the one thing the eye should find: food, soap, neon.
2. **Cell render.** The scene renders into a target at 2× the cell grid (1 cell = 3 CSS px). The post shader samples each cell's centre and draws one square whose half-size runs from .09 to .42 of a cell with darkness (5 levels). White surfaces become a fine dot field, and empty paper gets sparse pin-dots.
3. **Soft pen.** Outlines come from three places: an object's silhouette against empty space (full weight), depth steps (.85) and tone steps (.5). They are inked at 60% grey, never black. The depth test compares the far neighbour against the near one, so sloped faces don't fill with ink. Un-premultiply by alpha before reading tone, or every outer corner gets a black rim.
4. **Wash, not zoom.** Each step keeps named groups inked. A second unlit "mask" pass writes each object's wash amount, and the shader pushes washed cells to paper, halves their outlines and drops their colour. The camera stays put for the interior steps; this is what the reference site does. Don't swap it for a camera move per step.
5. **City pull-back** on the last step:
   - The camera drops to elevation .3 and zooms out about 2.5×.
   - The store's front walls rise, then the roof drops on.
   - City blocks grow out of the ground, spreading outward from the store.
   - Roads are near-black strips with white dashes. Towers step back and stay low on the camera side.

## Workflow

1. **Copy**: `mkdir <dest> && cp ~/.claude/skills/dither-diorama/assets/engine.js ~/.claude/skills/dither-diorama/template/index.html <dest>/`. The template imports `./engine.js`. Examples inside the skill import `../assets/engine.js` instead, so fix that path if you start from an example.
2. **Reference site or video?** Capture its steps before designing, including the motion, not just stills:
   - For a live site, scroll it with a *headed* Playwright Chromium on the real GPU. Headless software WebGL times out on heavy pages. Screenshot at each step threshold and read which part stays inked.
   - For a video, `ffmpeg -i ref.mp4 -vf "fps=2,scale=480:-1,tile=4x3" sheet%02d.png`.
3. **Plan the place as flows first**:
   - Who arrives, what they do in order (that becomes `route`), and what they carry (`items`).
   - Who works there (`staff`: post, patrol or courier).
   - What the 3–4 steps highlight. Name a group for each step before building, and make sure each step's group is *visible* from +x,+z. Something behind a far partition won't read when highlighted.
4. **Build the room** in `build(k)`, one `k.group()` per highlight group:
   - Wall-mounted things go on the far walls (`z = room.z0` faces +z, `x = room.x0` faces +x). Only +x, +z and top faces are ever seen, so put screens, doors, buttons and signs on those faces.
   - Give every floor object a `k.block`, and put staff areas behind `k.staffOnly`.
   - Aim for density like the reference: wall boards, cabinet seams, small props on every counter, a plant, a sign with `k.digits`.
5. **Look at it**: `uv run ~/.claude/skills/dither-diorama/scripts/shot.py <dest>/index.html /tmp/sheet.png`. It serves the folder, runs the sim at 5× speed, shoots every step into a sheet and prints the stats per step plus any page errors. Read the sheet, and open single-step PNGs for detail. Check that:
   - stats move between steps (served goes up, and nobody is stuck in `inside` forever);
   - no one walks through furniture (add `block`s) and no one faces a wall (check `yaw`);
   - each highlight step leaves something clearly inked;
   - the accent shows up in 2–4 places, not everywhere;
   - the city doesn't cover the store.
6. **Hand over**:
   - Open the file in a browser. `?step=N` pins a step, `?speed=4` fast-forwards and `?t=5.2` freezes the sim clock.
   - The page needs to be served over HTTP, or opened directly in a browser that allows module imports from `file://` (Chrome does for inline modules with a CDN importmap). If the import fails, run `python3 -m http.server`.
   - Remind the user the stills were checked headless; the fades and the scroll switching should be watched live.

## Traps

- **Not everything is a room.** If the subject is an event (a pit stop, a heist, a kitchen rush, a relay), use `room.open` and choreograph `kit.person`s on a looped timeline in `k.tick`. Don't wrap an event in a building. Verify timelines with `shot.py --times`, which freezes the clock with `?t=`, rather than waiting on real time.
- **Near and tall hides far:** anything tall on the camera side (+x/+z), like a gantry, a wall or a crowd, covers what's behind it. Lower it, or raise `camera.el` (0.9+ is close to top-down).

- **Yaw:** `Math.atan2(dx, dz)` toward the thing faced. 0 faces +z, π faces −z (the far wall), −π/2 faces −x (the left far wall).
- **Visit points and seat positions must sit outside `block` padding** (0.1 + a 0.06 grid cell), or the path ends at the nearest free cell and the person stands beside the spot.
- **A queue must be directly followed by a counter**, because the queue only feeds the next station.
- **Moving props** built in `build` must be added to `k.scene` yourself. Their meshes still get the current group, so they highlight correctly.
- **Wash colour:** a group left out of every step's `show` still renders normally on `show: null` steps. The shell and city are never washed.
- **Mouse parallax:** the engine nudges azimuth ±0.045 with the mouse. Very tall wall props near the frame edge can clip; `camera.margin: 1.1` gives more room.
