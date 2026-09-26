# The Spider-Verse style bible

Distilled from *The Art of Spider-Man: Into the Spider-Verse* (Ramin Zahed, Titan 2018) and the making-of video in `video-making-of.md`. "PDF n" is the scan's page number. Book page = PDF − 4 up to PDF 029, PDF − 8 from 034 to 069, and PDF − 12 from 074 (unnumbered fold-outs at 030–033 and 070–073). Full per-page notes, hex samples and credits are in `book/`.

## 0. The one idea

> "Every frame is an illustration of something. We are trying to bring the human hand back into visibility on top of all the amazing technological achievements." (Phil Lord, PDF 039)

> "Ideally, we want to be able to stop every frame of the film and have it look like an illustration… The dots, the screen tones, the panels, the way everything works in a 3D space—the goal was to make you feel like you're living inside a comic book." (Justin K. Thompson, production designer, PDF 017)

The computer "was best at simulating realism. What I challenged the team to do was bend those rules" (Thompson, PDF 016). Imageworks rebuilt the dot-printing process of old comics for its "tactile, granular feeling" (PDF 016), and the early concept paintings (Alberto Mielgo's above all) were the target for the final frames (Steinberg, PDF 025; Belson, PDF 014).

The film is a CG substrate with comic-book print language laid on top. The paint-over stage (2D design → 3D design → **paint**) is where halftone, ink, hatching and flat planes enter, and it sets the target the render has to hit (PDF 101, 148). When you build in code, build the drawing, then the print.

## 1. The substitution table: what replaces each CG default

| CG default | Spider-Verse substitute | Source |
|---|---|---|
| Smooth gradient | Colours and values broken "into defined shapes with short or no transitions" (Dean Gordon, PDF 016); Ben-Day dots, cross-hatching, comb-edged tone steps. **Skin gets the same screen tones, hatching and value banding as the sets** | PDF 016, 061, 093, 115; video 06:50 |
| Depth-of-field blur | **Colour-plate misregistration**: the out-of-focus plane's red and blue plates slip apart. "What if the camera didn't de-focus like a lens? So, we splintered and offset the image in a way that is similar to a misprint" (Danny Dimian, PDF 017) | PDF 017, 142; video 06:55 |
| Motion blur | None. Animate on twos; smears, stretched shapes and **multiple-exposure in-betweens**; backgrounds become "movement tunnels of color and snowflakes" | video 06:40; PDF 195–199 |
| Soft shadow | Hard-edged shape, often **filled with a dot grid** or hatch lines (contact shadows too) | PDF 130, 138, 153 |
| Bloom / glow | **Halftone glow**: dots shrinking away from a flat bright disc. Bokeh as hard flat discs or concentric rings | PDF 063, 115, 165, 169 |
| Rim-light falloff | A **hard band** (magenta for Miles) filled with white dots, with a thin darker line offset outside it | PDF 112, 121, 173 |
| Specular highlight | Flat white lozenges and cut shapes; stepped "pixel" glints on plastic | PDF 081, 153 |
| Accurate geometry | **Broken models**: windows float in front of their walls; nothing is parallel, nothing lines up | video 07:45; PDF 168 |
| Emotion from facial anatomy | **Ink lines drawn on the face**, not attached to anatomy, handed to animators in the rig | video 06:15 |
| Simulated explosions | Hand-drawn 2D explosion cycles; the FX are rebuilt from the drawings | video 07:35 |
| One unified render style | **Each character keeps their own universe's rules**, even in the same frame | PDF 130 |
| Glow of energy | Radial scribble lines + posterisation + RGB-split edges | PDF 087 |
| Photographic detail | **Reduction**: "how far we could reduce the world around us and how much we could get away with" | O'Keefe, PDF 118 |

Motto from the VFX team: **"If it's not broken, break it."** (video 07:05). Dimian: "Computers do everything correctly… What's interesting about art is all the imperfections that go hand in hand with a human creating things. We had to find a way to break things" (PDF 017). Persichetti: deliberately paint yourself into a corner, then find a way out.

## 2. Line

- **Line is part of the performance.** "We have included a lot of line work in the characters' performances… so audiences can't quite tell whether something is 3D or not" (Josh Beveridge, PDF 130). Lines on faces were drawn per frame; Imageworks later trained an ML model on artists' drawings to predict them (video 17:10).
- **Heavy on the shadow side, thin elsewhere; lines often don't close** (PDF 036, 049).
- **Floating ink ticks** (Zac Retz, PDF 022): thin black verticals hugging one edge of a building, offset 3–8 px, with a short horizontal cap, never closing the outline.
- **Keylines don't register with the fill.** The colour fill is offset 2–6 px from its ink line, leaving white slivers (Iglesias, PDF 038, 204). Ink lines are laid 2–8 px off the edges they describe (Demers PDF 156; Mullins PDF 202). City keylines can be red and offset (PDF 210).
- **Loose, disconnected slashes for folds** that never close a contour (Mielgo, PDF 045). A few calligraphic strokes over tree masses (PDF 104).
- **Creases, not seams**: draw a crease on the inside of a bend. A whole body or chain reads as one inked shape.
- **Stepped, deliberately aliased edges** on one side of a big dark shape: a pixel staircase (Mullins PDF 174, Mielgo PDF 146).

## 3. Colour and light

- **Expose for one region.** "We used dark shapes, with just glimpses of light at times. We always think about what part of the shot we're exposing for. We're bringing in light bleeds at the edge of frames" (Gordon, PDF 016). Most colour-script frames are over 60% near-black with one lit region (PDF 030). Lit like live action, not a bright cartoon, and "we always want to include something observed in our lighting" (PDF 016).
- **Deep, graphic darks.** "We have been able to play with light and darkness in ways that haven't been done in CG-animated movies before" (Dean Gordon, PDF 144). Villains become pure black shapes (Kingpin, Goblin reveal).
- **Limited palette per key.** A lighting key is often black + one hue family + white (Zac Retz's Prowler chase: #0d0615, #271150, #6b488e, #9a5681, white; PDF 063).
- **Keep the heroes readable:** "light over dark, dark over light, featuring the most saturated colors to track our main characters" (Gordon, PDF 196). The hero is the most saturated thing in frame, or a value flip against it.
- **Magenta rim, cool or warm key.** Miles' rim is a hard magenta band (#c040b0) (PDF 112). Zac Retz: every silhouette gets a hot magenta-red rim (#ff3a6e) against a blown-out pastel background (PDF 169). Chase keys split a magenta rim on one side and a cyan rim on the other (PDF 200).
- **Web lines catch light.** On Peter's suit the black web lines turn gold (#f0b030) where the light hits (PDF 098).
- **The colour script plans palettes as a sequence** (Dave Bleich, PDF 030–031): warm yellow = home and safety; pink/red = Miles' own emotional spaces; blue-violet = night and hero work; green = collider and Alchemax danger; white = sterile corporate space; orange-gold = catharsis. **Manhattan is cool, Brooklyn is warm** (Demers, PDF 018).
- **Colour codes the story.** Green is evil, discomfort, apprehension, used on every villain zone (Thompson, PDF 107). Warm Brooklyn home vs cold white/lime/purple Academy (PDF 064). Autumn orange/red for the Hudson Valley (PDF 116).
- **Travelling light:** a 10-block chase got 12–14 lighting keys, darker leaving Manhattan and lighter as it goes (Gordon, PDF 196).
- **Atmospheric perspective goes toward the light colour**, not grey or blue: cream in the forest (PDF 117), mauve-pink over the Manhattan skyline (PDF 050), pale green-grey over Mielgo's rooftops (PDF 144).
- **Shadows change hue, not just value**: violet/mauve skin shadows (Mielgo, PDF 123), violet floor shadows on warm wood (PDF 040), blue jacket flipping to violet across the form (PDF 037).
- Warm key through windows and doors, cool fill everywhere else (Dalit's school keys, PDF 072). Split warm/cool faces with a hard terminator for emotional beats (PDF 044).

## 4. Shape and proportion

- **Design by primitive shape before detail.** Jefferson is a wide rectangle (an offensive lineman); Aaron is a tall thin vertical (a basketball player); Kingpin is a square black mass 8 ft × 7 ft; Goblin is 22 ft tall (PDF 057, 092, 172).
- **Contrast is a design value**: "One of design's greatest pleasures is stark contrast" (Kassai, PDF 134). Put the lanky kid next to bulky adults.
- **Miles: "baby deer"** — skinny legs, wobbly knees, big hands and feet; about 6–6.5 heads; he should feel unfinished (Thompson, PDF 037). Not a power fantasy: "you don't have to be muscular and tall to be strong" (Arad, PDF 038).
- **Wear shows history**: Peter B.'s beer belly, pushed nose, asymmetric ears, built into the model itself (PDF 098, 199).
- **Iconic minimum**: a minor canon character is identified by one or two signature shapes (MJ's red hair and jagged fringe, PDF 096).
- **Silhouette as its own rig**: Kingpin had a rig that posed the silhouette independently of his anatomy (PDF 176).

## 5. Composition and camera

- Extreme worm's-eye and bird's-eye views with strong dutch angles (Mielgo endpapers, PDF 206–210; O'Keefe collider, PDF 088).
- **Huge negative space**: a tiny figure against a blank sky (PDF 203); half the frame left white (PDF 088).
- Frame-within-frame from black foreground silhouettes (Retz, PDF 083; Ruppel, PDF 110).
- Comic devices inside the film frame: panel splits for simultaneous reactions, push-in panel strips, caption boxes ("JUST THEN", "TO BE CONTINUED…"), multiple exposure along a dotted path (PDF 039, 088, 162, 163).
- **Camera inversion for vertigo**: straight-down views with the figure rotated 180° (PDF 071–072). The teaser's building drop rotates the city (video 14:30).
- Introduce a giant by silhouette first, growing in frame (the Goblin, like the T-Rex in *Jurassic Park*, PDF 092).

## 6. Texture and print artefacts

- **Halftone as fabric**: a regular black dot grid over a whole garment, continuing across its logo (Mielgo's track jacket, PDF 008); the whole red suit carries a dark-red dot grid (PDF 037). Black suits get a dot or hex mesh one step lighter (Gwen #2a2830 on #0c0a10, PDF 121). Dots scale with how lit the surface is.
- **Inverse halftone in the darks**: lighter dots over black, sometimes as two screens half a cell apart, to fake misregistered plates (PDF 090).
- **Halftone only in the terminator band** on coats and columns (PDF 051, 180).
- **Spray paint**: overspray speckle, drips, sprayed outlines; the Mielgo cover's red shoulder is a spray stipple, denser toward the edges (PDF 001); the title-page emblem is a hard shape + an overspray halo + drips (PDF 007). Miles' own spider emblem was sprayed; Mielgo spray-painted the Miles logo on cardboard and it's still on the merchandise (video 12:30; PDF 059).
- **Pixel-mosaic weathering** on brick and stone; distant detail reduced to blocky cells (PDF 064, 081).
- Film grain / paper noise; small misregistered rectangles and isolated lime or magenta pixels as print noise (PDF 144).

## 7. Motion and timing

- **Frame modulation:** "this crunchy, crispy version of pop art… not too choppy and not too smooth. You want crisp pop with aggressive clarity" (Josh Beveridge, PDF 017). Break physics: push poses the body couldn't hold.
- **On twos.** "The majority of our animation is done in twos… That's rare for CG" (Persichetti, PDF 195). Twos broke cloth, hair and FX pipelines; Imageworks generated a hidden in-between frame just to keep cloth simulation stable (video 07:20).
- **Frame rate as character arc**: in the forest, Peter B. is on ones (smooth, in control) and Miles is on twos (choppy). By the Leap of Faith, Miles is on ones too (video 16:30). Cameras move on ones.
- **Sculptable rigs**: poses can be pushed off-model for a frame or two, like a comic (video 08:45).
- No motion blur: multiple imagery in-betweens and crisp speed streaks. Snowflakes become short crisp dashes, never smears (PDF 195).
- Pops and holds: new drawings land on the beat and hold. A blink is two drawings.

## 8. Lettering

- Onomatopoeia lives in the world: laid along a beam, breaking a panel border, surrounded by ink splatter; halftone-filled letters with an offset shadow; neon-tube glyphs (PDF 088–089).
- Caption boxes: a flat magenta (#df5ba7) or yellow rectangle, ~3 px black stroke, hand-lettered caps with key nouns in bold italic, top-left of the frame, Silver-Age narration voice (Mielgo, PDF 026). SFX rotate −15° to −30°, letters grow toward the end, filled with an inverse dot pattern, outlined by an offset second colour ("AARGH!!", PDF 015).
- Yellow speech balloons are staging devices; the "SPIDER-MAN!" balloons multiply as a crowd recognises him (PDF 198).
- One complementary pastel for SFX against a one-hue panel (the in-film comic, PDF 074).
- Book chapter titles: heavy geometric sans caps in red (#e0303c).

## 9. Reduction and imperfection

- "It was always about seeing how far we could reduce the world around us and how much we could get away with" (O'Keefe, PDF 118).
- "Nothing is really parallel or truly lines up. Some buildings have poor foundations and sink a little to one side" (O'Keefe, PDF 168).
- Floating foliage and disconnected limbs, after Bill Watterson's *Calvin and Hobbes* forests (PDF 118).
- Distant cities are flat hazy slabs with 1–2 px window lights and no outlines (PDF 050, 068).

## 10. A checklist before you ship a frame

1. Is there any smooth gradient left? Replace it with dots, hatching or a posterised step.
2. Is anything blurred? Replace it with misregistration (focus) or crisp multiples and streaks (motion).
3. Does the hero read? Most saturated, or a clean value flip, with a hard rim.
4. Are the darks deep and graphic, with shapes rather than murk?
5. Is there a hand-drawn line where a render would have a hard edge?
6. Does anything line up too perfectly? Knock it off-grid.
7. Is every character in its own style?
8. Is the character animation on twos while the camera moves on ones?
9. Is there one lettering or print element that says "this is a comic"?
