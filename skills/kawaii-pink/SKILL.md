---
name: kawaii-pink
description: >-
  Cute hand-drawn logo stings rendered in code with fframes (Rust, SVG, Skia GPU): one hot-pink
  boiling line on pale grey, puffy bubble-graffiti letters for any word that inflate one by one,
  smears that snap into stars, a faint 3x echo of the frame behind everything, and an original
  mascot that sits on the word, blinks, slurps the whole logo into its mouth and hops to the
  centre with squash and stretch. Synthesized SFX and a pluck loop on the same timeline. Use when
  the user wants a kawaii / cute / doodle / bubble-letter logo animation, a mascot logo sting or
  intro, a "boiling line" 2D cartoon look in code, or to recreate a short 2D logo animation
  from a reference clip (download, measure, rebuild).
---

# kawaii-pink

A 5.5 s, 1080x1080, 30 fps logo sting rendered with fframes. The template takes a word, an
ink colour and a mascot seat from the command line; everything else (letters, stars, mascot,
sound) is built in code from point lists.

```
kawaii-pink/
  SKILL.md                  this file
  template/                 the fframes project (copy it)
    src/lib.rs              beat sheet, word layout, stars, slurp warp, echo + boil, audio map
    src/glyphs.rs           A-Z and "!" as bubble letters (fat round-capped strokes)
    src/mascot.rs           the mochi mascot: state per beat + drawing (swap for your own)
    src/geom.rs             easing, springs, Catmull-Rom, partial polylines, path helpers
    tools/gen_audio.py      synthesizes every sound into media/
    tests/frames.rs         inspects every frame for the default word and the whole alphabet
  scripts/study.sh          download a reference (yt-dlp) and measure it (palette, beats, twos, audio)
  scripts/compare.sh        reference | render side by side
  references/beats.md       the beat sheet, measured, and what drives each beat
  references/lettering.md   how the bubble letters work, glyph rules, adding glyphs
  references/mascots.md     designing an original mascot, face kit, squash numbers
  assets/                   frames.jpg (the film), alphabet.jpg (every glyph)
```

Read `../fframes-fx/references/fframes/api.md` (the fframes-fx skill) if fframes is new to
you. This skill only needs fframes itself, no shaders.

## Rule: original characters only

The mascot and the word are always original. If a reference clip features a known character
(a game, anime or brand mascot) or a trademarked logo, recreate the motion, timing, palette and
line style, and swap in an original character and a different word. Say so to the user once.
Don't trace, redraw or approximate the known character, its silhouette or its signature
features. `references/mascots.md` has a recipe for designing one quickly.

## 1. Make one

```bash
cp -R ~/.claude/skills/kawaii-pink/template my-sting && cd my-sting
cargo build --release                         # first build ~1-2 min (prebuilt Skia + ffmpeg)
R() { cargo run --release -- "$@"; }          # zsh: a function, not a variable
R --word BOBA frame 2.5s                      # the hold frame: check the layout first
R --word BOBA --ink "#ff4fa3" --seat 0.4 render -o boba.mp4
```

- `--word`: A-Z, space and `!`. Lowercase is drawn uppercase. 3-8 letters look best; longer
  words get smaller, because the word is fitted to 800x300 px.
- `--seat`: where the mascot sits along the word, 0-1 (default 0.56). Put it over a letter
  with a flat or round top, not on a thin stem: on a stem it reads as a mushroom.
