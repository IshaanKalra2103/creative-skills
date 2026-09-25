---
name: comic-cover
description: Turn any 3D model into an interactive comic-book cover in the browser — a Meshy/Tripo/Rodin AI sculpt, an OBJ, FBX, glTF or GLB, a Mixamo-rigged character frozen in an animation pose, a product or a pet scan. three.js renders it with ink outlines, cel bands, Ben-Day halftone and hatching; a Pencils → Inks → Colors switch with a brush wipe; a masthead the hero breaks through; issue box, barcode and caption; a city street ring, storm/dusk/night/starry sky, gothic church at night (lit lancet windows, pinnacles, bell tower) or two-ink action-burst backdrop; smoke puffs and ink spatter; mouse-tilt parallax and drag-to-orbit that springs back; click powers (web strand, energy beam, thrown billy club), lightning, SFX lettering (THWIP!, KRAKOOM!), a duotone or radar "sense" mode, glowing decals and clickable props. Use whenever the user has a 3D model and wants a comic cover, a comic / cel-shaded / Spider-Verse / halftone / inked render of it, "make my model look like a comic", fan-art or variant covers, or to recreate a reference cover image in 3D — even if they only hand over a model and a comic reference image and say "make something cool with this".
---

# Comic cover

![Spider-Man example](assets/spider-man.jpg) ![Pencils, Inks, Colors](assets/stages.jpg) ![Robot example](assets/robot.jpg)

