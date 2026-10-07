---
name: web-designer
description: >
  Design and build websites, web apps and single components that look
  crafted by a top studio instead of AI slop, that move like award-winning
  motion work (dot-matrix and ASCII renders, 3D objects, engraved scenes,
  self-drawing line art, 3D cards, stacked folders, kinetic type), and that
  hold up on everyone's computer. Interviews for
  the brief, explores three genuinely different directions rendered on the
  real first screen, writes real content first, then builds production code
  in the user's own stack (plain HTML, React, Next.js, Tailwind, shadcn/ui,
  Vue, Svelte, Astro). Renders every page at phone, tablet, laptop and
  desktop widths and runs a slop scan on the rendered DOM (the 2026 faces of
  generated design: the paper-and-serif "considered" page, the purple launch
  page, the KPI-card dashboard, the dark dev tool; plus clipped and wrapped
  text, contrast, focus, tap targets). Then a cross-platform matrix: Windows
  at 125% and 150% scaling with Segoe UI metrics and real scrollbars,
  Windows High Contrast, Linux fonts, Android, Firefox, Safari/iPhone, 320px
  reflow, reduced motion and translation-length stress. One critic scores it
  against a rubric until it passes. Works on macOS, Windows and Linux. Use
  for "design my website", "landing page", "make my site look premium",
  "this looks AI-generated", "redesign this site", "web app UI", "dashboard
  design", "SaaS homepage", "portfolio site", "make it look good on
  Windows", or any request for a web page or web app that should look
  designed by a professional.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion, Agent, WebFetch
---

# Web Designer

AI slop is not ugly. It is **the average**: every decision left at its most
likely value. In 2026 that average is tasteful: warm paper, a serif headline
with one italic word in green, a "New" pill, mono labels, a black pill
button. Ask for four unrelated sites and you get that page four times.
Great sites are the opposite: a few **specific, defended decisions**,
executed with craft at every pixel, on every screen size, on every computer.

This skill is a process for making those decisions on purpose and proving,
on the rendered page, that you made them.

**What you produce:** `DIRECTION.md` (brief, concept, tokens, content,
signature), a three-direction exploration, the site or app as real code in
the user's project, clean scan and matrix results, a scored critique per
round, and collateral (favicon, social card) when shipping.

`<skill>` below is this skill's folder: `~/.claude/skills/web-designer`
(on Windows `%USERPROFILE%\.claude\skills\web-designer`; forward slashes work
in every command below, in Git Bash, PowerShell and cmd).

## The references

Read each when its step needs it, not all up front:

| File | Read before |
|---|---|
| [slop.md](references/slop.md) | Step 1. The four faces of 2026 slop, the overcorrection, the tests |
| [directions.md](references/directions.md) | Step 2 |
| [type.md](references/type.md), [color.md](references/color.md), [layout.md](references/layout.md) | Step 2 tokens and Step 4 |
| [imagery.md](references/imagery.md) | Step 2 (what imagery is honest) and Step 7 (collateral) |
| [copy.md](references/copy.md) | Step 3 |
| [app.md](references/app.md) | any web app, before Step 2 |
| [motion.md](references/motion.md) | the signature in Step 2, and Step 4 |
| [motion-craft.md](references/motion-craft.md) | Step 2 and Step 4: the recipe book for pieces that move (dot matrix, ASCII, 3D objects, engraving, line art, 3D cards, folders, glass, kinetic type, particles), and component briefs |
| [stacks.md](references/stacks.md) | Step 4 |
| [platforms.md](references/platforms.md) | Step 5 (what the matrix checks and why) |
| [critique.md](references/critique.md) | Step 5 |
| [redesign.md](references/redesign.md) | any redesign, before Step 1 |

## Setup (once per machine)

```bash
node <skill>/scripts/doctor.mjs --fix
```

