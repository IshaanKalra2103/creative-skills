# From a topic to a finished short

The whole video is `<project>/video.toml` plus `assets/` (images) and `audio/` (narration, music).
The engine (`template/`) is shared, and many projects can use one build.

```
my-short/
  video.toml        [video] [voice] [music] [look] + one [[shot]] per cut
  assets/           photos, cutouts, plates (any size, png/jpg)
  audio/            vo.wav (tools/vo.py), music.wav (tools/music.py) or your own files
  build/            words.json (word timings that cues resolve against), cached takes
```

## 1. Story and script (the part that makes it good)

Read `aesthetic.md` first. A doc short of 20-35 s is about 60-85 words, at roughly 2.5 words per second. That works
out to one claim per cut and a new picture every 0.4-2 s.

1. **Collect the facts first.** Dates, names, numbers, quotes, documents, photos. Every name, date and number that
   appears on screen must be checked.
2. **Pick an arc** that suits this topic (`aesthetic.md`: in medias res, the object, number first, myth vs fact, two
   rivals, one day). Don't default to "One X changed Y forever".
3. **Write it to be spoken.** Short sentences, periods. Colons and long dashes make the TTS pause for a second or more.
   Open inside the story: a moment, a number or a contradiction.
4. **Endings:** a coda that reframes the opening, a literal last joke, or a real CTA. Not an ad by default.

## 2. Voice → word timings

```sh
uv run template/tools/vo.py my-short/video.toml --plan   # free: estimated timings to block out cues
uv run template/tools/vo.py my-short/video.toml          # ElevenLabs take -> audio/vo.wav + build/words.json
# or your own recording:
uv run template/tools/words.py my-short/video.toml audio/vo.wav
```

- Voices that suit documentaries: "Max" (`Gfpl8Yo74Is0W6cPUWWT`), "Brian"
  (`nPczCjzI2devNBz1zQrb`, deep), "George" (`JBFqnCBsd6RMkjVDRZzb`, British storyteller), "Daniel"
  (`onwK4e9ZLuTAKqWW03F9`, broadcaster).
- Use speed **1.15-1.2** for the doc pace. At 1.08 a test script ran 31.4 s; at 1.2 with the colons removed it ran
  25.8 s. About 400 characters per 25 s.
- Takes are cached by text+voice+settings, so re-running costs nothing until the text changes.

## 3. Shot plan: metaphors first, kinds second

Write the beat sheet as phrase → the most literal picture for it, for this topic (list 2-3 options, pick the
unexpected one) → register (photo, card or graphic). Alternate registers. Only then pick a kind for each picture:

| register | kinds |
|---|---|
| archival photo | `photo` (whip/pull/push, name captions, rising titles, flipbook frames), `frame_card` (a framed print sliding in), `faces` (cut-out portrait cards) |
| flat card + type | `card` (typed, cursor, pop, slide, zoom-word), `note` (a handwritten note on a dot grid) |
| graphic / infographic | `chart` (bars + node graph), `earth` (network Earth, any region), `globe_grid`, `tunnel` (data rushing past), `hypno`, `magnifier`, `search`, `browser` (retro window), `file_icon`, `site` (CTA) |
| anything else | add a kind (`spec.md` → Adding a kind) |

Then compare your beat sheet with the reference's (`case-study.md`). Use at most two of its signature moves, and never
three beats in its order (`aesthetic.md`).

Cue every shot on a word, so a re-take moves the edit with it:

```toml
[[shot]]
cue = "Stanford"                 # first occurrence; or { word = "the", nth = 2, offset = -0.1 }
kind = "photo"
image = "stanford.jpg"
caption = "Stanford University"
```

`at = 4.0` (seconds) also works, for music-only edits or exact remakes. The first shot always starts at 0. Each shot
ends where the next begins, and the video ends at `[video] end`, or at the last word plus `tail`.

## 4. Pictures

- Use real archival photos and credit them in `assets/SOURCES.md`. Get the largest original you can (Wikimedia
  Commons, NASA, news archives, Google/Bing images).
- Cut-outs for `faces`, `hypno` or `frame_card`: `uv run template/tools/cutout.py in.jpg assets/out.png`.
- Reels often show AI-outpainted versions of famous photos (wider than any original). If you are matching one, build
  the plate from the reel's own frames: a mosaic of several ticks, with the caption removed.

## 5. Render and review

```sh
cd template && cargo build --release              # once (the first build takes 1-2 min: Skia + ffmpeg)
tools/short.sh ../my-short/video.toml timeline    # cuts vs the script
tools/short.sh ../my-short/video.toml frame 3.2s,7.9s -o /tmp/f
tools/short.sh ../my-short/video.toml render -o ../my-short/out.mp4   # about 45 s for 27 s on Apple Silicon
uv run tools/music.py ../my-short/video.toml      # optional ElevenLabs bed, then render again
```

Review the whole film on contact sheets at 10 fps before calling it done. Check for:
- text running off the frame;
- dark text on dark backgrounds;
- a missing plate (shows as magenta);
- holds longer than about 0.5 s.

When matching a reference, put it beside yours with `REF=<study>/f10 tools/cmp.sh video.toml out.png <ticks>`.
