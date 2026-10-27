---
name: console-maker
description: >-
  Model real hardware (game consoles, controllers, cartridges, handhelds, retro computers,
  gadgets) in Blender from reference photos or a video, and render them as studio product
  shots: real boolean-cut detail (ports, slots, vents, button sockets), grainy molded-ABS
  plastic, piano-black gloss, light bars, a directional studio rig, and a native 4K portrait
  PNG with true alpha plus the editable .blend. Headless Blender 5.x on the Mac's Metal GPU,
  driven by Python build scripts and a small helper kit. Use whenever someone wants a 3D
  model or render of a console or device (PS5, NES, SNES/Super Famicom, Game Boy, Xbox,
  Switch, a controller, a cartridge...), says "make a Blender model of X", "recreate this
  hardware in 3D", "grainy plastic render", "transparent product render", or shares a video
  or photos of hardware and wants it modeled, even if they never say Blender.
---

# console-maker

Hardware modeled from references in headless Blender, finished with molded-plastic grain,
rendered as a transparent 4K PNG. Born from a NES / Super Famicom set (models built from
a 13 s video) and a PS5. The lesson of that project, in one line: **grain and 4K can't fix
under-detailed geometry.** Cut the real recesses first, then let the grain sell the plastic.

| path | what it is |
|---|---|
| `scripts/kit.py` | helper kit: scene/asset setup, `plastic`/`grain` materials, primitives, `cut`, `surface` shells, studio light, gloss strip, render settings, sanity report |
| `examples/ps5.py` | full worked example: PS5 disc edition (curved shells, cut ports and slot, louvre fins, light bars, micro PS-symbol texture) |
| `references/lessons.md` | every gotcha and tuned number from the NES/SFC + PS5 sessions; read before a final render |

Blender: `/Applications/Blender.app/Contents/MacOS/Blender` (5.2, Apple M1 Pro, Metal).

## Workflow

1. **References first.** Video: `ffprobe` it, then a contact sheet
   (`ffmpeg -i in.mp4 -vf "fps=1,scale=180:-1,tile=7x2" sheet.png`) and single frames
   (`-ss 3.0 -frames:v 1`). No refs given: try Chrome (claude-in-chrome); if the extension
   isn't connected, Wikimedia Commons works from the shell (API `list=search` /
   `list=categorymembers` on `Category:<Device>`, then `prop=imageinfo&iiurlwidth=1400`),
   saved into the scratchpad. Get a front, a side and a 3/4 view, plus real dimensions
   (one web search). Write down where every port, button, vent, seam and logo sits, as a
   fraction of height/width read off the photos.
2. **Copy `examples/ps5.py` as the starting build script** into the output folder
   (`~/Downloads/<Device> Blender Model/` unless told otherwise). It already does the
   imports, `--draft`/`--out` handling, studio, render and report. Model at **1 unit =
   10 cm**; every kit default is tuned for that.
3. **Block out the silhouette with real proportions.** Boxes/`loft` for bodies, `surface`
   (grid from `fn(u, v)`, + Solidify + Subsurf) for curved shells, `prism`/`pill` for
   outlines. One `kit.asset()` per physical object (own collection + parent empty).
   Draft-render (step 6) and compare to the refs before adding any detail.
4. **Cut the detail for real.** `kit.cut(body, kit.box('... cutter', ...))` for every port,
   slot, vent and socket (EXACT boolean; the kit bakes modifiers first), then
   `kit.edge_bevel(body, .003-.008)` so each cut edge gets a catchlight. Put a dark
   `socket shadow` box behind every opening, add tongues/contacts inside ports. Buttons:
   `kit.button` (sidewall + rolled lip + dished/domed top) in a `kit.socket_ring`.
   Text/legends: `kit.text` (Arial Bold, tiny extrude) sitting on the surface.
5. **Materials.** Matte plastic = `kit.plastic(name, color)`: this is the grain (below).
   Gloss = `kit.material(name, color, .035, coat=1, coat_roughness=.02)` (both layers
   sharp, or it renders as chrome). Colored buttons: roughness
   .28, `coat=.18`. Lights/LEDs: `emission=..., strength=10-15` on a `kit.tube`. Use
   `kit.PALETTE` linear colors; whites around .66-.73, never 1.0.
6. **Light, camera, render loop.**
   `kit.camera(target, location, lens=85)` (or `ortho_scale=` for a flat catalogue look),
   `kit.studio(target, key_side=...)` with the key on the side of the biggest face the
   camera sees, `kit.gloss_strip(...)` for each big glossy face, then
   `kit.render_settings(out_png)`. Iterate with
   - `Blender -b --python build.py -- --draft` (quarter res, 48 spp, ~10 s) and **look at
     it next to the reference** every time;
   - `-- --crop x0 y0 x1 y1` (0-1, origin bottom-left) for a full-res region, to judge
     grain, cut edges and small parts at final pixel density.
   Fix the biggest mismatch, rerun. Only then render the final (no flags; 2160x3840,
   192 spp, ~2-4 min), in the background.
7. **Deliver.** Check `sips -g pixelWidth -g pixelHeight -g hasAlpha out.png`, look at
   the PNG, read the `*-checks.json` report (`degenerate_meshes` must be empty). Hand over
   the PNG + .blend + build script as local files. Keep earlier .blend versions; save each
   revision under a new name.

## The grain (don't skip it)

`kit.grain()` / `kit.plastic()` builds the molded ABS "orange peel":

- Texture Coordinate **Object** (grain is the same size on every part, unaffected by UVs
  or scale) into two Noise textures: fine (Scale 85, Detail 2.5, Roughness .68) and
  waviness (Scale 32, Detail 2).
- Waviness -> Bump "soft pebble" (Strength .18, Distance .008) chained into the Normal
  input of the fine Bump "visible grain" (Strength .48, Distance .018) -> Principled
  Normal.
- Fine noise -> Map Range (.30-.49) -> Principled Roughness, so each pebble has its own
  specular. That is what makes it read as plastic grain rather than noise.

Tune with `size` (>1 finer; 1.25-1.4 for smaller/finer-finished parts) and `strength`.
The grain only shows with a directional key: `kit.studio` has a sun (angle .16) plus a
restrained fill. Too much fill erases it. Check it with a `--crop` render before the
final. For brand micro-textures (the PS5's tiny ○△✕□), bake a numpy tile into a packed
image and chain it as a third bump (`symbol_grain` in `examples/ps5.py`).

## Rules of thumb

- Detail is geometry: real recesses with clearance gaps, cut-through openings with dark
  interiors, beveled cut edges. Floating decals and flat dark rectangles read as fake.
- Silhouette and proportion beat detail; get them right in draft first.
- Never trust a render you haven't looked at next to the reference.
- AI image edits (the `image` skill, never codex) can make a pretty transparent picture,
  but they invent detail. Say so if you use one; the Blender render is the faithful one.
- Personal fan renders: logos and wordmarks are fine; no licensing talk.

See `references/lessons.md` for the API gotchas (Blender 5.2 compositor, Glare node,
boolean order, headless crashes) and the tuned numbers.
