# signal-print grammar

## Tokens

| token | value | use |
|---|---|---|
| `--or` / `OR` | `#ff5217` | the signal: bars, marks, stamps, one big number |
| `--ink` / `INK` | `#1b1916` | type, rules, footer bars |
| `--paper` / `PA` | `#f5f2ea` | ground (pure `#fff` only for the tape and stripe plates, where it reads as a gap) |
| `--blue` | `#2437ff` | alternate field for a single plate |
| `--speckle` | SVG turbulence data URI | lighter-orange mottling on every orange fill (`.or` class) |
| `--grain`, `--grain-lite` | SVG turbulence data URI | dark specks on light plates, white specks on dark plates |
| `#rough` | feTurbulence + feDisplacementMap, scale 2.2–2.4 | pressed/printed edges on the whole plate |

The speckle and grain colour matrices threshold the noise: `alpha = 15·R − 9.4` keeps only the top ~40% of the noise as specks. If you raise the constant, the specks get sparser.

## Type

- Grotesk: Archivo, variable `wdth 62..125`, `wght 500..900`. Condensed (62–80%) for tall numbers (`07`, `4096`, NIGHT SHIFT). Extended (108–125%) for wide wordmarks. Negative tracking of −.02 to −.04em on anything big.
- Mono: Space Mono 400/700, always caps. Line-height 1.4–1.55. Size about 2–3.2% of plate width.
- Doto (dot-matrix) was used once, for the night-shift digital clock. Use it for readouts only.
- Size everything in `cqw` (the poster is `container-type:inline-size`) or in SVG user units. Never use px inside a plate.

## Copy rules

- Every block is a status report: `INTERFACE: CLI / EDITOR  /  ARMED`, `COMPONENT: …`, `› DOMAIN: …`, `› STATUS: … - - - - - -`.
- Brackets hold states: `[ WARP THREADED ]`, `[ HIGH THREAD COUNT ]`. Put one space inside the brackets.
- Numbers do the brand work: counts (4096), rates (12,090 PICKS/S), zero-claims (0 SNAGS · 0 DROPS), cadence (24 / 7 / 365), unit codes (UNIT 07-L, LM-0007, SHT 03 / 08).
- Everything comes from one metaphor. Weaving gave LOOM: warp, weft, pick, shuttle, bobbin, selvage, bolt, snag, tension, light table. Other metaphors that work: foundry (pour, cast, anneal, slag), rail (signal, block, switch, manifest), orbit (burn, apogee, telemetry), mill, kiln, relay, tide.
- One human line per sheet: THREADS DON'T SLEEP / YOU DO, HANDLE WARM, NO LOOSE ENDS.

## Plates — sheet 01 (identity.html)

