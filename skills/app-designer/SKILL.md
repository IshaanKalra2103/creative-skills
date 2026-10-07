---
name: app-designer
description: >
  Design iPhone apps that look and feel like Apple Design Award work instead of
  AI slop. Interviews for the concept, explores three genuinely different
  visual directions on the real core screen before committing, writes real
  content first, then designs every screen with deliberate type, colour,
  spacing, imagery and motion on iOS 26 (Liquid Glass) structure. Renders
  high-fidelity mockups at 3x with a real iPhone status bar and Apple's own
  fonts, runs a slop scan on the rendered result (emoji icons, purple
  gradients, confetti colour, greeting headers, card stacks, clipped or
  colliding text, weak contrast, flat type scale), and has a fresh pair of
  eyes score the screens against a rubric until they pass. Can carry the
  design into SwiftUI and App Store screenshot panels. Use for "design my
  app", "iPhone app UI", "iOS app design", "make my app look premium", "this
  looks like AI made it", "redesign this screen", "App Store screenshots",
  "mobile app mockup", "SwiftUI design", or any request for an iPhone app that
  should look crafted by a professional designer.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion, Agent
---

# App Designer

AI slop is not ugly. It is **average**: every decision left at the most likely
value. Cream and terracotta because the app is calm. Lime on black because it
is money. Inter because it is a UI. "Good morning, Maya" because it is a home
screen. Each choice is defensible, and together they make an app nobody can
tell apart from the last hundred.

Award-winning apps are the opposite: a few **specific, defended decisions**,
executed with craft at every pixel, a world with **warmth and richness** in it,
and one interaction people remember. This skill is a process for making those
decisions on purpose and proving on the rendered screen that you made them.

**What you produce:** `DIRECTION.md` (brief, concept, tokens, content,
signature), a three-direction exploration, high-fidelity screens and the app
icon rendered at 3x, a clean slop scan, a scored critique per round, and, when
asked, SwiftUI code and App Store panels.

`<skill>` below means this skill's folder, normally
`~/.claude/skills/app-designer`.

## The references

Read each one when its step needs it, not all up front:

| File | Read before |
|---|---|
| [slop.md](references/slop.md) | Step 1. What not to do, with what to do instead. Includes this skill's own failure mode |
| [directions.md](references/directions.md) | Step 2 |
| [type.md](references/type.md), [color.md](references/color.md), [layout.md](references/layout.md) | Step 2 tokens, and Step 4 |
| [copy.md](references/copy.md) | Step 3 |
| [imagery.md](references/imagery.md) | Step 2 (what imagery you can actually get) and Step 4 |
| [motion.md](references/motion.md) | the signature in Step 2, and Step 4 |
| [critique.md](references/critique.md) | Step 5 |
| [appstore.md](references/appstore.md) | App Store screenshot panels |
| [swiftui.md](references/swiftui.md) | writing SwiftUI |

## Step 0: The brief

Ask before designing. One message, short:

1. **What is the app, and who is it for?** In their words.
2. **The core action:** what someone does in the first ten seconds of
   opening it, every day.
3. **Three words for how it should feel**, and up to three references
   *from outside apps*: a magazine, a shop, an object, a film, a place.
4. **What exists already:** name, logo, colours, fonts, photos, a codebase.
5. **What they need:** screens to look at, a SwiftUI build, App Store
   screenshots, or a redesign of something existing (ask for screenshots).
6. **Image generation:** if an image-generation tool is connected and it costs
   them credits, ask whether you may use it.

Do not re-ask what the user already said. If they are unreachable or said
"just do it", answer the questions yourself, mark the brief **self-authored**,
and do not spend paid credits.

Create the working folder and `DIRECTION.md`, and put the brief at its top.

### If this is a redesign

An existing app changes the job: you are replacing a look, not inventing a
product. Before Step 1, add a `## Current app` section to DIRECTION.md:

1. **Audit it.** Screenshot or rebuild its key screens into `before.html` and
   run `shoot.mjs` on them. Name which slop.md tells it hits (often one of
   the two named faces almost exactly) and paste the scan's FAILs.
