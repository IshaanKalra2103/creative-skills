# QA: every frame is a still

A passing build or a frame that renders proves nothing. Look at the pictures. Read every contact sheet you render, at full size where a tile is unclear.

## Gates, in order

1. **Turnaround** (`characters.md`): on-model from every angle, with no facets and clean lines.
2. **Plates:** each shot's `build()` once, then `node tools/contact.mjs out/c.png --shots`.
   - Is it a painting? Look for visible brushwork, value grouping, depth through air, and no repeated trees.
   - Does the light come from the same side as the cel light?
   - Is anything empty or unfinished, or are there seams at plate edges during the move?
3. **Per shot motion:** `--shot <name> 12` covers the whole shot.
   - Are the holds real (identical tiles where a pose is held)?
   - Is the pose motion on twos while the camera moves on ones?
   - Is there anticipation, overshoot and overlap where the action needs them?
   - Do effects read as drawings, not particles?
4. **Cuts:** render the last frame of each shot next to the first of the next. Check screen direction, light continuity and that no shot pops in brightness unless the story asks for it.
5. **Random stills:** `RANDOM=12 node tools/contact.mjs out/r.png`. Every tile must pass as a frame from a theatrical film. Any tile that fails is a bug: fix it and re-run with new random frames.
6. **Story:** read the shot list as a sequence of thumbnails (`--shots 1` at the middle of each shot). Does it tell the premise with no words? Is the signature moment the strongest image?
7. **No-copy check** (`story.md`): beat-by-beat against the reference sheet.
8. **Sound** (`sound.md`): plot the stems against the cuts and events. Every cue sits on its frame.

## Failure signs and fixes

| You see | Fix |
|---|---|
| a character looks like 3D or plastic | fewer tones (type 4/6), raise `smooth`, a thicker line, less rim |
| ink lines clutter the face or body | raise the `crease` threshold (lower number), merge small parts |
| the background looks like a gradient | more dabs and value breaks, grain, a broken edge on masses |
| sliding-layer look | the plate is moved by hand: remove the `dx`, move the camera instead |
| motion looks like software | time it with `onTwos`, add holds, swap the sine for key poses |
| a glow washes the frame | lower alpha, smaller radius, `lighter` only at the core |
| reveal edge looks digital | more noise in the arrival time, a narrower `soft`, a coloured edge band |
| flicker between frames | the seed changes on ones: use `drawSeed(lt)` |
| a black band where the after state should be | a `[before, 0]` colour pair; give the after value |
| the after state is offset or reshuffled against the before | state-0-only painting consumed RNG draws; give it its own RNG |
| green or brown streaks in the sky | ground points behind the camera; filter `q[2] < 1` |
| a glowing column rising over empty sky | edge glow outside content; `revealDraw` clips it to the after plates, so check you pass `edge` to the right call |
| the lit character turns cream or yellow | emissive tint too strong; keep the body white and put the warmth in the glow |
| particles leaving a character read as fireworks | trails too long and bright; keep a trail to about 2% of the path at 0.2 alpha, mostly petals rather than motes |
| a dissolving character reads as a lump | a wider emissive `coat` band riding the `clipY` cut, and particles born at the cut line |
| a still prop (lantern, shrine, sign) swims or drifts in a held shot | the ink boil and a slow push are for characters; give props a constant `seed`, and lock the camera (`sh.cam = () => sh.base`) on a held coda |
| a flame floats beside a lamp instead of in it | project the opening's corners, clip to that quad, draw the flame at the firebox behind it; turn the prop so an opening faces the camera |
