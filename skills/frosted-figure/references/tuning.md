# Tuning

Every option is a `--flag value` on `render.mjs`, a `?key=value` on the served page, or a key in
`opts` for `frostDensity`/`frostColour`. Sigmas are fractions of image width.

| option | default | what it does |
|---|---|---|
| `palette` | `green` | `green` `gold` `yellow` `pink` `blue`, or any `#rrggbb` (built in OKLab around that colour) |
| `blurNear` | `auto` | Main frosting sigma. Auto = 0.021 × head width, clamped 0.008–0.02 (0.015 without a head mask) |
| `blurFar` | `auto` | Wide glow sigma. Auto = 3.3 × `blurNear` |
| `farMix` | 0.35 | Share of the wide glow. Higher = softer, more halo, less detail |
| `shadeLo` / `shadeHi` | `auto` | Luminance range treated as dark → lit. Auto = 5th / 85th percentile inside the person |
| `base` | 0.24 | Density every part of the person gets |
| `shadow` | 0.42 | Extra density for dark parts of the photo |
| `depth` | 0.45 | Extra density deep inside the silhouette (× inside², so the rim stays light) |
| `deep` | 0.07 | Sigma of the "inside" measure. Bigger = the dark core spreads further from the edges |
| `fadeStart` / `fadeAmt` | 0.6 / 0.85 | Where (fraction of height) the bottom fade starts, and how far it lifts |
| `grain` / `lumaGrain` | 0.035 / 0.018 | Density grain (coloured, inside the figure) / luminance grain (everywhere) |
| `seed` | 7 | Grain seed |
| `keyLo` / `keyHi` | 35 / 75 | Colour-key cutout only: backdrop distance (RGB units) that ramps from backdrop to person |
| `size` (renderer) | 1600 | Long side of the output in px |
| `cutout` (renderer) | `auto` | `auto` = ML, colour key if it can't load. `ml` = fail rather than fall back. `key` = no network |

`render.mjs` prints `[frost] resolved: …` with the values the `auto` options chose. Start tuning
from those numbers.

## By photo type

| photo | what to expect / change |
|---|---|
| Close-up head, plain backdrop | Defaults. Auto blur lands near 0.015; the ear, jaw and brow stay visible as soft shapes |
| Head and shoulders, head ~½ frame | Defaults (auto ~0.009–0.011) |
| Half or full body, small head | Auto hits the 0.008 floor. If the face is still mush, `--blurNear 0.006`; it starts to look like a tinted photo below that |
| Low-key (dark clothes on black) | Auto-levels handle it. If the figure is still one dark slab, raise `--shadeHi` a little or lower `--shadow` to 0.3 |
| High-key (white clothes, pale backdrop) | The ML cutout matters here; the colour key fails. If the figure is too pale, `--base 0.32` |
| Bleached or white hair | Reads as a pale dome over darker skin. That's the photo; leave it |
| Profile / looking up | Defaults. The profile edge carries the read, so don't over-blur |

## Failure modes

- **Paper has a faint tint over the whole image.** The mask isn't 0 on the backdrop. With the ML cutout the stretch removes it. With `--cutout key`, the backdrop isn't flat enough: check `--mask`, raise `--keyLo`.
- **Hard-edged pale blocks or rectangles around the figure.** The colour key fitted the wrong backdrop, usually because the subject fills most of the border. Use the ML cutout. With the key, `--mask` shows it inverted (backdrop white).
- **The face is a dark socket.** The face is shadowed in the photo (looking down, side-lit) and density saturates there. Lower `--shadow` to ~0.3 and/or raise `--shadeHi`. It's partly the photo's truth: the reference look darkens the face core too.
- **Everything is one smooth blob, nothing identifies the person.** Blur is too big for the head size. Lower `--blurNear` (and `--farMix` to 0.25). Glasses, hands and hair shapes are what carry identity at this blur; keep them.
- **Jacket mass.** Black clothing filling the lower half becomes the darkest, largest shape and pulls the eye from the face. Lower `--shadow`, start the fade higher (`--fadeStart 0.5`), or crop the photo tighter before rendering.
- **Yellow looks muddy or olive.** A dark yellow is brown. Use `yellow` or `gold` (their shadows stop at amber) instead of a hex yellow.
- **Holes in the figure (lighter spots inside).** Colour key only: parts of the person match the backdrop colour (silver glasses, bleached hair against pale blue). The fill handles enclosed holes; switch to the ML cutout for the rest.
- **The cutout misses a held object or a second person.** The ML model segments people. Props held away from the body drop out, and a second person merges or is partly dropped. Crop to one person.

## Making a new named palette

Keep 11 stops at the same positions as `green` and match its lightness step by step. Stop 0 is
always the paper `#f9f9f9`; 0.08 is a near-white tint; 0.20–0.30 the pale rim; 0.42–0.64 the
saturated body; 0.74–1.00 the deepening core. Easiest: `makePalette('#yourmid')` in the console,
copy the result into `PALETTES`, and hand-adjust the darks if they go muddy (shift their hue
toward a warmer or cooler neighbour, as `yellow` does toward amber).