2. **Inventory: keep / lose / unknown.** Every feature, data point and
   screen, and every good idea worth carrying over (a clever line of copy, a
   useful number). This list is a contract: the redesign must keep every
   "keep".
3. **Harvest assets** from the codebase or the user: logo, photos, icons,
   brand colours, real data. Use them before drawing anything.
4. **Decisions for the user.** Any change to the name, the tab structure, the
   hero metric or a removed feature is a decision you list explicitly, not one
   you make silently.
5. The current look counts as a **history row** for this app: the new
   direction must differ from it on at least 3 of 5 columns.
6. The deliverable gains a **before/after**: `before-after.html` with the old
   core screen beside the new one, shot like everything else.

## Step 1: Know the traps

Read [slop.md](references/slop.md) in full, including **"The overcorrection"**:
the austere grey-paper-and-mono look that an anti-slop process falls into
when it forgets that award apps are also *rich*. Then read the history file:

```bash
mkdir -p ~/.app-designer
[ -f ~/.app-designer/history.md ] || printf '| date | app | source family | ground | type | accent hue | richness source |\n|---|---|---|---|---|---|---|\n' > ~/.app-designer/history.md
cat ~/.app-designer/history.md
```

Every row there is a look you may not repeat (Step 2 explains the rule). On a
fresh machine it is empty and the rule starts with your first app.

## Step 2: Direction, by exploration

Read [directions.md](references/directions.md) and [imagery.md](references/imagery.md).

1. **Find out what imagery you can really get** (the user's assets, generation
   if allowed, verified photo URLs, or none). This decides what directions are
   honest. Do not promise photography you cannot deliver.
2. **Write three concept sentences**: "<App> is a <thing>." Each from a
   **different source family** (see directions.md: printed matter, objects
   and materials, places, media, nature, play). At most one may be a printed
   form (ticket, ledger, receipt, label, timetable).
3. **Render the core screen three ways**, one per concept, in one file
   (`explore.html`), with real content and full craft. Not wireframes. The
   three must differ on all three axes:
   - **Ground:** one light, one dark, one saturated colour field or
     full-bleed image.
   - **Type:** three different families or designs (serif / grotesque or
     expanded / rounded or mono or custom).
   - **Richness source:** photography, illustration or shape language,
     colour and material. Different in each.
   - **Accent hue:** three different hue families, so the brief's mood
     does not quietly pick the palette for all three.
4. Shoot it (`shoot.mjs explore.html --out shots/explore`), look at each, and
   **choose**. Write in DIRECTION.md which one won, and one line each on why
   the other two lost. Picking the safest of the three is usually wrong:
   pick the one that is most *this app* and that an editor would remember.
   You may merge, but say what came from where.
5. **Check it against the history.** It must differ from every row in
   `~/.app-designer/history.md` on at least 3 of the 5 columns. Use only these
   words in the columns, so the comparison is mechanical:
   - source family: `printed` `object` `place` `media` `nature` `play`
   - ground: `light` `dark` `colour-field` `image`
   - type: `serif` `grotesque` `expanded` `condensed` `rounded` `mono` `custom-display`
   - accent hue: `red` `orange` `yellow` `green` `teal` `blue` `violet` `pink` `neutral`
   - richness: `photo` `illustration` `shape` `colour-material` `3d-object`

   Re-read the file before appending in Step 6: another session may have
   added a row while you worked.
6. Then write the rest of DIRECTION.md:
   - **The category default you are refusing**: what the top three apps in
     the category share, and which of those you are not doing. Include the
     category's colour cliché (a flag's colours for a language app, green for
     money, sage for plants, navy and violet for sleep), which the history
     columns cannot catch.
   - **Tokens:** the colour roles for light and dark (hex), type families,
     5 to 7 size steps with weights and tracking, side margin, radius family,
     spacing scale (type.md, color.md, layout.md).
   - **The richness source**, written as an art direction: photography
     (light, distance, grade), an illustration or shape language (one hand),
     or a colour and material system. Every app has at least one. Pure
     greyscale typography on paper is not one.
   - **The signature interaction** as a storyboard: trigger, frames, timing,
     haptic, reduced-motion fallback (motion.md §6).

