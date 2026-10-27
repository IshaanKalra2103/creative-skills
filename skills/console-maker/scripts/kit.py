"""console-maker kit: modeling, grainy molded-plastic materials, studio light and
transparent 4K Cycles renders for hardware product models. Blender 5.x Python only.

Use from a build script run as `Blender -b --python build.py [-- --draft]`:

    import sys; sys.path.insert(0, '<skill>/scripts')
    import kit
    kit.reset('My console')
    ...

Scale convention: model at 1 Blender unit = 10 cm (a 39 cm console is 3.9 units tall).
Every default below (grain size, bevel widths, light power) is tuned for that scale.
"""
import bpy
import math
import json
import sys
from pathlib import Path
from mathutils import Vector

DRAFT = '--draft' in sys.argv
# --crop x0 y0 x1 y1 (0-1, origin bottom-left): full-res border render of one region,
# to judge grain and small cuts at final pixel density without paying for the whole 4K.
CROP = [float(a) for a in sys.argv[sys.argv.index('--crop') + 1:][:4]] if '--crop' in sys.argv else None
collection = None   # collection new objects go into
root = None         # empty that new objects are parented to


# ---------------------------------------------------------------- scene / assets

def reset(name='Console model'):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.name = name
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = .1
    return scene


def asset(name):
    """Start a new asset: its own collection plus a parent empty (move it as one piece)."""
    global collection, root
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    root = bpy.data.objects.new(name + ' root', None)
    collection.objects.link(root)
    return root


def link(o):
    for c in list(o.users_collection):
        c.objects.unlink(o)
    (collection or bpy.context.scene.collection).objects.link(o)
    if root and o is not root:
        o.parent = root
    return o


