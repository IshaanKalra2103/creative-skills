# Layout

## 1. Page grammars (sites)

A grammar is the order and shape of a page. The template grammar (hero,
logos, features, bento, testimonials, pricing, FAQ, CTA band) is slop at the
level of structure. Choose a grammar from the visitor's questions; record it
in the history.

| Grammar | What it is | Good for |
|---|---|---|
| **scroll-story** | one argument told in scenes; each section answers the next question; often pinned moments | a product with one big idea, a launch |
| **index** | the content *is* the page: a list, a table, a grid of work, with filters; little preamble | studios, portfolios, catalogues, changelogs, directories |
| **poster** | one screen, or a few full-screen panels, type as image | events, launches, personal sites, a single offer |
| **catalogue** | product range with real browsing, prices visible | shops, menus, plans with many options |
| **document** | a long, well-set read with a table of contents | essays, manifestos, docs, a technical product explained |
| **tool-first** | the page opens on a working tool (a calculator, a demo, a search) | dev tools, utilities, anything you can try without signing up |
| **single-screen** | no scroll, everything at once, often a dashboard of the business itself | restaurants, bars, small local businesses, a link-in-bio |

Then cut: most pages need four to six sections. Each one must answer a
question the visitor has *at that point*. If you cannot name the question,
delete the section.

## 2. The first screen

The first viewport (1440×900 desktop, 390×844 phone) carries:

- **Evidence**: the strongest proof this is real and good (the product
  working, the coffee, the buildings, the menu, the price).
- **What it is**, in words a stranger understands in five seconds.
- **The one action**, visible without scrolling on both phone and desktop.

It does not need: a pill, two buttons, small print, a logo strip, three
stats. Check the phone first screen separately; it is not the desktop one
stacked.

## 3. Grid and alignment

- Pick a grid and use it visibly: 12 columns with a 24 to 32px gutter is a
  default, not a law. Editorial pages use 6 or 8; posters use 4.
- **Few verticals.** Every left edge on the page should land on one of four
  or five lines.
- **Max width with intent.** Text sets the measure (65ch); images and
  product shots can break out to the full width. A page boxed into one
  1200px column everywhere looks like a template.
- Use `container` queries for components that live in different widths;
  breakpoints for page structure.

## 4. Rhythm and space

- A spacing scale of 6 to 8 steps (for example 4, 8, 12, 16, 24, 40, 64,
  104, 168), as tokens.
- **Tight inside groups, loose between**: label to value 4 to 8, between
  groups 24 to 40, between sections 104 to 168 on desktop (64 to 104 on
  phones). Uniform gaps make nothing group.
- **More space above a heading than below it.**
- One generous rest per page where the eye stops.

## 5. Responsive

- **Design the phone, do not shrink the desktop.** Decide what the phone
  user needs first, which may be a different order, a different crop of the
  image, fewer columns of a table.
- Widths to check (shoot.mjs does): 390 phone, 768 tablet, 1280 laptop,
  1440 desktop, plus 320 (reflow, WCAG) and 1920+ (does the layout hold, or
  float in a sea?).
- Tap targets 44px where possible, **24px minimum** with spacing **[scan]**.
- `100vh` lies on mobile browsers; use `svh`/`dvh`. `100vw` includes the
  scrollbar on Windows and Linux and causes sideways scroll **[matrix]**.
- Hover is not available on touch. Never put information only behind hover;
  use `@media (hover: hover)` for hover-only niceties.
- Respect safe areas on iPhone (`env(safe-area-inset-*)`) for fixed bars.

## 6. Shells (web apps)

Choose the shell from the work, and record it in the history.

| Shell | When |
|---|---|
| **topbar** | 2 to 6 sections, content-first apps, consumer tools |
| **sidebar** | many sections or many workspaces/projects; collapsible to icons |
| **canvas** | spatial work: maps, boards, editors, design tools; chrome floats on the canvas |
| **command** | keyboard-first power tools; a command bar is the main navigation |
| **split** | queues and inboxes: list on the left, the selected item on the right |
| **inbox** | triage: one item at a time, big, with fast actions |

Density is a decision, too: **compact** (operators, all-day tools: 28 to 32px
rows), **comfortable** (36 to 44px rows), or a user toggle.

### A trap worth knowing

Visually hidden text (`.sr-only`, `position: absolute` + `clip`) inside a
horizontal scroller escapes the scroller's clip when its containing block is
outside it, and widens the whole page. Give the scroller
`position: relative` (or the hidden text's parent), so the text is contained.

## 7. Boxes

Group with space and alignment first, hairlines second, containers last.
A box is earned when the thing is an object (a product, a photo, a
message, a dialog) or floats. Nested boxes **[scan]**. One radius family
that nests concentrically (inner radius = outer radius − padding).
