# AI video plates

## Vizard (CLI)

`vizard new -f brief.md -m hero.png -m detail.png -a 4:5 -d 10 -t flash --no-wait`, then
`vizard wait <id>` in the background. See the `vizard-editor` skill.

- Always pass `-t flash`. Without `-t` Vizard uses the plan default (Max), about 30x the cost.
- Confirm the spend with the user first. The example's projects on Flash: two player shots
  for 99 credits, two hoop shots for 182, one rack shot for 260 (it retried models).
- Ask for each shot as its own raw file "exactly as the video model output it"; the combined
  edit is re-encoded and cut. `vizard download <id> --all` fetches them.

## Wan

The `wan-video` skill (Wan 3.0 on TokenRouter credits) does image-to-video from a first
frame, and first-to-last frame. Use it when Vizard is out of credits or for a single shot.

## The brief

```text
Generate <n> short AI video shots for a <product> commercial (my own spec spot). These are raw
plates I will composite myself, so deliver only the generated footage: no music, no voiceover,
no sound effects, no captions, no titles, no logos added, no transitions other than hard cuts,
and no extra colour grade.

Please ALSO give me each shot as its own separate downloadable file, exactly as the video
model output it (no re-encode, crop or trim), in addition to the combined video.

Look (match the images exactly): <the look block in one paragraph>.

Shot 1 (0-5 s), starts from hero.png: <what moves, in order, with timing>. Camera: <move>.
Shot 2 (5-10 s), starts from detail.png: ...

4:5 portrait, <n x 5> seconds total. <What must not morph: the product stays one solid object,
its marks do not change, hands stay anatomically correct, straight parts stay straight.>

Don't ask follow-up questions. If a video model is blocked or unavailable, switch to another
one yourself and keep going. Make reasonable choices and deliver.
```

One clear move per shot works best: a push, a truck, a slow roll, a ball dropping through
the frame. Name the camera move separately from the subject's motion.

## Checks before using a clip

Make a contact sheet of every clip (`sheet.py clip.mp4 0-149/6 sheet.jpg`) and look for:

- morphing: a product that melts, doubles or changes shape; marks that change; extra fingers
- a camera move that stalls or reverses
- the first frames drifting from the still (some models ease in; start later with `start`)
- flicker in dark areas

Use the clean part. A 5 s clip often has 2-3 s that hold up; `start` and `step` in spot.json
pick them.

## Formats

Clips differ: the example's player and hoop clips were 858x1072, 30 fps, 150 frames; the rack
clip 834x1112, 24 fps, 121 frames. `unpack.py` keeps every frame as delivered; `cover()`
scales each to the spot's size, and `step` sets the speed. A 24 fps clip at `step` 1 plays
at 80% speed on a 30 fps timeline.
