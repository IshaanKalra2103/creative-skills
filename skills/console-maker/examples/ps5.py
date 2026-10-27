"""PlayStation 5 (original disc edition, CFI-1000) standing on its base.
Blender -b --python ps5.py -- [--draft] [--out DIR]

Units: 1 = 10 cm. Real size ~390 x 104 x 260 mm -> 3.9 tall, ~1.0 thick, 2.6 deep.
Front faces -Y, disc-drive panel on +X, up is +Z.
"""
import bpy
import math
import sys
from pathlib import Path

import numpy as np

# Works from inside the skill and from a copy in any output folder.
for kit_dir in (Path(__file__).resolve().parent.parent / 'scripts',
                *(Path.home() / d / 'skills/console-maker/scripts' for d in ('.claude', '.claude3'))):
    if (kit_dir / 'kit.py').exists():
        sys.path.insert(0, str(kit_dir))
        break
import kit  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = Path(argv[argv.index('--out') + 1] if '--out' in argv else Path.home() / 'Downloads' / 'PS5 Blender Model')
OUT.mkdir(parents=True, exist_ok=True)

kit.reset('PS5 disc edition')

# ------------------------------------------------------------------ materials
white = kit.plastic('PS5 matte white panel', (.72, .73, .72), size=1.25, strength=.42, rough=(.34, .52))
matte_black = kit.plastic('PS5 matte black body', (.016, .018, .02), size=1.4, strength=.40, rough=(.38, .56))
gloss = kit.material('PS5 piano black front', (.008, .009, .011), .035, coat=1, coat_roughness=.02)
shadow = kit.material('Deep port shadow', kit.PALETTE['socket shadow'], .5)
fin_mat = kit.material('Intake fin black', (.02, .022, .025), .42)
led = kit.material('Light bar blue', (.05, .2, 1), .3, emission=(.08, .32, 1), strength=14)
stand_mat = kit.plastic('Stand matte black', (.018, .02, .022), size=1.2, strength=.45)


def symbol_grain(m, scale=55):
    """The PS5 black body is covered in tiny ○ △ ✕ □ marks. Bake a 512 px tile of them
    and add it as a third bump layer on top of the ABS grain."""
    n = 512
    yy, xx = np.mgrid[0:n, 0:n] / n
    cell = 4  # 4 x 4 cells, each holds one symbol
    u = (xx * cell) % 1 - .5
    v = (yy * cell) % 1 - .5
    k = ((xx * cell).astype(int) + 2 * (yy * cell).astype(int)) % 4
    w = .035
    r = np.hypot(u, v)
    circle = np.abs(r - .25) < w
    square = (np.abs(np.maximum(np.abs(u), np.abs(v)) - .22) < w)
    cross = (np.abs(np.abs(u) - np.abs(v)) < w * 1.4) & (np.maximum(np.abs(u), np.abs(v)) < .27)
    # triangle: three edge distances of an equilateral triangle centred in the cell
    d = np.stack([v + .17, -(v * .5 + u * .866) + .17, -(v * .5 - u * .866) + .17])
    inside = d.min(0)
    tri = (np.abs(inside) < w) & (d.min(0) > -w)
    mask = np.where(k == 0, circle, np.where(k == 1, cross, np.where(k == 2, square, tri)))
    img = bpy.data.images.new('PS symbol micro texture', n, n, alpha=False)
    px = np.ones((n, n, 4), np.float32)
    px[..., :3] = (1 - mask.astype(np.float32))[..., None]
    img.pixels.foreach_set(px.ravel())
    img.colorspace_settings.name = 'Non-Color'
    img.pack()

    nt = m.node_tree
    p = nt.nodes.get('Principled BSDF')
    co = next(nd for nd in nt.nodes if nd.type == 'TEX_COORD')
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (scale, scale, scale)
    nt.links.new(co.outputs['Object'], mp.inputs['Vector'])
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    tex.projection = 'BOX'
    tex.projection_blend = .3
    nt.links.new(mp.outputs['Vector'], tex.inputs['Vector'])
    bump = nt.nodes.new('ShaderNodeBump')
    bump.name = 'Micro PS symbols'
    bump.inputs['Strength'].default_value = .35
    bump.inputs['Distance'].default_value = .004
    grain_bump = p.inputs['Normal'].links[0].from_node
    nt.links.new(tex.outputs['Color'], bump.inputs['Height'])
    nt.links.new(grain_bump.outputs['Normal'], bump.inputs['Normal'])
    nt.links.new(bump.outputs['Normal'], p.inputs['Normal'])


