# ad.json

One file describes the ad. `cut.py` renders it, `score.py` writes its music, `board.py` draws
its storyboard, `qa.py` checks its shots. Paths are relative to the ad folder.

## Times

A length or time is frames (`12`), beats (`"2b"`, needs `bpm`), or seconds (`"0.5s"`). A time
on the timeline (`at` in overlays and the score) can also be a shot id with an offset:
`"D"`, `"D+1b"`, `"END+6"`, `"G-2"`.

## Top level

| key | |
|---|---|
| `title`, `sport`, `product` | for the board |
| `size` | `[1080, 1350]` for 4:5; `[1080, 1920]` for 9:16; `[1920, 1080]` for 16:9 |
| `fps` | 30 |
| `bpm` | the grid; 120 gives 15 frames a beat |
| `audio` | the WAV muxed in (what `score.py` writes) |
| `fade_in`, `fade_out` | frames from and to black |
| `look` | the finish, below |
| `shots` | in order; each starts where the last ends |
| `overlays` | type and logos on the timeline |
| `score` | the music and sound effects, below |
| `qa` | `product`: product photos; `questions`: yes/no questions asked of every shot |

## Shots

| key | |
|---|---|
| `id` | a name to refer to it by (`A`, `strike`) |
| `src` | a clip (`.mp4`, `.mov`) or a still (`.png`, `.jpg`); or leave it out and give `color` for a solid card |
| `len` | the shot's length |
| `in` | seconds into the clip to start |
| `speed` | `1`, or keyframes `[[frame, speed], ...]` over the shot's frames: ramps, freezes (`0`) |
| `interp` | motion-interpolate the clip by this factor first, for slow motion (`4`) |
| `move` | `zoom` (number or `[from, to]`), `pan` (focus point `[x, y]` in 0-1 of the source, or `[[x, y], [x, y]]`), `roll` (degrees, or `[from, to]`), `shake` (px of handheld drift), `ease` (`inout`, `linear`, `out`, `in`) |
| `flip` | mirror it, for screen direction |
| `hits` | `[{"at": 15, "fx": "flash ca shake punch pop", "len": 10, "amt": 1}]`: impacts inside the shot |
| `out` | the transition into the next shot: see `transitions.md` |
| `shot`, `note` | for the board |
| `qa` | `movement`: the movement the shot should show, for the form check; `questions` |

A still's camera move follows the speed curve, so a ramp still reads in the animatic. A clip's
move follows the shot's own time, so a freeze can push in.

## look

| key | |
|---|---|
| `exposure` | stops |
| `crush` | 0-0.1, blacks down |
| `contrast` | around 1.1 |
| `split` | `{"shadows": "#0b1a22", "highlights": "#ffe8d2", "amount": 0.12}` |
| `sat` | global saturation |
| `keep` | `{"hue": 24, "width": 20, "sat": 1.12}`: one hue (degrees) kept saturated while the rest follows `sat` |
| `bloom` | glow on highlights |
| `vignette` | 0-0.5 |
| `grain` | 0.02-0.05 |
| `ca` | constant chromatic aberration in px |

## overlays

`{"at": "G+1b", "len": "2b", "text": "HYPERVENOM", "font": "Anton-Regular.ttf", "size": 124,
"track": 0.02, "pos": [0.5, 0.76], "color": "#ffffff", "style": "rise", "align": "center",
"leading": 1.05}`, or with `"image": "media/logo.png", "width": 0.22` in place of the text.

`style`: `cut` (on and off), `fade`, `slam` (lands from big in 4 frames), `rise`, `type`
(letters appear, `rate` frames each), `strobe`. `len` defaults to the end of the shot it
starts in. Sizes are px at 1080 wide. Fonts in `fonts/`: Anton, Barlow Condensed ExtraBold
(and Italic), IBM Plex Mono Medium (all OFL).

## score

| key | |
|---|---|
| `music` | a real track under the cut: `{"file": "music/track.wav", "in": 13.726, "gain": 0, "mute": [{"at": "END", "len": "8b"}]}`. `in` is the second of the track at the ad's first frame (`track.py --at` prints it); `mute` drops the track out (a hard stop on the end card, a beat of silence). With `music`, `parts` default to none and the effects sit `fx_gain` dB under it (-4) |
| `fx_gain` | dB on the effects bus |
| `root` | the bass note (MIDI; 38 is D) |
| `bed` | `rain`, `crowd`, `wind`, `city`, `room`, `none` |
| `parts` | `[{"at": 0, "kind": "intro"}, ...]`: `intro`, `build`, `gap`, `drop`, `outro`, `silence` |
| `sfx` | `[{"at": "D+1b", "kind": "thump"}]`: `thump`, `net`, `studs` (`len`, `rate`), `impact`, `whoosh`, `subdrop`, `riser` / `swell` (`len`, ending at `at`), `whistle`; `level`, `pan` |
| `auto` | true: a whoosh on whips and zoom-throughs, an impact on smash and flash cuts and on hits with `flash` or `pop` |
| `tail` | seconds of tail after the last frame |

Without `music`, the score is a synthesized track for the animatic. For the real cut, use a
generated track (Suno, see `music.md`) or licensed music as `music`, set `bpm` to its tempo,
and keep the effects on top. A beat need not be a whole number of frames (140 bpm is 12.86):
cuts are placed on the exact beat and rounded to the nearest frame.

## Commands

```sh
uv run tools/track.py music/x.wav --at 6.857   # tempo, bars, drops; `in` to land a drop at 6.857 s
uv run tools/score.py AD                 # build/score.wav
uv run tools/board.py AD                 # out/board.jpg
uv run tools/cut.py AD --preview 0.5     # out/<ad>_preview.mp4, fast
uv run tools/cut.py AD --frames 180,240 --png build/check   # check frames
uv run tools/cut.py AD                   # out/<ad>.mp4
```

Renders run in parallel processes; a 15 s ad at 1080x1350 takes about a minute on a laptop.
Match-cut boxes from Jev are cached in `build/boxes.json`.
