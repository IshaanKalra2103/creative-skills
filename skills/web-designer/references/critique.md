# Critique

The designer always grades too kindly: they see what they meant. Whenever
possible the critique is done by **fresh eyes**, a separate agent that sees
the rendered PNGs, not the reasoning.

## One critic, for the whole job

Spawn the critic **once** and keep talking to the same agent every round
(continue it with SendMessage, or your harness's equivalent). A new critic
each round brings new taste, reverses the last one's asks, and the scores
never converge. **Wait for the critique before editing** (design edits; obvious mechanical
bugs are fixed before round 1). The critic's reply comes back to you as a
message; do nothing to the page until it arrives.

## First message to the critic

> You are a design director at a studio known for award-winning websites and
> web apps (think the work behind Stripe Press, Linear, Apple's product
> pages, Pentagram's digital projects). You will critique one <site / web
> app> over several rounds.
>
> Concept: "<concept sentence>"
> Who it is for and what they come to do: <from the brief>
> Colour system (what each colour means): <roles from DIRECTION.md>
> Refused defaults (deliberate; do not ask for them back): <the category
> default and the slop faces refused, from DIRECTION.md>
> Rubric: <skill>/references/critique.md (read it) and the four slop faces
> in <skill>/references/slop.md.
> Round 1 renders (open every one at full size): <absolute PNG paths: the
> four first screens, every numbered full-page slice at 390 and the widest,
> dark if any, the matrix sheet, and the signature's filmstrip strip.png>
> Judge the signature from the filmstrip; judge sizes from the slices, not
> from a downscaled full page.
>
> Score each rubric line 1 to 5 with one sentence of evidence pointing at
> something visible. Then list the five changes that would raise the lowest
> scores most, each specific enough to execute (which section, which element,
> what value). A 4 means you would ship it at a top studio; a 5 means it
> goes in your portfolio. Judge pixels, not intentions. End with one line:
> "Done / not done by the stop rule".

For a **redesign**, add: "Before: <PNG paths>. Must keep: <keep list>." and
score a 14th line, **Fidelity**: 5 = every kept item present and easier to
find; 2 = items missing.

Each later round: "Round N. What changed, and which asks I declined with
reasons: <list>. New renders: <paths>. Rescore, say which asks landed, give
the next five."

## Declining an ask

Decline, with a one-line reason in CRITIQUE.md, any ask that brings back a
refused default, undoes an earlier ask from the same critic, or breaks a
hard rule. Also decline asks that fill every quiet area with something: one
generous rest per page is a decision (layout.md), not a gap to fix. Tell the critic, so it stops asking.

## When asks conflict

The scan's and matrix's FAILs win over any ask. A critic's ask that creates
a FAIL (labels that clip, text that collides) is declined with the reason.
When two asks from the critic conflict, tell it, and ask which it would
keep. Warns may be overridden by a critic's ask with a one-line reason.

## When to stop

- **Done:** no line below 3, and at least 10 of 13 lines at 4 or above, and
  the scan and matrix have no FAILs.
- **Plateau:** two rounds with no score change: make one structural change
  (a different first screen, a different richness source, a different
  grammar) and run one more round, or stop.
- **After done:** fix the concrete defects the critic still named, once.
  Verify them with the scan, the matrix and your own eye, list them in
  CRITIQUE.md as "fixed after the last round, not rescored", and stop. Do
  not open another round for them.
- **Budget:** four rounds. Then report the honest scores. A truthful 3 is
  worth more than an inflated 4.
- **No way to continue the critic:** start a new one with the previous
  CRITIQUE.md, and tell it to judge whether those asks landed.

## The rubric

| # | Line | 5 looks like | 2 looks like |
|---|---|---|---|
| 1 | **Concept on the page** | Cover the logo and you could still name the concept from any screen | A competent site of the category; the concept lives only in the doc |
| 2 | **Not the category average** | Nothing like the top three competitors, and better for it | Shares the category's structure, palette or type |
| 3 | **Not a slop face** | Shares at most one feature with the four faces in slop.md, and is not the overcorrection | Paper Edition, Launch Page, shadcn Dashboard, Dark Dev Tool or the studio portfolio |
| 4 | **First screen** | Evidence, what it is, and the action, all in the first viewport on desktop *and* phone; the squint test lands on the right thing | A slogan and two buttons; the proof is below the fold; the phone fold is empty |
| 5 | **Typography** | Faces with a voice and a reason, a scale with real contrast, tuned tracking, a comfortable measure, tabular figures where needed | Default faces, sizes a step apart, loose display type, long lines |
| 6 | **Colour** | A palette you could name, one accent with one job, dark mode designed (or declined on purpose in DIRECTION.md, which is not a penalty), everything passes contrast | Arbitrary, timid or confetti; dark mode inverted |
| 7 | **Richness** | Something to look at that belongs to this product, with one art direction | All text on paper, or stock and placeholders |
| 8 | **Structure and rhythm** | Sections that each answer a question, tight groups and generous breaks, few verticals | The template sequence, uniform gaps, boxes in boxes |
| 9 | **Craft** | No clipping, no wraps in buttons, real content, consistent icons, aligned edges, concentric radii, considered states | Misalignments, placeholder smell, broken states |
| 10 | **Responsive** | The phone is designed, not stacked; tablet and wide screens hold | Desktop squeezed; awkward 768; a lonely column at 1920 |
| 11 | **Everyone's computer** | The matrix is clean: Windows scaling, Linux fonts, High Contrast, Firefox/Safari, l10n, reduced motion, keyboard focus | Sideways scroll on Windows, vanishing controls in High Contrast, wraps in German |
| 12 | **Signature** | One interaction or moment you would describe to a friend, born from the concept | None, or a generic animation |
| 13 | **The screenshot test** | A designer would screenshot it and post it | Nobody would remember it tomorrow |

## Writing CRITIQUE.md

Per round: the scores table, the five changes, and after the next round,
whether each landed. Keep the history; the trend is the evidence.
