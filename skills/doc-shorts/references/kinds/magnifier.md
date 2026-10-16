## magnifier

A magnifying glass (black rim with an offset inner rim, glint, black handle) slides across a flat card. A word exists only inside the lens and scrolls left through it, so the glass reads it a few letters at a time ("Fin" → "nding" → "ling" on the reference). The lens path and scroll are measured per tick. The scroll is re-based on the word's width, so any word ends with its last letters in the lens.

| param | type | default | meaning |
|---|---|---|---|
| `word` | string | `"Finding"` | the word under the glass |
| `color` | hex | `#c8141e` | word colour (serif, slightly tall) |
| `size` | px | 115 | word size |
| `bg` | hex | `#d6d6d6` | card |
| `lens_x` | per-tick list | `231, 272, 380, 424, 414` | lens centre x per tick |
| `lens_y` | px | 616 | lens centre y |
| `end_align` | 0..1 | 1 | 1 = keep the word's end where the reference's ended; 0 = keep its start |

```toml
[[shot]]
cue = "finding"
kind = "magnifier"
word = "Searching"
```

Timing: 5 ticks (0.5 s), cut on the narrated word. Longer shots hold the last frame.
