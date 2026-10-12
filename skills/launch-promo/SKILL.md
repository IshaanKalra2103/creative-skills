---
name: launch-promo
description: >-
  Kinetic product-launch films rendered in code: warm paper and ink, one acid accent plus a brand field colour,
  hard-shadow sticker cards, heavy tight Inter headlines that rise word by word on the voiceover, a mascot that
  carries the cuts, tilted 3D phones, dark feature cards that light up one by one, ring/circle/panel wipes,
  stamps, counters, toggles, cursor clicks, film grain, and an end card with a CTA click. One deterministic
  HTML page (seek(t) is pure) rendered by parallel headless Chromium with sub-frame motion blur, voiced with
  ElevenLabs (one take, each line laid on a target beat), scored with the ElevenLabs Music API on the cuts,
  and 100+ synthesised SFX registered by the scenes. Ships a 20 s template (any product), a full 57.5 s
  worked example, scripts to study a reference (contact sheets, Whisper line timings, colour sampling, motion
  density), and references for the aesthetic, the motion vocabulary with numbers, text animation, the 9-beat
  structure, audio and gotchas. Use when the user wants a launch video, product promo, SaaS/app explainer,
  motion-graphics ad, "make a video like this" for their own product, kinetic typography with voiceover, or
  wants an existing promo restyled in this sticker/kinetic look, even if they never say HTML or code.
---

# launch-promo

A launch film is one HTML page. `seek(t)` draws the frame at time `t` from scratch. Scenes are small files that build DOM once and update it as a pure function of `t`. Their beats hang off voiceover words (`W('viral')`), so the voice and the picture can't drift apart. `render.py` renders it in parallel headless Chromium workers with 4-sample motion blur. `audio.py` mixes the voice, the music and the SFX cues the scenes registered.

![the Loopcast example](assets/preview.jpg)

| path | what it is |
|---|---|
| `template/` | Copy this to start. A 20 s film for a placeholder product ("Orbit — replies on autopilot") in four scenes: hook, brand reveal, feature cards, end card. It renders before any API call (planned VO timings, SFX-only mix). |
| `template/film.js` | The one config: size, fps, length, brand, palette, HUD text, fonts, mix settings. |
| `template/src/lib.js` | Easing, closed-form springs, `rise` (word-rise headlines), `type` (typewriter), `noise1`, cached DOM writes. |
| `template/src/components.js` | Mascot (+ app-icon mode), phone, sticker, pill, tag, toggle, keycap, starburst, heart, paper plane, cursor, app tiles, wordmark. |
| `template/src/core.js`, `main.js`, `style.css` | Scene registry + `W()`/`sfx()`, `seek(t)` + grain + preview scrubber, the sticker/type/device styles. |
| `template/vo.py` · `music.py` · `audio.py` · `render.py` | Voice (plan / take / place), music plan → ElevenLabs Music, SFX synthesis + ducked mix, stills / sheets / full render / mux. |
| `examples/loopcast/` | A full 57.5 s, 9-scene film (built shot for shot on a reference promo) as an overlay on the template. |
| `scripts/` | `refsheet.py` (labelled contact sheets), `ref_words.py` (Whisper word timings → line starts), `palette.py` (sample hex from a frame), `motion_stats.py` (% frames moving, longest hold). |
| `references/` | `aesthetic.md`, `motion.md`, `text.md`, `structure.md`, `audio.md`, `gotchas.md`. Read aesthetic + motion before writing a scene. |

Requirements: `uv`, `ffmpeg`, Playwright's Chromium (`uvx playwright install chromium`). For voice and music you need an ElevenLabs key (`$ELEVENLABS_API_KEY` or the macOS Keychain item `ELEVENLABS_API_KEY`). Whisper checks use `mlx-whisper` on Apple Silicon.

## Workflow

### 0. Collect the product truth
Write down the product's real numbers and artefacts before any design: prices, run times, counts, screenshots, real UI text, real user complaints. Every number on screen must be one of these (`references/structure.md` → Adapting).

