# Screens: art direction, not UI filler

The scenes carry the motion; the screens carry the taste. In the reference, the moment that
sells is the generated sneaker store: a real shoe photo breaking out over a giant outlined
MOVE, condensed type, a neon-yellow page, a price line, three colourways. The card wall is
eight different fictional businesses, each with its own type, colour and photography, and the
centre card is a paper-cutout collage. None of it looks like a template.

A first draft of the second example (a purple AI-notes app) shows the failure mode: a purple
gradient hero, rounded white cards, empty skeleton bars, four pastel icon squares, a
"Your week, written for you" doc. Correct and lifeless. It reads as AI slop at a glance.

## Rules

1. **Pick a product whose output is visual.** The showcase scene (`screen`) shows what the
   product made. A store, a menu, a poster, a trip guide, a record label page, a dashboard
   with real data and a point of view. If the product's output is text, show it laid out like
   an editorial spread, not a doc.
2. **Real photography and cut-outs.** Use real photos (`tools/images/fetch.py`, Openverse
   by default, with credits) and cut the subject out (`tools/images/cutout.py`). Cut-outs are
   what make a page look designed: a product breaking out of its frame, a dish over an
   outlined word, a collage. Credit every image in the example's `SOURCES.md`. Cut-outs,
   shape crops and recolours are adaptations: use images whose licence allows them (the
   fetch tool's default), not no-derivatives (ND) ones.
3. **One big idea per screen.** A giant outlined or condensed display word behind the
   subject; a full-bleed photo with a hard crop; a colour block page; a collage. Then the
   detail around it (nav, a price line, a small caption, a round "explore" badge).
4. **Every card on a wall is a different business.** Different industry, palette, display
   face (condensed sans, high-contrast serif, wide grotesk, mono, script) and photo treatment
   (full bleed, cut-out, duotone, grid). Sameness kills the wall.
5. **Specific copy.** Names, prices, dates, SKUs, opening hours, addresses, a menu with
   dishes. "S-01 / SILVER / $180", "TUE-SUN 6PM-2AM", "Birria, consommé, $14".
6. **Big type, few words.** Display sizes in the hundreds of pixels on the page; body type
   small. Contrast of scale is the look.
7. **The app's own chrome is plain**, so its output can be loud: light editor chrome, a chat
   transcript that says what was built, a version card.

## Slop checklist (reject a screen that has any)

- a purple/blue gradient hero as the main idea
- skeleton bars or lorem ipsum standing in for content
- rows of identical rounded white cards with pastel icon squares
- generic headings ("Your week, written for you", "Supercharge your workflow")
- stock-feeling symmetry: everything centred, everything the same size
- one font family for everything, at medium weights
- emoji or clip-art icons as decoration
- photos you didn't check (people you didn't ask for, characters, watermarks, wrong subject)

## Recipes (all HTML, rendered with `tools/screens/render.py`)

- **Outlined word behind a cut-out**: `color: transparent; -webkit-text-stroke: 3px #111;
  font: 280px Anton`, the cut-out over it with a drop shadow, rotated -10 to -20 degrees.
- **Colour block page**: one saturated background (`#edfe32`, `#ff5a1f`, `#1b33c9`), black
  type, one cut-out, thin black rules between sections.
- **Collage poster**: big condensed words in two colours, a paper label with a black word,
  arches and steps in flat colour, a photo clipped into an arch, stripes, a checker, a squiggle.
  The `wall` kind has a built-in one (`center = [{ poster = true, ... }]`).
- **Editorial menu or list**: high-contrast serif titles, small caps labels, prices
  right-aligned on dotted leaders, a photo per section.
- **Tall pages for `screen`**: hero, a product row, a dark section with a close-up crop, a
  giant wordmark footer. 1255 px at 780 px wide scrolls well.

## Fetching and cutting images

```sh
uv run tools/images/fetch.py screens/img tacos "tacos" -n 8           # Openverse, credited
uv run tools/images/fetch.py screens/img chili "red chili pepper" --source bing
# look at screens/img/tacos_sheet.png, keep the good ones
uv run tools/images/cutout.py screens/img/tacos_2.jpg screens/img/taco_cut.png
uv run tools/images/cutout.py product_on_white.jpg cut.png --white 238
```
