# Chunk 03 — PDF pages 071–105

Source: *The Art of Spider-Man: Into the Spider-Verse* (Ramin Zahed, Titan Books 2018). I looked at every page in the range at 1400px and zoomed into the 3277px scans for halftone, line and caption detail. Hex values combine pixel sampling with visual estimates. Treat them as ±10% because the scans are printed and slightly muddy.

---

## Section map

**PDF→book page offset.** The book's printed page numbers go 58 (PDF 066), 60 (PDF 068), then a **4-page unnumbered fold-out (PDF 070–073)**, then 62 (PDF 074). So:
- PDF ≤069: book = PDF − 8
- PDF 070–073: unnumbered fold-out (between book pp. 61 and 62)
- PDF ≥074: book = PDF − 12 (074→62, 082→70, 088→76, 092→80, 098→86, 101→89, 103→91, 104→92, 105→93)

Running headers: left pages read "The Art of Spider-Man: Into the Spider-Verse", and right pages carry the chapter name in red.

| PDF | Book | Chapter / section | Content |
|---|---|---|---|
| 071 | fold-out | **Blurred Vision** (chapter began before this range) | Right half of the storyboard fold-out: Miles' "sticky hands/feet" dorm sequence (storyboards by Ryan Savas) |
| 072–073 | fold-out | Blurred Vision | Lighting keys by Wendell Dalit: the sticky sequence at school, and Miles' face reading the comic |
| 074–075 | 62–63 | Blurred Vision | The in-film comic *True Life Tales of Spider-Man*, hand-inked by Marcelo Vignali |
| 076–079 | 64–67 | Blurred Vision | Ganke (Miles' roommate): final art, expression sheets, early concepts, cut-scene storyboards |
| 080–081 | 68–69 | Blurred Vision | Miles' dorm room (Yuhki Demers); store-bought Spidey suit (Patrick O'Keefe) |
| 082–087 | 70–75 | **Miles Meets the Spider-Men** (chapter opener, p.082) | Subway train depot / "room where Miles first encounters Spider-Man", Spidey-sense concepts, train room, control room, Collider-firing sequence |
| 088–091 | 76–79 | Miles Meets the Spider-Men | The Collider / Atlas Room (Patrick O'Keefe) |
| 092–093 | 80–81 | Miles Meets the Spider-Men | Green Goblin |
| 094–095 | 82–83 | Miles Meets the Spider-Men | Spider-Man's funeral in the snow; press conference lighting keys |
| 096–097 | 84–85 | Miles Meets the Spider-Men | Mary Jane Watson |
| 098–103 | 86–91 | Miles Meets the Spider-Men | Peter B. Parker (the older Spider-Man): turnaround, sketches, faces, concepts, hallway piece by Alberto Mielgo |
| 104–105 | 92–93 | **Out of the City** (chapter opener) | Alchemax Labs intro text; forest-road night painting spread |

---

## Text insights

### Comic-book language: the in-film comic (Blurred Vision)
- **The comic is a real prop inside the film.** When Miles starts to suspect he has powers, he finds a Spider-Man comic that tells the hero's origin. The filmmakers created a real comic for this "as homage to the source material by including a specially created comic book in the actual movie." (narration, PDF 074)
- **Who drew it.** Production designer **Justin K. Thompson** asked **Marcelo Vignali**, a Sony Pictures Animation veteran, to draw several pages "paying homage to the classic version of the property." Vignali was production designer on *Hotel Transylvania* and art director on *Surf's Up* and *Smurfs: The Lost Village*. (PDF 074–075)
- **Secrecy.** Vignali had seen none of the film's artwork or character designs, only the trailer: "This project was so secretive, that although I work at the studio, I hadn't seen any artwork or character designs." (Vignali, PDF 075)
- **References were deliberately retro.** "They didn't want a modern look for the comic, so we went back to Steve Ditko's classic version." The first Ditko issues had little origin detail and no drawings of Peter Parker, so he also used **John Romita Sr.** for the origin details. Vignali was also a fan of the 1967–1970 animated series. (Vignali, PDF 075)
- **What the comic shows.** It tells how the film's Peter Parker got his powers **twenty years before** the events of the movie. Its look is "pulpy … with thick dot screen effects". (narration, PDF 075)
- **How it was made: hand ink, fake print, then texture.** The linework was inked by hand "the way the old masters did". The print artefacts of offset lithography were then **faked digitally** and the result was mapped onto the prop in the film. Vignali: "Working in computers is easier for large images that fill the big screen, but the result has a certain look that wasn't right for this task. After the inking was done, we had to fake the offset lithography and map it on the film digitally to replicate that old pulp quality." (PDF 075)
  - Rule for code: when an image is meant to be a printed comic, generate the ink layer first, then run a separate "print simulation" pass (dot screens, plate offset, paper tint) before using it as a texture.
- **Cover gags and details** (PDF 074, read from the art):
  - "12¢" price and a "15 AUG" box (a nod to *Amazing Fantasy* #15, Aug 1962).
  - A seal reading "APPROVED BY THE CABIN FEVER CF PRODUCTION CODE", parodying the Comics Code seal.
  - "MV" corner box (Marcelo Vignali), "The Origin of SPIDER MAN" banner, and a yellow "ALSO IN THIS ISSUE" box.
  - Yellow balloons read "THOUGH THE WORLD MAY MOCK BILLY BARKER THE TIMID TEEN-AGER… …IT WILL SOON BE AMAZED AT THE AWESOME MIGHT OF… SPIDER-MAN!"
- **Interior pages mirror Miles' own scene.** Young Peter, in glasses, sticks to ceiling tiles and falls through the ceiling. The balloons read "HOW IS THIS POSSIBLE?", "PLEASE STOP STICKING!" and "WHAT IS HAPPENING TO ME?", with the SFX "CROCK". Other panels read "OH MY GOD, THERE'S A MAN ON THE WALL!" and "BEEP", "HEY, I'M DRIVING HERE!" / "WHY DON'T YOU WATCH WHERE YOU'RE … FLYING!" (PDF 074–075)

### Character design: Ganke Lee (Miles' Academy roommate)
- **Built as Miles' opposite.** Ganke is "extremely happy to be at the school" and wants every academic opportunity. Miles doesn't know "if he really wants to achieve anything"; Ganke is "the ultimate overachiever". (narration, PDF 076 & 078)
- **His role was cut back.** Ganke originally had a bigger part. The filmmakers "decided to develop his storyline in future movies about Miles Morales." (PDF 076)
- **Thompson on his personality:** "He is one of the most gifted students at the Academy… We see him stay up all night working on his quantum entanglement thesis. He's so single-mindedly focused that he seems completely oblivious to anything his roommate might be up to." (Justin K. Thompson, production designer, PDF 076) Design takeaway: a focused, oblivious character is a comic foil for Miles' chaos (see the storyboard of a shocked Ganke with Miles on the ceiling).
- **Payoff.** Ganke is a big Spider-Man fan, and he only learns Miles' secret in the final sequence: "That is really the beginning of their friendship." (Thompson, PDF 078)
- **Cut material.** Storyboards by **Riccardo Durante** "from a cut scene show Ganke's earlier involvement in the adventure" (PDF 079). The boards show him in a forest with Peter B. and Miles.
- **Credits:**
  - PDF 076: final character art paint by **Wendell Dalit**, expression sketches by **Shiyoon Kim**, story art by **Paul Watling**.
  - PDF 077: early concept sketches by **Sei Riondet**, **Jim Mahfood** and **Jesús Alonso Iglesias**.
  - PDF 078–079: early development sketches by **Shiyoon Kim**.

### Environment design: Miles' dorm room
- **The set is character.** "This set is the first glimpse we get of Miles' soul… With echoes of his uncle's apartment, the backdrop really cements the idea that, for the most part, Miles is a normal teen with normal problems associated with that age. We worked hard to make it feel just messy enough!" (**Yuhki Demers**, artist, PDF 081)
  - Rule: a room's contents are exposition. Use pop-culture props, echo another location's palette (Uncle Aaron's apartment), and calibrate the mess ("just messy enough").
- **Store-bought Spidey suit.** The cheap packaged suit Miles buys was designed by **Patrick O'Keefe** (PDF 081).

### Environment design: the underground train depot ("Miles Meets the Spider-Men")
- **Story frame: down the rabbit hole.** Miles finding the Collider world under the subway "echoes that of Alice as she falls through the rabbit hole." (narration, PDF 082) He keeps going "deeper into the rabbit hole" when he takes the wrong path, thinking it is the exit, and ends up inside the Collider (PDF 088).
- **Setting and staging.** "When Miles gets pulled into the action, the Green Goblin and the original Spider-Man are right in the middle of fighting inside this big, abandoned, underground subway train depot… The filmmakers imagined that engineers had been using the abandoned tracks of transport equipment and materials underground. When Miles falls into the scene, he's simply trying to avoid being crushed by the gigantic Green Goblin. **We made sure to add plenty of obstacles for Miles to hide underneath** as the fight rages around them." (Thompson, PDF 082)
  - Rule: design an action set as a field of cover objects (flatcars, crates, collider segments), so a small character can move between hiding places while a giant fights overhead.
- **Kingpin's ownership is shown on the props.** Zac Retz's wrecked-depot concept has shipping containers stencilled **"FISK"** (PDF 084, read from the art).
- **Credits:**
  - PDF 082: "The room where Miles first encounters Spider-Man" by **Zac Retz**.
  - PDF 083: artwork by Zac Retz; "Concept art of the subway tunnels" by **Craig Mullins**.
  - PDF 084: concepts by Zac Retz.
  - PDF 085: "Train room concept" by **Bastien Grivet and Jessica Rossier**.
  - PDF 086: control room and server corridor by **Patrick O'Keefe**.

### FX: Spider-sense
- **Dean Gordon's concepts** (PDF 084–085): "Spidey-sense concept art by Dean Gordon." Visual rules are in the next section.
  - The whole frame collapses to **one or two flat inks**.
  - Comic "focus lines" radiate in from the frame edges.
  - The danger shape (the oncoming train) is printed in the darker or complementary ink.

### Environment / FX: the Collider (Atlas Room)
- **The Atlas Room** is the main room that houses the Collider. In Brian Michael Bendis's comics the Collider is a smaller **hand-held device**; the film needed "a much more cinematic device". (narration, PDF 088)
- **Real reference, then pushed further.** "The comic introduced audiences to the Multiverse, but we wanted to go much bigger for our version of the Collider. We looked closely at the Large Hadron Collider in Geneva, which is the world's largest and most powerful particle collider. [It lies in a tunnel that is 17 miles in circumference and 574 feet deep!] But we knew, ours had to be more fantastical and magical." (Thompson, PDF 088)
- **Reflective material is the colour strategy.** "We were fascinated by the highly reflective materials we saw covering the real-world colliders… I wanted it to be a kaleidoscopic array of colors—with the bright, saturated blues, yellows, and reds reflecting off of the mirror-like gold and the chrome. I felt like it worked out better than I hoped when we started to see reflections of Miles, Peter Parker, and the Green Goblin on the surfaces, all echoing the Multiverse itself." (Thompson, PDF 088)
  - Rules: chrome and gold surfaces act as colour multipliers. Saturated primaries (blue, yellow, red) should appear as reflections on metal, not as paint. Character reflections on the machine are a thematic device: many copies of the self, as in a multiverse.
- **Credits:**
  - PDF 088–089: concept paintings by **Patrick O'Keefe**.
  - PDF 090–091 ("next spread"): painting by O'Keefe.
  - PDF 087: the 15-frame Collider-firing sequence carries no caption.

### Character design: Green Goblin
- **Why he's a monster.** He is "one of the first villains we encounter", first seen by Miles "in the Assembly Room fight scene with Peter Parker's Spider-Man". In the original Miles Morales comics by **Brian Michael Bendis and Sara Pichelli**, "the Goblin was more of a monster—not merely a powerful guy in a suit." (narration, PDF 092)
- **Scale as design.** "In an animated movie you can play around with the limits of reality… Green Goblin doesn't have a big part in the movie, but we thought we could kick things up a notch by making him about **twenty-two feet tall**." (Thompson, PDF 092)
- **Reveal him by silhouette, like a movie monster.** "We already saw Andrew Garfield fight a lizard, so we thought it would be cool to have Spider-Man fight a Godzilla-like monster. We only had him for this one scene before he blows up, so the filmmakers wanted to have as much fun with him as possible. They wanted to introduce him like the **T-Rex in *Jurassic Park***. The audience can see his **outline getting closer**, and he's this giant figure looming over them. Miles is in awe and just trying not to get crushed…" (Thompson, PDF 092)
  - Rule: introduce a giant by silhouette/outline first, and let it grow in frame before revealing detail.
- **Credits.**
  - Story art by **Peter Ramsey** (director). Colour concepts by **Jesús Alonso Iglesias** (below left and centre) and **Alberto Mielgo** (below right). (PDF 092)
  - Final (PDF 093): 2D design by **Shiyoon Kim**, paint by **Wendell Dalit**.

### Environment: the funeral
- "The snow provides a somber setting for a hero's funeral. Artwork by **Robh Ruppel**." Below it is artwork by **Bastien Grivet and Jessica Rossier**. (captions, PDF 094)
- Story art by **Mark Ackland**. "Lighting keys of the funeral scene by **Robh Ruppel and Seonna Hong**." (PDF 095)

### Character design: Mary Jane Watson
- She was first introduced in 1965 and is Peter Parker's love interest and "(sometimes) wife". Her role is small, but the filmmakers thought fans would enjoy spotting her. (narration, PDF 096)
- **Iconic silhouette over screen time.** "She's an extremely important character in the Spider-Man canon, but she had very little screen time. So, I wanted her to have a classic, iconic look that would be instantly recognizable. She is beautiful, with **striking red hair**, and a very specific **jagged cut on her bangs** for which she's known. When Peter Parker sees her, he immediately recognizes her and so do the fans." (Thompson, PDF 096)
  - Rule: a minor canon character is identified by one or two signature shapes (hair colour and fringe cut), not by costume detail.
- **Credits:** colour concept by **Alberto Mielgo** (left); 3D design by **Omar Smith** and paint by **Yashar Kassai** (right). (PDF 096)

### Character design: Peter B. Parker (the older Spider-Man)
- **Who he is.** He is "certainly not the Peter Parker he or any of his fans are familiar with": a thirty-something web-slinger voiced by **Jake Johnson**, "a bit jaded, not in the greatest of shapes, and is dreaming of a happy, carefree retirement in Costa Rica." (narration, PDF 098)
- **Body tells his history.** "Although he has the musculature of a super hero, he also has a little bit of a **beer belly**. He has been through a couple of decades of crime-fighting, and it shows. He **pushed his nose to the side** a little bit… I thought it was a great way to connect with the fans of the comic book who have been following this character through the years. He feels authentic and appealing." (**Shiyoon Kim**, character designer, PDF 098)
  - Rule: age a hero with specific damage and wear (belly, crooked nose, stubble, bags under the eyes) while keeping the heroic build.
- **Emotional arc.** "He has lost a lot, and is starting to wonder whether it has all been worth it. Helping Miles, who is a kid just beginning his life as Spider-Man, also restores his faith. It's a pretty complex and powerful storyline." (**Peter Ramsey**, director, PDF 098)
- **Mentor archetype.** "Peter is playing Mr. Miyagi to Miles' Karate Kid, and he reluctantly agrees to teach him a few things. But he doesn't have to prove anything anymore—he's like LeBron James at the end of his career: we all know he's the greatest." (Thompson, PDF 098)
- **Credits:**
  - PDF 098: final character art paint by **Yashar Kassai**.
  - PDF 099: concept sketches by **Justin K. Thompson** and **Jesús Alonso Iglesias**.
  - PDF 100: sketches by **Shiyoon Kim**.
  - PDF 101: sketches (top) by Shiyoon Kim. Final art (bottom left): 2D design Shiyoon Kim, 3D design **Omar Smith**, paint **Robh Ruppel**. Bottom right (the bruised version): 2D Kim, 3D Omar Smith, paint **Wendell Dalit**.
  - PDF 102: concept art by Jesús Alonso Iglesias.
  - PDF 103 and the following spread: artwork by **Alberto Mielgo** ("NEXT PAGE AND SPREAD", caption on PDF 102). This credit most likely covers the forest-road spread on PDF 104–105.

### Visual philosophy
- **Risk is licensed by the audience.** "We are all lucky to be working on a property that has such a huge audience invested in it. That's why we could be riskier with our choices and make the movie visually different from what a summer or winter blockbuster is expected to look like." (**Bob Persichetti**, director, PDF 101)

### Environment design: Alchemax Labs ("Out of the City")
- The "cool, reflective Alchemax Labs" is where the shocking reveal of Dr. Octavius happens. The team drew on real tech spaces: the **Jet Propulsion Lab in Pasadena** and various **NASA facilities**. (narration, PDF 104)
- **The architecture shares the villain's arc.** "Much like the character reveal of Dr. Octavius, I wanted the location to have a **modern façade of altruism, while its true intentions are deeply sinister**. I used a mixture of **highly reflective material to parallel the Multiverse** aspects of Doc's research. The main research lab was designed as a very high-tech playground for our characters." (**Patrick O'Keefe**, vis dev artist, PDF 104)
  - Rule: reflective surfaces are the visual motif for the Multiverse, in both the Collider and Alchemax.

### Pipeline & tech (from captions and text)
- **Final character sheets come from a three-step chain:** **2D design → 3D design (model) → paint** (a digital paint-over on the 3D render).
  - Examples: Goblin (2D Kim → paint Dalit); MJ (3D Omar Smith → paint Kassai); Peter B. (2D Kim → 3D Omar Smith → paint Ruppel or Dalit).
  - The paint-over is where halftone, ink lines, hatching, freckles and bruises get added on top of the 3D. It sets the target look for the render and compositing teams.
- **Lighting keys are a separate stage** from story and design. Wendell Dalit did the sticky sequence; Robh Ruppel and Seonna Hong did the funeral.
- **Scanned 2D art can go into the film as textures.** The comic prop is hand ink plus a digital fake of offset lithography, mapped onto the 3D book.
- **Real-world scouting sets scale; stylization is added on top.** Examples: the LHC (17 mi, 574 ft deep), JPL and NASA for Alchemax.

### Story & production
- **Classic film homages drive staging:** Alice's rabbit hole (the descent to the Collider), *Jurassic Park*'s T-Rex (the Goblin reveal), *Karate Kid*'s Miyagi (Peter B. as mentor).
- **Things cut or deferred:** Ganke's larger role (saved for sequels) and a forest scene with Ganke in the adventure (Durante boards).
- **Beat order in this range:**
  1. Miles' sticky powers at school.
  2. He finds the comic.
  3. He goes back underground, sees Spider-Man fighting the Goblin, and the Collider fires.
  4. Spider-Man's funeral in the snow and MJ's press statement.
  5. Peter B. arrives.
  6. The trip out of the city to Alchemax.

---

## Visual insights (from looking at the art)

### PDF 071 — Storyboards, sticky-powers sequence (Ryan Savas; credit on PDF 074)
- **Format.** Greyscale digital boards in a 6-column × 5-row grid (the fold-out continues from PDF 070). Panel aspect is **≈2.4:1 (scope)**. Backgrounds are flat mid-grey (#b8b4ae) with lighter walls, characters are unshaded white fills with black line, and dark grey (#4a4a4a) marks doors and the undersides of furniture.
- **The action.** Miles is stuck at the dorm door (a "WATER" poster on the wall), then struggles.
  - A POV shot looks down at bare feet with crack lines where they stick to the floor tiles.
  - He tears through the ceiling tiles, and a bedsheet flies up as a white cloth silhouette.
  - He ends up stuck **upside down on the hallway ceiling**. That shot is a symmetric one-point-perspective view looking straight up the corridor, with Miles centred like a spread starfish.
- **Takeaways:**
  - Camera inversion (upside-down framing) is the storytelling device for the sticking power.
  - Debris flecks are small triangles.
  - Motion is shown with a few curved speed strokes.

### PDF 072 — Lighting keys, school sequence (Wendell Dalit)
- **Layout.** Nine keys on a black page, arranged like comic panels with black gutters about 2.5% of page width.
- **Style.** Faceted, low-poly-looking paint: every form is a few flat planes with **hard terminator edges, no outlines, and no facial features on background figures**. Student heads are simple boxy volumes and hair is a single flat colour block.
- **Top-left: Visions Academy street.** A pedestrian bridge with big white letters "V-I-S-I-O-N-S" (Miles is spotted as a tiny figure on it). Afternoon light: warm cream sky #e8dcc0, buildings in butter-yellow #d8c070 and grey, cars in flat pastels (pink #e07080, yellow #e8c040, white).
- **Hallway key.** Yellow accent stripe along the walls #e0b040. The characters are dark silhouettes, back-lit by bright fluorescent ceiling panels.
- **Office keys.** Warm window light #e8d8b0, brown desk #6a4030, deep brown shadow #2a1c18. Papers fly around a man kicking back in a chair (a stuck-hand gag).
- **Big key: overhead of Miles hanging upside down from a window ledge,** a pigeon beside him and the street below.
  - A sunlight wedge on the pavement #e8d8a0 is cut by a hard diagonal shadow in cool lavender #6a6a9a.
  - Maroon brick #6a3530, parked cars in grey-blue and lilac, one yellow cab #e8b020, yellow road centre-line.
  - The camera looks straight down (a 90° top view) and the figure is rotated about 180°. Vertigo comes from the orientation, not from perspective.
- **Right-hand keys:**
  - Classroom: cool grey-blue walls #a8b0c0, warm cream windows #e8dcb8, blue school blazers #3050a0, blond hair as flat #e8c060 blocks. Miles is visible upside down outside the window.
  - Hallway with a blonde girl (Gwen) walking.
  - Shirtless Miles at a window with pigeons and a city view.
  - Dorm room under blue light.
  - Jefferson in the doorway.
- **Rule.** Across all keys the warm key light comes in through windows and doors, and the fill is cool blue-grey.

### PDF 073 — Lighting key close-up: Miles reading the comic (fold-out, Wendell Dalit)
- **Palette:**
  - Background: indigo-violet #1e1040 to #2a2466, with a blurry magenta light shape at the top-left (#c040c0).
  - Skin key (lit edge): warm yellow-orange **#dda850**. Skin mid **#7a3a22**, skin shadow **#4a2418**.
  - Eye whites are tinted **lavender #b0a8e0**, picking up the background; the catchlights are pure white dots.
  - Comic cover: hot red **#e03040** with lime #a8d040 and orange #f08040 glitch stripes.
  - Floating pigeon feathers: pale blue-grey #b8c0c8.
- **Light.** A hard warm key from the left rakes the forehead and cheek as one flat plane with a sharp edge. The rest of the face is one warm-brown mid plane plus darker shadow shapes. There is no soft gradient; edges are painted as cut shapes.
- **Ink over paint.**
  - Eyebrows are thick black tapered shapes.
  - Fine black hatch strokes (2–4 parallel lines) sit on the forehead; a small crosshatch under the left eye carries worry and fatigue.
  - Short dark lines mark the nose wing and the mouth corners.
  - Feathers have hatched, feathery edges.
- **Comic prop.** The book is rendered deliberately lo-fi: smeared, pixel-streaked edges and a posterized cover, as if it is a printed object caught in motion.
- **Framing.** Extreme close-up with the head tilted about 25° (Dutch). The comic enters from the bottom-right corner and the eyes look off-frame. A thick black border frames the image like a panel.

### PDF 074 — Comic cover and interior page (Marcelo Vignali)
- **Cover, *True Life Tales of Spider-Man*:**
  - Maroon-brown masthead ground ~#6b3a35.
  - Title in **yellow #f7e913** block capitals with a **blue-grey drop-shadow offset down-right** (#5a6a9a) and black outline.
  - Sky is a pale warm grey-beige #d1c4b8 with **white diagonal wind streaks** (parallel bands at about 30°).
  - Spider-Man in red #d8302c with a black web grid, blue #2a4a9a with **heavy black spotting** for shadow (Ditko style: shadow is solid black ink, not a darker blue).
  - Speech balloons are **yellow #f5e020 with black hand lettering**. Banner arrow in blue-grey #6a86a0.
  - A vertiginous downward view of buildings with rooftop onlookers. The web is drawn as a net of crossing lines.
  - A fine dot screen is visible in the sky and building tints.
- **Interior page: a 2 + 1 + 1 panel grid**, black borders about 1% of page width, white gutters.
  - **Limited palette: one flat orange #e08a3a, black ink, and cream #f3e2c4 highlights.** Mid-tones use a dot screen over the orange.
  - The single accent is the **SFX "CROCK" in pale teal #8fb8c0 with a thick black outline**. It is stacked vertically and **breaks across the panel border**.
  - Balloons are white ovals with hand lettering and a pointed tail.
- **Reproducible rule:** each panel is **one hue plus black plus paper**, and the SFX is the only complementary colour.

### PDF 075 — More comic panels (Vignali)
- **Panel 1** is a pink duotone: ground #c06070, figures in pale pink and white with black ink ("OH MY GOD, THERE'S A MAN ON THE WALL!").
- **Panel 2:** mauve-grey building, Peter climbing, black crows, flying paper.
- **Panel 3:** a **yellow burst of radiating lines** behind Peter stopping an orange car, with "BEEP" in white skewed 3D letters outlined in black.
- **Panel 4:** Peter close-up on a flat yellow ground.
- **Large panel:**
  - Yellow buildings #e0b840 with black window grids, purple-grey asphalt #7a6a80, white crosswalk stripes, an orange car #e07a30, and a sepia/yellow crowd.
  - Peter appears **four times along a dashed white arc** (multiple exposure plus a dotted trajectory): a comic motion-path device that can be reproduced directly.
- **Rules.** Every panel uses a 1–2-hue palette plus black; thick-to-thin brush ink; solid black shadow spotting; dot screen on flat tints.

### PDF 076 — Ganke final (paint Wendell Dalit), expression sheet (Shiyoon Kim), boards (Paul Watling)
- **Final figure.**
  - About **6.8 heads tall**, hands in pockets, standing square on.
  - Navy blazer #1a2045 with a "BVA" crest, dark olive scarf #3a4535, lavender pocket square.
  - Dark warm-grey trousers #3a3530 with a **visible square halftone dot grid in the shadow areas only**. Dot pitch is about 0.4% of page width; the dots darken toward the creases.
  - Black sneakers with pink dots and gold soles. A soft grey contact-shadow ellipse on white.
- **Face and hair.** A soft CG face with simplified planes and thin-rimmed glasses. The hair is a maroon-black bob cap with spiky swept bangs.
- **Expression sheet.** Nine heads in clean black line with no fill. The shape language is a **round, wide-cheeked egg**, with features low in the face and the bangs as a few spiky strands.
- **Boards.** Grey-toned: a shocked Ganke, and Miles clinging in a ceiling corner.

### PDF 077 — Early Ganke/Miles concepts (Sei Riondet, Jim Mahfood, Jesús Alonso Iglesias)
- **Top heads.** Loose black brush ink with a flat flesh tone #d8c0a8 on the faces only; hair is solid black masses.
- **Bottom lineup** (Mahfood-style brush figures labelled G., M., P.). Spiky black ink with spot colour only on a few garments: yellow jersey #f0e030 with a "5", green tee, lime shorts.
- **Right: tall slender teen** (Iglesias). Maroon-brown sweater #3a1a1e with **olive-khaki stripes #b0a040**, pink trousers #d89a8a with fold marks as **scratchy yellow and red marker strokes**, dark sneakers with tan laces.
- **Rule for marker-sketch rendering:** a flat base colour plus 3–8 gestural highlight strokes, with no blending.

### PDF 078 — Ganke development heads (Shiyoon Kim)
- **Medium.** Pencil line only, thin and variable weight.
- **Heads.** Nine explorations of a heavier, round-faced Ganke:
  - **pear/round face with a double chin**
  - small features clustered low and centre
  - blush as **short hatch ticks on the cheeks**
  - varied hair masses: buzz, spiky, bob.
- **Full figure.** A Spider-Man-logo cap, backpack, and a card held in both hands. Round volumes everywhere.

### PDF 079 — Cut-scene boards (Riccardo Durante) and Ganke full figure (Kim)
- **Selective colour.** The boards are grey and white line, and **only the Spider-suits are coloured red and blue**. That keeps the heroes readable in a busy frame. The setting is a forest with a big tree and rock framing both sides of the panel.
- **Full figure.** Grey marker tones, black ink contour, rounded body, oversized blazer, patched cargo pants, high-tops. Perspective floor lines are drawn at the feet to plant him.

### PDF 080 — Miles' dorm room (Yuhki Demers)
- **Composition.** Wide, eye-level, two-point perspective.
  - Left: a whiteboard with red marker ("SCHEDULE 1 Pre-Calc 2 Bio 3 English U.S. History P.E. Ceramics", a DNA doodle, a spider doodle); an "Amazing Spider-Man" poster; a poster of a rapper in a "3" cap on a hot-pink ground; a shelf of Spider-Man toys and figures (a Spider-Man 2099 figure, a vinyl bobble figure); a pile of comics.
  - Right: a window, a clock, metal bunk beds, clothes on the floor.
- **Palette:**
  - Walls in teal/steel blue **#3e6a80** (sampled #344759 in shade).
  - Deep navy shadows **#1b1a2f**.
  - Hot pink/magenta accents **#c03080** (poster, clothes).
  - Lime **#c8d840** accent (a book on the floor).
  - The window is blown out to **pure white with a pink-magenta bloom halo (#f0c0e8)** that bleeds across the frame edge.
- **Texture.** A **halftone dot grid is overlaid on the teal wall** (a regular grid of slightly lighter dots) and on the darker furniture.
- **Detail economy.** Small props (comic covers, posters) are reduced to flat silhouettes and 2–3 flat colours. Outlines are minimal; objects separate by value.

### PDF 081 — Dorm room, continued (Demers); store-bought suit (O'Keefe)
- **Dorm.** Mauve-lavender shadowed wall #8a7a98 (sampled #853b71 in pink areas), teal cabinets #3e526c, and a **magenta towel with a faceted, crumpled polygon look**.
  - The **bulletin board's photos are rendered as pixelated mosaic squares**: detail abstracted into blocky colour cells rather than drawn.
  - Mini basketball hoop, chips bag (orange #e07030 and magenta), red can, blue water bottle, black laptop, desk lamp.
  - The Spider-Man mask on the chair is red with white eyes.
  - Halftone dots show on the dark desk front and laptop.
- **Suit packaging.**
  - Navy header card #1a2050 with a "the SPIDER-MAN!" logo (white italic caps with a red outline) and an "M" size tag in a red square.
  - The suit is crimson #c02838 with a crude black spider and web.
  - **Plastic wrap is shown as jagged white and pale-blue angular glints, stepped "pixel" highlights and thin white edge lines**: the shine is cut into shapes, not blurred.
  - Mask eyes are white with thick black borders, with a striped, glitchy shading band across the lower eyes.

### PDF 082 — Chapter opener + "the room where Miles first encounters Spider-Man" (Zac Retz)
- **Title typography.** "MILES MEETS THE SPIDER-MEN" in heavy geometric sans capitals, red **#e0303c** on white. The body text opens with a large black drop cap.
- **Painting.** A **high bird's-eye view (~60° down)** into a circular pit: a ring wall, rails crossing diagonally, huge collider cylinders and a crane rig.
  - A tiny Spider-Man (red-pink) swings on a long **white curved web line**.
  - Palette: dark slate-teal **#1e2a36**, steel blue-grey **#607888**, **acid yellow-green #c0d040** for railings and hazard lines, sparks in magenta and pink #e04080.
  - A **light-on-dark halftone dot grid overlays the whole image**, about 8px pitch at 1400px width (~0.6%).
  - Boxy, angular debris fragments crowd the frame edges.

### PDF 083 — Zac Retz depot; Craig Mullins tunnel
- **Retz.**
  - Foreground frame-within-frame: black silhouette pillars on the left and right, and Miles as a dark back-view silhouette bottom-left.
  - The lit midground shows the collider cylinder, a **glowing yellow-green arc** (railing) and scaffold grids.
  - A **fine square mesh grid overlay** (like a screen or fence) covers the image, plus halftone.
  - Palette: navy **#0c1626**, teal-blue #3a6080, acid yellow-green #b8c840, one pink-red spot (Spider-Man).
- **Mullins.** A vaulted, ornate old subway station: domed ceiling, arcade of arches, decorative tile panels.
  - Palette: ivory #d8cfb8, one arch interior in red-orange #b84028, dark brick on the right, warm haze.
  - Painterly broad strokes with no comic treatment: a mood and architecture reference, with white pigeons flying.

### PDF 084 — Spidey-sense concepts (Dean Gordon); wrecked depot (Zac Retz)
- **Spidey-sense, the same frame in two treatments:**
  - **(a) Monotone:** everything mapped to **yellow #dec410** with shadows in **dark ochre-brown #735320**.
  - **(b) Two-tone:** **salmon-orange #f88257** for the environment and **dusty teal #4d6469** for the danger shape.
  - In both, the **oncoming train/threat is a big dark wedge** extending from Miles' outstretched hand toward the right.
  - Miles is the only element left in near-normal colour, desaturated.
  - **Border: dense manga "focus lines"** (radiating dark hairline wedges) fill roughly the outer 8–12% of the frame on all sides and point inward.
  - The inks have a grainy, dithered texture.
- **Retz wreck.** A train car smashed into a steel cage, twisted yellow railings, "FISK" containers, and a smoke plume lit blue-white.
  - Grid and halftone overlay again. Palette: navy #141a30, blue-violet #4a4a90, maroon car #6a2a30, yellow railing #d8c040.
- **Prop elevation.** A flat side view of a flatcar carrying collider parts (grey cylinders, a yellow ladder) on a purple truss bridge, with a tiny Miles for scale: the car is about 12× his height.

### PDF 085 — Spidey-sense (Dean Gordon); train room (Grivet & Rossier)
- **Spidey-sense.** An arched station corridor in the same two treatments:
  - **amber monotone:** highlight #ebc708, shadow #ad6d18
  - **orange/teal:** #f5835a with #4d7080 shadows
  - Focus-line borders again.
- **Train room.** A near-photoreal layout concept: a roundhouse turntable with radial tracks, a collider segment hung from a gantry crane, orange and blue shipping containers, haze and god rays, fans.
  - Palette: desaturated green-grey #6a7068, rust #a05030, container blue #2a4a7a.
  - Useful as a **layout/space reference only**: the style is not final.

### PDF 086 — Control room and server corridor (Patrick O'Keefe)
- **Control room.** A high three-quarter overhead of rows of desks.
  - Every monitor glows **saturated blue #3040c0 → #8090ff** with white UI lines, graphs and radial diagrams. Red LED clocks hang overhead.
  - Through a huge slanted window the collider is visible: a green band #80c070 and chrome cylinders.
  - **Kingpin is a solid black blob silhouette with no interior detail** among white-coated technicians.
  - The floor is pale lavender with long blue reflections of the monitors.
- **Server corridor.** One-point perspective.
  - Near-black navy walls **with thin horizontal blue and green LED dashes** (rack lights).
  - Ceiling downlights are white ellipses, with lavender ellipse pools of light on the floor.
  - The **right wall is a mass of orange-red coiled cables #c05040**: a warm complement to the cold corridor.
  - Kingpin is a black silhouette at the far end, framed against a bright opening.

### PDF 087 — Collider-firing sequence, 15 frames (uncredited)
- **Fixed composition.** A 3 × 5 grid, identical in every frame:
  - Kingpin's **black silhouette** (a rounded hump of shoulders with a tiny head) fills the lower-centre (~40% of frame width) as a foreground matte.
  - Window mullions divide the frame vertically; the collider beam runs across the window.
- **Colour progression:**
  1. Frames 1–3: pastel **mint #e3e2ae** and **pink #ecb6a8** horizontal beam band with a tiny starburst at the centre; environment pale green and grey.
  2. Frames 4–6: the beam widens into a **fireworks of thin radiating lines**; the palette turns red and green.
  3. Frames 7–9: **red/magenta explosion** with a **cluster of black particle dots at the centre** and blue added.
  4. Frames 10–11: full saturation. **Yellow, orange, blue and magenta scribble strokes radiate from the centre**, with a black dot cluster core.
  5. Frames 12–15: **whiteout**. The frame posterizes into torn flat patches of white, orange #f08020, lavender #9090e0, pink and pale cyan. The silhouette's edge picks up an **RGB-split rim (pink / cyan / yellow, offset ~0.3% of frame)**. The last frame is mostly white and pale cyan, with red and orange **vertical streaks** at the mullions.
- **Rule.** Energy is shown as **radial scribble lines plus posterization plus colour-channel fringing**, never as a volumetric glow.

### PDF 088 — Collider painting with comic captions (Patrick O'Keefe)
- **Comic device in concept art.** A black rounded-rectangle caption box with white small caps, **"JUST THEN"**, sits in the top-left. A white box with a black 1px border, **"TO BE CONTINUED…"**, sits in the bottom-right.
- **Composition.** An **extreme worm's-eye view with a strong Dutch tilt (~35°)**. The collider ring fills the left ~55%, and the right half is **pure white negative space**.
- **Collider palette:**
  - deep ultramarine **#2030a0**, violet **#4030a0**
  - radial **gold/yellow wiring #d8a830**
  - chrome silver rings; black tubes with **thin white rim highlights**
- **Beam and SFX.** A **lime-green beam pipe (#b0d030)** runs diagonally up-right.
  - **SFX "BOOOM"** is lettered along it: lime letters, black outline, pinkish offset shadow, surrounded by **black ink splatter dots** of varied size.
  - Horizontal speed stripes run inside the beam band.
- **Scale.** The Green Goblin is a tiny lime silhouette running on the pipe, and Spider-Man is a tiny figure falling in the white void.

### PDF 089 — Three Collider panels (Patrick O'Keefe)
- **Panel 1.**
  - Green chamber #4f7a50 with a wall of round holes, magenta pipes #a03070, lime scaffold lines, and the collider ring on the right (blue-grey with pink lights).
  - The **SFX "WHAM" is a translucent neon-tube glyph** glowing lime #d0f080 over a dotted grid.
  - A tiny Spider-Man swings.
- **Panel 2.**
  - White/lavender background with violet pipes #8050a0 and gold trim.
  - The **Goblin from behind is near-black, with bright green #80c040 scale texture only on the lit edges**. He grips a pipe.
  - A tiny red and blue Spider-Man runs along a pipe.
  - **SFX "ZAP"**: pink **#d070c0 letters filled with halftone dots** with a **dark-blue offset shadow**, set in a white starburst balloon with a pink outline. A **spray of halftone dust** trails from the burst.
- **Panel 3.**
  - Against white, Miles hangs from a black mechanical beam as a **near-flat silhouette**: olive hoodie #6a7030, dark jeans, black-and-white sneakers, and an exclamation mark "!" by his head.
  - **Hexagonal clusters (grey honeycomb blobs) float in the air**, like glitch debris.
  - Spider-Man swings on a thin web line. Black mechanical frames cut into the top corners.

### PDF 090–091 — Collider spread (Patrick O'Keefe)
- **Materials and palette:**
  - Orange steel stairs **#d07a20** with **perforated-metal treads (hexagonal holes)** in cream #d8cbb0.
  - Yellow cable trays **#e8d020** with bundled white cables; blue panels **#3060c0**.
  - Chrome ducts and cylinders: a **pale lavender-white highlight band #d3d1f2**, then mid-lavender, then navy **#2a314e**.
  - Orange/white hazard stripes, **magenta cable bundles #b030a0**, black voids **#050408**.
- **Halftone in the darks.** Dark areas carry **large, lighter halftone dots on black**: blue-grey dots about 1% of image width. At the bottom right, **magenta and blue dot screens overlap with a half-cell offset**, a deliberate misregistered two-plate look.
- **"Kaleidoscopic" reflections.** Big translucent polygon shapes (20–40% opacity) of lavender, blue and pink overlap across the chrome.
- **PDF 091:** Spider-Man runs flat-out along a huge chrome pipe. **His reflection shows on the pipe** in red and blue, offset beneath him, and a soft dark shadow is cast to his right.
  - Highlight streaks run along the pipe axis, with small **white dot-dashes** along the highlight band (halftone in the highlight).

### PDF 092 — Goblin story art and colour concepts
- **Story art (Ramsey).**
  - Grey marker Goblin face in close-up, with the **only colour being a blue #3040c0 tongue** lashing out: selective colour for the key action.
  - Control-room board: **Kingpin as a solid black mass silhouette** framed by the window.
- **Iglesias concepts.**
  - An orc-like troll with a blue hood, scale texture, armour plates, red rag skirt and a satchel.
  - A green armoured brute with spikes and a crested helmet.
  - Both use loose line with flat colour and a few highlights.
- **Mielgo concept.** A slender Goblin with a **purple hood ending in a long curled tail**. The scale texture is a net pattern of lime and pink cells on black, with a purple apron and red gauntlets.

### PDF 093 — Final Green Goblin (2D Shiyoon Kim, paint Wendell Dalit)
- **Staging.** Warm-grey studio backdrop **#686059** with a vignette and a soft contact shadow.
- **Shape language.** A hulking gorilla-crouch: shoulders very wide, head tiny (≈1/6 of shoulder width), arms long enough for the claws to hang near the knees. **Bat wings span about 2× the body width.**
- **Colours:**
  - Scaly green skin **#70761f** mid, **#9ab040** lit scales, pale olive belly **#c0c080**.
  - Wings: dark-edged, maroon-red membrane **#8a2a28**.
  - **Purple hood #4a3a6a** with a long pointed tail and stitch lines.
  - Red glowing eyes, a **blue-violet forked tongue #4050a0**, orange pumpkin bombs on the belt, a dark purple loincloth.
- **Key rendering trick.** The light/shadow boundary is a band of **halftone dots**, not a smooth gradient. Along the top edges of the hood, wings and shoulders, the rim light becomes a **checker/dot row** of lighter dots. Halftone also appears in the belly shadow.

### PDF 094 — Funeral church in snow (Robh Ruppel); two alternates (Grivet & Rossier)
- **Ruppel.**
  - A dusky **purple sky #675469**. Glass skyscrapers behind, with windows as short **horizontal lavender and white dashes** and atmospheric fade.
  - A Gothic church (Trinity Church-like). The **tower is uplit yellow-green #c8d060** and the nave is in shadow. Snowy roofs are lavender-white **#c0c8e0**.
  - **Foreground bare trees are flat black calligraphic silhouettes** (thin tapering branches).
  - Graveyard: dark blue-grey stones with white snow caps, red and orange leaves on the ground, warm bokeh lamps in the fog.
  - **Snow is a scatter of white dots** (1–3px, random) laid over everything.
- **Grivet & Rossier.**
  - A warm yellow-uplit church facade in heavy haze.
  - A low-angle shot up a glass tower (vertical ribbing) with a sun flare, Gothic spires and iron fence spikes as black silhouettes, and red leaves.

### PDF 095 — Funeral story art (Mark Ackland); press lighting keys (Robh Ruppel & Seonna Hong)
- **Ackland boards.**
  - Grey value boards: Spider-Man swinging with Miles through a snowy cemetery, lit from behind by a white glow, with black tree silhouettes.
  - A close-up with **horizontal white speed dashes** in the air.
- **Main lighting key.**
  - Dusk sky **pink-mauve #c47c89**. Far skyscrapers are **flat pink silhouettes one step darker than the sky**, with no detail.
  - Warm-lit facade in apricot **#d79c88 → #e8b890**; shadow facades in **purple #473667**.
  - MJ at a podium on the steps: red hair, dark dress.
  - The foreground press and crowd are **dark purple-black silhouettes #2a1a30** with faint rim light.
  - **Camera flashes are 4-point star sparkles**: a white core with thin cyan and pink spikes and a small halo.
  - NYPD sawhorse barriers in **yellow #c49826**. The police car roof light is a red glare plus star sparkles.
- **Small keys.**
  - An overhead of a massive crowd with orange and green dots.
  - Miles from behind facing the crowd, head as a warm orange ball.
  - Mourners in Spider-Man masks: realistic faces with soft CG shading, and a red Spider-mask among them.

### PDF 096 — Mary Jane concepts
- **Mielgo concept.**
  - **Big angular red-orange hair mass #d05020** built from flat shards, black sunglasses.
  - A leopard/fur coat painted as **ochre #a08050 base plus black and brown hatchy brush strokes**.
  - Pale lavender tee with a single black line, dark jeans with torn knee (a pink slash), a teal bag **#7aa8a0**.
  - Graphic, collage-like, no soft rendering.
- **Final (3D Omar Smith, paint Yashar Kassai).**
  - About **8 heads**. The silhouette is tall and narrow, with an oversized near-black coat **#1a1418** (subtle brown folds) and fur cuffs.
  - Black leggings and boots, a tan beret, red wavy shoulder-length hair.
  - Read: a nearly **all-black silhouette with a red-hair and beige-beret accent at the top**, so the eye goes to the iconic hair.

### PDF 097 — MJ close-up
- **Beret.** Tan **#da9e7c**, with texture made of **groups of 3–5 thin parallel contour lines** in a slightly darker tone following the form (engraving-style hatch grooves).
- **Hair.**
  - Deep crimson **#400813** → red **#b02030** → highlight **#e06060**, laid in long tapered strands mixed with **black ink strands**.
  - **White specular strokes** stand in for sheen.
  - The fringe is jagged, per the text.
- **Skin and face.**
  - Skin **#efb184**. **Freckles are scattered orange-brown dots of varied size**, with a faint dot screen on the shadow side of the nose.
  - Eyes: a **thick black upper-lid line** with a winged end, iris blue **#5070d0** with a white specular.
  - Lips mauve **#c07090**.
  - **Hard-edged white graphic highlights** sit on the nose ridge and cheekbone, cut as shapes.
- **Coat.** Black, with a white **splatter/chipped-paint edge** at the lower left.

### PDF 098 — Spider-Man final turnaround (paint Yashar Kassai)
- **Presentation.** Front and back views on a warm grey ground **#c8c1b9**, each with a soft black contact ellipse.
- **Proportions.** About **8 heads**: broad shoulders, narrow waist, long legs, athletic.
- **Suit colours.** Red **#d73e44**, blue **#2a3aa8** with shadow **#1a2078**. Black chest spider; red spider on the back.
- **Web lines.** Black on the shadow side, turning **gold/yellow #f0b030 where the light hits**. The web catches light as if it were raised piping.
- **Eyes.** White lenses with thick black borders. The left lens has a gold reflection streak; the right is lavender #c0c0e0, showing the environment.
- **Rim light.** Magenta/pink **#c050a0** rim on the shoulder and upper arm on the shadow side.

### PDF 099 — Peter B. sketches (Justin K. Thompson; Jesús Alonso Iglesias)
- **Top row.** **Red-pencil construction line plus flat grey marker** fill: Peter B. in suit and sweatpants, holding a coffee mug, in slouchy poses such as scratching his head or crossing his arms.
- **Main sketches: three-value rendering.**
  - **Flat red #e03a3e and flat blue #2a4ab8**, a thin loose black line, and **white highlight slivers left as unpainted paper** along the lit edges of the limbs and torso.
  - Poses: a hunched "shh" finger, a frog-leap with limbs spread, arms crossed, reaching up, a back-view wall crawl, hunched hands-on-knees, a web shot, lounging on a couch drawn in line only.

### PDF 100 — Peter B. sketches (Shiyoon Kim)
- **Boxers-and-mug portrait.**
  - Slumped shoulders, a soft belly, slight love handles, droopy half-lidded eyes, stubble, a smug crooked smile.
  - **Hairy legs and chest drawn as short hatch ticks**, with grey marker shading on the boxers and body.
  - Knees marked with a darker round patch. A perspective floor line is drawn at the feet.
- **Action sketches.**
  - Hanging upside down by the ankle from a web in a trench coat.
  - Swinging with the coat flaring (solid black fill inside the coat).
  - Sprawled on the floor still holding a coffee mug.
  - Crouched and pointing, smirking.
- **Line style.** Clean, confident contour with selective solid blacks.

### PDF 101 — Peter B. heads: final (paint Robh Ruppel) and bruised (paint Wendell Dalit)
- **Face design.** A long face with a **long nose shown as one big flat lit plane** (warm orange #e0a070) against a cooler shadow side. Heavy straight brows and messy brown hair.
- **Hair.** Brown-olive **#8a7040**, with a **halftone dot texture in its shadow masses** and fine dark ink-line strands on top. A few flyaway single-line hairs.
- **Stubble.** Individual short dark dashes over a **blue-grey jaw shadow #aca3a1**.
- **Lighting.** Warm key from front-left (skin **#cc8f70**) against a cool grey background **#aea6a3**. Wrinkles are **sparse tapered ink lines** (forehead, crow's feet, nasolabial fold).
- **Bruised version.**
  - A **black eye in flat purple #6a4a6a** with parallel hatch lines beneath.
  - A cheek bruise as a **pink-magenta crosshatch plus a dot-screen patch**; a forehead bruise as a **red dot-screen patch**.
  - A crosshatched scrape on the nose bridge. Heavy under-eye bags and droopy lids.
- **Sketches.** Loose, expressive line heads with a big wavy hair mass and a stubbled jaw. The Persichetti quote is centred on the page.

### PDF 102 — Peter B. concepts (Jesús Alonso Iglesias)
- **Pose sheets.** Grey sketches: rubbing his face, trench coat, a lunge, sitting slumped, jumping.
- **Coloured sketches.**
  - Peter B. slouched in a chair in a red sweater and blue jeans, holding a red scarf.
  - Two homeless-style disguises: a pink beanie, white coat and orange pants with reflective stripes; and a grey coat with a red cap and green pants with reflective stripes.
- **Large figure.** A bearded Peter B. in an army-green parka **#6a8040** drawn with **loose black marker line, ink spatter dots and dry-brush smudges**, a violet-and-blue striped shirt, and grey pants.
  - Rule: flat base colour, a few confident black strokes, spatter for grit.

### PDF 103 — Hallway with scrawled text (Alberto Mielgo)
- **Composition.** A dark corridor in one-point perspective with a staircase to the right. Spider-Man walks hunched toward the camera at the far end.
- **Palette.** Near-black maroon and violet **#1a1420**, fluorescent ceiling lights, a reflective floor with red and maroon streaks.
- **Scrawl overlay.** **Hand-scrawled marker words in glowing blue #6070ff and violet #9040c0** cover the walls and stairs:
  - Examples: "NO", "WHY NO?", "is posible", "TE FEO", "OUTA", "BAES…".
  - Some text follows the wall planes and some sits flat in screen space.
  - The words are semi-transparent with a soft glow, like chalk or neon marker.
- **Texture.** A vertical ribbed-glass stripe texture on the walls.

### PDF 104–105 — "Out of the City" opener; forest road at dusk (likely Alberto Mielgo, per the "next page and spread" caption on PDF 102)
- **Chapter title.** "OUT OF THE CITY" in red **#e0303c** heavy sans, set over near-black foliage. The body is white text on black with a big white drop cap.
- **Painting.**
  - A winding two-lane road fills the foreground: **purple asphalt #4a3a55 → #301f2f**, a **double yellow line #d0a840** curving away, a white edge line.
  - Miles and Peter B. walk small in the lower-left third. A pickup truck's headlight has a **soft ring halo flare**.
- **Trees are flat, jagged-edged fir silhouettes in depth layers:**
  - far: pale haze yellow-green and lavender **#d8e0c8 / #b8c0e0**
  - mid: olive-khaki **#8a7a40**
  - near: maroon, purple and black
  - **Tall vertical light shafts** (pale blue-lavender columns) stand between the trees.
- **Surface texture.** **Vertical scanline/stripe texture** inside the tree masses, **a few loose black calligraphic ink strokes** laid over them (suggesting branches), and tiny pink and cyan specks on the road (print noise).

---

## Recipes

1. **Spider-sense duotone (Dean Gordon style).**
   - Convert the frame to luminance L and map it to two inks: `mix(inkDark, inkLight, smoothstep(0.35,0.55,L))`.
   - Palettes: (yellow `#e0c410` / ochre `#735320`) or (salmon `#f88257` / teal `#4d6469`).
   - Force the threat object's mask into inkDark regardless of its luminance.
   - Add ordered-dither grain (4×4 Bayer, ±6%).
   - Border: draw 250–400 thin dark wedges from each frame edge toward the centre. Lengths are random between 5% and 12% of the shorter side; base width 1–3px tapering to 0; draw them at ~70% opacity in inkDark.

2. **Fake-offset-litho comic panel (Vignali prop).**
   - Draw the black ink as a separate layer: tapered brush strokes, with shadows filled as solid black shapes.
   - Give each panel **one flat hue** (e.g. orange `#e08a3a`, pink `#c06070`, yellow `#e0b840`) plus paper cream `#f3e2c4` for highlights.
   - Mid-tones are a 45° dot screen of the hue on the paper colour, cell about 0.35% of panel width.
   - Offset the colour plate 1–2px down-right from the black plate (misregistration).
   - SFX use the single complementary pastel (`#8fb8c0` on orange) with a 3px black outline, and must overlap the panel border.
   - Balloons are white ovals with a black 1.5px stroke and hand lettering.

3. **Halftone terminator on 3D characters (final Goblin / Ganke).**
   - In the fragment shader, compute `s = dot(N,L)`.
   - Output flat lit colour where `s > t+0.12` and flat shadow colour where `s < t-0.12`.
   - In the band between, draw a dot grid in screen space. Dot radius = `cell*0.5*(1 - remap(s))`, in the shadow colour over the lit colour.
   - Also put a thin band of lighter dots along the silhouette rim (from `1-dot(N,V)` > 0.8), so rim light reads as dots.

4. **Inverse halftone in dark areas (Collider paintings, dorm walls).**
   - Where L < 0.25, overlay a grid of **lighter** dots: the background hue with lightness +25%, alpha 0.3–0.5. Pitch is about 0.6–1% of frame width.
   - For "machine" scenes, run two screens (magenta `#b030a0` and blue `#3050c0`) at 15° and 75°, offset by half a cell, to fake misregistered plates.

5. **Chrome and kaleidoscopic reflections (Collider, Alchemax).**
   - Shade cylinders as horizontal bands, not smooth gradients: white highlight stripe → lavender `#d3d1f2` → mid `#7d84b1` → navy `#2a314e` → black. Add thin white rim lines at the edges.
   - Layer 3–6 large translucent polygons (20–35% alpha, screen blend) in saturated blue, yellow and red across the metal.
   - Mirror nearby characters onto the surface as offset, compressed copies at ~50% opacity.

6. **Lit web lines on the suit.**
   - Draw the web pattern on the suit texture as a line mask.
   - Colour the lines black where `dot(N,L) < 0.5` and gold `#f0b030` where it is above. Crossfade over 0.05.
   - Add a magenta rim (`#c050a0`) on the shadow side of the silhouette.

7. **Three-value hero sketch (Thompson/Iglesias Peter B. sketches).**
   - Fill the body with flat suit colours (red `#e03a3e`, blue `#2a4ab8`).
   - Offset the silhouette mask by a few pixels toward the light and subtract it, leaving **white paper slivers** along the lit edges.
   - Stroke the outline with a thin, slightly wobbly black line (noise-jittered path, width 0.8–1.6px).
   - No gradients anywhere.

8. **Ink-over-paint faces (Miles close-up; Peter B. heads).**
   - Base: two or three hard-edged flat planes (lit `#dda850`, mid `#7a3a22`, shadow `#4a2418` for Miles).
   - Then add procedural ink marks:
     - hatch groups of 3–6 short parallel tapered strokes under the eyes and on the forehead
     - sparse tapered wrinkle lines
     - **stubble** as 200–400 random short dashes (2–5px, ±20° off vertical) inside a jaw mask over a blue-grey shadow
     - **bruises** as a pink/red dot-screen patch plus a 2-direction crosshatch
     - **freckles** as random orange dots, radius 0.5–2px
   - Tint the eye whites with the ambient background colour (lavender in blue scenes).

9. **Giant-reveal silhouette (Goblin, Kingpin).**
   - Render the big character as a **pure black shape with no interior detail**, sized to cover 30–45% of the frame. The head should be tiny relative to the shoulders.
   - For a reveal, animate scale up while the "outline gets closer". Only then light it, adding a halftone rim band and lit scale texture on edges only (bright green `#80c040` on near-black).

10. **Collider firing / energy whiteout (15-frame sequence).**
    - Keep a black foreground matte fixed.
    - Background timeline:
      1. pastel beam band (mint `#e3e2ae`, pink `#ecb6a8`)
      2. radial hairline "firework" strokes from the centre
      3. black particle-dot cluster at the core, and a palette shift to red/magenta
      4. full-spectrum scribble strokes (yellow, orange, blue, magenta)
      5. posterize to 5 flat colours with a white majority
    - In the whiteout, split RGB on the matte edge (R +3px, B −3px) and add vertical red streaks at the window mullions.

11. **SFX lettering placed in the world.**
    - "BOOOM": lime `#b0d030` fill, 3px black outline, pink offset shadow, 15–30 black splatter dots (radius 2–12px) around it, laid along the beam's axis.
    - "ZAP": halftone-filled pink letters with a dark-blue drop offset, inside a white starburst with a pink stroke; emit a spray of halftone dots behind it.
    - "WHAM": thin neon-tube outline glyphs with additive glow.
    - Caption boxes: "JUST THEN" (black rounded rect, white small caps, top-left) and "TO BE CONTINUED…" (white box, 1px black border, bottom-right).

12. **Snowy night funeral (Ruppel).**
    - Sky purple `#675469`. Skyscrapers are flat slabs, with windows as short horizontal dashes in lavender and white.
    - Uplight the church tower yellow-green `#c8d060` and keep the rest in cool shadow; snow caps in `#c0c8e0`.
    - Foreground trees are procedural black branching strokes (recursive, tapering widths), fully opaque.
    - Top layer: random white snow dots (1–3px) plus a few blurred warm bokeh discs.

13. **Dusk crowd / press scene (Ruppel & Hong).**
    - Sky pink `#c47c89`. Far buildings are flat silhouettes one value step darker than the sky.
    - Mid buildings: lit face apricot `#d79c88`, shade face purple `#473667`.
    - Foreground crowd: dark silhouettes `#2a1a30` with a 1px warm rim.
    - **Camera flashes are 4-point stars**: a cross of two thin tapered lines, white core, cyan and pink spike tints, a small radial halo, lasting 2–4 frames.

14. **Painted forest road (Mielgo).**
    - 4–5 depth layers of jagged fir silhouettes (triangles with noise-displaced edges).
    - Tint each layer toward the far haze `#d8e0c8`/`#b8c0e0`, going darker and warmer toward the front (olive `#8a7a40` → maroon → near-black).
    - Add tall pale vertical light shafts behind the layers.
    - Overlay vertical scanline stripes (1px, 3px period, 10% alpha) inside the tree masks, and 3–6 loose black calligraphic strokes on the mid layer.
    - Road `#4a3a55` with curving double yellow `#d0a840`, and sparse pink and cyan speck noise.

15. **Cozy cluttered interior (dorm, Demers).**
    - Teal-blue walls `#3e6a80` with a subtle light-dot halftone grid.
    - Blow out the window to pure white with a large magenta bloom (`#f0c0e8`, radius about 15% of frame) that bleeds over the frame edge.
    - Props are flat silhouettes in 2–3 colours with hot-pink and lime accents.
    - Tiny background detail (photos, posters) becomes blocky mosaic squares, 4–8 cells across.
    - Floor clutter is angular crumpled polygons.

---

## Best quotes

1. "They didn't want a modern look for the comic, so we went back to Steve Ditko's classic version." — **Marcelo Vignali**, comic-page artist (PDF 075)
2. "Working in computers is easier for large images that fill the big screen, but the result has a certain look that wasn't right for this task. After the inking was done, we had to fake the offset lithography and map it on the film digitally to replicate that old pulp quality." — **Marcelo Vignali** (PDF 075)
3. "This set is the first glimpse we get of Miles' soul… We worked hard to make it feel just messy enough!" — **Yuhki Demers**, artist (PDF 081)
4. "I wanted it to be a kaleidoscopic array of colors—with the bright, saturated blues, yellows, and reds reflecting off of the mirror-like gold and the chrome." — **Justin K. Thompson**, production designer (PDF 088)
5. "In an animated movie you can play around with the limits of reality… we thought we could kick things up a notch by making him about twenty-two feet tall." — **Justin K. Thompson** (PDF 092)
6. "They wanted to introduce him like the T-Rex in *Jurassic Park*. The audience can see his outline getting closer, and he's this giant figure looming over them." — **Justin K. Thompson** (PDF 092)
7. "Although he has the musculature of a super hero, he also has a little bit of a beer belly. He has been through a couple of decades of crime-fighting, and it shows." — **Shiyoon Kim**, character designer (PDF 098)
8. "Peter is playing Mr. Miyagi to Miles' Karate Kid… he's like LeBron James at the end of his career: we all know he's the greatest." — **Justin K. Thompson** (PDF 098)
9. "That's why we could be riskier with our choices and make the movie visually different from what a summer or winter blockbuster is expected to look like." — **Bob Persichetti**, director (PDF 101)
10. "I wanted the location to have a modern façade of altruism, while its true intentions are deeply sinister." — **Patrick O'Keefe**, vis dev artist (PDF 104)
