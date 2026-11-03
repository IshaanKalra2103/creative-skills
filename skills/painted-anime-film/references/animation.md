# Animation

## Exposure

| Motion | Exposure | Helper |
|---|---|---|
| Character acting, slow body motion | twos (12 drawings/s) | `onTwos(lt)` for pose time, `drawSeed(lt)` for the boil |
| Fast action: launches, impacts, smears, shake | ones | raw `lt` |
| Ambient: grass, falling leaves, mist flicker | twos or threes | `onTwos(lt, 3)` |
| Camera | ones | raw `lt` in `cam(lt)` |

Time every pose function with the held time `tt = onTwos(lt)`, not `lt`. A smooth sine on ones looks like web animation. The same sine sampled on twos looks drawn.

## Key poses and holds

- Animate pose to pose: write 3–6 key poses per action and hold each for 6–24 frames. Between them, a short in-between on twos with `easeInOut`. Use `keyLerp(keys, frame)` from `layer.js` for this.
- A *moving hold* is a held pose that is redrawn (new seed) every 2–3 frames. That keeps a still character alive without bobbing. Never loop a sine on a resting character.
- **Anticipation:** before a big move, move the other way first (a crouch before a rise, a breath in before a release).
- **Overshoot and settle:** go about 5–10% past the target, then come back over 4–8 frames, then hold.
- **Overlap:** loose parts (hems, tails, vines, hair, wings) follow the body 2–4 frames late and settle after it stops.

## Weight

| Heavy | Light |
|---|---|
| slow in, abrupt stop | slow everything, soft stops |
| impacts: shake on ones, dust puffs, a thump | no impacts; drift, flutter |
| long anticipation | little anticipation, buoyant overshoot |
| debris falls away fast (gravity) | things lift and float (updraft) |

## Timing-sheet tables

Lights, flickers and anything that should stutter come from a keyframe table read per frame, with no interpolation. These are the same tables the sound mix uses, so light and sound stutter on the same frames.

```js
// [frame from event start, value] - a lamp catching: two failed sparks, then it holds
const LAMP_KEYS = [[0, 0], [5, .3], [6, .05], [8, 0], [14, .55], [15, .2], [17, .7], [19, 1]];
const lamp = keyAt(LAMP_KEYS, Math.floor((lt - 1.2) * FPS));
```

## Effects animation

These are drawn as shapes, not particle sprays:

- **Dust and smoke:** `drawPuff` makes lumpy shapes with a hard shadow side. Each puff grows on twos and thins out.
- **Leaves:** each is a drawing with 8 turn views (`fx.js`). They fall on twos with a sway.
- **Birds:** `drawFlockBird` silhouettes for distant flocks; `bird.js` is a 3D cel songbird for close ones.
- **Light:** `glowFx`, `drawBeam` and `drawGlint` (a four-point twinkle held 2–4 frames).
- **Wind:** `drawWindRing` as a drawn ring of speed lines and debris.
- **Shadow pouring off a body:** `coat` (the world height below which `coatCol` applies) is lowered on key poses. Strands and drips are drawn shapes timed to the hem.
- **A character coming apart:** raise `clipY` from the hem to above the head over about 1.8 s, with `clipN` set to about 0.9 for a ragged edge. Ride an emissive `coat` band (`coatEmit: 1`, warm colour) about 0.1 of the body height above the cut. Petals (drawings with 8 turn views) are born at the cut line on that frame and fly eased paths to targets in the world. The wick or crown goes last, as one small drawn flame. Do anticipation first: a dip, then the sleeves spread.
- **Colour arriving:** the two-state reveal (`engine.md`). The front is a thin warm band, never a wipe.

## Banned motion

- Constant bobbing or breathing loops.
- Layers sliding independently of the camera (except mist and clouds).
- Smooth easing on every move, which reads as software.
- Rigid rotation of a part about a pivot with nothing else changing (puppet).
- Noise-driven jitter on ones. The boil is per drawing.
- Boil on props. Stone, wood and buildings keep one drawing (a fixed `seed`) for the whole film; only characters, plants and effects boil.
