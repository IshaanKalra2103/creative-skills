# iso.js primitives

```html
<script src="iso.js"></script>
<script>const { P, poly, line, tube, box, extrude, cylinderU, ring, hull, slab, clipD, seg, ease } = ISO;</script>
```

## Axes and projection

| axis | meaning | screen direction | visible face |
|---|---|---|---|
| `u` | across | ↘ `(cos30, sin30)` | the `+u` face |
| `d` | depth, along a lane | ↗ `(cos30, −sin30)` | the `−d` face (faces the viewer) |
| `z` | up | ↑ | the `+z` face (top) |

`P([u, d, z]) = [(u + d)·cos30, (u − d)·0.5 − z]`. One world unit is one SVG unit. A pointer drag of `(dx, dy)` moves an object along −d by `dx·(−cos30) + dy·0.5` (that's how the filing cabinet drawers follow the hand exactly).

Set the `<svg viewBox>` from `P()` of the extreme corners of everything that can appear, and `preserveAspectRatio="xMidYMid meet"`. With `meet`, a wide screen shows more than the viewBox horizontally, so things "offscreen" in the viewBox can still be visible: fade objects out before they reach a place where they would pop.

## Primitives (all return SVG markup strings)

| call | draws |
|---|---|
| `poly(pts, cls?, extra?)` | filled world polygon. `cls` `''` ink + line, `'w'` solid line colour (glare, stripes), `'ln'` outline only, any custom class |
| `line(pts, cls = 'ln')` | open polyline |
| `tube(pts)` | outlined tube: thick line-colour stroke then thin ink stroke (halos, handles, suspension arms, jack levers) |
| `box(u0,u1,d0,d1,z0,z1, T?)` | the +u, top and −d faces. `T` maps local → world, so a moving/lifting/pitching part is `box(..., p => [p[0], p[1] + pos, p[2] + lift])` |
| `extrude(profile, u0, u1, T?)` | a **convex** side profile `[(d, z)…]` swept across `u`: only the strips whose outward normal faces the viewer, then the +u cap. Concave shapes = several convex pieces drawn back to front (nose, tub, sidepod, engine cover) |
| `cylinderU(uc, dc, zc, r, w, {stripe, rim, spin})` | cylinder along u: hull of both caps (tread), the +u cap, optional white band `stripe: [inner, outer]` ratios, rim, 5 spin marks at angle `spin` (use `distance / r` so it rolls without slipping) |
| `ring(c, r, axis)` | circle points in a plane of constant `u`, `d` or `z` (lamps on a face, rings on a lid) |
| `hull(pts2)` | convex hull in screen space; `screenPoly(hull(...))` makes silhouettes of round things |
| `roundRect(...)`, `slab(u0,u1,d0,d1,r,z0,z1)` | rounded plate: the side band is the hull of top and bottom outlines, then the top face |
| `clipD(poly3, keepFront, plane = 0)` | cut a world polygon by the plane `d = plane` |
| `dOf(pts)` | path data for a world polygon (for `<clipPath><path d=…>`) |
| `seg(t, [a, b])`, `ease`, `easeOut`, `clamp01` | timeline windows |

## Painter's order

- Only three faces of a box are ever visible and they never overlap each other, so a single box needs no sorting.
- Between objects, order by hand: far side (small u, large d, low z) first. Rules of thumb that hold for iso views: something **above** another thing at the same (u, d) goes after it; something at **larger u** goes after; something at **smaller d** goes after.
- When one object can be on either side of another over time, give it two draw slots and switch on a condition, e.g. `if (parkedFarSide) drawBefore else drawAfter`.
- Things moving *through an opening* (drawer in a cabinet): draw the body with the opening as a dark cavity; draw the part of the moving object behind the front plane (`clipD(..., false)`) inside a `clipPath` of the opening; draw the part in front (`clipD(..., true)`) after the body.
- Parts that sit on top of another (a cap on a slab) go after it, even if they are "further back".

## Details that sell the look

- Glare: two parallelograms in a face's plane, `class="w"`, clipped to the face with a `clipPath` of that face (`dOf(face)`). Bands that are vertical on screen run along `u − d = const` on a top face.
- Insets: a `line` 2–3 units inside an edge (lids, panels, drawer fronts).
- Slots and vents: a parallelogram on the face plus an inner `L` line along two edges.
- Lamps: `poly(ring([u, d0, z], r, 'd'))` on a −d face; lit = fill with an accent class.
- Numbers on bodywork: seven-segment strokes in the face plane (see `numberPlate` in the pit wall).
- Light: gradient polygon + `filter: url(#soft)` (`feGaussianBlur` ~9 units, filter region 220%) behind the object, a faint screen-blended copy over it.

## Theming

Tokens on `:root` (`--bg --ink --line --dim` + accents) and a `[data-theme="light"]` override that swaps ink and line. All strokes/fills reference the tokens through classes, never inline colours (except accents that are data, like tyre compounds).
