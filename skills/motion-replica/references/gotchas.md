# Gotchas

Each of these cost a render cycle or a user complaint while building `examples/cero-grid`.

## Rendering

- **Headless Chromium is software GL by default.** Playwright's headless shell reports
  "SwiftShader". WebGL still works but is slow, and transmission or glass materials can look
  wrong. `render.py` launches with `--enable-gpu --ignore-gpu-blocklist` (plus `--use-angle=metal`
  on macOS). Run `render.py page.html --probe` on any new machine. On Linux without a GPU,
  expect software GL: keep materials simple and budget more time.
- **`preserveDrawingBuffer: true`** on every WebGLRenderer, or screenshots can capture a
  cleared canvas.
- **Fonts must be loaded before frame 0.** Use Google Fonts `display=block` and
  `document.fonts.load()` every weight the page uses, including weights only used in canvas
  textures (the coin glyphs used Inter 800/900). Otherwise the first frames render in a
  fallback font.
- **The container duration can be longer than the video.** An audio track that runs past
  the last frame inflates `format=duration`. Use frames ÷ fps for the true length, which
  `study.py` prints, and set `window.DURATION` to it.
- **Homebrew ffmpeg may lack `drawtext`.** Don't rely on burned-in labels; the scripts use
  padded tiles and filenames with timestamps instead.

## file:// pages

- **ES-module imports of local files are blocked** (CORS on `file://`). Keep local code in
  classic `<script>`s that define globals or factories (`replica.js`, `assets3d.js`), and
  import only from the CDN import map inside the inline module. Top-level `const`s from
  classic scripts are visible to the module.
- **`fetch()` of local binaries is blocked too.** Embed GLBs as base64 JS (`prep-glb.sh`) and
  fonts for 3D type as JS (`font2typeface.py`).

## Assets

- **`gltf-transform optimize` merges materials by default** (`--palette`, `--join`) and the
  merged ones lose their names, so `Glass` came back unnamed and the repaint missed it.
  `prep-glb.sh` turns those passes off.
- **Wrong-shaped model ≠ fixable.** An open-top car with a lofted roof still read as a lid.
  Swap to a model with the right silhouette.
- **A pillow shape reads flat head-on.** The pouch needed a rounder bulge profile
  (`sin^0.72`), a thicker body, *and* shading baked into the texture before it stopped
  looking like a card.
- **Canvas `destination-out` with a transparent `fillStyle` erases nothing.** Set an opaque
  fill before cutting the zig-zag crimp mask.
- **Extruded text material groups are `[caps, sides]`.** A single material makes 3D digits
  read as flat stickers.
- **Coloured coins with high metalness mirror the environment** and go pale. Keep metalness
  about 0.1 for painted coins.
- **Emoji in canvas textures** depend on the OS emoji font ("Apple Color Emoji" on macOS).
  Renders on Linux will differ; replace with a drawn glyph if that matters.

## Timeline

- **Every branch sets everything.** A ticket stayed visible into the next scene because the
  MEGAPOT branch never hid it. Out-of-order `--stills` exposes this quickly.
- **Counters don't smear.** A continuously interpolated odometer looks like a slot machine.
  Real UIs step (about 8 values/s) and roll each digit briefly (`Odo.flow`).
- **Use the reference's loop periods exactly** (to the frame, from `study.py`). A cell that's
  one frame off drifts visibly against its neighbours over a 10 s grid.
- **CSS vs three.js rotation**: different axis order and y direction. Use `A3.cssRot`.
- **Blur is per layer.** Depth of field means separate canvases (and DOM layers) blurred by
  different amounts, not one blur over everything.
