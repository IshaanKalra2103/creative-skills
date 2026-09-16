---
name: riso-rooms
description: Make procedural isometric illustrations with a risograph print look — cutaway rooms, dioramas, gardens, little worlds made of "printed" halftone inks, wobbly hand-drawn lines and gently animated people, all drawn in code on one HTML canvas you can pan and zoom. Use when the user wants an isometric illustration, a riso/risograph/halftone/screen-print style scene, a "room by room" explorable block of dioramas, a cozy pixel-free iso scene for a portfolio or landing page, or asks to recreate that kind of piece.
---

# Riso Rooms

A single `index.html`: a zero-dependency canvas engine plus scene code. Every mark is code — no images, no libraries. The look comes from four rules the engine enforces; your job is composition and storytelling.

## The four rules of the look

1. **Nothing is a flat colour.** Every fill = knock out to paper, then print an ink as a halftone screen at a *tone* (0–1). Four inks: `blue` `coral` `yellow` `teal` (real Riso drum colours). Overlapping inks **multiply**, so coral over teal gives a dark mixed tone — use that instead of adding colours.
2. **Plates don't line up.** Each ink is offset by ~1px (`MISREG`) and screens sit at different angles. Don't "fix" this.
3. **Lines are drawn by hand.** `pen.line` resamples and wobbles every path with noise. Outlines are `blue`, 1.0–1.6 wide; interior detail 0.5–0.8.
4. **It boils.** The scene redraws at 12 fps and the wobble/misregistration seed changes every 4 frames (3 variants). Motion is small loops: steam, flicker, page turns, sway, ripples, a figure's bob.

Light cannot come from multiply: use `pen.light(poly)` / `pen.glow(...)` (they lift paper first, then print yellow).

## Workflow

1. **Copy the template** into the user's project: `cp ~/.claude/skills/riso-rooms/template/index.html <dest>/index.html`. Keep the ENGINE section intact; replace everything below `SCENE — edit below`.
2. **Decide the rooms before drawing.** For each room write one line: *who is here, what are they doing, what's the one hero object*. The best pieces feel autobiographical ("a room for each thing I love"). Ask the user for themes if they gave none — this is the one question worth asking.
3. **Block out each room** (see recipe), then check a screenshot, then add clutter, then animation.
4. **Verify visually every iteration** — you cannot judge this style from code:
   - serve: `python3 -m http.server 8765` in the folder (run in background)
   - screenshot with Playwright/Chrome: `http://localhost:8765/?still&frame=0` (whole block) and `?still&frame=0&room=<id>&zoom=2.5` (close-up). `frame=N` freezes time; `still` disables the idle tour.
   - check console for `room <id>` errors — a throwing room is skipped, not fatal.
5. Stop the server when done. Offer the PNG export (press **P**) or deploy.

## Room recipe (draw strictly back to front)

```js
room({id:'studio', col:0, row:0, w:7, d:7, h:3,
  style:{floor:['blue',.7], wall:['yellow',.28], wall2:['coral',.3], planks:true},
  draw(pen, t, R){           // t = seconds, R = seeded random for LAYOUT ONLY
    const p = pen.p;         // p(i,j,z) -> [x,y]
    // 1. wall things:  pen.window / pen.bookcase / frames drawn with pen.wallQuad
    // 2. flat floor things: rugs, pools of light, shadows, puddles
    // 3. standing things sorted by i+j ascending (back → front); people interleave by their i+j
    // 4. things on top of things (books on tables, mugs, steam)
    // 5. air: sparkles, dust motes, particles
  }});
```

- **Coordinates:** 1 tile ≈ a person's shoulder width; a person is ~1.7 z tall; tables 0.75; chairs seat 0.45; wall 3. `i` runs toward screen lower-right, `j` toward lower-left. Back walls are the `i` wall (plane j=0, back-right) and the `j` wall (plane i=0, back-left).
- **Size:** rooms 6–8 tiles. Bigger rooms read as empty. Layout grid `col,row` arranges rooms into a block; spacing auto-fits.
- **Density:** aim for 15–30 objects per room, 1–3 people, at least one light source, some floor clutter (papers, books, a cup). Empty floor is the most common failure.
- **Tone palette:** floors .55–.8, walls .25–.4, furniture .5–.8, side faces auto-darken, highlights = `'paper'`. Keep one ink dominant per room + one accent; use all four across the block.
- **Outdoor rooms:** `h:0` (no walls), `planks:false`, draw your own fence/hedge, grass tufts, water with `blue` + `teal` overprint.
- **R is for layout.** Call `R()` the same number of times every frame (never inside `if (t…)`), or the room reshuffles. Use `t` for motion.
- **Animation timing:** keep loops ≥1s; use `Math.sin(t*…)` or `(t*speed)%1`. Anything moving each frame stays calm because of 12 fps.

## Extending the pen

Add new props inside `makePen` next to the existing ones, composed from `pen.box`, `pen.shape`, `pen.fill/tint`, `pen.line`, `pen.ellipse`, `pen.blob`, `pen.leaf`. Pattern: shadow → back parts → front parts → top → details. Return anchor points (like `person` returns `hand`/`head`) so props can attach. Full API: `references/api.md`.

## Performance

Fine up to ~6 detailed rooms (offscreen rooms are culled). Beyond that, cache each room's static layer per boil variant (3) to an offscreen canvas and only redraw animated parts on top.

## Don'ts

- Don't use `ctx.fillStyle = '#hex'` for scene content — it breaks the print illusion. Always go through the pen.
- Don't add gradients, blur, shadows, or anti-halftone smoothing.
- Don't copy rooms/code from someone else's published piece; make original scenes.
