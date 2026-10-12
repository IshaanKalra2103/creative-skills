# Structure: the beat map

The long form is nine beats in 57.5 s. It was measured off the DMflo launch promo (motion by @that.product.guy, shared on X), which this style was studied from. The Loopcast film follows it to within a few frames. The 20 s template keeps four of the beats.

| # | beat | reference window | what it does | VO pattern (reference line → Loopcast line) | out |
|---|---|---|---|---|---|
| 1 | **Hook** | 0 – 4.2 | the outcome the viewer wants, happening to someone else or about to slip away. Phone with a viral post; the headline rises word by word | "Your reel just went viral." → "Your rival's reel just went viral." | stickers flood in |
| 1b | **Pile-up** | 2.0 – 4.3 | the demands arrive as sticker cards, then a pill flood; a counter runs away | "Price, link please, how much." → "What format? Can we copy it? By Friday?" | dim to night |
| 1c | **The grind** | 4.3 – 7.5 | the manual workaround at a bad hour: a big clock, keycaps, a phone notes screen filling up, a "saved N of M" counter | "It's 2 AM and you're still copy-pasting links." | grey |
| 1d | **The loss** | 7.5 – 10.3 | the cost in one sentence split across the frame, with a stamp on proof (a DM thread) | "Every DM you miss is a sale you lose." → "Every trend you miss is reach you lose." | phone drops, dark |
| 2 | **Brand reveal** | 10.3 – 13.8 | the mascot drops and squashes, ring wipe to the brand colour, wordmark letters, tagline + toggle "on autopilot", mascot spin | "Meet DMflo, your Instagram on autopilot." | right wipe |
| 3 | **How it works** | 13.8 – 23.8 | tilted phone + mascot on top + starburst. Three sub-beats: trigger (keyword sticker), result (the thing lands in the phone, with a speed tag), "even better" (an options card with two toggles) | "Someone comments price and boom, the link lands in their DMs in seconds. Even better…" | phone → black zoom |
| 4 | **Behind it** | 23.8 – 34.5 | dark, "A team of AI agents." / "Four TinyFish primitives.", four cards rise, each lifts and demos on its VO word | "One answers… one spots… one hides… one catches…" → one line per primitive | diagonal wipe |
| 5 | **Breadth** | 34.5 – 37.9 | accent field, mascot left, a counter and a word cycler (languages / platforms), then one surprising specific with a sticker + bubble | "In over a hundred languages, yes, even Hinglish." → "From TikTok to TechCrunch, yes, even Reddit." | panel rises |
| 6 | **Surfaces** | 37.9 – 41.3 | the phone app rises (with platform tags), then a desktop/web window slides in behind it with a named cursor doing something | "Run it all from your phone or the web app with your whole team" | dark panel rises |
| 7 | **Power user** | 41.3 – 48.4 | dark, "Just ask your AI." / "Just one command.", connector icons drawing in, a big chat/terminal panel that fills with a real session, a sticker slams in | "…or just ask Claude or ChatGPT. Launch automations, check engagement, pull your leads right from the chat." | circle out of the mascot |
| 8 | **Offer** | 48.4 – 50.7 | brand field, a ring draws around the mascot, the price or setup time huge, a "FREE" sticker slams in | "Two minute setup, free to start." → "Twenty-seven cents a run. Free to fork." | curved wipe |
| 9 | **End card** | 50.7 – 57.5 | lockup letter-drop, tagline with highlight box, mascot → app icon on the final hit, CTA row + cursor click, hold | "DMflo, every comment and every DM answered." → "Loopcast. Every trend, turned into a reel." | end |

## Shorter cuts

| length | beats | template |
|---|---|---|
| 20 s | 1 (hook + pile-up) · 2 · 4 (three cards) · 9 | `template/` (Orbit) |
| 30 s | 1 · 1d · 2 · 3 · 4 · 9 | |
| 45 s | 1 · 1c · 1d · 2 · 3 · 4 · 6 · 8 · 9 | |
| 57 s | all | `examples/loopcast/` |

Keep the brand reveal between 18% and 25% of the way in. Keep the end card at 4–7 s, because the CTA needs about 2 s of hold after the click.

## Adapting to a product

1. **Fill the beats with real things.** Write down, for this product:
   - the viewer's desired outcome (hook)
   - the pile of demands (pile-up)
   - the bad-hour workaround (grind)
   - the cost (loss)
   - the one-line promise ("X on autopilot")
   - the trigger → result → "even better" mechanic
   - the 3–4 parts under the hood
   - one breadth list plus one surprising specific
   - where it runs (surfaces)
   - the power-user path
   - the offer
   - the closing line
2. **Use real numbers only.** Counts, prices and times come from real runs, docs or the site. Never invent a stat, because the viewer pauses the video. The Loopcast film's numbers all come from `runs/tinyfish-demo-1` and `runs/TIN-13`: 20 reels + 8 threads, 8 Shorts via Agent, 4 shots for $0.015, v1 5.3 → v2 5.7 → v3 5.7, $0.27 and 16.9 min.
3. **Write the script against the reference's line starts** (`scripts/ref_words.py` gives them). Match each line's length within ~10%. `vo.py place` prints DRIFT when a line runs over its slot; shorten that line, don't move the slot.
4. **Swap the specifics, keep the mechanics.** Language cycler → platform cycler. DM thread → iMessage thread. "Ask Claude/ChatGPT" → "one command" in a terminal. A beat's *function* (pile-up, loss, proof, breadth) matters more than its props.
