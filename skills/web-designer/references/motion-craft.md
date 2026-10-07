# Motion craft: pieces that move

The sites people screenshot in 2026 are not static pages. They are a few
pieces of **living craft**: an object that turns under the pointer, an image
dissolving into a dot matrix, cards whose line drawings draw themselves, a
stack of folders that fans as you scroll, an engraved landscape where one
train is moving. Each is built around **one visual technique** done
exceptionally, and each works as a hero, a card, a menu, a modal or a footer,
on any product.

This file is the recipe book. Use it in Step 2 (every direction names its
motion idea) and Step 4 (build it). Every piece still obeys motion.md:
content visible without JavaScript, reduced motion respected, transforms and
opacity only for anything per-frame.

## 1. Choose one technique per piece

| Technique | What it is | Good for | Build with |
|---|---|---|---|
| **Dot matrix / dither** | an object, a photo or text rendered as a grid of dots or Bayer-dithered pixels, shimmering, assembling, reacting to the pointer | infra, AI, crypto, data, anything abstract | `<canvas>` 2D: sample a source (an offscreen canvas with a shape, text or image) on a grid, draw dots sized by brightness; animate the source |
| ↳ *ASCII that reads* | render the scene into a small render target (2× supersampled), read it back with `readRenderTargetPixels`, map brightness to a ramp, and add **edge glyphs** (`_ \| / \`) chosen from the coverage gradient, or every object becomes a blob. Use a colour channel as a per-cell mask to give one part its own ramp or colour. Separate thin parts, contrast their tones, raise the camera 15 to 25°. On a light ground invert the ramp (dark surface → dense glyph) | | |
| ↳ *3D in dots* | for a 3D shape, don't paint shaded sprites back to front (each sprite's dark rim covers its neighbour's highlight): rasterise spheres along the shape into a small brightness grid with a depth buffer, then draw one dot per cell sized by brightness, ordered dither on faint edges | | |
| **ASCII render** | a 3D object or a photo drawn in characters | dev tools, AI agents, retro-tech | three.js `AsciiEffect` (addons) over a lit mesh, or canvas: brightness → a character ramp `" .:-=+*#%@"` |
| **3D object hero** | one specific object (a device, a jelly sweet, a glass orb, a creature) lit softly, turning slowly, tilting with the pointer | product launches, consumer apps, brands | three.js: `MeshPhysicalMaterial` (transmission, clearcoat, sheen), an environment map or `RoomEnvironment`, pointer → eased rotation; or a pre-rendered image sequence |
| **Engraving / etching** | a scene drawn in hatched lines like an old banknote or a toile, one ink on paper, with one small thing moving (smoke, a train, a boat, clouds) | travel, heritage, finance, editorial, luxury | generated image in an engraving style (with the user's consent), or SVG line art; motion on a separate layer (SVG path, CSS keyframes) |
| **Line-art diagrams** | thin geometric drawings (concentric rings, lattices, Venn rings, orbits) on cards, drawing themselves and rotating slowly | feature cards, pricing, onboarding steps | SVG: `stroke-dasharray` / `stroke-dashoffset` draw-on, `transform: rotate` loops, `pathLength="1"` for easy maths |
| **3D cards** | cards with depth: perspective tilt following the pointer, a lit edge, layers at different depths, a flip | features, team, products, testimonials | CSS `perspective` + `transform: rotateX/rotateY` from pointer position, `transform-style: preserve-3d` for layered content |
| **Stacked folders / sheets** | tabbed panels stacked like folders that spread, slide out or re-order as you scroll | process steps, features, case studies | `position: sticky` stack with increasing `top`, or scroll-driven `animation-timeline: view()` with a JS fallback |
| **Glass over image** | a frosted menu, card or modal floating over a strong photograph or 3D scene | navigation, sign-up modals | `backdrop-filter: blur() saturate()` on a translucent ground, a 1px light border; only over something worth blurring |
| **Kinetic type** | huge numerals ticking (a countdown, a counter), words assembling letter by letter, text on a path | launches, waitlists, stats, events | `font-variant-numeric: tabular-nums`, per-character spans with staggered transforms, `requestAnimationFrame` for counters |
| **Particle object** | thousands of points forming a shape that breathes, scatters on hover and re-forms | AI, audio, science, "the core" | three.js `Points` with a custom shader, or canvas 2D with a few thousand particles and spring forces |

Pick the technique from the concept, not from this table's order. One
technique per piece; two techniques in one hero is noise.

### three.js notes that save an hour

- **Imports without a build step:** an import map, then ES modules.
  ```html
  <script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.170/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.170/examples/jsm/"}}</script>
  <script type="module">import * as THREE from "three"; import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";</script>
  ```
- **Glass (transmission) only refracts what is in the scene.** DOM text behind a
  transparent canvas will not show through: make the canvas opaque with its
  clear colour matched to the CSS ground, and put anything the glass should
  bend inside the scene.
- **Object beside a text column:** shift the framing with
  `camera.setViewOffset(fullW, fullH, offsetX, 0, w, h)` instead of moving the
  object, so it stays centred on its own axis while sitting off-centre on screen.
- **3D CSS gotchas:** `overflow: hidden` on a parent flattens
  `transform-style: preserve-3d`; 1px SVG strokes (especially with
  `vector-effect: non-scaling-stroke`) break up under 3D transforms, so use
  1.5px or more on tilted drawings. A "lit edge" is a radial gradient masked
  to a 1px border that follows the pointer, not a glow.
- **Studio light, not CG light:** `RoomEnvironment` gives rectangular
  highlights; for round, soft ones add a small `HDR`/`EXR` studio map or two
  large `RectAreaLight`s, plus a contact shadow (a blurred dark ellipse on a
  plane) under the object.
- **The poster comes from the scene:** render the resting frame with the text
  hidden (a `?poster` flag), one crop for wide screens and one for phones, and
  use it for no-JS, reduced motion and WebGL failure.

## 2. Components count

Not every brief is a full page. The skill can design **one component** to
award level: a hero, a set of feature cards, a mega-menu, a footer, an
onboarding modal, a pricing block, an FAQ, a sign-up card, a 404. Treat it
like a page: three directions, real content, scanned, matrixed, critiqued.
Build it as a self-contained `component.html` the user can drop in, with its
tokens at the top.

## 3. Craft rules for motion pieces

- **One loop, one idea.** The motion explains the product (the core
  connecting, the notes assembling, the folders opening onto the work).
- **Slow is premium.** Ambient loops take 6 to 20 seconds; interactions answer
  in 120 to 300 ms. Ease with springs or strong ease-out, never linear (except
  rotation and marquees).
- **The pointer is a material.** Tilt, parallax and attraction are eased
  (lerp 0.08 to 0.15 per frame), clamped (±8 to 12 degrees), and return to
  rest when the pointer leaves.
- **A still frame must be beautiful.** The poster, the reduced-motion state
  and a screenshot all show the resting composition; design that first.
- **Performance:** cap device pixel ratio for canvas and WebGL at 2; pause
  when off-screen (`IntersectionObserver`) and when the tab is hidden; keep
  particle counts under about 5,000 on canvas 2D; no layout reads inside
  `requestAnimationFrame`.
- **Reduced motion:** render one still frame and stop; tilt and parallax off.
- **No JavaScript:** a static image or the poster stands in (an `<img>` inside
  the canvas container, hidden once the canvas starts).
- **Libraries:** three.js from a CDN (`https://cdn.jsdelivr.net/npm/three@0.170/build/three.module.js`
  and its `examples/jsm/` addons) when there is no build step; in a project,
  install it. Nothing else is needed for anything in this file.

## 4. Proving it moves

- `filmstrip.mjs` freezes CSS and Web Animations at exact moments; add `--live`
  for canvas and WebGL.
- `record.mjs` records a real loop (`loop.mp4`, `loop.webm`, `poster.jpg`):
  `node <skill>/scripts/record.mjs piece.html --seconds 8 --move` for
  pointer-reactive pieces, `--scroll 1400` for scroll-driven ones,
  `--selector` to crop to the component. Give the critic the poster and the
  filmstrip; give the user the loop.
- On a page that shows motion work, use `<video autoplay muted loop playsinline
  poster="poster.jpg">` with the MP4, and pause it for reduced motion.

## 5. Its own slop

Motion has its own defaults: fade-up on every block, a cursor follower, a
marquee of logos, a generic glowing gradient orb, Lottie confetti, parallax on
everything. None of those is a technique from §1, and none of them is born
from a concept. If the motion would fit any product, it is decoration.
