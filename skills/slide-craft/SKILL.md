---
name: slide-craft
description: Build a presentation as one self-contained HTML deck — fixed 1280×720 slides, a thumbnail rail, presenter mode with speaker notes, and print-to-PDF — with a typographic system that looks curated rather than generated. Use for any request to make slides, a deck, a presentation, a pitch, a readout, or to help someone prepare to present at a meeting ("I'm presenting to the board", "turn this into slides", "deck for Tuesday"). Covers the thinking (audience, spine, the ask) as well as the build.
---

# Slide craft

A deck is a story told to a specific room to get a specific outcome. Not a document with
bullet points. This skill covers both halves: work out what the deck is *for*, then build
it in a template that is hard to make ugly.

## Rule: nothing gets built before the spine exists

Before writing any HTML, do three things in order.

1. **Read the ground truth.** Whatever the project has: the repo and its docs, run logs and
   reports, Slack (via a Slack tool if one is available), meeting notes, the calendar, past
   decks. One search is not research. Find who is in the room, what they already believe,
   what is actually contested, and what happens if the deck lands.
2. **Name the thing.** In two or three sentences, state the single tension, decision or
   insight the deck exists for. Make a call. "There are several angles" means you haven't
   found it yet.
3. **Ask the user what research cannot tell you** — with `AskUserQuestion` (load it via
   ToolSearch if deferred), not plain text. Two kinds, and the second is the one that earns
   your keep:
   - **Operational:** who presents, how long, live or sent, which source material — only
     when you genuinely couldn't find it.
   - **Provocations:** the questions they haven't asked themselves. What is the one
     sentence the room should repeat afterwards? What part are they nervous to say out
     loud? What does the argument look like at its boldest? What is the version with half
     the slides? Ground every option in something you actually found; invented options are
     worse than no question.

Then pick the arc yourself and build. Don't bounce the outline back for approval — show a
draft, let them redirect.

Say one short line before a long build ("Got it: the case for dropping the broad keywords.
Building now.") so the user isn't watching silence.

## The shape of a deck

- **One idea per slide.** If the beat is "X, then Y, then Z", that is three slides.
- **Open on the claim, not the agenda.** No "Agenda" slide unless the room expects one.
- **End on the ask.** Who decides, what, by when. A deck with no ask is a memo.
- **The spine sits alone.** One slide carrying the single sentence, no decoration.
- **Length follows the story.** A standup is 3–5 slides; a board deck can be 15. Never pad.
- **A heading states the finding, not the topic:** "Two thirds of the list is engineering",
  not "Analysis of the list".
- **Cut with a whole hand.** The version with 40% fewer words is usually the better deck.

## Voice

Write like a sharp colleague talking. Short sentences. No filler ("leverage", "robust",
"crucially"), no hedging, no emoji, no exclamation marks. Numbers beat adjectives: "36 of
323" beats "a small minority". Say the uncomfortable part plainly.

## Never do these (they are what "AI slop" looks like)

- A thin accent rule or underline bar under every title.
- Full-width coloured header or footer bars, ribbons, stripes.
- A rounded card with a thick coloured left border for every callout.
- Beige, cream or purple-gradient backgrounds; the paper is white and the accent is one
  colour used sparingly.
- Centred body text, or a centred title on a content slide (title slides and pure hero
  slides are the exceptions).
- Emoji as bullets or decoration. Icon sets as filler.
- Six bullets of equal weight, each a full sentence.
- Drop shadows everywhere, gradient fills on charts, 3-D anything.
- Peer statistics rendered at different sizes because one has more digits.
- A slide whose content overflows the canvas. Cut instead.

Hierarchy comes from size, position and space. If a slide needs decoration to look
finished, it needs fewer words instead.

## Build

Copy `assets/` next to the deck and edit only the HTML:

```bash
D=<deck-folder>; mkdir -p $D
cp <skill>/assets/{deck.css,deck.js,template.html} $D/ && mv $D/template.html $D/index.html
```

- Every slide is `<div class="slide-wrap" data-title="Rail label" data-notes="Speaker note"><div class="slide"><div class="slide-canvas [variant]">…</div></div></div>`.
- **Never author `.slide-body` or a `.slide-meta`** — `deck.js` injects both, including the
  date, the deck title (from `<title>`) and "03 / 09".
- Canvas variants: default (title top-left, content below), `slide-canvas--title` (the
  title slide and the ask), `slide-canvas--center` (a statement, a figure, a quote alone),
  `slide-canvas--stage` (title pinned top, the rest optically centred in `.slide-stage`).
- Author at slide pixels using the token classes. Never write `font-size`, `clamp()`, `vw`
  or `vh` inside a canvas; the whole 1280×720 canvas scales as one.
- `<title>` is a 4–7 word label shown on every slide. No dashes in it.
- Put text in real text tags (`<p>`, `<h1>`–`<h3>`, `<li>`, `<blockquote>`), never bare
  `<div>`s, so it stays editable and accessible.

### Tokens

| Use | Class / tag | Size |
|---|---|---|
| Title-slide headline | `<h1>` | 108 |
| Slide title | `<h2>` | 52 |
| Sub-head in a column or panel | `<h3>` | 22 |
| Eyebrow / label | `.eyebrow` | 15 caps |
| Subtitle under a headline | `.subtitle` | 30 italic |
| Body | `.body` | 25 |
| Serif lede | `.lede` | 34 |
| The spine, alone on a slide | `.statement` | 76 |
| One big number | `.figure` + `.figure-context` | 168 / 25 |
| Peer stats (2–3) | `.stats` > `.stat` > `.stat-value` + `.stat-label` | 84 / 19 |
| Rows of findings (3–5) | `.rows` > `li` > `.n` + `.t` + `.d` | 27 / 19 |
| Columns or compare panels | `.cols` (`--n:2|3`), `.panel`, `.panel--ink` | 21 |
| Quote | `.quote` + `.quote-by` | 46 / 18 |
| Caption, source line | `.caption` | 15 mono |
| One highlighted word | `.accent` (italic serif) | — |

### Space budget

720 tall, minus 56 top and bottom padding, minus the meta row and its 52px gap, leaves
about **500px of body**. An `<h2>` plus its rhythm eats ~130 of it. So a content slide
holds *one* component and at most one line of lede. Bullets: 3–5, short. Columns: 3 max,
one sentence each. When it doesn't fit, split the slide.

### Charts

Only when the shape of the data is the point; a single number is a `.figure`, never a
chart. Trend over time → line. Comparison → bars, sorted, with the key bar in the accent.
Parts of a whole → a stacked bar, not a pie. Put the takeaway in the heading, keep axes
minimal, drop gridlines, and always add a `.caption` with source and n. Inline SVG is
usually lighter than a chart library; if you want one, Chart.js from a CDN works, but the
deck then needs the network.

## Deliver

- Open it: `open <deck>/index.html`. Arrow keys or trackpad move one slide; `P` presents
  full screen with speaker notes; `G` is the light table; `Esc` exits.
- PDF: present, then print to PDF (the print stylesheet gives one slide per landscape page,
  no chrome).
- Sharing: the folder is three files. If a published link is wanted and an artifact tool is
  available, publish the folder with `index.html` as the page and the other two as files.
- Reply with the path, the spine in one line, and what you deliberately left out.
