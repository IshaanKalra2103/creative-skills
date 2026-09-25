# Lessons: 30 Aevy Video School reels, studied frame by frame

Source: 30 reels from @aevyvideoschool (Instagram) and their transcripts, studied with `scripts/study-reels.sh`. Reel numbers below are the order they were studied in.
Method: I read every transcript, made 2-second contact sheets of every reel, looked at 4 fps frame bursts of the finished sequences (15 Beyblade, 16 Ukraine edit), and counted scene cuts with ffmpeg.

---

## 1. How their own reels are built (the format, not only the content)

What they do in their own videos matters as much as what they teach.

| Observation | Evidence |
|---|---|
| **The hook comes before the lesson.** They open with "क्या आप भी ऐसे करते हो? छी! गलत!" plus a big yellow/red "STOP GUESSING …" caption over the wrong version. | 01, 05, 07, 10, 19 |
| **Split screen: presenter on the bottom third, the visual on the top two-thirds.** The face keeps you watching and the top panel does the teaching. The layout almost never changes. | nearly all |
| **A new visual state every 1.5–3 s.** Cuts per reel (scene > 0.3): 2–25. The talky theory reels have fewer cuts, but the *graphic* inside them keeps changing through annotation arrows, sliders and overlays. | ffmpeg scene count |
| **Show wrong, then fix, then "now look at the difference".** Every lesson is a before/after. | 01, 03, 05, 10, 14, 16 |
| **They annotate constantly.** Hand-drawn arrows, yellow boxes, ✗ marks and one bold caption word ("GREY LIMBO", "MOIRÉ PATTERNS", "DARKEN MODES"). Captions are 1–3 words and never full sentences. | 02, 10, 16, 17 |
| **Word-by-word captions sit in the lower third.** One word can switch to italic serif for emphasis ("the *editor*", "*flow*"). | 08, 13 |
| **Same end card every time:** a follow-button animation or a "Comment ANIMATE" CTA in a heavy serif with yellow type. | all |

## 2. Layout and composition

- **A layout's job is to guide attention, not to fit things in** (01). Use the Gestalt principles:
  - *Proximity*: put related things together so they read as one group.
  - *Alignment / continuity*: line things up on one direction so the eye travels.
  - *Similarity*: the same shape, colour or style reads as the same group.
- Three fixes for a flat design (01):
  - Doesn't stand out → **exaggerate scale**.
  - Looks plain → **add relevant detail** (halftone, stamps, small print, barcodes).
  - Has no focal point → **add contrast**.
- **Rule of thirds** (09): the eye scans in a loose **F/Z pattern**, so off-centre beats dead centre.
  - Top-left is the **hero spot** (title, face, main subject).
  - Bottom-left holds supporting text and key details.
  - The rest takes credits and logos.
  - Once you've mastered the rule, break it on purpose.
- **Perspective** (07): figures of similar height should all cross the horizon line at the same body point.

## 3. Typography

- **Don't guess sizes. Use a ratio** (05). Pick a base size and multiply or divide by one ratio:

  | Ratio | Name | Feel |
  |---|---|---|
  | 1.618 | Golden | bold, dramatic, premium |
  | 1.414 | Silver | modern, geometric |
  | 1.333 | Perfect fourth | friendly, balanced |
  | 1.25 | Perfect fifth | soft, calm |
  | 1.2 | Minor third | subtle, editorial |

  A bigger ratio gives more contrast between heading and subhead.
- **Poster type they use:** very heavy condensed caps (Anton-like) stacked tight and cropped by the image. The subject overlaps the headline to create depth (01 "JO BOLTA HAI", 05 "DREAM").
- **Letterforms carry mood** (08): curved or rounded type feels playful, angular type feels premium and edgy.

## 4. Colour

- **Colour is relative** (03). The brain judges a colour by what surrounds it: the same swatch looks different on different backgrounds.
  - To make something "white" belong in a scene, paint the colour over the scene at low opacity and sample the result. Pure white looks pasted on.
- **Tint, tone and shade** (04): add white, grey or black to one hue.
  - Tints for highlights, tones for midtones, shades for shadows.
  - The result is a **monochromatic** scheme that still has depth.
