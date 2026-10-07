# Critique

The designer always grades too kindly. They know what they meant, so they
see it on the screen even where it is not. Whenever possible the critique is
done by **fresh eyes**: a separate agent that sees the rendered PNGs, not the
designer's reasoning.

## One critic, for the whole job

Spawn the critic **once** and keep talking to the same agent every round
(continue it with SendMessage, or the equivalent in your harness). A new
critic each round brings new taste, reverses the last one's asks, and the
scores never converge. The same critic remembers what it asked for, so it
can judge whether it landed.

**Wait for the critique before editing.** Work done while the critic is
reading gets judged on the wrong render.

## First message to the critic

> You are a design director at a studio that has won Apple Design Awards.
> You will critique one iPhone app over several rounds.
>
> Concept: "<concept sentence>"
> Colour system (what each colour means): <the colour roles from DIRECTION.md>
> Refused defaults (deliberate, do not ask for them back): <the category
> default paragraph from DIRECTION.md, e.g. "no moon and stars, no
> navy-violet night sky, no cream paper">
> Rubric: <path>/references/critique.md (read it)
> Screens for round 1 (open every one at full size): <absolute PNG paths>
>
> Score each rubric line 1 to 5 with one sentence of evidence that points at
> something visible. Then list the five changes that would raise the lowest
> scores most, each specific enough to execute (which screen, which
> element, what value). A 4 means you would ship it at a top studio; a 5
> means it goes in your portfolio. Judge pixels, not intentions. Judge
> richness and native fluency on what a static mockup can show: drawn
> illustration, shape and colour count fully as richness, and gestures or
> Live Activities that a mockup cannot show are not penalised. Dark mode
> is judged on the dark frames shown; one designed core screen is the
> minimum.

For a **redesign**, add to the first message: "Before (the current app):
<PNG paths>. Must keep: <the keep list>." and score a 13th line, **Fidelity**:
5 = every kept feature present and easier to reach; 2 = features missing.

Ask the critic to end every round with one line: "Done / not done by the
stop rule in critique.md". It reports to you only; nobody else is listening.

Each later round: "Round N. Here is what changed and which of your asks I
declined, with reasons: <list>. New screens: <paths>. Rescore, say which of
your asks landed, and give the next five."

## Declining an ask

The designer may decline a critic's ask with a one-line reason in
CRITIQUE.md. Always decline asks that bring back a refused default, that
undo a change the same critic asked for earlier, or that break a hard rule.
Tell the critic, so it stops asking.

## When to stop

- **Done:** no line below 3, and at least 9 of 12 lines at 4 or above.
- **Plateau:** if two consecutive rounds change no score, stop iterating on
  polish. Either make one structural change (a different hero, a different
  richness source, a layout rethought) and run one more round, or stop.
- **After done:** fix any concrete defect the critic still named (a data
  mismatch, a collision). A change made after the last critique is either
  re-scored or listed as unscored in the report.
- **No way to continue the critic** (the harness cannot resume a finished
  agent): start a new one, give it the previous CRITIQUE.md, and tell it its
  job is to judge whether those asks landed, not to start over.
- **Budget:** four critique rounds at most. Then stop and report the honest
  scores. A truthful 3 is worth more than an inflated 4.

## The rubric

Score 1 to 5. Done is defined in "When to stop" above.

| # | Line | 5 looks like | 2 looks like |
|---|---|---|---|
| 1 | **Concept on the pixel** | Cover the name and you could still guess the concept from any screen | A competent app of the category; the concept only lives in the doc |
| 2 | **Not the category average** | Nothing like the top three apps in the category, and better for it | Shares the category's skeleton, palette or type |
| 3 | **Not this skill's average** | Clearly not grey paper + mono + one red + ruled rows. Lists and controls exist, but they speak the direction's voice (its type, its glyphs, its colour) | Austere, tabular, monochrome; or a rich hero bolted onto a generic settings list |
| 4 | **Hierarchy** | Squint: one thing lands first on every screen, and it is the right thing | Two or more things compete, or nothing leads |
| 5 | **Typography** | The faces have a voice, the scale has real contrast, tracking is tuned, numbers are tabular | Default faces, sizes a step apart, loose display type |
| 6 | **Colour** | A palette you could name and remember, one accent with one job, dark mode designed | Arbitrary, timid, or confetti; dark mode an inversion |
| 7 | **Richness** | There is something to *look at*: image, colour field, shape language, material, with one art direction | All text and rules; a wireframe with good fonts |
| 8 | **Rhythm and space** | Tight groups, generous breaks, aligned to few verticals, nothing cramped or stranded | Even spacing everywhere, or dead gaps and crowding |
| 9 | **Craft details** | Optical alignment, concentric corners, consistent icons, real content, no clipping, believable data | Misalignments, mixed icon weights, placeholder smell |
| 10 | **Native fluency** | Feels like it belongs on iOS 26: glass navigation, gestures, system patterns used with confidence | A web page in a phone frame, or a SwiftUI sample |
| 11 | **Signature** | One interaction you would describe to a friend, born from the concept, shown clearly | None, or a generic animation |
| 12 | **The feature test** | An App Store editor would feature it for its design | Nobody would screenshot it |

## The six quick tests (run them before scoring)

1. **Logo test.** Cover the name. Could this be any app in the category?
2. **Squint test.** Blur your eyes. One landing point per screen?
3. **Category test.** Picture the top three apps in the category. Is yours
   their average?
4. **Specificity test.** Point at any colour, size, gap or word. Can you say
   why it is that and not the default?
5. **Feature test.** What would the Today-tab headline say about the design?
6. **Subtraction test.** Remove one element. Did the screen get worse?

## Writing CRITIQUE.md

Per round: the scores table, the five changes, and after the next round,
whether each change landed. Keep the history; the trend is the evidence.
