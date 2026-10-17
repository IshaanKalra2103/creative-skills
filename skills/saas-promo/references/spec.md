# The spec: `video.toml`

One TOML file describes a whole promo. It sits next to an `assets/` folder (images, fonts,
an SVG logo) and an `audio/` folder (the music). Run it with
`tools/promo.sh path/to/video.toml <command>` (`render -o out.mp4`, `frame 4.2s -o frames`,
`timeline`, `inspect`, `preview`). Output: 1920x1080, 30 fps; scenes are authored in a
1280x720 design space.

```toml
[video]
title = "My launch"
audio = { file = "bgm.wav", gain = -1.0, at = 0.0 }   # or audio = "bgm.wav"; missing file = silent
bpm = 124                 # optional: `beats = n` durations, and a beat grid to snap cuts to
beat_offset = 0.0         # time of the first beat (s), when there's no build/beats.json
snap = true               # snap every scene start to the nearest beat (default: on when a grid exists)
snap_tolerance = 0.15     # only snap when the beat is this close (s)
end = 27.5                # optional: film length (default: the last scene's end)

[palette]
preset = "blue"           # blue | ember | mint | violet | noir, then override any key:
# bg_white = "#cce3f3"    # backdrop: light core of the lit sheet
# bg_cyan  = "#11aaeb"    #           ring around the core
# bg_peri  = "#216bf5"    #           body of the lit sheet
# bg_deep  = "#0606e5"    #           the deep top
# bg_navy  = "#010056"    #           the very top and dark blob
# bg_glow  = "#b7cfff"    #           the soft band along the edge
# text = "#ffffff"        # type on the backdrop
# highlight = "#c8d4ff"   # highlight box tint (resting)
# highlight_alpha = 0.30
# flash = "#a5e8ff"       # the colour a highlight box pops in with
# accent = "#1e90ff"      # buttons, caret, send arrow, "Submitted"
# frost = "#dfe6ff"       # pills, tiles, the prompt box rim
# panel = "#ffffff"       # UI panels
# ink = "#151515"         # UI text

[look]
font = "Inter Display"    # display face (any TTF/OTF dropped in assets/ registers by family name)
ui_font = "Inter Text"
weight = 400
glow = 0.35               # halo around solid type
dots = 0.035              # the monitor dot screen over the backdrop (0 = off)
pace = 1.0                # animation speed: 0.85 = every entrance/exit 15 % snappier

[[scene]]
kind = "caption"
dur = 1.8                 # seconds, or `beats = 4` with video.bpm
bg = ["sweep", "turn"]    # backdrop framing preset(s), drifting across the scene
lines = ["Turn your [idea]", "into [a product]"]
```

## Scenes

`[[scene]]` blocks play in order. Each starts where the previous one ends, or at `at = 12.5`
(seconds; a number. `caption` and `tiles` use a list `at = [...]` for word times, which
doesn't move the scene). Its length is `dur` (seconds) or `beats` (needs `video.bpm`). With a beat grid
(`build/beats.json` from `tools/beats.py`, or `video.bpm`), every start after the first
snaps to the nearest beat within `snap_tolerance`; `no_snap = true` opts a scene out.

Every scene takes these common keys:

| key | default | what |
|---|---|---|
| `kind` | | `title`, `window`, `tiles`, `caption`, `prompt`, `screen`, `wall`, `end` (`references/kinds/<kind>.md`) |
| `dur` / `beats` / `at` | | length in seconds or beats; absolute start |
| `bg` | per kind | a backdrop preset name, or a list the backdrop drifts through across the scene |
| `bg_zoom`, `bg_x`, `bg_y`, `bg_rot` | 1, 0, 0, 0 | a camera over the gradient (zoom > 1 zooms in, x/y in 0..1 units, rot in degrees) |
| `dots` | `look.dots` | dot screen strength for this scene |
| `letterbox` | false | close black bars over the last 0.9 s; the next scene opens them |
| `drop` | false | `tools/bgm.py` puts a riser before this scene and the full beat from here |

## Timing model

Entrances are authored in seconds from the scene start, exits in seconds before the cut,
both divided by `look.pace`. A longer `dur` only lengthens the hold in the middle, so the
snappy part (words landing about every 0.07 s, a 0.28 s blur-in, a 0.1 s highlight pop) stays
snappy at any scene length. Things that scale with content (typing, number of words or
tiles) take the time they need from the entrance clock; if a scene is too short for its
content the exit simply starts earlier.

## Backdrop presets

Fitted on the reference film, named by what they look like (`kit::PRESETS`):

| name | look |
|---|---|
| `sky`, `sky2` | almost all light: zoomed into the bright part (title openings) |
| `dawn` | light with the dark top right coming in |
| `window` | deep top, lit lower left (behind a UI window) |
| `free`, `sweep`, `turn`, `low` | the classic: navy top, a curved lit sheet sweeping up the left (captions) |
| `prompt`, `prompt2` | lit band low across the frame (prompt box) |
| `wide` | lit sheet wide across the bottom, no glow band |
| `logo`, `end`, `end2` | calm end-card framings |

To fit your own framing from a reference frame, see `references/look.md` ("fitting the backdrop").

## Music and the beat grid

- `tools/beats.py audio/bgm.m4a --spec video.toml` writes `build/beats.json` (bpm, beats,
  downbeats, drops) and prints every scene start before and after snapping, plus each
  scene's length in beats.
- `tools/bgm.py video.toml --bpm 124` writes an original synthesized bed (`audio/bgm.wav`)
  cut to the spec: whooshes on every cut, a riser into each `drop = true` scene, an impact on
  the end card. Use it as a placeholder or a final track.
- The film renders silent when the named file isn't in `audio/`.
