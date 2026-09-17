---
name: logo-intro
description: Build a kinetic name/logo intro animation in plain JavaScript on one HTML canvas — grainy atom rings, a hyperspace warp of colored streaks, a flash to paper with the first letter spinning in, letters popping in with colored ghost offsets and doodles, one accent letter cycling through a boiling highlight box / scribble circle / script style, then a jagged wipe that ends on a sparkle. Use when the user wants an animated logo reveal, a name intro, a motion-graphics title card, a "YouTube/portfolio intro" in the browser, or wants to recreate this kind of After Effects-style intro in JS without libraries.
---

# Logo Intro

One `index.html`, no libraries: Canvas 2D + requestAnimationFrame, a single time value `t` (seconds) driving pure functions of time. Two Google Fonts (Bricolage Grotesque 800, Caveat 700); it falls back to system fonts if they don't load. `assets/frames.png` shows the stages.

## Timeline (seconds, at speed 1)

| t | stage | function |
|---|---|---|
| 0.15–1.6 | stippled atom rings + spinning ellipses + diagonal beam around a small star | `sceneCosmos` |
| 1.0–5.2 | hyperspace streaks (blue/yellow/white/gray) accelerate; star grows | `sceneCosmos` → `drawStreaks` |
| 4.55–6.0 | cream flash expands from center; first letter spins in with yellow/blue ghosts | `sceneFlash` |
| 6.0–7.0 | letters pop in 0.13s apart (overshoot, rotation, colored ghosts); one doodle per letter | `sceneName`, `drawDoodle` |
| 7.0–10.8 | accent letter in a boiling yellow box; box turns out and back at 8.5–9.8; sparkle twinkles | `drawAccent` phase A |
| 10.6–12.2 | accent letter: scribbled loop → Caveat script → plain white | `drawAccent` phases B–D |
| 11.85–12.75 | yellow line flies in, jagged yellow/blue edge wipes the word left→right | `sceneName` |
| 12.7–13.9 | speck flies out, becomes a white 4-point star that spins and pinches out | `sceneOutro` |

Loops at `END + 0.8`.

## Workflow

1. **Copy the template**: `cp ~/.claude/skills/logo-intro/template/index.html <dest>/index.html`.
2. **Set the config** at the top of the script: `NAME`, `ACCENT` (index of the boxed letter), palette `C`, `SPEED`. The same values can be set from the URL for quick tries: `?name=ada&accent=0&yellow=ff5a36&blue=00a37a&speed=0.8` (hex without `#`, any key in `C`).
3. **Customize by editing stages, not by adding a framework.** Every stage reads `t` and uses `prog(t, a, b)` (0→1 over the window) with an easing. To retime, shift the window numbers; to cut a stage, skip its call in `frame()` and shift later windows back. Keep windows overlapping slightly — the hand-offs (rings → streaks, streaks → flash, flash → letters) hide the cuts.
4. **Verify visually** — you can't judge motion from code:
   - serve: `python3 -m http.server 8765` in the folder (background)
   - freeze frames with `?t=<seconds>` (hides the hint) and screenshot with Playwright/Chrome at the stage midpoints: `0.8, 3.2, 5.3, 6.4, 7.8, 9, 11, 11.6, 12.45, 13.3`. Tile them with ffmpeg `xstack` into one sheet and look at it once.
   - check for page errors. Stop the server when done.
5. **Recreating a reference video instead?** Extract frames first: `ffmpeg -i ref.mp4 -vf "fps=1,scale=480:-1,tile=4x4" sheet.png`, then denser (`fps=4`, cropped) for fast sections. Map each stage to a time window before writing code, then compare your `?t=` sheet against the reference sheet.

## Rules of the look

- **Grain everywhere.** A 256² noise tile is redrawn at a random offset every frame (screen on dark, multiply on cream). Dots in rings and the star halo use `Math.random()` per frame so they shimmer.
- **Boil, don't tween, hand-drawn shapes.** `boilRect` re-seeds its vertex jitter 8×/s. Use seeded `rng(seed + floor(t*8))` for anything that should look drawn; use seeded `rng(const)` for layout so replays match.
- **Three inks + paper.** Dark bg, white, one warm accent (yellow), one cool accent (blue), cream paper for the flash. Ghost copies of letters use the two accents offset in opposite directions and collapse to zero as the letter settles.
- **Overshoot on entry, ease-in on exit.** Entrances `eOutBack`, exits `eInCubic`, camera-like moves `eInOut`.
- **Size from the viewport.** `FS` (font size) and `S` (short side) scale everything; never hard-code pixels.

## Extending

- **Export video**: `canvas.captureStream(60)` + `MediaRecorder` for 15s, save the webm, or render `?t=` frames with Playwright and stitch with ffmpeg for a frame-perfect mp4.
- **Longer names**: `layout()` shrinks `FS` to fit; above ~10 letters, reduce the per-letter delay (0.13) so the pop-in stays under a second.
- **Logo instead of text**: draw the mark in the flash stage in place of the first letter and skip `drawAccent`.
