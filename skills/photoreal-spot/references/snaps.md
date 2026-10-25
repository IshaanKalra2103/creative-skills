# Snap cuts

A snap section is a run of beats, each held a few frames and cut on a hit. `snaps.py` renders
every beat in `spot.json` `beats` into `renders/<shot>/`.

## Beat grammar

```json
{"at": [12, 14], "kind": "card", "src": "action", "start": 40, "step": 2,
 "card": [540, 640, 700, 875], "zoom": [1.0, 1.04], "focus": [0.5, 0.5],
 "box": {"track": true, "trail": 2}, "frame": [250, 300, 830, 1050], "dark": 0.8}
```

| key | meaning |
|---|---|
| `at` | First and last global frame, inclusive. |
| `kind` | `full` (cover the frame), `card` (inset on the backdrop gradient), `smear` (a horizontal whip blur of a full frame), `black`. |
| `src`, `start`, `step` | Source name, first source frame (0-based position), source frames per output frame. |
| `zoom` | [from, to] over the beat; 1 = just covers. |
| `focus` | Crop centre as a fraction of the scaled picture. |
| `card` | [centre x, centre y, width, height], design px. |
| `dark` | Multiply the picture's brightness. |
| `box` | `{}` or `true`: a box around the subject, found once on the beat's first frame and held. Keys: `track` (find it every frame), `trail` (also draw the last n positions fainter), `from`, `until` (global frames it shows), `prompt` (what to find; default `box_prompt`). |
| `frame` | A fixed white rectangle [x0, y0, x1, y1], design px. |

## Design rules

- Hold 2-4 frames in a roll, 6-9 on a main hit. One 2-frame black on a hard hit resets the
  eye.
- Alternate scale: full frame, card, full, card. Vary card sizes (420-860 wide) so the roll
  breathes.
- Mix sources: the product beat, a person beat, a setting beat. Do not run two beats from the
  same source and moment back to back; jump `start` forward.
- Smears go before or after a hit, not on it: they read as the camera whipping to the next
  frame.
- Boxes: on beats where the subject is small to mid-sized and clearly visible. A held box
  only on a still subject; anything moving gets `track`. Use `trail` on fast motion for the
  double-box look. Leave boxes off frame-filling subjects (they run off the edges) and off
  dark frames where the subject is hard to see (Jev may box the wrong thing).
- Frames (fixed rectangles) work on full beats with a centred subject; keep them inside the
  HUD margins.
- Don't add devices the reference doesn't use. The example first replaced the reference's
  snap cuts with a shot-clock countdown; Jev scored that section 0.48 on device match
  against 1.23 after switching to snap cuts, and the user asked for the change.

## Jev boxes

`find_box` sends the rendered beat frame (before boxes) to Jev with a Box question (model
`jev-preview`, header `TypeSafe-Danger-Zone-Images: true`) and caches the answer in
`boxes.json`, keyed by a 96x120 thumbnail hash and the prompt. Write prompts that name the
whole object and its dark side: "Locate the whole basketball in `frame`, including its
shadowed side." Check every boxed beat on a contact sheet; a box on the wrong object or
lagging the subject means the beat needs `track`, a better prompt, or no box.
