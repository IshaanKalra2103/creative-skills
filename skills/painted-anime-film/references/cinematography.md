# Cinematography

The frame is 1776 × 960 (1.85:1) at 24 fps. Each shot is one file that pushes `{name, dur, base, cam(lt), build(), draw(g, lt)}` onto `SHOTS`. Its time `lt` runs from 0 to `dur`.

## Shot vocabulary and lengths

| Shot | Use | Lens (vertical fov) | Typical length |
|---|---|---|---|
| Establishing wide | the world before anything happens; opens on a fade (`fadeIn: 2.2`) | 34–40 | 6–8 s |
| Wide / full | a body in its place, scale | 30–38 | 4–8 s |
| Medium (MS) | the action of the body | 26–32 | 4–6 s |
| Close-up (CU) | the face, eyes, an expression change | 18–26 | 3–5 s |
| Insert | the small thing that matters (a flower, a lamp, a hand) | 16–24 | 2.5–5 s |
| Low angle | mass, awe, a rise | 32–42, camera near the ground | 4–9 s |
| High / top-down | geography, a wave crossing the land | 30–40 | 3–5 s |
| Over the shoulder (OTS) | what the subject regards | 26–34 | 3–5 s |
| Sky / aerial | release, freedom | 34–40, may roll | 3–5 s |
| Coda | the changed world, held long; ends on `fadeOut: 3` | as wide as the opening | 5–7 s |

A 50–75 s film has 10–16 shots. Shot lengths shrink toward the climax (2.5–4 s each), then the coda is held long. Never make every shot the same length.

## Camera

- **Moves are slow and whole-shot:** a push or pull of 5–15% of the camera distance over the full `dur`, eased with `easeInOut(lt / dur)`. Hold the camera still for small, quiet beats. Don't move it in every shot.
- **The camera moves on ones while drawings change on twos.** This is what keeps the pictures from feeling like puppets: the frame glides, the cel holds.
- **Shake is on ones and decays:** `shake(lt, t0, ampPx, dur)` from `layer.js`, applied as `dx/dy` on the plates and the cel. Use it only for impacts (6–20 px).
- **Roll** is for one or two big moments at most (launch, a tilt into the sky).
- Build every shot's camera with a `base` (`sh.base`), which is where the plates were painted, and `cam(lt)`, which is where it is now. Plates are re-projected each frame by `drawPlate`, so parallax comes from depth and not from hand-sliding layers.
- **`fitCam(C, fov, [[worldPt, [sx, sy]], ...])`** finds the target that puts world points at screen positions. Compose by naming where things should land (eyes on the upper third line, the horizon at 0.62 H), not by guessing targets.

## Multiplane plates

- A plate is `new Plate(PW, PH, depth, -BM, -BM)`, with `PW = W + 2*BM` and `BM = 110`. The margin lets the camera push without showing edges. For long pans, make the plate wider.
- Rough depths: sky 3000+, far hills 300–600, mid ground 60–200, the subject's ground 30–60, near foliage 10–30.
- Mist and cloud plates may drift on their own (`dx: lt * 6`). That is the only independent layer motion allowed. Everything else moves only because the camera moves.
- Draw order is back to front: `haze`, then distant ranks, mist, mid, ground, then the cel layer, then low mist, shafts (`comp: 'screen'`), near and fg.

## Continuity

- Keep screen direction: if the subject travels left to right, it does so in every shot of that journey.
- Respect the 180° line in a dialogue of looks, between subject and object.
- The key light comes from the same screen side across a sequence. Change it only on a story beat, such as dawn arriving.
- Cut on action (the start of a rise, a turn of the head) or on a look (the subject looks, then cut to what it sees).
- Match cuts help in a short film: a round lamp to a round sun, a falling drop to a rising mote.

## Composition notes

- One subject per frame. Empty space goes on the side the subject faces.
- Frame the subject with darker near shapes (trunks, eaves, grass) so the light reads as deep.
- Put the horizon on the thirds (0.33 H or 0.62 H), never at the centre, except in a deliberate symmetrical shot.
- Low angles with a big foreground make things massive. A high angle with a small subject makes it vulnerable.
- Give every establishing wide something alive but quiet: mist moving, grass on twos, one bird.
