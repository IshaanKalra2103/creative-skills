---
name: reel-explainer
description: Make short vertical (1080×1920, 60–90 s) animated explainer reels that show the invisible mechanism inside an everyday thing, in the dark-canvas style of the viral speedy_devv / KEY FRAMES reels. Real 3D models (three.js: PBR, shadows, DOF, bloom) in one set with one continuous camera move, a cutaway to see inside, a gold signal colour for the invisible actor, labels and numbers pinned to the parts, real web images (sourced from Google Images in Chrome) placed in the scene, chunked captions with a blue keyword box, and a share-sheet ending. It covers the whole job, from topic check, research and a hook-first script to voiceover (free Kokoro + Parakeet word timings, or ElevenLabs), scenes keyed to words, render and QA, delivering mp4 + cover.jpg + caption.txt as local files. Use it whenever someone wants an explainer reel, short, TikTok or Instagram video on how something works ("make a reel explaining how X works", "full visual of X", "do one like the touchscreen video", "turn this topic into a short"), or wants to make videos in that creator's style, even if they never say "reel-explainer". Not for product launch films (launch-promo), interactive 3D explainers (3d-deep-explainer), or AI-generated footage (wan-video).
---

# Reel explainer

Short vertical explainers where an invisible mechanism inside something the viewer touches every day becomes visible. The style and the rules come from 25 reels analysed frame by frame, by speedy_devv, made with his KEY FRAMES pack. The top two did 667K and 482K likes, with flops at 2 and 78. Per-reel notes: `~/Documents/projects/reel-explainers/LEARNINGS.md`.

Output is local files only: `out/<slug>.mp4`, `out/cover.jpg`, `out/caption.txt`. Never publish anywhere.

## What makes these work (keep this in your head the whole time)

1. **Topic:** an invisible mechanism in an everyday object, plus a paradox the viewer can test right now, a universal annoyance, and something to do at the end.
2. **Script:** a hook in the first second, then "So what is it actually…?", then a reframe ("It isn't X, it's Y"), then "Imagine you're…", then the mechanism in tiny steps with the term last, then a "But…" twist, proof numbers with a source, "That's also why…" ×2, the action, a poetic reframe that flips the hook, and "Send this to the friend who…" as the last line only.
3. **Frame:** a dark lit 3D set; **real models, never drawn devices** (a CSS phone looks cartoonish); **one continuous camera** that dives into a cutaway, no cuts inside a topic; the caption on top in short chunks with one boxed keyword; **gold = the invisible thing**; **numbers sit on the parts** and change; small caps labels pinned to the model; **real photos from the web placed in the set** with a credit; tiny honesty footnotes.
4. **Motion:** the picture is on screen by 1 s; a new beat every 2–4 words; nothing still for more than ~0.8 s; no bare frames; every beat keyed to the word that names it.

Read `references/script.md` before writing the script and `references/visuals.md` before storyboarding. They hold the reasoning, the hook templates, the recipes and the examples behind each rule.

## Workflow

Work in `~/Documents/projects/reel-explainers/reels/<slug>/` unless the user names a place.

