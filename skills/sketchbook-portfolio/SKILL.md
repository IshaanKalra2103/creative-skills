---
name: sketchbook-portfolio
description: Build a playful illustrated personal portfolio site in plain HTML/CSS/JS, no build step. A red sketchbook hero on grid paper with hand-drawn SVG line art that boils, red stamp tiles scrolling down both edges, chalk doodles in the dark margins, taped paper notes, and scroll choreography. Lenis smooth scroll, a 3D-hinged book page that opens flat, belief notes that peel off the page and pin mid-screen while project polaroids parallax past, then project cards that drop onto a tilting grid board and can be dragged. Nav links get a pen loop plus pop-up doodles on hover; every click throws red ink dashes. Use when the user wants a personal website or portfolio "like jackiezhang.co.za", a hand-drawn / sketchbook / doodle-style portfolio, an illustrated personal site with scroll-driven 3D and parallax effects, or a Framer-style scroll-animated page without Framer.
---

# Sketchbook Portfolio

`assets/scroll.jpg` shows the scroll story, `assets/hover.jpg` the nav hovers.

| path | what |
|---|---|
| `template/` | placeholder site: `index.html` (content, with `EDIT` comments) + `styles.css` + `main.js` |
| `examples/ishaan/` | a finished site built from it |
| `scripts/shot.mjs` | screenshots at scroll positions / nav hovers → contact sheet + console errors |

**Engine vs content.** `styles.css` and `main.js` are the engine and are identical in the template and every example; keep them that way (change behaviour in the template, then copy). Everything personal lives in `index.html`: the markup plus `window.SITE` (stamp icons and labels, which stamps become about-section stickers, optional `gallery` slots).

## The page, top to bottom

| section | markup | what moves |
|---|---|---|
| stamp columns | `.stamps` (filled from `SITE.stamps`) | fixed, drift up/down forever; hover a tile → hand-lettered label |
| nav | `.nav__link` with `.nav__loop` + `.nav__pop > .pop` | hover draws a pen loop round the word and springs doodles out (`--x --y --r --d` per pop) |
| sketchbook | `.book__top` (grid page + hero) / `.book__bottom` (`.book__sheet` + `.notes`) | top page leans back; bottom page is hinged at the fold: 40° toward you → flat → tips −24° away as it leaves |
| belief notes | `.note-track > .note-pin > .note` ×3 | each track is `--pin` px tall; the pin is CSS-sticky at mid-screen and JS slides it to centre. They stack like a deck and release in turn |
| gallery | `.gallery__inner` | polaroids cloned from each card's `.scr`, drifting at `speed` 0.75–1.3 around the pinned notes; chalk doodles with `data-speed` |
| work board | `.board-wrap > .board > .card` | board tilts up 26° → flat; cards start big, rotated, below their slot and land as it arrives; draggable once landed |
| about | `.about__note` + `.stickers` | fade up |
| connect | `.connect` checklist, `let's chat!`, links, `.frame` toy | checkboxes draw a tick; the ball is a keepy-uppy counter |
| footer | chalk computer, `.marquee`, signature | marquee loops |

## Workflow

