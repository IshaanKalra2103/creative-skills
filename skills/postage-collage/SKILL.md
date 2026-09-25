---
name: postage-collage
description: Design a set of original postage stamps and lay them out as a collage page in plain HTML/CSS, with no build step. Ten stamp families taken from contemporary "editorial stamp" design: old-master painting with yellow dots and a serif, a portrait cut into blue/black/cream pixel tiles, joined botanical-plate strips, one giant condensed word with leader-line labels, a narrow painting slot, a Swiss-Japanese pair (blue panel, moon, engraved hand, red sun, vertical kanji), a grungy street-label ticket with katakana, QR and barcodes, green duotone panels with an extended wordmark, a red duotone poster, and a red-circle photo collage. Real CSS perforations, paper grain, postmarks, masking tape, a PAR AVION label, a colour-field grid, hover lift and a click-to-inspect zoom. Includes Wikimedia Commons public-domain image fetch + print treatment, a reference-reel frame extractor and a screenshot QA script. Use when the user wants postage stamps, a stamp series or sheet, philatelic / vintage-stamp / "stamp design" posters, a stamp collage or moodboard page, perforated-edge cards, or hands over a reel or screenshots of stamp designs and says "make these" or "design something like this".
---

# Postage collage

![The Long Post: the example page](assets/the-long-post.jpg)

![Every stamp in the zoom view](assets/stamps.jpg)

| path | what |
|---|---|
| `assets/stamp.css` | The system: tokens, colour-field board, stamp/paper/face, perforation mask, grain, speckle, icon sizing, collage extras (tape, postmarks), zoom view, entrance. Plus the ten `.f-<family>` blocks |
| `assets/stamp.js` | Icon sprite + postmark (text from `window.POSTMARK`), seeded barcodes and QR blocks, pixel-fragment grids, entrance, zoom view with ←/→/esc. URL: `?z=N` opens stamp N, `?still` skips the entrance |
| `template/shell.html` | Page: fonts, masthead (title, A–J index, PAR AVION, postmark), colophon. Stamps go at `<!-- @STAMPS -->` |
| `template/families/<name>.html` | One tile + stamp per family, filled with working example content |
| `references/families.md` | **Read before designing.** Each family's parts, sizes, the image it needs, its treatment, and the copy rules |
| `scripts/new.sh <dest> [family …]` | Scaffold a page (default: all ten). Copies the runtime, example images and `recipes.json` so it renders at once. Warns if the grid will have a gap |
| `scripts/images.py search\|fetch\|prep\|sheet` | Wikimedia Commons search, fetch the sources in `recipes.json`, crop + grain into `assets/`, contact sheet. `uv run` it |
| `scripts/ref-frames.sh <video> <out>` | Unique frames + a labelled contact sheet from a reference reel |
| `scripts/shot.sh <page> [out]` | `desktop.png` (and @2x), `phone.png`, `stamps.png` (every stamp in the zoom view) |
| `scripts/sync.sh` | After editing `assets/stamp.css`/`stamp.js`, copy them into every example |
| `examples/the-long-post/` | The finished set: 10 stamps, 12 papers, recipes and treated images |

## Workflow

1. **References.** If the user hands over a reel: `scripts/ref-frames.sh reel.mp4 /tmp/ref`, then read `sheet.png`.
   Reels loop, so keep the first run of unique frames. Then Read 2–3 frames at full size before designing. Map each reference to a family in `references/families.md`.
   A reference that fits no family: build it as a new `.f-<name>` block in the same grammar and add it to the table.
2. **Concept.** Pick one fictional issuer and series (name, tagline, year) and a theme that links the stamps. Choose 6–12 families and give each
   one subject and one line of copy. **Design originals, don't clone**: borrow the grammar, never the copy, and never a real institution's name.
3. **Images.** Choose public-domain works that fit each family's "image wants" column. Put their Commons titles in `recipes.json` → `sources`, and crops and modes
   in `recipes` → `images.py fetch <page>` → `images.py prep <page>` → `images.py sheet <page>`, then Read the sheet.
   The user's own photos go in `assets/raw/` and use the same recipes.
