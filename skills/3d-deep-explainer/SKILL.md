---
name: 3d-deep-explainer
description: >-
  Build a cinematic, interactive 3D "machine" in Three.js (one file:// folder) that explains how something works.
  A tiny real implementation runs live, so every number on screen is genuine, and data
  flows along a workbench through 6–10 stations with brass, glass and glow, eased fly-throughs, what-if toggles,
  a guided Tour and a recorded video. Use it when someone wants a 3D, interactive, fly-through, "machine",
  3Blue1Brown- or Kurzgesagt-quality explanation of an ML model, algorithm, data structure, protocol or
  physical/biological process, shares a 3D viz to emulate, or says "like the next-word machine". Also use it
  when they want to deeply understand a system and visuals would help, even without saying 3D. Not for static
  diagrams (anatomy, artifact-diagramming) or pure rendered videos (fframes-fx).
---

# 3d-deep-explainer

Turns "how does X work?" into a physical machine on a workbench. Data flows left to right through stations.
Each station is one step of the real computation, made into an object: a lens for a matrix multiply, a cabinet
of drawers for a lookup table, beams whose thickness is a weight, a gauge for a loss. Around it sits an overlay
UI with a title, stat chips, an explanation box, a control panel, a filmstrip of stations and pill labels. It
was extracted from *The Next-Word Machine* (a real 2-layer Transformer in 10 stations, `examples/next-word-machine/`).

```
3d-deep-explainer/
  SKILL.md                      this file: the workflow
  templates/                    runnable starter (3-station "soft lookup": q·k → softmax(τ) → Σ w·v)
    index.html                  overlay UI + import map (three@0.160.0) + bootstrap
    dx-core.js                  kit: materials, MatrixDisplay, Chip, Beam, Rays, Dial, tag(), textPlane()
    dx-world.js                 room, bench, rail, plinths, wall screens, motes, lights
    dx-engine.js                renderer/post, UI from config, camera director + fit, tour, ?record, __dx API
    dx-compute.js               THE REAL COMPUTATION (pure, UMD: page + node)
    dx-explainer.js             topic file: stations, controls, narration, tour (DX.define)
    tools/reference.py          independent numpy reference -> fixtures.json
    tools/verify.js             node: dx-compute vs reference, max |diff|
  scripts/new_explainer.sh      copy the template to a new folder and set the title
  scripts/shoot.py              screenshot every station at 1920/1280/390 + console errors + fps
  scripts/record.py             frame-stepped tour capture -> mp4 (ffmpeg)
  references/design-language.md the look: light, materials, bloom, palette, type, overlay layout, camera
  references/engine-api.md      DX.define config, station contract, api object, URL params, record mode
  references/station-cookbook.md reusable 3D primitives with code and when to use each
  references/real-model.md      tiny-real-model pipeline (uv + torch -> JSON -> JS forward -> verify)
  references/gotchas.md         everything that bit us, with fixes
  examples/next-word-machine/   gold reference (10 stations, dense/MoE, masks, KV cache) + training/
```

Quick start (`S` = this skill's directory, e.g. `~/.claude/skills/3d-deep-explainer`):

```bash
S=<path to this skill>
$S/scripts/new_explainer.sh ./my-explainer "THE TINY" "SORTER"      # copies $S/templates, sets the title
open ./my-explainer/index.html                                       # works from file://, no server, no build
uv run --no-project --with playwright python $S/scripts/shoot.py ./my-explainer/index.html
```

Dependencies: Google Chrome (screenshots and recording drive it headless via Playwright `channel="chrome"`),
[uv](https://docs.astral.sh/uv/) (runs the Python scripts with throwaway envs), ffmpeg (record.py), node (verify
scripts). PyTorch + numpy only for the tiny-real-model path (`uv run --with torch --with numpy`). The page itself
needs only a WebGL2 browser and network access to jsDelivr.

Credits: rendering by [three.js](https://threejs.org) (MIT), loaded from the jsDelivr CDN at a pinned version
(0.160.0) together with its addons (OrbitControls, RoomEnvironment, EffectComposer/UnrealBloomPass/OutputPass,
CSS2DRenderer, RoundedBoxGeometry). Fonts: Outfit and JetBrains Mono (SIL OFL) from Google Fonts.

## The workflow

### 1. Find the true computation first

Before any 3D, write the thing itself: a tiny but real implementation whose intermediates you can print. For an
algorithm, that's plain JS (`dx-compute.js`, pure and UMD so node can run it). For a learned model, train a tiny
one with `uv run --no-project --with torch …`, export the weights to JSON (4 decimals), and write a JS forward
pass that returns every intermediate the stations will show. See `references/real-model.md`.

Why first: the whole value of this format is that the numbers are real. A viewer who changes a toggle should
see the consequence the real system would produce, including the surprising ones. In the Next-Word Machine,
switching a causal model to a bidirectional mask really did change "Claude 0.637" to "Claude 0.467", and that
became the best moment of the explainer. A fake animation can't do that, and fake numbers teach wrong
intuitions.

- Design the data so the behaviour is legible: a toy corpus or input whose correct answer is known (target
  probabilities 0.65 / 0.20 / 0.10 / 0.05, one dominant item, a deliberate near-tie).
- Verify JS against an independent reference (`tools/verify.js`, numpy or PyTorch). Aim for max |diff| < 1e-3,
  print the number, and keep the fixtures. Wrong numbers on a beautiful screen are the worst failure mode here.
- Return everything: raw scores, masked scores, weights, per-unit activations, gates, top-k sets, sums. A station
  can only show what compute returns.

### 2. Design the machine

Write the data flow as a list of 6–10 steps, each with an input, an output, and the one idea a viewer should
leave with. Each step becomes a station on the rail, left to right, on its own plinth with a brass nameplate.
Pick a physical metaphor per concept. The table holds the ones that have worked; full code is in
`references/station-cookbook.md`.

| concept | object | why it reads |
|---|---|---|
| vector / row of numbers | row of glowing cells coloured by value (diverging blue↔orange), numbers on top | magnitude and sign at a glance, exact value on hover |
| typed vector (query, key, value…) | tinted bars, depth ∝ \|v\| | the colour carries the role |
| matrix / linear map | geared glass lens or plate; rays fan from input rows through it to outputs | "the same lens for every row" = weight sharing |
| lookup table / embedding | brass cabinet of drawers; used drawers slide out, rows fly to the rail | a lookup is a pull, not a computation |
| pairwise scores (n×n) | glowing grid plane, rows/cols labelled, masked cells red with −∞ | rows = queries, cols = keys, readable like the board |
| weighted sum | beams from sources to a Σ funnel, radius ∝ √weight; pieces fly in | thickness = how much it contributes |
| distribution / softmax | histogram board, bars re-sort with damped motion, top bar glows | ranking and mass together |
| selection / gating / routing | router dial with gate bars + modules that light up; unpicked ones dark, labelled "never run" | sparsity is visible |
| addition / residual | "+" glyph between displays; brass bypass arch with flowing light | the input skips the block |
| memory / cache / buffer | shelf that gains a column per step; stale entries tinted red | growth over time |
| loss / scalar metric | analog gauge with an eased needle | one number, felt |
| depth / stacking | decks on telescoping posts; Exploded lifts them apart | layers are copies with their own weights |
| discrete items / tokens | glowing glass chips with the word, id badge | "this is a thing, not a number" |

Choose 3–6 semantic colours and keep them everywhere: in 3D, in labels, in the explain-box words, and in the
chips. Set them once with `colors: { query: "blue", key: "green", … }`. Consistent colour does a lot of the
teaching work for free.

### 3. Scaffold, build stations, wire toggles

`scripts/new_explainer.sh <dir> "SMALL" "BIG"` copies the template. Then:

1. Replace `dx-compute.js` (and `tools/reference.py`) with your computation, then run `node tools/verify.js`.
2. In `dx-explainer.js`, set `stations` (name, short, plinth x/w), `state`, `controls`, `text`, `tour`, and
   `build(ctx)`, which returns one station object per entry: `{ setData(R,S), enter(delay), update(dt,S),
   focus(S) → {target, pos, fit}, skipIntro() }`. Full contract: `references/engine-api.md`.
3. Lay stations out at known x positions (a constant table at the top of the file). Put displays on brass stands,
   and leave about 1 unit between stations.

How to build a station well:
- Every station has an intro that starts as the camera arrives (`enter(delay)`): rows pop in, rays fade up, then
  numbers appear. Keep it 1–3 s and gate it on a `tau` clock, so screenshots and thumbnails can skip it
  (`skipIntro`).
- Show the flow: rays or beams from the previous station's output into this one. The viewer should be able to
  trace a number from input to answer.
- Put a few pill labels (`tag()`) per station, scoped to that station, with a short sub-label ("hover a cell",
  "beam ∝ weight").
- Register hover for every value-bearing mesh so the exact value shows (`ctx.hover.push`).

Toggles are where the learning happens. Give each one that changes the computation `rerun` (the default), so it
re-runs compute and every station updates. Good levers are the "what if" questions an exam or a curious person
would ask: change the mask, the temperature, the input, dense vs MoE, hard vs soft, the true label. When a
lever breaks something on purpose (a model trained causal run with a bidirectional mask), say so in the copy.
The broken result is the lesson.

### 4. Write the explanation copy

Each station gets `text(stage, R, S) → { chips: [[label, value]…], html }`:
- 2–3 stat chips (mono numbers): sizes, the key output, a count.
- 2 short paragraphs, casual and precise, then one `.fx` line showing the actual arithmetic with this run's
  numbers (`q·k = 1·0.8 + 0·0.3 + … = 1.70`).
- Every number is formatted from `R`, never typed in. If the copy says "strawberry gets 44%", the bar says 44%.
- Highlight key words with `<em>` (accent colour) and colour role words with the semantic colours
  (`<span class="c" style="--c:var(--c-query)">query</span>`).
- Use the audience's own notation and framing (course slides, paper notation). Mark anything extra as extra.
- Change the copy with the state: a hard-mode or broken-mask sentence replaces the default one.

### 5. Verify in a real GPU browser

```bash
uv run --no-project --with playwright python $S/scripts/shoot.py path/to/index.html      # all stations x 1920x1080,1280x800,390x844
uv run --no-project --with playwright python $S/scripts/shoot.py path/to/index.html --query "mode=hard&explode=1" --stations 3
```

It launches a private headless Google Chrome (`channel="chrome"`, Metal ANGLE), never a shared MCP browser. It
prints fps per station and exits 1 on any console error or warning. Then actually look at the PNGs (Read them),
including mid-animation frames (`record.py --frames 60,240,500`), and fix:
- text that is too small or overlaps (canvas text at ppu ≥ 220; numbers ≥ ~11 px at 1920),
- things hidden behind the HUD (give the focus a `fit` width),
- glow that eats text (bloom only on `toneMapped:false` materials pushed above 0.9),
- labels piling up (scope them by station; add `cond`).

Also check fps at retina density (`--dpr 2`, aim for ≥ 55), the long or edge-case inputs, and every toggle
value at least once.

### 6. Record the tour video

`tour: [{ stage, dur, pre(api), acts: [[t, api => api.set(key, v)]…] }…]` narrates by flying station to
station and flipping the toggles that teach. Aim for 6–15 s per station and 60–90 s total for a full explainer.

```bash
uv run --no-project --with playwright python $S/scripts/record.py path/to/index.html out/tour.mp4 --fps 30 --crf 23
```

`?record` stops the page's own clock. `window.__frame(i)` advances exactly 1/fps per frame and renders, so the
capture is deterministic and never drops frames, whatever the machine's speed. Frames are full-page screenshots,
so the HTML overlay appears in the video. A 77 s 1080p tour takes ~2 min and is 24 MB at CRF 24.

## Checklist before you say it's done

- [ ] `node tools/verify.js` (or the model's verify) prints max |JS − reference| and it is < 1e-3.
- [ ] Every number in the copy and in 3D comes from `R`. Spot-check two against the reference output.
- [ ] `shoot.py` passes at 1920×1080, 1280×800 and 390×844 with 0 console errors, and you looked at every PNG.
- [ ] Each station's main object is fully visible beside the HUD at 1280×800 (use `fit`).
- [ ] Each toggle visibly changes something and the copy explains the consequence.
- [ ] fps ≥ 55 at DPR 2 on the target machine (or the adaptive resolution kicks in).
- [ ] Tour runs end to end, and `record.py` produced an mp4 you scrubbed through (ffprobe the duration and size).
- [ ] Opens from file:// with no server, CDN versions pinned, no secrets, nothing published.

Read `references/gotchas.md` before your first build. Most of the hours went there.
