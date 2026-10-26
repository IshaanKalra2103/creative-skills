# Koi pond

A worked example of the ascii-tiles look: a live pond in one HTML file, plus a video converted with `scripts/ascii_video.py`.

```sh
python3 -m http.server 8000    # in this folder, then open http://localhost:8000
```

| key | what |
|---|---|
| `t` | next theme: koi pond, green pond, koi carp video |
| click | drop food |
| drag | stir the water, or move a lily pad |
| `r` | rain |
| `space`, `f`, `m` | in the video theme: pause, fill or fit the screen, sound |

- **koi pond**: blue banded water, light lines, koi that wander, school and come to food, flat lily pads.
- **green pond** (`?theme=green`): algae water, weeds, sunlight flecks, goldfish.
- **koi carp video**: `koi-carp-ascii.mp4`, made with `uv run ../../scripts/ascii_video.py src.webm koi-carp-ascii.mp4 --ss 8 --t 10 --cell 5 --px 12 --crf 21`, played over a blurred copy of itself.

## Credit

The video is converted from "Koi carp in Chinese pond" by Ruurd Zeinstra ([Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Koi_carp_in_Chinese_pond.webm), originally on [Flickr](https://www.flickr.com/photos/ruurdz/4128283856/)), licensed [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). Changes: trimmed to 10 seconds and redrawn as glyph tiles. The page credits it on screen while it plays.

The pond page and its code are original, after the ASCII pond idea on daoho.dev.
