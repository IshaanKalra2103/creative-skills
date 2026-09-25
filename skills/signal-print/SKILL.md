---
name: signal-print
description: Make a grainy "ops-print" identity: signal orange on carbon and paper, heavy grotesk headlines, monospace spec blocks (KEY: VALUE, [ BRACKETS ], › DOMAIN:), crosshairs, ruler margins, coordinates, barcodes and ©2026 stamps, all with print grain and pressed edges. Two sheets of eight 4:5 plates each. identity.html has rotated tape strips with tickers, a crosshair emblem with a spinning mark, a numbered run log, striped type crossed by a word made of rings, a live terminal, a halftone mark with a cursor loupe, a cobalt night-shift dial and an ID badge. svg-kit.html is an all-SVG asset kit: 16 icons on keylines, a construction drawing of the mark plus lockups, an engineering blueprint, seamless pattern tiles, seals, stickers and rubber stamps, an animated weave diagram, 20 dingbats and live instruments. Clicking any asset downloads it as a standalone .svg. Use when the user wants the orange "agent deployment" / devtool-launch poster look (the Factory droid campaign style), industrial spec-sheet or terminal-poster branding, a signal-orange identity, a poster series or brand sheet for a dev tool or AI product, an SVG icon/asset kit in that style, or hands over grainy orange mono posters and says "make something like this".
---

# Signal print

![Sheet 01: identity studies](assets/identity.jpg)

![Sheet 02: the SVG kit](assets/svg-kit.jpg)

| path | what |
|---|---|
| `examples/loom/identity.html` | Sheet 01: eight plates in HTML/CSS, with canvas for the ring type and the halftone. Plates are sized in `cqw` units, so they scale to any width |
| `examples/loom/svg-kit.html` | Sheet 02: eight plates, each one `<svg viewBox="0 0 400 500">` built by JS helpers. Every asset is a nested `<svg class="a">`, so it can be clicked and downloaded |
| `references/grammar.md` | **Read before designing.** The rules of the look, a catalogue of the plates and how each one is built, copy rules, and the traps already hit |
| `scripts/new.sh <dest> [--name X] [--accent #hex] [--ink #hex] [--paper #hex]` | Copies both sheets and swaps the colour tokens and wordmark |
| `scripts/shot.sh <page> [out] [height]` | Takes a full-sheet headless Chrome screenshot at 1500 px wide |

## Workflow

1. **Read the references.** If the user sends images, Read each one and write down what they do: which accent, which heavy grotesk, which mono lines, which frames (rulers, crosshairs, numbered rows, tape). Map each one to a plate in `references/grammar.md`. For an image that fits no plate, build a new plate in the same grammar.
2. **Concept: never clone.** Invent a fictional product and give it one metaphor that supplies all the vocabulary. LOOM uses weaving: threads are agents, warp → weft → woven, picks/s, 0 SNAGS, selvage clean. Write 10–15 terms before writing any plate. Borrow the grammar, never the copy, the mark or a real company's name. Choose real coordinates that mean something to the user (LOOM uses College Park).
3. **Design the mark.** It has to be one closed path, so it can be filled, outlined, halftoned and dimensioned. LOOM's is three stadiums at 60° with an even-odd fill and a pin-hole. See `stadium()`. The `MARK` constant appears in **both** files, so keep them in sync. The construction plate (svg-kit 02) has to be redone for the new geometry: axes, radii, the angle arc and the callouts.
4. **Scaffold.** Run `scripts/new.sh <dest> --name ACME --accent '#ff5217'`, then rewrite every line of copy using the vocabulary from step 2. `--accent` doesn't retint the speckle and halftone highlights (the `0 .66 .42` rows in the `--speckle` and `data-speckle` colour matrices). Set them to a lighter tint of the new accent by hand. Drop plates that don't fit and add new ones. Eight per sheet fills a 3-column grid with one gap. Either accept the gap, or make it 9.
5. **QA loop.** Run `scripts/shot.sh <dest>/identity.html` and Read the PNG. Then do the same for `svg-kit.html`. Look for:
   - a headline colliding with the corner meta text
   - a background `rect` inside an asset covering the plate's title
   - text overflowing its row
   - a strip whose content is blank
   - grain so strong that the paper reads as TV static
   
   Fix, then shoot again. Hover-dependent plates (the loupe, the asset outlines) need a real browser.
6. **Hand over.** Give the user both paths and list the live and interactive parts. Also say that exported SVGs still reference the web fonts in their `<text>`.

## The rules of the look (short version; the full rules are in grammar.md)

- **Three inks plus one alternate.** Signal orange `#ff5217`, carbon `#1b1916` and paper `#f5f2ea`, with at most one plate in an alternate field colour (cobalt `#2437ff`). The orange always carries lighter speckle, never a flat fill.
- **Two voices.** Heavy grotesk (Archivo 800–900, from condensed 62% to extended 125%) for names and numbers. Space Mono caps for everything else, with small tracking and stacked lines.
- **Spec-sheet syntax.** `KEY: VALUE`, `[ STATE ]`, `› DOMAIN:`, `- - - -` trailing fills, `::` separators, `©2026`, `REF`, `UNIT 07-L`, coordinates with spaced letters.
- **Frames.** Hairline 1px rules, crosshairs with diagonals, ruler ticks with black tabs, numbered rows, title blocks, double rules on tape edges.
- **Print.** Every plate gets a grain overlay (multiply on light, screen on dark, opacity about .26–.35) and the `#rough` displacement filter, which moves edges by 2px.
- **Motion is slow and mechanical.** A 40 s spin, tickers, a typewriter, a stepped bar chart, a real-time clock. Nothing bounces.