def activate(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o


# ---------------------------------------------------------------- materials

def material(name, color, roughness=.45, metallic=0, coat=0, emission=None, strength=0, coat_roughness=.22):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metallic
    if coat:
        p.inputs['Coat Weight'].default_value = coat
        p.inputs['Coat Roughness'].default_value = coat_roughness   # ~.03 for piano black
    if emission:
        p.inputs['Emission Color'].default_value = (*emission, 1)
        p.inputs['Emission Strength'].default_value = strength
    return m


def grain(m, size=1.0, strength=.48, distance=.018, rough=(.30, .49), pebble=.18):
    """Molded ABS 'orange peel'. Two noise layers in OBJECT coordinates (grain stays the
    same size on every part) -> chained bumps -> Normal, plus the fine noise driving a
    roughness range so each pebble gets its own specular. size>1 = finer grain."""
    nt = m.node_tree
    p = nt.nodes.get('Principled BSDF')
    for n in list(nt.nodes):
        if n.type not in {'BSDF_PRINCIPLED', 'OUTPUT_MATERIAL'}:
            nt.nodes.remove(n)
    co = nt.nodes.new('ShaderNodeTexCoord')
    fine = nt.nodes.new('ShaderNodeTexNoise'); fine.name = 'Molded ABS dense orange peel'
    fine.inputs['Scale'].default_value = 85 * size
    fine.inputs['Detail'].default_value = 2.5
    fine.inputs['Roughness'].default_value = .68
    coarse = nt.nodes.new('ShaderNodeTexNoise'); coarse.name = 'Molded surface waviness'
    coarse.inputs['Scale'].default_value = 32 * size
    coarse.inputs['Detail'].default_value = 2
    nt.links.new(co.outputs['Object'], fine.inputs['Vector'])
    nt.links.new(co.outputs['Object'], coarse.inputs['Vector'])
    broad = nt.nodes.new('ShaderNodeBump'); broad.name = 'Soft underlying pebble'
    broad.inputs['Strength'].default_value = pebble
    broad.inputs['Distance'].default_value = .008 / size
    nt.links.new(coarse.outputs['Fac'], broad.inputs['Height'])
    micro = nt.nodes.new('ShaderNodeBump'); micro.name = 'Visible grain'
    micro.inputs['Strength'].default_value = strength
    micro.inputs['Distance'].default_value = distance / size
    nt.links.new(fine.outputs['Fac'], micro.inputs['Height'])
    nt.links.new(broad.outputs['Normal'], micro.inputs['Normal'])
    nt.links.new(micro.outputs['Normal'], p.inputs['Normal'])
    ramp = nt.nodes.new('ShaderNodeMapRange'); ramp.name = 'ABS satin roughness range'
    ramp.inputs['To Min'].default_value, ramp.inputs['To Max'].default_value = rough
    nt.links.new(fine.outputs['Fac'], ramp.inputs['Value'])
    nt.links.new(ramp.outputs['Result'], p.inputs['Roughness'])
    return m


def plastic(name, color, size=1.0, strength=.48, rough=(.30, .49)):
    """Grainy matte molded plastic in one call."""
    return grain(material(name, color, sum(rough) / 2), size, strength, rough=rough)


# Linear (not sRGB) base colors that held up under AgX. Real white plastic is ~.55-.70,
# not 1.0: brighter values blow out and lose the grain.
PALETTE = {
    'warm light gray': (.54, .55, .51), 'light plastic': (.68, .69, .645),
    'console white': (.66, .67, .66), 'medium gray': (.205, .22, .205),
    'charcoal': (.028, .035, .031), 'button black': (.010, .014, .011),
    'socket shadow': (.008, .010, .009), 'socket rim': (.23, .235, .21),
}


# ---------------------------------------------------------------- primitives

def finish(o, name, ma, bevel=0, segments=3):
    o.name = name
    if ma:
        o.data.materials.append(ma)
    if bevel:
        b = o.modifiers.new('Molded edge radius', 'BEVEL')
        b.width = bevel
        b.segments = segments
        b.limit_method = 'ANGLE'
        o.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return link(o)


def mesh_object(name, verts, faces, ma=None, bevel=0, smooth=False):
    me = bpy.data.meshes.new(name + ' mesh')
    me.from_pydata(verts, [], faces)
    me.validate()
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    if smooth:
        for f in me.polygons:
            f.use_smooth = True
    return finish(o, name, ma, bevel)


def box(name, loc, size, ma, bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(o, name, ma, bevel)


def cylinder(name, loc, radius, depth, ma, bevel=.012, vertices=64, rotation=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    o = bpy.context.object
    if rotation:
        o.rotation_euler = rotation
    for f in o.data.polygons:
        f.use_smooth = len(f.vertices) == 4
    return finish(o, name, ma, bevel)


def prism(name, outline, bottom, top, ma, bevel=.02):
    """Extrude a 2D outline [(x, y), ...] (counter-clockwise) between two z heights."""
    n = len(outline)
    verts = [(x, y, bottom) for x, y in outline] + [(x, y, top) for x, y in outline]
    faces = [tuple(reversed(range(n))), tuple(range(n, 2 * n))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    return mesh_object(name, verts, faces, ma, bevel)


def loft(name, rings, ma, bevel=.04):
    """Stack of centred rectangles [(half_x, half_y, z), ...] -> tapered solid."""
    verts = []
    for x, y, z in rings:
        verts.extend([(-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)])
    faces = [(3, 2, 1, 0)]
    for k in range(len(rings) - 1):
        faces.extend([(4 * k + i, 4 * k + (i + 1) % 4, 4 * (k + 1) + (i + 1) % 4, 4 * (k + 1) + i) for i in range(4)])
    faces.append(tuple(range(4 * (len(rings) - 1), 4 * len(rings))))
    return mesh_object(name, verts, faces, ma, bevel)


def pill(name, loc, width, length, depth, ma, angle=0):
    """Stadium/slot shape lying in XY, centred at loc."""
    r = width / 2
    off = (length - width) / 2
    outline = []
    for centre, t0 in [(off, 0), (-off, math.pi)]:
        for i in range(25):
            t = t0 + i * math.pi / 24
            x, y = r * math.cos(t), centre + r * math.sin(t)
            outline.append((x * math.cos(angle) - y * math.sin(angle), x * math.sin(angle) + y * math.cos(angle)))
    o = prism(name, outline, -depth / 2, depth / 2, ma, min(.008, depth * .2))
    o.location = loc
    return o


def surface(name, fn, nu, nv, ma, thickness=0, subdiv=0, smooth=True):
    """Grid surface from fn(u, v) -> (x, y, z), u, v in [0, 1]. For curved shells
    (side panels, covers). thickness adds a Solidify, subdiv a Subdivision Surface."""
    verts = [fn(i / nu, j / nv) for j in range(nv + 1) for i in range(nu + 1)]
    faces = [(j * (nu + 1) + i, j * (nu + 1) + i + 1, (j + 1) * (nu + 1) + i + 1, (j + 1) * (nu + 1) + i)
             for j in range(nv) for i in range(nu)]
    o = mesh_object(name, verts, faces, ma, smooth=smooth)
    if thickness:
        s = o.modifiers.new('Shell thickness', 'SOLIDIFY')
        s.thickness = thickness
        s.use_even_offset = True
    if subdiv:
        d = o.modifiers.new('Smooth shell', 'SUBSURF')
        d.levels = d.render_levels = subdiv
    return o


def text(body, loc, size, ma, rotation=None, align='CENTER', extrude=.00015, name=None,
         font='/System/Library/Fonts/Supplemental/Arial Bold.ttf'):
    bpy.ops.object.text_add(location=loc)
    o = bpy.context.object
    o.data.body = body
    o.data.size = size
    o.data.align_x = align
    o.data.align_y = 'CENTER'
    o.data.extrude = extrude
    o.data.resolution_u = 16
    o.data.font = bpy.data.fonts.load(font, check_existing=True)
    if rotation:
        o.rotation_euler = rotation
    return finish(o, name or 'Print ' + body, ma)


def button(name, x, y, z, r, ma, concave=False):
    """Round button cap from a radial profile: sidewall, rolled lip, dished or domed top."""
    rings = [(r * .92, z - .045), (r, z - .025), (r, z + .010), (r * .96, z + .023),
             (r * .82, z + .028), (r * .38, z + (.014 if concave else .032))]
    n = 64
    verts = []
    for radius, h in rings:
        verts.extend([(x + radius * math.cos(i * 2 * math.pi / n), y + radius * math.sin(i * 2 * math.pi / n), h) for i in range(n)])
    faces = [tuple(reversed(range(n)))]
    for k in range(len(rings) - 1):
        faces.extend([(k * n + i, k * n + (i + 1) % n, (k + 1) * n + (i + 1) % n, (k + 1) * n + i) for i in range(n)])
    faces.append(tuple(range((len(rings) - 1) * n, len(rings) * n)))
    return mesh_object(name, verts, faces, ma, smooth=True)


def socket_ring(name, x, y, z, outer, inner, depth, ma):
    """Annular collar around a button socket."""
    n = 64
    verts = []
    for radius, h in [(outer, z - depth), (outer, z), (inner, z), (inner, z - depth)]:
        verts.extend([(x + radius * math.cos(i * 2 * math.pi / n), y + radius * math.sin(i * 2 * math.pi / n), h) for i in range(n)])
    faces = []
    for k in range(4):
        kn = (k + 1) % 4
        faces.extend([(k * n + i, k * n + (i + 1) % n, kn * n + (i + 1) % n, kn * n + i) for i in range(n)])
    o = mesh_object(name, verts, faces, ma, smooth=True)
    edge_bevel(o, .003)
    return o


def tube(name, points, radius, ma):
    """Round tube along a polyline (light strips, cables, seams)."""
    cu = bpy.data.curves.new(name + ' curve', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = radius
    cu.bevel_resolution = 4
    sp = cu.splines.new('POLY')
    sp.points.add(len(points) - 1)
    for p, co in zip(sp.points, points):
        p.co = (*co, 1)
    o = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(ma)
    return link(o)


# ---------------------------------------------------------------- real detail (cuts)

def bake(o):
    """Apply every modifier (bevels, solidify, subsurf) so a boolean sees final shape."""
    activate(o)
    if o.type != 'MESH':
        bpy.ops.object.convert(target='MESH')
        return o
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    return o


def cut(body, cutter):
    """EXACT boolean difference, then delete the cutter. Bakes both first, which avoids
    'Applied modifier was not first' and keeps the original edge radii."""
    bake(cutter)
    bake(body)
    m = body.modifiers.new('Cut', 'BOOLEAN')
    m.operation = 'DIFFERENCE'
    m.solver = 'EXACT'
    m.object = cutter
    activate(body)
    bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(cutter, do_unlink=True)
    return body


def edge_bevel(o, width=.006, segments=3):
    """Small bevel after cuts: the catchlight on every recess edge is most of 'detail'."""
    b = o.modifiers.new('Recess edge catchlight', 'BEVEL')
    b.width = width
    b.segments = segments
    b.limit_method = 'ANGLE'
    o.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return o


def remove(*prefixes):
    for o in list((collection or bpy.context.scene.collection).objects):
        if any(o.name.startswith(p) for p in prefixes):
            bpy.data.objects.remove(o, do_unlink=True)


# ---------------------------------------------------------------- camera, light, render

def aim(o, target):
    o.rotation_euler = (Vector(target) - o.location).to_track_quat('-Z', 'Y').to_euler()
    return o


def camera(target, location, lens=85, ortho_scale=None):
    global collection, root
    collection, root = bpy.data.collections.get('Studio') or bpy.data.collections.new('Studio'), None
    if 'Studio' not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(collection)
    cam = bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera'))
    collection.objects.link(cam)
    cam.location = location
    aim(cam, target)
    if ortho_scale:
        cam.data.type = 'ORTHO'
        cam.data.ortho_scale = ortho_scale
    else:
        cam.data.lens = lens
    cam.data.clip_end = 1000
    bpy.context.scene.camera = cam
    return cam


def studio(target, power=1.0, distance=1.0, key_side='left'):
    """Directional sun (shows grain) + key softbox + restrained fill + rear rim.
    Too much fill flattens grain and recesses; this ratio is the one that worked.
    Put the key on the side of the biggest face the camera sees (key_side='right'
    for a camera at +X), or that face renders gray."""
    flip = -1 if key_side == 'right' else 1
    global collection, root
    collection, root = bpy.data.collections.get('Studio') or bpy.data.collections.new('Studio'), None
    if 'Studio' not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(collection)
    t = Vector(target)
    d = distance

    def light(kind, name, offset, energy, size=None):
        data = bpy.data.lights.new(name, kind)
        data.energy = energy
        if kind == 'AREA':
            data.shape = 'DISK'
            data.size = size * d
        o = bpy.data.objects.new(name, data)
        collection.objects.link(o)
        o.location = t + Vector((offset[0] * flip, offset[1], offset[2])) * d
        return aim(o, t)

    sun = light('SUN', 'Directional key (reveals grain)', (-6, -8, 9), 1.5 * power)
    sun.data.angle = .16
    light('AREA', 'Key reflection softbox', (-5, -6, 8), 550 * power * d * d, 3.5)
    light('AREA', 'Restrained front fill', (5, -6, 2), 180 * power * d * d, 5)
    light('AREA', 'Rear rim (edge definition)', (1, 4, 7), 850 * power * d * d, 3)
    world = bpy.data.worlds.new('Studio world')
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (.2, .2, .2, 1)
    bg.inputs['Strength'].default_value = .16
    bpy.context.scene.world = world


def gloss_strip(face_point, face_normal, camera_location, distance=6, size=(.5, 5), energy=120):
    """Tall strip softbox placed at the mirror direction of the camera about a glossy
    face, so the face shows a clean highlight instead of rendering dead black."""
    p, n = Vector(face_point), Vector(face_normal).normalized()
    d = (Vector(camera_location) - p).normalized()
    r = 2 * d.dot(n) * n - d   # camera direction mirrored about the face normal
    data = bpy.data.lights.new('Gloss strip', 'AREA')
    data.shape = 'RECTANGLE'
    data.size, data.size_y = size
    data.energy = energy
    o = bpy.data.objects.new('Gloss strip', data)
    (bpy.data.collections.get('Studio') or bpy.context.scene.collection).objects.link(o)
    o.location = p + r * distance
    return aim(o, p)


def render_settings(path, samples=192, size=(2160, 3840), transparent=True):
    """Cycles on the Metal GPU, AgX, PNG RGBA with real alpha. --draft = quarter res, 48 spp."""
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for dev in prefs.devices:
        dev.use = dev.type == 'METAL'
    s.cycles.device = 'GPU'
    s.cycles.samples = 48 if DRAFT else samples
    s.cycles.adaptive_threshold = .012 if DRAFT else .010
    s.cycles.use_denoising = True
    s.cycles.max_bounces = 8
    s.render.resolution_x, s.render.resolution_y = size
    s.render.resolution_percentage = 25 if DRAFT and not CROP else 100
    if CROP:
        s.cycles.samples = 64
        s.render.use_border = s.render.use_crop_to_border = True
        s.render.border_min_x, s.render.border_min_y, s.render.border_max_x, s.render.border_max_y = CROP
    s.render.film_transparent = transparent
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGBA' if transparent else 'RGB'
    s.render.image_settings.color_depth = '8'
    s.view_settings.view_transform = 'AgX'
    s.view_settings.look = 'AgX - Medium High Contrast'
    p = Path(path)
    tag = ' - crop' if CROP else ' - draft' if DRAFT else ''
    s.render.filepath = str(p.with_name(p.stem + tag + p.suffix))


def report(path, **extra):
    """Write a JSON sanity report: object/face counts, bounds, broken (flat) meshes."""
    s = bpy.context.scene
    bpy.context.view_layer.update()
    meshes = [o for o in s.objects if o.type == 'MESH']
    flat = [o.name for o in meshes if sum(d > 1e-6 for d in o.dimensions) < 2]
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = [min(p[i] for p in pts) for i in range(3)] if pts else [0] * 3
    hi = [max(p[i] for p in pts) for i in range(3)] if pts else [0] * 3
    data = {'objects': len(s.objects), 'meshes': len(meshes),
            'faces': sum(len(o.data.polygons) for o in meshes),
            'bounds_min': [round(v, 3) for v in lo], 'bounds_max': [round(v, 3) for v in hi],
            'degenerate_meshes': flat, **extra}
    Path(path).write_text(json.dumps(data, indent=2))
    return data


def save_and_render(blend_path, notes=''):
    if notes:
        bpy.data.texts.new('BUILD NOTES').write(notes)
    bpy.ops.file.pack_all()
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    bpy.ops.render.render(write_still=True)
    print('RENDER_COMPLETE', bpy.context.scene.render.filepath)
