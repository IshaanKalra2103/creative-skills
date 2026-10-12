# Loopcast — 57.5 s launch film

The launch film for Loopcast, an agent pipeline built on TinyFish (Search, Fetch, Agent, Browser) that finds what's trending in a niche, scripts and renders a short video about a brand, has synthetic personas critique it, and waits for a human to approve. It was built shot for shot on the structure and timing of a reference promo (DMflo, motion by @that.product.guy) and adapted to Loopcast's own content. Every number on screen comes from two real runs.

| scene | window | beat |
|---|---|---|
| `problem.js` | 0 – 10.66 | rival's reel goes viral → team pings flood in (badge to 99+, 24 pills) → 1 AM pasting links (clock, ⌘C/⌘V keycaps, "saved 3 of 569") → "every trend you miss is reach you lose" + TREND MISSED stamp |
| `brand.js` | 10.44 – 13.8 | mascot drop + squash, lime → purple ring wipe, wordmark letter drop, "Your content loop, on [toggle] autopilot." |
| `how.js` | 13.5 – 24.1 | iMessage thread on a tilted phone with the mascot on top: NICHE sticker, RUN STARTED, starburst + paper plane, draft v1 lands with the real thumbnail, "Even better" options card with two toggles, the QA → rewrite → APPROVE exchange, then the phone zooms to black |
| `team.js` | 23.95 – 34.8 | "Four TinyFish primitives." Search / Fetch / Agent / Browser cards, each lifting and demoing on its VO word |
| `scan.js` | 34.15 – 37.98 | lime field: SCANS 001→046 POSTS, the platform word cycler, the r/TimeManagement thread → hook sticker |
| `dash.js` | 37.7 – 41.45 | the phone app, then the live dashboard window with a "you" cursor clicking Approve |
| `cli.js` | 41.05 – 48.62 | "Just one command." with the terminal running `gtm run` / `report` / `approve` |
| `price.js` | 48.25 – 50.76 | circle wipe out of the mascot, the loop ring draws, "$0.27 a run.", FREE sticker |
| `end.js` | 50.45 – 57.5 | lockup, "Every trend, turned into a reel.", mascot → icon, CTA + cursor click |

`vo_words.js` holds the real placed word timings of the ElevenLabs take (Sarah, speed 1.15), so the picture renders without any API call. `script.json` and `music.json` rebuild the audio.

## Assets

- `assets/shot_0.jpg`: a phone-sized screenshot of tinyfish.ai, captured by TinyFish Browser during the run (the "Browser" card).
- `assets/tin13_v1_f0.jpg`, `dash_*.jpg`: frames of Loopcast's own generated draft reels. The person in them is AI-generated.

Replace these with your own product's screenshots and outputs when you adapt the film.
