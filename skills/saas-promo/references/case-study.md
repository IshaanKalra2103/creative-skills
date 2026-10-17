# Case study: rebuilding the bolt.new weekend promo

The engine started as a frame-for-frame fframes rebuild of a 27.7 s bolt.new promo ("Bolt
is free this weekend, and you could win $10k"), then each shot was turned into a
parametric scene kind. `template/examples/bolt-weekend/` is that film on the generic
engine; `reference.jpg` shows frames from the original for comparison.

## How it was measured

1. **Cuts**: `ffmpeg select='gt(scene,0.2)'` for candidates, then single-frame strips
   around each: 0, 100, 147, 181, 227, 272, 369, 450, 492, 562 (25 fps).
2. **Type**: overlay font fitting on settled frames (`fontcmp`): Inter beat SF Pro, Geist
   (tailed `l`), DM Sans and others. Ink-box tracking per frame (`inkbox`) gave word arrival
   frames, line rise and the camera scale curve. A weight check by stem width and ink
   height showed the reference is lighter and more open than Inter at the size its word
   widths imply → glyphs drawn at 0.90-0.96 of the layout size, tracked out to keep each
   word's advance.
3. **Backdrop**: three models were tried. A cubic-edge sheet + bottom-left light ramp +
   navy top + blob (17 numbers) fitted per frame with least squares on 160x90 frames
   got 5-10/255 mean error on frames where the gradient is visible. Frames behind windows
   and cards could not be fitted (robust masking kept card pixels and invented blobs), so
   those scenes borrow neighbouring framings; the card wall adds a palette-tinted bloom.
4. **Dot screen**: an FFT on flat backdrop patches found two diagonal peaks, a lattice of
   4.45 px pitch, i.e. `cos(ax)·cos(ay)` (not the product of diagonals), present in the
   caption and intro shots and absent in "New" and the end card.
5. **UI**: the Bolt home window, the editor and the generated sneaker site were rebuilt as
   HTML and rendered to PNG layers with Playwright; card thumbnails likewise. The
   MAKE SOME NOISE poster is an original collage, not the reference's art.

## Lessons (each cost a debug round)

- `svgr!` silently drops a numeric `font-weight={u16}` and renders 400. Pass a string.
- `MediaDirectory::read_folder` is not recursive and keys files by name: assets must be
  flat files in `assets/` (`window_hero.png`, not `window/hero.png`).
- A per-word affine approximation of a 3D yaw (`kit::Persp::m`) is indistinguishable from
  true perspective for words and cards, and keeps everything SVG.
- Blur and glass are one SVG filter graph per word (dilate, ring, specular lighting,
  halo, merge); Skia runs it on the GPU, so 30 filtered words per frame are cheap.
- The reference draws the cursor above the letterbox bars at the end of the wall: scenes
  can draw above the bars through `overlay()`.
- Judge every render against the reference frame side by side (`tools/cmp.sh`), whole
  frame, not only the element you changed; mean-difference per scene catches what sheets
  miss (the card wall's backdrop was far too dark until measured).