- **Opposites cancel** (06, 14): red↔cyan, green↔magenta, blue↔yellow.
  - Mixing complements goes grey and muddy.
  - To correct a cast, add its opposite: too red → cyan, too green → magenta, too blue → yellow.
- **Gradients** (10): dark-to-light straight across goes through a "grey limbo". Work in **HSL** and keep the **hue fixed**. Use 4 stops, not 2:
  1. **Light source** (highest saturation and lightness).
  2. **Hold**.
  3. **Falloff**.
  4. **Anchor** (darkest).
- Background recipe from the Nikhil Kamath intro (11): deep blue base, soft blue light spots in the corners, then a shape element and **grain** on top.

## 5. Texture

- **A flat design looks digital. Texture makes it feel physical** (02). Pick the blend mode by the texture's background:
  - **Light-background texture → Darken modes** (Multiply, Darken…). They keep the dark detail.
  - **Dark-background texture → Lighten modes** (Screen, Add…). They keep the bright detail.
  - **Contrast modes** (Overlay, Soft Light…) treat 50% grey as neutral.
  - **Difference modes** subtract. Similar colours go dark and different ones invert.
- **Moiré on purpose** (17): lay a halftone grid over footage, set a blend mode and **add camera movement**. The shimmer adds life to a static frame.
- Their own work always has grain, halftone dots, paper texture or grunge. Rule from 15: *"जब भी design बना रहे हो, have some sort of texture."*

## 6. Motion and feeling

- **You design what people feel, not what they see** (08, the kiki/bouba effect):
  - **Playful / friendly**: rounded easing, soft curves, overshoot, bounce, curved letterforms.
  - **Bold / documentary / premium**: sharp snaps, hard angles, angular type, fast ease-out with no overshoot.
- **Pick a theme and stick to it** (16): certain colours, one texture, one overlay. Their Ukraine edit uses a red overlay with grunge texture, colours inverted to black and white, and red as the only accent.
- **Emotion over information** (16): the plain version "is not able to evoke emotion", and the editor's job is to make the audience *feel the weight*. Their fixes:
  - A 3D bomb falling.
  - An article match cut (paperanimator).
  - Explosions stamped onto a satellite map.
  - A plane crossing the frame.
- **Rebuild B-roll as graphics** (15): instead of using the anime clip for "3, 2, 1, let it rip", they redrew it as a panelled countdown.
  - The frames are split by diagonal shapes.
  - The numbers slam in.
  - Each panel holds for about 0.75 s.
  - An exploded-view Beyblade stacks up alongside kinetic text ("YOU GUYS / REMEMBER / BEYBLADE").
  - A spinning top with a light sweep finishes it.
- **Frames first, then animate** (11, 15). Their process:
  1. Moodboard and references.
  2. Design each key frame as a still in Photoshop, with texture and a type choice (e.g. the Paladins font from the Beyblade arena).
  3. Import into After Effects and animate between the frames.
  4. Sound design in Premiere.
- **Text reveals:** they reveal type through grain or particle dissolves (CC Ball Action, 11) and glitch blocks (the "RENDER ROOM" title).

## 7. Sound and rhythm

- Visuals and sound get equal weight (12). The ₹10 magnet reel is built around the *clank*.
- **Rhythm** (13): reveal information without breaking the flow.
  - Cut music or dialogue on purpose (the "deafness" edit mutes Pattinson mid-line).
  - Every visual hit should have a sound hit.
- My takeaway: **put the edit on a beat grid**. Scene changes land on beats, a whoosh leads *into* each transition, and a hit lands *on* it.

## 8. Craft outside the screen (19, 20)

- **Technique beats gear.** For the ring light, bounce it off a large 5-in-1 reflector for soft light and add a warm practical lamp behind the subject.
- **An Easyrig** moves camera weight to the hips so the camera acts like a pendulum and stays level. The tradeoff is floaty, not snappy, movement.

---

## My checklist for a good motion graphic

