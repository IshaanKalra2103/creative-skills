---
name: colorfigures
description: Build colourful, hand-inked, interactive isometric figures of everyday objects and machines (washing machine, vending machine, toaster, kettle, radio, lamp, coffee set, arcade cabinet…) as one self-contained HTML page — real 3D bodies shaded in flat light/mid/dark bands, a heavy ink silhouette with finer inner lines, a flat blue cast shadow, a "hand-drawn wobble" slider, warm paper and body-colour swatches. Every figure does something: buttons press, doors open, items drop, parts move. Use this whenever someone wants a colourful / illustrated / hand-drawn / sketchy isometric object, a "Colorfigures" figure, a "how does X work" figure, or a playable or clickable object illustration — even if they don't name the skill. For dark glowing line-art use iso-glow instead.
---

# Colorfigures

Hand-inked, flat-coloured isometric objects you can play with. Each figure is one HTML page: a small engine
(`assets/core.js`) plus your figure script, which models the object in 3D and draws it with the engine's shapes.
The look comes from the engine: faces and curved surfaces are shaded in three flat tones by the way they face the
light, the outer silhouette is inked heavier than the inner edges, and the object casts a flat blue shadow.

One fixed view (front, left side and top toward the viewer) and one fixed light. There is no turning and no light
control — don't add them.

## Workflow

1. **Set up:** copy `assets/core.js` into the working folder next to your figure (the page loads it with
   `<script src="core.js">` while you work).
2. **Read the references** before writing: `assets/examples/vending.html` (structure, products behind glass, clipping,
   buttons with a picker, stats) and `assets/examples/washer.html` (a rounded body made with `extrude`, a door, a
   drawer, a drum seen through glass, timed animation). Read `core.js` too: its helpers are short and commented, and the
   `mountFigure({...})` options are listed just above that function.
   The examples also contain code for drawing the back and the other side (`facing`, `boxV`, `txBack`, `views:true`):
   that was for turning, which this skill doesn't do. You only need what is visible from the front view.
3. **Write `figure.html`** (name it after the object): a doctype/head shell, `<script src="core.js"></script>`, then one
   inline `<script>` that defines the geometry and calls `mountFigure({...})`.
4. **Look at it** with headless Chrome (below), fix — at most 2 rounds.
5. **Build one file:** `python3 "<skill folder>/scripts/build.py" figure.html OUT.html` inlines the engine, so `OUT.html`
   runs on its own. Hand over OUT.html and say what the buttons do (the page shows no instructions).

## Labels on parts

