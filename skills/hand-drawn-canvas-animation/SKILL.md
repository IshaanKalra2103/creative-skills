---
name: hand-drawn-canvas-animation
description: Make a short film that looks hand-drawn or hand-printed, where every frame is drawn by JavaScript on Canvas 2D from one HTML file on top of a shared core, then rendered to mp4 with a generated Web Audio score. Five looks from one core and one palette system - ink on warm paper with hatching, riso halftone prints in fluorescent inks, flat screen prints with dot grids, graphite minimalism with torn sections, and brush-pen doodles drawn on top of cut-out photos of real objects (a shoe becomes a ship) - drawn on twos (12 fps), with blueprint interludes, ink blots, ripples, montages, badge galleries and a hand-lettered sign-off. Use when the user asks for an animation, animated explainer, "мультик", "рисованный ролик", "нарисуй анимацию кодом", a riso or screen-print look, "every frame drawn in JavaScript", doodles on photos or found objects, "дорисуй фото", a procedural or generative short film, or a canvas video in this family of styles for any subject. Not for UI animation, charts or Remotion slide decks.
---

# Hand-drawn canvas animation

You are drawing every frame of a 10 to 30 second film in JavaScript. One HTML
file that loads `core.js`, on vanilla Canvas 2D, without libraries or a video
model. Images appear only in the doodle look, where a found photo is the
subject. A headless Chrome screenshots the frames, ffmpeg packs them, and
the same file writes the music from the same timeline.

Look first: `assets/preview-four-looks.jpg` (one subject through the four
looks), `assets/preview-fly-style.jpg` (a 9.5 s ink film),
`assets/preview-held-once.jpg` and `assets/preview-night-shift.jpg` (doodles
on museum photos, by day and by night),
`assets/preview-template.jpg` (the template's style sheet, palette sheet and
two demo scenes).

## Files

| path | use it for |
|---|---|
| `assets/core.js` | the core: palettes and colour maths, four finishes, marks, lattices, motifs, reveals, photos and doodles, camera, timeline, score plumbing, player, render hooks. Copy next to every film. Never edit per film. |
| `assets/film-template.html` | the file you copy and edit: brief, palette, a puppet, two demo scenes, score, `defineFilm`. |
| `examples/four-looks.html` | a paper boat through riso, screen, pencil and ink with the devices of each look. Read it when a recipe from N to Z is unclear. |
| `examples/fly-style.html` | a 9.5 s ink film: peach, ink blot, dividing egg, camera-follow flight, compound-eye mosaic. Read it for recipes A to H. |
| `examples/held-once.html`, `examples/held-once-photos.js` | a 22 s doodle film on five CC0 museum photos. A teapot tips, a watch gets a drawn hand, a violin sails, a lantern is lit at night, two hedgehogs sit inside a cup. Read it before any doodle film. |
| `examples/night-shift.html`, `examples/night-shift-photos.js` | a 31 s chase on nine CC0 museum photos at 120 bpm, signed with a museum label that carries the author's handle. It shows a pool of light moving through the dark (`nightShot`), runners on the real silhouette of a violin (`rim`), a following camera with whip cuts (`setView`, `whip`), and photos that recoil, roar and gallop. Read it for any doodle film with a story. |
| `scripts/render.mjs`, `scripts/package.json` | headless render from the page's own canvas: `--grid` sheet in seconds, `--only` spot frames, `--ar` and `--width` for format and resolution, full mp4 on twos with a contact sheet, and `<film>-final.mp4` with the score muxed in. |
| `scripts/photo.mjs` | doodle look only: cuts a found photo out of its background (`rembg` if present, colour flood otherwise), writes it into `photos.js` and a check sheet with a coordinate grid. |
| `references/style.md` | the five looks, the 14 rules, the vocabulary table (term → look → kit call). Read before drawing anything. |
| `references/palettes.md` | the palette schema, presets, deriving, tints and shades, finishes and plates. Read before picking colours. |
| `references/scenes.md` | 39 scene recipes across the five looks, timing rules, score motifs. Read while writing the beat sheet. |
| `references/architecture.md` | file layout, invariants, the API index, puppets, riso plates, budget, rendering, pitfalls. Read before editing code. |
| `references/doodle.md` | the fifth look end to end: how to find an idea in an object, source and cut photos, read anchor points, run several pens, put drawings inside and behind the object, night. Read it instead of guessing whenever a photo is involved. |
| `references/brief-template.md` | the brief to fill from the user's request. |
| `references/reference-films.md` | measurements and shot lists of the five films the looks come from. |

## Procedure

Do the steps in order. You cannot judge a frame from code; every "look" means
open the PNG and look at it.

1. **Brief.** Fill `references/brief-template.md` from the request. Ask at
   most one round of questions (subject, length, format, look). Invent the rest.
   Decide the anchor: the one element that survives every cut.
