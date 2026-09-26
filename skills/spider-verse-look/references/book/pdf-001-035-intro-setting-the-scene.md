# Chunk 01: PDF pages 001–035

Source: *The Art of Spider-Man: Into the Spider-Verse* (Ramin Zahed, Titan Books, first edition December 2018). Hex values marked "sampled" were measured from 20–40px patches of the 1400px scans with ImageMagick. All other hex values are estimates by eye. Scans are slightly desaturated and lifted, so the real art is a little more saturated and darker than any hex listed.

---

## Section map

| PDF page | Book page | Content |
|---|---|---|
| 001 | cover | Front of the dust jacket: Miles in profile, masked, looking down into a snowy city canyon. No artist credited in this range. |
| 002 | endpaper | Front endpaper by **Neil Ross**: Miles in a red hoodie leaping between rooftops in daylight. |
| 003 | jacket | Full dust-jacket spread (back blurb, spine, front). |
| 004 | — | Blank. |
| 005 | frontis | Concept sketch by **Shiyoon Kim**: Miles in a baggy store-bought Spider-Man costume. |
| 006 | — | Copyright and credits page. Artist credits for 002, 005 and 008–009. |
| 007 | title | Title page: spray-painted Miles spider emblem with the logo. |
| 008–009 | — | Spread. Concept art of Miles in headphones by **Alberto Mielgo** (008). CONTENTS (009). |
| 010–011 | 6–7 | FOREWORD by Brian Michael Bendis. Building-elevation strips by **Zac Retz and Wendell Dalit**. |
| 012–017 | 8–13 | INTRODUCTION: "Creating a Thoroughly Modern Hero" (012–014) and "A Web of Visual Delights" (015–017). |
| 018–029 | 14–25 | SETTING THE SCENE (Manhattan, Brooklyn, RIPeter). |
| 030–033 | unnumbered | FOLD-OUT. 030–031: colour script by **Dave Bleich**. 032–033: artwork by **Justin K. Thompson, Wendell Dalit, Alberto Mielgo, Yuhki Demers**. |
| 034–035 | 26–27 | WHO IS MILES MORALES? (chapter opener) |

**Page offset:** book page = PDF − 4 for PDF 010–029. The four fold-out pages (030–033) carry no book numbers, so from PDF 034 on, **book page = PDF − 8** (PDF 034 = book 26). Other chunks should check this. Later fold-outs may shift it again.

**Book table of contents (PDF 009):** 6 Foreword · 8 Introduction · 14 Setting the Scene · 26 Who Is Miles Morales? · 56 Blurred Vision · 70 Miles Meets the Spider-Men · 92 Out of the City · 114 Spider Team Suit Up · 132 On the Prowl · 142 The Battle · 160 Fisk's Fiasco · 180 Scene Spotlight · 190 Conclusion · 192 Acknowledgements.

---

## Text insights

### Visual philosophy / comic-book language

- **The goal is that every frame works as a still illustration, close-ups as well as wide shots.** Dots, screen tones and panels must hold up in 3D space. Justin K. Thompson (Production Designer), p.017: *"Ideally, we want to be able to stop every frame of the film and have it look like an illustration… We don't want it to look great only in the wide shots. The dots, the screen tones, the panels, the way everything works in a 3D space—the goal was to make you feel like you're living inside a comic book."*
- **Recreate the print process literally, not just the look of comics.** Sony Imageworks rebuilt the dot-printing (halftone) process of older comic books to get their "tactile, granular feeling". (Narration, p.016.) Thompson: *"You really felt the artistry as you turned the page."*
- **Fight the computer's default realism on purpose.** Thompson, p.016: *"I knew that the computer excelled at the opposite. It was best at simulating realism. What I challenged the team to do was bend those rules and expectations and create a whole new reality. Our character's reality."*
- **No soft gradients. Colours and values are broken into defined shapes with short or no transitions.** Dean Gordon (Art Director), p.016: *"The nature of computer rendering tends to fight a graphic look. We worked on painting textures that are less naturalistic, definitely more abstract, to take a step away from true realism. We worked to get away from soft transitions between colors and values, which is what computers naturally do. In our artwork we broke down colors and values into defined shapes with short or no transitions to give them a more illustrative feel."*
  - Code rule: posterize or quantize the lighting into bands. Replace smoothstep terminators with step() or a very narrow ramp.
- **Skin uses the same screen tones, hatching and value banding as the environment.** Characters must not look like a different render style from the sets. Gordon, p.016: *"We brought the same ideas to the characters' skin tones. Having the skin tones fit into the same environment using the same screen tones and hatchings, and value banding we see in comics elevated that illustrative element."*
- **Keep the hand of the artist. Avoid anything slick or glossy.** Thompson, p.015: he "wanted to avoid anything slick or glossy that would eliminate the hand of the artist or downplay the stakes". *"Comic books are actually quite gritty in the way they're made."*
- **What Thompson took from comics** (p.015): *"I loved the line-work, the color, the texture, the screen-printing, everything."* In short: line, colour, texture, screen print.
- **Deliberate imperfection.** Danny Dimian (VFX Supervisor, Imageworks), p.017: *"Computers do everything correctly and you have the right perspective and geometry all the time. What's interesting about art is all the imperfections that go hand in hand with a human creating things. We had to find a way to break things."* Code rule: jitter lines, offset plates, wobble perspective slightly, and never let every edge align.
- **Focus is shown with misregistration, not lens blur.** This is the key rule. Dimian, p.017: *"Among the many stylistic ways the tech team paid homage to old comic books was emulating the way color offsets were not aligned properly in some prints of the run. 'We took that as an opportunity to explore how to play with focuses in a scene… It was hard to focus on an image when all the color passes were not properly aligned. We thought, "What if the camera didn't de-focus like a lens?" So, we splintered and offset the image in a way that is similar to a misprint. It has a really cool feel to it that creates this illusion that something is printed on the screen.'"*
  - Code rule: defocus amount = distance from the focal plane. Map it to the offset distance between colour plates (e.g. R/magenta shifted one way, G-B/cyan-lime shifted the other), and keep each plate sharp. Do not Gaussian-blur.
- **Panels, flash frames, SFX and a POV "sideline" camera.** Chris Miller (Producer), p.013: *"We have moments when the frame gets broken into panels, just like you see in comic books. There are flash frames that allow for unusual compositions, and there are weird sound effects and stylized visuals that are spread throughout the movie. There are scenes where you feel you are watching the movie through the eyes of one of the characters, about 100 yards away from the sidelines of the action."*
  - Tools this lists: split-screen panels, single-frame flash inserts, on-screen onomatopoeia, and a distant observer camera for action.
