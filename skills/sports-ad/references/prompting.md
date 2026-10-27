# Prompting stills and clips

Every shot starts as a photoreal still (the start frame), and becomes a clip in a video model
made from that still. The still decides the product, the look and the pose; the clip only adds
time. Fix problems in the still.

## Stills

Use the `image` skill (gpt-image on a ChatGPT login) at 1024x1536, `--quality high`. Crop to
4:5 (the engine covers the frame, so no crop step is needed for the edit).

Build each prompt from blocks kept in files, so every shot shares them:

```
Use case: photorealistic-natural
Asset type: start frame for an AI video shot in a <brand> <sport> commercial, 4:5 portrait
Input images: <what each attached image is for: "references for the boot only ... Match it
  exactly: <the product in words>. Ignore their backgrounds.">
Scene: <the place, the time, the weather>                      <- look.txt, shared
Lighting: <key, rim, the accent colour>                         <- look.txt
Style: <the commercial's cinematography: lens, depth of field, grain, the one saturated colour>
Avoid: <text and logos other than the product's, crowd, faces, extra limbs, extra balls>
Player: <anonymous athlete, plain kit, wearing the reference product>   <- player.txt
Primary request: <the shot: camera position and the movement's phase, in body terms>
Composition: <where things sit in the frame; what the next or previous shot needs>
Constraints: <exactly two legs and two boots, one ball, ...>
```

- **The product in words.** Name every feature that identifies it: the colours by name, the
  panel shapes, the texture, the sole or stud layout, where the wordmark sits. The model
  matches what you name and invents what you don't.
- **The movement in body terms.** Take the phase from `sports/<sport>.md` and write what each
  limb does at that instant: "his left foot planted wide, knee bent deep over it; the inner
  side of his right boot against the side of the ball; the sole never steps on the ball."
  "Cuts inside" alone got a sole drag on the example; the explicit version got the move
  (form 0.70 to 0.84 in `qa.py`).
- **Chain references.** Attach an earlier still to carry the ball, the kit and the grade into
  the next shot ("Image 1 is an earlier frame from the same film; use it only for the ball and
  the look"). On the example, the net shot without it came back with a branded ball that
  didn't match the strike shot.
- **One change at a time** when iterating, and repeat the full constraints every time.
- Ask for the instant, not the sequence: one frame of one phase.

## Clips

Vizard (the `vizard-editor` skill, always `-t flash`) or Wan (the `wan-video` skill),
image-to-video from the still, 5 s per clip.

- One action per clip, starting from the still's instant. Describe the camera move, then the
  action in order, then the physics, then the speed. See `shots.md` "Video prompts per shot".
- Generate fast action in slow motion and speed it up in the edit (`speed` above 1), never the
  other way round. A video model renders slow motion cleanly; slowing a real-time clip down in
  the edit needs `"interp"`, which smears a kicking leg or a ball. A ramp (real time, slow,
  real time) is a slow-motion clip with fast stretches.
- Name what must not change: the product's colours and design, one ball, the kit.
- Leave room at both ends: the edit uses 1-3 s of each 5 s clip, so start the action about a
  second in.
- Vizard takes several stills in one project; write one brief that lists each material and
  the clip wanted from it (see the example's `briefs/`). Confirm the credit spend first.
  Vizard's editor checks its own takes and retries with other generators when it is not
  happy (footwork, aspect ratio, stray audio), and every retry costs: on the example, three
  Flash projects for seven 5 s clips cost 331, 390 and 706 credits. Say in the brief
  "deliver the first take that is close; no retries; no audio", and if a project runs on,
  `vizard send ID "stop retrying and deliver the best take you have"`.
- Expect 24 fps at about 860x1076 for 4:5; the edit covers the frame and resamples to 30 fps.

## Check before moving on

`qa.py` on the stills (product, realism, form, faces, stray text), with a few real photos of
the movement as `--control`. Then look at every still yourself at full size: the product's
wordmark, the number of legs, the ball count.
