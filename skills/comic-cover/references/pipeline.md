# Render pipeline, extending it, and traps

## Frame

```
scene ──(one pass, MRT, HalfFloat, no MSAA)──►  gColor  rgb = painted colour (display space)   a = light level (0 core shadow, .45 half tone, 1 lit)
                                                gNormal rgb = view normal *.5+.5                a = object id
                                                depth texture
composite (post.js) ─► ink + halftone/hatching + masthead + stage wipe + duotone + grain ─► screen
```

- **Why MRT, no MSAA:** the ids must not be averaged, and the ink lines cover silhouette edges anyway. Render at DPR ≤2 instead.
- **Ink** (`ink()` in post.js): depth *Laplacian* (not gradient, which fires on every grazing-angle surface), normal creases within one id, and any id change. Line radius scales with depth. Sample coordinates are jittered by noise re-seeded 8×/s so lines boil like hand inking.
- **Colours stage:** Ben-Day dots in the shade side (dot size from 1 − light), sky gets a light dot screen, contour lines between the sky's poster bands (the sky shader stores them in `gNormal.r`), a 1px red-plate misregistration, and paper grain.
- **Inks stage:** paper + ink lines + spotted blacks (luminance < .075, or core shadow on dark texels) + 45° hatching in half tones, cross-hatching in core shadow. Sky: contours, plus hatching where `gNormal.g < .24`.
- **Pencils stage:** two jittered ink passes in graphite, soft tone in shadows, loose hatching, non-photo-blue lines radiating from the vertical vanishing point, and a blue border box.
- **Masthead:** two canvases (colour and ink) the size of the render target, drawn by `masthead.js` and sampled in the composite *only where id ≤ .55*. That's what makes the hero overlap the logo. They're redrawn on resize, after fonts load.
- **Picking:** `readRenderTargetPixels` on attachment 1 (half float → `DataUtils.fromHalfFloat`) gives the id under the cursor, both for clicks and a hover poll every 4th frame. Clicks on buildings use CPU raycasts against the set's AABB colliders for the hit point and normal.

## Ids

| id | what | notes |
|---|---|---|
| 0.0 | sky / burst | ink only at its silhouette; `gNormal.rg` = (contour line, band level) |
| 0.1 | lightning | outlined against the sky by the id edge |
| 0.3 | buildings, church body | |
| 0.34 | smoke puffs | close enough to 0.3 that puffs get no id ink against buildings (soft smoke edge) |
| 0.44 | clickable set piece (bell tower) | `set.clickables` maps an id to words/sound/pulse |
| 0.5 | props (pole, signs, towers, ground), blocks, spires, arches | |
| 0.60–0.66 | hotspots 0–3 | hero-side |
| 0.7 | walk-signal decal | clicking it toggles WALK |
| 0.9 / 0.92 | webs, beams, splats, club + cable | drawn over the masthead |
| 1.0 | hero | |

Anything > 0.55 is treated as hero-side: above the masthead, never duotoned, finer ink threshold.

## Extending

- **New decal kind:** add a function in `heroMaterial` next to `walkSignal`/`glowDecal` taking the lens coords `lp` (−1..1, x along `u`, y along `normal × u`), give it a number in the `kind` mapping in `main.js` (`shared.decals`), and branch on `uDecalK[i]`. Decal space comes from `uHeroInv`, so it survives hero placement and meshopt dequantization.
- **Masonry:** `stoneMaterial` reads per-vertex `aColor` + `aKind` (ashlar, tile, slate, plain, gilt, brick) and box-projects mortar joints in the mesh's own space. Build pieces, `tag(geometry, colour, kind)` them, merge. `archPath` draws a pointed arch into a THREE.Shape/Path *or* a canvas context (the window tracery uses the same maths).
- **New set:** add a branch in `buildSet` returning `{colliders, pickables, sky, storm, clickables?, resolve?}`. `resolve(camera)` runs once after the model loads, for things placed on the page. Use `propMaterial` / `facadeMaterial` / `skyMaterial` (or a new `mat()` factory) so everything writes both targets. Colliders are `Box3`s for the web/beam hit test; `pickables` are raycast meshes (poles, signs).
- **New power:** add a branch in `usePower` (main.js) and an effect in `fx.js` that builds geometry with `flatMaterial` (id `ID.web`, `depthTest: false`, `renderOrder ≥ 10` if it starts at the hero) and cleans up after itself in `update(t)`.
- **New sound:** add a function in `audio.js` and a key in `SOUNDS` (main.js).
- After any engine change: `scripts/sync-engine.sh`, then screenshot both examples.

