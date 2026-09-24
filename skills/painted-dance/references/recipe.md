# Recipe: re-skinning `examples/crooner.html`

The file is one `<script>` split into banner-commented blocks. Keep the engine blocks and replace the content blocks.

| block | keep / replace | notes |
|---|---|---|
| timing, math, colour | keep | `BPM`, `BARS`, `GROUND`, `FLOOR`, `REST` (hip height) are the knobs |
| BRUSH ENGINE | keep | `brush(g, pts, o)`, `blob(g, poly, o)`, `ink()`, `circlePts()` |
| PALETTES / SECTIONS | replace | `COL` = performer colours; `SECT[]` = `{b, ground, floor, pal[], light, sh[2]}` per section |
| MUSIC DATA | replace | `CHORD`, `ROOT`, `PROG` (one chord per bar), `MEL` phrases `[beat, midi, beats]`, assembled into `LEAD` |
| CHOREOGRAPHY | replace | one function per move returning `P({...})`; `MOVES = [[startBeat, fn], …]`; `SPINS` |
| IK + rig | adapt | proportions live here (torso 228, upper arm 132, forearm 124, thigh/shin 172) |
| FIGURE | replace | `drawFigure`, `drawHead`, `drawArm`, `drawCable` |
| WALL, LIGHTS, SHADOWS | keep | events are built from `SECT`; change stroke density in `buildEvents` |
| CAMERA, GRAIN, TITLE | adapt | `camera(b)` per section; `drawTitle` for the end card |
| SCORE | keep voices, edit the arrangement | `renderChunk(b0, b1)` arranges each bar by section |
| PLAYBACK / USER TRACK | keep | poster, chunk streaming, drag-and-drop audio, analyser lip-sync |

## Pose fields

`hx, hy` hip centre · `lean` torso angle (+ tilts toward screen right) · `tilt` pelvis · `head` head angle · `nod` px of lagged head drop · `hA, hB` hand targets relative to the left/right shoulder in torso space (x right, y down) · `fL, fR` = `[x offset from 960, heel lift]` · `micMouth` 0–1 pulls hand A to the mouth · `spin`, `flare` · `wink` · `pointB`.

Move building blocks:

```js
const s = sw(Math.PI * b);          // −1..1, weight shift once per beat, snappy
const d = dip(b);                   // 1 on each beat → knees bend (add to hy)
const p = Math.sin(Math.PI * b);    // smooth counter-phase for pumping limbs
const q = (b % 2) / 2, e = smooth(q / .12) * (1 - smooth((q - .55) / .4)); // hit on 1 and 3, release
```

Lift the unweighted foot with `max(0, s)²` and slide it inward. This keeps legs inside IK reach when the hips sway.

## Drawing a performer

- Build all points from the torso frame `T(x, y)` (origin at the neck, y down the spine) and the head frame `Q(x, y)`, so lean and head tilt apply for free.
- Cloth: blob the panel, add 1–2 fold strokes that end on the swinging hem, add a lighter lapel blob, then ink the outer edge in 2–3 broken strokes.
- Limbs: one fat brush through shoulder→elbow→wrist, a darker underside stroke offset along the normal, an ink stroke on the other side, then a cuff and the hand.
- Anything that dangles (hems, belt ends, scarf, ponytail, cable, tassels) is `restPoint + (pose(t − lag) − pose(t)) · gain`. Longer lags go further down the chain.
- Silhouette test: the `FLAT` shadow pass shows the pose as a solid shape. If the move doesn't read in the shadow, exaggerate it.

## Score arrangement pattern

intro (pad swell → kick → bass → snare/stabs, riser + snare roll into the verse) · verse (4-on-floor, gated snare, 8th octave bass, off-beat stabs, bell arps, lead) · pre (claps, stabs on quarters, 16th hats, snare roll + riser, tom-fill spin) · chorus (open hats, pad, bright lead with an octave) · finale (three stop-hits with silence between, then the tonic chord and a bell run).

Keep the melody original. The mouth animation reads `LEAD`, so every sung note must be in it.
