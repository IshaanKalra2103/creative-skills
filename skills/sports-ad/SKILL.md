---
name: sports-ad
description: >-
  Photoreal sports product ads (boots, shoes, balls, rackets, apparel; 6-30 s, 4:5, 9:16 or
  16:9) for any sport, made the way a commercial is: learn the product, the sport's real
  movements and props and an ad's editing grammar first, then design a shot list on a beat
  grid (tracking shots, ground-level leads, macro push-ins, speed ramps, impact hits, whips,
  match cuts, flash and smash cuts), make photoreal stills, turn them into AI video clips
  (Vizard or Wan), fit a real track (Suno, driven in the user's Chrome) with its drop on the
  hero moment, and cut it all in code from one ad.json. Ships per-sport movement guides
  (soccer, basketball, American football, tennis, running, baseball, boxing, golf,
  skateboarding), tools to pull web references, study a reference ad's cuts and shot grammar,
  read a track's tempo and drops, render the edit with transitions, grade and type, mix the
  music with sound effects, draw a storyboard, and check every shot with Jev (TypeSafe's
  System One model) against real photos. Use when someone wants a sports ad, a spec spot for a
  sports brand or product, a hype video for a boot, shoe or piece of kit, or to learn how a
  sports ad is cut and make one for a sport.
---

# sports-ad

A sports ad is a few seconds of real-looking movement cut hard to music, with the product
readable in most frames. This skill makes one for any sport: it learns before it designs,
and every step has a tool and a check.

The worked example is a 15 s spec spot for the Nike Hypervenom Phantom 1 on a football
player: `examples/hypervenom/`.

## Before anything

- Read `sports/<sport>.md`. If the sport has no file, write one first (`sports/README.md`
  says how). Prompts written from it describe real biomechanics; prompts without it get
  sole drags instead of cuts and feet that slide.
- Spec work for a real brand stays private: the brand's product and logo are fine in a spec
  film the user keeps, not in anything published as if it were the brand's. Use the brand's
  real line only if it is public; otherwise write an original one.
- Paid steps (image generation is free on the user's ChatGPT login; Vizard, Wan and Suno are
  not): show the shot list and the prompts first, and say what each run costs.

## The workflow

| step | do | read | tool |
|---|---|---|---|
| 1 brief | the product, the sport, the one movement that sells it, length and aspect, where it plays | | |
| 2 learn | product photos (exact model and colourway), 8-12 real photos per movement, and if the user has one, a reference ad's cuts, pace and shot log | `references/learn.md` | `refs.py`, `study.py`, `label.py` |
| 3 design | the energy curve and the beat map; one job per shot; transitions; the one colour | `references/structure.md`, `shots.md`, `transitions.md` | |
| 4 ad.json | shots in beats with placeholder stills, camera moves, ramps, hits, overlays | `references/edit.md` | `board.py` |
| 5 stills | one photoreal still per shot, the product and the body named exactly | `references/prompting.md` | `image` skill, `qa.py` |
| 6 animatic | the stills cut to the synth score, for timing; show the user | | `score.py`, `cut.py --preview` |
| 7 music | a real track in the sport's genre, its drop on the hero moment, `bpm` set to it | `references/music.md` | Suno, `track.py` |
| 8 clips | image-to-video from each still; fast action generated in slow motion | `references/prompting.md` | `vizard-editor` or `wan-video` skill |
| 9 cut | clips in place of stills: `in`, `speed` ramps, hits on contact frames | `references/edit.md` | `cut.py`, `score.py` |
| 10 check | Jev on the render's frames, then your own eyes on every shot at full size | `references/qa.md` | `qa.py --video` |

Steps 6 and 7 can swap: if the user has the track already, cut the animatic to it.

## Tools

All are `uv run` scripts in `tools/` (numpy, pillow; Jev tools need `TYPESAFE_API_KEY` in the
environment or the macOS Keychain). Run them from the ad's folder or pass it.

| tool | does |
|---|---|
| `refs.py OUT NAME "query"` | web reference images (Google through the user's Chrome with browser-harness, Bing, Openverse), `--must` words in the title, a contact sheet and `sources.md` |
| `study.py ref.mp4 OUT` | a reference ad's cuts, holds, flash and black frames, pace, tempo and how many cuts sit on a beat |
| `label.py ref.mp4 OUT` | per shot: size, angle, camera move, subject, light, the way in; a shot log and its grammar summary |
| `track.py music.wav --at T` | a track's tempo, downbeats and drops, and the `score.music.in` that puts a drop at T s |
| `board.py AD` | a storyboard from ad.json: first and last frame of every shot, its length in beats, speed curve, moves and transitions |
| `score.py AD` | the audio: a real track (`score.music`) or a synthesized score, plus sound effects tied to the edit (whooshes on whips, impacts on hits, studs, the net, a sub drop) |
| `cut.py AD` | the edit: stills and clips with moves, speed ramps, whips, zooms, glitches, flashes, smash and match cuts, impact hits, the grade, type and logos; muxes the audio |
| `qa.py AD` | Jev per shot: the product's presence and fidelity against product photos, realism, the movement's form, faces, stray text, extra balls; `--control` real photos set the levels |

`tools/adlib.py` holds what they share: the timeline (beats, seconds, shot-relative times on
an exact grid), clip and still sources, Jev clients and cached boxes.

## What makes it read as a real ad

- Movement first. A wrong plant foot or a sliding boot reads as fake before any texture does.
  Write the phase of the movement in body terms in every still prompt; check form with `qa.py`.
- One hero moment, on the drop, with a hit (flash, chromatic kick, punch-in) on its contact
  frame and the bar before it quiet.
- Cuts on the beat, holds shrinking through the build, longest on the peak and the packshot.
- Real camera grammar: low tracking shots at the athlete's speed, a leading camera, macro on
  the product, a match cut that carries the ball or the eye across.
- Motion from clips, not moves on stills. A still with a push-in is an animatic.
- Music with a groove, not a film score (`references/music.md`).
- The product readable in at least half the ad, and the packshot exact.

## Files

```
SKILL.md
references/  learn, structure, shots, transitions, edit (ad.json), prompting, music, qa
sports/      one file per sport: movements and their phases, props, hero moments, risks
tools/       the scripts above
fonts/       Anton, Barlow Condensed, IBM Plex Mono (OFL)
examples/hypervenom/  ad.json, still prompts, Vizard briefs, the Suno prompt, small stills
```
