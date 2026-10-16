# Gotchas (each one cost real time)

## Loading and file://
- **ES modules from local files don't load under file://** (CORS: origin "null"). Keep every local file a classic
  `<script src>` and attach things to `window` (`window.DX`, `window.DXC`). The only module is the bootstrap
  `<script type="module">`, and it imports only CDN URLs through an import map.
- **`fetch("weights.json")` fails under file://** for the same reason. Ship data as a JS file:
  `window.MODEL = {...};`.
- **Pin exact CDN versions** (`three@0.160.0`, and addons from the *same* version path:
  `three@0.160.0/examples/jsm/...`). Mixing versions gives silent shader or `CSS2DRenderer` breakage. Check each
  addon URL returns 200 before relying on it.
- **Fonts must load before canvas text is drawn**: `await document.fonts.load('600 40px "Outfit"')` for each
  weight (with a 3.5 s timeout), or textures get baked in the fallback font and never update.

## Rendering
- **MSAA at DPR 2 halves the frame rate** (an M1 Pro went 45 → 97 fps at 1512×945@2 without it). The engine uses
  `samples: PR >= 1.75 ? 0 : 4`; at retina density the pixels are small enough not to need it.
- Adaptive resolution: average fps over 2 s; if < 52, step the pixel ratio down by 0.25 (min 1), then wait 4 s
  before re-checking (otherwise it oscillates). Cap DPR at 2.
- **Bloom eats text and true colours.** Threshold 0.9; only HDR (`toneMapped:false`, colour > 1) materials glow.
  A colour swatch that *is* data (a fruit's RGB, an output colour) must stay ≤ 0.85 or it blooms to white.
- **Glass gets milky fast.** Cases around value grids need opacity ≈ 0.05 and envMapIntensity ≈ 0.45. At 0.16
  with clearcoat, the numbers behind disappear. Tinted lens discs: opacity ≤ 0.22, emissive ≈ 0.1.
- Bright steel rods read as white lines across the frame. Use darker steel (0x5d636b, rough 0.48) for long rods.
- Text planes inside bar displays must sit in front of the tallest bar (`z = 2.9·depth`), or deep bars poke through the numbers.
- InstancedMesh colour needs `setColorAt` before first render, then `instanceColor.needsUpdate = true` after every
  change. A custom emissive-from-instance-colour shader uses `#ifdef USE_INSTANCING_COLOR`.
- Rebuilding `TubeGeometry` every frame is expensive. Rebuild beams only when weights or endpoints change.
  Animate flow with a shared time uniform instead.

## Layout and camera
- **The left HUD hides the first part of wide stations on 1280-px screens.** Give every focus a `fit` width; the
  engine backs the camera off and slides it so that width fits the free strip. Check at 1280×800 every time.
- Brass support posts in front of a display slice through it in close-ups. Put posts at the back.
- Long inputs (9–10 tokens) make boards crowded and beams cluttered. Scale the cell pitch by n
  (`pa = min(0.6, 3/n)`), shrink labels to fit the column width, and pull the camera back by ~11% per item over 6.
- Pill labels pile up when every station's labels are live. Scope them with `stages`, hide them beyond ~34 units,
  and add `cond` for mode-specific ones. 3–5 per station.
- `camera.setViewOffset` for the optical-centre shift must be re-applied on resize, and `updateProjectionMatrix` after it.
- Any click on the canvas should stop the tour; otherwise the user fights the camera.

## Browser automation
- **Never drive a shared Playwright/MCP browser** for screenshots: other agents or the user hijack its tabs and
  your viewport. Use a private headless instance: `uv run --no-project --with playwright python scripts/shoot.py`
  launches `channel="chrome"` (your installed Google Chrome, no `playwright install` download) with
  `--use-angle=metal --enable-gpu --ignore-gpu-blocklist`. Without those flags headless Chrome falls back to
  SwiftShader (CPU): 5–10 fps and different-looking bloom. shoot.py prints the GPU string; check it says Metal.
- **Headless Chrome's CLI `--screenshot --window-size` clamps the width to ≥ 500 px**, so phone layouts come out
  wrong. Use Playwright's viewport emulation (shoot.py does), or load the page in a 390-px iframe inside a wider page.
- Measure fps with rAF counting *after* the intro settles. The first second includes shader compilation.
- Wait for `window.__ready` and then ~6 s per station (camera fly 2–2.6 s plus intro 1–3 s) before screenshots.

## Recording
- Real-time screen capture drops frames and jitters. Use the deterministic path: `?record&fps=30` disables the
  RAF loop, and `window.__frame(i)` steps the simulation by exactly 1/fps. Everything time-based must read the
  engine's `dt`/`S.time`, never `performance.now()`, or record mode desyncs.
- **CSS transitions run on wall-clock time**, so mid-transition panels show up in random states. The engine
  disables transitions under `body.record`, and setTimeout-based fades are skipped in record mode.
- Film grain inflates file size. Record with grain ×0.3 and CRF 23–24: 77 s of 1080p30 went from 39 MB (CRF 21) to 24 MB (CRF 24).
- `preserveDrawingBuffer: true` only in record mode (it costs performance otherwise).
- ffmpeg exiting early shows up as BrokenPipe in the capture loop. Usually the output directory doesn't exist
  (record.py now creates it).
- Use a seeded RNG for any sampling in the tour (decoding demos), so every recording is identical.

## Teaching
- If a toggle silently does nothing, viewers assume the machine is broken. Every lever must visibly change a
  number *and* the copy must say why. Test each value once.
- Don't type numbers into the copy. Format them from `R`; numbers that drift out of sync after one toggle are
  the most common bug.
- "Broken on purpose" states (a causal model under a bidirectional mask) are gold, but the copy must say the
  model was trained differently, or viewers learn that the mask "makes predictions worse" as a law.
