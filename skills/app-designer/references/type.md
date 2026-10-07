# Type

On a phone, typography *is* the design. There is no room for decoration, so
the only things that make a screen feel crafted are which face, what size,
what weight, what tracking, and how much space around it.

## 1. Choosing the face

**Apple's own family is one strong option, not the default answer.** Its
range is wide and almost nobody uses it:

| Face | SwiftUI | Character | Mockup family |
|---|---|---|---|
| SF Pro | default | neutral, precise | `"SF Pro"` |
| SF Pro Expanded | `.fontWidth(.expanded)` | wide, confident, architectural | `"SF Pro"; font-stretch: 125-150%` |
| SF Pro Condensed / Compressed | `.fontWidth(.condensed)` / `.compressed` | sporty, newsy, dense numerals | `font-stretch: 80%` / `60%` |
| SF Pro Rounded | `.fontDesign(.rounded)` | friendly, soft, tactile | `"SF Pro Rounded"` |
| New York | `.fontDesign(.serif)` | editorial, literary, warm | `"New York"` |
| SF Mono | `.fontDesign(.monospaced)` | technical, instrument, code | `"SF Mono"` |

These are free, scale with Dynamic Type automatically, render perfectly, and
cost zero app size. Heavy SF Pro Expanded at 40pt is a far stronger look than
most custom fonts, and almost no one ships it.

**A custom face is the other strong option**, and the right one whenever the
concept has a voice the system cannot produce: a bakery, a toy, a film, a
magazine. In an exploration of three, at least one direction should try a
non-Apple face. A custom font is a commitment: bundle it, license it for app
embedding, and map it to Dynamic Type with `Font.custom(_:size:relativeTo:)`.
Use it for display only, and keep SF for UI controls, unless the face has a
full text range.

Faces with character that are licensed for apps (OFL unless noted; always
recheck the licence):

- **Serif display:** Newsreader, Gloock, Young Serif, Libre Caslon Display,
  Bodoni Moda, Instrument Serif, Fraunces (use its "wonk" off), Brygada 1918,
  Petrona, Literata (text).
- **Grotesque / sans display:** Bricolage Grotesque, Familjen Grotesk,
  Schibsted Grotesk, Instrument Sans, Hanken Grotesk, Funnel Display, Host
  Grotesk, Mona Sans / Hubot Sans, Archivo (width axis), Big Shoulders
  Display, Geist.
- **Mono:** Geist Mono, JetBrains Mono, IBM Plex Mono, Martian Mono.
- **Fontshare (ITF free licence, check app clause):** Clash Display, Cabinet
  Grotesk, General Sans, Satoshi, Zodiak, Erode, Gambarino.

**Defaults that read as "nobody chose":** Inter, Poppins, Montserrat, Roboto,
Plus Jakarta Sans, Manrope, DM Sans, Nunito, Raleway, Outfit, Space
Grotesk, Syne, Playfair Display, DM Serif Display, Cormorant, Lora. Use one
only if you can state why it beats SF Pro for this concept.

**Two families maximum.** One is often better. A third is a costume.

**SF Mono is a seasoning.** Mono for codes, times and figures in an
instrument is right; mono for a whole app is a costume of a terminal or a
receipt (slop.md §7).

## 2. The scale

iOS ships a scale (in device.css as `.t-*` classes). The native scale is the
floor for text. The design lives in the **display moments** above it.

| Role | Size | Notes |
|---|---|---|
| Hero numeral / display | 48 to 96 | One per screen, at most. Tracking -2 to -4%. |
| Screen title | 28 to 40 | Large title is 34 by default. Push it if the direction wants. |
| Section heading | 20 to 22 | Semibold/bold. Optional: often space alone separates. |
| Body / row title | 17 | The iOS reading size. Don't drop below 15 for primary text. |
| Secondary | 15 | Subhead. |
| Metadata | 13 | Footnote. |
| Tertiary | 11 to 12 | Captions, tab labels. 11 is the floor. |

**Contrast is the point.** A screen with a 64pt number and 13pt labels feels
designed. A screen of 20, 17, 16, 15, 14 feels like a form. Skip steps. Aim
for five to seven sizes per app, total.

**Weight contrast is two steps or more.** Regular against Bold, Light against
Semibold. Medium next to Semibold is invisible and looks like a mistake.

**Heavy weights for big, light weights never small.** Black/Heavy is for 28pt
and up. Light and Thin are for 34pt and up and only on solid grounds.
Thin text at 15pt is unreadable.

## 3. Tracking and leading

- SF Pro is optically sized: let `font-optical-sizing: auto` (mockups) or
  the system (SwiftUI) do the work in the text range.
- **Display sizes need negative tracking.** At 48pt+, -1.5 to -3%. Heavier
  weights tighter, Expanded widths less tight, Compressed slightly tighter.
  SwiftUI: `.tracking(-1)` or `.kerning`.
- **Small caps labels need positive tracking**: +4 to +8% at 11 to 12pt.
- Leading: display 1.0 to 1.1, titles 1.15 to 1.25, body 1.29 (iOS default
  22/17), long prose 1.4 to 1.5.
- **Light on dark** reads thinner: one weight step up or +0.2pt tracking.

## 4. Numbers

- `font-variant-numeric: tabular-nums` / `.monospacedDigit()` for anything that
  changes, counts, or sits in a column. **Check the face has them**: many
  display faces (Big Shoulders, most serifs) have no tabular figures, so a
  ticking number jitters. Use SF for live figures, or a face that has `tnum`.
  Some serifs default to old-style figures; set `lining-nums` for clocks.
- Currency: make the cents smaller and higher, or lighter. `$1,284` large
  with `.37` at 50% size is a classic premium move.
- Units small, next to the big number, in a lighter weight or secondary colour:
  `23` big, `days` small.
- Rolling numbers on change: `.contentTransition(.numericText())`.

## 5. The emphasis word

The Five Minute Journal move: a roman headline with one italic word.
*"Keep track of your **mood**."* It works because:

- It is **one family**, roman and italic, never two families.
- The italic word is **the one that carries the meaning**, not a random
  adjective.
- It appears in **headlines only**, and not on every headline.

New York has a beautiful italic. SF Pro's italic is weaker for this; with SF,
emphasise by weight (Regular headline, one Bold word) or colour (one word in
the accent).

## 6. Alignment and wrapping

- **Left-aligned by default.** Centre only short, isolated display moments
  (an empty state, a big numeral, a celebration).
- Balance multi-line headlines (`text-wrap: balance`; in SwiftUI break
  lines deliberately or constrain width). No widows on a two-line title.
- Truncate with intent: one-line titles truncate at the tail, never
  mid-word.
- Line length on iPhone is naturally fine; do not shrink margins to fit more.

## 7. Dynamic Type

An award-level app survives the accessibility sizes. Design at the default
size, then check the largest: stacks that go horizontal at default should go
vertical at accessibility sizes (`ViewThatFits`, `dynamicTypeSize`). Never
fix a text size to protect a layout.
