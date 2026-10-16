# The look, measured

Every number here was measured on the reference reel (a 27 s, 720x1280, 30 fps documentary short about Google's
origin, `examples/google-origin`), not eyeballed. Change them in a spec's `[look]` table; the defaults reproduce it.

## Time: on threes

- The picture changes only every **3rd frame**: 10 drawings per second at 30 fps. Measured by frame-to-frame luma
  difference (`signalstats` YDIF): 254 of 812 frames change, almost all of them on one phase of 3.
- **Every cut lands on that grid.** The engine counts in ticks of 0.1 s. Tick k starts at frame 3k-1, so tick 0 is
  two frames long. That matches the reference's phase, and frames in the regression line up 1:1.
- Shots get `tm.tick`, the tick inside the shot, and `tm.t = tick / 10`. Animate on those, never on the frame index.
  Things that move on ones look wrong next to everything else.
- The phase drifts between sections of the reference edit (0 early, 2 later). `scripts/study.py` measures the cadence
  from the gaps between changing frames for that reason, not from one global phase.

## Texture (one multiply layer + overlay grain, `src/shaders/look.sksl`)

| layer | measured | default |
|---|---|---|
| scanlines | horizontal, period **5.38 px** at 720 wide; ±~7.5% (row std 10.3 on grey 192). Multiply-like: white text gets stripes, black stays black | `scan = 0.16`, `scan_period = 5.38` |
| halftone screen | square grid rotated **30°**, period **6.0 px** (2D FFT peaks at 60.4° and -29.6°). Strong on photos and colour fields (FFT peak 220-360), almost absent on the flat grey cards (60) | `dots = 0.10`, `dot_period = 6.0`; per kind via `look()` |
| vignette | light on photos; none on the flat grey and paper cards (corner vs centre within 2%) | `vignette = 0.12`; 0 on flat cards |
| grain | very low: per-pixel row std 1.2 on grey. Strong grain is the first thing that makes a remake look wrong | `grain = 0.10` (overlay) |

Override per shot with `dots = 0.2` / `vignette = 0` in the `[[shot]]` table.

## Captions

- **Serif: Instrument Serif.** The ink-box width/height ratios match the reference within 2-7%: "1995" 1.90 vs 1.91,
  "Forever" 3.5 vs 3.9, "The Internet" 5.6 vs 5.9. EB Garamond, which looked right by eye, was 2.85 / 4.25 / 6.8.
  Measure ratios before trusting your eye.
- The reference's strokes read heavier: `kit::serif(.., bold, ..)` adds a hairline stroke in the text colour
  (0.2-1.6 ref px). Some captions are tracked wider (`serif_ls`, +0.02-0.035 em) or stretched (`scale(1.1 1)`).
- **White captions aren't white.** They peak at about 213, so use `#dad7d0`. `#f2efe8` measured 21% heavier ink.
- `cap` filter: a soft dark halo (blur 2.6, alpha 0.75), a warm fringe +1.3 px right (`#ff8a3d`) and a cool fringe
  -1.3 px left (`#6fa8ff`), the reference's chromatic aberration, plus a faint bloom.
- `ink` filter (dark text on light): the same fringe, weaker and browner, plus a 0.45 blur. The reference prints
  look scanned.
- **Handwriting: Homemade Apple** for the note kind. 24 scripts were compared. Cedarville Cursive, the first guess, was
  clearly wrong on the S, p and d.
- UI text (search bars, websites): Roboto.

## Palette (measured means)

| ground | rgb | spec value |
|---|---|---|
| black card | 8, 8, 8 | `bg = "black"` |
| grey card | 192, 192, 192 after scanlines (paint about 214) | `bg = "grey"` |
| paper | 190, 180, 166 with dust specks | `bg = "paper"` |
| red field | 131, 8, 8 | `bg = "#820e0e"` |

## Motion vocabulary (what the shots do)

- **Typing**: one letter per tick, or an irregular per-tick list measured on the reference. The newest letter can
  arrive half-grown and soft.
- **Whip slide**: a photo enters one tick early, offset about 25% with horizontal blur, then settles into a slow push
  (1-6% over the shot).
- **Zoom-word**: small text slides in from the right edge for 2 ticks, then jumps to ~2x with a one-tick blur and
  decelerates into the centre.
- **Zoom-out reveal**: start on a 2x detail, then ease out to the full frame by about the 7th tick, with blur on the
  first 1-2 ticks.
- **Rising caption**: a big caption rises from below the frame and shrinks into place (scale 2.2 → 1.0).
- **Grid multiply**: one object centres, copies itself into a grid, and the camera pulls back until it is a dot field.
- Shots last **0.4-2 s**. Something changes every 1-3 ticks, and a hold rarely lasts more than 0.5 s.