| path | what |
|---|---|
| `engine/` | shared renderer, copied verbatim into every cover. Never fork it per cover: change it here, then `scripts/sync-engine.sh` |
| `engine/probe.html` | model inspector: 5 orthographic views on model-space grids + a 3/4 view, bbox, extreme points, bones, clips; `probe.at(x, y)` raycasts a sheet pixel to an exact point + normal |
| `template/index.html` | a cover = this page + `window.COVER` config (EDIT markers) |
| `examples/spider-man/` | Meshy sculpt on a DON'T WALK signal: city set, lamppost + signs, web power, walk-signal decal + clickable box |
| `examples/robot/` | rigged RobotExpressive (CC0) frozen mid-punch: burst set, beam from a bone, glowing-eye decals |
| church set (no bundled example) | `set.kind: 'church'` + `spires`/`arches`/`blocks`/`puffs`, `power.kind: 'club'`, `sense.style: 'radar'`, `spatter`, `hero.recolor`: see `references/config.md` |
| `scripts/new-cover.sh <dest> <model>` | scaffold: engine + template + model conversion |
| `scripts/build-model.sh <in> <out.glb> [maxTris]` | OBJ/FBX/glTF/GLB → one meshopt GLB, ≤200k tris, WebP ≤2048 textures (npx tools, nothing global) |
| `scripts/shot.mjs <dir> <out.png> [frameJS…]` | headless Chrome with the GPU: runs JS between frames, tiles a contact sheet, prints console output. No npm deps |
| `scripts/serve.mjs <dir> [port]` | static server (`file://` can't load the modules or the GLB) |
| `references/config.md` | every `window.COVER` field. Read it before filling a config |
| `references/pipeline.md` | how the render works, how to add decal kinds / sets / powers, and the traps already hit. Read it before touching `engine/` |

## How the look is built

One MRT pass writes colour + light level and view normal + object id; one composite pass draws the page. Ink = depth Laplacian + normal creases + id edges, with a jitter that boils at 8 fps. Shade sides get Ben-Day dots (colours) or hatching/spotted blacks (inks). The masthead canvas is composited *between* backdrop ids and hero ids, which is how a raised hand breaks the logo. Colours are painted in display space: purple/violet shadows, a hard blue shine on dark cool materials, a cool back rim. Details: `references/pipeline.md`.

## Workflow

1. **Collect.** The model, any reference image, title/kicker/caption text, and what the hero "does" (web, beam, punch, nothing). With a reference image, note the camera (usually low + dutch), what the hero stands or perches on, the backdrop, the palette, and props worth making clickable. Letter the title with the engine's masthead; don't copy a publisher's logo or trade dress.
2. **Scaffold.** `~/.claude/skills/comic-cover/scripts/new-cover.sh <dest> <model>`. It prints the triangle count before/after.
3. **Probe.** `SIZE=1500x1000 PAGE='engine/probe.html' node …/scripts/shot.mjs <dest> /tmp/probe.png` (rigged: `PAGE='engine/probe.html?pose=Punch@0.35'`), then Read the PNG and the `[probe]` JSON.
   - `size` → `hero.scale` so it's human-sized (1.2 m crouched, 1.8 m standing). Meshy exports are y-up, facing +z, ~1.9 units on the long axis.
   - `extremes` tell you which limb is extended (the emitter): check its sign before picking `Palm2L` vs `Palm2R`.
   - Exact points: `node …/shot.mjs <dest> /tmp/p.png '[probe.at(183,135), probe.at(318,135)]'` with pixel coords read off the sheet. For a flat prop face (a sign, a screen), probe 3–4 points and fit the plane; faces are rarely axis-aligned.
4. **Configure** `window.COVER` in `<dest>/index.html` (`references/config.md`).
5. **Frame.** `node …/shot.mjs <dest> /tmp/c.png`, Read it, adjust, repeat. Explore without editing via `PAGE='index.html?az=0.15&el=-0.3&roll=-0.2&dist=3.4&seed=7&still'`, then write the winners into the config.
6. **Exercise every interaction** in one run: `node …/shot.mjs <dest> /tmp/i.png '' 'cover.clickAt(.85,.35)' 'cover.setSense(true)' 'cover.setSense(false); cover.setStage(1)' 'cover.setStage(0)'`. Frames print the picked id (1 hero, .7 signal, .6x hotspot, .5 prop, .3 building, 0 sky). Use `cover.fx.hold = true` to freeze bolts and beams for a still. Then check `SIZE=390x844 DPR=3` (phone) and `FPS=1 DPR=2 SIZE=1440x900` (expect ~60).
7. **Hand over.** `node …/scripts/serve.mjs <dest> 5173`. Controls: move the mouse to tilt, drag to orbit (it springs back), click background/sky/hero/props, keys 1 2 3 for the stages, the sense key, M to mute.

## Composition (what made the covers work)

- Camera low and looking up (`el` −0.3…−0.45), dutch `roll` −0.15…−0.25, `fov` ~37. The hero fills 75–85% of the height; the top ~20% is masthead, and a raised hand or fist should break into it.
- The narrow FOV means the backdrop is a small, magnified patch of world ~20 m away. If buildings swallow the sky, drop `set.ground` (hero higher up) or lower `set.heights`; don't widen the FOV. Try layouts with `?seed=N` and pin one where buildings frame both sides.
- Keep some open sky in the upper third for a storm set: lightning and the flash need it.
- For an extended fist or hand, turn the camera until the limb reads against the backdrop, not against the body.

## Rules of the look

- Everything in the scene uses the `materials.js` factories (they write both MRT targets and an id). A stock three material renders garbage ids and no ink.
- Config colours are display-space hex; the engine converts with `raw()`. Inside the engine, `new THREE.Color('#hex')` is linear, which is darker than you meant.
- Ids above 0.55 count as hero-side: they're drawn over the masthead and never duotoned. Keep new hero-side ids in that range.
- SFX words are HTML (always on top). Strands and beams are 3D with `depthTest: false` because they leave a hand that's in front of the hero.

## Known limits

- One walk-signal decal per cover, up to 4 hotspots, glow decals unlimited in practice.
- Static sculpts don't move; rigged models can freeze a clip frame or play it on twos (`pose.play`).
- Sets are box cities, open sky, a burst or a gothic church (plus `blocks`, `spires`, `arches`, `puffs` for any set). Forest, space or interior means writing a set (`references/pipeline.md`).
- Picking reads a half-float pixel. That works in Chrome; Safari is untested.
