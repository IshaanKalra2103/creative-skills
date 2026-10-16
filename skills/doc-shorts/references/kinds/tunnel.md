## tunnel

"Millions of websites": small page thumbnails (grey/white pages plus coloured ones with a
header strip and text lines) rush at the camera down a corridor. A dark band runs down the
vanishing line, and a near wall of bigger tiles fills the top right. The first two ticks arrive
zoom-blurred, as the hand-over from the previous shot. Stock footage in the reference (8.3 s),
rebuilt as a ray-cast shader (`tunnel_walls.sksl`).

| param | type | default | meaning |
|---|---|---|---|
| `palette` | [colour x 5] | blue, red, teal, violet, slate | accent colours of the coloured thumbnails (cycled if fewer). |
| `grey_share` | float | 0.55 | share of thumbnails drawn as plain grey/white pages. |
| `density` | float | 0.11 | share of swarm cells holding a thumbnail. |
| `gain` | float | 1.25 | brightness. |
| `speed` | float | 1.1 | camera travel per tick (world units). |
| `cam_start` | float | 40 | camera position at tick 0 (changes the pattern). |
| `vp` | [x, y] | [348, 560] | vanishing point, ref px. |
| `focal` | float | 520 | focal length, ref px (smaller = wider, faster-looking). |
| `band` | float | 0.05 | half-width of the empty slab around the vanishing line. |
| `wall` | bool | true | the near wall of big tiles at the top right. |
| `wall_distance` | float | 10 | distance to that wall. |
| `blur_in` | [float...] | [1.6, 0.6] | zoom-blur amount for the first ticks (`[]` = none). |
| `soften` | bool | true | 2 px blur over the whole layer, as on the reference. |
| `bg` | colour | `#030303` | |
| `caption` | string | none | optional white serif caption, centred. |
| `caption_type` | bool | false | type it on, one letter per tick. |
| `caption_size`, `caption_y`, `caption_color` | | 44, 656, `#e9eef0` | |

```toml
[[shot]]
cue = "Millions"
kind = "tunnel"
palette = ["#ffcc00", "#ff5500", "#22ccff", "#aa66ff", "#888888"]
```

**Timing.** Any length; the camera keeps travelling at `speed`.
