# Design language

The look is a **physical machine on a workbench in a dark, cinematic studio**: real materials, soft key light,
glowing data paths, shallow-focus mood, refined overlay UI. It came from studying a reference screen recording
("The Plane of Focus") and holds up across very different topics. Everything below is already in the template;
this explains the values so you can change them without breaking the look.

## Light and render

| setting | value | why |
|---|---|---|
| tone mapping | ACESFilmic, exposure 1.08 | filmic rolloff on brass highlights; glows stay saturated |
| colour space | sRGB output, CanvasTextures in sRGB | canvas text keeps its true colour |
| environment | `PMREMGenerator.fromScene(new RoomEnvironment(), 0.04)` | free, offline studio reflections; metal looks like metal |
| hemisphere | 0x3d4d5e / 0x0a0806, 0.55 | cool top, warm-black bottom ambient |
| key | DirectionalLight 0xffe4c4 2.1 at (−6,16,12), 2048² PCF soft shadows, radius 4, follows the camera target | warm, soft shadows under stands; following keeps the shadow frustum small, so shadows stay crisp |
| rim | 0x7fdcff 0.9 from behind (4,9,−14) | separates dark metal from the dark wall |
| practicals | cyan PointLights (6, range 12) every ~18 units above the bench | the teal glow pooling on the bench |
| fog | FogExp2 0x07090c, 0.018 | far stations dissolve, which reads as depth |
| background | 0x07090c, dark panelled wall at z=−15 with seams, framed wall screens, ring lights | not a void: a room with depth |

Post chain: `RenderPass → UnrealBloomPass(strength 0.55, radius 0.55, threshold 0.9) → grain/vignette ShaderPass → OutputPass`
into a HalfFloat render target (MSAA ×4 only when DPR < 1.75).
- **Bloom threshold 0.9** is what keeps text crisp. Only `MeshBasicMaterial({toneMapped:false})` colours pushed
  above 1 (via `K.hdr(css, k)` / `M.glow(css, k)`) bloom. Canvas text uses toneMapped:false at ≤1, so it never
  halos. To make something glow, raise its multiplier; to show a *true* colour (a value that IS a colour), keep
  it ≤ 0.85.
- Grain: hash noise ×0.045 (×0.014 when recording, because video encoders hate grain and the file doubles in size),
  vignette `mix(0.42, 1, smoothstep(1.05, 0.28, r))`, chromatic offset `d·r²·0.004` (any more looks broken).
- Motes: 600 additive point sprites, warm/teal, slow drift. They add air for almost no cost.

## Materials (`K.M`)

| name | spec | use |
|---|---|---|
| `dark` | 0x1a1e24, metal 0.65, rough 0.42 | housings, plinths, the bench top |
| `darker` / `matte` | 0x0d1014 / 0x15181c | apron panels, walls, recesses |
| `brass` | 0xb98432, metal 1, rough 0.32, env 0.95 | rails, stand posts, gears, nameplates, bezels: the "jewellery" |
| `brassDim` | 0x8a6327, rough 0.4 | secondary gears, collars |
| `steel` | 0x9aa3ad, metal 1, rough 0.22 | rods, gantries (use a darker 0x5d636b for long rods: bright steel reads as a white line) |
| `glass` | physical, opacity 0.16, clearcoat 1, DoubleSide, no depthWrite | gate panes, big glass |
| `caseGlass` | opacity 0.05, env 0.45 | cases around value grids (more than ~0.06 turns milky and hides the numbers) |
| `glassDark` | 0x0b1218, opacity 0.78 | chip bodies |
| `screen` | 0x05080b | boards behind histograms, attention planes |
| `tint(css, op, emissive)` | coloured physical glass | lens discs (opacity ≤ 0.22, emissive ~0.1, env 0.45: brighter becomes a flat coloured disc) |
| `glow(css, k)` | MeshBasic, toneMapped false, colour × k | rims, flow lines, LEDs (k 1.4–3) |

Geometry: `RB(w,h,d,r)` rounded boxes everywhere (no hard cubes); `gearGeo` for brass gear rings around lenses
and dials; `knurlGeo` for lens barrels; bevelled extrusions. Small spheres (r 0.045) as brass rivets and caps sell
the "made object" feel.

## Palette and semantic colour

Base hues: cyan `#45e6e0` (accent, flow, "the answer"), blue `#6aa0ff`, green `#45e08e`, purple `#bd86ff`,
brown `#d29a5a`, red `#ff5a68` (masked / bad / never run), amber `#ffb547` (secondary highlight, generated
items, loss), brass `#d6a24e`.
- Map them to meanings once per explainer: `colors: { query: "blue", key: "green", value: "purple", position: "brown", masked: "red" }`.
  The engine mirrors these to CSS vars `--c-<name>`, so the explain box can use the same colours.
