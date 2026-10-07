---
name: fframes-fx
description: >-
  Make videos in code with fframes (Rust, SVG scenes, Skia GPU, ffmpeg) plus a library of 44 GPU
  shader effects ported to SkSL from shader-effects-inc/shaders (shaders.com): aurora, mesh and
  flowing gradients, god rays, lens flare, plasma, nebula, film grain, light leaks, vignette,
  scratches, halftone, dither, VHS, CRT, glitch, chromatic aberration, heatmap/thermal, wipes and
  dissolves, noise and pattern fields. Use when the user wants a video, motion graphic, title card
  or kinetic-type piece rendered programmatically with fframes, wants shader effects or a
  "shaders.com look" inside an fframes video, or wants another shader-effects component ported to
  fframes SkSL.
---

# fframes-fx

fframes renders video from Rust: every frame is an SVG tree built with `svgr!`, scenes split the
timeline, Skia draws it on the GPU and ffmpeg encodes. GPU shaders run as layers through
`fframes::Shader`. This skill adds a verified effect library, a loader that applies each effect's
documented defaults, a gallery that renders every effect next to its upstream cover, and the
lessons from building a full 21 s film with it.

```
fframes-fx/
  SKILL.md                 this file
  shaders/*.sksl           44 effects, each with a `// key: value` header (kind, blend, uniforms + defaults)
  templates/fx.rs          drop-in loader: Fx::parse(header) → draw(frame, overrides) / filter(frame, img, ..)
  references/effects.md    catalog of every effect: what it looks like, uniforms, defaults, caveats
  references/porting.md    how to port another shader-effects component (conventions, TypeGPU→SkSL, traps)
  references/fframes/      upstream fframes docs: api.md (svgr!, scenes, text, media, shaders), design.md, audio.md
  gallery/                 fframes project: every effect as a 2 s scene named after it (+ --check)
  scripts/compare.sh       upstream cover | port, side by side
  scripts/catalog.py       rebuilds references/effects.md from the headers
```

Built and tested by making a 21 s film with it (`assets/pulse-frames.jpg`): kinetic type, a
thermal figure, a pixel-icon orbit, a letter scatter and a synthesized score. Every gotcha below
came from that film.

Porting needs the upstream source next to the skill (the gallery and `compare.sh` read its covers):
`git clone --depth 1 https://github.com/shader-effects-inc/shaders .upstream/shader-effects`.
Using the 44 ported effects needs nothing extra.

## 1. Set up a video

```bash
cargo install --locked cargo-fframes
cargo fframes new my-video --template multi-scene --format landscape --fps 24 --yes
cd my-video && cargo build --release      # first build ~1-2 min: prebuilt Skia + ffmpeg
R() { cargo run --release -- "$@"; }      # zsh: a function, not a variable
```

Non-16:9 sizes (e.g. 1440x1080 for 4:3) are just `WIDTH`/`HEIGHT` constants. The project uses the
Skia Metal backend by default, which is what runs shaders. Read `references/fframes/api.md` before
writing code and `references/fframes/design.md` before designing.

## 2. Use an effect

1. Find it in `references/effects.md` (or look at `gallery/contact.png`).
2. Copy `shaders/<Name>.sksl` into `src/shaders/` and `templates/fx.rs` into `src/`.
3. Load once, draw per frame with the header defaults, override by name:

```rust
mod fx;
use std::sync::LazyLock;
static AURORA: LazyLock<fx::Fx> = LazyLock::new(|| fx::Fx::parse("Aurora.sksl", include_str!("shaders/Aurora.sksl")).unwrap());

let layer = AURORA.draw(&frame, &[("uSpeed", fx::Uniform::Float(2.0)), ("uColorB", fx::Uniform::Color(Color::hex("#ffd36e")))]);
fframes::svgr!(<image href={layer.href()} x="0" y="0" width="1920" height="1080" />)
```

The `<image>` box sets `iResolution`; `iTime` is seconds into the scene.

### How each kind composites

fframes cannot render an SVG subtree into a texture, and a shader's output cannot be fed into
another shader (`draw()` returns a placeholder the renderer swaps in at draw time). So effects are
layered, not chained:

