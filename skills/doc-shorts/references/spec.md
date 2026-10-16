# video.toml

One file describes the whole short. Unknown keys are ignored, and missing keys fall back to defaults, so a spec only
names what it changes. Paths are relative to the spec's folder: images come from `assets/`, audio from `audio/`, and
word timings from `build/words.json`.

```toml
[video]
end = 27.07                     # seconds; omit to end `tail` s after the last narration word
tail = 1.2
audio = [{ file = "vo.wav" }, { file = "music.wav", gain = -17 }]   # or audio = "vo.wav"; `at` delays a track
shots_dir = "shots"             # optional: also load [[shot]] tables from every *.toml there (sorted by name)

[voice]                         # tools/vo.py (ElevenLabs); see pipeline.md
voice = "Gfpl8Yo74Is0W6cPUWWT"
speed = 1.2
text = """One tiny computer took us to the Moon. ..."""

[music]                         # tools/music.py (ElevenLabs Music), optional
styles = ["retro documentary underscore", "warm analog synth arpeggio"]
negative = ["vocals"]
sections = [{ name = "Intro", until = 4.0 }, { name = "Main" }]

[look]                          # global texture; defaults in look.md
scan = 0.16
scan_period = 5.38
dots = 0.10
dot_period = 6.0
vignette = 0.12
grain = 0.10

[[shot]]
cue = "One"                     # or at = 0.0
kind = "note"
# ...the kind's own params (shots.md)
```

## Keys every shot has

| key | type | meaning |
|---|---|---|
| `kind` | string | one of the kinds in `shots.md`. An unknown kind renders a labelled placeholder, so the timeline still plays |
| `at` | seconds | start time, rounded to the nearest tick (0.1 s) |
| `cue` | word or `{ word, nth = 1, offset = 0.0 }` | start on a narration word, floored to its tick. Needs `build/words.json` |
| `dots` | number | multiply the halftone screen while this shot is on (each kind has a default) |
| `vignette` | number | multiply the vignette while this shot is on |

Shots are sorted by start, the first always starts at 0, and each runs until the next one starts.

## Param types

Kinds read their params through `spec::P`:

| getter | TOML |
|---|---|
| `p.f("size", 64.0)` | `size = 70` or `size = 70.5` |
| `p.s("text", "")` / `p.opt("image")` | `text = "1995"` |
| `p.strs("lines")` | `lines = "ONE"` or `lines = ["CHANGE THE", "INTERNET"]` |
| `p.fs("color_stops")` | `[0.2, 0.5]` |
| `p.rows("move")` | `move = [[0, 360, 640, 1.0], [0.7, 340, 600, 1.06]]` (keyframes: first column = seconds in the shot) |
| `p.sub("caption")` | `caption = { text = "Larry Page", y = 495 }` |
| `p.list("cards")` | `cards = [{ image = "a.png", label = "A" }, { image = "b.png", label = "B" }]` |
| `p.b("cursor", true)` | `cursor = false` |

Coordinates are in **ref px**: a 720x1280 design space, scaled 1.5x to the 1080x1920 output. The centre is (360, 640).
Colours are any SVG colour (`"#dad7d0"`, `"black"`).

## Adding a kind

1. Create `template/src/shots/<kind>.rs` with `pub fn render<'a>(p: P<'a>, tm: &T, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a>`
   and `pub fn look(p: P) -> (f32, f32)`.
2. Add it to `shots/mod.rs`: `mod`, `KINDS`, and the two `match`es.
3. Draw in ref px. Time comes from `tm.tick` / `tm.t` (on threes) and `tm.len` (shot length in ticks). Prefix SVG ids
   with the kind name. Shared helpers are in `kit.rs`; the fframes gotchas are in the fframes-fx skill.
4. Document every param in `references/kinds/<kind>.md` and add a row to `references/shots.md`.
