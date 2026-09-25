# Style catalogue: the visual styles in the 30 reference reels

A catalogue of **how each reel looks**, so a style can be picked and rebuilt without the source videos. Read it in order:
- **Part A:** the shell every reel shares.
- **Part B:** the 11 graphic styles, each with a build recipe.
- **Part C:** one card per reel, in the same fields every time.

Source: contact sheets (a frame every 1.5–2 s) and 4 fps bursts of all 30 @aevyvideoschool reels, plus their transcripts. Reel numbers match `lessons.md`.

---

## Part A: the shell (shared by nearly every reel)

| Part | What it is | Build note |
|---|---|---|
| **Canvas** | 1080×1920 vertical, 30–60 s. The top ~2/3 is the **graphic panel** and the bottom ~1/3 is the **presenter** (talking head, dark moody room, warm practical lamps, a lav mic). | For a pure motion graphic, drop the presenter and give the whole frame to the graphic, but keep the "one panel, one idea" discipline. |
| **Presenter variants** | Full-frame face for emphasis beats (the "छी! गलत!" reaction, often **desaturated to B&W** for the disgust beat). A small **picture-in-picture webcam** (square, rounded) over a screen recording. | A B&W freeze on the "wrong" beat is a cheap, strong punctuation. |
| **Hook card** | Heavy caps in a **black box**, two lines, one word in red or yellow: "STOP **GUESSING** DESIGN LAYOUTS", "HOW TO ACTUALLY USE **TEXTURES**!!", "TINTS, TONES & SHADES **EXPLAINED**!!" Sits over the "wrong" version of the design. | `text` on a filled rect. The accent word is always the verb or topic. |
| **Captions** | Word-by-word, lower third, small white bold sans on a grey pill, or plain white with shadow. The emphasis word switches to an **italic serif** ("the *editor*", "*flow*", "This was *made*"). | Timed per word, and one serif-italic word per sentence at most. |
| **Annotation kit** | A hand-drawn **white curved arrow** + a **heavy caps label** (white, or yellow on dark): "GREY LIMBO", "MOIRÉ PATTERNS", "HERO SPOT", "NO DEPTH IN FRAME". **Yellow boxes / ✗ marks** for "wrong". **Teardrop pins** for colour names (`#FFFFFF`, "BLUE TINT"). **Red dashed lines** for measurement. **Orange heatmap blobs** for eye attention. | See `arrow`, `leader`, `trimmed` in the templates. The label animates in letter by letter or with a dissolve. |
| **UI inserts** | Real app UI: a Photoshop/After Effects canvas, an HSL table, opacity sliders, blend-mode menus, a timeline, a ChatGPT prompt box. Shown as floating rounded cards with a soft shadow. | Draw a fake UI card (rounded rect, rows, a slider with a moving knob) instead of a screenshot. It reads as more "designed". |
| **End card** | The presenter plus an **Instagram follow-button** animation (avatar, name ✓, Follow → Following), or "Comment '**ANIMATE**' / '**class**' / '**Rhythm**'" in a heavy serif with yellow, or "AEVY.SCHOOL/DESIGN" on a yellow bar. | A pill button that gets clicked (depth-camera template) is the same idea. |
| **Pacing** | A new visual state every 1.5–3 s. Cuts per reel: 2 (21, a loop explainer) up to 34 (22, archive doc). The median is about 10 per 45 s. | |

---

## Part B: the 11 graphic styles

### S1 · Editorial poster (Swiss / brutalist print)
- **Looks like:** a printed poster. Heavy condensed caps (Anton/Bebas-like) stacked tight, often **overlapped by the subject**. A grainy B&W or duotone photo cut-out. Small stacked micro-type, barcodes, stamps, halftone dots. One or two flat inks (red + blue, orange + cream, blue + white).
- **Reels:** 01 (JO BOLTA HAI), 05 (NOT ALL DREAMS / DREAM), 09 (WHAT EVEN IS RULE OF THIRDS?, DESIGN, QUESTIONING THE SYSTEM), 02 (TEXTURES/BLUEBERRY, collage prints), 08 (THE UNTOLD STORY).
- **Motion:** mostly still. Changes come as **before/after swaps**, a **heatmap or arrow overlaid**, the grid drawing on, sizes stepping. The camera slowly pushes in.
- **Build:** `flat-poster` template. Use `reveal` for headlines, halftone + grain overlays, and a subject photo masked in front of the text layer.

