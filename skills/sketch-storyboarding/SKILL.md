---
name: sketch-storyboarding
description: Turn a trailer, gameplay clip, cutscene, script, shot list or scene idea into a hand-drawn cinematic storyboard sheet (rough graphite on off-white paper, shot sizes, camera moves, motion arrows, production notes), and re-direct weak footage on paper. Reads video by cutting it into shots with a numbered contact sheet, plans the shots as board.json, prints a blank lettered sheet for approval, draws panels with an image model using the bundled style reference, and letters and assembles the final sheet in code so every label is exact. Also makes before/after camera-fix boards (real frames beside redirected sketches) and animatic timing boards. Use when the user wants a storyboard, previs, shot plan, camera redesign, "make this trailer feel directed", "the camera in this clip is wonky", action or boss-fight blocking, or a storyboard collage of an existing trailer.
---

# Sketch Storyboarding

Storyboard sheets that look like a director or storyboard artist planned the sequence by hand. `assets/reference_storyboard.png` is the look: rough graphite and ink, monochrome, loose frame borders, motion arrows, shot labels under each frame.

| path | what |
|---|---|
| `scripts/shots.py` | a clip → shots (ffmpeg scene cuts) + numbered contact sheets + `shots.json` |
| `scripts/sheet.py` | `board.json` → the lettered sheet (`--prompts` prints the image prompts with lengths) |
| `examples/trailer/` | a 12-shot trailer plan (`board.json`) and its brief; the reference sheet is that plan drawn |
| `fonts/` | Architects Daughter (OFL) for the hand lettering |

Run the scripts with `uv run ~/.claude/skills/sketch-storyboarding/scripts/<name>.py`. They need ffmpeg.

## Core principle

A storyboard is not a set of pretty images. Every panel carries one **camera idea + action beat + story purpose**, and answers:

1. What should the audience notice first?
2. Where is the subject moving?
3. What is the camera doing?
4. What has changed by the end of the shot?
5. Why is this its own shot instead of part of the one before?

## Workflow

### 1. Read the sequence

**Video:** you can't watch it, so cut it into stills first.

```sh
uv run …/shots.py clip.mp4                 # shots/contact-01.jpg … + shots/shots.json
uv run …/shots.py clip.mp4 --threshold 0.2 # if obvious cuts were missed; 0.4 if flashes split shots
```

Read every contact sheet. Each tile is numbered with its timecode. Takes longer than `--long` seconds (3 by default) get extra tiles (`06`, `06b`) so you can see the camera move. Write down the beats, the standout moments and the camera problems (chasing the subject, rolling horizon, flat reveal, redundant shots, a screen-direction flip), with shot numbers. Keep the user's story and fix how it's shown.

**Text:** pull the story beats out and add only the staging needed to make the action geography readable.

### 2. Plan the shots in board.json

Write the plan before drawing anything. One entry per shot:

```json
{"n": 4, "shot": "LOW", "move": "TILT UP", "action": "Hero leaps off rooftop", "note": "into the city",
 "dur": "1s", "cut": "cut on leap", "cast": ["HERO"],
 "draw": "Looking up past a rooftop edge as the hero launches overhead, towers leaning in, arrow down-right."}
```

- `shot`: framing and angle. EST / EWS / WS / WIDE / MS / MED / MCU / CU / ECU / OTS / POV, plus LOW / HIGH / TOP / DUTCH / SIDE when the angle is the point.
- `move`: STATIC / PAN / TILT / PUSH / PULL / TRACK / ORBIT / CRANE / HANDHELD / SNAP PAN.
- `action` and `note` are the two caption lines. `dur` and `cut` (the transition) add a third for animatic timing.
- `draw` is what the image model draws; `cast` names entries from the board-level `"cast"` map so every panel describes each character the same way.
- For camera fixes, `"mode": "pairs"` and per panel `before` (a frame from `shots/frames/`), `problem`, `fix`.

Vary distance and angle on purpose; don't repeat the same shot size. `examples/trailer/board.json` is a complete board.

### 3. Get the plan approved on paper

```sh
uv run …/sheet.py board.json               # board.png: empty hand-ruled frames with the captions
```

Show it and fix the plan before any credits are spent. Changing a caption is free; redrawing a panel is not.

### 4. Draw the panels

Drawing needs an image model. With the Meshy tools connected, use `meshy_image_to_image` with the style reference in `reference_file_paths` (absolute path to `assets/reference_storyboard.png`), then `meshy_get_task_status` (`task_type: "image-to-image"`), then download the image URL with `curl -L -o panels/04.png`. Other image tools take the same prompts. **Every call costs credits: state the count and model and wait for a yes first.** Meshy prices image-to-image at 3 (nano-banana), 6 (nano-banana-2), 9 (nano-banana-pro) or 12 (gpt-image-2) credits per image.

