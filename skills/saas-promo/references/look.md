# The look and the motion, measured

Everything here was measured frame by frame on the reference promo (bolt.new, 1280x720,
25 fps, 27.7 s) and lives in the engine as defaults. Times are seconds at `pace = 1`.

## What makes it read as "this style"

1. **One screen-gradient world.** Every type scene sits on the same deep gradient: navy
   at the top, a curved lit sheet sweeping up the left (white core → cyan → periwinkle), a
   soft glow along its edge, seen through a monitor's dot screen. The framing changes a
   little per scene (presets), the world never changes. UI scenes float on it too.
2. **Words are glass first, then type.** Every word arrives blurred and see-through (a
   lavender body, a bright edge ring, a specular glint top-left) and becomes solid white
   with a soft halo within about 0.3 s. Nothing fades in flat.
3. **The camera is always settling.** Caption groups start rolled ~1.9°, yawed 12–16° and
   scaled 1.15–1.26×, and ease to flat and 1.0× over ~0.7 s; then a slow drift. Windows
   rise and swing in; the card wall dollies in and out. No static holds longer than ~0.5 s.
4. **Highlights pop, they don't fade.** Highlight boxes grow out from their centre in
   ~0.1 s, start as a bright flash (cyan-white at ~0.8 alpha) and settle to a 30 %
   tint behind the words. One or two highlight runs per caption, on the payoff words.
5. **Cuts are blurs.** Scenes leave by blurring out fast (0.08–0.2 s) or by drifting up
   and accelerating, and the next scene's first element arrives blurred. No crossfades.
6. **UI is real-looking and readable for a beat.** Windows are crisp screenshots (HTML
   rendered at 2x) with layers that build in order; the camera pushes in on the part that
   matters (the prompt text, the button) and pulls back.

## Type

| | value |
|---|---|
| face | Inter Display (opsz 32), weight 400, drawn at ~0.9–0.96 of the size its word widths imply and tracked out to keep each word's advance (the reference type is lighter and more open than Inter) |
| caption size | 80–97 px in 1280x720 (two lines), leading ~1.3 em |
| word gap | 18–32 px, wider than a space |
| colour | white, halo `glow = 0.35` (blur 5 px) |
| highlight box | top at baseline − 1.0 em, height 1.3 em, 13–16 px padding past the run, radius 6 |

## Word entrance (`kit::arrive`)

| beat | time |
|---|---|
| word-to-word stagger | 0.06–0.08 s (line 2 starts ~0.08 s after line 1's last word) |
| fade in | 0.06 s |
| blur | 12 px → 0 over 0.28 s, ease-out (line 2 starts sharper: ~3 px) |
| glass → solid | from 0.04 s over 0.24 s; highlighted words go solid almost at once |
| rise | line 1: 10–14 px, line 2: 21–34 px, exponential settle (k ≈ 0.33–0.45 per frame) |
| highlight box | pops with its first word (or ~0.04 s before), grows 45 % → 100 % width in 0.1 s, flash fades over 0.12 s |

## Caption camera

| shot | start scale | settle | yaw | exit |
|---|---|---|---|---|
| Having | 1.26 | 1.0 at +1.1 s | 12° → 0 by +0.7 s | drift up 36 px, accelerating, over the last 0.2 s |
| Turn | ~1.2 | ~1.0 at +1 s | small | drift up |
| Win | ~1.15 | ~1.0 | none | blur 16 px over the last 0.08 s |
| New | 1.15 | 1.0 at +1.04 s, then shrinks to 0.74 over the last 0.6 s | none | blur |

## UI beats

- **Pill → window** (title → window): a frosted pill rises from the bottom while an
  arrow-dot halftone ring sweeps out from the centre (0.4 s); the title flies to the top
  and turns into an outlined glass line; the pill grows into the window (0.5 s); layers
  build: sidebar/hero/nav, headline line 1, line 2 (+0.08 s), subtitle, icon tiles one by
  one, footer row; then a slow drift; zoom-blur out in the last 0.16 s.
- **Prompt**: a white blob blurs into the prompt box (0.3 s); camera pushes in until the
  box fills the lower frame (~0.5 s); typing ~32 characters per second with a blinking
  caret, new characters fading in from a pale blue-grey; the camera pans with the caret;
  pull back to the whole box (~0.4 s); the cursor comes in from the bottom right and
  clicks send (press 0.08 s, flash); blur out.
- **Screen**: the app window swings in from blur in perspective (0.3 s), the camera
  pushes in, the content scrolls down (~1.6 s) and back up (~1.2 s), slow drift, blur out.
- **Wall**: cards at three depths with depth of field (blur grows with distance from the
  focus; far cards hazed and dimmed); focus pulls in from all-blurred over 0.16 s; the
  camera dollies in then out; the centre card swaps through slanted colour bands
  (~40 % of the card per frame); a focus ring; a button appears, the cursor clicks
  (press to ~0.78 width), the label flips and a colour fill sweeps across; letterbox closes.
- **End**: the logo writes on path by path (~0.3 s), the tagline arrives as glass words,
  then the pill flashes in; hold; tagline and pill blur away (0.16 s); the logo drops to
  centre and grows ~1.6× over ~1 s.

## Pacing

27.7 s, 11 scenes, a cut every ~2.5 s, type and UI alternating:
title → window → tiles → caption ×3 → prompt → screen → caption → wall → end.
Captions hold 1.3–1.8 s, UI scenes 2–4 s, the end card ~5 s. Use `beats` to put scene starts on
the music's beats; the title, the main reveal and the logo want the strongest hits (`drops`
from `tools/beats.py`).

## The backdrop shader

`src/shaders/Bg.sksl`: a curved edge `y = b0 + b1 x + b2 x² + b3 x³` splits the deep top
(navy gradient from the top edge, a dark blob) from the lit sheet below, whose colour
ramps white → cyan → periwinkle with distance from a light near the bottom left; a glow
band runs along the edge; a 4.45 px dot lattice multiplies everything (`dots`). 17
geometry numbers per framing (`kit::BgFit`), six colours from the palette.

**Fitting the backdrop** to another reference: `tools/bgfit/fit.py ref.mp4 --at 4.2
--mask x0,y0,x1,y1` fits the geometry (and with `--colours`, a palette) to a frame by least
squares on a NumPy twin of the shader (`tools/bgfit/model.py`), with text and UI masked out.
Fit frames where the gradient is visible: frames mostly covered by windows or cards make
the fit invent blobs, so frame those scenes with a neighbouring preset instead.