If the user is reachable, show them the exploration sheet and your pick
before Step 3.

## Step 3: Content first

Read [copy.md](references/copy.md). In a `## Content` section of DIRECTION.md,
write the exact content of every screen before any layout: every label,
value, name, date and image subject. Specific, uneven, believable data, in a
realistic state (some done, one overdue, one new). Content decides the
layout, never the reverse.

## Step 4: Design the screens

**The set** (5 to 8 frames, in `mockup.html`, plus the icon). If the brief
names more screens than fit, pick the ones that carry the core loop and
list the rest as not designed:

1. The core screen, in a realistic mid-use state.
2. A detail screen (one level deeper).
3. A second core-loop screen: creation, a list, or a different tab.
4. The signature: one storyboard panel (`data-chrome="none"`) holding 3 to 4
   `.mini` frames of the moment, or 2 to 3 full frozen frames
   (`data-freeze`). See motion.md §6.
5. The core screen in dark mode (`data-theme="dark"`).
6. An empty or first-run state, if the app has one worth designing.
7. The app icon (`<section class="app-icon">`). See imagery.md §4.

**The device kit.** Link `<skill>/assets/device.css` in the head and
`<skill>/assets/device.js` at the end of the body (as `file://` URLs). Each
`<section class="screen" data-name="slug">` is a 402 x 874 iPhone 17 Pro
screen with status bar, Dynamic Island and home indicator injected.
Attributes on a screen: `data-time="18:52"` (match the clock to your
content), `data-chrome="light"` (white chrome) or `"none"`, `data-home`
(indicator alone), `data-theme="dark"`, `data-freeze="450"` (pause
animations at 450ms), `data-dense` (deliberately dense).

Attributes inside a screen: `data-system` on replicas of system components
(tab bar, keyboard, segmented control), `data-scrolls` on a scroll view whose
content runs under the tab bar or off the side (show that it scrolls: let
the list pass under the glass), `data-float` on floating chrome you drew
yourself, `data-behind` on the presenting view under a sheet, `data-bleed` on
deliberately off-screen content, `.mini` for a scaled-down screen inside a
storyboard panel.

Fonts: `var(--sf)` (SF Pro, all widths via `font-stretch`), `var(--ny)` (New
York), `var(--sf-rounded)`, `var(--sf-mono)`, plus any web font you load. iOS
text styles as `.t-large-title` ... `.t-caption2`. Floating glass as
`.glass`. The header comment in device.css lists all of it.

Put tokens on `:root` named after the DIRECTION.md roles, and their dark
values on `.screen[data-theme="dark"]` (restate `color` there).

**Build layouts that flex**, not absolute coordinates: flex or grid columns,
heights in `%` or `flex: 1`, so the same markup survives the small-phone
render. Absolute positioning is for overlays and illustration only. A screen
that genuinely scrolls may run long with `data-scroll`.

**Design rules, in the order they usually go wrong:**

1. **One hero per screen**, at least twice the size of anything else.
2. **Richness on the core screen**: the image, the colour field, the shape
   language or the material is *on* the first screen, not saved for later.
3. **Real type contrast:** a display moment (34 to 96pt) against 13 to 15pt
   metadata, weights two steps apart, negative tracking on display.
4. **Rhythm:** tight inside groups, loose between, a rest where the screen
   decides (dense screens are exempt). Space before boxes. More space above
   a heading than below.
5. **One accent, one role.** Neutrals tinted. Contrast measured.
6. **iOS 26 structure** (layout.md §5): content edge to edge, Liquid Glass
   only on the floating navigation layer, primary action in the thumb zone.
   Keep native *behaviour*; the *look* of the navigation layer may follow
   the concept.
7. **Never** grey placeholder boxes, emoji icons, or stock illustration.

## Step 5: Shoot, scan, critique

