# QA with Jev

`qa.py` asks Jev (TypeSafe's System One model) typed questions about each shot: the still
before any video is made, and the render's frames after (`--video`). A Noul is the probability
of yes (0-1); a Score is a position between ordered levels (0-2 here).

| column | type | question |
|---|---|---|
| `present` | Noul | Does the frame show the kind of product in the product photos? |
| `product` | Score | How faithful is it: 0 a different product or colourway, 1 the same kind and colours with details off, 2 the same model in every visible detail |
| `real` | Score | 0 obviously CG, 1 convincing with tells, 2 a high-end photograph |
| `form` | Score | For shots with `qa.movement`: 0 wrong or impossible, 1 a coach would correct it, 2 textbook |
| `anatomy` | Noul | Is a body malformed? |
| your questions | Noul | from `qa.questions` (all shots) and each shot's `qa.questions` |

## Use real photos as the control

Pass a few real photos of the movement with `--control`. They get the same questions, and
the flag levels for `real` and `anatomy` come from them. A question that scores real photos
the same as ours measures nothing.

On the example, against four real photos of strikes, dribbles and cuts:

| question | ours (7 stills) | real photos | verdict |
|---|---|---|---|
| `product` (when present) | 1.16-1.64 | 0.19-0.27 (other boots) | separates well |
| `present` | 0.87-0.94; the net shot 0.06 | 0.10-0.58 | works |
| `real` | 1.04-1.56 | 0.89-1.27 | ours are on par |
| `face` | 0.02-0.06 | 0.31-0.97 | works |
| `stray_text` | 0.16-0.73 | 0.82-0.96 (sponsors, numbers) | works; the boot's own wordmark lifts it |
| `anatomy` | 0.07-0.74 | 0.30-0.93 | measures nothing: real photos score as malformed as ours |
| `form` | 0.84-1.02 after the fix | | caught the sole drag (0.70) that should have been a cut inside |

Identical inputs vary by about 0.1-0.2 between runs. Compare versions, look at the min and
max, and treat a single number near a threshold as a coin toss. Check anatomy with your own
eyes at full size; that's where AI stills fail most.
