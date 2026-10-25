# The look, measured

Numbers come from the example's reference (a 15.6 s, 30 fps, 4:5 ball spot; see
`case-study.md`) and from the comp, which reproduces it. Layout values are in design px at
1080 wide; the comp scales them by `U = width / 1080`.

## Structure of the reference

`study.py` found these cuts (k = 3.5): 0, 6, 8, 10, 12, 14, 16, 21, 23, 26, 29, 31, 33, 35,
37, 39, 42, 45, 47, 129, 155, 181, 250, 252, 292, 294, 304, 309, 313, 316, 318, 374, 404, 427.

| section | frames | holds | what is on screen |
|---|---|---|---|
| opener | 0-47 | 2-6 frames, mostly 2-3 | Snap cuts over the player: full frames, inset cards, thin boxes on the ball (two offset boxes trailing it at 6-10), a black frame at 14, smears at 23-26 and 42-45. |
| hero | 47-129 | 82 | The product turning on the backdrop, lens kick on the cut. |
| video run | 129-250 | 26, 26, 69 | Photoreal shots of the setting (hoop, net, rack), each moving: push, roll or truck. |
| roll | 250-318 | 2-10 | A second snap section; framed cards on the gradient at 304-313; holds shorten into the tagline. |
| tagline | 318-374 | 56 | Two lines slam in on hits. |
| end | 374-468 | 30, 23, 41 | Logo flashes on hits, then the lockup, fade to black. |

`study.py` misses cuts inside snap runs where consecutive frames are similar (a card over a
card); step through those with `sheet.py`.

## Soundtrack

`hits.py` on the reference: about 110 BPM, so a beat is about 16.4 frames. No sub bass at
72-94, 110-120, 242-251 and 361-392; quiet dips at 8-13, 149-154 and 430-435; fades from 429,
silent after 438. Strongest onsets (strength 0-1): 2 (0.66), 288 (0.71), 427 (0.57),
116 (0.53), 206 (0.50), 181 (0.50), 124 (0.44), 247 (0.45), 198 (0.45), 255 (0.44).

The example's main cuts: 47, 99 (bass back after the 72-94 breakdown), 123 (the drop), 156
(after the 149-154 dip), 205, 238, 254 (bass back after 242-251), then the roll every 4
frames from 291 to 324, the tagline at 328 and 344, logo hits at 393, 401, 409.

## Colour

- Backdrop: a horizontal gradient, left to right: `#000528` 0, `#001154` 0.25, `#02288b` 0.5,
  `#2f5adb` 0.75, `#889dfa` 1. Cards, whips, the tagline and the end card all sit on it.
- Plate grade (an SVG component transfer): R gamma amplitude 1.05, exponent 1.16, offset
  -0.006; G 1.05, 1.13, -0.006; B 1.03, 1.02, 0. Blacks crush, shadows keep their blue.
- Film grain overlay strength 0.14, grain size 1.5. Vignette radius 0.62, falloff 0.6,
  intensity 0.45.
- Subjects: near-black silhouettes or low-key products with one hard cool-white rim light
  from behind and a faint blue edge from the left; the product keeps one warm highlight.

## Snap devices

- Box: white at alpha 190/255, 2 px, padded by 8% of the box's longer side. A trail redraws
  the previous n positions at alpha 190 x i/(n+1), oldest faintest.
- Frame: the same white line, no padding, a fixed rectangle (the example uses about 580 x 750
  centred a little above the middle).
- Card: the picture cover-cropped into a rectangle centred at x 540, y 620-660; widths
  420-860 px. Smaller cards read as detail, larger ones as the main beat.
- Smear: a 181 px horizontal box blur of the frame, often darkened to 0.7-0.8.
- Black: one or two frames of pure black on a hit.

## Motion in the comp

- Lens kick: chromatic aberration 0.035 at angle 0.3 on a main cut, falling to 0 over 4 frames.
- Whip: over 3 frames the plate slides 360 px sideways on the backdrop under a 70 px
  horizontal Gaussian blur.
- Flash: white at 0.6, 1.0, 0.4 over the three frames around the cut into the tagline.
- Video segments: `step` 1.5-2 (slightly fast), zoom +4-15% over the shot, roll up to 8
  degrees on a looking-up shot.

## Type

- HUD: IBM Plex Mono Medium. Mark at (56, 56); title 17 px, tracking 3, at y 80, 90%; subtitle
  13 px, tracking 2.5, at y 116, 55%; a hairline at H-88, 35%; footer and counter 14 px,
  tracking 2.5, at H-56, 75%; 56 px margins. Fades in over 8 frames from frame 6 and stays two
  frames into the tagline, under the flash.
- Tagline: Barlow Condensed ExtraBold Italic 212 px, tracking -2, two lines 220 px apart
  centred 45 px below the middle. Each line slams in from 135% over 5 frames with a shake of
  up to 9 px that dies in 6 frames; the block pushes in 3.5% over the shot. An outline line
  (3 px stroke) fills over 10 frames from `outline_until`.
- End: logos flash full size for 8 frames each with a 4% push. The mark lands from 114% over
  6 frames, lifts 110 px from frame 14 over 12; the logo row (hairline dividers, 31.5 px gaps)
  fades up at +182 px from frame 20; a 480 px hairline grows at +325 from frame 28; the tag
  (mono 17 px, tracking 7) at +371 from frame 32. Fade to black over the last 12 frames.