It checks Node 18+, installs `playwright-core` into the skill folder, finds
Chrome or Edge (or installs Playwright's Chromium), and renders a test page.
`--engines` adds Firefox and WebKit for the matrix (optional, about 250 MB).

## Step 0: The brief

Ask before designing. One message, short; skip what the user already said:

1. **What is it, and who is it for?** Site, web app, a single component
   (a hero, feature cards, a menu, a footer, an onboarding modal, pricing),
   or a redesign of something that exists (ask for the URL or the repo).
2. **The one job.** For a site: what should a visitor understand and do in
   the first ten seconds? For an app: what does a user open it to do every
   day?
3. **Three words for how it should feel**, and up to three references *from
   outside the web*: a shop, a magazine, an object, a place, a film.
4. **What exists:** name, logo, colours, fonts, photos, real copy, real data,
   a codebase and its stack.
5. **Image generation:** if an image tool is connected and costs credits, may
   you use it?

If the user is unreachable or says "just do it", answer these yourself, mark
the brief **self-authored**, and do not spend paid credits. Create a working
folder (or use the project), and write the brief at the top of
`DIRECTION.md`. For a redesign, follow [redesign.md](references/redesign.md)
now. For an app, read [app.md](references/app.md) now.

## Step 1: Know the traps

Read [slop.md](references/slop.md) in full, including **"The
overcorrection"**. Then read the history of looks you have already made:

```bash
node <skill>/scripts/history.mjs show
```

Every row is a look you may not repeat (Step 2). On a fresh machine it is
empty, and the rule starts with your first project.

## Step 2: Direction, by exploration

Read [directions.md](references/directions.md) and
[imagery.md](references/imagery.md).

1. **Find out what imagery you can really get** (the user's assets,
   generation if allowed, the product itself, drawn in code, verified
   photos). Do not design a photo-led page with no photos.
2. **Name the category default you are refusing**: what the top three
   competitors share (structure, palette, type), the category colour cliché,
   and which slop faces this brief would naturally fall into. Write it in
   DIRECTION.md.
3. **Write three concept sentences**, "<Product> is a <thing>.", each from a
   **different source family**. At most one may be paper-and-ink.
4. **Render the first screen three ways**, one file per concept
   (`explore/a.html`, `b.html`, `c.html`, plain HTML and CSS, real content,
   full craft, not wireframes). Budget it: the first screen only, roughly
   20 minutes each. The point is to compare directions, not to finish them. For a site: the first viewport and the start
   of the second section. For an app: the core screen in a realistic mid-use
   state. The three must differ on **all** of:
   - **ground**: paper (warm off-white), light (white or cool), dark,
     colour field or image (three different),
   - **type**: three different families or designs,
   - **richness source**: photo, illustration, shape, colour-material,
     3D object or live data (three different),
   - **accent hue**: three different hue families,
   - **grammar** (site) or **shell** (app): at least two different,
   - **motion technique** (motion-craft.md §1): three different, and each
     exploration *moves*. A static exploration is a wireframe of a motion
     piece.
5. **Shoot them** at phone and desktop and look at every PNG:

   ```bash
   node <skill>/scripts/shoot.mjs explore/a.html --widths 390,1440 --out shots/explore-a
   ```

   (repeat for b and c; add `--app` for apps). **Choose.** Write which one
   won and one line on why each of the others lost. The safest one is
   usually the wrong pick: choose the one that is most *this product* and
   most memorable. You may merge; say what came from where.
6. **Check it against the history** (use only the listed words):

   ```bash
   node <skill>/scripts/history.mjs check "<kind>|<source>|<ground>|<type>|<accent>|<richness>|<grammar>"
   ```

   It must differ from every earlier project on at least 4 of the 6 look
   columns. If it does not, go back to step 3. The words: kind `site app` ·
   source `printed object place media nature play` · ground `paper light dark
   colour-field image` · type `serif grotesque expanded condensed rounded mono
   custom-display` · accent `red orange yellow green teal blue violet pink
   neutral` · richness `photo illustration shape colour-material 3d-object
   data` · grammar `scroll-story index poster catalogue document tool-first
   single-screen` (apps: `sidebar topbar canvas command split inbox`).
7. **Write the rest of DIRECTION.md:**
   - **Tokens:** colour roles for light and dark (color.md), type families
     with a one-line reason each, the scale (type.md), spacing, radius
     family, grid and max widths (layout.md).
   - **The richness source** as an art direction (imagery.md §2).
   - **The grammar** (site: the sections, each with the visitor question it
     answers) or **the shell and density** (app).
   - **The signature**: one moment born from the concept, storyboarded with
     trigger, frames, timing, easing and the reduced-motion version
     (motion.md §3).
   - **Voice:** one line (copy.md).

If the user is reachable, show them the three explorations and your pick
before Step 3.

## Step 3: Content first

Read [copy.md](references/copy.md). In a `## Content` section of
DIRECTION.md, write the exact content of every section or screen before any
layout: every headline, line, label, button, price, name, number and image
subject. Specific, uneven, believable data in a realistic state. For apps,
include the states (app.md §3). Content decides the layout, never the
reverse.

## Step 4: Build it

Read [stacks.md](references/stacks.md). Build in the user's stack, or as a
plain static site if there is none.

1. **Tokens and fonts first** (tokens file, Tailwind `@theme`, or shadcn
   variables rewritten), with metric-matched font fallbacks
   (`node <skill>/scripts/fallback.mjs <font.woff2>` writes them).
2. **The core page or screen**, from the content, at every width. Design the
   phone layout; do not just stack the desktop.
3. **States, dark mode, the signature.**
4. **The other pages or screens.**

**Rules, in the order they usually go wrong:**

1. **The first screen carries evidence, what it is, and the one action** on
   both desktop and phone (layout.md §2).
2. **Richness on the first screen** (imagery.md). Type on paper is not
   richness.
3. **No slop face.** Check the page against the four faces and the
   overcorrection; three shared features means rework.
4. **Type with a voice and a real scale**; tabular figures where numbers
   align.
5. **One accent, one job**; status colour only where state lives; every pair
   measured.
6. **Group with space before boxes**; one radius family; shadows only on
   things that float.
7. **It moves, with intent.** One technique from motion-craft.md carries the
   signature, built to its craft rules (slow loops, eased pointer, a beautiful
   still frame, paused off-screen). Content stays visible without
   JavaScript; everything respects reduced motion.
8. **Accessible by construction**: semantic HTML, labels, names on icon
   buttons, visible focus, 24px+ targets, `lang`, viewport, `color-scheme`.
9. **Never** placeholder images, fake logos, fake testimonials, emoji
   icons, lorem, Acme.

## Step 5: Shoot, scan, matrix, critique

Serve the page the way it runs: a file or folder (served over http by the
script), or the project's dev server URL.

```bash
node <skill>/scripts/shoot.mjs <file | folder | http://localhost:3000/> --out shots/r1          # add --app for apps
node <skill>/scripts/shoot.mjs <same> --out shots/r1-dark --dark --widths 390,1440               # only if it has a dark mode
node <skill>/scripts/matrix.mjs <same> --out shots/r1/matrix
node <skill>/scripts/filmstrip.mjs <same> --selector "<the signature's element>" --out shots/r1/film   # add --click/--hover/--scroll-to for its trigger; --live for canvas/WebGL
node <skill>/scripts/record.mjs <same> --seconds 8 --out shots/r1/video   # the loop: loop.mp4 + poster.jpg (add --move, --scroll, --selector)
```

`shoot.mjs` renders 390, 768, 1280 and 1440 (first screen, plus full pages at
390 and the widest, also sliced into readable numbered screens
`390-full-01.png`…), tiles `sheet.png`, and scans the rendered DOM at every
width: the slop faces' tells, type, colour, contrast (including text over
images, measured on real pixels), clipped/overlapping/wrapped text, sideways
scroll, hidden content, images, icons, copy, accessibility names and a
keyboard focus walk, pictures that collapse on a phone or render as a flat
block, and whether the action is in the first screen. Timer-driven
JavaScript is not finished for you: pass `--wait <ms>` so a render lands on
the state you mean. `filmstrip.mjs` freezes the signature at exact moments
(and in its reduced-motion state) so it can be judged from a still.
`matrix.mjs` puts the page on Windows (125%, 150%, High
Contrast), Linux, Android, Firefox, Safari/iPhone, a 320px reflow, reduced
motion and translation-length stress (platforms.md). Both exit 1 on any FAIL.

