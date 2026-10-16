## faces

Cut-out portrait cards with name labels on a flat colour field. The group starts huge and
spread apart, then slides together while it zooms out (the reel's "Larry page / Sergey brin").
Each card shows a box of its image around an anchor point (the face). Cards are laid out in
a row, staggered up and down, and drawn in list order (later on top).

| param | type | default | meaning |
|---|---|---|---|
| `field` | colour | `#960a09` | background |
| `cards` | [table] | — | see below |
| `at` | [x, y] | `[356, 628]` | centre of the final row |
| `card_h` | ref px | 184 | final card height (when a card has no `scale`) |
| `gap`, `stagger` | ref px | 8, 29 | space between cards, up/down offset |
| `zoom_from` | number | 1.66 | starting zoom of the group |
| `spread` | [x, y] | `[4.4, 1.7]` | how far apart the cards start (× their final offsets from the centre) |
| `ticks` | ticks | shot length | length of the zoom/slide |
| `label_color` | colour | `#ebe7df` | |
| `keys` | [[t, m, x1, y1, x2, y2, ...]] | — | exact: zoom multiplier and each card's anchor on screen |

Per card:

| param | type | default | meaning |
|---|---|---|---|
| `image` | string | — | plate (a group photo can feed several cards) |
| `anchor` | [x, y] | image centre | the face, in image px |
| `box` | [x0, y0, x1, y1] | 4:5 box around the anchor | the card, in image px relative to the anchor |
| `rotate` | degrees | 0 | tilt of the picture inside the card |
| `scale` | number | `card_h / box height` | ref px per image px at the end |
| `label` | string | — | name under or over the card |
| `label_pos` | string | `below` | `below` or `above` |
| `label_size` | ref px | 24 | at the end (with `label_at`: image px) |
| `label_at` | [dx, dy] | — | exact label baseline offset from the anchor, image px |
| `slot` | int | list index | position in the row |

```toml
[[shot]]
cue = "crew"
kind = "faces"
field = "#123a6b"
cards = [
  { image = "crew.jpg", anchor = [475, 610], box = [-170, -200, 170, 230], label = "Armstrong" },
  { image = "crew.jpg", anchor = [922, 320], box = [-170, -200, 170, 230], label = "Collins", label_pos = "above" },
  { image = "crew.jpg", anchor = [1405, 635], box = [-170, -200, 170, 230], label = "Aldrin" },
]
```

Timing: the reel's shot is 1.5 s. The zoom follows its curve over the whole shot (most of it in
the first 0.4 s), so any length works. With three or more cards the outer ones start
off-screen.