2. **Project folder.** One folder per film:
   ```bash
   mkdir <film> && cp <skill>/assets/core.js <skill>/assets/film-template.html <film>/
   mv <film>/film-template.html <film>/<film>.html
   cp <skill>/scripts/render.mjs <skill>/scripts/package.json <film>/ && cd <film> && npm i --no-audit --no-fund
   ```
   `puppeteer-core` drives the system Chrome and downloads nothing. ffmpeg
   must be on PATH. Set `CHROME=/path/to/chrome` if it is not found.
3. **Beat sheet.** A table in the comment above the timeline: start,
   duration, scene, look, camera, what changes, kit calls, sound cue. Pick
   recipes from `references/scenes.md`.
4. **Palette and sheets.** `usePalette(...)` per `references/palettes.md`.
   Keep `styleSheet` and `paletteSheet` as the first two timeline entries
   while you work. Render and look:
   ```bash
   node render.mjs <film>.html --only 0,12 --ar 1:1
   ```
   `--ar 16:9` or `--ar 9:16` for other formats; `--width 1920` for a larger
   output. Scenes place things relative to `CX`, `CY`, `W`, `H`, never at
   literal pixels, so the format is a render-time choice.
5. **Puppets.** Build each character or object in the PUPPET section per
   `references/architecture.md`. Put it on the style sheet at scales 0.6, 1
   and 1.8. It must read at 240 px.
   For a doodle film, steps 4 to 6 are replaced by the procedure in
   `references/doodle.md`: photos first, then anchors, then the cast.
6. **Scenes, one at a time.** Implement, register in the timeline, then
   ```bash
   node render.mjs <film>.html --grid 24
   ```
   and look at `out/<film>-grid.jpg`: 24 evenly spaced frames of the whole
   film in a few seconds. Fix what does not read, then the next scene. Use
   `--only` for a single frame at full size. Drawn frame index = seconds × 12.
7. **Full render and review.** `node render.mjs <film>.html`, open
   `out/<film>-contact.jpg`, run the checklist below, fix, repeat until clean.
   Remove the sheet entries from the timeline for the final render.
8. **Score.** Edit `score` against the beat sheet. The full render also
   renders the score offline and writes `out/<film>-score.wav` and
   `out/<film>-final.mp4` with sound. Nothing to click.
9. **Deliver** `<film>.html` with `core.js`, the mp4, the contact sheet, and
   one line per scene saying what it shows.

## Non-negotiable rules

Full text and reasons in `references/style.md`.

1. `paper(c)` or `night(c)` first. Never pure black or white.
2. Texture is a finish (`surface`), never a gradient, filter or blur on the
   final canvas. Gradients live only inside riso plates.
3. Fill and outline never coincide: `Path2D` fill, jittered `wob` or
   `crayon` outline.
4. Misregistration is an accent: `scribble` on at most two parts, two-ink
   offsets on dots and lettering only.
5. Every drawable takes `mode`; blueprint is the same geometry in chalk.
6. `Math.random` is banned. Everything goes through `rng(seed)`.
7. Draw at 12 fps, output 24. `drawFrame(i)` is pure.
8. Hard cuts. One transition device between two shots. One finish per shot.
9. Every colour comes from `PAL`; palettes change only on cuts.
10. Silhouettes read at 240 px; montage cards at 120 px.
11. One anchor survives every cut.
12. End with `signOff`.
13. A photo appears only in the doodle look, only as the subject, and only
    with a recorded source and licence. `references/doodle.md` lists where
    rules 2, 3 and 7 bend for it.

## Review checklist

Each item found on the contact sheet or in a spot frame is a defect:

- blank or near-blank frame that is not a deliberate flash;
- subject that does not read at 240 px, or cut by the frame edge without intent;
- a surface without its finish (reads as clipart) or two finishes in one shot;
- a colour not in `PAL`, or a palette change inside a shot;
- texture boil between consecutive drawn frames of a static shot;
- a transition longer than 1 s, or two transition devices in a row;
- more than two scribbled parts in one frame;
- a riso card with no paper showing, or a subject tinted by every plate;
- text in the frame outside the style sheet and the sign-off (the doodle
  look allows up to three handwritten words a shot);
- the anchor missing from a shot;
- a literal pixel position in a scene instead of `CX`, `CY`, `W`, `H`;
- a cue time not on the 1/12 s grid;
- page errors printed by `render.mjs`;
- in a doodle film, anything on the defect list at the end of
  `references/doodle.md`.

## Adapting to other subjects

The core is subject-agnostic. A GPU, a server, a token, a city or a recipe
is built the same way as the fly or the boat: parts as paths, a pose object
with 3 to 6 numbers, a normal and a blueprint renderer. Hex lattices become
LEDs, cells or tiles; stripes become vents or traces; `construction` lines
make any object read as a technical drawing; a riso card of it is three
plates with knockouts. See "Non-creature subjects" in
`references/architecture.md` and the palette advice in
`references/palettes.md`.

If the project already renders video with Remotion, call `drawFrame` from a
component on a canvas ref: `fps: 24` and `drawFrame(Math.floor(frame / 2))`
inside `useCurrentFrame()`.
