# Style: the four looks, the rules, the vocabulary

One core, four looks. All four come from films by the same author and share
the bones: paper stock, seeded textures, hard cuts, a drawn cadence, a signed
ending. They differ in palette, finish and the devices they lean on.

## The four looks

| look | palette | finish | backgrounds | line | texture | signature devices | reference |
|---|---|---|---|---|---|---|---|
| **ink** | `paperInk` | `ink` | warm paper with light bands; navy for blueprint interludes | dark wobbly outline 2 to 3 px | hatching along the form, grain, cross-hatch shadows | construction lines, riso scribble on one part, hex lattices, blot wipe, mosaic POV, camera follow | the fruit fly |
| **riso** | `risoPop` | `riso` | cream stock; purple-navy starfield | crayon strokes with grainy edges | halftone dot screens per ink, overprinted | seed dot in every frame, crayon ripples, iris, 4-cards-per-second montage, badge gallery, duotone beat, hand sign-off | the flipbook |
| **screen** | `screenSea` | `screen` | cream sky, blue water, one orange desk; starfield at night | thin dark outline only where a shape needs it | a regular dot grid on every flat shape | one constant protagonist through 30 cuts, day and night pairs, origami setup and payoff, squiggle letters | the paper boat |
| **pencil** | `pencilMinimal` | `pencil` | cream; pale pink and sage sections; warm black section | thin graphite, 0.8 to 1.2 px | almost none: sparse lines, tiny dots | torn-edge sections, walls of squiggle text, pressed plants, sticky notes, a thread down the page, dotted arcs and dot fireworks on black, an enso | the personal website |

A film can live in one look or cut between them. Cutting looks is itself a
device (`examples/four-looks.html` does it seven times) and must land on a
hard cut, never inside a shot.

## Rules

These are not suggestions. If a frame breaks one, fix the frame.

1. **Paper, not screen.** Every frame starts with `paper(c)` or `night(c)`:
   stock colour plus stock grain. Never pure black, never pure white.
2. **Texture is a finish, not a gradient.** Shading comes from `surface()`:
   hatching, dot screen or graphite. No `createLinearGradient` on the final
   canvas, no `filter`, no `shadowBlur`. The one exception is inside a riso
   plate, where a gradient becomes dot size (`printPlate`) or a density
   function (`dotScreen`).
3. **Nothing lines up perfectly.** Fill a shape with a `Path2D`, outline it
   with a separately jittered polyline (`wob`, `crayon`). Fill and outline
   must not coincide. Outline 2 to 3 px in ink and screen, crayon 3 to 5 px in
   riso, 0.8 to 1.2 px in pencil.
4. **Misregistration is an accent.** `scribble` on one or two parts per
   frame in the ink look; two-ink offsets in `seedDot`, `handText` and
   `signOff` everywhere. Never on backgrounds.
5. **Two renderers, one geometry.** Every drawable takes `mode`: the normal
   mode for its look, or `blueprint` (chalk strokes on night, no fills,
   lattices as outlines). Blueprint interludes mean "look inside".
6. **Guides show.** Construction lines with ticks and crosses in about half
   the ink shots; dashed rings and dotted arcs in riso and pencil. They say
   "this is a drawing being made".
7. **Lattices for many-of-the-same.** Hex lattices for eyes, cells, POV
   mosaics; dot grids for cities, fields, crowds.
8. **Seeded everything.** `rng(seed)`. `Math.random` is banned. Textures do
   not change between drawn frames of a static shot. Deliberate boil, if any,
   re-seeds outlines only, every 3 drawn frames, never the finish.
9. **Drawn on twos.** Draw at 12 fps, output 24 fps. Idle motion is quantised
   with `pulse(i, every)`. Camera and paths ease smoothly but are sampled on
   the grid. In the riso montage, one card per 3 drawn frames.
10. **Cut hard, transition rarely.** Shots 0.8 to 2.5 s, or 0.25 s in a
    montage. Devices, in order of preference: ink blot, iris, self-drawing
    line, flicker between two renders, one-frame flash, torn section rising.
    Never two devices back to back.