- **Frame modulation gives a "crunchy, crispy" pop-art motion.** Josh Beveridge (Animation Supervisor), p.017: *"Our big challenge was creating that balance between being cartoony and realistic… It led us to frame modulation to get this crunchy, crispy version of pop art… Animation allows us to break physics, but you don't want to be too choppy and not too smooth. You want crisp pop with aggressive clarity."* "Frame modulation" means varying the frame rate, holding frames on ones or twos. The book does not use the words "on twos" in this range. Code rule: step character animation (hold poses for 2 frames at 24fps) while the camera and FX stay smooth. Aim between choppy and smooth.
- **The mandate was to break physics:** live-action Spider-Man "never feels completely believable because we had to deal with real physics to put him in these fantastic poses." (Beveridge, p.017.) Push poses to extremes the body could not really hold.
- **New technique, not new software.** Dimian, p.017, comparing the film to Imageworks' *Hollow Man* (2000): *"Back then… we had to rethink everything. This time, though, we are not writing the software from scratch. We are trying to find a new technique to tell the story."*
- **Pipeline changed for good.** Beveridge, p.017: *"I think we have forever altered our pipeline thanks to this project."*
- **Early concept paintings were the target for final frames.** Christina Steinberg (Producer), p.025: *"The idea was to make the movie look like a comic book come to life. We also spoke quite a bit about wanting the final version of the film to look just like the early concept paintings. They were so dynamic, fresh and visually arresting that we wanted to make sure they were translated to the screen."* So the concept paintings in this chunk are valid style targets.
- **Alberto Mielgo set the look.** Kristine Belson (Sony Pictures Animation President), p.014: *"Early in the process we were lucky enough to work with Alberto Mielgo, a truly extraordinary artist whose vision put us on the path, and continued to guide and inform the groundbreaking final look of the movie. His influence was pretty remarkable."* Thompson (p.015) took the early development as a "jumping off point" and pushed further "by leaning into the comic book language that was hinted at there."
- **Graphic language of comics inside animation.** Belson, p.014: *"We are trying to bring something fresh to the table by exploring the graphic language of comics in the animation… We are hoping to subvert expectations, take some chances and surprise people."*
- **The film is meant to make a visual statement.** Peter Ramsey (co-director), p.014: *"Of course, dozens of Marvel movies lean on that look while telling a cinematic story, but I can't think of any other animated film that makes this much of a visual statement."*
- **The movie as a "post-modern" collage.** Phil Lord (Executive Producer), p.013, after the Jeff Koons retrospective in NYC ("all his art is about other people's work"): *"We could perhaps create a post-modern Spider-Man… So, we leaned into this idea of a post-modern Spider-Man in this environment that has multiple spider-people from all of the comics."* Mixing styles by citation is intended.
- **Gritty, mysterious world.** Thompson, p.021: *"I'm really proud of how illustrative and unique our film looks compared to other big studio animated features. One of our big goals was to make the movie look as gritty as the classic comic books, which offer a window through these mysterious worlds."*

### Colour & light

- **Light it like live action, not like a typical bright animated film.** Gordon, p.016: *"There's a tendency in animated movies to go for bright, colorful lighting. We wanted to extend our range, and looked at some of the techniques of live action films. We were allowed to go as dark in a sequence as we needed creatively."*
- **Dark shapes with glimpses of light. Choose one exposure target per shot.** Gordon, p.016: *"We used dark shapes, with just glimpses of light at times. We always think about what part of the shot we're exposing for."* Code rule: let most of the frame fall to near-black flat shapes and expose for one region.
- **Light bleeds at the frame edges.** Gordon, p.016: *"We're bringing in light bleeds at the edge of frames."* Code rule: add soft or banded coloured light leaks entering from one edge of the frame.
- **Always include something observed.** Gordon, p.016: *"we always want to include something observed in our lighting."* Stylised, but based on a real lighting phenomenon: sodium lamps, headlight bokeh, neon spill, wet reflections.
- **Stakes drive darkness.** Thompson, p.015: Miles's actions lead to the death of his uncle, and *"I thought it would be a really interesting challenge not to downplay that… it informed nearly every design choice I made when we were designing Miles' world."* That is the reason for the darker palette.
- **Manhattan is cool; Brooklyn and home are warm.** Yuhki Demers (Visual Development Artist), p.018: *"From a color standpoint, Manhattan lives on the cooler side of the color wheel, giving Miles cold and uninviting vibes. This stands in direct contrast with the warmth of Brooklyn and Miles' family apartment."*

### Character design

#### Miles Morales
- Created in 2011 by writer **Brian Michael Bendis** and artist **Sara Pichelli** for *Ultimate Spider-Man*, with input from Marvel CCO **Joe Quesada** (p.011–012). He is the smart, nerdy son of an African-American father and a Puerto Rican mother (p.012). In the film he is **13 years old**, and he was reportedly inspired by Barack Obama and Donald Glover (p.034).
- Personality to show in the design: he is uncertain about his role as a hero (p.034). Miller, p.013: *"Miles is younger, doesn't really want to be Spider-Man, and being a super hero is more problematic for him."* The story is about being a wide-eyed first-timer "in an environment where everyone has been doing it for a long time" (Lord & Miller, p.013).
- Emotional core (Belson, p.014): *"Miles is trying to figure out who he is as a young man in relation to his father and uncle."*
- Early suit concepts (Mielgo, p.034) were a **home-made jumpsuit**: red and blue panels, a white centre zipper, a purple cape, ochre knee pads, light-blue cuffs and red/white high-top sneakers. The Shiyoon Kim frontispiece (p.005) has Miles in an **ill-fitting store-bought costume** with the mask pushed up like a cap. Both show his "not ready yet" status through costume.
- Visual constants across the concepts (p.001, 008, 012, 034, 035): short curly hair drawn as **scribbled spiral loops** with faded sides; big ears; red/white sneakers; headphones or earbuds; hoodie over the suit.

#### Peter Parker ("RIPeter", the Earth-1610 original)
- The artists nicknamed him **"RIPeter"** because he dies early in the first act (p.028).
- Design brief: "the idealized version of the super hero". **Perfect blond hair modelled after Brad Pitt in *A River Runs Through It***, ideal physique. He is a strong contrast to the older, out-of-shape Peter who arrives later (p.028).
- Backstory from Bob Persichetti (director), p.028: voiced by **Chris Pine (uncredited)**, mid-twenties, Spider-Man for **about ten years**, married to M.J., Aunt May still alive. He built his own suits and web-shooters and has a **Spidey workshop under Aunt May's house**.
- Story function, Persichetti: *"If you were bitten by a spider and needed a Spider-Man mentor, he would be the perfect guy for the job… So, we deliver the perfect mentor to Miles only to take him away. His role is to make the next Peter that arrives feel very inadequate!"* Miles sees Peter fight the **Green Goblin**. Peter's spider-sense resonates with Miles, and he says: *"Let me go save the world quickly, and I'll come back and teach you how to do this."*
- Bendis on the legacy mechanism, p.010: *"if Peter Parker dies heroically enough, he could be the 'Uncle Ben' character to this new Spider-Man. Then he continues the legacy of Peter, which is the legacy of Uncle Ben, which is the legacy of 'with great power comes great responsibility.'"*
- Portrait credit (p.028): **2D design by Shiyoon Kim, 3D design by Omar Smith, paint by Wendell Dalit**.

#### Other characters seen in this range
- Green Goblin (p.015): the collider fight. Kingpin, the Prowler, Aunt May's house full of Spider-People (Peni's SP//dr mech, Noir, Ham, Gwen, Peter B.) all appear in the colour script (p.030–031).

### Environment design

#### Manhattan
- Demers, p.018: *"Our Manhattan is a caricature of the real one. We wanted to make sure that the sense of wonder you get when you stare up from the bottom of a skyscraper carries through with this entire part of the city."* Code rule: exaggerate building height and use extreme up or down camera angles. The city is cool-hued (see above).
- It is the classic Spider-Man setting: busy streets, subway cars, perilous swings between skyscrapers (p.018).

#### Brooklyn
- Miles and his family live in Brooklyn, a departure from earlier films. Their "comfortable home is in sharp contrast with the stark, hustle-and-bustle of the Big Apple" (p.018). Warm palette.

### FX (glitch / collider / spider-sense)
- In the text of this range, FX are covered only through the misregistration-for-focus idea (Dimian, p.017). The art shows the collider and glitch language (see Visual insights p.015, 016, 030–031).

### Pipeline & tech
- Sony Pictures Imageworks did the technical work. Credits: production designer **Justin K. Thompson** and art director **Dean Gordon** (both from *Cloudy with a Chance of Meatballs* 1 and 2), animation supervisor **Josh Beveridge** (*Open Season, Surf's Up, Cloudy, Arthur Christmas, Hotel Transylvania* 1–2), VFX supervisor **Danny Dimian** (*Spider-Man* 2002, *Stuart Little 2, The Polar Express, Surf's Up, Cloudy*) (p.013, 015–017).
- "Painting textures that are less naturalistic, definitely more abstract" (Gordon, p.016). Surface textures are hand-painted and abstracted, not photo-based.

