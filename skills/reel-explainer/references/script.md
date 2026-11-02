# Topic and script

Distilled from 25 reels (speedy_devv, made with his KEY FRAMES pack, Oct 2026). Full notes, one entry per reel:
`~/Documents/projects/reel-explainers/LEARNINGS.md`. The scoreboard is the reason for every rule below:

| reel | likes | length | what it was |
|---|---|---|---|
| touchscreen | 667K | 85 s | "reacts to a light brush, ignores a hard pen", gold field arcs on one cross-section, no mascot |
| iPhone keyboard | 482K | 79 s | invisible touch zones resize per letter; % on each key; 10K comments |
| PS5 open source | 90K | 108 s | villain + underdog news hook |
| laptop on charger | 51K | 90 s | myth as a command, busted, then the setting to toggle |
| AirPods ANC | 51K | 82 s | one ear-canal set, gold sound vs blue anti-noise |
| Pliny jailbreaks | 31K | 149 s | a character hook, then a rule for your own AI tools |
| "Let's design Cloudflare" | 2 | 151 s | a lecture with no running example |
| LG TV spying | 78 | 97 s | news recap, listicle, mid-reel like-bait, comment-gate |

The everyday-device mechanism reels beat the dev and news reels by 10–100× in the same week.

## 1. Pick (or reshape) the topic

Score the idea before writing a word. The strong ones tick most of these:

- **An invisible mechanism inside something the viewer touches every day.** Screen, keyboard, battery, earbuds, trackpad, card tap, microwave, fridge. The viewer can't see it even after they know, so the video is the only way to see it. That is the value.
- **A paradox they can test right now.** "Your screen reacts to the lightest brush and ignores a pen pressed hard." "Every key is smaller than your thumb and you still hit it."
- **A universal annoyance for the story.** Gloves in winter, wet hands, autocorrect, a hot phone, battery anxiety, hanging up with your cheek.
- **A myth people repeat**, which you bust ("unplug at 100%", "close your apps").
- **Something to do at the end.** A setting to toggle or a test to run, shown in the real UI.

Weak shapes, and how to rescue them:

- A "Let's design X" system lecture → thread **one running example with characters and real data** through every step (the Supabase reel: a group chat planning who brings the speaker), add a security or scale tension beat, and target the CTA. Even then expect ~10× less reach than a device reel.
- A news recap of someone else's video → find the one mechanism inside the story and explain that, or frame it as villain vs underdog ("Sony wants you to stop owning your games, so the community rebuilt the PS5").
- An abstract AI or maths idea → hang it on a **character** ("How does one guy in his bedroom break every AI model on launch day?") or on the viewer's own tools ("…and what it means for your AI agents"), and give one recurring gauge widget (a next-token probability card).
- A brand dunk or ethics debate → don't.

If the user's topic is weak, say so in one line and offer the reshaped angle. Make the reel they asked for if they still want it.

## 2. Research

Collect 3+ sources and keep `research.md` as a list of facts, each with its source. Every number that goes on screen comes from there, or carries an on-screen "Values illustrative" footnote. Look for:

- one or two **hard numbers** with a source (120 scans a second, Apple; 44 px vs a 320 px screen; 200 corrections a second)
- a **named person, patent, paper or book** (Ken Kocienda's book; the patent figure "FIG. 8B · Hidden hit regions"; an arXiv abstract with the key line highlighted)
- the **honest limitation** (runs at 6 fps; only one game works; "zone sizes from English word counts, not Apple's own model")
- the exact **setting name and path** for the action, per platform

If you approximate a proprietary system, compute it from public data and say so on screen.

## 3. The script skeleton (≈180–230 words, 75–90 s)

1. **Hook, one line, landing in the first second.** Use one of:
   - a paradox or contrast about the viewer's own thing: "Your X reacts to [weak thing] and ignores [strong thing]."
   - a compliment that's secretly a mystery: "You do X perfectly every day. How?"
   - the myth spoken as a command, busted next line: "Stop keeping your laptop on the charger all day. Nope, that's outdated."
   - a character: "How does one guy alone in his bedroom…"
   - villain + underdog: "Sony wants you to stop owning your games, so…"
   Write two hooks and pick the stronger one.
2. **The viewer's question:** "So what is it actually feeling?" / "So where does the noise go?"
3. **Reframe, one counter-intuitive sentence:** "It isn't really X. It's Y." ("It isn't feeling pressure, it's measuring the electricity in your body.")
4. **Story:** "Imagine you're…" with the universal moment ("it's winter and you're answering a call with your gloves on").
5. **Mechanism in tiny physical steps,** one picture per sentence. Plain words first; **the technical term comes last** ("Apple calls this anti-noise").
6. **Twist:** "But…" ("But the copy is never perfect." / "But your glove doesn't conduct anything.")
7. **Proof:** the numbers with their source; the named person, patent or paper.
8. **"That's also why…" ×2:** consequences the viewer recognises from their own life (rain makes fake touches; touchscreen gloves have conductive thread).
9. **Action, if any:** the exact setting or test ("There's a test for that in your iPhone settings. It's called Ear Tip Fit Test.").
10. **Poetic reframe that flips the opening:** "So your screen never felt your finger. It felt a tiny bit of charge go missing, and your finger was just the thing that took it."
11. **CTA, last line only:** "Send this to the friend who [specific relatable behaviour]." ("…whose phone never works with wet hands", "…who blames autocorrect for everything"). The blame target is the share trigger.

Also:

- **Voice the viewer's objection once**, mid-reel, and answer it ("So if it's always on the charger, it sits at 100% all day, and I'm wrecking it?" "Not on most recent laptops.").
- Short spoken sentences, second person, present tense. No jargon before its picture.
- **Never ask for likes, shares or follows mid-reel.** The LG flop did; Instagram appears to bury that. Comment-gates ("comment PS5 and I'll send the link") only for tool or news reels with a real link to give.
- One mechanism, one running example, no chapters. Under 90 s unless the topic truly needs more.

## 4. Writing script.json

One `lines` entry = one caption on screen = one sentence or a clause of one. Keep lines to ~6–14 words so the caption stays within 2 lines. Wrap **exactly one keyword per line** in `*asterisks*`: the noun the picture shows, or the twist word (`*finger*`, `*pen*`, `*invisible*`, `*Nope*`). Multi-word keywords are fine (`*anti-noise*`, `*Ear Tip Fit Test*`).

Targets (`[3.6, "..."]`) are rough start times. vo.py pushes a line later if the one before runs long and prints the drift. Leave ~0.25 s between sentences and ~0.6 s before the reframe and the CTA, so they land.

Tokenisation: each word is one token with no inner spaces, so "T-I-M", "120", "4.5" and "AirPods" stay single words in both the script and the TTS alignment. Write numbers the way the caption should show them (digits for stats, words for small counts in speech).

## 5. caption.txt (the post caption)

```
<the hook question, plainly>  e.g. How does your phone know it's touching your face?

<one or two sentences that tease the reframe without giving it away>

Sources: <source 1>; <source 2>; <source 3>
```

No hashtag walls and no "link in bio" unless there is a link.
