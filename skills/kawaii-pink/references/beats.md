# Beat sheet

Measured from the reference with `scripts/study.sh` (1080x1080, 30 fps, 165 frames), then
rebuilt in `template/src/lib.rs` and `mascot.rs`. Times are seconds.

## What the reference does

| t | beat | measured |
|---|---|---|
| 0.00-0.17 | a small stretched outline capsule high in frame, two tiny outline dots | ink ~600 px at 270 px scale |
| 0.17-0.55 | two or three fat filled smears whoosh in diagonally, decelerating | ink jumps 16x, bbox spans the frame |
| 0.50-0.70 | the smears snap into chubby filled stars, overshoot, hold | ink halves, three compact blobs |
| 0.70-0.95 | a thin outline capsule drops in | |
| 0.95-1.15 | one star smears into a streak that becomes the first letter's stroke | ink dips to its minimum (1.13 s) |
| 1.10-1.75 | the wordmark inflates letter by letter; outline stars pop around; the mascot pops on top | ink climbs steadily, bbox grows left to right |
| 1.75-2.95 | hold: lines boil on twos, stars twinkle, mascot blinks | frame diff alternates big/small every frame |
| 2.95-3.35 | mascot squashes, then opens its mouth wide | |
| 3.35-4.30 | the whole logo is pulled into the mouth: letters stretch into streaks toward it | ink and bbox shrink toward the mascot |
| 4.30-4.45 | gulp; the mascot is a flat ellipse | ink at its minimum |
| 4.45-4.90 | stretches into a tall capsule, small outline stars and dots pop around | |
| 4.90-5.50 | settles into the final pose, holds | |

Style: ink #ee17bc on #f0f0f0. The faint grey layer (#ebebeb) behind everything is the same
frame scaled about 3.1x around the centre. Measure it by matching one feature: the mascot at
(486, 432) in front sits at about (365, 203) in the echo, so s = (540 - 365) / (540 - 486) ≈ 3.2.
The outline is about 14 px at 1080. Audio is a steady bed at about -20 dB with hits at 0.1,
1.2, 2.9 and 4.3 s.

## Constants in the template

| constant | value | drives |
|---|---|---|
| `BIG_STARS[i].start / .land` | 0.15-0.22 / 0.50-0.56 | smear fly-in and snap; pops and the first whoosh |
| `pen_from .. DRAW_AT + 0.04` | 0.92-1.09 | the lower star smearing into the pen |
| `mascot::state` seed | 0.62-0.95 fall, 0.95 splat, 1.38 grow, 1.42 face | splat sound at 0.95 |
| `DRAW_AT`, `Word::stagger`, `LETTER_DRAW` | 1.05, min(0.09, 0.45/(n-1)), 0.32 | letter inflate, one bloop each |
| `LOGO_STARS[i].3` | DRAW_AT + 0.11-0.47 | outline star pops, quiet pops |
| blinks / glance | 2.08, 2.26 / 2.55-2.72 | inside `mascot::state` |
| `SLURP_AT` | 3.3 (anticipation starts 0.35 before) | slurp warp, wind lines, slurp sound |
| `GULP_AT` | 4.3 | mouth closes, cheeks puff, gulp sound |
| `HOP_AT`, `LAND_AT` | 4.40, 4.60 | hop arc, splat + boing + burst + sparkle |
| `LENGTH` | 5.5 | 165 frames |

Echo lag is 0.1 s (`ECHO_LAG`); the reference's echo looks the same and the lag makes it feel
looser. Boil seeds: `(frame.index / 2) % 3`.

## Sound cues

| file | at | gain (before +6 master) |
|---|---|---|
| bed.wav | 0 | -15, fade out 0.6 |
| whoosh.wav | 0.07, 0.86, HOP_AT-0.05 | -9, -14, -13 |
| pop.wav | each big star landing, each logo star pop | -10 / -18 |
| splat.wav | 0.95, LAND_AT | -11, -9 |
| bloop0-4.wav | each letter start (cycled) | -9, panned by x |
| sparkle.wav | word done, LAND_AT+0.06 | -17, -12 |
| slurp.wav | SLURP_AT | -7 |
| gulp.wav | GULP_AT | -7 |
| boing.wav | LAND_AT+0.03 | -9 |