symbol_grain(matte_black)


# ------------------------------------------------------------------ proportions
Z0, ZTOP = .06, 3.72          # core bottom / top
FRONT, BACK = -1.25, 1.25     # glossy front face / back


def smooth(e0, e1, x):
    t = min(max((x - e0) / (e1 - e0), 0), 1)
    return t * t * (3 - 2 * t)


def core_half(v):            # core is thinner at the bottom, like the reference
    return .25 + .08 * v ** 1.2


def zv(v):
    return Z0 + v * (ZTOP - Z0)


# ------------------------------------------------------------------ console
kit.asset('PS5 console')

rings = [(core_half(v), 1.185, zv(v)) for v in np.linspace(0, 1, 9)]
core = kit.loft('Core body', rings, matte_black, bevel=.10)
core.modifiers['Molded edge radius'].segments = 6
core.location.y = .065          # front of the matte body sits behind the glossy plate

# Glossy front plate, narrower than the core: the open strips beside it hold the intake fins.
plate_rings = [(core_half(v) - .07, .075, zv(v)) for v in np.linspace(.015, .88, 8)]
plate = kit.loft('Glossy front plate', plate_rings, gloss, bevel=.025)
plate.location.y = FRONT + .075
# Matte cap above the gloss: same face, but it rolls back over the top like the real one.
cap_rings = [(core_half(.9) - .07, .3, zv(.88)), (core_half(.93) - .07, .3, zv(.93))]
for a in np.linspace(0, math.pi / 2, 7)[1:]:
    cap_rings.append((core_half(.95) - .07 - .02 * (1 - math.cos(a)), .3 - .2 * (1 - math.cos(a)), zv(.93) + .2 * math.sin(a)))
cap = kit.loft('Matte top cap', cap_rings, matte_black, bevel=.02)
cap.location.y = FRONT + .3

# Ports and buttons are cut into the glossy plate, then given dark interiors.
z_usba, z_usbc = 1.68, 1.44
kit.cut(plate, kit.box('USB-A cutter', (0, FRONT, z_usba), (.052, .12, .132), None, .006))
kit.cut(plate, kit.box('USB-C cutter', (0, FRONT, z_usbc), (.030, .12, .092), None, .013))
for z in (.30, .62):          # power + eject: thin touch slits low on the left
    kit.cut(plate, kit.box('Button slit cutter', (-core_half(.1) + .11, FRONT, z), (.012, .03, .2), None, .005))
kit.edge_bevel(plate, .004)
kit.box('USB-A interior', (0, FRONT + .07, z_usba), (.05, .02, .13), shadow, .004)
kit.box('USB-A tongue', (.008, FRONT + .045, z_usba), (.016, .05, .11), fin_mat, .003)
kit.box('USB-C interior', (0, FRONT + .07, z_usbc), (.028, .02, .09), shadow, .01)
kit.box('USB-C tongue', (0, FRONT + .045, z_usbc), (.008, .05, .06), fin_mat, .002)
for z in (.30, .62):
    kit.box('Button slit shadow', (-core_half(.1) + .11, FRONT + .03, z), (.012, .01, .2), shadow, .002)

# Intake fins in the strips between plate and panels: thin blades tilted like louvres.
for s in (-1, 1):
    for i in range(46):
        z = .28 + i * .072
        v = (z - Z0) / (ZTOP - Z0)
        x = s * (core_half(v) - .035)
        fin = kit.box('Intake fin', (x, FRONT + .08, z), (.06, .16, .009), fin_mat, .002)
        fin.rotation_euler.x = math.radians(-32)


# ------------------------------------------------------------------ side panels
def lip_in(v):              # inner edge of the panel's front lip; the gap shows fins + light
    return core_half(v) + .03 + .04 * v


