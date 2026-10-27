# Lessons and tuned numbers

From the NES / Super Famicom / controllers / cartridge session (built from a 13 s video,
four revisions) and the PS5 session. The Nintendo build scripts (`fix_models.py`,
`refine_detail.py`, `render_grainy_transparent.py`, `render_surreal_4k.py`) stayed local
(`~/Downloads/Nintendo Blender Models/` on the machine that made them); everything
reusable from them is in `scripts/kit.py` and below.

## What the user pushed back on, and the fix

- "Why doesn't the render look as good as the reference?": detailing. Adding grain and
  going to 4K changed nothing. What worked: real boolean recesses (top deck cavity,
  cartridge slot through the shell, eject cradle, controller port openings), cut side
  vents, inset grilles with fins, lids with clearance gaps, radial-profile button caps in
  annular collars, rubber pill keys, cut grip grooves, heavier font, packed hi-res label,
  then the directional light rig.
- First colors were too bright: linear base colors above ~.75 blow out under AgX and
  hide the grain. Revised: warm light gray (.54,.55,.51), light (.68,.69,.645), medium
  gray (.205,.22,.205), inset (.085,.115,.105), charcoal (.028,.035,.031), button black
  (.010,.014,.011), socket shadow (.008,.010,.009). PS5 white (.72,.73,.72).
- Roughness range on grain went .43-.64 -> .30-.49 (satin, not chalky); grain bump
  .62/.028 -> .48/.018 (visible but not sandpaper).

## Light

- Sun 1.5 W/m², angle .16, from front-left-high: reveals grain and recess edges.
- Area disk key softbox 550 W (size 3.5), front fill 180 W (size 5), rear rim 850 W
  (size 3); world gray .2 at strength .16. AgX, look "Medium High Contrast", exposure 0.
- A vertical face (PS5 side panel) facing away from the key renders gray: put the key on
  the camera side of the biggest face (`key_side='right'`) and raise `power` (2.0 for PS5).
- Glossy black faces render dead black or a gray/chrome smear unless something bright
  sits at the mirror direction AND both specular layers are sharp: base roughness .035,
  `coat=1, coat_roughness=.02`, then `kit.gloss_strip` with a thin, dim strip
  (size (.08, 7), 12 W) aimed at one edge of the face. Base roughness .1 or a 30 W strip
  smeared the strip over the whole PS5 front and it read as chrome; the draft hid it,
  the 192 spp final showed it. Crop-render glossy faces before the final.

## Render

- Cycles, `prefs.compute_device_type='METAL'`, `prefs.get_devices()`, enable METAL
  devices, `scene.cycles.device='GPU'`. 192 spp, adaptive .010, denoise, 8 bounces.
- 2160x3840 portrait, `film_transparent=True`, PNG RGBA 8-bit. Verify with
  `sips -g pixelWidth -g pixelHeight -g hasAlpha`.
- Timings on M1 Pro: draft (25%, 48 spp) ~5-10 s; final 4K 1.5-4 min.
- Draft/crop/final all write different filenames (`- draft`, `- crop`), so a draft never
  overwrites a final.

## Blender 5.2 API gotchas

- Run headless: `Blender -b --python build.py -- --draft`. The first headless launch once
  segfaulted (signal 139 in `metal_is_supported`); just rerun.
- `open -a Blender file.blend` fails; use `open -a /Applications/Blender.app file.blend`.
- `Material.use_nodes` / `World.use_nodes` print deprecation warnings; harmless.
- Compositor: `tree = bpy.data.node_groups.new(name, 'CompositorNodeTree')`,
  `tree.interface.new_socket(name='Image', in_out='OUTPUT', socket_type='NodeSocketColor')`,
  `scene.compositing_node_group = tree`, output via `NodeGroupOutput` (no Composite node).
- Glare node has no `glare_type` attribute: `glow.inputs['Type'].default_value = 'Fog Glow'`,
  `glow.inputs['Quality'].default_value = 'High'`.
- Booleans after bevels log "Applied modifier was not first": bake (apply) every modifier
  on body and cutter before the boolean, then add a fresh small bevel. `kit.cut` does this.
- Zero-thickness label planes: check "fewer than 2 nonzero dimensions" for broken meshes,
  not `min(dimensions) <= 0`.
- `Mesh.flip_normals()` fixes inward-facing shells (mirrored `surface` grids); Solidify
  goes against the normal, so outward normals give an inward shell.
- Text objects: `bpy.data.fonts.load('/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  check_existing=True)`, extrude .00015, resolution_u 16.
- Blender MCP addon (localhost:9876) is usually not connected; headless scripts are the
  reliable path.

## Projective label texture

To put artwork from a video frame onto a flat label: solve the 3x3 homography from the
label's four corners in the frame to the unit square (8x8 linear solve with numpy), then
set each loop's UV from `H @ [u, v, 1]`. See `refine_detail.py` (cartridge label).

## Looks that were tried

- "Surreal 4K" (neon halo, chrome spheres, glare): fun, but the user then wanted the
  plain transparent grainy version. Default to transparent studio; offer the stylized one.
