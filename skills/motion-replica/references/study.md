# Studying the reference

The aim is a beat table precise enough that building is transcription. Everything below
came from rebuilding a 10 s, 2×2 fintech ad (`examples/cero-grid`).

## 1. Spec and structure

`study.py ref.mp4 --grid CxR` prints the output spec (size, fps, duration, frames, audio)
and for each cell:

- **Loop period**: the lag where the cell best matches itself. In a grid ad each panel
  usually loops on its own clock. The example's cells loop at 3.800 / 5.367 / 5.033 / 3.933 s,
  so `renderAt(t)` runs each cell at `t % period`. "no clear loop" means build the whole
  duration as one timeline.
- **Cuts**: frames where the picture jumps. These are scene changes, which become hard cuts
  with `V()` (visibility), not crossfades. Fast motion can also register as a cut; confirm on
  the contact sheet.

Pick the grid by looking at `overview.png`. A picture-in-picture or asymmetric layout can be
measured with `--grid 1x1` plus manual crops (`ffmpeg -vf crop=w:h:x:y`).

## 2. The beat table

Write one per cell before any code:

| t (s) | on screen | motion | notes |
|---|---|---|---|
| 0.00–0.30 | phone, pack inside | phone lifts 46 px, outCubic | "1 pack left" pill |
| 0.18–0.95 | phone | tips back 62° + drops off-frame, inCubic | perspective from top |
| 0.85–1.39 | pack | rotY 0→90° (edge-on at 1.39), inCubic | windup |
| 1.39 | — | burst: rays + prizes scale from centre, outExpo 0.6 s | tear-off at 1.50 |
| 3.067 | cut | → MEGAPOT scene | hard cut |

Keep sizes and positions in cell pixels, read off a full-res frame
(`ffmpeg -ss T -i ref.mp4 -vf crop=... -frames:v 1 f.png`).

## 3. Reading curves from bursts

`study.py ref.mp4 --grid 2x2 --burst tl 1.25 1.95 --fps 20` writes one strip: frame k is at
`start + k/20` s. Find the frames where a state is *reached* (edge-on, fully open, settled)
and use them as `seg()` endpoints. Then read the spacing between them:

- big early steps that shrink → **ease-out** (`outCubic`, or `outExpo` for "snap then settle")
- small steps that grow → **ease-in** (drops, exits, pulls into a target)
- overshoot then return → **outBack** (pop-ins, per-glyph flips)
- even steps → linear (rotating rays, drifting particles)

Two-stage motions are common. The pack spin was a slow `inCubic` windup to edge-on, then
a fast `outQuad` whip through 270° to face front. Model them as two windows joined at the
measured frame, not one curve.

## 4. Counters and changing numbers

Grab a 60 fps burst over the count and list the displayed values. The example's net-worth
counter showed a new value about every 0.125 s, with each digit rolling for ~0.1 s and
resting in between. That's "number flow", reproduced by `Odo.flow(f, t, dt, dur)`. Write the
value curve `f(t)` from the first, last and midpoint values; `inOutSine` or `outCubic` fit
most UI counts. Note leading-digit growth (a comma appearing as it passes 999). `Odo` fades
new places in.

## 5. Colour and type

- Colour: sample flat regions from a full-res still. A gradient needs 2–3 samples along its
  axis. Background washes are often radial gradients with a warm or tinted edge.
- Type: identify the family by eye (geometric sans, grotesk, condensed, slab) and pick the
  closest Google Font. Measure cap height or digit height in pixels and back out the
  `font-size`. Record which fonts are substitutes so you can tell the user.
- 3D type (puffy digits): note face vs side colour. The sides are darker, and that
  difference is most of the "3D" read.

## 6. What to hand back to yourself

Keep `study/summary.json` and the beat tables next to the page. When a comparison shows
drift, the fix is almost always a `seg()` window that disagrees with the table. Check
the table first.