def panel(s):
    """Curved white panel. u runs: lip inner edge -> rounded front edge -> back edge.
    v runs bottom -> top. Flares outward toward the top (the wing), front edge is
    concave in side view, and the +X panel bulges at the bottom for the disc drive."""
    LIP = .22   # share of u spent on the front lip
    R = .05     # front edge radius

    def bulge(v):
        return .075 * (1 - smooth(.22, .52, v)) if s > 0 else 0

    def outer(u, v):
        return .38 + .13 * smooth(.45, 1, v) ** 1.3 + bulge(v) + .05 * math.sin(math.pi * u) ** .8

    def y_front(v):
        return FRONT - .05 + .08 * math.sin(math.pi * min(v, 1)) ** 1.2

    def z_of(u, v):
        top = 4.0 - .09 * u - .16 * smooth(.9, 1, u) ** 2   # rounded back corner
        return .05 + v * (top - .05)

    def fn(u, v):
        yf = y_front(v)
        if u < LIP:
            t = u / LIP
            x_in = lip_in(v)
            xr = outer(0, v)
            if t < .6:      # flat front face of the lip
                a = t / .6
                x, y = x_in + a * (xr - R - x_in), yf + .012 * (1 - a)
            else:           # quarter round onto the side
                a = (t - .6) / .4 * math.pi / 2
                x, y = xr - R + R * math.sin(a), yf + R - R * math.cos(a)
            z = z_of(0, v)
        else:
            w = (u - LIP) / (1 - LIP)
            x, y = outer(w, v), yf + R + w * (BACK + .06 - yf - R)
            z = z_of(w, v)
        return (s * x, y, z)

    o = kit.surface('Side panel ' + ('disc side' if s > 0 else 'left'), fn, 64, 90, white,
                    thickness=.032, subdiv=1)
    if s < 0:
        o.data.flip_normals()
    return o, y_front, outer


left, _, _ = panel(-1)
right, y_front, outer = panel(1)

# Disc slot through the wide lower lip of the disc-side panel.
v_mid = .2
x_slot = (lip_in(v_mid) + outer(0, v_mid) - .05) / 2
kit.cut(right, kit.box('Disc slot cutter', (x_slot, FRONT - .02, .85), (.026, .3, 1.1), None, .012))
kit.edge_bevel(right, .003)
kit.box('Disc slot shadow', (x_slot, FRONT + .1, .85), (.03, .02, 1.1), shadow, .01)

# Light bars hide behind the lips and wash the fins.
for s in (-1, 1):
    pts = []
    for v in np.linspace(.12, .98, 40):
        x = lip_in(v) - .01
        pts.append((s * x, y_front(v) + .035, .05 + v * (4.0 - .05) - .02))
    kit.tube('Light bar', pts, .007, led)


# ------------------------------------------------------------------ stand
kit.asset('PS5 stand')
base = kit.cylinder('Stand base disc', (0, .25, .022), .78, .044, stand_mat, .012, 128)
kit.cylinder('Stand top boss', (0, .25, .05), .22, .02, stand_mat, .006, 96)
kit.cylinder('Stand screw', (0, .25, .062), .07, .012, kit.material('Screw metal', (.35, .35, .36), .3, metallic=1), .003, 48)


# ------------------------------------------------------------------ camera, light, render
target = (0, 0, 2.0)
kit.camera(target, (7.2, -10.6, 5.2), lens=85)
kit.studio(target, power=2.0, distance=1.0, key_side='right')
kit.gloss_strip((-.12, FRONT, 2.2), (0, -1, 0), (7.2, -10.6, 5.2), size=(.08, 7), energy=12)
kit.render_settings(OUT / 'PS5 - Grainy Transparent 4K.png')
info = kit.report(OUT / 'ps5-checks.json')
print('CHECKS', info)
kit.save_and_render(OUT / 'PS5 Model.blend', notes=(
    'PS5 disc edition, built with the console-maker skill. 1 unit = 10 cm. '
    'White panels: grainy ABS (object-space noise bumps). Matte black body: ABS grain + '
    'a baked micro tile of PS symbols. Glossy front plate with cut USB-A/USB-C ports, '
    'power/eject slits, louvre fins and blue light bars. Disc slot cut through the panel.'))