`uv run …/sheet.py board.json --prompts` builds both kinds of prompt from the board, prints their lengths and writes `prompts.json`. It exits non-zero if one is over 600 characters (Meshy's limit).

- **Whole sheet in one image** (up to 12 panels, one call): use `prompts.json` → `sheet`. Style and characters stay consistent because they're drawn together, but the model letters the captions itself, so check every number and word, and a bad panel means re-rolling the sheet.
- **One image per panel** (the default for 12+ panels, exact labels, or fixing single shots): use `prompts.json` → `panels`. Save each as `panels/NN.png`, set `"image"` on the panel and run `sheet.py` again. It covers each frame at 16:9, so use `"focus"` (0 = top, 1 = bottom, 0.5 default) when the model returns a square or 4:3 image and the action isn't centred. Redo only the panels that are wrong.
- **Continuity across separate panels:** generate a cast sheet first (the hero's silhouette front, side and in action, in the same pencil style) and pass it as a second reference on every panel call.
- **Re-directing real footage:** pass the style reference plus that shot's frame from `shots/frames/` and describe the new camera. That gives the model the real world and characters to redraw from the new angle. The result is the right-hand side of a pairs board.

### 5. Look at it

Open the sheet and go through the checklist at the bottom. A panel that doesn't read gets its `draw` rewritten and one new call, not a whole new sheet.

## Camera grammar

Defaults unless the scene needs otherwise:

- establish geography with a wide before chaotic action;
- keep the horizon readable during fast traversal;
- leave negative space in the direction of motion;
- anticipate the subject's movement instead of chasing it;
- cut to a new camera instead of forcing a big corrective orbit;
- low angles sell power and scale; high angles sparingly, for vulnerability, geography or a graphic composition;
- close-ups for decisions, reactions, impacts and reveals, not just because the camera can get closer;
- foreground objects for depth and wipes;
- keep screen direction across cuts unless the reversal is motivated.

## Readable action

**Traversal:** setup wide → launch / anticipation → hero motion shot → impact or obstacle → reaction / recovery → release wide.

**Combat:** establish who is where; one clean action per shot; show contact before adding impact graphics; vary wide, medium and close; save the most dramatic angle for the strongest beat.

**Boss encounters:** reveal details first if suspense helps; establish scale with the hero in frame; show setup → travel → consequence for each attack; separate foreground and background so the threat feels physically large.

## Trailer structure

A useful arc for a short action or game trailer:

1. **World**: the environment, quickly.
2. **Hero**: the playable fantasy.
3. **Movement**: one memorable traversal or ability shot.
4. **Conflict**: a readable encounter.
5. **Escalation**: faster or larger action.
6. **Threat**: villain or boss reveal.
7. **Climax**: the strongest action.
8. **Stinger**: ally, twist, joke or story hook.
9. **End card**: title, logo, release beat.

Don't spend a short trailer on establishing shots; get to the core fantasy early.

## Adapting existing footage

Don't just redraw every original angle. The job is to **re-direct the footage on paper**. For each weak shot, decide whether to reframe it, change lens or distance, change camera height, stabilise the horizon, split one messy shot into two clean ones, merge redundant shots, add an insert or reaction, move the camera ahead of the action, or cut on motion. Put those decisions on a pairs board so the before and after sit side by side.

## Output modes

| mode | how |
|---|---|
| storyboard sheet (default) | 12 panels, 3 × 4; use 15, 18 or 24 rather than cramming two beats into a frame (`"columns": 4` for wide sheets) |
| individual boards | one large image per shot for implementation or detailed blocking; skip `sheet.py` or run it with `"columns": 1` |
| before / after camera board | `"mode": "pairs"`: CURRENT / PROBLEM (the real frame, in grey) beside REDIRECTED / PROPOSED |
| animatic planning board | fill `dur` and `cut` on every panel; they print under the note |

## Visual language

Unless asked otherwise: rough black graphite and ink on warm off-white paper; construction lines, cross-hatching, scribbled shadows; cinematic thumbnails, not finished concept art; mostly monochrome; simple figure models with readable silhouettes and minimal costume detail unless the design matters; motion, camera, impact and eyeline arrows where they help; no polish that stops it reading as previs. Reuse the reference's **visual system**, not its scene or characters.

Production notes beat vague ones: `hold horizon`, `lead subject`, `camera waits for hero`, `cut on leap`, `foreground wipe`, `hold 12f on impact`, `silence before reveal`, `keep both characters on marks`, never `make cinematic`.

## Continuity

Keep the hero's silhouette, relative scale of allies and villains, left/right screen direction, geography, time of day and prop positions. Characters don't appear, vanish or teleport between panels unless that is the event.

## Gotchas

- Meshy prompts max out at 600 characters. The reference image already carries the style, so spend the characters on the shot, not on style adjectives. `--prompts` checks the length.
- `meshy_image_to_image` has no aspect-ratio setting; the output follows the model. Ask for "one wide 16:9 frame, action in the middle band" (the default panel prompt does) and fix framing with `focus`.
- Ask for no text and no border inside panels; `sheet.py` draws both. Text in a panel fights the caption.
- The lettering font has no arrow glyph (→); write transitions as words ("cut on leap").
- A one-image sheet can come back with the wrong number of panels or misspelled captions. Count and read them before showing it.
- ffmpeg's scene score misses dissolves and slow fades. If `shots.py` reports a 10 s "shot" that obviously isn't one, lower `--threshold` or read the extra `b`/`c` tiles.

## Quality checklist

- [ ] Every panel is one readable beat.
- [ ] Shot sizes and angles vary on purpose.
- [ ] Geography and screen direction are easy to follow.
- [ ] Fast motion doesn't wreck the horizon or readability without a reason.
- [ ] Silhouettes read.
- [ ] Camera motion is labelled where it matters.
- [ ] Arrows don't clutter the focal point.
- [ ] Notes are short and implementation-oriented.
- [ ] Continuity holds.
- [ ] The sequence escalates instead of staying flat.
- [ ] Captions match board.json exactly (numbers, shot sizes, words).
- [ ] It still looks like a rough human storyboard, not polished AI concept art.
