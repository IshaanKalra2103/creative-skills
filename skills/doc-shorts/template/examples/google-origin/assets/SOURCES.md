# Sources and credits

This example rebuilds a reel by **EarnEdits.com**: [Pinterest pin 1086986060090796381](https://in.pinterest.com/pin/1086986060090796381/),
in `reference/pin.mp4` and `reference/pin.info.json`. `audio/ref.wav` is the reel's own narration and music. Several
plates are built from the reel's frames (the reel's editors made those composites), and the rest from the original
photos below. All rights belong to their owners; they are credited here.

| plate | what | source |
|---|---|---|
| `larry_servers.jpg` | Larry Page and Sergey Brin at Google's servers, 2003 (Larry, Sergey and face-card shots) | Kim Kulish / Corbis, via the [New York Post](https://nypost.com/wp-content/uploads/sites/2/2026/01/co-founder-president-products-sergey-13619536.jpg). Rotated ~11° and colour-matched to the reel |
| `stanford_t00..09.jpg` | the Stanford shot, one plate per tick | frames from the reel, with the caption inpainted. The reel's image is a composite: the two men from Getty Images 524309146 ([via Wired](https://media.wired.com/photos/5de6deca453df400086ddd80/master/pass/Biz-google-524309146.jpg)) over a Hoover Tower backdrop |
| `frame_card_t00..08.jpg` | the "Nightmare" card, one plate per tick | frames from the reel (the "sweaty gamer" webcam meme, YouTube J4koT4sAMRo), with the caption inpainted |
| `hypno_face.png` | the blue screaming head with a brain and spiral glasses | cut out of the reel's frame f10/131 (`tools/hypno_cutout.py`) |
| `garage_mosaic.jpg` | Sergey and Larry in their Stanford office, 1998 | a mosaic of the reel's frames, ticks 169-179 (the reel shows more than any online original, e.g. [this crop](https://www.androidauthority.com/wp-content/uploads/2024/02/Larry-Page-and-Sergey-Brin.jpg)) |
| `board_mosaic.jpg` | the two holding the Google board | a mosaic of the reel's frames, ticks 180-191 (original crop: [InsideHook](https://www.insidehook.com/culture/early-history-google)) |
| `editors_desk.png` | the editing desk | stitched from the reel's frames, ticks 228 and 233, with the caption patched (`tools/editors_plate.py`) |
| `bliss.jpg` | Windows XP "Bliss" | Charles O'Rear / Microsoft ([3840x2160 copy](https://w.wallhaven.cc/full/gj/wallhaven-gjwg7l.jpg)) |
| `earth_plate.png` | the network Earth | baked from [Natural Earth](https://www.naturalearthdata.com/) (public domain) by `template/tools/earth_bake.py --preset google-na` |

Fonts: Instrument Serif (OFL), Homemade Apple (Apache 2.0) and Roboto (OFL); see `template/licenses/`.

`tools/` holds the scripts that built the plates. They read the study folder and were run once; paths inside may need
adjusting.
