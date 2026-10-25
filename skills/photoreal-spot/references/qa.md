# QA with Jev

`qa.py` grabs the section frames listed in `spot.json` `qa.sections` from our cut and from
the reference and asks Jev (TypeSafe's System One model, `jev-latest`) two kinds of question.
Jev returns typed answers: a Noul is the probability of yes (0-1), a Score is a position
between ordered levels (0-2 here).

## Per frame (ours and the reference)

- `framed` (Noul): an inset card on a plain gradient, or thin white outline boxes. Small corner
  text does not count.
- `real` (Score): 0 obviously CG, 1 mostly convincing with tells, 2 a high-end product photo.
- anything in `qa.questions` (Noul), for example a device you removed and want to confirm is
  gone.

## Per section (ours against the reference)

- `device_match` (Score): 0 a different device, 1 partly the same, 2 the same device used the
  same way.
- `look_match` (Score): 0 clearly different, 1 similar palette but realism or lighting
  differs, 2 could be shots from the same film.

## Reading the numbers

- The reference is the control. A per-frame question only measures something if it separates
  ours from the reference where they differ. The example first had an `artifact` question
  ("is anything malformed?"); it scored 0.4-0.7 on the reference as much as on ours, so it
  was dropped.
- Compare means per section, and look at the min and max: one bad frame hides in a mean.
- Jev's image support is a preview. Treat it as a second opinion after your own look at the
  contact sheets, and use it to compare versions of the same spot rather than as an absolute
  grade.
- A low device score can be a choice. In the example the reference's middle section is a
  shower of balls; our first version rebuilt it in CG, which read as CG, and the user chose a
  photoreal rack shot instead. That section scores 0.28 on device and 1.02 on look, and its
  realism (0.89-1.08) matches the reference's (0.91-1.16).

## The example's numbers

Section scores, the rejected version (a shot clock counting down over the snap sections, a CG
ball rain) against the final cut (snap cuts, photoreal rack):

| section | device, clock cut | device, final | look, clock cut | look, final |
|---|---|---|---|---|
| opener | 0.86 | 1.28 | 1.23 | 1.33 |
| rack / rain | 0.12 | 0.28 | 0.66 | 1.02 |
| collage | 0.48 | 1.23 | 1.01 | 1.16 |

Per-frame means (min-max), ours against the reference:

| | clock cut | final | reference |
|---|---|---|---|
| opener `framed` | 0.05 | 0.60 (0.04-0.98) | 0.42 |
| collage `framed` | 0.18 | 0.56 (0.04-0.98) | 0.64 |
| rack `real` | 0.35 (0.27-0.41) | 0.99 (0.89-1.08) | 1.07 (0.91-1.16) |
| countdown, collage | 0.88 | 0.08 (max 0.12) | 0.04 |

Full reports: `examples/adidas-nba/qa.json` (final) and `qa_clock.json` (clock cut).
