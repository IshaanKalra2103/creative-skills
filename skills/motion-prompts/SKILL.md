---
name: motion-prompts
description: A categorised library of the real prompts behind 231 motion videos made with Claude Opus 5.5, scraped from prompt-motion.com with the creator credited and linked on every entry. The videos are showreels, product promos and launch films, product explainers, concept explainers, short films, 3D scenes, music videos, UI and logo motion, portfolio reels and games, and they include fill-in brief templates and the four skills shared on the site. Use when the user wants to make a motion-graphics video, launch or promo video, showreel, explainer, animated short or music visual with Claude and wants a proven prompt, a starting brief, ideas, or to see what other people prompted. Also use when they ask you to write a motion-design prompt, or to refresh the library from the site.
---

# Motion Prompts

Every prompt from [prompt-motion.com](https://prompt-motion.com/), a gallery of motion videos made with Claude Opus 5.5 that is curated by [@p4nthera_](https://x.com/p4nthera_). Prompts are grouped by what they make. Identical prompts are merged into one entry that lists every video made with them. Each entry links the creator's original post, the video file and the gallery page.

**First run:** the prompt text belongs to its creators, so it isn't committed. If `prompts/` is missing, run `uv run scripts/update.py` from this folder. It fetches the gallery, about 7 s with no browser, into `data/prompts.json` and renders `prompts/`.

| path | what it is |
|---|---|
| `prompts/<category>.md` | Generated, not committed. The prompts in one category. Each file starts with **Reusable briefs** (templates and long, fully specified briefs) and then lists the rest, with the most-reused prompts first. |
| `data/prompts.json` | Generated, not committed. Every entry as data: title, creator, handle, post URL, video and poster URLs, video size, prompt, skill, model, iterations, stack, effort, posted date, category and tags. |
| `data/categories.json` | The category definitions and the slug → category assignment. Edit this file to recategorise an entry. |
| `scripts/update.py` | Re-scrapes the site and re-renders everything. See *Refreshing*. |

## Using it

1. **Pick the category** from the table below and open its file. To filter, grep the tag chips on each entry: the stack (`` `Remotion` ``, `` `HyperFrames` ``, `` `Three.js` ``), `` `template` ``, `` `long brief` ``, `` `vertical` ``, `` `one-shot` ``, or a language code such as `` `ja` ``. You can also query `data/prompts.json` with `jq`.
2. **If the user has a product, start from a reusable brief.** Ask for exactly what its `<inputs>` block or placeholders ask for, such as the product name, colours, UI moments or a track with a drop, then fill it in. Don't invent what the brief expects the user to supply.
3. **Otherwise adapt the closest short prompt.** Keep the parts that do the work, and change the subject, length, aspect ratio and stack. Short prompts are meant to run inside a project that holds the context: the product repo, the landing page or the assets.
4. **Show the user where it came from.** Quote the prompt you started from and link its entry so they can watch the result first.

To build the video itself, use the sibling skills in this repo: `motion-reel` (Python + skia + ffmpeg reels), `motion-replica` (an HTML page rendered frame by frame with Playwright), and `fframes-fx` (Rust + SkSL shader effects).

## What the prompts that worked have in common

- **A length and a bar, not a storyboard.** The most-copied prompt is one sentence: a dynamic 15-second video that shows what an incredible motion designer you are, like a showreel for a résumé, "go all out". It produced a third of the gallery. Ten to 40 seconds is the norm.
- **Research first, then real assets.** The product prompts tell the model to read the site, repo, landing page or roadmap before it designs anything. They also ask it to use the product's real components, logo, colours and font, to trace the logo to SVG, and to break screenshots into parts it can animate instead of panning over them.
- **Sound decides the cut.** Prompts ask for a scored or royalty-free track with a clear drop (about 120 BPM), cuts and hits that land on beats, and "a sound on every hit". Some ask for the music to be composed in code.
- **Structure for promos.** A hook in the first second, one idea per shot, and 4–5 scenes with short titles (problem → what it does → how it works → proof → name), ending on a clean final frame.
- **Deterministic rendering.** Every frame is a pure function of time. An HTML/JS or canvas page is captured frame by frame with headless Chrome or Playwright, then put together with ffmpeg, with motion blur and code-generated sound.
- **Name the giveaways to avoid.** Frames and text in the corners, a beige "artsy" look, eyebrow labels, raw screenshots, and "a glorified PowerPoint".
- **Stacks:** Remotion, HyperFrames (+ GSAP), plain HTML/Canvas/SVG + Playwright, three.js, Manim + edge-tts, Python + ffmpeg, and Blender. Of the entries that report iterations, almost all were one-shot.

## Index

<!-- index:start (generated by scripts/update.py) -->
231 videos from [prompt-motion.com](https://prompt-motion.com/), all made with Claude Opus 5.5, 228 with a prompt and 4 with a skill. Languages: en 208, zh 10, ja 7, fr 2, tr 1, es 1, ko 1, de 1.

| category | prompts | videos | what's in it |
|---|---|---|---|
| [Showreels & carte blanche](prompts/showreels.md) | 33 | 66 | Open-ended show-off pieces with no product: the viral "show what an incredible motion designer you are" prompt, its variants, and "surprise me" briefs. |
| [Product promos & launch films](prompts/product-promos.md) | 85 | 86 | Launch videos, ads, hype edits, pitches, teasers and milestone posts for a named product, app, site, brand or event. |
| [Product explainers & demos](prompts/product-explainers.md) | 13 | 14 | Videos that explain how a specific product or business works, walk through a feature, or teach a tool. |
| [Explainers, education & info](prompts/explainers.md) | 16 | 17 | Concepts, science, maths, CS, history, news recaps and recipes, explained in motion. |
| [Stories & short films](prompts/stories.md) | 9 | 9 | Narrative animated shorts and cinematic pieces where the model invents or stages a story. |
| [Scenes, characters & 3D](prompts/scenes-and-characters.md) | 10 | 10 | Stylised scenes, character animation, 3D models, and pixel, anime or painterly art pieces. |
| [Music-driven](prompts/music.md) | 5 | 5 | Music videos, lyric videos, beat-synced animation and pieces where the visuals make the music. |
| [UI, logo & motion systems](prompts/ui-and-logo.md) | 6 | 7 | Interface animation, logo reveals, Figma-to-motion, scroll sections and reusable motion systems. |
| [Personal, portfolio & studio reels](prompts/personal-and-studio.md) | 11 | 11 | Self-intros, résumé reels, portfolio videos and studio or agency reels. |
| [Games & interactive](prompts/games-and-interactive.md) | 3 | 3 | Playable games and interactive HTML built alongside or instead of a video. |
| [Edits & follow-ups](prompts/edits-and-follow-ups.md) | 3 | 3 | Short follow-up prompts that remix, re-score or re-cut an existing video or image. |

**Reusable briefs.** Fill-in templates (`<inputs>`, `[product]`, `{{PRODUCT}}`) and long, fully specified briefs:

- [Jev engineering showreel](prompts/showreels.md#jev-engineering-showreel): @polydao, 223 chars
- [Taxtello bookkeeping app film](prompts/product-promos.md#taxtello-bookkeeping-app-film): @daniel_haida, 15,306 chars · `Remotion`
- [Launch video remake comparison](prompts/product-promos.md#launch-video-remake-comparison): @notdwd, 10,419 chars
- [Frame by Frame launch video](prompts/product-promos.md#frame-by-frame-launch-video): @notdwd, 10,311 chars
- [Spotify product film](prompts/product-promos.md#spotify-product-film): @brainextends, 8,142 chars
- [Photo print app launch film](prompts/product-promos.md#photo-print-app-launch-film): @twoclipping, 5,222 chars · `HTML + Playwright`
- [Prompt Motion site promo](prompts/product-promos.md#prompt-motion-site-promo): @antonio_kodheli, 4,024 chars · `Remotion`
- [UGC ad generator promo](prompts/product-promos.md#ugc-ad-generator-promo): @twoclipping, 2,515 chars · `HTML + Playwright`
- [Paper-style product launch film](prompts/product-promos.md#paper-style-product-launch-film): @ik_builds, 1,528 chars · `HyperFrames + GSAP`
- [SaaS launch video](prompts/product-promos.md#saas-launch-video): @aschapmann, 996 chars · `Remotion`
- [Website analyzer product promo](prompts/product-promos.md#website-analyzer-product-promo): @en______ra, 194 chars
- [Email tool promo reel](prompts/product-promos.md#email-tool-promo-reel): @melvynx, 118 chars
- [Animated business explainer](prompts/product-explainers.md#animated-business-explainer): @alex_prompter, 348 chars · `HTML`
- [DistilBook product explainer](prompts/product-explainers.md#distilbook-product-explainer): @sudo_kiran, 339 chars
- [Whiteboard skill tutorial](prompts/product-explainers.md#whiteboard-skill-tutorial): @lemomo_ai, 169 chars
- [“make a dynamic 30-seconds motion graphic video about the…” · 2 videos](prompts/product-explainers.md#make-a-dynamic-30-seconds-motion-graphic-video-about-the--2-videos): @sudo_kiran, 142 chars
- [Speech built as architecture](prompts/stories.md#speech-built-as-architecture): @Gdgtify, 4,373 chars · `SVG/Canvas`
- [Orange dot motion system](prompts/ui-and-logo.md#orange-dot-motion-system): @ultimaxbt, 3,367 chars · `HTML`
- [“Ask me for: 8 to 12 UI states I…” · 2 videos](prompts/ui-and-logo.md#ask-me-for-8-to-12-ui-states-i--2-videos): @twoclipping, 2,711 chars · `HTML + Playwright`

**Skills shared on the site:**

- [Rieranthony/product-film-skill](https://github.com/Rieranthony/product-film-skill): A Claude Code skill that learns your product's design system, interviews you about the film, then builds and renders a launch or landing-page video in Remotion using your real components, logo and music. Install: `/plugin marketplace add Rieranthony/product-film-skill` then `/plugin install product-film@product-film-skill`
- [buildfastwithai/buildfast-skills/tree/main/generative-film-skill](https://github.com/buildfastwithai/buildfast-skills/tree/main/generative-film-skill): A Claude skill that makes an animated MP4 film on any topic, with every frame drawn in code and a synthesised, beat-synced soundtrack. Install: `npx skills@latest add https://github.com/buildfastwithai/buildfast-skills`
- [heygen-com/hyperframes-community-skills/tree/master/skills/session-story](https://github.com/heygen-com/hyperframes-community-skills/tree/master/skills/session-story): Has your agent read your local Claude Code history and turn a typical session with you into a short scored animated film rendered in HyperFrames. Install: `npx skills add heygen-com/hyperframes-community-skills --skill session-story`
- [Leonxlnx/cinetic](https://github.com/Leonxlnx/cinetic): An agent skill that has your coding agent concept, brand, score and render a short cinematic launch film or motion piece from code. Install: `npx skills add Leonxlnx/cinetic`
<!-- index:end -->

## Refreshing

```sh
uv run scripts/update.py --fetch   # re-scrape the site, then re-render
uv run scripts/update.py           # re-render only, after editing data/categories.json
```

The scraper reads the Next.js flight payload that each gallery page embeds, so it needs no browser. New entries go to `prompts/uncategorized.md` and the script prints their slugs. Read them, add each slug to `assign` in `data/categories.json`, and render again.

## Credits

Prompts and videos belong to their creators, and every entry credits and links the original post. That's why this repo ships the scraper, the categories and the index, but not the prompt text. The gallery is curated by [@p4nthera_](https://x.com/p4nthera_) at [prompt-motion.com](https://prompt-motion.com/).