11. **Palette discipline.** Every colour comes from `PAL`. A film may switch
    palettes on a cut and derive variants, but never invents a hex inside a
    scene.
12. **One thing per shot.** The silhouette reads at 240 px, contact-sheet
    size. A montage card reads at 120 px, badge size. If a scene does not read
    on the grid sheet in a second and a half, redo it, do not decorate it; one
    large object beats twenty small ones.
13. **An anchor survives the cuts.** The seed dot, the boat, the thread, the
    fly: one element stays in place or in role while everything around it
    changes. Decide what it is before writing scenes.
14. **Sign it.** The last shot is `signOff`: two words in hand lettering, two
    ink dots. It is the only text a film needs.

## Vocabulary: say this, get that

| term in the brief or beat sheet | what it looks like | kit call |
|---|---|---|
| wobbly outline | shaky ink contour | `wob(c, pts, amp, seed, close)` |
| crayon line | thick stroke with a grainy edge | `crayon(c, pts, color, width, seed, close)` |
| hatching that follows the form | short parallel strokes along a part's long axis | `surface(..., {finish:'ink'})`, `hatch(c, path, box, {angle})` |
| cross-hatch shadow | two hatch layers at ±45°, darker | two `hatch` calls |
| grain, stock | speckles that give tone and paper feel | `grain`, `paper`, `night` |
| dot screen, halftone | dots whose size carries the tone | `surface(..., {finish:'riso'|'screen'})`, `dotScreen` |
| plates, separations, overprint | one plate per ink, multiplied on paper | `plate()`, `printPlate` |
| knockout | white shape on a plate that keeps the ink off | draw `#fff` on the plate |
| duotone beat | one shot in two inks | `usePalette(duotone(a, b))` |
| riso outline, misregistered accents | same contour in accent colours, offset | `scribble` |
| construction lines, guides | thin lines with ticks, a circle, crosses | `construction`, `cross` |
| dashed ring, dotted arc | rings drawn as dashes or dots | `dashedRing`, `dottedArc` |
| blueprint mode | chalk-on-night version of the same geometry | `drawX(c, 'blueprint', ...)` on `night(c)` |
| hex lattice, compound eye, cells | pointy-top hexagon grid | `hexCells`, `hexLattice`, `hexPath` |
| POV mosaic | scene as flat hex tiles | `mosaic(c, layer, cellSize)` |
| spark, nucleus, aster | dot with rays | `aster` |
| dot fireworks | bursts made of dots on rays | `dotBurst` |
| seed dot, anchor dot | the dot that never leaves the frame | `seedDot` |
| ripples | concentric crayon rings born every few frames | `ripples`, or `crayon` per ring |
| iris | a circle opening on another render | `iris(c, cx, cy, r, fn)` |
| ink blot wipe | bristly blob reveals another render | `blot(c, layer, cx, cy, R, seed)` |
| montage, cards | full-bleed shots at 4 per second | `montage(c, cards, tau, .25, i)` |
| gallery, badges | every card as a round stamp on rings | `badges(c, cards, {progress, scale})` |
| self-drawing line | contour appears as if being drawn | `selfDraw` |
| speed lines, wake loops | strokes and coloured sine ribbons behind a mover | `speedLines`, `loops` |
| ghost limbs | a part drawn 3 times at ±angle with alpha | loop in the puppet |
| torn section | new paper colour from a torn edge downward | `section(c, y, color, seed)` |
| wall of text, letter, notes | rows of illegible handwriting | `squiggleText` |
| sticky note | paper square with a small drawing | `stickyNote(c, x, y, s, seed, draw)` |
| pressed plant | branching stem with leaf clusters | `plant` |
| thread, spine | thin line wandering down the frame | `thread` |
| hand lettering, sign-off | real letters in a handwriting face, two inks | `handText`, `signOff` |
| flash frame | one near-white drawn frame | `flash(c)` |
| flicker | alternate two renders every 2 drawn frames | `flicker(i)` |
| twitch, pulse | one drawn frame of change every N | `pulse(i, every)` |
| push-in, follow, lead | camera moves | `cam(c, x, y, zoom, rot)` |