### Story & production
- Origin: producer **Amy Pascal** (then Sony Pictures Entertainment chief) and Marvel Studios founder **Avi Arad**. Pascal, p.012: *"there had never been a super hero movie done in animation for the big screen… We wanted to produce a four-quadrant animated movie that was made for everyone, not just for kids."*
- Arad, p.012: *"Everyone was going from animation to live-action, and I told Amy, 'I think we should do it the other way.' We should showcase the style and art of the amazing comic books and make a movie for all ages."* On diversity: *"the big theme of Spider-Man is that anybody can be under that mask. What the mask says is that when you put it on, you have the heart and soul of a hero."* (p.012–013)
- **Phil Lord and Chris Miller** came on as executive producers (after *Cloudy* 1 and 2 and the *LEGO* movies). Lord, p.013: *"We decided we were in if the movie didn't center on Peter Parker… At that time, Miles was easily the most exciting character in the Marvel Universe."*
- Lord and Miller believe we live in a "peak super hero world". Their fresh angle was the first-timer surrounded by veterans (p.013).
- **Peter Ramsey** (co-director, *Rise of the Guardians*), p.014: *"Until recently, the scarcity of heroes and lead characters that are not white has always been a bit of a subtle mental stumbling block for people of color… You feel left out of the fantasy narratives, unless you have a hero whose mind and heart you're getting into."* He also says Miles "sparked a renaissance".
- **Kristine Belson** (SPA President), p.014: the message for kids is *"you are all powerful and we are counting on you."* On p.029: *"One of the key messages of the movie is that anyone can wear the mask. We all have the power and the responsibility."*
- Bendis foreword (p.010–011): Miles came out of Marvel "retreats" about *Ultimate Spider-Man*. Nothing in Spider-Man's origin says he must be Caucasian. The Peter-as-Uncle-Ben idea came to him on "a long bike ride". Bendis wrote every word Miles said for his first five years and worked on Spider-Man for 18 years. He praises rough sketches: *"It's an artist's id, ego, and momentary subconscious showing itself to you all at once… One sketch can inspire a universe of ideas. One sketch can ruin an entire franchise."* and *"THIS IS REALLY HARD!"*
- The first trailer got a big reaction for its look (Ramsey, p.014).

---

## Visual insights (from looking at the art)

### PDF 001: front cover (uncredited in range). Miles in profile over a snowy city.
- **Composition:** tight profile of Miles, masked and looking down, filling the left half. The camera is high, looking down past him into a canyon of buildings. The building verticals lean and converge downward, which gives vertigo. The character is a dark, flat mass against a busy, detailed, mid-value background.
- **Palette:** suit near-black violet `#16131c` (sampled). Shadowed skin is deep plum `#2a1c2a`. Shoulder red `#7f1d11`–`#941b13` (sampled), with brighter web lines around `#e03020`. The eye is warm brown `#9a6a40` with one tiny white specular dot. Mask lens: pale grey-lavender `#c8c8d8` with a thin orange-red rim `#e0402a` and an inner violet rim line. City: periwinkle blues `#6b80ac`/`#526c97`/`#7592c3` (sampled) against brick reds `#a04838` and salmon.
- **Texture:** the red shoulder panel is a **spray-paint stipple**, a dense speckle of dark noise over red that is denser toward the edges and gives a vignette on the shape. The web pattern on the black suit is thin dark-grey lines barely lighter than the suit. The face is flat, with the features drawn as a few dark lines (brow, eyelid, nostril, lip). There is no rendering gradient on the face, just one or two value planes.
- **Snow:** round dots of varied size (2–10px at 1400px) in pale blue-white `#d0e0f0`, scattered randomly. Some are larger and softer, like bokeh.
- **Lighting:** the character is lit only by cool ambient light. No key light on the face. The mood reads as introspective.

### PDF 002: front endpaper, Neil Ross. Daylight rooftop leap.
- **Composition:** a huge dark brown foreground wall fills the left half. It is flat `#302e27` (sampled) with evenly spaced vertical line pilasters. There is a hard vertical split to the right half: a salmon/peach tower with a grid of windows, a white overexposed sky and a far tower in pale pink. Miles, tiny in a red hoodie, is mid-leap in the empty sky. A pigeon gives scale. The negative space is a large share of the frame.
- **Shape language:** no outlines anywhere. Windows are a strict grid of rectangles in 3–4 tones: blue-grey `#8090a8`, cream `#f0e8c0`, pale yellow and dark. The tower's upper floors wash out into the sky, giving atmospheric haze toward white.
- **Palette:** brown `#302e27`, salmon tower `#d8a898` / rose `#c8b0b1`, sky `#ffffff`/`#ebdfe4` (sampled), hoodie red `#c02830`, jeans slate.

### PDF 003: dust-jacket spread.
- The back cover shows a pale, snowy, lavender-blue city seen from above. Two tiny Spider-Men swing on long thin web lines from the top-left. The composition wraps continuously into the front-cover profile.
- Logo: black "SPIDER-MAN" with a red outline and slanted letterforms, over "INTO THE SPIDER-VERSE" in thin red.

### PDF 005: concept sketch, Shiyoon Kim. Miles in a cheap costume.
- **Proportions:** about **6 heads tall**. Lanky: long arms reaching to mid-thigh, skinny neck, oversized head, **big ears**, and big red high-top sneakers anchoring wide-set feet.
- **Costume as personality:** a baggy one-piece costume sagging at the crotch, sleeves pushed up, and the mask pulled up onto the head like a beanie, so the mask eyes stare up from his forehead. He adjusts it with one hand and winces one eye shut. The pose is awkward, self-conscious and teenage.
- **Rendering:** loose black ink line of varied weight, with overshooting construction strokes. The fill is **watercolour/marker**: red `#c04050` bleeding into periwinkle `#adb7d7` (sampled), with wet-edge blotches and paper white left in places. Skin is warm tan-brown `#c2a690`. Web lines are drawn only on the red areas. Perspective floor lines radiate from the feet.

### PDF 007: title page. Spray-paint emblem.
- Miles's spider logo as graffiti: a thick red ring with a spider inside, two legs poking out at the top and two dripping down the bottom. Red `#b03030` with darker `#6d1d22` centres. There is an **overspray halo**, a soft red-orange mist `#e8b8a8` around every stroke, and **paint drips** running down with rounded ends. "SPIDER-MAN" is set in black inside it.
- Reusable asset idea: stencil emblem = hard shape + blurred halo at about 15% opacity + drip lines.

### PDF 008: concept art, Alberto Mielgo. Miles in headphones on a Brooklyn street.
- **Face:** skin is a **lilac-violet**, not brown: `#69557e`/`#666089` (sampled), with pink cheek blush `#c07090` and cool blue planes at the temples. The paint is **blocky and rectangular**, like palette-knife patches with visible square brush dabs and faint horizontal smear. Features are drawn as loose, calligraphic black ink strokes that do not close. The eyes are big and green-grey with a thick black upper lid. A few diagonal **hatch strokes** mark the forehead shadow.
- **Hair:** near-black navy `#0c0e25` (sampled), drawn entirely as **scribbled spiral loops**, with lighter grey loop strokes on top for texture.
- **Jacket:** a navy track jacket `#17164b` (sampled) covered in a **regular black halftone dot grid**. At 1400px the pitch is about 8px (roughly 0.6% of image width), at about 45°, with dot diameter about 50% of pitch. The white trefoil logo also carries the dots, so the halftone is a texture layer over the whole garment, not a shading tool. The zipper is a column of light rectangular dashes. There is a thin white rim edge along the shoulder.
- **Shirt:** red and white stripes with fine diagonal hatch lines scratched across as texture. A green and magenta graffiti-like patch sits at the right edge.
- **Background:** optically blurred lavender street `#8b75b5` / `#beade1` (sampled) with a white car and a blurred pedestrian. In early concept Mielgo used real depth of field. The film later replaced this with misregistration (Dimian, p.017).
- **Grain:** fine monochrome noise over the whole painting.

