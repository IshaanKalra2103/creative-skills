# Painting kit: `engine/svpaint.js` and how the example is built

A painting is **drawn**, not rendered. The page is a stack of Canvas 2D layers painted in a fixed artboard (1600×1000 in the example), composited by one small WebGL2 shader that does the print pass (misregistration, grain, glitch). Classic script, no dependencies, and it opens from `file://`.

Don't build a 3D scene and render it "in the style". The first version of the example was a software-3D projector; it read as a wireframe mannequin in a CG city. Drawing the same scene as 2D shapes fixed it.

## API

| Call | What it does |
|---|---|
| `P.smooth(pts, closed, k)` | Catmull-Rom → Béziers as a `Path2D`. Lower `k` is more angular. |
| `P.poly(pts)`, `P.bbox`, `P.translate(path, dx, dy)` | Plain polygons, bounds, offset copies of a path. |
| `P.rough(pts, amp, step, seed)` | Subdivide and jitter an edge so it looks cut by hand. |
| `P.limb(A, B, prof, {tension, capLen})` | A contour around a bone. `prof = [[t, wA, wB], …]` gives half-widths on each side, so muscles can be asymmetric (calf on one side, shin straight on the other). Returns `{path, pts, at(t, s), u, n}`; `at` places things on the limb surface (web lines, creases). |
| `P.homography(quad)` | Maps the unit square onto a perspective quad. Walls, windows and signs placed through it are perspective-correct. |
| `P.meet(a1, a2, b1, b2)` | Line intersection: building corners from vanishing-point lines. |
| `P.warp(ctx, img, map, nx, ny)` | Lays a flat image onto a perspective surface in small affine triangles (billboards, posters, graffiti). |
| `P.dryBrush(ctx, clip, color, {angle \| angleAt, len, width, alpha, count, box})` | Thin semi-opaque strokes in a direction: painted texture. Keep `alpha` ≤ 0.15 and `width` ≥ 2, or it reads as rain. |
| `P.spray(ctx, pts, color, {count, reach, size})` | Overspray speckle around a shape's points (sprayed emblems, graffiti). |
| `P.inkStroke(ctx, pts, {width, taper0, taper1, press, wobble})` | A brush-pen stroke as a filled shape: swells in the middle, tapers at the ends. |
| `P.dotPattern(ctx, color, cell, r, angle, bg)` | A cached dot-screen `CanvasPattern`. Fast enough for fills redrawn every frame. |
| `P.dots(ctx, clip, color, {cell, angle, radius(x, y), box})` | Ben-Day dots whose radius varies by position (halftone terminators, glows, contact shadows). **Always pass `box`**; it bounds the loop. |
| `P.hatch(ctx, clip, color, {gap, angle, width, weight(x, y), box})` | Parallel hatching, thinned by a weight function; bucketed into 4 stroke calls. |
| `P.screenGradient(W, H, t(x, y), stops, {cell, angle, band})` | A "gradient" printed as an AM dot screen between flat colour stops. Use it for skies. `band` is how much of each step stays flat. |
| `P.toon(ctx, path, {key, rimDir, shadow, rim, rimW, mid, midW, lit, litW})` | Toon light on any drawn shape by stacking offset copies of its own silhouette: base shadow, rim crescent on the rim side, a mid band (pass a dot pattern), then the lit crescent. No gradients. |
| `P.litClip(ctx, path, dir, w)` | Clip to the crescent a light would hit. Use it to redraw lines brighter where lit (web lines warming up). |
| `P.twos(t)`, `P.ones(t)` | Quantise time to 12 or 24 drawings a second. |
| `P.compositor(canvas)` | `.upload(i, canvas)` and `.draw(layers, {grain, seed, glitch, vignette})`. Each layer takes `par` (parallax px) and `mis` (misregistration px). |

## How "Don't Look Down" is built (`examples/dont-look-down/index.html`)

