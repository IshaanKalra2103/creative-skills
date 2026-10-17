# `tiles`

A one-line glass headline over a row of frosted tiles. The headline's highlighted run springs
up into its box. The row rises in from below, rolled about 6° and blurred, with tiles fading
in from the right. It slides so the `on` tiles end centred, then the `on` tiles light up and
the rest dim. Everything blurs away at the cut. Measured on the reference's "Bolt is free
this weekend" + October date row (1.88 s).

```toml
[[scene]]
kind = "tiles"
dur = 1.88
bg = "free"
headline = "Bolt is [free this weekend]"
dates = { from = "2026-10-14", to = "2026-10-22", on = ["2026-10-17", "2026-10-18"] }
```

Any tiles, not just dates:

```toml
tiles = [
  { big = "Tue", label = "Billing", sub = "usage based", on = true },
  { big = "Wed", label = "Search", sub = "vector + text", on = true },
]
```

## Params

| key | default | what |
|---|---|---|
| `headline` | | one line of caption markup (`[...]` = highlight run) |
| `head` | `{}` | caption params for the headline (move `lift`, weight 500 by default; e.g. `gaps`, `size`, `at`) |
| `spring` | 73 | px the highlighted run springs up from |
| `tiles` | | `[{ big, label, sub, on }]` |
| `dates` | | `{ from, to, on = [...] }` (ISO dates): tiles of day number, month, weekday |
| `pitch` | 293 | px between tile centres |
| `tile_w`, `tile_h` | 273, 204 | tile size |
| `tile_y` | 298 | tile top |
| `big_size`, `label_size`, `sub_size` | 101.5, 36, 25.5 | type sizes (each shrinks to fit the tile) |
| `slide` | 256 | px the row travels to land |
| `roll` | 1 | scale of the entry roll |
| `light_at` | 0.96 | seconds when the `on` tiles light up |

Tiles use the palette's `frost` for the fill and `text` for the type. Lit tiles fill at
32 %, dimmed ones fall to 11 %, with text at 22 %.

## Timing notes (measured)

- The row rises 150 px over 0.64 s, rolled -6° → 0° over 0.72 s, and its blur clears 11 → 0
  px by 0.26 s. Tiles fade in about 0.02 s apart, from the right.
- The slide eases in slowly (0.5 s), whips through the middle (0.7-0.95 s) and settles by 1.4 s.
- The lit/dim swap takes 0.14-0.16 s, starting at about 0.96 s.
- The headline's run arrives 0.14 s after the headline's first word and springs up as
  `73 / (1 + 12.5 t)^2`.