| # | plate | how it's built | knobs |
|---|---|---|---|
| 01 | Tape | Three `.strip.or` columns. Each holds a `.in` box that is `125cqw` wide (the poster's height) and **rotated 90° with `transform-origin:0 0` + `translateY(-100%)`**, so it's laid out horizontally and reads top to bottom. Strip 3 holds `.run` tickers (`translateX(-50%)` loop over duplicated content) | strip `left`/`width`, `--w` must match strip width in cqw |
| 02 | Emblem | 3-column grid: ruler / middle / ruler. Rulers are two stacked `repeating-linear-gradient`s (minor ticks every 3.2cqw, major every 16cqw) plus black `<i>` tabs. The middle has the title, `.or` bar, crosshair field (SVG diagonals + dashed circle, `vector-effect:non-scaling-stroke`), the mark spinning over 40 s, coordinates, a REF row and a black footer | tab positions in JS |
| 03 | Sequence | 5 rows. The left cell holds a giant number, with a `::before` orange band covering 58% of its width. The log is `white-space:pre`. `.stamp` ©2026 is `mix-blend-mode:multiply`, rotated −4°. `.seal` is a ring monogram. One `[data-type]` line retypes itself | rows, variants list |
| 04 | Stripe | A huge word with `background:repeating-linear-gradient` clipped to the text, which gives barred type. The canvas `[data-rings]` draws a word into a tiny offscreen canvas (one pixel per ring), rotates the sample 90° and strokes a ring per filled pixel | `cell` = rings across, word |
| 05 | Terminal | Dark plate with an orange glow number, 32 stepped bars, a masked scrolling feed and a seeded barcode. `setInterval` 650 ms | verbs/things lists |
| 06 | Halftone | Offscreen canvas: the mark blurred (`ctx.filter`), then sampled on a 45° grid. Dot radius = √alpha. On pointer move, dots grow under a Gaussian of the cursor distance (the loupe) | step `W/58`, loupe width `.012` |
| 07 | Night shift | Cobalt field, condensed stack with the last line in orange, SVG dial with 120 ticks, a quadrant sweep and a seconds hand on rAF | field colour |
| 08 | Badge | Lanyard (vertical wordmark), metal clip, rotated card: slot, `.or` band, 44cqw condensed number + mark, dotted rows, a dashed perforation and a barcode stub | number, rows |

## Plates — sheet 02 (svg-kit.html)

Every plate is a string built with helpers: `T()` for mono text, `G()` for grotesk text and `asset(name,x,y,w,h,viewBox,body)` for a downloadable nested svg. `P()` registers the plate.

| # | plate | notes |
|---|---|---|
| 01 | Glyphs | `ICONS` = name → path on a 24 grid, stroke 2, square caps, mitre joins. Orange keylines (frame, circle r10, square 18, diagonals) sit **behind** the asset, not inside it, so exports stay clean. KNOT = the mark at scale .2 |
| 02 | Construction | Mark at scale 2.6. The overlay reuses the same transform, with `vector-effect:non-scaling-stroke` so hairlines stay 0.7px: dashed stadiums, dash-dot axes, the end-cap radius circle, the pin circle and an angle arc. Labels are placed in screen space with `pol()`. Four lockups sit in 88×88 cells |
| 03 | Blueprint | `marker` arrowheads with `orient="auto-start-reverse"`, a `clipPath` of the body so the hatched tips follow the curve, a dash-dot centreline, dimension + extension lines, numbered callouts, a parts table and a title block |
| 04 | Swatches | Six `<pattern>`s (twill, herringbone, gingham via two 55% orange rects, selvage stripe, 45° dot screen via `patternTransform`, plain weave with pills) |
| 05 | Stamps | Seal: `textPath` on a circle, rotated with SMIL `animateTransform`. Burst: 48-point star. Rubber stamp: `#worn` filter (anisotropic turbulence `0.08 0.9` → alpha threshold → `feComposite operator="out"`). Parcel labels. Caution tape: a 45° stripe pattern with an ink band |
| 06 | Weave | Warps first (paper, 9 wide). Each weft goes over an ink "gap" stroke, drawn with `pathLength=1` + a dashoffset animation staggered 0.18 s. Where the warp is on top, a short warp segment is redrawn over the weft with its own gap |
| 07 | Dingbats | 20 marks on a 40 grid. Filled and stroked (3.2) versions mixed |
| 08 | Instruments | Semicircle gauge (`pol()` ticks; the needle is rotated by setting the `transform` attribute, **not** CSS, because a CSS transform-origin inside a nested svg resolves against the wrong box), 24-segment meter, sparkline + area, knob, toggles. Updated every 620 ms |

**Export.** Clicking an asset clones the nested svg and strips x/y/class. It then walks `url(#…)` and `href="#…"` references recursively and copies each pattern/marker/filter/clipPath it finds into a `<defs>`. It adds a font `<style>` and downloads at 4×. Any new asset that references defs will export correctly as long as those defs live in the same plate SVG.

## Traps already hit

- **Rotated text strips.** `writing-mode:vertical-rl` combined with flex layouts produced blank or clipped strips. Lay the strip out horizontally in a box as long as the poster is tall and rotate the whole box.
- **Grain.** Opacity .55 made the paper look like TV static in screenshots. Use .26–.28 on light plates and ~.3 with screen blending on dark ones.
- **Wide display words.** `font-stretch:125%` at 31cqw overflowed the plate. Check the widest word, and remember that extended widths grow fast.
- **Corner meta vs. headline.** A 58-unit headline ran into right-aligned meta text. Keep display titles at ≤44 units on a 400-wide plate when there's meta in the corner.
- **Asset backgrounds.** A full `rect` fill inside the gauge asset painted over the plate title. Leave asset backgrounds transparent unless the asset needs its own ground.
- **Empty toast.** A fixed toast translated off-screen still showed its padding in full-page screenshots. Hide it with opacity too.
- **Canvas plates** have to (re)build after `document.fonts.ready` and on resize, or the ring word renders in a fallback font.
