---
name: ink-abstraction
description: Draw a subject as a 12-panel "abstraction sheet" in vanilla JavaScript on a canvas — a pen-and-ink progression on textured paper with Roman numerals, from a hatched ink sketch (I–IV, with solid black masses in III–IV), to a cross-stitch grid (V), to square cells filled with dots, circles, x's, tally marks and hatching that get coarser (VI–XI), to a few overshooting lines and one hatched knot (XII). Lines boil gently. Use when the user wants the Picasso-bull-style simplification sequence, a "from sketch to abstraction" sheet, a hand-drawn ink progression of any object, animal or character, or asks to redo the bull sheet with a different subject.
---

# Ink abstraction

One engine (`assets/engine.js`, no libraries) turns a **subject description** into the whole sheet. You never write stage code; you describe the thing. `examples/bull.html` and `examples/hotdog.html` are complete subjects; `assets/bull.png` and `assets/hotdog.png` show the output.

## Workflow

1. **Copy**: `mkdir <dest> && cp ~/.claude/skills/ink-abstraction/assets/engine.js ~/.claude/skills/ink-abstraction/template/index.html <dest>/`. Replace the `defineSheet({...})` block.
2. **Silhouette first.** Sketch the subject in the unit box **x 0..200, y 8..120**, side view, facing left, filling most of the box. Write `polys` as closed point lists, one per part (body, head, legs, bun…); the silhouette is their union. 30–50 points for an organic outline. Helpers like a `capsule()` or `ellipse()` generator in the subject file are fine. Thin parts (legs, stalks) need ≥ 6 units of width or they vanish in the cell stages.
3. **Shade field.** `shade(x, y) → 0..1` decides everything tonal: hatch density in I–II, the black mass in III–IV (`dark` threshold, default .55), and which mark fills each cell (light → dots, circles, x's, tallies, hatching, scribble ← dark). Build it from a vertical gradient + a few Gaussian bumps (`a * Math.exp(-dist² / spread)`) for dark and light areas, plus a small sine term for variation. Give distinct parts distinct values so the cells show the structure.
4. **Details.** `strokes` are open lines drawn with the outline in I–IV (horns, tail, mustard, motion ticks); add `knock: 3..5` to lay paper under a line so it reads over dark hatching. `details(pen, stage, R)` draws last in I–IV for faces and small features: `pen.dot(x, y, r, 'paper')` knocks out a disc, `pen.dot(x, y, r)` inks one, `pen.stroke(pts, {w, amp, knock, close})`. Radii are in unit coords.
5. **Anchor.** `anchor: [x, y]` is the one feature that survives to XII as a hatched knot (a head, a face). Pick the thing that identifies the subject. `anchorSwirl: false` drops the eye swirl drawn there in I–IV.
6. **Look at it** — you can't judge this from code:
   `~/.claude/skills/ink-abstraction/scripts/shot.sh <dest>/index.html /tmp/sheet.png` then read the PNG. Check: the silhouette reads in I at thumbnail size; III's black mass sits on the dark parts, not everywhere (raise `dark` if it floods); VI–VIII show the parts as different marks; XII still suggests the proportions and has the knot in a sensible spot. Try `seed` 1–3 (third arg) before tuning numbers.
7. Tell the user: click = new variation, **B** toggles the boil, `?still`, `?seed=N`.

## Rules of the look

- One ink (`#1d1c1b`) on warm grey paper. No colour, no gradients on marks.
- Every mark wobbles (`amp`); outlines are drawn 1–3 times, the later passes lighter.
- Layout choices come from the seeded layout rng; only jitter re-seeds on boil, so marks shimmer but never jump.
- Panels are a fixed 4×3 grid, numerals I–XII in serif below each.
- Don't add stages or change the engine per subject. If something can't be expressed as polys + shade + strokes + details + anchor, extend the engine's contract (and update the header comment), not a copy of it.