1. **Hook in the first 1.5 s**: a bold claim or "wrong" state, big type, high contrast.
2. **Pick a vibe, then set easing, shapes and type to match it** (sharp/angular = premium, round/bouncy = playful).
3. **Theme** = one hue family (tints, tones, shades) + **one** accent colour + **one** texture + one type pairing.
4. **Hierarchy by ratio**, with the hero at a thirds point (top-left), never in the dead centre by default.
5. **Design the key frames as stills first**. Every frame should work as a poster.
6. **Change state every 1.5–3 s**. Show one idea per beat with before/after where possible.
7. **Annotate**: arrows, boxes and 1–3-word labels.
8. **Transitions are shapes, not crossfades**: wipes, match cuts, and one element carried into the next scene.
9. **Texture on everything**: grain, halftone, paper. Move the camera slightly so the texture comes alive.
10. **Sound on the grid**: a whoosh into a cut, a hit on a slam, a riser into the ending, silence as punctuation.
11. **End card**: a clear line plus a call to action, held long enough to read (about 1.5 s).

## How I applied it: `templates/flat-poster` (20 s, 1080×1920, 30 fps)

| Time | Beat | Lessons used |
|---|---|---|
| 0.0–3.0 | Hook: "STOP" slams in, "GUESSING." reveals by mask, scattered junk | hook, scale exaggeration, sharp snap |
| 3.0–7.0 | Random boxes snap into a thirds grid, F-path eye trail, hero top-left | Gestalt, rule of thirds |
| 7.0–11.0 | Type ladder builds at ×1.618 | golden-ratio hierarchy |
| 11.0–14.5 | KIKI snaps (hard easing) vs BOUBA bounces (soft easing) | kiki/bouba, easing = feeling |
| 14.5–17.5 | Two "different" squares are the same grey | colour is relative |
| 17.5–20.0 | The grey square match-cuts into the end card | match cut, CTA, hold |

Theme: monochromatic HSL-225 blue (4-stop gradient: light source, hold, falloff, anchor), one red-orange accent, Anton + IBM Plex Mono, film grain and a drifting halftone overlay. Scene changes sit on a 120 BPM grid (every 0.5 s), with procedural whooshes, hits and a riser.

---
---

# Part 2: reels 21–30 (from the new 30-reel script and CSV)

Method: same as before. I read transcripts 21–30, made 1.5-second contact sheets of every new reel and counted cuts. The new batch is about **animation craft**, not graphic design.

| # | Reel | Lesson |
|---|---|---|
| 21 | Claude animation, 2.5M views | An explainer loop made in 5 minutes went viral because **it helps you understand the topic**. It isn't slop when the motion explains something. The format is a caption header ("QUICK TUTORIAL") with the diagram below it, and it runs 22 s with only 2 cuts. |
| 22 | Michael Jackson's *Ghosts* mocap (1996) | Tech at its limit still needs a **hand pass**: where the mocap algorithm missed, animators added keyframes by hand. |
| 23 | "Animators are liars" | **Animate to the camera.** Spider-Verse cities and Encanto limbs are broken from the side but perfect through the shot camera. The goal is to look right from one angle. The reel shows it as a split screen of "how it looks" vs "how it's made". |
| 24 | Staging | A flat frame has the same size, same height and same line. Fixes: **foreground / midground / background** layers; **room lines** (wall and floor) to make distance felt; for tension, **close-ups, lean-in and faces cropped by the frame**. Impact comes from staging, not detail. |
| 25 | AI explainer and collage animation | AI now does the slow parts of collage animation (finding and cutting images, small background moves). Clips are capped at about 5–7 s, which suits short-form. |
| 26 | Blinks | Blink on **head turns, changes of mind, realizations and thinking**. Don't blink when a character is **determined or scared**, because the brain suppresses blinks under stress. Relaxed or daydreaming characters blink more. In short, holds and blinks are punctuation. |
| 27 | 2D in 3D | Put 2D animation on a **3D plane** and move a real camera. You get parallax, light interaction and real shadows, which is the basis of every viral parallax shot. |
| 28 | OpenScreen (free and open source) | Product-demo polish comes from a **smooth cursor, auto-zoom that follows the cursor, and motion blur on pans and zooms**. |
| 29 | Fight Club intro | Fincher's title sequence is a **camera dive through the brain** with shallow depth of field, science-accurate, and cost almost $1M. A fly-through makes an intro feel like a journey. |
| 30 | 24 fps and ones/twos/threes | 24 fps became the standard because film stock was expensive. **On ones** = 24 drawings per second (smooth). **On twos** = 12 (the anime look). **On threes** = 8 (stop-motion feel). Choppiness is a style choice. |

