## earth

A cyan "network" Earth at night seen from orbit: glowing dotted coastlines, city lights,
orange great-circle arcs between hub cities, ring icons, a dotted graticule, an atmosphere arc
across the top with a peach glow on the left, and a faint network in the sky. It rolls slowly
in screen space and is zoom-blurred into and out of the shot. A caption types on letter by
letter; each new letter drops in from below, smaller and faint. Stock footage in the reference
("The internet is exploding", 7.4 s), rebuilt as a baked plate whose roll, scale and blur were
measured per tick on the footage.

### Bake a plate (once per region)

```sh
# from the template folder; Natural Earth (public domain) downloads to ~/.cache/doc-shorts on first use
uv run --with numpy --with scipy --with pillow python tools/earth_bake.py \
    --lon 12 --lat 46 --out path/to/spec/assets/earth_europe.png
```

- `--lon/--lat`: the region at the centre of the frame. The default camera sits 24.7 degrees
  south of it with a 5 degree roll, so the limb arcs across the top and the region fills the
  lower two thirds. This works at any latitude short of the poles.
- `--dist` (8.33 radii), `--focal` (8000), `--roll`, `--cam-dlon/--cam-dlat`: framing.
- `--hubs 15 --rings 9 --seed 5`: arcs join the biggest on-screen cities, and the next ones get
  ring icons.
- `--preset google-na`: the reference reel's exact plate.
- `--cam <8 values>`: a camera fitted to other footage. Pick 6+ landmarks
  (`[[lon, lat, x, y], ...]` in the 720x1280 frame) and run
  `tools/earth_landmarks.py landmarks.json --frame ref.png --overlay check.png`.

Baking takes about a minute.

| param | type | default | meaning |
|---|---|---|---|
| `plate` | string | `earth_plate.png` | baked plate in `assets/`. |
| `plate_rect` | [x, y, w, h] | [-90, -160, 900, 1600] | where the plate sits (the bake's coverage). |
| `motion` | [[roll, scale, blur], ...] | measured | explicit per-tick motion. |
| `entry` | bool | true | the measured 3-tick zoom-blurred entry (roll 8.8, 4.3, 1.8 degrees). |
| `exit` | bool | true | the measured 3-tick exit (zoom to 1.35x with blur; the caption shrinks to 0.96 then 0.81). |
| `caption` | string | none | typed caption. |
| `reveal` | [[letters, entering_opacity, first_opacity], ...] | none | explicit per-tick typing. |
| `letters_per_tick` | float | 1.33 | typing pace without `reveal` (the reference's average). |
| `caption_x` | float | centred | left edge of the caption, ref px. |
| `caption_y`, `caption_size`, `caption_color` | | 656, 60, `#e9eef0` | |
| `bg` | colour | `#04090c` | |

```toml
[[shot]]
cue = "exploding"
kind = "earth"
plate = "earth_europe.png"
caption = "Connected"
```

**Timing.** Entry 3 ticks and exit 3 ticks. In between, the measured slow roll (0, -1.48, -2.83
degrees) continues at -1.4 degrees per tick for longer shots. Nine ticks reproduce the
reference exactly.
