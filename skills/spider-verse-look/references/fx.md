# FX: powers, glitches, speed and lettering

Rule zero: **the screen-print pass and the line-work pass sit on top of every effect.** Powers were judged on whether they worked "with the screen print technique that is one of the defining visuals of the movie" (Christian Hejnal, VFX producer, PDF 182). Simulated explosions "looked dead", so 2D artists hand-drew explosion cycles and the FX were rebuilt from the drawings (video 07:35).

## Focus (depth of field)

Out-of-focus planes are **misregistered, never blurred**: shift the red plate one way and the blue plate the other, by an amount that grows with the plane's distance from focus (in dioptres, |1/d − 1/focus|). "Like a comic that came off the press slightly wrong" (video 06:55). Defocused lights double into red/yellow ghosts (PDF 142). Bokeh are hard flat discs (PDF 063) or concentric rings (PDF 169), never soft blobs.

## Speed: no motion blur

- Characters on twos; **multiple imagery as in-betweens**: 2–3 crisp copies of a fast limb or head along its path (100% → 60% → 35%) plus a few straight speed strokes (Persichetti, PDF 196–199).
- **Movement tunnels:** the background becomes a pixel mosaic (cells ~1.5–2% of frame width in the local palette) crossed by 20–60 parallel streak bars at the travel angle, each a bright white/cyan core with a short glow (Gordon, PDF 196). Toward a vanishing point, use radial streak wedges (Chan, PDF 200). Snowflakes become short crisp dashes along the motion.
- Smears and stretched geometry do the job of blur (video 06:40). Horizontal dry-brush streaks behind a runner (Joey Chou, PDF 122). A whip-pan is a panel of pure horizontal streaks (PDF 163).
- Motion paths: multiple exposure along a dashed arc, sometimes numbered 1–2–3–4 (PDF 075, 162). The Prowler's boots leave a thin glowing magenta trail (PDF 145).

## Spider-sense