### S2 · Flat diagram explainer (swatches, shapes, graphs)
- **Looks like:** flat vector shapes on a **neutral dark-grey (#2b2b2b) or light-grey** board. Circles, rectangles, swatch columns, sliders, a histogram or curves panel. Bold caps labels with a white arrow.
- **Reels:** 03 (grey vs blue swatches, same-yellow squares), 04 (tint/tone/shade swatch columns), 06 (RGB hexagons, CMY paint splats absorbing light), 10 (gradient rectangles, HSL steps table), 14 (overlapping blue/yellow circles, complementary pairs, curves), 17 (overlapping circles with a moiré fill).
- **Motion:** shapes slide or scale in on snaps; **overlap and opacity demos** (two circles slide together, an opacity slider scrubs); swatch columns fill up in % steps; a UI slider knob moves and the shape updates live.
- **Build:** plain rects and circles plus `P()` windows. Drive a visible slider knob and the shape's property from the same eased value.

### S3 · Photo manipulation + UI proof
- **Looks like:** a real photo or illustration (daisy in grass with a statue head, a lake landscape, a portrait) with **the fix applied on screen**: an eyedropper, an opacity slider, a colour pin, a curves panel, a torn-paper page-curl reveal of before/after.
- **Reels:** 03 (the white daisy sampled into the scene), 06 (colour grade via histogram), 14 (curves: remove yellow, don't add blue), 02 (blend-mode menus over textures), 17 (a halftone grid over a B&W chess illustration).
- **Motion:** a **page-curl / peel** transition between before and after (02, 14); a cursor clicks a menu item and the image changes on the click; a magnifier loupe.
- **Build:** a two-image cross-reveal with a folded-corner polygon. A cursor path plus a click ripple (see `scene5` in `depth-camera`).

### S4 · Flat illustrated scene (vector posters)
- **Looks like:** clean vector illustration, e.g. a Mt Fuji/pagoda poster in pink and red, or a monochrome blue portrait on a red background. A limited palette, no outlines, flat shading bands.
- **Reels:** 09 (the Fuji poster with a thirds grid and heatmap), 04 (the blue portrait on red, re-shaded with tints, tones and shades), 07 (a Peaky Blinders cut-out trio on cream).
- **Motion:** overlays animate on a static illustration (grid lines, heatmap blobs pulsing along an F-path, colour pins popping in); a **split slider** compares flat vs shaded.
- **Build:** draw the scene as flat vector paths, animate only the overlays, and use a vertical wipe line for before/after.

### S5 · Kinetic type + motion-graphic cards (brand animation)
- **Looks like:** fully animated graphic frames. Comic bursts ("CLANK", "Gummies" starbursts), a mascot, bold colour fields (orange/yellow, cobalt/lime), sound-wave strips under each card, gaming-style fonts (Paladins), diagonal panel splits.
- **Reels:** 12 (₹10 magnet: CLANK burst cards over EQ waveforms, a mascot in a baseball cap), 08 (kiki/bouba starbursts, the "Let's play" football with bounce), 15 (Beyblade: an exploded view, "YOU GUYS REMEMBER BEYBLADE", a 3-2-1 panelled countdown, a spinning top with a light sweep), 11 (RENDER ROOM glitch title).
- **Motion:** **snappy scale pops with overshoot**, **diagonal panel wipes**, numbers slamming in and holding about 0.75 s each, spins with speed-line sweeps, words stacking between parts of an exploded object, hard cuts on sound hits.
- **Build:** the `flat-poster` helpers with `spring` for playful and `eo` for snaps. Split panels are clipped polygons, and every pop gets an SFX.

### S6 · Documentary / cinematic collage (grunge theme)
- **Looks like:** a **theme overlay** on everything, e.g. a **red + grunge texture**, inverted B&W satellite maps, article cut-outs with **highlighted headline text** (yellow marker), a 3D prop (Sketchfab bomb, plane), explosion stamps. A 16:9 letterboxed panel with blurred copies behind it.
- **Reels:** 16 (Russia invades Ukraine), 08 (THE UNTOLD STORY crowd poster), 22 (MJ *Ghosts*, archive footage with a "MICHAEL JACKSON / CGI SKELETON" red-and-white title bar, a "1996" year stamp, mocap coordinate readouts), 29 (Fight Club: cyan-black brain dive, a Digital Domain logo, credit slates).
- **Motion:** an **article match cut** (paperanimator-style: the camera flies across a newspaper to a highlighted phrase), a prop falling with rotation, the map pushed in with explosions stamped on beats, glitch/invert flashes, a year stamp slam.
- **Build:** a duotone/invert of every image plus a red multiply overlay plus grain. The newspaper match cut is a camera pan across a text card with a highlight rect wiping on.

### S7 · 3D render / layout breakdown ("how it looks vs how it's made")
- **Looks like:** grey-shaded 3D viewports, orbiting cameras, wireframes. A **split screen** with "HOW IT LOOKS ↑ / HOW IT'S MADE ↓" divided by a slanted white bar. Labels like "CAMERA / SIDE CAM VIEW", "FREE CAM VIEW / FPS GAME CAM", a red camera-frustum triangle.
- **Reels:** 23 (Spider-Verse broken city, Encanto stretched arm, FPS arms), 27 (Tom & Jerry on a 3D plane in a low-poly forest, with the camera icon flying around the diorama), 20 (an x-ray spine overlay on the body for the Easyrig), 29 (the Fight Club neuron fly-through).
- **Motion:** the **camera orbits** from the shot view to the side to reveal the cheat, then returns; a diorama spins on a turntable; parallax layers slide.
- **Build:** the `depth-camera` template: `Cam`, `card()`, `orbit_cam()`, frustum lines, "SHOT CAMERA" label.

### S8 · Character animation / staging boards (2D cartoon)
- **Looks like:** clean 2D cartoon characters (bald man, capped guy, boxers; Sofia the First for blinks) on a **light-grey board** inside a rounded frame. **Orange caps labels** with small orange arrows ("SAME HEIGHT", "FLAT FRAME", "FOREGROUND", "DEPTH", "LEAN"). A mini inset of the "before" in the corner for comparison.
- **Reels:** 24 (staging: flat trio → fg/mid/bg; the empty room → room lines; boxers standing → lean-in close-up), 26 (blinks: a 3D Sofia with a timeline strip of keyframe dots under her, then show clips labelled HEAD TURNS / REALIZATION / NO BLINKS), 07 (the Peaky Blinders figures with the horizon line crossing the same body point).
- **Motion:** figures **re-pose between keyframes** (on twos), the camera pushes in for tension, a red dashed horizon or perspective lines draw on, and a before-frame inset flies to the corner.
- **Build:** `depth-camera` `character()` cards on a 3D floor, a `twos()` pose change, `leader` labels. Use orange instead of cobalt for this look.

### S9 · Timeline / frame-strip explainer
- **Looks like:** an editor timeline as a rounded dark card: a filmstrip row of frame thumbnails with a playhead, and **red handwritten-style caps with red curved arrows** ("24 EQUAL FRAMES", "12 UNIQUE DRAWINGS", "EACH DRAWING HELD FOR 2 FRAMES", "ANIMATING ON 2S") on a light-grey background. Film-era archive clips cut in (projector reels, 16 fps street footage).
- **Reels:** 30 (24 fps and ones/twos/threes), 26 (keyframe dot tracks under the character), 13 (Premiere panels: white balance sliders, adjustment layers).
- **Motion:** the playhead scrubs, thumbnails duplicate to show holds, a red box highlights a pair of frames, then a hard cut to archive film.
- **Build:** draw a strip of N cells and fill cells with the "drawing" index (`floor(i/hold)`). This is the clearest possible visual for frame rate.

### S10 · AI / tool demo (screen-recording showcase)
- **Looks like:** a **dark background with a thin serif italic header** ("*Tutorial*", "*Step 1:* Image Generation", "*AI* Hallucinations", "*Output*"; "QUICK TUTORIAL", "CLAUDE ANIMATION" in heavy sans). A 16:9 media card below the header, often **before (cartoon) on top, after (live-action) below**. Prompt boxes shown as dark rounded cards. Product sites with neon-gradient hero screenshots.
- **Reels:** 18 (Oggy → live-action with ChatGPT and Seedance), 21 (a Claude-made multiple-exposure explainer loop in a dark card), 25 (Seedance 2.0 and GPT Image 2 collage animations), 28 (OpenScreen: product-demo auto-zoom, cursor, motion blur).
- **Motion:** a cursor glides and clicks, the view **auto-zooms toward the cursor** with motion blur, cards swap on each step, the prompt text types in.
- **Build:** `scene5` in `depth-camera` (cursor + auto-zoom + blur), a header in serif italic + a sans word, and one card per step.

### S11 · Collage animation (cut-paper, Monty Python-ish)
- **Looks like:** B&W photo cut-outs (hands, heads, retro computers, cars) with hard edges on **flat saturated fields** (hot pink, cobalt, lime, orange, mint). Halftone texture, paper shadows, oversized hands holding small objects, a sun circle behind a skyline on a cream river map.
- **Reels:** 25 (the Papa Ocus collage reel: gas-mask man, hands with coins, a computer with a key, a city skyline in a hand, a river map), 02 (collage prints for blend modes: flower, mountains, orange sun, woman in a gown with orange halves).
- **Motion:** cut-outs **slide in on straight paths with a slight overshoot**, loop small moves (a hand dips, a coin drops, a head nods), elements are **held on twos or threes for a stop-motion feel**, a paper texture stays static while the pieces move.
- **Build:** image cards with a drop shadow + `threes(t)` time + a flat colour bg + halftone. Keep each motion to 5–7 s loops (the Seedance/AI limit mentioned in 25).

### Live-action styles (not graphics, but in the set)
- **LA1 · Gear demo / BTS:** 19 (ring light) and 20 (Easyrig). Wide handheld BTS in a studio with practical lamps, **price tags as green rounded badges** ("₹2,000", "₹800"), a before/after split of the subject's face, and a stacked price total at the end. Reel 20 adds an **SMPTE colour-bars glitch** and an **x-ray spine overlay** (a glowing cyan skeleton over the back). 19 opens with a **laser-eyes + fire comp** for the "Ew" beat.
- **LA2 · Talking-head + archive:** 22 and 29. The presenter plus licensed film clips, archive interviews with lower-third name cards ("stan winston / director"), studio logos, a year stamp.

---

## Part C: one card per reel

Fields: **Format** (layout) · **Style** (from Part B) · **Palette / type** · **Devices** (annotation and graphics) · **Motion** (moves and transitions) · **Rebuild with**.

**01 · Layout by Gestalt, not by space**
- **Format:** Photoshop screen + PiP webcam → graphic top / presenter bottom → B&W reaction cut.
- **Style:** S1 editorial poster.
- **Palette / type:** blue ground, red condensed caps "JO BOLTA HAI VAHI HOTA HAI", a grinning B&W face with a red jacket, halftone dots; the GESTALT reference page is navy with wide-tracked white caps.
- **Devices:** a "STOP GUESSING DESIGN LAYOUTS" hook box; a heatmap arrow (cyan→red gradient arrow) showing the eye path; a rounded selection frame; dotted-arc "Continuity" diagram.
- **Motion:** layout variants swap (wrong → grouped → aligned → similar); the arrow draws down the text; ends on a mini-gallery of poster examples (motorcycle on yellow, blue lily, "BLEND IN" chameleon).
- **Rebuild with:** `flat-poster` scene 2.

**02 · Textures and the four blend-mode families**
- **Format:** graphic top / presenter bottom.
- **Style:** S3 + S11 collage prints.
- **Palette / type:** cream paper, a navy serif "TEXTURES", a blueberry botanical, "Fresh and Juicy" script; a yellow camera collage; a pink/orange flower-mountain collage; a psychedelic woman-in-gown collage.
- **Devices:** real blend-mode menu cards (Darken / Lighten / Contrast / Difference groups) with a white arrow and caps label ("DARKEN MODES"); a red vertical split line comparing with/without texture.
- **Motion:** **page-curl peel** between states; the menu highlight moves item to item and the image updates.
- **Rebuild with:** the grain + multiply/screen logic in both templates; the peel is a folded-corner polygon wipe.

**03 · Colour is relative**
- **Format:** graphic top / presenter bottom.
- **Style:** S3 photo + S2 swatches.
- **Palette / type:** a pink-washed 3D render (blue blob creatures on dunes); swatch boards (pink/red/light-blue/navy quadrants, a mustard square on purple vs orange); a daisy field with a bronze statue head.
- **Devices:** "GREY?" / "BLUE?" caps with an arrow; a colour picker card showing `#ABB5BC`; confetti burst; `#D1803E` hex tags on swatches; an orange **teardrop colour pin** reading `#FFFFFF`; an opacity slider card; a circular sampling loupe; a "TWO DIFFERENT YELLOWS RIGHT?" label.
- **Motion:** backgrounds swap behind identical squares; the pin pops in; the slider scrubs; the loupe fades in over the flower.
- **Rebuild with:** `flat-poster` scene 5, plus pin and loupe shapes.

**04 · Tint, tone, shade**
- **Format:** graphic top / presenter bottom.
- **Style:** S2 swatches → S4 illustrated portrait.
- **Palette / type:** red + white/grey/black columns on light grey; a monochrome blue woman portrait with a Breton-striped top on red.
- **Devices:** % labels (80/60/40/20) stepping inside the columns; a "TINTS, TONES & SHADES EXPLAINED!!" hook box; **teardrop pins** "BLUE TINT / BLUE TONES / BLUE SHADES"; a split-screen compare handle; a before-portrait inset flying to the corner; a BASE COLOUR → TINTS/TONES/SHADES gradient-bar chart.
- **Motion:** columns fill in steps; the compare slider drags across the portrait; pins drop in sequence; the end card reads "MONOCROMATIC COLOUR SCHEME".
- **Rebuild with:** swatch columns + a wipe-compare line.

**05 · Type hierarchy by ratio**
- **Format:** Photoshop + PiP → graphic top / presenter bottom → B&W reaction.
- **Style:** S1 poster.
- **Palette / type:** a cream poster, orange condensed "DREAM" over a man rowing a boat on teal water, thin orange "NOT ALL DREAMS COME TRUE".
- **Devices:** "STOP GUESSING TEXT SIZES" hook; a Photoshop font-size popover ("200 pt" → "323.6 pt"); a golden-ratio reference card (nautilus, Parthenon, spiral); a "TYPE SCALE RATIOS" table (Golden 1.618, Silver 1.414, Perfect Fourth 1.333, Fifth 1.25, Minor Third 1.2).
- **Motion:** the headline steps through sizes with the popover live; the layout toggles between ratios.
- **Rebuild with:** `flat-poster` scene 3 (the type ladder).

**06 · CMY/RGB: how printers work, and grading by opposites**
- **Format:** Photoshop screen → graphic panel / presenter.
- **Style:** S2 diagrams + S3 grading.
- **Palette / type:** CMY-coloured Hulk & Spider-Man silhouettes; RGB hexagons (blue/red/green, white caps); paint splats on dark grey.
- **Devices:** "HOW PRINTERS WORK BTW" hook; a 3D printer render; an ink-droplet trio; an RGB sub-pixel loupe; "CYAN ABSORBS RED" labels with a dashed blue light ray hitting a magenta splat; red/blue/green graded photos with a histogram card and a white arrow.
- **Motion:** layers overlap into a full-colour image; rays draw on and "absorb" with a flash; photos swap as channels shift.
- **Rebuild with:** shapes + dashed `trimmed` paths.

**07 · Figures in perspective: the horizon line**
- **Format:** After Effects screen + PiP → graphic / presenter.
- **Style:** S8 staging board with S4 cut-outs.
- **Palette / type:** a cream background, three Peaky Blinders B&W cut-out figures.
- **Devices:** a thin red horizon line; **mustard double-headed arrows** labelled "SIMILAR HEIGHT" / "SIMILAR POSE"; a **cyan highlight band** where the horizon crosses each body.
- **Motion:** figures scale and move while the band stays locked to the same body point (waist → knees); a puppet-pin rig is visible in the AE screen.
- **Rebuild with:** `depth-camera` staging with a horizon line.

**08 · Kiki/bouba: playful vs premium**
- **Format:** graphic top / presenter bottom, one full-face reaction.
- **Style:** S5 motion cards + S6 doc poster.
- **Palette / type:** a cyan halftone spiky star and a red halftone blob on dark grey; a brain line-drawing; "SIGHT / SOUND / FEELINGS" columns (yellow); a **Gummies** candy starburst (yellow/red/cyan radial); candy packs; a sky-blue "Let's play" football with a graph-editor inset; a B&W crowd poster "THE UNTOLD STORY" in red condensed type.
- **Devices:** "BOUBA?" caps with a white arrow; a velocity graph under the football (rounded curve vs sharp).
- **Motion:** the star snaps and rotates; the blob wobbles; the **starburst pulses and rotates on beats**; the ball bounces with squash; the doc title slams letter by letter.
- **Rebuild with:** `flat-poster` scene 4.

**09 · Rule of thirds and the eye's F-path**
- **Format:** graphic top / presenter bottom.
- **Style:** S4 illustration + S1 posters.
- **Palette / type:** a pink/red Fuji-pagoda-sun vector poster; a "WHAT EVEN IS RULE OF THIRDS?" poster (red eye, halftone); a "DESIGN" brutal poster on yellow; a "SUMMER DETECTIVE" B&W poster with a teal split; a cobalt "QUESTIONING THE SYSTEM IS NOT DISLOYALTY" protest poster in a hand-lettered condensed face.
- **Devices:** a white 3×3 grid; **heatmap blobs** (yellow/orange) on intersections; a heat trail along an F-path; halftone concentric ripples on a cobalt grid; an orange bracket.
- **Motion:** the subject slides off-centre with a UI slider; the grid draws; heat spots bloom in reading order; the protest poster builds (headline → body → crowd photo → yellow top bar).
- **Rebuild with:** `flat-poster` scene 2 (grid + F-path).

**10 · Gradients without grey limbo**
- **Format:** graphic top / presenter bottom, B&W rage cut.
- **Style:** S2 diagram + UI.
- **Palette / type:** a red and a periwinkle→indigo gradient on light grey; a green gradient at the end.
- **Devices:** a colour-picker card; a dashed-rect "GREY LIMBO" callout (purple caps) with a curved arrow; a **Steps table** card (0/40/65/100 % rows with HSL values in green/pink highlight chips) with row tags "Light Source / Hold / Falloff / Anchor".
- **Motion:** gradient stops drag; table cells highlight in sequence; the gradient re-renders live.
- **Rebuild with:** a fake UI table card + gradient stops (the 4-stop HSL gradient in both templates).

**11 · Nikhil Kamath podcast intro rebuild**
- **Format:** screen tutorial with the presenter bottom; ends on a full-face CTA.
- **Style:** S5 brand animation (process) + S1 moodboard.
- **Palette / type:** a Cubist split-face **mascot** (half cyan/navy, big teeth, purple hair); deep navy background with **soft blue corner spots**; white outline rings; blocky glitch squares; "RENDER ROOM / BY Aevy Video School" (white wide sans + blue script).
- **Devices:** a "References" moodboard grid; Photoshop trace steps (photo → line art → flat colour → texture); "SOFT BLUE GRADIENT LOOK" caps + arrow; "Comment 'ANIMATE'" serif CTA.
- **Motion:** portrait layers fly in from different directions; the title **reveals through a particle/grain dissolve** (CC Ball Action); glitch-block wipes; floating rings drift.
- **Rebuild with:** gradient bg + rings + a particle-dissolve reveal.

**12 · Visuals + sound (₹10 magnet)**
- **Format:** full-frame cards with the presenter PiP below "Final Results".
- **Style:** S5 motion-graphic cards.
- **Palette / type:** yellow→orange cards with a cream border (like trading cards); navy oval magnets; a red/orange starburst; the "CLANK" comic word; a smiling mascot kid in a cap with raised hands and orange sunburst rays; **green waveform strips** labelled "Time Remap + Pitch Shifter", "Parametric EQ".
- **Devices:** under-card audio waveform = the sound design is shown as a visual.
- **Motion:** magnets snap together with a **CLANK burst on the hit**; sound rings pulse; the mascot pops up with rays spinning; cutaways to IKEA-blueprint and Pogo logo animations show the class.
- **Rebuild with:** `flat-poster` + `spring` + SFX on every hit.

**13 · Rhythm through sound and dialogue**
- **Format:** full-frame presenter with film clips; a "HOW TO SHOW DEAFNESS THROUGH EDITING" hook.
- **Style:** editorial talking-head + S9 Premiere UI.
- **Palette / type:** warm film stills (an ear with an earbud, Zendaya); a white/yellow bold hook; **word captions with italic-serif emphasis** ("*editor*", "*flow*"); a magenta glitch bar across the presenter.
- **Devices:** an audio waveform line under the ear shot that flattens when the sound cuts; muted-mic icons; Premiere Effect Controls + timeline cards; a "Comment **Rhythm**" yellow CTA.
- **Motion:** sound cuts drive the visual cuts; a glitch-wipe transition.
- **Rebuild with:** caption system + a waveform that animates with the mix.

**14 · Complementary colours make mud**
- **Format:** graphic top / presenter bottom; ends on a YouTube-style subscribe pill.
- **Style:** S2 diagrams + S3 grading.
- **Palette / type:** a pure blue and yellow circle on dark grey with white-outlined caps text in the circles; RGB/CMY pairs; a sunset portrait (man with dreadlocks), aerial islands, a forest portrait.
- **Devices:** an opacity slider card; "GREY MUDDY LIFE LESS" stacked caps + arrow; a **halftone-dot loupe** blown out from the photo (a triangle-cone magnifier); a curves card; a "DON'T ADD BLUE / INSTEAD REMOVE YELLOW" label; a page-curl before/after.
- **Motion:** circles slide to overlap and the overlap turns grey; pairs box-highlight; curves drag and the photo cleans.
- **Rebuild with:** overlap demo + loupe cone + peel.

**15 · Beyblade motion design (student fix)**
- **Format:** DM-comment hook → presenter + graphic.
- **Style:** S5 kinetic cards.
- **Palette / type:** navy/cobalt with a hexagon arena pattern, a silver-blue Beyblade with red/yellow blades, **Paladins** gaming font in white/yellow, red and green diagonal panels, a hand pulling a ripcord.
- **Devices:** the Beyblade logo with red arrows; an exploded-view vertical stack of parts; a "PALADINS FONT" callout; AE effects panel shots.
- **Motion:** the exploded parts stack with the words "YOU GUYS / REMEMBER / BEYBLADE" slotting between them; **3-2-1 countdown with diagonal panel splits, each number slamming and holding about 0.75 s**; the top spins on a cyan crosshair with a light sweep and zoom-blur; "PLASTIC TOPS" types on in yellow; grunge/smoke texture transitions.
- **Rebuild with:** clipped diagonal panels + `slam` + a rotating radial blur.

**16 · Documentary edit fix (Ukraine)**
- **Format:** DM hook → presenter + 16:9 panel with blurred-copy fill.
- **Style:** S6 grunge doc.
- **Palette / type:** red + B&W; inverted satellite maps; a red 3D bomb; an old-paper article with a yellow-highlighted headline; a red "KHARKIV" / white "MARIUPOL" stamp.
- **Devices:** yellow boxes + ✗ marks + "Evoke Emotion" / "No emotional impact" handwritten yellow labels on the weak version; tool cards (Sketchfab, paperanimator, ChatGPT prompts).
- **Motion:** the bomb falls with rotation; an **article match cut** zooms across newspaper text to "Russia invades Ukraine"; the colour inverts; the plane crosses and **explosions stamp on the map on beats**; red grunge flashes between shots.
- **Rebuild with:** duotone + red multiply + a highlight wipe + stamped sprites.

**17 · Moiré on purpose**
- **Format:** graphic top / presenter bottom.
- **Style:** S2 diagram + S3 texture on illustration.
- **Palette / type:** lavender and pink translucent circles on dark grey; navy/maroon variants; a B&W manga-style chess illustration.
- **Devices:** a rotation slider card; "SHIMMERING PATTERN" / "MOIRÉ PATTERNS" yellow caps + arrow; real-world examples (camera LCD, striped shirt, the scanimation horse book, a hummingbird); the textures-lab site.
- **Motion:** two halftone grids **rotate slightly against each other** and the moiré shimmers; the scanimation card slides to animate the horse; a slow camera move over the illustration makes the overlay shimmer.
- **Rebuild with:** two halftone images, one rotated by `t`, in screen blend.

**18 · Oggy and the Cockroaches: live-action version (AI)**
- **Format:** a DM-comment card between cartoon (bottom) and live-action (top) frames; presenter full.
- **Style:** S10 AI demo.
- **Palette / type:** black ground; a **serif italic header** "*Tutorial*", "*Step 1:* Image Generation", "*AI* Hallucinations", "*Step 2:* Video Generation", "*Output*"; bright cartoon vs photoreal cat/cockroach renders.
- **Devices:** ChatGPT prompt cards; a Seedance 2.0 prompt card with `@Video1` / `@Image1` chips; failure examples (a human tower, burning streets, anime swordsmen) labelled as hallucinations.
- **Motion:** step cards swap on each beat; the cartoon ↔ live-action pairing is stacked vertically.
- **Rebuild with:** header-and-card step layout.

**19 · Ring light done right**
- **Format:** handheld live-action BTS with word-caption pills.
- **Style:** LA1 gear demo.
- **Palette / type:** warm tungsten studio; **green rounded price badges** ("₹2,000", "₹800") with a drop shadow; a stacked cost row at the end ("₹3,499 ₹800 ₹1000").
- **Devices:** a **laser-eyes + fire VFX gag** on the "wrong way" beat; a split before/after of the subject's face (top/bottom).
- **Motion:** whip pans between setups; badges pop in with a bounce.
- **Rebuild with:** badges = rounded rect + `spring`.

**20 · Easyrig: handheld with heavy cameras**
- **Format:** live-action BTS, fisheye/wide.
- **Style:** LA1 gear demo + S7 x-ray.
- **Palette / type:** dark studio with green and warm practicals; "10 TO 15 KILOGRAMS" white wide caps.
- **Devices:** an **SMPTE colour-bars glitch** as a transition; a **glowing cyan x-ray spine + ribcage** over the operator's back to show where the weight goes; a split frame of the shot and the operator.
- **Motion:** handheld sway vs rig float, shown by filming both.
- **Rebuild with:** colour-bar card flash + an additive glow skeleton sprite.

**21 · Claude animation that isn't slop**
- **Format:** a "QUICK TUTORIAL" / "CLAUDE ANIMATION" heavy white header on black; a dark 16:9 card under it; presenter below; 2 cuts in 22 s.
- **Style:** S10 + the explainer diagram inside.
- **Palette / type:** a charcoal diagram of a camera body with film reels, light-blue exposure frames and a "Multiple Exposure Photography" serif title; the Claude chat UI.
- **Devices:** a "PRACTICAL" red-tag thumbnail with a "👁 2.5M" view pill; word captions with an italic-serif emphasis word ("This was *made*").
- **Motion:** the **diagram loops**: light passes through the lens, frames advance and exposures stack.
- **Rebuild with:** any looping diagram in `flat-poster` helpers. Keep it a loop that explains something.

**22 · Michael Jackson's *Ghosts* mocap (1996)**
- **Format:** a "MICHAEL JACKSON" white caps title bar + red "CGI SKELETON" label framing an archive clip; presenter below.
- **Style:** LA2 archive doc + S6 touches.
- **Palette / type:** blue-lit ballroom archive; a "1996" white stamp; film-title cards (*Ghosts* serif); a "stan winston / director" typewriter lower third; the Digital Domain logo on black; mocap viewport readouts (X/Y/Z numbers ticking beside a stick figure).
- **Devices:** side-by-side dancer vs skeleton comparison panels.
- **Motion:** 34 cuts in 58 s, the fastest reel: archive montage cut to speech rhythm.
- **Rebuild with:** mostly editing; the XYZ readout is `typed` numbers updating on twos.

**23 · Animators are liars: animate to the camera**
- **Format:** a split "HOW IT LOOKS ↑ / HOW IT'S MADE ↓" divided by a **slanted white bar**; presenter below.
- **Style:** S7 3D breakdown.
- **Palette / type:** Spider-Verse night city (blue/purple) vs grey untextured blockout; a yellow "STYLIZED LAYOUT" tag; "CAMERA / SIDE CAM VIEW" labels over a pink/magenta Encanto character with particles; a green-lit Mirabel; FPS arms in grey.
- **Devices:** a **red camera-frustum triangle** with a camera icon; a Twitter post card from the animator; a hand-model turnaround.
- **Motion:** **orbit from the shot camera to the side view** reveals floating buildings and stretched limbs, then back.
- **Rebuild with:** `depth-camera` scene 3 (this is exactly it).

**24 · Staging: depth, space and tension**
- **Format:** Illustrator + PiP → graphic panel over the presenter at a desk.
- **Style:** S8 staging board.
- **Palette / type:** flat cartoon men (black coat, brown jacket, green hoodie, caps) on light grey; a white empty room with a door; tan boxers with dark gloves; **orange caps labels** "SAME HEIGHT / FLAT FRAME / FOREGROUND / MID / BACKGROUND / DEPTH / NO DEPTH IN FRAME / MORE DEPTH NOW / BOTH CHARACTERS JUST STANDING! / FIGHT / LEAN".
- **Devices:** **red dashed measurement lines** (equal heights, perspective lines to a vanishing point); small orange curved arrows; small "before" insets bottom-right at the end.
- **Motion:** characters re-stage fg/mid/bg; room lines draw in; the boxers jump to a **lean-in close-up with faces cropped** for tension; labels type with a dissolve.
- **Rebuild with:** `depth-camera` scene 2 plus a lean-in close-up.

**25 · AI collage and explainer animation**
- **Format:** the presenter's round avatar top-left + a thin serif title ("Seedance 2.0 *animation*" / "GPT Image 2 *asset*") over two stacked 16:9 cards; presenter mid-shot; a B&W presenter beat.
- **Style:** S11 collage + S10.
- **Palette / type:** cream river map with a teal sun behind a city; a hand holding a skyline on pink; a collage reel by @PapaOcus (gas-mask man on lime, clouds on pink, a skull with magenta laser eyes, cobalt hands on yellow, a runner on mint); a retro computer on cobalt with a hand and key; hands dropping coins on pink; a supplement jar.
- **Devices:** "*Explainer type* Animations" serif title; a "*5 - 7 Seconds* of animation max" caption.
- **Motion:** cut-outs slide and settle with small loops (coin drop, hand dip); held on twos/threes.
- **Rebuild with:** S11 recipe.

**26 · Blinks are all timing**
- **Format:** 3D viewport (Sofia) with **keyframe dot tracks** under her → show clips with labels; presenter below with a pink-magenta warm room.
- **Style:** S8 + S9.
- **Palette / type:** Disney Sofia (3D) in purple; **white heavy caps with a curved white arrow** "HEAD TURNS / CHANGES THEIR MIND / REALIZATION / THINKING / NO BLINKS / NO BLINKING AT ALL"; word captions in a pill.
- **Devices:** a timeline with pink/green/blue keyframe dots and a blue playhead.
- **Motion:** the playhead scrubs so her eyes close on the dot; clips freeze on the blink frame when the label pops.
- **Rebuild with:** `character()` + the `blink` flag on head turns.

**27 · 2D characters in 3D environments**
- **Format:** full graphic panel with a **caption word in the lower third on the graphic**; presenter below.
- **Style:** S7 3D + 2D-on-plane.
- **Palette / type:** a bright low-poly forest diorama (river, trees, flowers); Tom & Jerry 2D on a card; a grey render viewport with a white **camera icon**; a green light-pass; a grey cast-shadow pass; examples (a teal cartoon forest, a pink castle on a floating island, a school-bus card in 3D).
- **Devices:** the diorama shown as a floating slab with the camera beside it (like a miniature set).
- **Motion:** the camera moves and the flat character **breaks**; then the character is re-placed on a plane and **sits in the world with shadow and light**; parallax layers slide.
- **Rebuild with:** `depth-camera` `card()` + a cast shadow (the same card squashed on the floor, black at low alpha).

**28 · OpenScreen: SaaS demo animations**
- **Format:** full-screen product shots; presenter bottom.
- **Style:** S10 tool demo.
- **Palette / type:** dark UI with neon purple/red/green gradient backgrounds behind floating app windows; "Showcase your next **product demo** with Open Screen." (white + green); a Valorant/League promo UI; the GitHub README.
- **Devices:** a red box highlight on the download button; annotation settings panels; an Instagram broadcast-channel invite card with a **Join** button highlighted.
- **Motion:** **auto-zoom follows the cursor, motion blur on pans and zooms**, and windows float on a gradient.
- **Rebuild with:** `depth-camera` scene 5.

**29 · Fight Club intro (≈$1M)**
- **Format:** full-screen film clips alternating with the presenter.
- **Style:** S6 cinematic doc + S7 fly-through.
- **Palette / type:** **cyan-black** neuron/brain fly-through; bent chrome-cyan credit lettering ("A DAVID FINCHER FILM", "EDWARD NORTON", "HELENA BONHAM CARTER"); Harvard night (Social Network) comparison; a Digital Domain logo; the Titanic poster; a "Kathryn Jones" B&W archive portrait with a name card; storyboard book pages; the VFX-plate slate ("OT.1 VFX:0").
- **Motion:** a continuous **dive through the brain** with shallow depth of field; credits float in 3D as the camera passes.
- **Rebuild with:** `depth-camera` scene 1 (the dive).

**30 · Why anime is 24 fps (ones/twos/threes)**
- **Format:** graphic panel / presenter; B&W presenter on the question beat.
- **Style:** S9 timeline explainer.
- **Palette / type:** anime stills (Attack on Titan, Demon Slayer fire); light-grey board with a dark rounded timeline card; **red heavy caps + red curved arrows**: "24 EQUAL FRAMES", "24 UNIQUE DRAWINGS", "1 SEC = 24 DRAWINGS", "ANIMATING ON 1S", "12 UNIQUE DRAWINGS", "EACH DRAWING HELD FOR 2 FRAMES", "12 FRAMES PER SECOND", "ANIMATING ON 2S", "1 SEC = 8 DRAWINGS"; archive projector footage; a "SHOT ON 16 FPS" red stamp; Shaun the Sheep stop-motion.
- **Devices:** a red box around the held frame pairs in the strip.
- **Motion:** the playhead runs; thumbnails duplicate to show holds; a hard cut to archive.
- **Rebuild with:** `depth-camera` scene 4 (balls on 1s/2s/3s) + a frame strip.

---

## Quick picker

| You want… | Style | Start from |
|---|---|---|
| A design-rule explainer that looks printed | S1 + S2 | `flat-poster` |
| To prove a before/after on a real image | S3 | `flat-poster` + peel wipe |
| Playful brand energy, pops and bursts | S5 | `flat-poster` + `spring` + SFX |
| Serious doc weight | S6 | a red/duotone theme + stamps + match cut |
| "How it's really made", camera reveals | S7 | `depth-camera` scene 3 |
| Character staging / acting beats | S8 | `depth-camera` scene 2 |
| Frame-rate / timing concepts | S9 | `depth-camera` scene 4 + a frame strip |
| Product or tool demo | S10 | `depth-camera` scene 5 |
| Handmade, stop-motion vibe | S11 | image cards + `threes(t)` + halftone |