1. **Collect real facts first.** Name, role, city + IANA timezone, 3 beliefs (short: they're set 37–48px), 4–8 projects (name, one line, stack, what its screen looks like), two About paragraphs, what they're looking for, email/links, and things from their life for doodles and stamps (school mascot, hometown, team, hobbies, a lyric or chant for the marquee). Never invent facts; leave visible placeholders (`data-todo` links, `you@example.com`) and list them at the end. Ask before listing private repos publicly.
2. `cp -R ~/.claude/skills/sketchbook-portfolio/template <dest>` and serve it: `python3 -m http.server 8765` (background).
3. Fill every `EDIT` in `index.html`: head, signature (`<text>`; widen its viewBox for long names), role, headline (the `.hand` word gets the scribble underline), `#clock[data-tz]`, hero terminal lines, notes, about, cards, checklist, email/links, marquee, footer, `window.SITE`.
4. **Cards**: one `<article class="card" style="--r:…;left:…;top:…">` each. Slots are a 3-column grid (`left` ≈ 4% / 36% / 68%, `top` ≈ 50 / 460 / 870). The board height fits the lowest card. Pick a mock screen per project: `panes`, `sketch` (inline SVG), `dash` (`data-viz` bars, `data-heat` grid), `rows`, `form`, `log`. Text inside should read like that project's real UI.
5. **Doodles**: draw the person's own things (below) and wire them into stamps, margins (`.doodle[data-speed]`), nav pops and the hero.
6. **Verify** (below). Motion can't be judged from code.

## Drawing the doodles

- Each doodle is a `<symbol>` in the top `<svg class="defs">`, viewBox ~100 units, strokes only in `currentColor`, **no stroke-width inside** (the using `<svg>` sets it, so one symbol works at 40px and 400px).
- Shapes that must hide what's behind them use `style="fill:var(--fill,none)"`; set `--fill` on the `<use>` (e.g. `style="--fill:var(--cream)"` on the page, `var(--bg)` in the nav).
- Wrap uses in `<g filter="url(#rough)">` (red ink on paper), `url(#chalk)` (white, grainy, margins) or `url(#rough-lite)` (small things, underlines). `main.js` re-seeds the turbulence every 170ms so lines boil like hand-drawn animation.
- Objects are easy (ball, mug, crab, crown, headphones, controller). Faces and people come out stiff in hand-written SVG: use a mascot (the robot) instead of a bad self-portrait, or have the person draw their own and trace it in.
- Hero illustration: one inline SVG composed from symbols and a few paths (window, bushes as scalloped `paper`-filled paths, grass, sparkles). Keep readable text in the unfiltered `.term` group.
- Never reuse the reference site's illustrations; draw originals from this person's life.

## Tuning the scroll (`frame()` in main.js)

- Note order and timing: `--pin` on each `.note-track` (760 / 1260 / 1720). The top note (highest `z-index`) should have the shortest pin. Home positions: `--x`, `--y` (relative to the bottom page).
- The gallery must be tall enough for the last note to release: `--y + --pin + 300 ≤ bottom page height + .gallery height` (1900px).
- Angles: bottom page 40° open / −24° close, top page −3° → 10°, board 26°. Ranges are in viewport fractions (`range(v, a, b)`), so they hold at any height.
- Gallery slots and speeds: `SITE.gallery` (default 8 slots, cycling through the cards).
- 3D effects run only above 1100px wide without `prefers-reduced-motion` (`html.fx`). Otherwise the notes stack on the page, the gallery hides, the board wraps, and there's no boil or click burst.

## Verify

```sh
node ~/.claude/skills/sketchbook-portfolio/scripts/shot.mjs index.html /tmp/scroll.png            # 10 scroll frames
node …/shot.mjs index.html /tmp/nav.png --nav                                                     # each nav hover
CLIP=440,30,560,230 node …/shot.mjs index.html /tmp/nav.png --nav                                 # nav only, full size
WIDTH=390 HEIGHT=844 node …/shot.mjs index.html /tmp/phone.png 0 900 1800 2700                   # phone layout
```

It opens the page in `?y=0` screenshot mode (no Lenis, reveals on) and prints console errors. Check that: the bottom page is tilted at 0 and flat around 450; one note is centred and pinned at 900–2800 with polaroids either side; the cards land and the caption is clear of them; hovers show loop + pops; the phone has no sideways scroll. Then click around in a real browser: the click burst, dragging a card, the keepy-uppy.

## Gotchas

- Chrome's `--screenshot` flag ignores scroll position; that's why `shot.mjs` drives Chrome over CDP.
- Headless wheel events arrive with doubled deltas, and Playwright's `page.click()` scrolls first, so Lenis anchor tests look like they overshoot. Compare against the reference site, or click at raw coordinates, before "fixing" anything.
- `body { overflow-x: clip }`, never `hidden`: it can turn body into a scroll container and break the sticky notes.
- JS moves things with the individual `translate` / `scale` / `rotate` properties so CSS `transform` stays free for hover and drag states. Don't fold them together.
- Apply filters with the `filter` attribute on a `<g>`, not CSS `filter:url()` (Safari). The defs `<svg>` must not be `display:none` or the filters die.
- `<use href>` doesn't work across files on `file://`, so the symbol library stays inline in `index.html`.

Inspired by [Jackie Zhang's portfolio](https://jackiezhang.co.za/). The code and illustrations here are original.