**0. Copy the template.**
```bash
SK=~/Documents/projects/creative-skills/skills/reel-explainer
mkdir -p ~/Documents/projects/reel-explainers/reels && cp -R $SK/template ~/Documents/projects/reel-explainers/reels/<slug>
cd ~/Documents/projects/reel-explainers/reels/<slug> && rm -rf build
```
The template is a working 16 s demo (a phone's proximity sensor): a scanned head and a real iPhone model in one 3D set, one camera move from the call to a cutaway of the cheek with the IR beam, a teardown photo card, labels and a live count, and the share-sheet ending. Read `src/scenes/set.js` and `src/scenes/labels.js` before writing your own: they show every pattern below in use. Replace them; don't build around them.

**1. Check the topic** against `references/script.md` §1. If it's a weak shape (a lecture, a news recap, a pure-UI topic), say so in one line and propose the reshaped angle, then go with what the user wants.

**2. Research.** Use 3+ sources and write `research.md`: fact, then source. On-screen numbers come only from there, or carry a "Values illustrative" footnote.

**3. Script.** Write two hooks, pick one, then the full skeleton at ~180–230 words. Put it in `script.json` with one line per caption and one `*keyword*` per line. If the user is around, show them the script before voicing it, because voice and scenes are built on it. Otherwise proceed.

**4. Voice + word timings** (vo.py; every mode writes `vo_words.js`, which the caption and the scenes read):
- `uv run vo.py plan`: free estimate, to block out scenes before any audio
- `uv run vo.py kokoro [--voice af_heart] [--speed 1.1]`: **the default.** Free local Kokoro-82M voice, one clip per line, then NVIDIA Parakeet word timings (`align`), so words land within a frame. First run downloads ~4 GB of models; later runs are cached
- `uv run vo.py say && uv run vo.py align say`: free macOS draft voice with real Parakeet timings
- `uv run vo.py take && uv run vo.py place`: ElevenLabs final with exact character timestamps, if the user wants that voice (~1.2K characters per reel; key in the Keychain item `ELEVENLABS_API_KEY`). Takes are cached, so re-running `place` is free

Watch the DRIFT lines: a line that runs long pushes everything after it. Re-placing moves the animation with it, because scenes hang off words.

**5. Storyboard** in `board.md`: pick the hero model(s) and the one set, the camera path (wide → part → inside → out), the signal colour (and an opposite if needed), which numbers live on which parts, and which real image proves which line. Then write a table `line | picture | cue word | what moves`, with a beat every 2–4 words. This is where the reel is won. Spend the time here, not in code.

**6. Assets.** Models: find a real GLB (Apple AR USDZ via `uv run $SK/scripts/usdz_to_glb.py`, three.js examples, Poly Haven, Sketchfab, Blender) and log it in `assets/models/SOURCES.md`. Images: source every real image in the user's Chrome, never by guessing URLs:
```bash
uv run $SK/scripts/web_images.py "<google images query>" <name> --n 8    # -> assets/img/<name>/NN.jpg + _sheet.jpg + assets/SOURCES.md
```
Look at `_sheet.jpg`, crop the one you need, delete the rest.

**7. Build the set:** one 3D set for the whole reel in `src/scenes/set.js` (`gl: true`), plus DOM overlays (labels, numbers, credits) in `src/scenes/labels.js` (`overlay: true`), both listed in `index.html`. Pose everything as a function of t, key the camera to words, and keep moving it through the same world rather than cutting. Recipes (cutaway, glow beams, photo cards, pinned labels) are in `references/visuals.md`.

**8. Look and fix** (repeat until right):
```bash
uv run render.py sheet 0 <dur> 2.5 8     # labelled contact sheet -> build/sheet_*.png (timing, rhythm, bare frames)
uv run render.py at 1.0 7.4 12.2         # full-res stills -> build/at/ (collisions, cut-off labels, readability)
REEL_Q='lcam=0.09,0.05,0.06,0,0.064,0.01,0.1' uv run render.py at 7   # try a camera without editing keys (also cam=, ck=1, dbg=1)
```
Open `index.html` through a local server (`python3 -m http.server`) to scrub: space plays with `build/mix.wav`, and the arrow keys step frames. Check every scene at full resolution at least once. Contact sheets hide collisions.

**9. Audio:**
```bash
uv run render.py cues      # SFX cue list + reel length -> build/
uv run music.py            # optional: ElevenLabs music bed from music.json (set the section `until`s to the reel's length)
uv run audio.py            # voice + ducked music + synthesised SFX -> build/mix.wav
```
SFX kinds: pop blip tick click key type whoosh whoosh_down swoosh wipe flip stamp fall land impact toggle send ding shutter riser. Keep them sparse and quiet. The voice carries these reels.

**10. Render + QA:**
```bash
uv run render.py full --sub 1 && uv run render.py mux        # draft: no motion blur, ~1 min per 15 s
uv run $SK/scripts/motion_stats.py build/final.mp4           # longest still < 1.0 s, bare 0, every listed jump is a deliberate cut
uv run render.py full --sub 4 && uv run render.py mux        # final: motion blur (~4× slower)
```

**11. Deliver** to `out/`: `final.mp4` renamed `<slug>.mp4`, `cover.jpg`, and `caption.txt` (format in `references/script.md` §5). For the cover, use the hero visual mid-mechanism with the gold signal visible: `uv run render.py at <t>` then `ffmpeg -i build/at/t<t>.png -q:v 2 out/cover.jpg`. Copy outputs out of `/private/tmp` before opening them in QuickTime.

## Engine cheat sheet

Files: `film.js` (size, theme, caption, gl, safe zones, audio) · `script.json` · `src/lib.js` (L: easing, springs, DOM) · `src/reel.js` (R: components) · `src/core.js` (W, LINE, sfx, scene) · `src/gl.js` (GL: three.js renderer and helpers) · `src/caption.js` · `src/scenes/*.js` · `src/main.js` (seek, preview) · `vendor/three/` (r0.187, importmap in index.html).

Timing:
- `W('glass')`: start of that VO word. `W('you', 1, 8)` is the 2nd "you" after 8 s; `WE()` gives the end time.
- `LINE(k)` → `{s, e, words}` of script line k.
- `FILM.dur = 'auto'`: the reel lasts until the last word + 1.6 s.

The 3D set:
```js
scene({ name: 'set', t0: 0, t1: 1e9, z: -10, gl: true,
  async build() { /* load models into this.gl (a THREE.Group), camera keys, sfx(); read W()/LINE() here */ },
  update(t) { /* pose from t alone; GL.cam(t, keys); then project label anchors: S.at.x = GL.project(v) */ } });
```
GL helpers:
- `await GL.glb(url)`, `GL.tex(url)`, `GL.hdri(url)`
- `GL.cam(t, [[t, {pos, at, fov, focus, aperture, roll, ease}]])`: camera path + DOF
- `GL.screen(material, {w, h, draw(ctx, t)})`: a live canvas UI on a model's screen
- `GL.picture(url, {h, frame})` + `GL.inShot(t, keys, sx, sy, dist)`: a sourced photo as an object, placed in the shot
- `GL.glow(color, opacity)`, `GL.onGlow(obj)`: additive light on the GLOW layer (out of the DOF depth pass)
- `GL.project(objOrVec)` → screen px; `GL.shadowFit(obj)`; `GL.lights.{key, rim, fill}`; `GL.renderer`, `GL.dof`, `GL.bloom`

A DOM overlay scene (labels, numbers, credits), drawn over the canvas:
```js
scene({ name: 'labels', t0: 0, t1: 1e9, z: 900, overlay: true, build(root) { ... }, update(t) { ... } });
```

Components (all `update(t, at, out?)`, pure in t):
- `R.cam(worldEl, t, keys)`: 2D camera for a flat DOM stage (only for flat scenes, e.g. a UI recreation)
- `R.track(t, keys)`: any numbers along keyframes
- `R.count(el, t, [[t, 100], [t2, 76]], fmt)`: a value on a part. Better still, compute it from the state that drives the picture
- `R.label(text, x, y, dx, dy)` + `.at(x, y)` for moving parts
- `R.note([...lines])`: footnote / credit
- `R.legend([[color, name]])`: colour key
- `R.shareSheet(names)` + `.update(t, at, whoIndex, pickT, sendT)`: the CTA ending

`L.p(t, t0, dur, ease)`, `L.pop(t, t0)`, `L.spring`, `L.win(t, a, b)`, `L.ease.*`, `L.noise1`, `L.h(tag, attrs, ...kids)` (works for SVG tags too), `L.set(el, styles)` (writes only on change), `L.txt(el, s)`.

CSS vars: `--bg --ink --dim --signal --anti --bad --good --select --light`. Classes: `.bg-dark`, `.bg-light`, `.num`, `.big`, `.abs`, `.full`.

## QA bar (check all of these before delivering)

- The hook's picture is on screen by 1.0 s, and the first frame isn't a title card.
- `motion_stats`: longest still < 1.0 s, bare = 0, motion runs to the last frame, and no jump inside a topic (perspective shifts are camera moves).
- Every device and body part on screen is a real 3D model, not a drawing.
- At least one real sourced image sits in the set, with an on-screen credit and its URL in `assets/SOURCES.md`.
- Every line has exactly one boxed keyword, and the caption never wraps past 2 lines (caption.js shrinks long lines, but rewrite lines that hit the minimum size).
- No text that must be read sits in IG's zones (bottom 380 px, right 130 px) or under the caption.
- Every invisible thing drawn has its footnote; every number has a source in `research.md` or says "illustrative".
- The CTA is only the last line, and the ending acts it out.
- Every scene has been seen at full resolution: no cut-off labels, no overlaps, nothing glued to an edge.

## Gotchas

- **`seek(t)` must be pure.** Workers render frames out of order. No state carried between frames; derive everything from t (see the demo's IR pulses: the pulse index comes from t, not a counter).
- **Overlays read the set's anchors from the same frame.** The set computes `S.at` in its update after `GL.cam`; overlay scenes (higher z) run after it and read `window.SET.at`.
- **Clipping and DOF:** the DOF depth pass uses one override material, so its clipping planes apply to everything. Objects in front of a cutaway that must stay sharp go on the GLOW layer.
- **GPU load:** each render worker is a GPU browser; 4 is the most for a 16 GB Mac. Keep shaders cheap (no loops over many lights).
- **Never store anything on the scene object under `t0`, `t1`, `z`, `name`, `root` or `light`.** Use `S.tA`, `S.tCheek`.
- **`W()` matches the first hit of a normalised word.** For repeated words pass `nth`/`after`. A missing word logs "VO word not found" in the render output and returns 0: check the log.
- **Word counts must match** between script and TTS for `place`. Hyphenated or numeric tokens that the TTS splits break it, so keep them single tokens (e.g. "T-I-M", "120").
- **Labels follow the projection, not the zoom.** They stay 24–27 px whatever the camera does, but their anchor can leave the frame: check full-res stills at each camera key and flip `dx/dy` when a label runs off an edge.
- **Killing a full render orphans workers.** Kill that render's process tree with `xargs kill -9` (zsh won't split `$PIDS`), and delete `build/seg_*.mp4` before restarting.
- **`--sub 2` ghosts** fast moves into two copies. Use 1 for drafts and 4 for finals.
- **`mux` takes audio from t=0,** so only mux full renders, not `--a/--b` windows.
- **Glows look like ringed discs in downscaled sheets.** That's resize moiré; check a full-res frame before "fixing" it.
