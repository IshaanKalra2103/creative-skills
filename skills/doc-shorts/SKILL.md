---
name: doc-shorts
description: >-
  Vertical documentary and infographic shorts (Reels, TikTok, Shorts) rendered in code with fframes (Rust,
  Skia GPU, ffmpeg) in the retro "archive under glass" look: scanlines, a 30° halftone screen, low grain,
  chromatic fringes on small Instrument Serif captions, real archival photos with whip and push moves, flat
  grey, paper and black type cards, handwritten notes, and graphic beats (a network Earth, a wireframe globe
  grid, a thumbnail tunnel, a magnifier, a typed search pill, charts, a hypno head, face cards, a CTA site).
  Everything animates on threes (10 drawings a second) and cuts on narration words. One `video.toml`
  describes the film: an ElevenLabs voiceover with word timings, an optional ElevenLabs Music bed, a global
  look, and one `[[shot]]` per cut cued on a word. Ships the engine with 15 shot kinds, tools for voice,
  music, Whisper word timings, cut-outs and side-by-side review, a script that studies a reference reel
  tick by tick, and a full worked example: a 27 s doc reel about Google's origin at Stanford, rebuilt tick
  for tick. Use when the user wants a short documentary or explainer reel about a topic, person, company or
  event, a "docs + infographic" short, a retro history reel with captions and archival photos, or wants to
  study a reference reel and make their own film in its look (not a copy of its shots).
---

# doc-shorts

A doc short is one `video.toml` next to an `assets/` folder (photos, cut-outs, plates) and an `audio/` folder
(narration, music). The engine in `template/` reads the spec, resolves each shot's `cue` word against the
narration's word timings, and draws every tick (0.1 s) in a 720x1280 design space, output at 1080x1920 and 30 fps.
One build serves any number of films.

![frames from the Google-origin example](assets/preview.jpg)

| path | what it is |
|---|---|
| `template/` | The fframes crate (`cargo build --release` once; the first build takes 1-2 min). `src/spec.rs` reads the spec, `src/kit.rs` holds the shared look (fonts, caption filters, fills), `src/shots/` has one file per kind, `src/shaders/` the texture and procedural shaders. |
| `template/tools/` | `short.sh` (run the engine on a spec), `vo.py` (ElevenLabs take + word timings, or `--plan` for free estimates), `words.py` (Whisper timings for your own recording), `music.py` (ElevenLabs Music bed on the spec's sections), `cutout.py` (rembg cut-outs), `cmp.sh` (reference vs ours at the same ticks), `measure.py`, `pixdiff.sh`, `earth_bake.py` (bake an Earth plate for any region). |
| `template/examples/google-origin/` | The worked example: a 27 s reel about how Google started at Stanford, rebuilt tick for tick from a Pinterest doc reel. One spec file per shot in `shots/`, the plates, the reel's audio and the reference video, and the scripts that built the plates. It's also the engine's regression test. |
| `scripts/study.py` | Download a reference reel and take it apart: a frame per tick, contact sheets, cuts, Whisper word timings and the cadence. |
| `references/` | `aesthetic.md` (what makes the look, and the originality rules), `pipeline.md` (topic → script → voice → shot plan → pictures → render), `spec.md` (every `video.toml` key, adding a kind), `shots.md` + `kinds/*.md` (every kind's params), `look.md` (the measured texture, type, palette and motion), `case-study.md` (how the reference was rebuilt, and the lessons). |

Requirements: Rust (cargo), `ffmpeg`, `uv`. Voice and music need an ElevenLabs key (`$ELEVENLABS_API_KEY` or the
macOS Keychain item `ELEVENLABS_API_KEY`). `words.py` and `study.py` run mlx-whisper through `uvx` on Apple Silicon,
and `study.py` needs `yt-dlp`. The engine renders with Skia on Metal.

## Workflow

Read `references/aesthetic.md` before writing anything. The reference reel is a style to learn, not a shot list to
re-skin: a new film keeps the look and the rhythm and brings its own arc, its own metaphors and its own pictures.

1. **Facts and script** (`pipeline.md` §1). Collect dates, names, numbers, documents and photos first. Pick an arc
   that suits the topic (in medias res, the object, number first, myth vs fact, two rivals, one day). 20-35 s is
   60-85 words. Write it to be spoken: short sentences, no colons or long dashes, open inside the story.
2. **Voice** (§2). Put the script in `[voice]`, then:
   ```sh
   uv run template/tools/vo.py my-short/video.toml --plan   # free estimated timings to block out cues
   uv run template/tools/vo.py my-short/video.toml          # the real take -> audio/vo.wav + build/words.json
   ```
3. **Shot plan** (§3). For each phrase, write the most literal picture of it for this topic (2-3 options, pick the
   one nobody would expect), then its register (photo, card, graphic), then a kind (`shots.md`). Alternate
   registers, use at most two of the reference's signature moves, and add a kind when none fits. Cue every shot
   on a word, so a new take moves the cuts with it:
   ```toml
   [[shot]]
   cue = "Stanford"
   kind = "photo"
   image = "stanford.jpg"
   caption = { text = "Stanford University" }
   ```
4. **Pictures** (§4). Real archival photos, the largest originals you can find, credited in `assets/SOURCES.md`.
   `uv run template/tools/cutout.py in.jpg assets/out.png` for cut-outs.
5. **Render and review** (§5):
   ```sh
   cd template
   tools/short.sh ../my-short/video.toml timeline                 # cuts vs the script
   tools/short.sh ../my-short/video.toml frame 3.2s,7.9s -o /tmp/f # stills
   uv run tools/music.py ../my-short/video.toml                   # optional bed
   tools/short.sh ../my-short/video.toml render -o ../my-short/out.mp4   # ~1 min for 27 s on Apple Silicon
   ```
   Review the whole film on 10 fps contact sheets. Look for text off the frame, dark on dark, magenta (a missing
   plate) and holds over ~0.5 s.

## Studying a reference

```sh
uv run scripts/study.py <url-or-file> study/            # f10/ frames per tick, sheets, cuts, words, cadence
REF=study/f10 template/tools/cmp.sh my-short/video.toml cmp.png 40 41 45   # theirs | ours, same ticks
```

Measure instead of eyeballing. Font width ratios, caption ink levels, texture periods and the cadence phase all
fooled the eye on the first rebuild (`case-study.md` → Lessons, `look.md`).

## The Google-origin example

```sh
cd template && tools/short.sh examples/google-origin/video.toml render -o /tmp/google.mp4
```

It uses exact `at` times and measured keyframes because it rebuilds the reference exactly. A new film should use
`cue` words and each kind's defaults. Credits for every plate are in `examples/google-origin/assets/SOURCES.md`.

## Related skills

- `fframes-fx`: fframes basics, gotchas and 44 SkSL shader effects.
- `launch-promo`: product-launch films in a kinetic sticker look (HTML + headless Chromium).
- `motion-replica`: rebuild one specific video shot for shot.