**What changes in my checklist**
- 12. **Build depth, not only layout**: foreground, midground and background layers, depth of field, and a camera that moves through the space (parallax).
- 13. **Cheat for the camera**: only the final frame has to work.
- 14. **Choose the frame rate as an aesthetic**: characters on twos, the camera on ones.
- 15. **Use motion blur** on fast camera moves and zooms. It separates polished motion from "keyframes in software".
- 16. **Holds are punctuation**: leave a beat of stillness before big hits, like a blink before a realization.
- 17. **Cut to real music.** Map the track's energy, not just its tempo: its breaks are where transitions go and its hits are where things slam.

---

# v1 vs v2: comparison

Files:
- `templates/flat-poster` (v1)
- `templates/depth-camera` (v2)

| | **v1: STOP GUESSING** (20 reels) | **v2: EVERY FRAME IS A LIE** (30 reels) |
|---|---|---|
| Subject | Design theory: layout, type scale, kiki/bouba, colour | Animation craft: staging, animate-to-camera, timing, demo polish |
| Space | Flat 2D. Depth only from gradients and a slow zoom | **Real 3D camera**: a Fight-Club-style dive, parallax dolly, a 55° orbit revealing a city that is broken from the side, cursor auto-zoom |
| Depth cues | none | Depth of field (blur by distance from focus), fog, floor lines, foreground/mid/background staging |
| Frame rate | 30 fps, everything on ones (grain on twos) | **24 fps**. Characters and the timing demo on twos and threes, the camera on ones |
| Motion blur | none | 3-sub-frame, 180° shutter on every frame |
| Theme | Deep blue (HSL 225) + red-orange, Anton + Plex Mono, overlay grain, halftone | Paper + ink + cobalt, Archivo Black + JetBrains Mono, **multiply** paper grain (a light texture wants a darken mode), burnt edges |
| Sound | Procedural: my own kick/whoosh/riser on a strict 120 BPM grid | **Licensed stock track**, Mixkit "Stylz" by Ahjay Stelino (136 BPM, sidechain-pumped corporate electronic), window 61.37–81.37 s, loudness-normalised to about −14.6 LUFS, plus a few SFX |
| Sync | Visuals on an ideal grid; the music was written to match | The **edit follows the track's real structure**: it opens in a quiet break, "FRAME" lands on the first kick (0.91 s), "IS A LIE." on the groove (1.79 s), transitions sit in the music's breaks (3.6 / 7.6 / 17.9 s), and the cursor click lands on the last hit (19.13 s) |
| Annotation | Arrows, typed labels, underlines | Leader-line pills (FOREGROUND / MIDGROUND / BACKGROUND), a shot-camera icon with its view frustum, onion-skin ghosts |
| Transitions | Red diagonal wipe, match cut (hero block to rule), whip, split, scale-up | Dive-through into a disc, dolly push, orbit and return, hard cuts on the beat, zoom in and out on the cursor |

**Honest read**
- **v2 is the stronger piece of *motion*.** Real camera space, parallax, depth of field and motion blur make it feel filmed rather than keyframed, and a real track makes it hit much harder than my synth bed.
- **v1 is the clearer piece of *design*.** Tighter poster frames, bigger contrast and a denser idea per second. v2's paper palette is calmer, and the orbit and city shots have small elements on a large field.
- **What v2 still lacks:**
  - A true hold, like a blink, before the biggest slam.
  - The fg/mid/bg staging would hit harder with lean-in or tension as well as depth.
  - The end card has only about 0.6 s of pure hold before the music fades, which is short for the 1.5 s rule in my own checklist.
- **The takeaway for the next one:** combine v1's poster-grade frames with v2's camera, frame rate and music-structure workflow.