4. **Scaffold**: `scripts/new.sh <dest> museum pixel … `. Order matters. Tiles flow into a 4-column grid (`.wide` = 2 cells),
   and `grid-auto-flow:dense` backfills. Aim for a multiple of 4 cells, counting the masthead (2) and colophon (1).
5. **Write each stamp**: swap the image, the inline `object-position`, the headline, the denomination, the micro-copy and the facts. Then `window.POSTMARK`, the masthead index and the
   colophon credits. Look up every fact you print (painting date, size, museum coordinates, event date).
6. **QA loop**: `scripts/shot.sh <dest>/index.html`, Read `desktop.png`, then `stamps.png`, then crops of `desktop@2x.png` for anything
   suspicious. Fix and repeat. Nearly every real fix came from the per-stamp view, not from reading code.

## The grammar (what makes these read as stamps)

- **Perforated edge + paper margin**: the face never touches the perforation.
- **Denomination** top corner: a big numeral, a superscript ¢, and a tracked caps line (`U.S. POSTAGE`, `WORLD POST`, `POSTES`).
- **Stacked micro-copy** in 2–4 corners: 3–6 one-word mono caps lines closed with a `—`. This does most of the "designed" work.
- **One human line**: an italic serif aphorism or a bold grotesk slogan.
- **Icon kit**: globe, crosshair, ✦ sparkle, barcode, serial number, coordinates, postmark. Use 2–4 per stamp, never all of them.
- **Treated imagery**: grain, crushed contrast, or a duotone. Never an untouched photo.
- **Flat saturated fields** (red `#cf1020`, green `#0b8043`, black, warm cream). The stamp carries the shadow, the field stays flat.

## System rules

- **Scale-free stamps.** Tiles are `container-type:size`; each `.stamp` is `container-type:inline-size`. `--w` is in the tile's cqw, and
  *everything inside* is in the stamp's cqw. The same DOM renders identically in the collage, on a phone and full-screen. Never use px inside a stamp.
- **DOM**: `figure.stamp(--w,--ar,--rot) > .paper(--r hole radius, --m margin, --pc paper colour) > .face(--fc) > absolute parts`.
  Joined strips = several `.paper`s touching; separate stamps = a 3% gap.
- **Perforation mask** = tiled holes ∪ solid rect inset by **exactly `--r`**. Insetting by `r + margin` (e.g. `content-box`) lets the
  second row of holes show through as a faint dashed line once the margin is over ~1.1 r. `--T ≈ 3.1 r` is the hole pitch.
- A mask kills `box-shadow`, so the shadow is `filter: drop-shadow()` ×2 on the parent `.stamp`.
- **Duotones are CSS, not files**: bw + `multiply` over red = red duotone; bw + `luminosity` over dark green = green duotone; an engraving or
  fresco + `multiply` onto blue = cyanotype (the ground vanishes); a woodcut + `multiply` over a red disc = a sun showing through the sky. So one bw
  file serves every palette, and `images.py` only crops and grains.
- **Speckle mask** (`--speckle`) on big display words for worn print. It clips to the element box, so use `line-height ≥ 1` or descenders vanish.
- Barcodes and QRs come from a seeded RNG (`data-seed`), so they're stable across reloads. `data-vertical` rotates a barcode.

## Image lessons

- Dark oil paintings vanish at stamp size. Add `brightness(1.3+)` inline, and crop to keep the *object* (the globe, the letter), not just the figure.
- Photos that are mostly black sky make dead black rectangles in the condensed and circle families. Those need **high-key** photos (fog, beach, sky).
  Inverting doesn't rescue them, because the panel edge disappears.
- Planet photos have black surrounds, so use `clip-path:circle()`, not `border-radius`.
- Commons: space requests (the script waits 4 s and backs off on 429), store known-good `File:` titles, and use the API's thumbnail at 1800 px.
- Public-domain art and NASA imagery are safe to publish. The user's own or found photos: fine for private use; clear the rights before publishing.

## Delivering

Open the page (`open <dest>/index.html`). It runs from `file://`, but fonts come from Google Fonts. Tell the user which stamps are weakest,
and mention `?z=N` for linking or screenshotting a single stamp. The layout is a colour-field grid. If they want a loose overlapping pile, drop the tile
backgrounds, give tiles negative margins and larger `--dx/--dy/--rot`, and re-check `desktop.png` for stamps hidden under other stamps.
