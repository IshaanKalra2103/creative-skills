# Porting a shader-effects component to fframes SkSL

Upstream: <https://github.com/shader-effects-inc/shaders> (MIT, © 2026 Shader Effects Inc.).
Each effect lives in `packages/core/src/shaders/<Name>/index.ts` with a `cover.jpg` that shows
what it should look like. The definition is a small DSL (`defineStd`) that composes "nouns" from
`packages/core/src/std/**` which call TypeGPU functions in `packages/core/src/gpu/kit/**`
(`tgpu.fn([...], ret)((args) => { 'use gpu'; ... })`). Those kit bodies are the real math. A port
means: read the definition, follow each noun to its kit function, and write the whole chain as one
SkSL `half4 main(float2 coord)`.

`packages/core/src/gpu/kit/CATALOG.md` indexes the kit by question ("I need fbm", "my shader is a
wipe"). `grep -n "export const <fn>" packages/core/src/gpu/kit/*.ts` finds a body.

## Upstream conventions you must reproduce

| upstream | in SkSL |
|---|---|
| `ctx.uv` in 0..1, y = 0 at the **top** (positions are y-flipped to match) | `float2 uv = coord / iResolution.xy;` (fframes `coord` is already top-left origin, y down) |
| aspect-correct space (`aspectUv`, `centeredAspect`…) | read the kit helper; usually `(uv - c) * float2(iResolution.x / iResolution.y, 1)` |
| `animatedTime: { speed: 'speed' }` → `_animTime += deltaTime * speed` | `float t = iTime * uSpeed;` (+ `uSeed` when the helper adds a seed) |
| `ctx.time` (global clock) | `iTime` |
| `ctx.viewportSize`, `ctx.logicalViewportSize` | `iResolution.xy` |
| position props (stored as `(x, 1 - y)`, flipped back by every kit body) | use the uniform as plain top-left uv: `0,0` = top-left |
| hex color props → **linear** RGB on the GPU | declare `uniform float4 uX;` (fframes `.color()` sends unpremultiplied sRGB RGBA), then `lin(uX.rgb)` before mixing; default "transparent" is `#00000000` |
| final pass: `linearToSrgb(tonemap(rgb))`, tonemap `linear` = clamp | `return half4(half3(toSrgb(clamp(rgb, 0, 1))), 1)` at the end |
| `colorSpace` prop (`linear`, `oklab`, `oklch`, …) | port only the **default** space; mention others in `note:` |
| `compileTime: true` props (counts, modes) | constant at the default value, or a `float` uniform used in a constant-bound loop with an early `if (i >= n) break;` |
| `role: 'filter'` (reads its child) | `uniform shader uSrc; uniform float2 uSrcSize;` sample with `uSrc.eval(clamp(uv, 0, 1) * uSrcSize)` (upstream samples clamp-to-edge) |
| the child texture is **linear** upstream | decode samples with `lin()` before luminance, multiply, YIQ or any color math; pure resamples (ChromaticAberration, Pixelate) can skip it |
| child premultiplied alpha | `uSrc.eval` returns premultiplied; un-premultiply before color math, re-premultiply after |

sRGB helpers (use these exact ones so every port matches):

```glsl
float3 lin(float3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, float3(2.4)), step(0.04045, c)); }
float3 toSrgb(float3 c) { c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, float3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
```

Props that are percentages upstream (`intensity: 80`, `balance: 50`) stay in the same units in the
uniform so the upstream docs still apply; divide inside the shader the way the definition does.

## TypeGPU → SkSL

| TypeGPU / WGSL | SkSL |
|---|---|
| `d.f32`, `d.vec2f`, `d.vec3f`, `d.vec4f`, `d.mat2x2f` | `float`, `float2`, `float3`, `float4`, `float2x2` |
| `d.i32`, `d.u32` | `int` (no unsigned, no bitwise ops, no bitcast in SkSL ES2) |
| `a.add(b)`, `.sub`, `.mul`, `.div` | `a + b`, `a - b`, `a * b`, `a / b` |
| `std.mix/clamp/smoothstep/fract/floor/dot/length/normalize/pow/exp/sin/atan2` | same names; `atan2(y, x)` → `atan(y, x)` |
| `std.select(f, t, cond)` | `cond ? t : f` (note argument order) |
| `std.fwidth(x)` | not available. For affine coords `fwidth(k * uv)` = `k / iResolution.y` per axis; for radial/angular fields (spirals) derive both terms analytically, which also removes the `atan` seam |
| `for (let i = 0; i < n; i++)` with runtime `n` | constant bound + `if (float(i) >= n) break;` |
| compile-time select props (`pattern: 'bayer4' \| ...`) | a `float` index uniform and an `if` chain; port the default branch first |
| `smoothstep(a, b, x)` with `a > b` (legal in WGSL) | `1.0 - smoothstep(b, a, x)` |
| `smoothstep(e, e, x)` at softness 0 (a hard step) | add ~1 px of analytic AA so edges don't alias |
| `while` | rewrite as a bounded `for` |
| integer hashes (`hash12`, `pcg`, bitcasts) | float hashes: Hoskins `hash11/12/22/32/33` (`fract(p * 0.1031)` family). Patterns differ from upstream; the *look* must match, not the exact grain. Upstream's own `sin`-`fract` hashes with large arguments also differ per GPU: port them verbatim, expect the same look and a different layout |
| arrays indexed by a loop var | unroll, or a function with `if` chains; no dynamic indexing |
| `textureSample(tex, samp, uv)` | `uSrc.eval(uv * uSrcSize)` (pixels, not 0..1) |
| struct returns | `out` parameters or several small functions |

## The file

```glsl
// fx: Aurora
// kind: generator            generator | overlay | filter | mask
// blend: screen              overlays only (any CSS mix-blend-mode)
// from: shader-effects-inc/shaders packages/core/src/shaders/Aurora (MIT)
// about: one line on what it looks like and when to use it in a video
// uniform: uSpeed float 5
// uniform: uColorA color #a533f8
// uniform: uCenter float2 0.5 0
// note: what was simplified (colorSpace other than default, compileTime props fixed, …)
uniform float3 iResolution;   // filled by fframes: the <image> width/height
uniform float iTime;          // seconds into the scene
...
half4 main(float2 coord) { ... }
```

The header lines (`// key: value` at the top) are read by the gallery and are the documentation of
the effect: every uniform the shader declares (except `iResolution`, `iTime`, `iFrame`,
`iTimeDelta`, `uSrc`, `uSrcSize`) gets a `// uniform:` line with the **upstream default**. Name
uniforms `u` + the upstream prop name in camelCase (`curtainCount` → `uCurtainCount`).

Kinds:
- `generator`: draws its own pixels, opaque or with alpha. Clip it with an SVG `clipPath` to fill
  a shape.
- `overlay`: a layer meant for `<g style="mix-blend-mode:...">` over SVG content (grain, light
  leaks, vignettes). Needed because fframes cannot feed a rendered SVG subtree into a shader.
- `filter`: processes an image or video frame bound to `uSrc` (`ctx.get_image`,
  `frame.get_synced_video_frame`). Exact upstream behavior for image/video sources.
- `mask`: outputs coverage in alpha (white, premultiplied) for wipes and dissolves; use it as an
  SVG `<mask>` content or draw it over the outgoing scene.

When a filter is also useful over SVG scenes (vignette, light leak, grain), ship both:
`<Name>.sksl` (`filter`, exact) and `<Name>Overlay.sksl` (`overlay`, documented approximation).

## Verify every port against its cover

From `gallery/` (the harness renders each `.sksl` as a 2 s scene named after its `fx:`):

```bash
cargo run --release -q -- --check --only Aurora           # compiles with Skia, prints SkSL errors
cargo run --release -q -- frame "Aurora@1s" --only Aurora # frames/aurora_1s.png (1280x720)
../scripts/compare.sh Aurora                              # cover.jpg | port side by side -> compare/Aurora.png
cargo run --release -q -- strip Aurora -n 6 --only Aurora # motion over 2 s -> strip.png
```

Open the compare image and judge it like a designer: same structure, palette, density, softness and
motion character at the default props. Covers are sometimes shot with non-default props; read the
cover, and if it clearly uses different colors, tune the gallery defaults in the header to the cover
only when the definition's defaults would be misleading, and say so in `note:`. Iterate until it
reads as the same effect. A port that compiles but looks different is not done.

## Ground truth: snapshots before covers

`packages/core/src/__tests__/gpu/__snapshots__/shader-<Name>.test.ts.snap` holds the resolved
final-pass WGSL for each effect: the exact prop transforms, constants and output stage. Read it when
the definition's DSL is ambiguous.

**Covers are often not shot at default props** (Spiral at scale ~8, DotGrid at density ~10,
LightLeak with another anchor, Godrays centered). Port the code, not the cover. To confirm a port,
temporarily set the header uniforms to the cover's look, compare, then restore the defaults and
re-run `compare.sh` (it overwrites `compare/<Name>.png`). Some covers can't be reached by the current
code at all (FractalNoise's cover predates the normalized fBm); say so in `note:`.

## Color and alpha, exactly

- **Output stage.** The final pass encodes `linearToSrgb(tonemap(rgb))` and generators return
  straight alpha, so a semi-transparent generator (Aurora, Prism, LensFlare, Beam) returns
  `half4(toSrgb(rgb) * a, a)`.
- **The P3 quirk.** Upstream parses hex colors into Display-P3 linear values but draws on a plain
  sRGB canvas, so colors show slightly desaturated (greens most). To match a cover, apply
  `srgbToP3(lin(c))` (matrix in `gpu/transforms.ts`, `colorMixing.sRGBToP3`) with no conversion back.
  Raw literals in the kit (hue wheels, tints) skip it. OKLab paths: `lin → oklab → mix → rgb → srgbToP3`.
- **Gather filters** accumulate premultiplied taps and unpremultiply at the end; results marked
  `'straight'` get premultiplied in the final pass (Halftone multiplies rgb and alpha separately).
- **Overlays blend sRGB-encoded values**, so an overlay variant of linear math needs alpha
  correction: VignetteOverlay uses `1 - toSrgb(1 - a)` to land within 2/255 of the linear vignette.

## Shape effects (`role` custom, "Shape Effects")

They read a child *shape* and often a signed distance that fframes cannot provide. Two options:
estimate the field from the alpha of `uSrc` (Heatmap samples alpha at 3 jittered scales), or draw
the default shape analytically (Nebula's `sphere3D`: field `.x = -h`, `.w = 1.2 - h`, miss
`.w = 1.61`, normal from forward differences of `.w`). Mind hidden defaults: Heatmap's default
shape is a sphere, whose interior field is a chord, not a 2D distance.

## Traps

- A compile error is logged once and the layer is skipped (a black or transparent frame). Always
  `--check` first.
- `half` precision: do math in `float`, convert to `half4` only on return.
- Large coordinates in `sin` hashes band on Metal: hash `floor(coord)` or small UVs, never raw
  `coord * 1000`.
- Loops: SkSL needs constant bounds and caps total unrolled work; keep fbm octaves ≤ 8 and
  blur taps ≤ ~64.
- Return premultiplied color: `half4(rgb * a, a)`.
- Skia rejects division by a literal zero at compile time, even in a branch that never runs.
- Burst-gated effects (Glitch, VHS) can look idle at 1 s: judge them with `strip`.
- Wipe covers show what remains as a checkerboard and the wiped area as black; it is easy to read
  them inverted.
- `--only` takes a comma separated list: `--only Aurora,Plasma` (not space separated).
- `iResolution` is the `<image>` size, not the video size: an effect drawn into a 400 px box sees a
  400 px canvas, so express sizes in uv or as a fraction of `iResolution.y`.
