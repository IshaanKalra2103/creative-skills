# Colorfigures

A Claude skill. Describe an everyday object in one line and Claude draws it hand-inked and isometric, as one
self-contained HTML file with buttons that actually work: real 3D bodies shaded in flat light, mid and dark bands,
a heavy ink silhouette with finer inner lines, a flat blue cast shadow, a hand-drawn wobble, warm paper and
body-colour swatches. Ask how something works and it labels the parts, lighting each one up as it works.

Live examples: https://april-zhu.com/colorfigures-demo · Skill page: https://april-zhu.com/colorfigures

## Install

**Claude Code** — paste in Terminal, then restart Claude Code:

    mkdir -p ~/.claude/skills && curl -fsSL https://april-zhu.com/colorfigures/colorfigures.tar.gz | tar -xz -C ~/.claude/skills

Or unzip `colorfigures.zip` and move the `colorfigures` folder into `~/.claude/skills/` (or `.claude/skills/` inside a project).

**Claude.ai** — download `colorfigures.skill` and upload it in Settings → Capabilities → Skills, then switch it on.

## Try

- a gumball machine where I can put in a coin and turn the crank
- a record player: put on a record, drop the needle and it plays
- a kettle that boils and clicks off by itself — show how it knows when to stop
- how does a toaster know when to pop? make it a Colorfigure

Claude saves an `.html` file. Open it in your browser and press things.

## What's inside

- `SKILL.md` — the instructions Claude follows
- `assets/core.js` — the engine: projection, 3D shapes and shading, ink, labels, the page with its buttons and controls
- `assets/examples/` — complete figures to learn from (vending machine, washing machine)
- `scripts/build.py` — makes one self-contained file: `python3 scripts/build.py figure.html OUT.html`

Plain text only. Nothing runs on install; figures run in the browser like any web page, with no outside requests.

## Credits

- Built on [ISO-GLOW](https://isoglow.dev) by April Zhu (MIT).
- ISO-GLOW is built on [iso-figure](https://github.com/MrBongoC/ai-iso-skill) by Tolga Cohce (MIT).

## License

MIT. See [LICENSE](LICENSE).

Made by April · [@Aprilzz423](https://x.com/Aprilzz423)
