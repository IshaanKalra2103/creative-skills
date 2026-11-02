"""Headless Blender: USD/USDZ -> GLB (uncompressed, PBR + textures kept).

Usage:
  blender -b -P usdz_to_glb.py -- in.usdz out.glb [--decimate 0.5] [--height 0.15]

- imports USD/USDZ (textures are unpacked next to a temp dir and packed into the GLB)
- applies all transforms, converts to metres (uses the stage's metersPerUnit via the importer)
- centres the origin on the combined bounding-box centre
- optional --decimate RATIO (0-1) collapse-decimates meshes with > 5000 faces
- optional --height METRES rescales so the tallest dimension equals this (sanity override)
- exports GLB with no Draco; +Y up (glTF convention)
"""
import sys
import bpy
import mathutils


def parse():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    pos, opts, i = [], {"decimate": None, "height": None}, 0
    while i < len(argv):
        if argv[i] in ("--decimate", "--height"):
            opts[argv[i][2:]] = float(argv[i + 1]); i += 2
        else:
            pos.append(argv[i]); i += 1
    if len(pos) != 2:
        sys.exit("usage: blender -b -P usdz_to_glb.py -- in.usdz out.glb [--decimate 0.5] [--height M]")
    return pos[0], pos[1], opts


def world_bounds(objs):
    lo = mathutils.Vector((1e18,) * 3); hi = mathutils.Vector((-1e18,) * 3)
    for o in objs:
        for c in o.bound_box:
            w = o.matrix_world @ mathutils.Vector(c)
            for k in range(3):
                lo[k] = min(lo[k], w[k]); hi[k] = max(hi[k], w[k])
    return lo, hi


def main():
    src, dst, opts = parse()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.wm.usd_import(filepath=src, scale=1.0, import_cameras=False, import_lights=False,
                          import_materials=True, import_usd_preview=True, set_material_blend=True,
                          create_world_material=False)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        sys.exit("no mesh objects imported")

    # drop non-mesh leftovers (empties are baked into world transforms below)
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    # unparent keeping world transform, then apply everything
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    for o in meshes:
        if o.data.users > 1:
            o.data = o.data.copy()
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    if opts["decimate"]:
        for o in meshes:
            if len(o.data.polygons) > 5000:
                m = o.modifiers.new("dec", "DECIMATE"); m.ratio = opts["decimate"]
                bpy.context.view_layer.objects.active = o
                bpy.ops.object.modifier_apply(modifier=m.name)

    # delete empties/other non-mesh objects
    for o in list(bpy.context.scene.objects):
        if o.type != "MESH":
            bpy.data.objects.remove(o, do_unlink=True)

    lo, hi = world_bounds(meshes)
    size = hi - lo
    if opts["height"]:
        s = opts["height"] / max(size)
        for o in meshes:
            o.scale = (s, s, s)
        bpy.context.view_layer.update()
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        lo, hi = world_bounds(meshes)
    centre = (lo + hi) / 2
    for o in meshes:
        o.location -= centre
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    lo, hi = world_bounds(meshes)
    print("FINAL SIZE (Blender Z-up, metres):", tuple(round(v, 4) for v in (hi - lo)))
    for o in meshes:
        print("MESH", o.name, len(o.data.polygons), "faces; materials:", [m.name for m in o.data.materials if m])

    bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", export_draco_mesh_compression_enable=False,
                              export_yup=True, export_apply=True, export_materials="EXPORT",
                              export_image_format="AUTO", export_texcoords=True, export_normals=True)
    print("WROTE", dst)


main()
