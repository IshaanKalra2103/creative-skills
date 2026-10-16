## file_icon

A file icon in the style of an Adobe project file (dark tile, light border, folded corner, big label, small extension) on dark stacked-paper ribbons (SkSL shader `file_icon_lines.sksl`: contour layers of a warped field, some with a bright haloed rim). A white hand cursor climbs from the bottom-left to the icon while the camera pulls back, then pans up-left. Camera and cursor are measured per tick.

| param | type | default | meaning |
|---|---|---|---|
| `label` | string | `"Ae"` | big label (shrinks to fit the tile) |
| `ext` | string | `"AEP"` | small extension under it |
| `fill` | hex | `#00005b` | tile |
| `accent` | hex | `#9999ff` | border and label |
| `ext_color` | hex | `#d4d4ff` | extension |
| `cursor` | bool | true | the hand cursor |
| `density` | layers/unit | 2.0 | ribbon density |

```toml
[[shot]]
cue = "file"
kind = "file_icon"
label = "PDF"
ext = "DOC"
fill = "#4a0000"
accent = "#ff6b6b"
ext_color = "#ffd0d0"
```

Timing: 19 ticks (1.9 s) on the reference. The cursor arrives around tick 9 and the pan starts at tick 16. Longer shots hold the last camera.
