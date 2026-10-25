# Case study: adidas x NBA spec spot

A 15.6 s, 4:5 spec spot for the adidas x NBA official game ball, made in the look and editing
of Ali Zeyada's Behance case study for the same product. Spec work: not commissioned, not
published. The shot list, poses, stills, layouts and lockup are ours; the soundtrack in the
final cut is the reference's, so the cut is for study only. `examples/adidas-nba/spot.json`
is the final cut expressed in this skill's format; rebuilt through the generic tools it
matches the original build at a median PSNR of 49.6 dB.

## How it was made

1. Studied the reference: cuts and holds (`study.py`), the track's onsets and breakdowns
   (`hits.py`), contact sheets of the snap sections frame by frame.
2. Stills with the `image` skill: a backlit silhouette player in two poses, a low-angle hoop,
   a view straight up through the net, a chrome ball rack. One shared look block; a photo of
   the ball as the look reference for the product shots.
3. Video in Vizard on the Flash tier: the player shots (project 120582, 99 credits), the hoop
   shots (120603, 182 credits), the rack (120678, 260 credits). 541 credits in all.
4. Two shots stayed as Blender renders: the hero ball turning, and an 8-frame macro of the
   ball used in the collage (`render` shots and sources in the spot).
5. Plates, snap cuts with Jev boxes, assembly, the fframes comp, Jev QA.

## What went wrong and how it was fixed

| problem | why | fix | measured |
|---|---|---|---|
| The player and hoop shots read as stills. | They were stills with a push and a roll. | Made 5 s clips from the stills in Vizard; `plates.py` plays them at `step` 1.5-2. | |
| The cut was timed to our own SFX mix. | The user wanted it on the reference's track. | Cut on the track's onsets: main cuts on strong hits and on the bass coming back after breakdowns and dips. | |
| The snap sections had a shot clock counting down instead of the reference's snap cuts. | A "basketball" idea replaced the reference's actual device. The user: the original had snap cuts with frames, not a timer. | Dropped the clock. Built `snaps.py`: cards on the gradient, smears, black frames, outline boxes, 2-8 frame holds on the hits. | Collage device match 0.48 to 1.23; countdown on our frames 0.88 to 0.08 (reference 0.04). |
| The opener was a plain player shot. | Same mistake: the reference opens with snap cuts over the player. | Snap beats over the player clips for frames 0-46. | Opener device match 0.86 to 1.28; `framed` 0.05 to 0.60 (reference 0.42). |
| The ball rain looked CG. | Procedural Blender balls on the gradient. | A photoreal still of a ball rack, a Vizard truck along it with the top ball rolling at the camera. | Realism 0.35 to 0.99 (reference 1.07); look match 0.66 to 1.02. |
| Ball boxes stayed behind while the ball moved. | A box was found on a beat's first frame and held. | `"track": true` on every beat where the ball moves; `trail` for the reference's double boxes. | |
| A box on the frame-filling hero ball ran off the edges. | Padding on a box the size of the frame. | No box on that beat. | |
| The rack clip ran out of frames. | It came back at 24 fps and 121 frames, the others at 30 fps and 150. | Per-source frame counts, indices clamped to the last frame. | |
| Some opener boxes were stale after beats changed. | Old renders were left in place. | Re-render the beat range; the box cache is keyed by frame content, so new frames get new boxes. | |
| A QA question measured nothing. | "Is anything malformed?" scored the same on the reference as on ours. | Dropped it; kept questions the reference answers differently. | |

## What carried over to the skill

- The reference's device beats an invented one. Study it frame by frame before designing.
- Generate anything that must look real as video from a photoreal still.
- Moving subjects get tracking boxes; Jev answers are cached so rebuilds are free.
- QA against the reference as a control, section by section, before and after each change.
- Confirm credit spends; Flash was enough for every shot in this spot.