### PDF 009: contents. Right edge shows part of Miles's jacket (magenta and green graffiti patch, name tag "…HEN").

### PDF 010–011: foreword pages. Building elevations, Zac Retz and Wendell Dalit.
- Orthographic facade strips (no perspective) along the bottom of each page, on a white ground. They look like texture-painting reference or facade "kit" sheets.
- **010 (Manhattan-style modern blocks):** candy-coloured concrete facades: lime `#b8d890`, salmon/coral `#e0a090`, periwinkle-violet `#8a8ad0`, grey with lime balcony bands, burgundy `#9d5b76` (sampled). Windows are dense grids of dark rectangles.
- **011 (Brooklyn tenements):** ochre-tan brick `#c8b088`, red brick `#b05048`, mustard-yellow brick `#c8b870`. **Zig-zag fire escapes** on the fronts, cornices and arched windows, storefront awnings ("BARBER SHOP", a yellow "…" sign), **graffiti** at street level, and **water towers** as pale grey-blue silhouettes `#c8cad5` behind the rooflines.
- Recipe value: a street is a row of 5–6-storey boxes of slightly different heights. Each box has one base colour, a window grid, a cornice line and a ground-floor storefront band with signage.

### PDF 012: concept art, Alberto Mielgo. Miles in sunglasses.
- **Face lighting (two-colour key):** a large **near-black plum core shadow** `#1d0e18` (sampled) fills the centre of the face and neck. A **warm magenta-red key** (`#974b3e` to `#c04060`) lights the left cheek, forehead and ear. A **cool violet-blue fill** `#5a5ad0` lights the right cheek and jaw. Edges between these are **hard**, with no gradient. The lips are a flat mauve `#642c4d`.
- **Hair:** black mass with spiral scribble loops drawn in magenta and orange on top. At the top of the head there are **horizontal smeared scanline streaks**, a digital glitch / motion-smear cue.
- **Sunglasses:** frames in a multicolour pop-art confetti pattern (orange, pink, blue, green). The lenses reflect a Spider-Man figure inside a green, yellow and magenta mosaic.
- **Costume peeking out:** a red suit `#e04040` and a blue suit `#4050c0`, both with **black halftone dots** at about 45°.
- **Background:** blurred lavender city `#b6b6e4` / `#a29cd1` (sampled). A horizontal band of stretched pixels runs across it at eye level (a glitch smear).

### PDF 013: sketch, Jesús Alonso Iglesias. Miles hanging upside down.
- Two grey marker values (`#8a8484`, `#c8c4c4`) with loose black line. Miles hangs upside down on a single web line with his arms crossed and a sideways glance. The hoodie drapes toward the ground. The spider emblem is drawn as a small black sketch.

### PDF 014: concept painting of Miles's Manhattan, Wendell Dalit (night, elevated subway).
- **Camera:** high, at station-platform height. One-point perspective down a long avenue to a vanishing point at upper left-centre, with the elevated tracks running parallel.
- **Atmospheric perspective:** near buildings are dark maroon-magenta `#6a2040` with **warm amber windows** `#f0c060`. The avenue fades to a **pale violet-white glow** `#d0c8f0` at the vanishing point, so the distance is brighter than the foreground (backlit haze).
- **Street:** grey-violet `#8a88a8`. Red taillights `#ff4030` with **vertical streak reflections** on the wet road. Crosswalk stripes are flat light bars.
- **Signage:** a vertical neon "PINK BANK" sign in violet and white. Pink billboards `#e8a0d0` with visible **halftone dots**, and a pixel/halftone portrait of a woman. "STYLE" and "METRO" in magenta type. A "Flushing Avenue Station" sign. The subway car (L train) is dark grey `#3a3a40` with lime-yellow lit windows `#c8e060` and white headlights. The platform edge is a yellow line `#e8d040`.
- **Graffiti** in magenta and purple on the underside of the track girders, half lost in shadow.
- No ink outlines. Painterly flat shapes with slight brush texture.

