## note

The opener: a grid of soft grey dots on black. The camera tilts up with a focus pull, one dot lights up and blooms (and warms the grade), the note's words appear one by one in handwriting (Homemade Apple), and an arrow draws down from under the last word to the lit dot. Then the camera pulls back about the dot. Grid, glow, words and arrow are one layer anchored on the dot. The camera (anchor y and grid spacing per tick) and the glow ramp are measured on the reference.

| param | type | default | meaning |
|---|---|---|---|
| `text` | string | `"Simple idea"` | the note; words land one at a time |
| `word_at` | tick list | `3, 5, 7, ...` | tick each word lands (the first word sits a touch small until the next) |
| `word_x` | px list | centred line | left edge of each word, relative to the dot |
| `text_x` | px | 0 | horizontal offset of the centred line |
| `stretch` | list | 1.18 | horizontal stretch per word (the script is narrow) |
| `size` | px | 56.2 | script size (layer units) |
| `ink` | hex | `#dad7d0` | words and arrow |
| `color` | hex | `#ffd21c` | bloom colour |
| `core` | hex | `#e9c824` | the lit dot |
| `grid` | hex | `#262624` | the other dots |
| `grade_color`, `grade` | hex, 0..1 | `#fff4bc`, 1 | warm multiply grade that comes up with the glow |
| `arrow` | bool | true | draw the arrow |
| `arrow_at` | tick | last word's tick | arrow draws over 3 ticks from here |
| `clip_swash` | bool | false | cut the first word at its left edge (trims a capital's swash) |
| `anchor_y`, `spacing`, `glow` | per-tick lists | measured | camera (dot screen y, grid spacing / 105) and bloom strength per tick |

```toml
[[shot]]
at = 0.0
kind = "note"
text = "One tiny computer"
color = "#4fd1ff"        # a cold idea
core = "#7fe3ff"
grade_color = "#d8f4ff"
```

Timing: 11 ticks (1.1 s) on the reference. Words land at 0.3, 0.5, 0.7 s… and the arrow follows the last word. The pull-back runs to tick 10. Longer shots hold the last camera. With three or more words, give it `word_at` that fits the narration and about 1.3 - 1.6 s.