- `--ink`: the line colour. The background (#f0f0f0) and echo grey (#e8e8e8) are constants in
  `lib.rs`.
- Sounds: `uv run --with numpy python tools/gen_audio.py media`, then `touch src/lib.rs`
  (media is embedded at compile time) and rebuild.

## 2. How it works (read before changing it)

- **Point lists everywhere.** Letters are polylines, stars and the mascot are closed
  polygons. Nothing uses `<text>` or SVG transforms for motion, so the slurp can move any point.
- **Bubble letters = two strokes.** Each letter is drawn twice along the same skeleton: ink at
  `w + 2*LINE`, then paper at `w`. Strokes of one letter merge. A `seam` stroke starts a new
  outlined part on top. A tiny seam stroke inside a merged letter shows as an outlined pill,
  which is how counters (the holes in A, B, D, P, R) are drawn. Draw-on = take the first
  `progress * length` px of the strokes while the width springs from 0.45 to 1 with overshoot.
- **The slurp** (`Slurp::apply`): every point is pulled to the mouth with a delay that grows
  with its distance, eased in, plus a spiral. Near points go first, so letters stretch into
  streaks toward the mouth. Stroke width shrinks with the mean pull. Shapes are dropped once
  every point has arrived. The mascot is drawn last, so letters vanish behind its body.
- **Echo:** `compose(t - 0.1)` again in grey, scaled 3.1x about the centre, behind everything.
  It costs nothing extra to design and is most of the look.
- **Boil:** one `feTurbulence` + `feDisplacementMap` on the whole front group. The seed changes
  every 2 frames and cycles 3 drawings. baseFrequency 0.011, 1 octave, scale 9. Higher
  frequency or more octaves looks fuzzy instead of hand-drawn.
- **Smear to star:** each big star is a radial polygon whose points lerp between a star and a
  lumpy ellipse stretched along the travel direction. One star smears into the "pen" that
  starts the first letter.
- **Mascot:** `mascot::state(t)` returns position, scale, squash (sx, sy) and face flags for
  every beat. Squash keeps volume (`sx = sy^-0.8`) and outline widths stay constant, because
  points are scaled, not the SVG group.
- **Audio:** every cue in `audio()` reads the same constants as the animation (letter starts,
  star landings, SLURP_AT, LAND_AT). The bed is quiet (-15 dB) and the hits carry it.

## 3. Change the timing

All beats are constants at the top of `lib.rs` (DRAW_AT, LETTER_DRAW, SLURP_AT, GULP_AT,
HOP_AT, LAND_AT) plus the star tables (BIG_STARS, LOGO_STARS) and the mascot's internal times.
`references/beats.md` lists what each one drives. Move a beat, then run `R timeline` and
`R audio at <t>` so the sounds follow.

## 4. Recreate another reference

```bash
~/.claude/skills/kawaii-pink/scripts/study.sh "<x.com / youtube / file>" ref/
```

It writes contact sheets (`sheet.png` at 6 fps, `intro.png` and `outro.png` every frame), all
frames and `report.txt` with:
- the palette and an ink guess
- ink coverage and bounds per frame: beats show up as jumps
- frame-to-frame change: alternating big/small numbers in holds mean the lines boil on twos
- the audio envelope: hits show up as spikes over the bed

Write the beat sheet from those, keep this template's structure and retime it. Check with
`scripts/compare.sh ref/src.mp4 out.mp4`: every beat should land in the same tile.

## 5. Gotchas (each cost a round)

- **zsh aborts a `&&` chain on a glob with no matches** (`rm review/k_*.png`). Use
  `frame 0.4s,0.52s,1s -o dir/`: one call renders many frames.
- **Fat strokes close counters and slits.** A gap shows only if the centre distance is more than
  `(w1 + w2)/2 + 2*LINE`. A C with a 70° opening and w=82 closes into an O. Use a ~120° opening
  and ball terminals.
- **Seams over a stem look wrong** (B reads as 3, P as ?). Merge bowls into the stem and add
  counter pills.
- **Mascot on the last letter's stem** reads as a mushroom. Seat it top-centre on a round letter.
- **First pass looked like a rounded sans:** stroke widths of 55-62 on a 185 cap height are too
  thin for bubble letters. 72-86 with ball feet and overlapping neighbours read as graffiti.
- **`include_media_dir!` embeds at compile time:** `touch src/lib.rs` after regenerating sounds.
- **Mix level:** the synthesized hits sum to about -21 LUFS. The +6 dB on every track lands at
  about -15 LUFS with the limiter at -1 dBTP.

## 6. Review before saying it's done

1. `R inspect` and `cargo test --release`: no problems in any frame (the tests also cover A-Z).
2. `R frame 2.5s` at full size: the word reads, nothing touches the edges, stars don't sit on
   letters, the mascot sits on its seat.
3. `R strip -n 36 --columns 6 --width 270`: read every tile (smears, pen hand-off, inflate,
   blink, slurp, splat, stretch, settle).
4. `R audio analyze`: about -14 to -15 LUFS integrated, true peak at or below -1 dBTP. You
   can't hear it, so ask the user to run `R preview`.
5. `R render` then `ffprobe`: 165 frames, 5.5 s, stereo AAC.

Motion modeled on a logo sting by [G4K Motion](https://x.com/G4K_Motion). The mascot, the
lettering, the code and the sound are original.
