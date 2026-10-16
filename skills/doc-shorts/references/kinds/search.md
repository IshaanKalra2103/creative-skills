## search

A search pill (soft shadow, logo, query, caret, mic) slides in from the right and keeps travelling left while the query types into it. The typed text stays centred 198 px right of the logo, clamped to stay on screen. The pill path is measured per tick.

| param | type | default | meaning |
|---|---|---|---|
| `query` | string | `""` | what gets typed |
| `reveal` | per-tick list | — | characters shown per tick (overrides `rate`) |
| `rate` | chars/tick | 2 | from tick 1 (2 chars on tick 1) |
| `delay` | ticks | 1 | ticks before typing starts |
| `logo` | `"google"` \| `"plain"` \| `"none"` | `"google"` | the four-colour G, a grey magnifier glyph, or nothing |
| `mic` | bool | true | Google-style mic at the right end |
| `size` | px | 39 | query size (Roboto) |
| `width` | px | 735 | pill length |
| `bg`, `pill`, `color` | hex | `#d6d6d6`, = bg, `#5c5c5c` | card, pill fill, query ink |
| `logo_x` | per-tick list | `566, 290, 220, 182, 154, 108, -31` | logo left edge per tick (the pill follows) |

```toml
[[shot]]
cue = "search"
kind = "search"
query = "apollo 11 source code"
logo = "plain"
mic = false
```

Timing: 7 ticks (0.7 s) on the reference. At 2 chars a tick, keep queries to about 13 characters for a 0.7 s shot, or lengthen the shot. Longer shots hold the last pill position while typing finishes.
