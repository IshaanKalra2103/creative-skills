---
name: motion-reel
description: Make short vertical motion-graphic videos (Reels/Shorts/TikTok, 1080×1920, ~20s, with sound) entirely in code — Python + skia + ffmpeg, rendered frame by frame to mp4. Two working templates: a flat editorial-poster explainer (heavy condensed type, golden-ratio type scale, thirds-grid layout, kiki/bouba easing, grain + halftone, procedural beat-grid sound design) and a 3D-camera piece (Fight-Club-style dive, foreground/mid/background staging with depth of field, an orbit that reveals an animate-to-camera cheat, 24 fps on twos, motion blur, cursor auto-zoom, cut to a stock track's real structure). Also a workflow for learning from reference reels (contact sheets, cut counts, frame bursts) and for picking royalty-free "pumpy" stock music and finding its drops. Use when the user wants a motion graphic, explainer reel, kinetic-type video, animated promo or intro as an mp4, wants to learn motion design from a set of reference videos, wants music picked and synced to an edit, or asks to compare two versions of a motion piece.
---

# Motion Reel

A 20-second vertical motion graphic, written as pure functions of time and rendered to mp4. There's no After Effects and no timeline UI: one Python file draws frame `t`, and ffmpeg encodes it with the audio. The rules behind every choice are in `references/lessons.md`, distilled from 30 Aevy Video School reels. Read it before designing. `references/styles.md` catalogues the 11 visual styles those reels use (editorial poster, flat diagram, photo + UI proof, kinetic cards, grunge doc, 3D breakdown, staging boards, timeline strips, tool demo, collage…), with one card per reel and a build recipe for each style. Use it to pick a look.

| template | look | when |
|---|---|---|
| `templates/flat-poster/` | Deep-blue HSL gradient + one red-orange accent, Anton + IBM Plex Mono, overlay grain, drifting halftone, 30 fps, procedural sound on a 120 BPM grid | Design and idea explainers, listicles, "N rules" reels, anything that should read like a poster sequence |
| `templates/depth-camera/` | Paper + ink + cobalt, Archivo Black + JetBrains Mono, multiply paper grain, a real 3D camera, depth of field, motion blur, 24 fps on twos, a stock track | Anything that should feel filmed: intros, product and animation stories, camera moves, depth and reveals |

![flat-poster frames](assets/flat-poster-frames.jpg) ![depth-camera frames](assets/depth-camera-frames.jpg)

## Setup

```sh
cd <skill>; bash scripts/fetch-fonts.sh          # OFL fonts into templates/*/fonts
cp -r templates/<name> <project>/ && cd <project>/<name>
uv run --with skia-python --with numpy python render.py 1.5 6 9.8   # preview stills → prev_*.png
OUT=out.mp4 uv run --with skia-python --with numpy python render.py # full render (~1 min flat, ~5 min depth)
```

`depth-camera` also needs `music.wav`, a 20 s cut, before the full render (see Music below). `MUSIC=path.wav` overrides it.

## Workflow

1. **Brief, then storyboard as a timing table.** Write one row per beat: time window, what's on screen, which lesson it uses. Scene changes land on beats. For a stock track, map the track first and write the table against its real breaks and hits (step 4). Every scene needs:
   - A hook in the first 1.5 s.
   - A new visual state every 1.5–3 s.
   - One idea per beat.
   - An end card held ≥1.5 s.
2. **Theme before motion.**
   - One hue family (tints, tones, shades), **one** accent, one texture, one type pairing.
   - Type sizes from a ratio: `SCALE = BASE × 1.618ⁿ`.
   - Hero at a thirds point.
   - Rounded easing and springs read playful; sharp expo snaps read premium.
   - Rewrite every string in the template. They are example copy.
3. **Edit scenes, not the engine.** Each scene is `sceneN(c, t)` over a global `t`. It uses `P(t, a, b)` for a 0→1 window, an easing (`eo`, `eio`, `spring`), and helpers:
   - `reveal`: text rises through a clip.
   - `typed`: typewriter.
   - `slam`: scale-down punch.
   - `trimmed`/`arrow`: drawing paths.
   - `leader`: label pill.

   Retime by shifting window numbers; overlap hand-offs slightly. Transitions are shapes, not crossfades: a diagonal wipe, a match cut (one element becomes the next scene's element), a split, a dive-through, an orbit, a zoom on the cursor.
4. **Music** (depth-camera, or whenever a real track is wanted):
   - `scripts/pick-music.py list energetic electronic`, then `fetch <ids>`, then `analyze` (BPM, beat-interval steadiness, per-second energy). "Pumpy" shows as per-second RMS chopping high/low (sidechain) with a beat std under 0.02 s.
   - Then `map <track> <from> <to>` for a 0.25 s energy and kick map with beat times. Pick a window that **starts in a break** so the first kick can be the hook slam.
   - `cut <track> <start> -o music.wav` makes the 20 s cut with fades and loudnorm at −15 LUFS.
   - Put the hit and break times into the template's constants (`HIT1`, `S2`…, `DIP*`, `CLICK`).
5. **Preview stills, then look at them.** Render 8–10 stills at scene midpoints and transitions, tile them with `ffmpeg … hstack/vstack`, and read the sheet. Fix and repeat. Things previews caught last time:
   - Labels pointing at the wrong object: depth-sorted draw order ≠ index order, so key per-object data by index.
   - Headlines running off-frame: wrap sizes in `fit()`.
   - Figures staged off-screen: compute their projected x.
   - Missing glyphs (✓ isn't in JetBrains Mono).
   - A blank first beat in a scene.
6. **Full render, then verify the output.**
   - `ffprobe` for duration and fps.
   - `ffmpeg -af ebur128` for integrated loudness (target about −14 to −15 LUFS).
   - A 2 fps contact sheet of the final mp4, looked at once.
   - You can't hear the audio. Say so and report only the levels.
7. **Comparing versions:** stack them side by side and label each:
   ```sh
   ffmpeg -i v1.mp4 -i v2.mp4 -filter_complex "[0:v]fps=30,scale=540:960[a];[1:v]fps=30,scale=540:960[b];[a][b]hstack" -map 1:a v1-vs-v2.mp4
   ```
   Use one soundtrack, not both mixed. Write the comparison as a table (space, depth, frame rate, blur, theme, sound, sync, transitions), then give an honest read of what each does better.

## Engine notes

- **Rendering:** `skia.Surface` in RGBA_8888, with raw frames piped to `ffmpeg -f rawvideo -pix_fmt rgba`, encoded as x264 yuv420p. Fonts come from files via `skia.Typeface.MakeFromFile`.
- **3D (depth-camera):** a `Cam(x, y, z, yaw)` with a pinhole projection (`F = 1100`). `card()` draws any 2D drawing on a flat plane in 3D:
  - It projects 4 corners and uses `Matrix.setPolyToPoly`, which gives true perspective.
  - Depth of field is `ImageFilters.Blur` on a `saveLayer`, scaled by |z − focus|.
  - Skip a card if any corner is behind the near plane.
  - Sort cards far to near by camera-space z.
  - `orbit_cam(pivot, R, yaw)` orbits the camera. Interpolate pivot and radius too so the subject stays framed (search parameters numerically if needed).
- **Animate to the camera:** place objects so they line up in screen space from the shot camera: `world = (screen − centre) · z / F` at random z. They look perfect from the front and broken from the side, and that reveal is the payoff.
- **Frame-rate styling:** render at 24 fps. Quantize a character's time with `twos(t)` / `threes(t)`, and keep the camera on ones.
- **Motion blur:** average `SUB=3` sub-frames across a 180° shutter (`0.5/FPS`), in float32.
- **Texture:**
  - Grain on twos: overlay on dark backgrounds, multiply on light ones.
  - A light texture wants a darken blend mode; a dark one wants lighten or screen.
  - A drifting halftone in screen mode gives a moiré shimmer.
  - Add a vignette.
- **Sound:**
  - flat-poster synthesises kick, hat, whoosh (low-passed noise with a swept cutoff), tick, bloop, riser and boom with numpy, on the beat grid.
  - depth-camera mixes quiet SFX (whoosh into a dive or dolly, pops, a click on the last hit) on top of the stock track.
  - Soft-clip with `tanh` and normalise.
- **Camera shake** on slams is decaying sinusoids from a `SLAMS`/`KICKS` list of `(time, amplitude)`.

## Studying reference reels

`scripts/study-reels.sh <dir> <out>` writes one contact sheet per video (a frame every 2 s) and a scene-cut count. Add `burst <start> <dur>` for a 4 fps sheet of one fast section.

- Read transcripts first if you have them.
- Look at the sheets for format: the hook, the split-screen layout, caption style, annotation, and the CTA end card.
- Look at bursts for how transitions are actually built.
- Write findings into a lessons file as rules with evidence (reel numbers), then a checklist.

Downloading someone's reels is for private study only; don't republish them.