### PDF 015: concept art, Patrick O'Keefe. Collider fight: Spider-Man vs. Green Goblin, with "AARGH!!"
- **Value structure:** the foreground is crushed to **near-black** `#0b040b` (sampled): Spider-Man's back, shoulder and legs. The background collider dome is **overexposed near-white** mint and lavender (`#e8f0e8` / `#e8e0f0`). The contrast is extreme, a silhouette against a blown-out field.
- **Halftone use:** where light touches the black foreground, the red `#c02030` and blue `#4040e0` suit patches are rendered as **fine dot halftone** (small light dots on dark). A magenta/pink blob (Goblin's pumpkin bomb or hood) has a **dot-halftone gradient** from magenta `#e040a0` to green.
- **Goblin arm:** dark green `#3a8030` with scales drawn as thin light-green arcs `#80d060` in a fish-scale pattern. The claws are hard red and black shapes.
- **Collider:** the dome is covered in a regular grid of **ellipse panels** (circles in perspective), with concentric rings receding. There is a green-yellow energy beam `#a0e080`, a black singularity dot with **splatter particles**, and white **light bleed** washing up from the bottom edge. A tiny human figure sits in the portal for scale.
- **SFX "AARGH!!":** hand-lettered, jagged, italic capitals, rotated about −20° (rising to the right). The letters grow toward the end. The fill is **black with a grid of white and pale-green dots** (inverted halftone). The outline is a **thin magenta line offset up-left**, with a **green edge on the right side**. This is chromatic misregistration applied to the lettering itself.

### PDF 016: artwork, Yuhki Demers. Peter Spider-Man vs. collider glitch matter.
- **Glitch/void blobs:** black-violet `#0b0919` (sampled) organic blobs filled with **tiny purple and white speckles like a starfield**. Every blob has **offset copies**: a **magenta** `#de415a`–`#e83a8a` copy shifted left and down, and a **lime** `#b0d040` copy shifted right and up. The offset is about 1–2% of image width. There is also a pale cyan halo.
- **Energy tendrils:** squiggly **white lines with a pale-cyan glow** (white core about 6px, cyan edge about 3px at 1400px), looping upward.
- **Halftone:** coarse square-grid dot screens at 0°, used as transition zones between the white glow and the pink or black areas. The dots decrease in size away from the light.
- **Background wall:** pink `#d37fbc` to teal-grey `#8ab0b0` gradient panels with a regular grid of round **studs**. Each stud is doubled with red and teal offset copies (misregistration on background props).
- **Spider-Man:** red `#e03040` with **hard-edged dark-maroon** `#460f17` shadow shapes. Blue areas are flat purple-blue `#2d257e` / `#3b2369` (sampled). The web pattern is **thin black lines drawn over the colour**, not following the shading. **Halftone dots appear only in the terminator zone** between light and shadow. A **pink-white rim light** sits along the mask's left side. The eye lens is white-yellow with a thick olive/black border. **Thin black spider-sense strokes** radiate from the top of the head.

### PDF 017: sketch, Jesús Alonso Iglesias. Miles dazed after a fall.
- Two spot colours only: flat grey `#5f595b` (sampled) and red `#e03a4a`, plus black line and paper white.
- **The fill is offset from the line.** The grey and red fill shapes are shifted a few pixels off the ink lines, and a **white highlight strip** runs along the top edges between line and fill. This is a screen-print misregistration look.
- Comic cues: **stars circling the head** (two black-filled, one outline) with an elliptical orbit line, and a cloud of dust/smoke drawn only as a wobbly outline. The spider emblem is a red circle and spider drawn with a few strokes. The pose sprawls diagonally.

### PDF 018: Setting the Scene opener. "Spider-Man in his natural habitat", Alberto Mielgo.
- **Camera:** straight down. Extreme **three-point perspective** with every skyscraper converging to a vanishing point below and behind the figure. Miles is centred and falls spread-eagle toward the camera, limbs splayed.
- **Palette:** building bodies near-black `#0d0101` / navy `#151638` (sampled) with dense **grids of warm lit windows** `#f0d890` (lit windows about 50–60%, randomly distributed). One **glowing lime-green rooftop** `#9ad020` is a colour accent. A **hot-magenta neon light streak** `#ff40c0` burns out to white at the bottom edge (light bleed at the frame edge, as Gordon describes).
- **Miles:** almost a pure black silhouette with a **thin violet-blue rim light** `#6a60e0` on his right edges, red gloves and shoes, and white lens eyes with a violet glow ring.
- Chapter title "SETTING THE SCENE" in red `#e0304a` on a black band.

### PDF 019: skyline painting, Patrick O'Keefe (top). Street-level Manhattan, Yuhki Demers (bottom).
- **Skyline:** dusk lavender-grey sky `#968eb0`. The city is stacked in **4–5 value layers**, far to near: `#8a84ad` → `#56576b` → `#494c64` → `#362c42` → `#2c1738` (sampled). Scattered neon billboards in pink, lime, teal and yellow. The Empire State Building is lit white. The Brooklyn Bridge is a dark silhouette at left with a string of light points. The water is dark with horizontal light glints. Buildings are flat, with window grids as speckle.
- **Street (Demers):** the foreground is almost black `#0a0818`, with an elevated train structure receding on the left. The vanishing point **glows purple-white** `#8177bd` → `#fefdfe` (sampled) with Times-Square-style billboards. A **tiny Spider-Man swings in the bright gap** at the vanishing point, so the focal point sits at the brightest spot. Yellow taxis `#d8c030`. Orange sodium streetlamps `#f08040` with small glows. The wet road reflects pink and red as vertical streaks. A bus with a lit "032" display.

### PDF 020: concept art, Neil Ross, Craig Mullins and Peter Chan (daylight Manhattan panels on black).
- The page is laid out as **comic panels on a black gutter**, with 5 frames of different sizes.
- **Top-left:** low angle looking up. Miles in a red hoodie leaps as a **dark silhouette** against a cream high-rise. Its windows are **irregular blue-grey rectangles** `#6a7a90`, not a perfect grid: some are wide, some narrow, some light (blinds). A fire-escape silhouette on the left, pale blue sky `#a8c0d8`. Shapes are completely flat.
- **Top-right pair:** looking straight up and straight down at glass towers, with a tiny swinging Spider-Man and web line. Dutch-angled frames.
- **Centre (wide):** a sunlit street. The facades are **abstracted into a patchwork of rectangles** in cream `#ece4cc`, taupe `#a89478`, grey-brown `#6a5e50`, dusty rose `#a07a70` and olive `#8a8660`, like a Mondrian or pixel mosaic. **Long hard flat shadows** `#2a2420` lie across the road. Warm haze bleaches the distance. Small silhouetted pedestrians, a yellow school bus `#c8a030`, a police car, and a tiny red Spider-Man running.
- **Bottom:** an aerial hazy city (painterly Mullins style) and a street with yellow taxis and autumn trees in one-point perspective.

### PDF 021: artwork, Patrick O'Keefe (six night-swing panels, Times Square).
- **Palette:** ultramarine and violet night `#2a2a8a` / `#4a3ab0`, pink `#e080c0`, pure black, red `#d02030`, white eyes.
- **Miles** (black suit) is a **flat black silhouette** with **red accent shapes** (shoulders, emblem, hands, shoes), white lens eyes, and on some panels a **thin cyan/white rim line** `#60d0f0` along one leg or arm edge.
- **Billboards** are giant **AM halftone portraits**: blue-violet dots `#3a3ac0` on white `#e8e8ff`. Dot size carries the image, and the dots are large (about 1/60 of the panel width). Pink cursive script ("Perfect", "…urfe…") sits on top. One billboard uses a **diamond/lozenge LED pattern** instead of round dots. A stock ticker runs white-on-black ("CRSA 751.0 … DOGG 75451").
- **Composition:** steep **dutch angles** of 20–35°, alternating low and high cameras. Web lines are thin black diagonal strokes. An L train. A "42" sign. Miles perched on a ledge seen from above, with the city dropping away in a violet glow (bottom-right). Secondary Spider-Men appear small in the background, so several spider-figures share each frame.
- Panels are separated by white gutters on the page, like a comic layout.

### PDF 022–023: artwork, Zac Retz (pink dusk skyline from Brooklyn rooftops).
- **Sky:** flat pink `#cc75a0` / `#c9729a` (sampled) with slightly darker cloud masses and **drifting patches of halftone dots** in lighter pink and orange (`#f0a0a0`). The patches are round or square dots on a regular grid, placed as isolated rectangles and blobs.
- **Buildings:** flat slabs in **3–4 stepped pink-lavender values** (`#dda2c0` → `#c085a9` → `#85628f`, sampled), getting darker and cooler toward the viewer. **Windows are tiny dot matrices** (grids of 1–2px dots), with occasional clusters of **blue/violet dots** for lit or reflective windows. The Chrysler and Empire State silhouettes are recognisable.
- **Floating ink ticks:** thin black **vertical lines** hug one edge of some buildings, each with a **short horizontal cap or right-angle kink** at the top. They are offset from the shape edge and never close the outline, like a misregistered line plate or a draughtsman's edge accent. This is a key reusable device.
- **Mid/foreground:** rooftops in **cool blue-grey** `#2a3246` / `#7a8aa8` (sampled) with **deep violet-black** shadows `#0d0811`. Satellite dishes, pipes, skylights, a dark water tank. Spiky **lime-yellow** `#c8e030` accents (plants, rim highlights). **Pink and yellow light streaks** of cars on the bridge approach. Pink halftone dot patches on shadowed walls. Mirror-reversed signage ("LOOKOUT POINT").
- **Bridges:** Manhattan and Brooklyn bridges in dark blue-grey, with cables as thin curves.
- **Right page:** two small figures sit on a billboard catwalk (likely Miles and Gwen, in red and blue suits with **halftone dots on the costumes**). The billboard back is dark with torn posters, graffiti scribbles in magenta and lime, and a halftone pattern. Its support struts are black silhouettes, with a "Q-3016" plate.
- Horizontal glitch or smear bands appear in places (stretched pixel rows).

### PDF 024: concept art, Patrick O'Keefe (top and bottom-right) and Yuhki Demers (bottom-left). Building designs by Wendell Dalit (strip).
- **Top (O'Keefe):** Miles leans out of a Brooklyn apartment window at night, seen in profile as a **pure black silhouette** with a red shoulder and a **red spray-style spider emblem** `#d02030`. The brick wall is dark brown `#3a2a28` with lighter mortar lines `#5a4038` in flat blocks. Through the window: a **warm amber lamp** `#f0b050` drawn as a hard-edged glowing disc, and a **TV glow** `#6080d0` showing Spider-Man news. The street below recedes into **reddish-mauve haze** `#8a4a50` with round glowing streetlamp discs. Steam plumes rise. Thin pink/red diagonal lines at the top (web lines). This is warm Brooklyn at night.
- **Bottom-left (Demers):** Grand Army Plaza arch at night with a white **spider-web drawn inside the arch opening**. Violet sky `#3a3a90`. Streetlamps have **large concentric stepped halo rings**: flat circles, each slightly lighter than the one outside it, with no gaussian glow. Trees are lit warm orange `#e08040`.
- **Bottom-right (O'Keefe):** a low, muted slate-blue skyline across the water at dusk `#4a5068`, with sparse warm lights.
- **Strip (Dalit):** the same Brooklyn tenement elevation set as p.011.

### PDF 025: concept art, Alberto Mielgo.
- **Top:** Spider-Man (dark torso, blue legs) stands on a rooftop ledge with his back to camera and hands clasped behind him. The city is **posterized into a few flat hues**: ochre `#d0a040`, sage green `#8aa060`, violet `#8a5ab0`, teal-grey `#6a8a88`, magenta. Windows are **irregular dark glyph-like marks**, almost like text. The **shadowed mid-ground is a field of large dark halftone dots** over purple, used as a shading value. The figure is a silhouette with a **pink-red rim light** `#e05080` on its left edge. Painted signage ("BUS", "33"). Ledge and railing are drawn with horizontal lines.
- **Bottom:** a giant billboard of a woman's eyes ("THE CONTACTS · wednesdays on THEMN9") rendered in **ring-shaped halftone dots in near-CMY colours**: magenta `#e040b0`, cyan `#60c0e0`, yellow `#e0e040`, violet `#6040a0`. Spider-Man, tiny, falls in front of it. Floodlight fixtures at the bottom throw a **white bloom** upward. The dot pattern turns the billboard itself into a printed comic panel inside the scene.
- Christina Steinberg quote set in white on black between the images.

### PDF 026–027: concept art, Alberto Mielgo (Midtown street spread, caption box and speech balloon).
- **Caption box:** a flat **magenta rectangle** `#df5ba7` (sampled) with a **black outline about 3px**, containing **hand-lettered all-caps comic text** in black. Key words ("SPIDER-MAN") are **bold italic**. The text is Silver-Age narration: *"SUDDENLY, SUMMONING EVERY REMAINING BIT OF STRENGTH IN HIS AMAZINGLY POWERFUL BODY, THE SPIDER-MAN EXERTS ONE LAST MIGHTY EFFORT AND FLIPS OVER…"* It sits in the upper-left of the frame, overlapping the scene.
- **Speech balloon:** a white ellipse with a black outline and a long thin pointed tail, containing "?!?" in heavy black lettering. It comes from a cyclist who sees Spider-Man flip overhead (p.027, top-left).
- **Foreground truck:** dark violet-black `#262240` (sampled). The side panel shows the city as a **chrome reflection** in pink and lilac `#af81aa`, with **vertical-line hatching** over the red reflected light. The trim has pixel-stepped edges. Taillights are hard circles, red `#c63b3a` with **white LED dots**. Rivet dots are painted along the panel.
- **Buildings:** candy palette: pink `#e8b0d0`, lilac `#b890d0`, mint `#a8e0c0`, mustard `#e8d040`, brick. Arched windows. Blue and orange water tank.
- **Fictional billboards** as flat poster graphics: "TITANO VS POE LANDROVER – THE REMATCH" (boxing), "THE DANGEROUS BLUE WOMAN" (a pink-haired woman with a gun, "BANG", "Ktv"), a "D…" fashion ad with a man in a suit, "…IS BACK". A yellow "BACK" sign, a striped red and white awning, and a **dot-halftone orange-red billboard** at top right on p.027.
- **Bus (p.027):** pink-lavender body `#d8b0d8` with a navy lower panel `#101232`. An **orange LED route sign** "M3T" `#f08030`. **Graffiti tags** in red `#e03040`, violet `#a060e0` and lime `#c0e040` spray paint, with blurred black marker tags ("The …"). Realistic stickers: "SAFETY'S OUR GOAL / How Are We Doing??? CALL 511", "WARNING WIDE TURNS", "THIS BUS RESPECT CYCLIST", "+transportation". Rear lamps are red circles with LED dot rings. There are lime and pink paint smudges on the body.
- **Upper left:** the Peter Spider-Man mid-flip, red and blue with a dark torso. A distant building has an LED billboard "BUY … TODAY" in dot-matrix and a "3tv" logo. The far city is white-pink haze.
- Across the spread, surfaces carry **loose painted swatches** (lime, pink) that don't follow form, like stray colour-plate marks.

### PDF 028: Peter Parker (RIPeter). 2D design by Shiyoon Kim, 3D design by Omar Smith, paint by Wendell Dalit.
- Front-on bust on a warm grey background `#b9b0a9` (sampled).
- **Shape language:** a **long, narrow, straight wedge nose**, a strong square jaw with a slight cleft, high cheekbones, and heavy straight brows that angle slightly upward (worried-kind expression). Big pale-blue irises `#7080c0` with dark rims. A faint smile. The head is taller than it is wide, a classic leading man.
- **Hair:** golden `#d8b050`, sculpted into **ribbon-like clumps** with a swept-up quiff and a few loose strands breaking the silhouette. Shadow tone `#a07830`.
- **Skin shading:** light `#ddaa8d` (sampled), shadow `#b88068`. There is a **sharp terminator under the cheekbone and along the nose**. Otherwise the planes are smooth with minimal gradient, a CG sculpt painted to read as 2 or 3 tones.
- **Costume:** an olive-green jacket `#6a6a30` with a yellow-green lit edge `#b0b060`, over the red Spidey suit `#b04e54` / `#743344` (sampled) with black web lines.

### PDF 029: concept art, Alberto Mielgo (above). Early sketches, Jesús Alonso Iglesias (below).
- **Mielgo, classic Spider-Man:** low angle, torso crops the frame. **Web pattern drawn as rows of scallops**: each web cell is an arch (fish-scale) hanging between vertical web lines. Lines are thin black-brown and slightly thicker at the bottom of each arch. The spider emblem is a bold black glyph.
  - Suit red `#bf506f`, with **specular highlights as hard pink-white shapes** `#c67298`–`#f0a0b0` on the chest and shoulders. Shadows are **flat maroon** `#792731` and **navy** `#121341` / `#361d56` (sampled). There are 3–4 value bands with no gradients, which makes the suit read as glossy.
  - Background: a flat magenta wall panel `#c163a7` with a **flat purple cast shadow** `#873471` (sampled). It sits between windows with **horizontal blinds**, drawn as horizontal lines over a grey-green city view `#687074`.
- **Iglesias sketches:** lanky Spider-Men, about **7.5–8 heads tall**, with long arms and big splayed hands, drawn in red marker `#b02030` and pale cyan `#a8d8dc` (the blue areas are rendered in light cyan), with loose ink. Poses: a frog-leg jump, a slouched walk, wall-crawling.

### PDF 030–031: colour script, Dave Bleich (fold-out).
- A grid of widescreen thumbnails (about 2.4:1) on a black ground, 3 columns by 6 rows per page. Each beat gets **one dominant hue**, and **most frames are more than 60% near-black** with one lit region, consistent with Gordon's "dark shapes with glimpses of light".
- **Beat keys observed, in order:**
  1. Brooklyn street, sunny: **warm yellow-ochre** `#e0b040` walls with graffiti tags and a fire hydrant.
  2. Visions Academy: red brick, autumn trees, white modern building, "VISIONS" banner.
  3. Outdoor event: red, white and blue **balloon arches** and a "PERFECTION" banner, rows of chairs.
  4. Miles's dorm room: **hot pink/red** interior, Miles in his blazer uniform.
  5. Night street: Miles crouched in a hoodie, **headlight white-blue bloom**, candy-coloured shopfronts, violet-blue palette.
  6. Subway tunnel: **dark grey-green**, Miles in red, a spider in the foreground.
  7. Peter Parker's funeral: grey stone church, police in blue, flowers.
  8. Costume shop: **yellow-green** interior, cheap Spider-Man mask reflected in a glass counter.
  9. Night vigil: Miles in the cheap costume, a **red-pink ground under a navy starry sky**, elevated train, a headstone.
  10. Alchemax in the woods: glass building among autumn trees, misty teal and red.
  11. Two **black silhouettes with green lens eyes** against a teal wall of round lights.
  12. **Sterile white corridor** with a small dark silhouette (Alchemax lab).
  13. Dark blue apartment with a green-costumed figure (Prowler reveal).
  14. Queens street: **clapboard houses in yellow, sage and blue**, power lines, autumn trees (Aunt May's street), bright daylight.
  15. The Prowler (purple mask, green armour, purple cape) against a **shallow-depth-of-field** blurred background of Queens houses.
  16. Collider glitch: a **white-grey corridor with a band of black particle mass** between mirrored machinery.
  17. Miles falling in a **grey-white void** with black spheres and **chromatic fringing** (thin colour edges).
  18. Kingpin shocked: **monochrome pale cyan** `#a8d8e8` with a **white starburst** and ink splatter around a hand, like a comic splash panel.
- **Fold-out, page 031:**
  - Morales family apartment, **warm yellow/orange**.
  - Inside a police car, dark blue.
  - Uncle Aaron's apartment: dark, with a red sofa, big speakers and **neon scribble graffiti** in pink on the wall.
  - Alchemax interiors, dark.
  - The collider firing a **green-cyan beam** with falling particles.
  - Kingpin as a black mass in a green-tinted control room.
  - Elevated train at night, blue.
  - Speeding subway window with **horizontal smeared colour streaks** in purple, pink and white (speed smear).
  - Dorm at night with a **warm desk-lamp pool**.
  - Glass lab.
  - A **burning orange forest seen from below** (yellow-orange and red trunks radiating up).
  - Dusk skyline with orange lights.
  - A **light shaft** into a dark lavender alley.
  - Blue night rooftop.
  - **Red-magenta street** with Miles as a running silhouette and headlight bokeh.
  - Classroom whiteboard with Miles's **face left blank** (a faceless placeholder).
  - **Orange-gold sunset under the Brooklyn Bridge** with Miles sitting on the railing.
  - Title card: **"the SPIDER-MAN!"** in white retro script, knocked out of a blue brush-stroke blob on a red field.
  - **Right half:** a top-down sewer; dorm in daylight; a bright school hallway (teal lockers, yellow trim, "EXIT"; Miles and Gwen); wreckage with **fiery orange edges**; purple alley with a green-eyed shape; a red-lit room; Peter B. tied up, in blue; a night rooftop over warm city lights; Aunt May's living room (red sofa, colourful pillows, Spider-Man at the window); the **Spider-cave** (dark blue, red carpet, suits in cases); Aunt May's **warm yellow living room with all the Spider-People** (red SP//dr mech, Noir, Ham, Gwen, Peter B., Miles); a dark blue-green street confrontation; the dorm at night with Miles in the black suit; a dark blue chase; the collider beam in **lime-green and cyan** between chrome machines.
- **Rule:** plan scene palettes as a sequence. Warm yellow means home and safety. Pink and red mean Miles's personal and emotional spaces. Blue and violet mean night and hero work. Green means the collider and Alchemax danger. White means sterile corporate space. Orange-gold means catharsis.

### PDF 032–033: fold-out artwork, Justin K. Thompson, Wendell Dalit, Alberto Mielgo and Yuhki Demers.
- **Left column (3 frames on black):**
  1. Miles leaps across a **coral/salmon sky** `#e8907a`, framed by black building silhouettes. The dark left shape is shaded with **horizontal parallel line hatching** in red-orange lines. Edges carry halftone dot fringes. Jagged green shard shapes and yellow ring details (fire-escape lights). This is fully comic-page.
  2. Miles leaps over night traffic toward camera. A red car on the left has **jagged zig-zag highlight shapes** (lightning-shaped reflections). A yellow taxi on the right has **large hard-edged bokeh discs** `#f08040` for its headlights. The vanishing point burns pink-white. Deep red palette `#c02020`.
  3. An electronics-store window at night: a **wall of TVs** all showing Spider-Man and Peter Parker news, "SALE" tags, an "OPEN" neon sign. Silhouetted viewers stand in front. Cool blue-grey light `#8a98b0` against black.
- **Big image (032–033):** Miles **hangs upside down** in his hoodie. The hood and body are **near-black navy** `#1a0f35` (sampled) with **violet rim lines** `#6a50e0` tracing the fabric folds. The drawstring aglets are orange and blue ringed ovals. The cheap mask is dark red `#5f1545` with black scallop web lines and a **red inner glow** `#d02040` between the eyes. The lenses are pale pink-white `#f0d0e8` with thick lavender borders. Behind him is a **pale blown-out sky** `#e4f1f7`. Buildings hang **upside down** from the top of the frame: purple undersides `#302b5b` with a window grid, small **yellow vertical capsule** light reflections in each pane, and a lime billboard `#9ac040` and a pink billboard (mirrored text, "…BLUE WOMAN"). A plane with a white contrail. **Fine film grain** over the sky. The billboard text has **horizontal smear/glitch streaks**, and its edges carry **multiple parallel offset lines** (misregistered edge strokes).

### PDF 034: WHO IS MILES MORALES? (book 26). Concept art, Alberto Mielgo.
- **Two early suit concepts:** a home-made **red `#d8303a` and ultramarine `#3a3ac0` jumpsuit** with a white full-length front zip, **purple cape** `#8a40b0`, **ochre knee pads** `#c8a030` drawn as big ovals, light-blue cuffs `#78a8d8`, and red/white high-top sneakers (Jordan-1 style). A wristwatch on the arms-crossed pose.
  - Colour fills are **flat and slightly offset from the ink line**, with white slivers showing at edges. There are pink highlight planes on the red. Line work is sparse, loose and broken.
  - **Motion lines:** short black strokes and arrow-like flicks around the high kick.
  - **SFX "KICK":** magenta `#d050c0` letters with a lighter pink offset, a faux-3D extrude and a white inner highlight, jagged and tilted about −30°.
  - **Thought bubble:** a loose hand-drawn ellipse with "THOW!!" and trailing small circles "o o" leading to the head.
  - The head carries its own purple overlay tint.
- **Head study (right):** skin **mauve-violet**, `#c78c9d` lit, `#804968` mid, `#683958` shadow (sampled). **Translucent flat purple shadow shapes** overlap with hard edges. There is a lighter vertical strip on the forehead. Lilac lips `#9a70b0`. Grey-green eyes glance sideways. Big ears.
  - **Hair:** dense black **spiral loops** on top, with **fine cross-hatching in blue-grey** for the faded sides.
  - Suit collar: red with black web lines and a blue gusset.
  - Proportions: the face is broad at the cheeks, with a small chin and a wide nose.

### PDF 035: concept art, Alberto Mielgo (Miles profile).
- Large graphic profile facing left. The left of the page is white. A **pale mint** `#a7d1d0` (sampled) panel sits behind the back of the head.
- **Skin:** deep plum `#391c3c` / `#3e223d` (sampled) with a lilac-blue light plane `#8070c0` at the brow and a warm brown plane near the mouth. The skin carries a **comb/striation texture**: bands of short parallel vertical strokes arranged in horizontal rows across the forehead and jaw, like dry-brush scanlines or a glitch comb. The bands shift horizontally relative to each other.
- **Ink:** thick, tapered black brush strokes that **don't close**: eyelid, nostril, lip line, ear spiral, jaw and neck lines. Hair is heavy black **scribble loops**. The eye has a single warm specular dot.
- **Shirt:** flat red `#f54556` with a hard **maroon shadow shape** `#6a1024` and a white stripe (track jacket). At the bottom edge, a sliver of blue.

---

## Recipes

1. **Defocus by misregistration, never blur.** For each layer or pixel, compute `d = abs(depth − focusDepth)`. Draw the layer three times: a **magenta/red plate offset by (−k·d, +k·d/2)**, a **cyan or lime plate offset by (+k·d, −k·d/2)**, and the key plate at zero, composited with multiply or screen. Keep every plate sharp. Useful offsets: 0px in focus, up to about 1.5% of frame width for far background, about 2% for dramatic glitch objects (p.016, p.017).

2. **Value-band shading (no soft gradients).** Quantize N·L into 2–4 bands with `step()` or a very narrow `smoothstep` (width under 0.02). Pick band colours by hue-shifting, not darkening: red lit `#e03040` → shadow `#792731` → core `#460f17`, and blue lit `#3b3bc0` → `#2d257e` → `#121341`. Add a **hard pink-white specular shape** for glossy suits (p.016, p.029).

3. **Halftone only in the transition zone.** Across the light/shadow terminator band (e.g. 0.35 < N·L < 0.55), overlay an AM dot screen at 45°. Dot radius comes from local luminance, and pitch is about 0.6% of frame width. The rest of the surface stays flat colour (p.016 Peter suit, p.015 foreground).

4. **Garment and billboard halftone as texture.** Fabric: a uniform grid of black dots (pitch 0.6–0.8% of width, radius about 25% of pitch) over the flat garment colour, continuing across logos (p.008, p.012). Billboards: large dots (about 1.5–2% of width) whose radius encodes the image, in one or two inks (blue-violet on white), or **ring dots in CMY** for a printed-poster feel (p.021, p.025).

5. **Night city (Manhattan: cool).** Building bodies near-black navy/violet `#151638`–`#2c1738`. Windows are small rectangles on a grid, about 50% lit with a random warm tone `#f0d890`/`#f0c060`. Fade distant layers toward a pale violet glow `#c8b8e8`–`#fefdfe` at the vanishing point, so the distance is brighter than the foreground. Add 1–3 saturated neon accents (hot magenta `#ff40c0`, lime `#9ad020`). Draw wet-road reflections as vertical streaks under each light (p.014, p.018, p.019).

6. **Pink dusk skyline (Zac Retz style).** Sky flat `#cc75a0`. Stack 4 layers of flat rectangular slabs stepping `#dda2c0` → `#c085a9` → `#85628f` → cool blue-grey `#2a3246` in the foreground. Fill slabs with a dot-matrix window grid (1–2px dots, 4–6px pitch). Scatter 5–10 **floating halftone patches** (rectangles or blobs of lighter dots) over sky and buildings. Add **ink ticks**: 1px black vertical lines offset 3–8px from some building edges, each with a 6–12px horizontal cap, never closing the outline (p.022–023).

7. **Line plate off-register from the colour plate.** Draw the flat fills first, then stroke the ink outline translated by (2–4px, −2px) with a slightly jittered path. Leave a thin white or light sliver between them on the lit side. It reads as screen print and hides CG perfection (p.017, p.034).

8. **Hero silhouette at night.** Fill the character as `#0a0a14`. Add one **thin rim line** (1.5–3px) on the side facing the light, in cyan `#60d0f0` or violet `#6a60e0`. Keep only the costume's accent shapes in colour: red `#d02030` emblem, gloves and shoes. Eye lenses are flat white with a thin glow ring. Place the figure where the background is brightest (p.018, p.019, p.021, p.024).

9. **Two-colour face key (Mielgo).** Base skin is a deep plum `#1d0e18`–`#391c3c` core shadow. Add one **warm key shape** (magenta-red `#c04060`) on one side and one **cool fill shape** (violet-blue `#5a5ad0`) on the other, both with hard edges. Features are unclosed, tapered black brush strokes. Hair is black spiral scribble loops, with fine cross-hatching on faded sides. Optionally add bands of short parallel striations across the forehead as texture (p.012, p.034, p.035).

10. **Stepped glow halos.** Draw light sources as a hard disc plus 3–5 **concentric flat rings**, each about 6–10% lighter than the one outside it (e.g. sky `#3a3a90` → `#44449a` → `#5050a4`). Headlights and lamps close to camera are **large hard-edged bokeh discs** in orange `#f08040` (p.024, p.032).

11. **Comic typography in the scene.**
    - **Caption box:** a flat magenta `#df5ba7` or yellow rectangle, 3px black stroke, all-caps hand-lettered font, key nouns in bold italic, placed top-left.
    - **Speech balloon:** white ellipse, black stroke, a long thin tail.
    - **SFX:** rotate −15° to −30°, scale letters up from first to last, fill with an inverse dot pattern (light dots on black) or a flat magenta. Add an **offset second-colour outline** (magenta up-left, green right) and optionally a pink extrude (p.015, p.026–027, p.034).
    - **Thought bubble:** a loose ellipse with 2–3 trailing circles.

12. **Spray-paint emblem and texture.** Fill the shape with noise stipple (dark speckle density rising toward the edges). Add an **overspray halo** (the shape blurred about 10px at 15–25% opacity in a lighter tint). Add **drips**: vertical strokes with rounded bulb ends, of random lengths, from the lower edge (p.001 shoulder, p.007 title).

13. **Daylight facade mosaic.** For sunny Manhattan, fill building faces with random axis-aligned rectangles drawn from 4–5 desaturated tones (cream `#ece4cc`, taupe `#a89478`, rose `#a07a70`, olive `#8a8660`, grey-brown `#6a5e50`). Add long hard flat shadows `#2a2420` on the ground, and wash the far distance to warm white (p.020). For Brooklyn blocks, use 5–6-storey boxes in brick, ochre or mustard, with zig-zag fire escapes, a storefront band with signage, graffiti at street level and pale water-tower silhouettes behind (p.010–011).

14. **Collider glitch matter.** Organic black-violet blobs `#0b0919` filled with tiny purple and white star speckles. Each blob gets a magenta `#e83a8a` copy shifted left-down and a lime `#b0d040` copy shifted right-up, plus a pale-cyan halo. Add white glowing tendrils (white core, cyan edge). Fade them into the scene with a **coarse 0° square-dot halftone gradient** (p.016). For the collider beam, use lime-green `#8ac838` and cyan between chrome machinery (p.031).

15. **Dark exposure plus edge light bleed.** Let 60–80% of the frame fall to flat near-black shapes, and pick one region to "expose for". Add a coloured light leak entering from one frame edge (magenta `#ff40c0` fading to white, or white-mint). Give each sequence one dominant hue, per the colour script: yellow for home, pink for Miles's room, blue-violet for night, green for collider danger, white for the lab, orange for resolution (p.016 quote, p.018, p.030–031).

---

## Best quotes

1. *"Ideally, we want to be able to stop every frame of the film and have it look like an illustration."* Justin K. Thompson, Production Designer (p.017)
2. *"We thought, 'What if the camera didn't de-focus like a lens?' So, we splintered and offset the image in a way that is similar to a misprint. It has a really cool feel to it that creates this illusion that something is printed on the screen."* Danny Dimian, VFX Supervisor (p.017)
3. *"In our artwork we broke down colors and values into defined shapes with short or no transitions to give them a more illustrative feel."* Dean Gordon, Art Director (p.016)
4. *"We used dark shapes, with just glimpses of light at times. We always think about what part of the shot we're exposing for. We're bringing in light bleeds at the edge of frames."* Dean Gordon, Art Director (p.016)
5. *"It led us to frame modulation to get this crunchy, crispy version of pop art… You want crisp pop with aggressive clarity."* Josh Beveridge, Animation Supervisor (p.017)
6. *"What's interesting about art is all the imperfections that go hand in hand with a human creating things. We had to find a way to break things."* Danny Dimian, VFX Supervisor (p.017)
7. *"Our Manhattan is a caricature of the real one."* Yuhki Demers, Visual Development Artist (p.018)
8. *"The dots, the screen tones, the panels, the way everything works in a 3D space—the goal was to make you feel like you're living inside a comic book."* Justin K. Thompson (p.017)
9. *"We could perhaps create a post-modern Spider-Man."* Phil Lord, Executive Producer (p.013)
10. *"What the mask says is that when you put it on, you have the heart and soul of a hero."* Avi Arad, Producer (p.012–013)
