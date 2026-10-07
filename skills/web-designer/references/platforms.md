# Platforms

Most designs are checked on one MacBook in one browser. Most visitors are
not on one: Windows has around 70% of desktops, Chrome and Edge most of
them, at 125% or 150% display scaling, with classic scrollbars; phones are
half the traffic; a slice of users run Linux, Firefox, High Contrast or
reduced motion. `matrix.mjs` puts the page on each of these.

## What changes, and what to do

### Fonts
- `system-ui` is SF Pro on Apple, **Segoe UI** on Windows, Roboto on
  Android, and **Ubuntu / Cantarell / DejaVu Sans** on Linux. Each has
  different widths: a label that fits on a Mac can wrap or clip on Windows,
  and DejaVu Sans is much wider than SF.
- `-apple-system`, `BlinkMacSystemFont`, `ui-monospace`, `ui-serif` and
  `ui-rounded` exist only on Apple platforms. A stack that starts with them
  falls through to whatever is next on Windows and Linux.
- Helvetica and Helvetica Neue do not exist on Windows (you get Arial) or
  Linux (Liberation Sans or DejaVu).
- **Do:** load your chosen faces as web fonts, with metric-matched fallbacks
  (type.md §4), so every OS sees the same type. Treat the system stack as a
  fallback, and check what it becomes in the matrix notes.

### Scrollbars
- Windows and most Linux setups use **classic scrollbars that take up
  width** (about 15 to 17px). macOS hides them by default.
- `100vw` includes the scrollbar, so `width: 100vw` causes sideways
  scrolling on Windows and Linux **[matrix]**. Use `100%`, or
  `width: 100dvw` only inside an `overflow-x: clip` parent.
- Layout shift when a page becomes scrollable: `scrollbar-gutter: stable` on
  `html`.
- Dark pages: `color-scheme: dark` so scrollbars and form controls are dark
  too; optionally `scrollbar-color` for a tinted bar.

### Display scaling
- 1920×1080 at 125% gives a **1536×864 CSS viewport at DPR 1.25**; at 150%,
  **1280×720 at DPR 1.5**. These are the most common desktop viewports, and
  many designs only test 1440 and 1920.
- Fractional DPR blurs half-pixel borders and thin icon strokes: use whole
  pixels (1px hairlines, not 0.5px), and SVG icons with strokes that are
  whole numbers at 1x.
- Short viewports (≈700px tall after browser chrome): the first screen must
  still hold the headline and the action.

### High Contrast (forced colours)
- Windows users with contrast themes see system colours; backgrounds and
  box-shadows are removed. Give every control a border or outline (transparent
  is fine) **[matrix]**. color.md §6.

### Browsers
- **Firefox**: supports most modern CSS, but check `:has()` heavy layouts,
  `backdrop-filter` performance, newer features such as scroll-driven
  animations (support lags; always feature-detect), and form control styling.
- **Safari / WebKit**: `100vh` toolbars (use `svh`/`dvh`), date and select
  controls, `position: sticky` inside overflow containers, older Safari
  versions in the wild on old iPhones. Test the iPhone pass.
- **Edge** is Chromium; it behaves like Chrome but is the default browser on
  every Windows machine.

### Input and motion
- Touch has no hover; keyboard users need focus; screen readers need names
  **[scan]**.
- Reduced motion is a system setting many people turn on to stop nausea
  **[matrix]**.
- `Ctrl` on Windows and Linux, `⌘` on Mac: show the right one in shortcut
  hints (`navigator.platform`/`userAgentData`), and support both.

### Text length
- German, Finnish and Dutch run 30 to 40% longer than English; the matrix's
  `l10n` pass expands every word to find the buttons and tabs that break.
- Always allow wrapping or a deliberate truncation with the full text
  available; never fixed-width labels.

## What the matrix cannot show

Glyph shapes (the stand-ins match widths, not looks), ClearType rendering,
real GPU performance, real touch latency, screen readers. Say so in the
report when they matter.
