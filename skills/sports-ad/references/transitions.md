# Transitions

How one shot hands over to the next, what each does in a sports ad, and the `out` key that
makes it in `ad.json` (on the shot before the cut). `len` is the transition's length in
frames, split around the cut: the first half on the outgoing shot, the rest on the incoming.

| transition | what | for | `out` | len |
|---|---|---|---|---|
| cut | the next frame is the next shot | most cuts; cleanest on an action or a beat | `{"type": "cut"}` (the default) | 0 |
| cut on action | cut in the middle of a movement, the next shot continues it | invisible continuity: the leg swings in one shot, the ball flies in the next | a cut, timed so the motion carries across | 0 |
| match cut | the subject's shape or motion lands in the same place across the cut | the ball leaves the boot and lands in the net; a ball becomes the moon | `{"type": "match", "subject": "the football", "len": 8}` | 6-10 |
| smash cut | a hard cut with a jolt: chromatic kick, shake, exposure pop | the beat drops, a quiet shot cut to a loud one | `{"type": "smash", "len": 6}` | 4-8 |
| flash | the picture flares to white across the cut | a strike, a flashbulb, a change of scene on a hit | `{"type": "flash", "len": 6}` | 4-8 |
| dip | through black | a pause, a time jump, the end card | `{"type": "dip", "len": 8}` | 6-16 |
| whip | a fast blurred pan out of one shot and into the next | energy between two moving shots | `{"type": "whip", "dir": "left", "len": 6}` | 4-8 |
| zoom-through | the camera rushes into the frame and lands in the next shot | escalation, entering a space | `{"type": "zoom", "len": 8}` | 6-10 |
| glitch | channel split and slice offsets | a street or digital look; use rarely | `{"type": "glitch", "len": 4}` | 2-6 |
| body wipe | a player or object crosses the lens and the cut hides behind it | continuity across a move | shoot it: a foreground pass at the end of one clip and the start of the next | - |
| J-cut / L-cut | the sound of the next shot starts early, or the last shot's sound runs late | the crowd roar before we see it; the ball thump over the next shot | `score.sfx` at a time before or after the cut | - |

Inside a shot, a **hit** marks an impact without a cut: `"hits": [{"at": 15, "fx": "flash ca
shake punch pop", "len": 10}]` on the frame of contact. Use one hit per big moment; a hit on
every shot is noise.

## Rules that hold

- Cut on the beat for impact and on the off-beat for flow. A drop lands on a cut or a hit.
- Before the biggest moment, take something away: one beat of silence, a static shot, a
  ramp down. Then hit.
- Keep screen direction. If the player runs left to right in one shot, keep him moving left
  to right in the next, or cut through a neutral shot (head-on, overhead) before changing
  it. `"flip": true` mirrors a shot when a still came out the wrong way (check the product is
  symmetrical enough to mirror: a logo or wordmark will read backwards).
- A whip's direction follows the motion: the player runs right, whip right.
- A match cut needs both frames composed for it: the subject at the same place and size.
  Generate the second still with the first one attached and say where the subject sits. The
  engine aligns the boxes Jev finds and eases out over `len` frames, scaling up as far as
  `max_zoom` (default 1.8) to do it; frames far apart in composition need a big push.
- Vary transitions by section: snaps and whips in the build, one big hit at the peak, a
  flash or dip into the payoff, a clean cut or dip to the end card.
