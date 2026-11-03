# The look

A frame has three kinds of material, built in three different ways. Keep them separate.

| Layer | What it is | How it is made |
|---|---|---|
| Background art | Gouache paintings: sky, land, trees, buildings | `Plate` canvases painted once in `build()` with the brush kit (`paint.js`, `kit.js`) |
| Cels | Characters and anything that moves or turns in 3D | Meshes rendered by `gl.js`: flat colour, one hard shadow, ink lines |
| Compositing (撮影) | Light, air and film | Shafts (screen), glow (lighter), mist plates, grain, vignette |

## Background art (gouache)

- Every surface is built from dabs (`dab`, `leafMass`, `paintCrown`, `taper`), never from a single fill or gradient. Gradients are allowed only for sky and haze washes, and get grain on top.
- Let colour vary inside a mass: `jit()` each dab a little in value and hue. A tree is three or four values (deep, dark, mid, light), plus a lit edge facing the key light.
- Atmospheric perspective does the depth. Distant plates are pushed toward the air colour (`fogged(pal, amt, fog)`), with amounts of about 0.85 on the far rank, 0.7 next, 0.4 mid and 0 near. Air is warm toward the light and cool away from it.
- The foreground is darker and more saturated, with bigger strokes, and is often cropped by the frame edge (ferns, grass, a trunk). It sits on a low-depth plate so it moves most.
- Nothing repeats: each tree, rock and cloud gets its own seed. Vary spacing (`gapMin`/`gapMax`) and leave clearings where the action is (`skip: [x0, x1]`).
- Call `applyGrain(g, w, h, 0.12)` on every plate (0 on light-shaft plates).

## Cels (characters)

- Flat local colour plus **one** hard-edged shadow tone, and a second, deeper tone only on surfaces turned well away. No soft shading on a character.
- The shadow colour is designed, not computed: a cool, slightly saturated version of the local colour (blue-violet under a warm sun). Material type 6 takes it directly as `col2`.
- A thin rim band where lit surfaces turn away from camera (types 0, 1, 4, 6). Use a catchlight on eyes (type 2).
- Ink: about 1.25 to 1.6 px at frame size, a dark warm brown (`[0.17, 0.12, 0.11]`), never pure black. Pressure varies along the line. Lines fade toward the air colour with distance (`inkFog`). Soft or glowing things get a coloured line (色トレス): pass `ink` close to their own shadow colour.
- Boil: the line and the shape wobble a little per **drawing**, not per frame. Pass `seed: drawSeed(lt)` so held frames are identical and each new drawing differs.
- Cast shadows on the ground come from a shadow-catcher disc (`ground: y` in `celLayer`). They are hard-edged and coloured like the scene's shadow, not grey.

## Light and colour

- One key light per scene, used consistently: the plates' 2D light vector (`L2D`) and the cels' `LIGHTS.<preset>.sun` must agree in screen space.
- Shadows are coloured: cool blue-violet under warm light, and warm under cool light. Never multiply toward black.
- Write a colour script before painting: one swatch row per shot (sky, key, shadow, accent). Hold the palette back early and spend saturation and warmth at the climax.
- The palette is soft and natural, with no pure primaries. The brightest value in a frame is the story's light (the sun, a lamp, a glow), and nothing else gets that close to white.
- Light shafts are painted plates composited with `screen` at 0.4 to 0.6, angled with the sun. Glow is `glowFx` with `lighter` at low alpha. Use them sparingly, and only where there is a light source.

## Post

`post()` in `main.js` multiplies a purple-grey vignette (`sh.vignette` sets it per shot, default 0.8), overlays grain at 0.22 from six tiles cycled per frame, and handles fades to black (`fadeIn`/`fadeOut` on the shot). Leave it alone unless a shot needs less vignette (bright sky shots: 0.5).

## It must not look like

- **3D:** plastic, gradients across a character, specular highlights, visible polygon facets (raise `n` and `smooth` in `loft`), computer-perfect perspective in the backgrounds.
- **Vector or SVG:** perfect curves, uniform outlines, flat corporate fills, basic gradients.
- **Web animation:** layers sliding on their own, constant bobbing, floating parts, smooth software easing on every move, or puppet rotation about a joint.
- **AI art:** warped shapes, designs that change between shots, or flicker that comes from noise rather than from drawings.
- **Non-anime:** Western cartoon proportions, realistic rendering, soft painterly shading on characters.
- **Amateur:** stiff poses, empty backgrounds, repeated trees, muddy colour, placeholders.