1. **Fix every FAIL. Answer every warn**: fix it, or one line in CRITIQUE.md
   on why it is deliberate. Fix mechanical defects before round 1 goes to
   the critic; the critic is for design, not for bugs the scan already named.
2. **Open every PNG yourself**, not only the sheets: the first screens, every
   numbered full-page slice, every matrix pass with a FAIL, the filmstrip. The
   scan catches mechanics; your eye catches design (a thumbnail gone black,
   an illustration missing on the phone).
3. **Run the six tests** in slop.md §9.
4. **Score it** with [critique.md](references/critique.md). If you can
   spawn an agent, spawn **one** critic for the whole job, brief it as
   critique.md says, and wait for its scores before editing. Otherwise score
   it yourself, harder than feels fair. Write scores and findings to
   `CRITIQUE.md`.

## Step 6: Iterate

Fix what the critique found, shoot into a new folder (`r2`, `r3`), compare.
**At least two rounds, at most four.** Done, plateau and budget are defined
in critique.md. Always end with no FAILs and every warn answered.

When you stop, record the look so the next project cannot repeat it (`add`
re-checks: another project may have been recorded while you worked; if it
refuses, change the look or record it with `--force` and a reason in
DIRECTION.md):

```bash
node <skill>/scripts/history.mjs add "<project>|<kind>|<source>|<ground>|<type>|<accent>|<richness>|<grammar>"
```

