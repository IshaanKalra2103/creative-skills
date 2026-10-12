# Text: copy and how it moves

## The voiceover drives everything

- One line per beat or sub-beat. Lines run 2–10 words and take 1.2–3.5 s at ElevenLabs speed 1.15. The reference averages about 6 words per 2.6 s line.
- Rhythm: short punches, then one longer line that explains, then a punch again. For example: "Your reel just went viral." / "Price, link please, how much." / "It's 2 AM and you're still copy-pasting links." / "Every DM you miss is a sale you lose."
- Give each line a target start in `script.json`. The scenes anchor to words with `W()`, so on-screen text lands on the spoken word, and changing the VO moves the animation with it.
- Numbers: write them the way they should be *said* ("Twenty-seven cents a run.") and show them the way they should be *read* ("$0.27"). For plain counts, the take's words must still match the script's word count (`vo.py place` asserts it). A hyphenated number counts as one word.

## On-screen copy

- **The headline is the VO line's key words, not a caption.** Use 2 lines of 2–4 words. The second line is bigger and carries the punchline in a colour: accent2Text on paper, accent on dark, pink only for the bad word.
- **Supporting text is mono and small:** eyebrows ("HOW IT WORKS — TEXT → REEL"), tags ("✓ RUN STARTED"), stamps ("8 SHORTS FOUND") and labels ("SCANS 046 POSTS"). It is uppercase, tracked .14–.18em, and states facts.
- **Everything inside devices is plausible product UI with real content:** real thread titles, real hooks, real scores. Chat copy is written like chat ("ooh 👀", "APPROVE 🙌").
- **Lines must never break by accident.** Every headline line is explicit, and URLs and handles are `white-space: nowrap; text-overflow: ellipsis`. Measure widths at build (`getBoundingClientRect` after fonts load) to centre rows and size highlight boxes.

## How text moves (see motion.md for numbers)

| element | in | out |
|---|---|---|
| headline words | rise from mask, per VO word (+0.03 s) | blur + fade, 0.18 s, on the next line |
| wordmark | letters drop with spring, 0.055 s stagger, on the brand word | only by scene change |
| tagline | rise per word | scene change |
| eyebrow | typewriter, 30 cps | with its scene |
| counters | count up with an accelerating curve to the real value | hold |
| word cycler | 0.11 s per word, in lockstep, then settle | swipe up |
| payoff highlight | accent box sweeps under it 0.28 s after it lands | hold |
| terminal / chat | typed input (34–48 cps), then rows tick in on VO words | scroll up under a top fade mask |

## Checklist before rendering

- Every on-screen number is real and matches the VO.
- No straight apostrophes in big type (use ’). No orphaned single characters from wrapping.
- Nothing collides: a headline with a card, a counter with a pill, a tag with a bubble. Check full-resolution frames, not just contact sheets.
- Chat alignment: your bubbles right, theirs left. Injected scene CSS can silently override the base `margin-left: auto` (see gotchas).
- The punchline colour is used once per frame.
