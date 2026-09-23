# `window.DITHER`

Set it before `engine.js` loads. Anything left out takes the default below. `veil` and `filings` merge one level deep, so `filings: { reach: 0.14 }` keeps the other filings defaults.

## Page

| field | default | what |
|---|---|---|
| `image` | — | Required. A data URI (what `scripts/prep-image.py` writes into `image.js` as `window.DITHER_IMAGE`) or a same-origin URL when the page is served over http. A plain `file://` path won't work: WebGL and `getImageData` refuse it. |
| `mode` | `'veil'` | `'veil'` or `'filings'`. |
| `fit` | `0.8` | Image width as a fraction of the viewport width... |
| `maxH` | `0.8` | ...capped so its height is at most this fraction of the viewport height. |
| `offsetY` | `-0.02` | Moves the image up (negative) or down, as a fraction of the viewport height, to make room for captions. |
| `cells` | `260` | Dither cells across the shorter side of the viewport, which sets the dot size (`px = round(min(vw, vh) / cells)`, at least 2 CSS px). 200 is chunky, 300 is fine. In `filings` mode it also sets the particle count, so above ~340 on a big screen, watch the frame rate. |
| `ink`, `paper` | `'#161719'`, `'#f2f1ec'` | Hex. Paper is also the page background. A tinted ink (Prussian blue, sepia) often suits old prints better than black. |
| `onStats` | `null` | `fn(stats)`, about 8 times a second while anything moves and once when it settles. Veil: `{cells}`. Filings: `{filings, held, away}`. |

## Tone (both modes)

The dither is Floyd–Steinberg with a serpentine scan, computed once per resize at `cols × rows` cells. Per cell:

```
l = luma(rgb) ^ gamma
t = invert ? 1 − l : l          // what "bright" means
t = mix(1, t, alpha)            // transparent pixels are paper
v = (t − 0.5) · contrast + 0.5 + brightness      // v < 0.5 after error diffusion → ink
```

| field | default | what |
|---|---|---|
| `contrast` | `1.2` | Above 1 gives clearer shapes and fewer mid-grey checkerboards. |
| `brightness` | `0` | Positive values mean fewer dots. This is the main knob for a light, airy veil. In filings mode it controls how many particles there are. |
| `gamma` | `1` | Above 1 darkens mid-tones (more ink), below 1 lifts them. |
| `invert` | `false` | Ink on the **highlights**. Use it for chrome, neon, glass and night shots, where the bright parts carry the shape (the original "Dither Veil" face works this way). It needs a cut-out image (alpha), or the white background turns into solid ink. |
| `sheen` | `0` | 0..1. Revealed pixels with high saturation swing in hue with their position relative to the cursor, plus a travelling highlight. For iridescent subjects (morpho wings, beetles, oil slicks, holographic foil). Leave it at 0 for paintings. |

## `veil`

| field | default | what |
|---|---|---|
| `radius` | `0.3` | Lens radius as a fraction of the **image height**. |
| `linger` | `1` | Seconds for a fully revealed spot to heal back to dither. The mask loses `dt / linger` per frame, so it decays linearly. |
| `colorDots` | `true` | Near the edge of the reveal, ink dots take the image's colour before the full image takes over. That's the "colour leaking into the dots" look. |
| `burst` | `true` | Tap/click to blast a large hole... |
| `burstScale` | `3.2` | ...this many lens radii across... |
| `burstDur` | `0.6` | ...expanding over this many seconds (ease-out), then healing at the `linger` rate. |

The mask is a quarter-resolution ping-pong texture: `max(prev − decay, stroke)`. The stroke is a capsule from last frame's pointer position to this one, so fast moves leave a continuous trail with no gaps.

## `filings`

| field | default | what |
|---|---|---|
| `reach` | `0.1` | Magnet reach as a fraction of the shorter viewport side. The catch probability per frame is `(1 − d/reach)² · 18 · dt`, so the hole opens from the middle outward. |
| `maxHeld` | `3200` | Most filings the magnet can carry. When it's full it stops catching until some let go. |
| `hold` | `[2.2, 4.5]` | Seconds a filing rides the magnet (random in the range) before it lets go and springs home. Longer means a longer-lasting reveal. |
| `spikes` | `9` | Number of spikes around the ferrofluid blob's rim. |

Held filings pack into a Vogel (sunflower) spiral around the cursor. Slot `k` sits at radius `0.6·px·√k`, and a freed slot is refilled first. The outer half of the blob is pushed into spikes that rotate slowly, and the blob trails behind fast moves. Riding filings are drawn as radial strokes along the field, returning ones as strokes along their velocity, and filings at home as square dither dots. Exposure is measured per 4×4-cell block (the share of that block's filings that are away) and shown through an 8×8 Bayer handoff, so the image appears exactly where filings have actually left.

Tap/click flips polarity: riding filings are flung outward (500–1600 px/s) with a short free flight before the home spring engages, and nearby resting filings get kicked in proportion to how close they are. Catching pauses for 0.7 s so the blast isn't immediately undone.

## Picking values

- **Photo of an object on white** (specimens, products): `prep-image.py` defaults, `contrast 1.2–1.4`, `brightness 0.1–0.25`. Filings mode suits it.
- **Painting or print, full rectangle**: `--cutout none`, `contrast 1.4–1.6`, slightly negative `brightness` so pale paper areas stay mostly empty, and ink matched to the print. Veil mode suits it.
- **Chrome / neon / glossy renders**: cut out, `invert: true`, `gamma 1.3–1.6`. Veil mode with `colorDots` gives the holographic edge.
- **Dots look like a grey checkerboard**: raise `contrast` or move `brightness` away from the mid-tone.
