# Gotchas (each one cost a render)

## Engine

- **The scene registry must load before the scenes.** `core.js` (W, sfx, scene) comes after `components.js` and before `src/scenes/*.js`. If `scene` is defined in `main.js`, which loads last, every scene throws "scene is not defined" and the page renders blank paper.
- **Never store anything on the scene object under `t0`, `t1`, `z`, `name` or `root`.** One scene saved a tile as `S.t1`, which overwrote its end time and blanked the whole scene. Use `S.tA`, `S.tileB`, and so on.
- **`seek(t)` must be pure.** Workers render frames in any order, and the preview scrubs backwards. No accumulated state: compute scroll positions from item arrival times (`scroll += delta * p(t, at, 0.3)`), not from the previous frame.
- **Measure text after fonts load.** `main.js` awaits `document.fonts.ready` plus every face in `FILM.fonts` before `build()`, so `getBoundingClientRect()` in `build` is accurate. If you add a font, add it to `FILM.fonts` or centred lockups will be off.
- **Injected scene CSS beats the base on ties.** `.sc-how .bub { margin: 7px 18px }` has the same specificity as `.bub.me { margin-left: auto }` and loads later, so "your" chat bubbles silently moved to the left. Re-assert the alignment in the scene CSS (`.sc-how .bub.me { margin-left: auto }`).
- **W() matches by normalised word, first hit wins.** `W('yes')` found "yes." at 22 s, not "yes," at 36 s; use `W('yes', 0, 36)`. "And" and "and" are the same word. Normalisation strips punctuation but keeps apostrophes ("nobody's").

## Look

- **Phone island:** if it sits at the top edge of the screen it fuses with the bezel into a notch blob. It must float about 15 px inside the screen, with the status-bar time and battery centred on its height.
- **URLs wrap into single orphan characters** ("…DeMwgtwBww" / "9"). Use `nowrap` + ellipsis, or shorten them.
- **Headlines at weight 900 with −0.07em tracking glue words together** unless each word box has about 0.07em right margin. Straight apostrophes look like ticks; use ’.
- **Scrolling logs need a top fade mask,** or the first row is sliced by the panel edge.
- **Glows look like ringed discs in downscaled contact sheets.** That's moiré from resizing. Check a full-resolution frame before "fixing" them.
- **The dim-and-keep transition** (invert + darken + blur the old layer) needs `filter: none` when the effect is 0, or every frame pays for a filter.

## Render

- **Output size.** Grain at CRF 13 makes the intermediate about 15 MB/s (875 MB for 57.5 s). `render.py mux` re-encodes at CRF 20, slow. Never hand over the intermediate.
- **Motion blur cost.** With `--sub 4`, still frames cost 2 screenshots and moving frames 4. A 57.5 s, 60 fps film on 6–8 CPU workers takes about 25 min (`--sub 1`: about 7 min). Use `sheet` and `at` while iterating; render `full` only when the stills are right.
- **Killing a full render orphans its workers** (Python, headless Chromium, ffmpeg).
  - Kill the render's own process tree, not every Chromium on the machine, because other sessions may be using Playwright too.
  - In zsh, `kill $PIDS` passes one unsplit string and silently fails. Pipe the PID list through `xargs kill -9`.
  - Delete `build/seg_*.mp4` before restarting.
- **`--sub 2` ghosts:** a fast move shows as two distinct copies instead of a smear. Use `--sub 1` (no blur) for drafts and 4 or more for finals.
- **`mux` pairs the video with audio from t=0.** Mux full renders only, not `--a/--b` windows.
- **A loaded machine** (a VM, another render, a malware scan) can slow `full` 10× without failing. If segments stop growing, check `uptime` and `ps` before blaming the code.
- **Don't write these notes through an unquoted shell heredoc.** The backticks run as commands.
- **macOS:** QuickTime can't open files under the session's `/private/tmp` scratch folder (it opens nothing, silently). Copy them somewhere under `~` first.

## Process

- **Review whole frames at full resolution, scene by scene.** Contact sheets catch timing; full-resolution frames catch collisions: a counter under a pill, a duplicate pill peeking out from behind a sticker, tags glued to text.
- **When agents build scenes in parallel, give each one a contract:**
  - its window
  - its entry and exit transition
  - the exact box of every object that crosses its cuts
  - the files it may touch (only its own scene file; inject CSS with a scene-prefixed `<style>`)
  - the frames it must inspect

  If you change a shared value (the mascot's `size` includes arm space: the body is about 69% of it), message every agent with the new boxes.
- **Run the mix through Whisper.** It is the cheapest proof that the voice survives the music and SFX.
