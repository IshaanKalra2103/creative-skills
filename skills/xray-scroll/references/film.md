# Writing `film.js`

`film.js` exports one function that fills a paused GSAP timeline. The engine makes it 100 units long and binds it to scroll over `.track`. Chapter `<section style="--len:N">` heights use the same units and must sum to 100 (the engine warns otherwise).

```js
export default function film({ tl, S, M, focus: F, focusSize: fs, set, to, show, hide, flash, ALL0, WHITE }) { … }
```

| helper | does |
|---|---|
| `set(t, {…})` | hard cut at t (reverts when scrubbing back) |
| `to(t, dur, {…}, ease)` | ramp S keys from their value at t to the targets by t + dur |
| `flash(t, dur, on, off)` | `set(t, on)` then `set(t + dur, off)`, the one-beat glitch |
| `show(sel, t, dur)` / `hide(sel, t, dur)` | fade an overlay element (`autoAlpha`) |
| `tl` | the raw timeline, for anything else (`tl.fromTo('.mk', …)` staggers the markers) |
| `ALL0` / `WHITE` | every stage at 0 / every glitch off (back to white paper) |
| `M` | model size `{ l, w, h }`; `F` focus centre, `fs` focus bbox diagonal |

Set the initial state with `Object.assign(S, {…})` at the top. That's what shows at scroll 0.

## State keys (`S`)

| key | range | effect |
|---|---|---|
| `az`, `el` | deg | camera azimuth (0 = in front, at −Z) and elevation (89.5 = overhead; never exactly 90) |
| `fw`, `fh` | world units | frame to fit around the target, width × height; the camera backs off until both fit. Phones in front views fit 74% of `fw` (fills the width like a 4:5 film) |
| `tx`, `ty`, `tz` | world | look-at target. In front views a higher `ty` drops the model lower in frame (room for the header) |
| `shift` | 0–0.3 | pan sideways by a fraction of the frame width (reduced on phones); puts the close-up subject off-centre |
| `lead` … `skin` | 0–1 | stage reveals: fade + fly-in (ease-out cubic) |
| `mirror` | 0–0.6 | floor reflection strength |
| `gain` | ~1 | overall darkness |
| `mosaic` | px, 0 = off | block size, in CSS px |
| `dark` | 0/1 | white x-ray → light-on-black |
| `grid` | 0/1 | black field, green dot grid, +/− glyphs, random black cells, green border (use with `dark: 1`) |
| `red` | 0/1 | red glow (with `dark: 1`) |
| `scan` | 0/1 | red scanlines displaced by density |
| `stat` | 0/1 | NO SIGNAL static (pair with `show('.nosignal')`) |
| `smear` | 0–1 | datamosh: rows stretched from random anchors, posterised B/W |
| `blur` | px | defocus (12-tap spiral); use it for the first fade-in |
| `jit` | 0–1 | row tearing (scroll velocity adds up to 0.8 on its own) |
| `track` | 0–1 | tracker boxes appear one by one as it rises |
| `trackSet` | 0/1/2 | which node list: front / overhead / close-up |

## Recipes

- **Pixel hit**: `flash(t, 0.6, { mosaic: 18 }, { mosaic: 0 })` (on paper) or `flash(t, 0.7, { dark: 1, grid: 1, mosaic: 10 }, { dark: 0, grid: 0, mosaic: 0 })` (grid).
- **Logo card**: `set(t, { dark: 1, grid: 1, mosaic: 22 }); show('.logo', t, 0.05)`, then undo both ~2 units later.
- **Signal loss**: `set(t, { dark: 1, red: 1 })` → `set(t + 1.4, { scan: 1 })` → `set(t + 2.8, { stat: 1, scan: 0 }); show('.nosignal', …)`. Do camera cuts and stage resets *under* the static, then `set(…, { ...WHITE })`.
- **Rebuild**: `set(t, { ...ALL0 })` under a glitch, then ramp stages back one by one. Bring every stage back, or those parts stay missing.
- **Cut to close-up**: `set(t, { smear: 1 })`, move the camera at t + 1, ramp `smear` to 0.

## The reference storyboard (default `film.js`)

Mapped from a 10 s, 720×900 reference clip ("SHIPMENT PROJECT :/ TRACE LOG: OK // NODE GROUP: ACTIVE //").

| units | chapter | beats |
|---|---|---|
| 0–5 | ACQUIRE | whole model pixelated on the black grid, SHIPMENT logo; blocks grow |
| 5–14 | LEAD | cut to white paper; the lead stage blurs in from the front; base flies in from the sides; frame to 45%; grid flash at 11.6 |
| 14–26 | FRAME | header fades in; frame completes; tracker (front set) locks on node by node, then lets go |
| 26–34 | CALIBRATE | mosaic hit; 3×3 checker markers pop in with `Freq:: 7.1 Mhz / KEY-1`; core fills in; second mosaic hit |
| 34–46 | SHELL | shell drops on, skin after; camera rises to 11°, pulls back; floor reflection comes up; logo on the grid at 40.5 |
| 46–53 | SIGNAL | push into the front; grid flash; red glow; red scanlines; NO SIGNAL; hard cut to overhead under the static |
| 53–72 | OVERHEAD | base appears as mosaic blocks that resolve; frame + lead, core, shell, skin; tracker (overhead set); red top view; scanlines; datamosh |
| 72–90 | DETAIL | close-up of the focus part, drifting; tracker (close-up set); grid flash; smear; into the grid |
| 90–100 | END | pull back overhead on the grid, logo, blocks grow and the image fades out |

## Traps already hit

- **Tracking a part that hasn't landed**: unrevealed parts sit at their fly-in offset, so a box on them points off-screen. The HUD now skips stages below 0.6, but pick tracker nodes from stages already revealed at that beat.
- **Overlapping tweens on one key** (e.g. a long camera drift that runs into the outro's pull-back) fight while scrubbing. End one at the other's start.
- **`to()` start values** are captured when the playhead first reaches them, in insertion order. Put a `set()` before a `to()` that starts at the same time.
- **Frames in world units** only fit the model they were tuned on. Use `M` and `fs`.
- **Overhead on tall models**: aim `ty` at `M.h`, not the floor, or the top of the model is much closer to the camera than the frame assumes.
- **Portrait**: `fw` shrinks to 74% only below 45° elevation; overhead frames use it as is, or wheels crop off the sides.