- If the request is about **how something works** ("show how it works", "explain", "for kids", "what happens
  inside"), label the working parts with `tag([x,y,z], dx, dy, 'TEXT', on)`: a cream pill with a leader line to that
  3D point. Pass `on = true` while that part is doing its job (it turns the accent colour) — e.g. HEATER while
  heating, FLOAT while the tank fills. 3–6 short labels (one or two words, capitals).
- If it's just "make a toaster", **don't** label — unless the person asks.
- **The person decides:** "no labels" or "label it" wins over this default.
- Labels must not cover each other, the object's printed text or anything moving — check every stage in the shots.
  `dx, dy` (where the pill sits) are in screen units at the reference zoom; aim the pills outward into empty space.
- The page gets a Labels on/off switch automatically when a figure has tags; `?labels=0` starts with them off.

## Coordinates and projection
- `x` = depth (the front face is at `x = W`, facing viewer-right), `y` = width (+y goes viewer-left), `z` = up.
  Ground at `z = 0`. The viewer looks from (+1,+1,+1).
- Visible faces: `+x` (front, lit), `+y` (left side, in shade), `+z` (top).
- Scale ≈ 1 unit per cm: vending machine 90 × 130 × 232; washer 62 × 65 × 88. Pick realistic proportions; small objects
  (a kettle) can be modelled bigger (60–100 units) so detail reads. Framing and line weight adapt automatically.

## Look
- Body: one palette `m = {l, m, d}` (light / mid / dark), shaded with `tone(normal, m)`. Small props and interiors use
  `toneI`. Other materials: `METAL`, `CLEAR`, `CERAMIC`, `DARK`, or `matOf('#hex')`.
- **Rounded bodies** (most machines): an `rrUV(...)` profile in the (y, z) plane swept along x with
  `extrude(profile, x0, x1, m)` — this is what gives the banded rounded edges. `extrude` draws only the swept
  sides: draw the front cap (`shape(on(PX(x1), profile), m.l, 2.2)`) and the silhouette ink yourself, as `washer.html`
  does. `extrude`/`loft` decide which way a strip faces from the shape's centre, so they only work for **convex**
  profiles — split a C- or L-shaped part (a handle, a bracket) into convex pieces. Round things: `cyl` (upright), `cylX` (pointing out of the front), `rod(a, b, r, m)` (between any two points, at any
  angle — lamp arms, rods, handles; pass a second radius for a cone), `loft`
  between rings (`on(PZ(z), ellUV(...))`) for cones, cups, bottles, domes.
- **Ink:** silhouette `hullInk(points, ~2.8)` drawn after the body; front-panel outline ~2.2; openings 1.6–1.8;
  details 0.8–1.4. Always draw through `pd()` on 3D points (screen-space strokes), no SVG transforms except text.
  `pd(pts)` closes the path; use `pd(pts, false)` (or `line(...)`) for an open line such as a rim arc, or it draws a
  chord straight across. Every `stroke-width="N"` in the scene is rescaled with the zoom — fine for ink; for a thick
  stroke used as a shape (a cable, a stream) that's usually what you want too.
- **Stand it on a board** (the default for anything that sits on a table or desk — a lamp, kettle, fan, radio, a coffee
  set): `board(x0, y0, x1, y1, h, r, BOARD | WOOD | m)` drawn first, a little bigger than the object's footprint, and
  everything else standing on `z = h`. Big floor-standing machines (a washing machine, a vending machine) can stand on
  the paper instead. Include the board in `size`.
- **Cast shadow next:** `castShadow(points, z0, clip)` with the object's outline points at the bottom and the top, `z0`
  = the surface it falls on, and on a board `clip = boardTop(...same as the board...)` so it stops at the edge. Shadows
  are short (about half the height) and must stay connected to the object: see *Tall things* below.
- Accent colours sparingly: status lights (green `#43c25c` / red `#e2483d`), screens (`#1d2a26` with `#8af0ae` text),
  glass (`#cfe9f0` at low opacity + 1–2 white streaks at ~.38 opacity).
- Do not add dark edge strips along silhouettes — they read as a heavy outline. Only ink strokes are dark.

## Scenes with several objects (a coffee set, a desk with a lamp)
- Give each object its own cast shadow (`castShadow(points, z0)` with `z0` = the surface it stands on; wrap shadows on a
  board in `clipTo(boardTopPoints, ...)`), its own silhouette ink, and sort the objects with `byDepth`.
- Jointed or thin things (lamp arms, rods): one shadow per part, and cap rods at the mid tone — the darkest tone on a
  thin rod reads as an ink line.
- **Tall things on a thin support** (a fan head on a stem, a lamp shade on an arm, a sign on a pole): the shadow of
  the high part lands away from the base. Cast the base, the support and the high part so the shadows touch (include
  the top of the stem in the head's shadow points) — a detached blob reads as a second object. Look at the shadow in
  the screenshot as carefully as the object: it should sit under the object, connected, and on the board. See-through parts (a wire cage, a glass
  dome) cast a lighter shadow: wrap it in `<g opacity=".45">`.
- **Glass containers** (a server, a jug, a hopper): draw the far wall's shading, then the contents, then a light tint
  and one or two streaks on top. Heavy glass layers over a liquid turn it grey. See-through parts cast a lighter shadow
  (`<g opacity=".45">`).
- **A stream falling into an opening** (water into a filter, coffee into a cup): split it at the rim — the part above
  the rim is drawn on top, the part inside goes in the receiving container's clip — or it's drawn over the near wall.
- **Things lifted into the air** (a kettle while pouring, a dripper being moved): their shadow is unavoidably apart
  from them; draw it at half opacity so it doesn't read as a separate object.
- **Cones that narrow downward** (a dripper, a funnel, a lampshade seen from above): `tone()` puts almost all of the
  wall in shade; shade it as if the wall were upright (use the horizontal part of the normal).
- **Cords and hoses:** `washer.html` has `smooth3` and `tube` for a soft cable — copy them into your figure.
- **Light the object gives off** (a lamp, a torch, a screen): draw the beam as a pale polygon from the light's opening
  to where it lands, and the pool as a soft ellipse on the surface (clip it to the board), both before the parts that
  sit in front of them; keep them pale so the object stays the subject.
- `size` must cover the largest pose (an arm stretched up, a kettle lifted to pour); pick a default pose that fills
  the frame well.

## Painter's order (draw back to front — there is no depth buffer)
1. board, then cast shadows (clipped to the board)
2. anything seen *through* an opening, wrapped in `clipTo(openingPoints3D, ...)`: back wall → side/floor surfaces →
   contents, sorted so items with larger `x+y+z` draw later (`byDepth([{at:[x,y,z], svg}, ...])`)
3. reveals/jambs of the opening (the thin surfaces from the glass plane to the front face)
4. glass tint + streaks (`pointer-events="none"` so clicks reach the contents)
5. front face as ONE path with holes: `<path d="${outer}${hole1}${hole2}" fill-rule="evenodd">`
6. things mounted on the front (buttons, dials, labels, doors that open outward)
7. outer body (`extrude(...)`), then side-face details (vents, decals)
8. silhouette ink (in a set: each object's own, right after that object), then labels (`tag`) last

## Interaction (the fun part)
- **Follow the real process.** Before drawing, write the real sequence as a short list — each step, and where every
  material is after it (beans in the hopper → grounds in the grinder's cup → grounds in the filter → water through the
  bed → coffee in the server → coffee in the cup). Each button is one real step, and things only move along their real
  path: nothing appears somewhere it couldn't get to, and no container is skipped. If an earlier step is missing, run
  it first or say so. Check every stage's screenshot against that list, not just that the button "did something".
- **Every supply comes from something in the scene.** A refill needs its source drawn and used: water from a tap or a
  jug, beans from a bag, paper from a roll, coins from a hand or a slot. If a button adds something, show where it
  comes from and let it travel from there.
- 2–5 meaningful actions with real outcomes: a door that opens, a mode that animates, a dial that changes state, an
  item that drops. **`buttons` are the interface** — every important action must have one, listed in the order a person
  would use them (`{label, onClick(st, ui)}`, or `{label, choices: st => [...]}` for a picker). Parts wrapped in `act(...)` respond on
  *press* (the scene is redrawn every animation frame, which would swallow a normal click) — don't add your own
  `click` listeners to drawn parts; if you need one, use `pointerdown`. Test clickable parts while an animation runs,
  with a press held ~150 ms, not only with instant script clicks. In a picker, mark the
  option in use with `current: true` (shown selected) and an option that can't be chosen right now with
  `disabled: true, why: 'the program is locked while it runs'` (shown faded). Both stay clickable and say so — never
  leave a control that silently ignores a press. Clickable parts too:
  wrap them in `act('name', svg)` and handle them in `acts`.
- Out-of-order presses must do something sensible: run the missing step first, or say why not with
  `ui.flash('the can is empty — refill it')` (a short note under the buttons) or on the object itself (a display, a
  sign, a blinking light). The status line (`readout`) and `idea` are hidden on the page, so don't rely on them for
  anything the viewer must see. `stats` (big numbers top right) suit a measured quantity: credit, litres, height.
- Animations: `ui.animate(dt => { ...; return stillRunning; })`, eased, mostly under ~2 s. Anything that must *finish*
  should also be safe if the user presses another button meanwhile (one state object, one source of truth).
- `params(st, q)`: read URL params for every interesting state (`?open=1&mode=spin`) so a screenshot can show it.

## Lessons from earlier figures
- Framing is automatic from `size` ([W, D, H] = the true bounding box, including things that stick out: handles,
  trays, a lifted part at its highest). The cast shadow may spill outside.
- Line weight is normalised (every `stroke-width="N"` is rescaled to the zoom). If you redraw part of the scene yourself
  via innerHTML, wrap the string in `inkScale(...)`.
- Hinged doors: hinge on the viewer-RIGHT edge (y = 0) so the inside swings into view; a door hinged on the left
  edge (y = D) hides the opening when open. Flaps hinged at the top that swing up/out cover the opening — hinge at the
  bottom or slide.
- Seeing inside: a point `(x,y,z)` inside appears on the front plane `x = W` at `y' = y + (W − x)`, `z' = z + (W − x)`.
  Only things whose `(y', z')` land inside the opening are visible — do this arithmetic when placing contents.
- Liquids inside a container are only visible near the rim: a surface more than ~half the radius below the rim is
  hidden by the front wall. A tilted container's liquid stays level — draw its surface as a horizontal ring.
- **Silhouette ink on round and tapered things** (pots, cups, kettles, lamps): one `hullInk` over several parts draws
  false straight lines across gaps (pot to saucer). Ink each part's hull separately, and draw a part's hull *before*
  whatever covers its far side, or the ink cuts across the nearer part.
- **Motion straight toward the viewer** (air from a fan, water from a hose pointed at you) draws as straight down the
  screen and reads as falling. Angle the object a little (15–20°) so its "forward" is a diagonal.
- Spheres (balls, domes, capsules): a circle of radius r·1.2247 at `P(...centre)`; shade with a light offset circle and
  a small highlight; sort by x+y+z.
- Text: `tx(...)` on the front, `txY(...)` on the side (≥ ~2 units or it smears under the wobble). On a curved
  surface, only put text where the surface faces the viewer (about 20–50° round from the front) and build its
  transform with `txM(P(...), Dv(tangent), Dv(0,0,-1))`; elsewhere it shears unreadably. `hint` shows in the header —
  keep it to one short line. Plain letters and
  digits only — emoji and symbols render as blobs.
- `core.js` owns these global names — **never declare them in a figure** (a clash blanks the page; short names like
  `S`, `C`, `L`, `SH`, `f` are the usual trap): `PALS METAL CLEAR CERAMIC DARK INK SHADOW C S OX OY VIEW RC VIEW_NAMES TURNS
  rotV rotXY P0 P Dv depthOf byDepth f pd sp arcUV rrUV rectUV ellUV PX PY PZ on sub dot cross norm avg vis facing SHADOW_K
  AZ_MIN AZ_MAX SHADOW_LEN L SH setLight LIN tone toneI mix matOf ease ink fill face shape line loft hull hullInk box extrude
  cyl cylX rod txM tx txY castShadow BOARD WOOD boardTop board act tag clipTo INK_REF_VB INK_K inkScale CORE_CSS filterFor
  mountFigure`. Prefix your own short names (`lampS`, `armL`).

## Shapes that look right
- **Real proportions.** Before modelling, picture the real object and note its key proportions and where parts attach:
  a gooseneck spout leaves the kettle low but its tip rises to about lid height; a paper filter sits just inside its
  cone with a small fold above the rim; a jug's handle meets the body at two points. Model to those notes.
- **Fill the frame.** `size` is the envelope the frame is fitted to: make it the object plus what really moves, no
  more. A board or desk much bigger than the object, or a `size` padded "to be safe", makes the object small on screen.
  The board should be only a little bigger than what stands on it.
- **Neat over busy.** Clean, simple forms read better than many small ones: keep repeated hairlines (grilles, cage
  wires, vents, slats) to about 8–18, draw details as a few clear shapes rather than many tiny ones, line parts up with
  each other and with the axes, and keep inner lines lighter than the outline (the defaults do: `shape`/`line` 0.9,
  silhouettes heavier). Every detail you keep must be big enough to read at the figure's normal size — if you have to
  zoom in to understand it, enlarge it or leave it out.
- **Slender and airy, like the real thing.** Thin parts stay thin (lamp arms, rods, handles, spouts are long and
  narrow; joints and knobs are small), long parts stay long, and nothing is chunkier than the real object. In a scene
  with several objects, leave clear board between them — roughly the width of the smallest object — and size the board
  so the scene breathes rather than crowding the objects together. The engine already inks thin and small parts lighter
  (`hullInk` weight follows each part's thickness), which only works if the parts really are thin.
- **Attached parts must visibly join their body** (handles, spouts, knobs, arms, cables): both ends touch, nothing
  floats beside it, and nothing sits on a face without a reason to be there.
- **One object's ink never crosses another object.** Draw each object completely (fill, details, its silhouette ink)
  before anything in front of it, so a nearer object covers the farther one's outline. In a set, that means
  per-object silhouettes inside `byDepth`, not one pass of silhouettes at the end.
- **One shadow per object, one shape.** Never stack a translucent and a solid shadow for the same thing.

## Verify before you finish (keep it light: at most 2 rounds)
Render with headless Chrome over `file://` (Linux: `google-chrome` / `chromium`); each run needs its own
`--user-data-dir` if you run several at once:
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --user-data-dir="$PWD/.shot-profile" --force-device-scale-factor=2 --window-size=800,860 \
  --virtual-time-budget=3000 --screenshot=out.png "file://$PWD/figure.html"
```
Do **at most two rounds** of shoot → fix. Each round is just:
1. **The idle shot**, looked at full size.
2. **One `?press=` run of the main sequence** (the buttons in the order a person would use them), shot at two or three
   budgets — e.g. `figure.html?press=Coin@300,Left@1500,Drop@2500` at 1500, 4000, 8000 ms (virtual time doesn't track
   your timings exactly). `?press=` clicks buttons by the start of their label; `Label>Choice` picks from a picker.
   Add **one out-of-order press** (a later step first) to see it answers sensibly.
3. **One 3× crop of the part most likely to go wrong** (a row of keys, a glass container, a joint): nearer parts must
   cover farther ones, nothing overlapping or unreadable. Rows of identical parts are where order bugs hide: draw them
   far to near (smaller x+y first) or through `byDepth`.
4. **Errors:** run the press URL once with `--dump-dom` and check `<html data-errors="…">` (script errors and unknown
   labels land there) and grep for `NaN`.
5. **A quick look as a stranger would** at those shots: anything physically wrong or odd — a part at an impossible
   height, a line crossing an object, a floating piece, a shadow that doesn't match, a shape unlike the real thing.

Fix what you find, do the second round only if the first found something, then build and hand over. Skip palette
checks, long screenshot series and extra test runs. The figure's state is `window.__st` if you need to read it.

## When to use something else
- Dark, glowing line art → **iso-glow**.
- A figure you can turn around, or a light you can move, is out of scope: this skill draws one fixed view.
