## browser

A landscape with an XP-era browser window floating on it. The window holds a spinning blue
wireframe globe (or an image). The camera pulls back from an extreme close-up: the window
rises and shrinks faster than the background zooms, which reads as parallax. A condensed serif
caps title builds up word by word above the window. On the last tick the whole picture squashes
to half height onto black, like a CRT switching off. In the reference this is "changed the
internet" (1.1 s, ten ticks) over Windows XP's Bliss.

Without `image` a procedural teal sky with soft clouds over a rolling green hill stands in, so
the shot works with no assets.

| param | type | default | meaning |
|---|---|---|---|
| `image` | string | none | background image in `assets/`. None = procedural sky + hill. |
| `bg_rect` | [x, y, w, h] | cover fit | rest placement of the background in ref px (where it ends up after the pull-back). The pull-back is applied relative to it. |
| `stretch` | float | 1.0 | vertical stretch of the image before the cover fit (the reel stretches Bliss ~2.2x). Ignored with `bg_rect`. |
| `zoom` | float | 1.0 | extra zoom on the cover fit. Ignored with `bg_rect`. |
| `focus` | [fx, fy] | [0.5, 0.5] | image point (0..1) placed at the frame centre in the cover fit. |
| `grade` | string | `"none"` | `"bliss"` applies the reel's fitted colour grade (blue sky to teal, punchier grass) and its exposure ease. |
| `title` | string or [line1, line2] | none | caps title; one string = one big line. Words appear one tick apart from tick 1. |
| `title_width` | [w1, w2] | [281, 273] | width (ref px) each line is stretched or condensed to. |
| `title_stretch` | [s1, s2] | computed | explicit horizontal scale per line (overrides `title_width`). |
| `title_color` | colour | `#ebe9df` | |
| `window_title` | string | `Microsoft Internet Explorer` | text in the blue title bar. |
| `content_image` | string | none | image shown in the page area instead of the globe (cover-cropped). |
| `globe_color` | colour | `#3462c9` | |
| `meridians` | int | 10 | globe meridian count (keep it even, 8-10). |
| `squash` | bool | true | CRT-off squash on the last tick (needs at least 3 ticks). |

```toml
[[shot]]
cue = "changed"
kind = "browser"
title = ["CHANGE THE", "INTERNET"]
# image = "bliss.jpg"     # optional; procedural sky + hill without it
```

**Timing.** The pull-back runs over ticks 0-8 and the title over ticks 1-5 (the last line fades in
over 3 ticks). Longer shots hold the rest pose. Shorter shots cut the pull-back short, so give it
at least 8 ticks. The globe spins on the global tick, so it keeps turning across cuts.
