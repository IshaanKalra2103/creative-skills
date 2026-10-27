# Structure

A sports product ad is an energy curve on a beat grid. Plan in beats of the track
(`music.md`): with `bpm` set to its tempo and `in` on one of its beats, every cut lands on
the music. Without a track yet, `score.py` synthesizes one on the same grid for the animatic.

At 120 bpm and 30 fps a beat is 15 frames (0.5 s), a bar of four beats is 2 s, and a 15 s ad
is 30 beats. At 140 bpm a beat is 12.86 frames and 15 s is 35 beats; 100 bpm is 18 frames.

## The curve

| part | job | shots | holds | music (`score.parts`) |
|---|---|---|---|---|
| open | the product's first read; set the world | macro push-in, product in the dark | 3-4 beats | `intro`: pad, a heartbeat kick, the ambience |
| build | speed and skill | tracking, leading, ground level, handheld | 1-4 beats, getting shorter | `build`: kick on every beat, hats, a riser, a snare roll into the gap |
| gap | the inhale before the hit | static or a ramp down, the wind-up | 1 beat | `gap`: everything out but a reverse swell and the ambience |
| peak | the hero moment | the strike, dunk, finish; ramp to slow motion, a hit on contact | 3-5 beats | `drop` on the contact frame: the full groove and an impact |
| payoff | the result | the net, the crowd, the reaction | 2-3 beats | `drop` continues |
| outro | the athlete or the product holds | walking away, pull-out | 3-4 beats | `outro`: the pad and a sub drop |
| packshot | the product alone | studio packshot | 3-4 beats | `outro` |
| end card | the name, the line, the logo | type on black | 2-3 beats | an impact on the card, then `silence` |

## Beat maps

15 s, 140 bpm (35 beats), 4:5. The worked example, cut to a Suno track whose bass drops out
for the bar before its drop:

| shot | beats | part |
|---|---|---|
| A macro push-in | 0-4 | open |
| B tracking shot | 4-8 | build |
| C cut inside, ramp | 8-12 | build |
| D strike: wind-up through the bar without bass (12-16), contact on the drop at beat 16, slow motion | 12-19 | gap, peak |
| E through the net (match cut) | 19-22 | payoff |
| F walking away | 22-26 | outro |
| G packshot | 26-31 | packshot |
| end card: the track stops dead on an impact | 31-35 | end |

6 s bumper (12 beats): macro (2), action with a ramp and a hit (4), packshot (3), end card (3).

30 s (60 beats): open 4, build 16 (6-8 shots, holds shrinking from 4 beats to 1), gap 1,
peak 5, payoff 4, a second smaller build 12 (or a montage of quick cuts on every beat), outro
6, packshot 6, end card 6.

## Rules of thumb

- The product is on screen, recognisable, for at least half the ad.
- Holds get shorter through the build and longest on the peak and the packshot.
- One peak. Two hero moments compete; make the second smaller.
- Alternate shot sizes in the build (macro, wide, close, medium), and keep screen direction.
- The first second decides if people keep watching: open on texture, light and motion, not on
  a logo.
- Type is short (2-4 words), on beats, and mostly at the end. Use the brand's line only if it
  is real and public; otherwise write an original one and say it is spec.
