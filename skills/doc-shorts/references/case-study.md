# Case study: rebuilding a Pinterest doc reel tick for tick

The skill comes from rebuilding one reel exactly: [Pinterest pin 1086986060090796381](https://in.pinterest.com/pin/1086986060090796381/),
a 27 s edit about Google's origin by EarnEdits.com. It runs 720x1280, 30 fps, with a VO and a music bed, and ends on an
ad for their After Effects project files. The rebuild is `examples/google-origin`. It renders with the generic engine
and is the engine's regression test: every tick is compared against the reel's frames.

## Process that worked

1. **Study** (`scripts/study.py`): download the reel and extract one frame per tick. Then make contact sheets at
   10 fps, list the cuts, and get Whisper word timings. Read every sheet and write a shot list in ticks (shot →
   start tick → what happens per tick).
2. **Measure, don't eyeball**:
   - ink bounding boxes of text per tick (`tools/measure.py`);
   - FFT of flat areas for scanline and halftone periods;
   - mean colours;
   - frame differences for the cadence;
   - template tracking (NCC) for photo positions;
   - landmark fits for the Earth camera.
3. **Lock the shared look first** on two simple shots (a grey card, a black card): scanline depth, grain, caption
   filter, caption colour. Only then split the shots across parallel builders, so they all inherit one look.
4. **Build in parallel**. Each builder works in its own copy of the crate (APFS `cp -c -R`, which keeps the compiled
   `target/` so nobody waits on cargo's lock), on disjoint files. There is one spec file per shot (`shots_dir`), so
   merges never conflict.
5. **Review against the reference at every tick** (`tools/cmp.sh`), then on whole-film contact sheets, reference
   rows above ours.

## Measurements

- Cuts, in ticks: 0, 11, 21, 28, 40, 48, 56, 66, 74, 83, 95, 99, 104, 111, 120, 135, 154, 167, 180, 192, 207, 215,
  228, 234, 253; the video ends at 271. Every cut lands on frame 3k-1. The cuts fall on narration words, floored to
  the tick: "Larry" at 3.98 s → 4.0, "exploding" at 7.40 → 7.4, "Millions" at 8.34 → 8.3.
- Shots average 1.1 s (0.4-1.9 s). Typing runs about one letter per tick, and "What if websites were ranked?" took
  19 ticks.
- Texture, captions and palette: see `look.md`.

## Lessons

- **Fonts by ratio, not by eye.** EB Garamond looked right but was 30-45% too wide; Instrument Serif matched within a
  few %. The handwriting also took a 24-font comparison (Homemade Apple, not Cedarville Cursive).
- **"White" captions measure ~213**, not 255. Matching ink mass mattered more than matching the glyph.
- **Reels show AI-outpainted versions of famous photos.** The Google board, the 1998 office and the Stanford pair were
  all wider than any original online; the Stanford shot is a Getty cut-out on another backdrop. Exact framing needed
  plates mosaicked from the reel's own frames, with the caption removed.
- **Blur out baked scanlines and halftone before registering frames.** They're fixed to the screen. SIFT locked onto
  them and reported a panning shot as static.
- **Some "photos" are video.** The Nightmare meme's face moves every tick, so it's a per-tick flipbook (`frames = [...]`).
- **Stock footage (Earth network, thumbnail tunnel, ribbons) can't be matched pixel for pixel.** It got procedural
  lookalikes with the camera fitted to the reference: 12 coastline landmarks for the Earth, about 16 px mean error.
- **The flat grey cards carry scanlines but no halftone and no vignette.** One global look with per-kind multipliers
  covered it.
- **fframes**:
  - `svgr!` treats CSS colour names as colours, so name filter results `matte`, `soft`, ...;
  - shader `<image>` layers can't be filtered by a parent group with a blend mode;
  - `text_width` needs `'static` strings (intern them);
  - more in the fframes-fx skill.

## Credits for the example

- The reel: EarnEdits.com (via Pinterest). The narration and music in `examples/google-origin/audio/ref.wav` are theirs.
- Photos: Larry Page and Sergey Brin at Google's servers, 2003 (Corbis; via the New York Post). The Stanford people
  layer is Getty Images 524309146 (via Wired). The office (1998) and Google board photos and the "sweaty gamer" meme
  (YouTube J4koT4sAMRo) are reproduced as the reel showed them. Windows XP "Bliss" is by Charles O'Rear / Microsoft.
  Full list with URLs: `examples/google-origin/assets/SOURCES.md`.
- Natural Earth (public domain) for the Earth plate.
