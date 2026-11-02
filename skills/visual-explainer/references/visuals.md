# Visual system, sentence → picture, motion

What the frames of the reference reels have in common, and how to build each piece in the template (three.js set + DOM overlays).

## The frame

- **1080×1920, a dark lit set**: near-black or a warm dark radial backdrop behind real 3D objects, with soft shadows, studio reflections, depth of field and bloom only on the HDR-bright signal. Now and then a white scene for rhythm. The palette can shift to suit the subject: sepia for history, the brand colour for a dev tool.
- **Caption band**, top ~15% (caption.js builds it from script.json and VO_WORDS). It shows chunks of 1–4 words; the word being spoken is bold white, the ones already said turn grey, and one keyword per line gets a Figma-blue selection box with corner handles. No scrim, just a text shadow, so frame the hero below it.
- **Subject zone:** roughly y 420–1540. Instagram's own UI covers the bottom ~380 px and the right ~130 px. Hero objects may pass under them, but no text that has to be read goes there.
- **Footnotes** bottom-left, just above the IG UI (`R.note`).

## It has to look real: 3D models, not drawings

The reference reels never draw a device. Phones, keyboards, heads, rooms and hands are **real 3D models** rendered with PBR materials, an environment light, soft shadows and DOF; a flat CSS/SVG phone reads as cartoonish at once. So:
- **Hero = a GLB** in `assets/models/` (log every model in `assets/models/SOURCES.md`). Places to get one: Apple's AR Quick Look USDZ files (convert with `uv run $SK/scripts/usdz_to_glb.py in.usdz out.glb`), three.js example models, Poly Haven, Sketchfab (downloadable CC), or build it in Blender. The template ships an iPhone 17 (`iphone.glb`: meshes Screen / Body_Frame / Back_Glass) and a scanned head (`head.glb`, Lee Perry-Smith, with colour/normal/spec maps).
- **Screens are live textures:** `GL.screen(mesh.material, {w, h, draw(ctx, t)})` draws the UI (iOS call screen, share sheet, a settings pane) into a canvas every frame. It is emissive, so dim it with `emissiveIntensity` when the story turns the screen off.
- **Skin and hands:** MeshPhysicalMaterial with the scan's maps, roughness ~0.55, a little sheen. Matte clay for anatomy sections.
- Never generate the hero with an AI image or video model. A sourced photo can sit in the scene as a card (below), but the thing being explained is geometry.

## One set, one continuous camera

Build **one 3D set for the whole reel** (`src/scenes/set.js`: one `scene({gl: true, t0: 0, t1: 1e9})`). Every beat is a camera key in the same world (`GL.cam(t, keys)` runs a Catmull-Rom path through `[[t, {pos, at, fov, aperture, focus, roll, ease}]]`), keyed to words: wide on the everyday moment → push in to the part → dive inside the cutaway → pull back for the ending. The camera never cuts, so perspective shifts are seamless by construction. `motion_stats.py` lists any frame that jumps.

- **Pose objects with functions of t** (`poseAt(t)` → position + quaternion) and put the camera keys in the object's local frame when it moves (`S.PL(x, y, z)` turns phone-local coordinates into world ones), so the camera follows the part and never drifts off it.
- **Seeing inside: the cutaway.** Remove the near part of whatever blocks the view with a clipping plane on its material (`renderer.localClippingEnabled = true`; `material.clippingPlanes = [plane]`), fill the cut with a flat dark section (a BackSide MeshBasic in the cut colour) and keep the removed part as a faint fresnel "glass ghost" on the GLOW layer. Open it over ~0.6 s by sliding the plane in on the word, close it on the way out. Clip the DOF depth material too (`GL.dof._materialDepth.clippingPlanes`), or the blur treats the removed skin as solid. Show the ghost only once the camera is in the close-up: while the camera is still near the removed part (the cut opening or closing) the ghost fills the frame and reads as smoke. A flat red cap or a full x-ray both read worse.
- **The invisible actor in 3D:** soft additive sprites and fake-volumetric cones (a shader with `pow(|N·V|, 3)` fading along the length) on the GLOW layer, coloured `--signal`, HDR-bright so only they bloom. Pulses are pure in t (`floor(t * hz)`).
- **Magnify honestly:** move parts apart or enlarge them when the real ones are too small to see, and add "Magnified, slowed down" to the footnote.
- Add another set only at a real topic change (a hallway with a portrait, a lab). A cut there is fine; inside a topic, move the camera.

## Colour carries meaning

- **One signal colour for the invisible actor:** gold `--signal` for charge, field, signal, light, zones, sound. It is the thing the viewer can't see, made visible.
- A second colour only for its opposite: blue `--anti` (anti-noise), red `--bad` (heat, damage, refusal), green `--good` (healthy, passed). When two waves cancel, the sum is neutral grey.
- Say it on screen: a footnote ("Charge shown in gold, invisible to the eye") and, with 2+ colours, a legend (`R.legend`).
- Damage reads as cracks, sparks or lava orange; health as gold.

## Numbers live on the objects