```bash
# if it says playwright-core is missing: (cd <skill> && npm install)
node <skill>/scripts/shoot.mjs mockup.html --out shots/r1
node <skill>/scripts/shoot.mjs mockup.html --out shots/r1-se --width 375 --height 667   # small phone, scanned too
```

It renders every screen and the icon at 3x, tiles `sheet.png`, and scans the
rendered DOM: clipped, colliding and off-screen text, emoji, purple
gradients, too many hues, glows and blobs, greetings, centred FABs, nested
cards and card stacks, icon chips, families and default fonts, flat or
bloated type scales, text under 11pt, contrast, marketing words, small tap
targets, ragged left edges. Exit code 1 on any FAIL.

1. **Fix every FAIL. Answer every warn** (fix it, or one line on why it is
   deliberate).
2. **Open every 3x PNG**, not only the sheet. The sheet shows the flow;
   defects live in the full-size frames.
3. **Score it** with [critique.md](references/critique.md). If you can spawn
   an agent, spawn **one** critic for the whole job and brief it as
   critique.md says (concept, refused defaults, rubric, PNG paths); wait for
   its scores before editing. Otherwise score it yourself, harder than feels
   fair. Write scores, findings and any declined asks to `CRITIQUE.md`.

## Step 6: Iterate

Fix what the critique found, shoot into a new folder (`r2`, `r3`), compare.
**At least two rounds, at most four.** Done, plateau and budget are defined in
critique.md "When to stop". Always: no FAILs, every warn answered.

When you stop (done or not), append one row to the history so the next app
cannot repeat this one:

```bash
echo "| <date> | <app> | <source family> | <ground> | <type> | <accent hue> | <richness source> |" >> ~/.app-designer/history.md
```

## Step 7: Build or ship (when asked)

- **SwiftUI:** [swiftui.md](references/swiftui.md). Tokens first, then screens
  with native components styled by the tokens. Run it in the simulator and
  compare screenshots with the mockups.
- **App Store screenshots:** [appstore.md](references/appstore.md).

## Hard rules

| Never | Instead |
|---|---|
| Committing to a direction without rendering three | Step 2: three concepts, three grounds, three type families |
| The category's default look (cream wellness, dark-lime fintech, purple AI) | Name the default in DIRECTION.md and refuse it |
| This skill's own default: grey paper, black ink, one red, mono, ruled rows | slop.md, "The overcorrection". At most one printed-form concept per exploration |
| A core screen with no richness (all type, all grey) | Image, colour field, shape language or material, on screen one |
| Repeating a row of `~/.app-designer/history.md` | Differ on 3 of 5 columns |
| "Good morning, Name" or any greeting header | The date, the place, or the thing itself |
| The dashboard skeleton (hero stat card, 2x2 tiles, "Recent") by default | The core action owns the first screen |
| Emoji as icons or in UI copy | SF Symbols (SF-style SVG in mockups), one weight |
| Indigo/violet gradients, glows, blurred colour blobs | A colour from the concept, flat |
| More than one accent hue (plus semantic colour if the domain needs it) | One accent, one role |
| Cards inside cards, a screen that is a stack of boxes | Space and alignment, hairlines, then containers |
| Inter / Poppins / Manrope / Playfair as an unexamined default | A face with a stated reason |
| A centred floating "+" over the tab bar | Primary action in context, or a toolbar button |
| Marketing copy, exclamation marks, fake-round data, lorem | copy.md |
| Grey placeholder boxes or broken image URLs | Real images, verified, or a designed colour or shape field |
| Liquid Glass on content cards | Glass for the navigation layer only |
| Staggered fade-up on every element | Motion only where state changes; springs |
| No signature interaction | One storyboarded, haptic, concept-born moment |
| Grading your own work and calling it done | One fresh critic, briefed on the refused defaults, critique.md's stop rule |

## Report

Short: the three concepts and why two lost, the category default refused, the
signature, the path to the latest `sheet.png`, the scan result, the rubric
scores per round, what changed between rounds, and what you could not verify
(real-device feel, motion timing, fonts on a non-Mac machine). Say if the
brief was self-authored. For a redesign, add the before/after, the keep list
with each item checked off, and the decisions the user needs to make.
