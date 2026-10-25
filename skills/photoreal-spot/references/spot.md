# spot.json

One file per spot. The Python tools and the comp read the same file; unknown keys are
ignored, so `title` and `notes` are free text. Frames are global, 0-based, at `fps`.
Positions and sizes are design px at 1080 wide.

## Top level

| key | default | meaning |
|---|---|---|
| `fps`, `width`, `height` | required | Must equal `FPS`, `WIDTH`, `HEIGHT` in `comp/src/lib.rs` (30, 1080, 1350). |
| `look` | see below | Backdrop and finish. |
| `box_prompt` | "Locate the main product in `frame`, including its shadowed side." | What a beat's box finds unless the beat sets `prompt`. |
| `shots` | required | The timeline. |
| `sources` | `{}` | Frame folders by name. |
| `segments` | `[]` | Video plates. |
| `beats` | `[]` | Snap cuts (see `snaps.md`). |
| `comp` | empty | The finish. |
| `qa` | | For `qa.py`. |

## look

| key | default | meaning |
|---|---|---|
| `gradient` | the blue in `look.md` | [offset, "#rrggbb"] stops, left to right. The backdrop of cards, whips, tagline and end card. |
| `grade` | true | The plate grade (crushed blacks, blue shadows). |
| `grain` | 0.14 | Film grain overlay strength. |
| `vignette` | 0.45 | Vignette intensity. |

## shots

`{"id": "hero", "start": 45, "end": 105, "src": "video"}`: frames `start` to `end - 1`.
Shots tile the timeline without gaps. `src` says who renders the shot:

- `video`: `plates.py`, from `segments`
- `snaps`: `snaps.py`, from `beats`
- `render`: you, as `renders/<id>/0001.png` onwards (a 3D render, a still sequence)
- `comp`: the comp itself (tagline, end card, or the bare backdrop). All `comp` shots come
  last and are contiguous; everything before them is a plate.

Plates are written to `renders/<shot id>/NNNN.png`, 1-based within the shot, and
`assemble.py` joins them into `runtime/plates.mp4`.

## sources

`"hero": "frames/hero"` or `"macro": {"dir": "renders/macro", "first": 0, "last": 7}`.
A folder of PNG or JPG frames, addressed by sorted position (0 = first file). `first` and
`last` clamp the range. Unpacked clips (`unpack.py`) and 1-based render folders both work.

## segments

| key | default | meaning |
|---|---|---|
| `at` | required | [first, last] global frames, inclusive. |
| `src` | required | Source name. |
| `start` | 0 | Source frame at `at[0]`. |
| `step` | 1 | Source frames per output frame. Fractions interpolate; above 1 blends toward the next frame (slow-shutter look). |
| `zoom` | [1, 1] | Scale over the segment; 1 = just covers the frame. |
| `roll` | [0, 0] | Degrees over the segment. |
| `focus` | [0.5, 0.5] | Crop centre as a fraction of the scaled picture. |

## comp

| key | meaning |
|---|---|
| `audio` | `[{"file": "track.wav", "at": 0, "gain_db": 0}]`: files in `runtime/`, start in seconds. |
| `kicks` | Frames that get a chromatic-aberration kick fading over 4 frames: the main cuts. |
| `whips` | `[{"from": 42, "to": 44, "travel": -360}]`: the plate slides `travel` px under a horizontal blur over the backdrop. Negative goes left. |
| `flashes` | `[[frame, opacity], ...]`: white over everything. |
| `hud` | Corner type over the plates (below). Omit for none. |
| `tagline` | The slam lines (below). |
| `end` | The logo flashes and lockup (below). |

An image (`Img`) is `{"image": "logo.png", "w": 52, "h": 31, "dy": 0, "frames": 8}`: a
file in `runtime/`, its size in design px, a vertical nudge, and (end-card flashes only) how
many frames it holds. A missing file draws nothing.

### hud

| key | default | meaning |
|---|---|---|
| `mark` | none | Img top left; the title sits to its right. |
| `title`, `subtitle`, `footer` | "" | Mono text: top left, under it, bottom left. |
| `counter` | [] | Frames that start a numbered shot; shows `NN / total` bottom right. |
| `total` | 0 | The counter's total. |
| `from` | 6 | First frame of the 8-frame fade-in. |

The HUD shows until two frames into the first `comp` shot.

### tagline

| key | default | meaning |
|---|---|---|
| `shot` | required | The `comp` shot it plays in. |
| `lines` | required | `[{"text": "LINE ONE", "at": 0}, {"text": "LINE TWO", "at": 15, "outline_until": 30}]`: `at` is the local frame the line slams in; `outline_until` draws it as an outline that fills from that frame. |
| `font`, `weight`, `italic`, `size` | "Barlow Condensed", 800, true, 212 | Fonts are built in from `comp/media/`; add a font there to use it. |

### end

| key | default | meaning |
|---|---|---|
| `shot` | required | The `comp` shot it plays in. |
| `logos` | [] | Imgs that flash full size one after another, each for its `frames`. |
| `mark` | none | The Img that lands and lifts. |
| `row` | [] | Imgs in a row under the mark, hairline dividers between them. |
| `tag` | "" | Mono line at the bottom. |
| `fade` | 12 | Frames of fade to black at the end. |

## qa

| key | meaning |
|---|---|
| `ref` | The reference video, relative to the spot folder. |
| `sections` | `[{"name": "opener", "ours": [6, 13], "ref": [6, 12]}]`: frames of ours and of the reference that show the same section. |
| `questions` | `{"countdown": "Does `frame` show ...?"}`: extra yes/no questions per frame. |