### 1. Pick the shape
- **With a reference video** ("make it look exactly like this"): study it first.
  ```sh
  S=<this skill>/scripts
  uv run $S/refsheet.py ref.mp4 study/beats 1            # whole film at 1 fps -> beat map
  uv run $S/refsheet.py ref.mp4 study/hook 10 0 4.2 6 7  # 10 fps window -> easing
  uv run $S/ref_words.py ref.mp4 study/words.json        # every VO line's start = your targets
  uv run $S/palette.py ref.mp4 16.6 960,620,paper 230,360,ink 400,660,accent
  uv run $S/motion_stats.py ref.mp4                      # the motion density to match
  ```
  Write a beat table (time → what's on screen → motion → transition out) and map it onto `references/structure.md`.
- **Without one:** use the 9-beat map in `references/structure.md` and cut it to length (20/30/45/57 s).

### 2. Script and plan
```sh
cp -r <this skill>/template my-film && cd my-film
# edit film.js (brand, palette, dur) and script.json (one [target_start, line] per beat)
uv run vo.py plan            # offline word timings -> vo_words.js
open index.html              # preview; ?t=12 jumps; space plays; arrows step frames
```
Write lines against the target starts (`references/text.md`). `plan` prints each line's estimated end. A line that runs into the next target is too long.

### 3. Build scenes beat by beat
One file per scene in `src/scenes/`. The shape (see `template/src/scenes/*.js`):

```js
scene({ name: 'hook', t0: 0, t1: 5.45, z /* optional stacking, default t0 */, hud: '01 — THE PROBLEM',
  build(root) { /* create DOM once; measure text here; register sfx(t, type, gain) cues */ },
  update(t)   { /* pure: set transforms/opacity/text from t only; this.dark = true on dark scenes */ } });
```

Pull curves and numbers from `references/motion.md` and looks from `references/aesthetic.md`. After each beat:
```sh
uv run render.py at 1.6 3.4 4.4      # full-res stills -> build/at/
uv run render.py sheet 0 5.5 10 8    # 10 fps contact sheet of a window
```
Compare against the reference at the same timestamps, and look at whole frames at full resolution for collisions, wrapping and alignment (`references/gotchas.md`). For long films, scenes can be built by parallel agents. Give each one a hand-off contract: its window, its entry and exit, the exact boxes of objects that cross the cut, and its one file.

### 4. Voice, music, effects
```sh
uv run vo.py take && uv run vo.py place   # one ElevenLabs take, each line laid at its target (prints DRIFT if late)
uv run music.py a                         # music.json sections on the cuts: drop on the reveal, breakdown under the end card, final hit
uv run render.py cues && uv run audio.py a   # SFX synth + duck + mix -> build/mix.wav
uv run <this skill>/scripts/ref_words.py build/mix.wav   # every line should come back word for word
```

### 5. Check the cut, then render
```sh
uv run render.py sheet 0 20 4 8                            # whole film, 4 fps
uv run render.py full --workers 8 --sub 1 && uv run render.py mux   # quick full preview
uv run <this skill>/scripts/motion_stats.py build/final.mp4         # aim 60-85% moving, no hold > ~1.2 s
uv run render.py full --workers 8 --sub 4 && uv run render.py mux   # final: build/final.mp4
```
Before handing it over:
- Watch it with sound.
- Scrub every hand-off.
- Spot-check full-resolution frames in every scene.
- Confirm every number on screen is real.

Hand over `build/final.mp4` (x264 CRF 20, −14 LUFS), not `build/video.mp4`, which is the near-lossless intermediate at about 15 MB/s.

## Starting from the Loopcast example
```sh
cp -r <this skill>/template film && rm film/src/scenes/*.js && cp -r <this skill>/examples/loopcast/. film/
cd film && uv run render.py sheet 0 57.5 1 8
```
It ships the real placed word timings (`vo_words.js`), so the picture renders immediately. Run `vo.py take && vo.py place` and `music.py a` to rebuild its audio.

## Related skills
- `motion-replica`: rebuild one specific video shot for shot (3D props, grids). Use launch-promo when the goal is *your* product's film in this style.
- `motion-reel`: vertical 1080×1920 reels in skia.
- `fframes-fx`: Rust/GPU shader looks.