1. **Layers, back to front:** sky, far city, canyon walls, Miles + web, snow, lettering. The first three are painted once per resize. Miles and the snow are repainted **on twos**; the parallax eases on ones.
2. **Sky:** `P.screenGradient` radiating from a sun off the bottom-right corner (peach → salmon → magenta → violet → indigo), drawn at half resolution and scaled up without smoothing so the dots look printed. Then broad, faint dry-brush arcs round the sun and a few flat cloud streaks lit from below.
3. **Perspective by construction, not projection.** Two vanishing points: `VPV` far above the frame for the verticals (worm's-eye) and `VPC` below the frame for the avenue. A wall is a strip between two verticals through `VPV`, capped by a roofline through `VPC`; corners come from `P.meet`. Windows, mullions and the billboard are placed in the wall's unit square and mapped with `P.homography`.
4. **Facades:** flat base, dry brush along the verticals, window cells with random lit / TV-blue / sky-reflecting panes, all shifted a little off their grid (the "broken model"). Shadow faces get hatching weighted toward the bottom. The sunlit top of the left wall is the same facade repainted in lit colours inside a clip above a diagonal sun line, with **halftone dots marking the terminator** instead of a soft edge.
5. **Miles is drawn from joints.** `REST` holds 2D joint positions for the pose; `poseAt(t)` rotates the whole body about the grip (the swing) and kicks the trailing leg. Limbs are `P.limb` contours with anatomical, asymmetric profiles.
6. **One outline per mass.** `chain()` strokes every part of a chain with double-width ink first, then paints every part over it, so only the outside of the union keeps its line. The torso, neck, head, near leg and raised arm are one chain; the far arm and far leg are chains behind it. Creases (`crease`, `across`) are drawn where forms fold, instead of seams.
7. **Light on the suit** (`lightPart`): `P.toon` with a magenta rim toward the sky (up-left), a dark plum dot mid band and a warm lit crescent toward the sun (lower-right); white dots inside the rim band. These come straight from the book (PDF 112, 121).
8. **Web lines** run along each limb at three offsets plus three cross-contours that bow toward screen-up (seen from below). The torso and mask use a radial web with scalloped rings (`spiderWeb`). They are drawn dark red everywhere, then redrawn warm inside `P.litClip`.
9. **The emblem** is a sprayed spider in chest space: `P.inkStroke` legs, overspray, and a drip.
10. **Lenses** are big teardrops with a thick black offset shadow and a dot fade; they blink for two drawings every five seconds.
11. **The web strand** is a loose white line with loops where it leaves the fist, ink-backed so it reads on the sky.
12. **Print pass:** misregistration per layer from a focus value (click pulls focus from Miles to the city), grain reseeded on twos, a light vignette, and a band glitch on **G**.

## Drawing a figure that doesn't look like a mannequin

These all went wrong in the example's history:

- **Symmetric tubes read as a mannequin.** Give each limb an asymmetric profile: deltoid and bicep bumps high on the upper arm, forearm swell near the elbow, quad and hamstring on the thigh, calf on the back of the shin, thin ankles and wrists.
- **Inking every segment gives doll joints** (a ring at each knee and elbow). Ink the union of a chain, then add creases.
- **A thigh starting with a full-width round cap reads as a ball joint at the hip.** Start the thigh narrow and merge it into the torso's chain.
- **Straight lines through the pose read as a jumping jack.** Give it a line of action: tuck one knee high toward the chest and extend the other leg long.
- **Big hands and feet** are the Miles read (≈ 0.9 and 1.1 head heights). Point the feet; a vertical sneaker looks like a boot.
- **The rim should only be on the rim side.** If a crescent wraps the whole body, the figure looks like a sticker.

## Traps hit while building

- **A comment inside an object literal can swallow the next keys.** `web: '#ff7a3d', // note  ink: '#0a0710'` on one line silently deleted `ink`, `lens`, `emblem` and `strand`. Every fill using them kept its previous `fillStyle`, so the caption text and the emblem vanished with no error.
- **Duplicate option keys:** `{rim: RIM_DIR, rim: RIM_COLOUR}` keeps only the last. Name directions `rimDir`.
- **Unbounded dot and hatch loops:** a polygon clipped far off screen gives an enormous bounding box and hangs the page. `P.dots` and `P.hatch` clamp to the canvas; pass `box` in artboard units anyway.
- **An affine billboard on a perspective wall** looks like a skewed card and reads mirrored on the right wall, where u runs right to left. Use `P.warp` through the wall's homography and flip u on that side.
- **Thin, high-alpha dry brush in the sky reads as rain.** Use short, wide, faint strokes.
- **Misregistration too strong** (≥ 5 px on the whole city) turns every window into RGB confetti. Keep background planes at 1–2 px and save the big offsets for the extreme foreground and for focus pulls.

## Verifying

```bash
node scripts/shot.mjs <dir> /tmp/a.png                                   # one frame (waits for window.__ready)
SIZE=1440x900 FULL=1 COLS=2 node scripts/shot.mjs <dir> /tmp/b.png '' 'scene.focus(1)' 'scene.glitch()' 'scene.S.print=false'
SIZE=390x844 DPR=2 node scripts/shot.mjs <dir> /tmp/phone.png            # phone
```

Then Read the PNG and crop the figure with ffmpeg (`-vf crop=w:h:x:y`) to judge the drawing up close. Judge the figure at the size it's seen, and again zoomed in.
