## photo

A full-frame photo with a camera move and captions: the reel's Larry/Sergey whips, the
Stanford flipbook with its rising red title, the Garage pull-out, the Board drift and the
Editors slide. Coordinates are 720x1280 ref px; image coordinates are the plate's pixels.

**Camera.** Image point `focus` lands on screen point `screen`, at `scale` ref px per image
px (default: the scale that covers the frame, times `zoom`), rotated `rotate` degrees. The
entry moves are curves measured on the reel, stretched to `enter_ticks`. By default the
camera keeps the picture covering the frame. Whips scale the plate up so they have picture
to travel over.

| param | type | default | meaning |
|---|---|---|---|
| `image` | string | — | plate in `assets/` |
| `frames` | [string] | — | one plate per tick (flipbook, held on the last); overrides `image` |
| `bg` | colour | `#000000` | field under the plate |
| `focus` | [x, y] | image centre | image point the camera holds |
| `screen` | [x, y] | `[360, 640]` | where `focus` ends up on screen |
| `scale` | number | cover × `zoom` | ref px per image px (absolute) |
| `zoom` | number | 1.0 | multiplier on the cover scale |
| `rotate` | degrees | 0 | tilt of the plate |
| `enter` | string | `cut` | `whip_left`, `whip_right`, `whip_up`, `whip_down` (slide in, decelerating), `pull` (start at `pull_from` zoom and settle), `cut` |
| `enter_dist` | ref px | 330 | whip distance |
| `enter_ticks` | ticks | 7 (whip), 8 (pull) | entry length (10 ticks = 1 s) |
| `pull_from` | number | 2.0 | starting zoom for `pull` |
| `pan` | [dx, dy] | — | a slow drift by this much (content moves +dx), settling |
| `pan_at`, `pan_ticks` | s, ticks | 0, 11 | when the drift starts and how long it takes |
| `push` | number | 0.03 | slow zoom-in over the whole shot (0 = none) |
| `blur` | [std, ...] | — | blur per tick from the start, ref px (`[4, 2]` for a zoom-blur entry) |
| `move` | [[t, x, y, zoom, rot], ...] | — | exact keyframes (t in s, linear); replaces enter/pan/push and the cover clamp |
| `cover` | bool | true | keep the picture covering the frame |
| `caption` / `captions` | table / [table] | — | see below |

**Captions** (`caption = {..}` or `captions = [{..}, ..]`, also used by other kinds):

| param | type | default | meaning |
|---|---|---|---|
| `text` | string | — | the words |
| `style` | string | `name` | `name` (the reel's widened white serif label), `plain` (`kit::serif`), `title` (two-line rising title) |
| `x` / `cx` | ref px | `cx = 360` | ink left edge, or centre |
| `y` | ref px | 734.5 (`title`: 695) | baseline |
| `size` | ref px | 56 / 44 / 62 | font size |
| `color` | colour | `#ebe7df` (`title`: `#d3121e`) | ink |
| `at` | s | 0 | when it appears |
| `reveal` | string | `all` | `words` (one word per `step`, or at `word_ticks`), `letters` (`plain` only: letters pop and rise in, `cps` per second or `counts` per tick) |
| `step` | s | 0.2 | seconds per word |
| `word_ticks` | [tick] | — | tick each word appears |
| `fade_in` | 0..1 | 0.55 for words | opacity on the caption's first tick |
| `ride` | string | `none` | `x`, `y` or `xy`: move with the photo during the entry |
| `keys` | [[t, x, y, scale, opacity]] | — | exact per-tick placement (title: `[t, cx, y, scale]`) |
| `sub` | string | — | `title`: the smaller second line |
| `rise_dist`, `rise_scale`, `rise_ticks` | | 653, 2.18, 9 | `title`: start below by this much at this scale, settling over these ticks |
| `bold`, `smin`, `rise`, `filter` | | 0.2, 0.5, 0.35, `cap` | `plain` letter reveal: stroke weight, start scale, rise (× size), filter |

```toml
[[shot]]
cue = "Hamilton"
kind = "photo"
image = "hamilton.jpg"
enter = "whip_right"
focus = [960, 700]
caption = { text = "Margaret Hamilton", y = 1040, ride = "x" }
```

Timing: entries take 0.7-0.8 s and most of the motion lands on the first tick, as on the
reel. Keep shots at 0.8 s or longer so the entry settles. `move` rows from a reference are
the way to match an existing edit exactly (the Google example's Larry, Garage and Board are
tracked this way).