## Step 7: Ship

- **Collateral** (imagery.md §5), in the site's root: `favicon.svg`,
  `apple-touch-icon.png` (180), `icon-512.png`, `og.png` (from `og.html`
  shot with `--widths 1200 --height 630 --scale 1`), and a `<title>` and meta
  description written in the voice.
- **Performance basics**: hero image preloaded and sized, fonts preloaded and
  subset, nothing large below the fold loaded eagerly, no layout shift.
- **Hand-off**: where the tokens live and how to add a page that matches.

## Hard rules

| Never | Instead |
|---|---|
| Committing to a direction without rendering three | Step 2: three grounds, three type families, three richness sources |
| The Paper Edition: warm paper, serif headline with an italic green or vermilion word, "New" pill, mono eyebrows, black pill + ghost pill | slop.md face 1. Name it in DIRECTION.md and refuse it |
| The template sequence: pill, hero, logos, features, bento, testimonials, three-tier pricing, FAQ, CTA band | A grammar from the visitor's questions, four to six sections |
| A row of KPI cards as the first thing in an app | The work owns the screen; numbers as one quiet line |
| The overcorrection: off-white, giant type, numbered mono labels, coordinates and a clock, one rust accent, no images | A richness source on the first screen |
| Repeating a row of the history | Differ on 4 of 6 look columns |
| Indigo gradients, gradient text, glows, blurred orbs, dot grids | Flat colour from the concept |
| Six status colours doing six jobs | One accent; status by word and shape, hue for urgency |
| Default-reach fonts as an unexamined choice | A face with a written reason (type.md) |
| Boxes inside boxes; one radius on everything | Space and hairlines; a radius family |
| Content hidden until JavaScript reveals it | Visible by default; motion as enhancement |
| Placeholder images, stock avatars, fake logos or testimonials, Acme, lorem | Real assets, art-directed generation, or a designed field |
| Emoji as icons, ✨ for AI, marketing words, two-beat aphorism headlines | copy.md |
| Checking only on your own Mac | matrix.mjs: Windows, Linux, High Contrast, Firefox, Safari, l10n, reduced motion |
| Grading your own work and calling it done | One continued critic, critique.md's stop rule |

## Report

Short: the three concepts and why two lost, the category default refused,
the grammar or shell, the signature, paths to the latest `sheet.png` files
(shoot and matrix), scan and matrix results, rubric scores per round and
what changed between rounds, and what you could not verify (glyph shapes and
ClearType on real Windows, real devices, screen readers, real performance).
Say if the brief was self-authored. For a redesign: the before/after, the
keep list checked off, and the decisions the user needs to make.