The most-copied trait of the top two reels. Don't float a stat in the middle of the frame. Put the value on the part that has it:
- each sensor crossing reads `100`; under the finger they dip to `76`, a radial dip with a ring on the minimum
- a % on each key (`e 96%`, `w 0%`)
- the laptop menu-bar battery %; a wattmeter on the charger; a counter that ticks (`1,043 messages`)
- a rate as a physical bar: "250 pushes in 1 second" as a dense gold bar with a bracket

Drive the number from the same state that drives the picture (the demo's sensor count is computed from the cheek's distance), so it can never disagree with what's on screen. Find the everyday instrument that shows the number: a calendar for months, a ruler for size, a run card for steps.

## Labels, footnotes, credits

- **Labels:** small letter-spaced caps + a thin leader line + a dot (`R.label('Glass', x, y, dx, dy)`), pinned to a point on the 3D model: the set projects its anchors every frame (`S.at.emit = GL.project(point)`) and a DOM overlay scene (`labels.js`, `overlay: true`) calls `.at(S.at.emit.x, S.at.emit.y)`. Name the part when the voice names it; pick `dx/dy` so the text lands in empty space, not off the frame edge.
- **Honesty footnotes**, tiny grey, bottom-left: "Magnified illustration", "Not to scale", "Values illustrative", "Slowed down", "Zones drawn visible. On a real iPhone they are invisible." They make the viewer trust the rest.
- **Source credits** as small captions: "120 scans a second · Apple, iPhone X and later", "WonderNetwork, 9 Oct 2026", "YouTube · Zalt · KytyPS5".

## Real things: sourced images and recreated UI

**Every reel uses real images from the web**: portraits, book covers, patent figures, teardown photos, product shots, logos. They are placed **as objects in the 3D set** (a framed print on a wall, a card floating beside the phone, a book on a desk) with a small credit, never pasted flat over the frame.
- Source them in the user's Chrome: `uv run $SK/scripts/web_images.py "iphone 14 pro proximity sensor teardown" prox --n 8` runs Google Images through browser-harness, downloads the originals (re-encoded JPEG, ≤2048 px) to `assets/img/<name>/`, writes a numbered `_sheet.jpg` and logs each file with its URL in `assets/SOURCES.md`. Look at the sheet, crop the one you use, and credit the source on screen.
- Place it: `GL.picture(url, {h, frame: 'card' | 'thin' | 'wood' | 'book'})` makes the object; `GL.inShot(t, keys, sx, sy, dist)` gives the position and orientation that put it at screen fraction (sx, sy) at time t on the camera path. Then it parallaxes and takes the light with the rest of the set. Put a card that floats in front of the hero on the GLOW layer (`GL.onGlow`), so the cutaway's clipped depth pass doesn't blur it, and keep it nearer the camera than any surface it overlaps.
- Time it to the line that the image proves ("a light you can't see" → the teardown photo of the emitter window), 1–2 s, and keep it clear of the part being explained.

Recognisable UI rebuilt as screen textures or HTML gives credibility and the action: iOS/macOS screens, a settings pane with the toggle being clicked, a tokenizer with coloured chips, a terminal, GitHub cards, tweets, an arXiv abstract with the key sentence highlighted. Use generic names (Maya, Leo, "Mom"), not real people's private data. Products and public figures are fine when the story is about them.

## Sentence → picture

Storyboard before building: a table of `line | words | picture | cue word | what moves`. Rules:
- **One sentence = one picture.** Find the noun and show it literally ("sunglasses" → sunglasses drop in).
- **A new visual beat every 2–4 words:** a label draws, a value ticks, a part lights, the camera moves, an object enters.
- **Every beat is keyed to the word that names it** (`W('glass')`), never to a hand-typed time.
- Show the counterfactual and label it ("what would happen without the inner mic").
- A/B side by side with live meters for comparisons.
- Real 3D objects (finger, hand, pen, the device) entering from the corners give scale and touch.

Common recipes:
- **sensor / field / charge:** cutaway of the real model + gold beams or particles + a number on the sensor that follows the geometry
- **signal flow:** gold dots running along a trace from part to part, the part lighting as they arrive
- **waves / sound:** particle density bands + a waveform line; the opposite wave in blue; the sum flattens to grey
- **prediction / probability:** a recurring card with bars and percentages that change as the story changes
- **network / privacy:** a floor plan of a home with device icons; a "Live" toggle console
- **scale:** a cosmic or everyday comparison with a real photo (10^106 ways vs ≈10^80 atoms over the Hubble Deep Field)

## Mascot

Optional. The top reel had none: when the subject fills the frame, the frame is 100% subject. A mascot (chest-up cartoon, a new gesture per sentence) helps only when the visuals are abstract (data, UI). Never generate one unless asked; if wanted, make it with the image skill.

## Motion and timing

- The hook's picture is on screen by 1.0 s. Never open on a title card.
- Nothing static for more than ~0.8 s. Idle motion counts: a ticking timer, breathing glow, particles, a slow push-in.
- Never a bare frame (just background + caption).
- Motion runs to the last frame. The ending acts out the CTA: the IG share sheet rises, a friend gets picked, Send is tapped (`R.shareSheet`).
- Transitions: one camera path through one set (dive into the part, pull back out). Cut only at a real topic change. No slide-deck fades.
- Easing: `outCubic` for arrivals, `inOutCubic` for camera moves, `pop`/`spring` for things that land, `inExpo` for dives.