## Traps already hit (don't rediscover them)

- **Missing sampler uniform → white.** A ShaderMaterial that declares `uniform sampler2D map` but never gets `uniforms.map` samples white silently. The hero came out pale pink (white × shadow tints).
- **meshopt quantization adds a node transform** (scale ~0.95 + offset). Object-space shader math lands in the wrong place (the signal glow appeared on his knee). Work in model space via `uHeroInv`.
- **Props aren't axis-aligned.** The signal lens face was tilted 14°: an `x < k` test lit a sliver. Fit the plane from 3–4 probed points and pass a real normal.
- **Fingers on a prop.** Decals and hotspots skip vivid texels (`keepSat`, `match: 'unsaturated'`) so the hand stays on top. Making the filter stricter (excluding all saturated texels) speckled the box with id-edge ink dots; only exclude *vivid* (saturation > .45 and brightest channel > .45), cool darks and whites.
- **Web hidden by the head.** A strand from a hand in front of the hero to a wall behind him passes behind his head. Draw strands and beams with `depthTest: false`.
- **Lightning placed by direction lands under the masthead or behind the lamppost.** Bolts are built between two points on rays through the clicked sky, 150 m out. Ambient bolts first pick a random screen point whose id is sky.
- **Bolt flicker vs screenshots.** Headless captures often land in an "off" frame: set `cover.fx.hold = true`.
- **Narrow FOV + tall buildings = no sky.** At fov 37 and portrait aspect you see ~9 m wide at 20 m. Lower the buildings or perch the hero higher; don't widen the FOV (it kills the telephoto cover look).
- **The burst's atan seam** draws a dashed line unless the ray wobble uses a continuous input and `fwidth` takes the min over two atans with opposite seams.
- **`new THREE.Color('#hex')` is linear** (colour management), which is too dark for these display-space shaders. `raw()` in materials.js bypasses it.
- **Chrome headless GPU on macOS** needs `--use-angle=metal --enable-gpu --ignore-gpu-blocklist` (shot.mjs passes them). Without them WebGL2 falls back to software or fails.
- **FBX2glTF on macOS is x86-64** and runs under Rosetta. Mixamo's `eInheritRrSs` warning is harmless.
- **Near the camera the frame is tiny.** At fov 37 the cover is only ~0.43 × distance wide: a puff 1 m to the side at 2 m depth is off the page. Place page furniture with `at: [u, v]` + `depth` (or unproject through `cover.camera`) instead of guessing world coordinates.
- **Where the telephoto puts the backdrop.** Pinnacles that read as "right behind him" in a reference are 5–10 m back; the window wall is 20+ m. A tall set seen from a low camera compresses: keep crosses and spires where the masthead won't swallow them (below v ≈ .22) or let them peek between letters.
- **Sculpt lumps.** Meshy sometimes drapes a stray shell over a prop (a khaki lump on a club). `hero.recolor` (or `hide`) with `match: 'unsaturated'` fixes it; hiding can leave a gap if the prop wasn't modelled inside the lump, so recolor first.
- **Spatter droplets bigger than their cell** get clipped square: each pixel checks the 3×3 neighbouring cells. The grid is sized from the cover height so phones don't get blobs.
- **zsh doesn't word-split `$v`** in `for v in "a b c"; do set -- $v` loops. Call shot.mjs explicitly per variant.
