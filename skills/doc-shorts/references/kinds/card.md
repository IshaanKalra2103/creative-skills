## card

A text card: words typed, popped, slid or zoomed on a flat ground. This is the workhorse of the format: years, single words, short questions between the picture shots. Five entrances, each with the reference's measured motion as its default:

| `enter` | what happens | reference shot |
|---|---|---|
| `type` (default) | letters land left to right; each new letter pops in small, faint and soft for one tick (`pop = false` = they just appear) | "Forever", "1995" |
| `cursor` | typed with a `\|` caret; the line plus caret stays centred; when done the caret blinks; `zoom_out = true` pulls the page back over the last 8 ticks | "What if websites were ranked?" |
| `pop` | one blank tick, then the words grow 74% → 93% → 100% | "But" |
| `slide` | enters from the right edge with a sideways smear on the first tick and decelerates into the centre (8 ticks) | "Better way" |
| `zoom` | slides in small (49%) from the right for 2 ticks, jumps to full size with a blur, then settles into the centre | "The Internet" |

| param | type | default | meaning |
|---|---|---|---|
| `text` | string | `""` | the words; `\n` starts a new line (lines are centred, typed one after another) |
| `bg` | `"black"` \| `"grey"` \| `"paper"` \| `"#rrggbb"` | `"black"` | ground. Paper = beige with a low-frequency mottle and dust specks. A hex colour picks light or dark ink by its luminance |
| `color` | hex | black: `#dad7d0`, grey: `#141414`, paper: `#241f19` | ink |
| `filter` | `"cap"` \| `"ink"` \| `""` | by ground | `cap` = soft dark halo + warm/cool fringe + bloom (light text), `ink` = soft fringe (dark text) |
| `font` | `"serif"` \| `"sans"` \| `"script"` | `"serif"` | Instrument Serif, Roboto, Homemade Apple |
| `size` | px | type 55.5, cursor 43, pop 52, slide 57, zoom 122 | font size (ref px, 720-wide frame). Shrinks automatically so the widest line fits `max_width` |
| `max_width` | px | 640 | widest a line may be before the size shrinks |
| `bold` | px | 0.15 - 0.6 by mode | hairline stroke in the ink colour (the reference strokes read heavier than the font) |
| `track` | em | type 0.054, cursor 0.019, pop 0.05, slide 0.075, zoom 0.025 | letter-spacing |
| `x` | px | 360 | centre x (`align = "left"`: the left edge, default 60) |
| `left` | px | centred | `type` only: left edge of the line (overrides centring) |
| `y` | px | type 660, cursor 655, pop 657, slide 654, zoom 685 | baseline of a single line (multi-line blocks centre on it) |
| `align` | `"center"` \| `"left"` | `"center"` | |
| `line_height` | × size | 1.18 | |
| `reveal` | number list | — | `type`/`cursor`: characters shown per tick (fractions pop a letter half in); overrides `rate` |
| `rate` | chars/tick | type 1.85, cursor 2 | typing speed when there's no `reveal` |
| `start` | chars | type 0.35 | `type`: characters shown on the first typing tick |
| `delay` | ticks | type 0, cursor 1 | ticks before typing starts |
| `pop` | bool | true | `type`: letters pop in (false: appear) |
| `smin` | 0..1 | 0.3 | `type`: size of a letter on its first tick |
| `blink` | ticks | 2 | `cursor`: caret on/off period once typing is done |
| `caret_gap` | px | 9 | `cursor`: space between text and caret |
| `zoom_out` | bool | false | pull the page back over the last 8 ticks (0.977 → 0.766) |
| `zoom` | number list | — | explicit page scale per tick (overrides `zoom_out`) |
| `scales` | number list | `[0, 0.74, 0.93, 1]` | `pop`: scale per tick |
| `offsets` | number list | slide: `[306, 158.5, 91.5, 53, 29, 14, 5, 0]`; zoom: `[235, 138, 177, 114, 69, 39, 20, 7]` | centre offset from `x` per tick |
| `small`, `small_ticks` | ratio, ticks | 0.4918, 2 | `zoom`: size and duration of the small phase |
| `specks` | `[[x, y, r], ...]` | 4 measured specks | `paper`: dust specks |
| `dots`, `vignette` | multipliers | grey/paper 0.2/0, black 0.15/1, hex 1/1 | look over this shot |

```toml
[[shot]]
cue = "1969"            # or at = 2.8
kind = "card"
bg = "grey"
text = "1969"
pop = false

[[shot]]
cue = "What"
kind = "card"
bg = "paper"
enter = "cursor"
text = "What if the computer\nhad said no?"
zoom_out = true
```

Timing: 1 tick = 0.1 s. `type` at the default rate needs about `len / 1.85` ticks plus a few to hold (a 7-letter word: 0.7 s). `cursor` types 2 characters a tick from tick 1, so a 30-character line needs about 1.6 s, plus about 0.3 s for the caret to blink. `pop` needs 0.4 s, `slide` 0.8 s, `zoom` 0.8 s. A longer shot holds the final state, and `zoom_out` always uses the last 8 ticks. Keep cards short: one word to one short line, landing on the narrated word.