| kind | use | recipe |
|---|---|---|
| `generator` | backgrounds, light, fills | full-frame `<image>`; to fill a shape put the `<image>` inside `<g clip-path="url(#shape)">` |
| `overlay` | grain, light leak, vignette, scratches over SVG | `<g style="mix-blend-mode:overlay">` (use the header's `blend:`) around the `<image>`, on top of the scene |
| `filter` | treat a photo or video frame | `FX.filter(&frame, &img, w, h, &[])` with `ctx.get_image(..)` or `frame.get_synced_video_frame(..).into_image()` |
| `mask` | wipes and dissolves between scenes | drive `uProgress` 0→1 over the cut; draw the layer over the outgoing scene (`Overlap::Previous(0.4)`) or use it as `<mask>` content |

Need a filter over SVG content? Either use its `Overlay` variant, bake the SVG to a PNG first
(`R frame Scene@0 -o baked/`, or `rsvg-convert`) and filter the image, or use SVG filters
(next section).

### SVG filters do a lot (Skia supports all primitives)

GaussianBlur, ComponentTransfer, Turbulence, DisplacementMap, ColorMatrix, Composite, Morphology,
lighting. They animate and stay on the GPU. A thermal-camera figure from any white geometry
(gradient-mapped blur, mottled by noise, screened so black stays transparent):

```rust
<filter id="thermal" filterUnits="userSpaceOnUse" x="0" y="0" width="1440" height="1080" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceGraphic" stdDeviation="11" result="soft" />
    <feTurbulence type="fractalNoise" baseFrequency="0.0042 0.006" numOctaves="2" seed={seed} result="noise" />
    <feComposite in="soft" in2="noise" operator="arithmetic" k1="0.5" k2="0.78" k3="0" k4="0" result="heat" />
    <feFlood flood-color="#000000" result="matte" />
    <feComposite in="heat" in2="matte" operator="over" result="flat" />
    <feComponentTransfer in="flat">
        <feFuncR type="table" tableValues="0 0.32 0.8 0.98 1 1" />
        <feFuncG type="table" tableValues="0 0.03 0.17 0.42 0.74 0.97" />
        <feFuncB type="table" tableValues="0 0.03 0.05 0.04 0.2 0.82" />
    </feComponentTransfer>
</filter>
// shapes filled with a vertical white→grey gradient (hotter at the bottom), then:
<g style="mix-blend-mode:screen"><g filter="url(#thermal)">{shapes}</g></g>
```

The shader route for the same look is `Heatmap.sksl` (a filter over an alpha image).

## 3. Gotchas (each one cost a debug round)

- **`svgr!` guesses attribute types.** `result="black"` (any CSS color name) is parsed as a color
  and silently breaks the filter graph. `R inspect` reports it; name results `matte`, `soft`, …
- **`frame.text_width` needs a string that outlives the render.** Per-frame strings (typed
  prefixes) fail the borrow checker; intern them once:
  `fn intern(s: &str) -> &'static str` backed by a `LazyLock<Mutex<HashSet<&'static str>>>` with
  `Box::leak` (bounded: one leak per distinct string).
- **`include_media_dir!` embeds at compile time** and does not notice files added to or removed
  from `media/` until the crate recompiles: `touch src/lib.rs` after changing `media/`. A deleted
  silent placeholder kept rendering silence until this.
- **Embedded audio is mono.** Put stereo music in a runtime folder:
  `let dir = fframes::MediaDirectory::read_folder("audio")?; let audio = dir.process_media_source()?;`
  `let all = fframes::CombinedMediaProvider::from([&media as &dyn fframes::MediaProvider, &audio]);`
  and pass `media: Some(&all)` in `RenderOptions`. Names resolve in array order (first wins).
- **A blended group inside a parent filter loses its blend.** `<g filter=mblur>` around a
  `mix-blend-mode:screen` group flattens it onto transparent, so screened black becomes an opaque
  box. Put the filter on the geometry inside the blended group.
- **Blur clips to the filter region.** Small round things blurred with the default region turn into
  soft squares; give them `x="-200%" y="-200%" width="500%" height="500%"`.
- **Shader compile errors are logged once and the layer is skipped** (a black or missing layer).
  Compile-check with `fframes_skia_renderer::render::compile_shader(&shader)`, or run the gallery's
  `--check`.
- **Procedural layouts need a real hash.** A xor-multiply `rnd(i, salt)` put "random" letters on two
  straight lines; use SplitMix64 over `(salt << 32 | i)`.
- **Scene lengths:** `Duration::Frames((sec * fps).round())` with cut times snapped to frames, so
  scenes add up exactly to the cue sheet.
- **CLI:** `strip` takes one range (`strip Ring`, `strip 15.9s..19.9s`); address scenes by `#index`
  when looping in zsh (it does not word-split `$vars`).

## 4. Review before saying it's done

1. `R timeline`: structure matches the cue sheet.
2. `R inspect`: zero findings (fonts, glyphs, bad SVG, filter typing).
3. Whole-film contact sheets at ~6 fps from the render (`ffmpeg -vf "fps=6,scale=300:-1,tile=8x4"`),
   read every tile: overlaps, invisible text (dark on a dark vignette), clipped blurs, empty frames.
4. `R frame A@t,B@t` full size for type and detail.
5. `R audio analyze`: about -14 LUFS integrated, true peak below -1 dBTP; `R render` and
   `ffprobe` the result (frames, duration, stereo).

A 1440x1080, 514-frame film with 3-4 shader layers per frame and animated SVG filters renders in
about 75-90 s on Apple Silicon (Metal).

## 5. Port another effect

Read `references/porting.md`, then from `gallery/`:

```bash
cargo run --release -q -- --check --only Name
../scripts/compare.sh Name                 # gallery/compare/Name.png: cover | port
cargo run --release -q -- strip Name -n 6 --only Name
python3 ../scripts/catalog.py              # refresh references/effects.md
```

Port the code, not the cover (covers often use non-default props); the GPU test snapshots in the
upstream repo are the ground truth. About 30 upstream effects are simulations, cursor effects or
multi-pass compute (Boids, Smoke, InkFlow, CursorTrail, ReactionDiffusion, …) and do not map to a
one-pass SkSL layer; say so instead of faking them.

## Credits

Effects ported from [shader-effects-inc/shaders](https://github.com/shader-effects-inc/shaders)
(`935f71a`), MIT, © 2026 Shader Effects Inc. (`LICENSE-shader-effects`). fframes
([dmtrKovalenko/fframes](https://github.com/dmtrKovalenko/fframes), `30b48f3`) and the docs in
`references/fframes/` are MIT, © 2025-2026 Dmitriy Kovalenko (`LICENSE-fframes`). Each `.sksl`
names its upstream source in its `from:` line. The gallery's DM Sans font is SIL OFL 1.1
(`gallery/OFL-DMSans.txt`).
