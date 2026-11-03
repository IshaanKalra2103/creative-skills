---
name: painted-anime-film
description: Use when someone wants a short hand-drawn-looking anime film or scene (Studio Ghibli-style, theatrical 2D anime, painted gouache backgrounds, cel-shaded characters) made in code as a single HTML page or rendered to mp4, wants another film like "the robot film" (The Guardian of the Morning Forest) or "the ghost film" (The Lantern Ghost) with a new story or character, or asks for an anime short with a soundtrack.
---

# Painted anime film

## Overview

This skill makes a 45–75 s wordless anime short as one self-contained HTML canvas page, with an optional score and mp4. Gouache background plates are painted once with a brush kit. Characters are simple meshes rendered as flat cels with hand-wobbled ink. Everything is timed like a timing sheet, at 24 fps, on twos.

The core rule: **every frame must pass as a still from a theatrical film.** You only know that by rendering frames and looking at them.

## Workflow

1. **Story.** Turn the premise into a beat sheet with `references/story.md`: name the change, find the signature moment, choose a witness, write each beat as one picture plus one change, then time it. Run the no-copy check against the reference sheet in that file.
2. **Shot list.** For each beat, set the shot size, lens, camera move, length and light from `references/cinematography.md`. Write the colour script (one swatch row per shot) from `references/look.md`.
3. **Scaffold:** `sh <skill>/scripts/new_film.sh <dir> "Title" "日本語の題"`. This gives you the engine, tools and build. Read `references/engine.md`.
4. **Character first** (`references/characters.md`): design it, build it, render a turnaround and fix it before any shot.
5. **Shots**, one file each, in story order. Paint the plates, stage the cel, animate it on twos (`references/animation.md`). After each shot, build and render a contact sheet, then look at it.
6. **QA** (`references/qa.md`): random stills, cuts and story read-through. Fix and repeat until every tile passes.
7. **Sound** (optional, `references/sound.md`): show the cue sheet and the credit estimate before spending anything, then generate, mix, embed and mux.
8. **Render:** `node build.mjs && node tools/film.mjs render/picture.mp4 && sh tools/mux.sh`.

## Quick reference

| Need | Use |
|---|---|
| painted background layer | `new Plate(W+2*BM, H+2*BM, depth, -BM, -BM)` plus brush kit, then `drawPlate` |
| character | `loft`/`lathe` meshes, `celLayer(g, cam, items, LIGHTS.x, {seed: drawSeed(lt)})` |
| a surface it rises through | `celLayer(..., {clipY})`, and `coat` on the material for what pours off |
| compose by screen position | `fitCam(camPos, fov, [[world, [sx, sy]], ...])` |
| drawn timing | `onTwos(lt)`, `keyAt(table, frame)`, `keyLerp`, `shake` |
| the world changes state | `platePair` + `revealMatte` + `revealDraw` (`reveal.js`) |
| check frames | `node tools/contact.mjs out/c.png --shots` / `--shot name 12` / `RANDOM=12` |

## Common mistakes

- Re-skinning the reference film's beat order or shots for a new story. Use the reference for the look and the motion grammar only.
- Timing poses with raw `lt` (smooth software motion) instead of `onTwos(lt)`.
- Changing the ink seed every frame, which makes it flicker. Use `drawSeed(lt)` for characters and a constant seed for props.
- Sliding a plate by hand instead of moving the camera.
- Soft gradients on characters; anything other than one hard shadow tone.
- Declaring a shot done from a passing build, without reading its contact sheet.
- Spending ElevenLabs credits before the cue sheet has been shown.

## Worked examples

`prompts.md` has a fill-in prompt for a new film, premises that fit, and the exact prompts that made both examples.


`examples/forest-guardian/` holds the source of *The Guardian of the Morning Forest* (a 73 s robot film, 15 shots), with its robot rig, poses, growth system and audio scripts. Study it for technique: plate painting in `shot01.js`, the heavy rise in `rise.js`, keyed light flickers in `shot04.js`, the launch with smears in `shot09.js`. It is a snapshot for reading, not a runnable project. Its shared engine files are in `template/`, and its `bgs.js` declares its own `BM`.

`examples/lantern-ghost/` is the second film, *The Lantern Ghost* (61.5 s, 11 shots), made with this skill from the premise "a Ghibli-style ghost rises from the shadows and brings brightness to the world". Its engine files are identical to `template/`. Read `STORY.md` to see how a new beat sheet stays clear of the reference. For technique:
- the liquid rise from a pool: `shot05.js`
- a two-state hillside truck shot: `hillside.js` and `shot08.js`
- lanterns lighting in a lane: `lane.js` and `shot09.js`
- the dissolve into petals under two mattes: `shot10.js`
- the light-and-liquid sound design: `audio/`