- **Duotone**: collapse the frame to one or two flat inks (yellow #e0c410 / ochre #735320, or salmon #f88257 / teal #4d6469). Force the threat into the dark ink. Dense manga focus lines fill the outer 8–12% of the frame and point inward (Dean Gordon, PDF 084–085).
- Marks: wavy vertical ticks above the head (PDF 039), or 2–3 short stacked zigzags in orange-red #ff5040 beside the head (PDF 183). The background can split into hot pink #ee3c79 and deep blue #211c71 with a sprayed seam.
- A panel strip that pushes in on the face over 5 tall panels, the last breaking out of its border (PDF 039).

## Venom Strike

"Inspired by a 2D anime style… it looks like a sharp lightning effect" (Hejnal, PDF 182). Branching jagged bolts that **follow the silhouette and limb axes**, each stroked three times: a wide cyan glow (#8ad0ff), a mid blue, a 1–2 px white core. On impact, a radial starburst of 10–20 long white spikes with a blue halo. The struck head shows overlapping copies plus white horizontal streaks (PDF 194).

## Invisibility

Modelled on cuttlefish camouflage, then made view-independent (Hejnal, PDF 182). **Drop the character's colour fill, show the background through the silhouette, and keep the line-work and a fine dot screen on top** (in white or pale cyan on dark backgrounds), with a 1–2 px light fringe. Composite in screen space so it works from any angle (Gordon, PDF 182).

## Glitch (people from other dimensions)

- "Using the multiple cameras that mirror the multiple universes. They are all shot on the same character and same animation, but are treated differently, creating this cubist, fragmented look" (Hejnal, PDF 182).
- In code: render the same subject through 3–7 "cameras" (angle, scale), each with a different render script (posterise to 3 levels, threshold B/W, flat vector, white wireframe edges, thermal remap, duotone), and composite into hard-edged triangle and quad shards at 40–60% opacity. Resolve by converging the shards to one view.
- **Datamosh variant** (Ruppel, PDF 111): slice objects into horizontal bars, shift some bands sideways as hard blocks, drag pixels into long streaks of the object's own colour. No RGB split needed. New random bands every drawing (on twos).
- Accents: acid green #48a020 and magenta #c040a0 shards; tiling/stutter repeats; rotated 45° tiles; red/cyan doubled fringes (~0.3% of frame).

## Dimensional quakes and the multiverse pile-up

On a calm, neutral plate (overcast #e7e9de, tan brick) so the contrast sells it (Kassai over Ruppel, PDF 184–185):
- a vertical plume of square pixel blocks (indigo #3a2a8a, violet #5a3aa0, red flecks), sparser with height, with a pale cyan-white bloom at the base;
- neighbouring buildings smeared in row-shifted horizontal strips;
- **the same prop from every universe fused into one tower**: hydrants in red, yellow, blue and purple, cones, bus-lane signs, traffic lights, phone booths, their edges dissolving into blocks.

## The portal and the cubist multiverse

- "Cubism… represents multiple views of a scene within a single picture frame. So in our version, space is fractured, and within each fracture we see a different angle, scale, and rendering, of the same place" (Gordon, PDF 187).
- Seven cameras, each rendered in a different style, smashed into one spot (Persichetti, PDF 188). "We have taken perspective, unfolded it and laid it out on the big screen." It couldn't be a tunnel or anything from *Doctor Strange*.
- Portal burst (PDF 188): wedge rays from a vanishing point at bottom centre, alternating flat colour and halftone-dot rays, in coral #f68abd, peach #fdb178, yellow #e7b630, violet #76479e, sage #80a975, sky blue; white loopy scribbles; spray splatter. **High-key and joyful, never a dark tunnel.**
- Portal interior (PDF 190): mint/celadon base #d8eee0, the tumbling figure repeated at several scales in translucent shards, blobs drawn three times (magenta up-left, violet down-right), a ceiling of black ink blobs slashed with white scratches.

## Collider firing (15-frame sequence, PDF 087)

A fixed black foreground matte (Kingpin) while the window beam goes: pastel beam band → radial hairline "fireworks" → black particle cluster and red/magenta → full-spectrum scribbles → whiteout posterised into torn flat patches, with an RGB-split rim on the matte edge. **Energy = radial scribbles + posterisation + channel fringing, never volumetric glow.**

## Glows and lights

- Halftone glow: a flat bright disc plus a dot grid whose dot radius = maxR·(1 − d/R)^1.5 (Doc Ock belt, PDF 115; Scorpion joints, PDF 165).
- Ceiling lights as flat outline octagons (Alchemax) or three stepped concentric ellipses (Kingpin's hall).
- Police lights as concentric ring bokeh (#f0bcdb → #e04070) (PDF 169). Camera flashes as 4-point stars with cyan and pink spikes, lasting 2–4 frames (PDF 095).
- Flashlight beams as additive white wedges at ~40% alpha fading to nothing (PDF 193).

## Webs

A thin, wobbly, hand-drawn white line that loops into spiral lassos around the wrist or ankle (endpapers PDF 206–209). A net of thin white radial lines for a web trap (PDF 116). In the hideout, straight 1 px strands cross the void as architecture (PDF 126).

## Lettering and SFX

- Laid into the world along a beam, breaking panel borders, with ink splatter around (the "BOOOM" along the collider pipe, PDF 088).
- Variants: lime fill + black outline + pink offset shadow; halftone-filled pink letters with a dark-blue offset in a white starburst ("ZAP"); thin neon-tube glyphs ("WHAM") (PDF 089).
- Caption boxes: "JUST THEN" (black rounded rect, white small caps), "TO BE CONTINUED…" (white box, thin black border) (PDF 088). Yellow speech balloons with hand lettering (PDF 074, 198).
- Selective colour in action beats: villains and sets in grey, heroes and SFX in full red/blue (Iglesias, PDF 160).