- Signed numbers: diverging blue `#2a6dff` ↔ dark `#1a2029` ↔ orange `#ff8418` (`K.divColor(v, scale)`).
- Typed bars: brightness and depth ∝ |v|, negative values dim (the printed number carries the sign).
- Keep cyan for "flow / output / the thing to look at". Don't spend it on decoration.

## Typography

- UI: **Outfit** (300–800) for words, **JetBrains Mono** (400–700) for every number. Google Fonts.
- Load fonts *before* drawing any canvas text (`document.fonts.load`), or the fallback face gets baked into textures.
- In 3D, all text is canvas-on-plane (`K.textPlane(w, h, ppu)`) at ppu 220–360. Numbers get a 0.07·pitch black
  stroke under the fill so they read over any cell colour. Titles 0.15 units, labels ~0.17, numbers 0.3·pitch.
- Brass nameplates: dark ink `#1c1206`, 700 weight, caps ("01 · TOKENIZER GATE").

## Overlay UI (HTML over the canvas)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← back                                                    ┌─ control panel ─┐ │
│ THE NEXT-WORD        (small caps, 800, 21px)              │ segmented ctrls  │ │
│ MACHINE              (800, 47px, cyan, soft text glow)    │ slider + value   │ │
│ 2–3 line description (13px, ink-2)                        │ contextual ctrls │ │
│ [chip][chip][chip]   (stat chips: 8.5px caps label, 16px mono cyan value)    │ │
│ ┌ explain box ─────────────┐                              │ ▶ Tour   [?]     │ │
│ │ 05 ATTENTION PLANE · …   │      ( 3D machine )          └──────────────────┘ │
│ │ copy with <em>key words</em>                                                 │
│ │ ┌ fx: live arithmetic ┐ │                                                     │
│ └──────────────────────────┘                                                    │
│        ┌ console: live strip (tokens / items + values)            05 Name ┐    │
│        │ ‹ [thumb 01][thumb 02][thumb 03] … filmstrip of live renders ›   │    │
│        └ ──────●────────── scrubber with ticks ─────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```
- Glass panels: `rgba(14,18,24,.62)` + `backdrop-filter: blur(16px) saturate(1.2)`, 1px `rgba(255,255,255,.16)` border, radius 10–14.
- A soft left-edge gradient behind the title block (`#hud-left::before`) keeps text readable over a bright scene.
- Segmented buttons: the selected one is a white pill with dark text (strong, unambiguous state).
- Filmstrip thumbnails are real renders of each station's focus, taken at boot.
- Pill labels in 3D (`tag(text, sub)`): dark pill, coloured dot, 10.5px text + mono sub-label. They fade when
  off-station or > 34 units from the camera, and `cls: "warn"` (red border) marks bad or masked states.
- ≤ 1400px / ≤ 860px-height: tighter type. ≤ 860px wide: the panel becomes a bottom sheet with a "Controls"
  handle, the explain box docks above the console, and description and chips hide.

## Camera and motion

- Station focus: target at the station's visual centre, camera ~11–14 units away, 2–4 units above, slightly
  left of centre (a three-quarter view shows depth: bars, beams, rails). `fit: <width>` guarantees the station
  fits beside the HUD.
- Fly: duration `clamp(1.1, 2.6, base·(0.55 + dist/40))`, easeInOutCubic on both position and target, plus a
  crane arc (`sin(π·e)·min(2.5, 0.07·dist)` added to y). Orbit controls stay disabled during a fly.
- Optical centre: `camera.setViewOffset(w, h, −1.2%·w, +6.5%·h)` puts the subject between the panels and above the console.
- Handheld drift: `rotateY(sin(0.31t)·0.0035)`, `rotateX(sin(0.23t+1)·0.0025)`, re-based every frame by `lookAt`.
- Idle life: gears turn (0.15 rad/s), chips bob (±0.03), flow shaders run (pulses along beams/rays), motes drift,
  dial needles ease (`damp` λ=4.5), histogram bars re-sort with damping (λ=8).
- Intros: rows pop with easeOutBack, staggered 0.06–0.15 s; rays fade in, then numbers fade in last. Start them
  at 70% of the fly duration so they play as the camera settles.
- Exploded view: a global 0→1 `S.explodeAmt` (damped λ=3). Each station decides what separates: decks lift, lens
  elements slide along the axis, housings lift their lids, parts pull apart in z.
