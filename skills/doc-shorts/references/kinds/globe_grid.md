## globe_grid

A scribbly, crayon-textured wireframe globe (thick meridian bands, a few latitude lines,
dark flecks) on near-black. It rises from the bottom of the frame and settles in the centre
(ticks 0-5). The camera then pulls back over a frame-shaped grid of copies until they read
as a dense field of dots (ticks 6-12), with zoom blur toward the edges. In the reference this
is "found a better way" (21.5 s, green). The globe drawing (`wire_globe`) is shared with
`browser`.

| param | type | default | meaning |
|---|---|---|---|
| `color` | colour | `#57cc1c` | globe ink. |
| `bg` | colour | `#060806` | |
| `size` | float | 391 | settled globe diameter in ref px. The rise scales with it. |
| `zoom_end` | float | 0.158 | tile scale at the end of the pull-back (frame = 1). Smaller = denser dot field. |
| `tile` | [w, h] | [720, 1280] | grid spacing at tile scale 1. The default is frame-shaped. |
| `hold` | int | 0 | ticks to hold the centred globe between the rise and the pull-back. |
| `rise` | bool | true | false = start centred. |
| `grid` | bool | true | false = never pull back (one spinning globe). |
| `speed` | float | 1.0 | time scale of the rise/pull-back tables (0.5 = half speed). |
| `meridians` | int | 10 | keep it even, 8-10. 12 can render as a solid disc at some spins. |
| `band` | float | 0.2 | meridian band half-width (fraction of the spacing). |

```toml
[[shot]]
cue = "better"
kind = "globe_grid"
color = "#57cc1c"
```

**Timing.** 13 ticks for the full rise and pull-back. Longer shots hold the dot field; shorter
shots cut it. The spin advances half a meridian spacing per tick, which reads as turning on threes.
