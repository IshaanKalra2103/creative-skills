# riso-rooms

A [Claude Code](https://claude.com/claude-code) skill for making **isometric illustrations that look risograph-printed**: cutaway rooms, gardens and little worlds drawn entirely in code on one HTML canvas. It uses halftone inks that mix where they overlap, slightly misaligned color plates, wobbly hand-drawn lines and small looping animations. You can pan and zoom the scene.

![A late-night listening room drawn with riso-rooms](assets/listening-room.png)

*`examples/listening-room.html`: records spinning, string lights twinkling, a dancer, a cat. Every mark is drawn in code.*

## Install

```sh
git clone https://github.com/IshaanKalra2103/riso-rooms ~/.claude/skills/riso-rooms
```

Then in Claude Code, ask for an isometric riso-style scene or run `/riso-rooms`.

## What's inside

- `SKILL.md`: the rules for the look, the workflow (plan rooms → block out → screenshot → add clutter → animate), and guidance on scale, density and tone.
- `template/index.html`: a zero-dependency engine plus two example rooms. Open it in a browser (or run `python3 -m http.server`).
- `examples/listening-room.html`: a full single-room scene (the image above).
- `references/api.md`: the drawing API (boxes, walls, windows, bookcases, lamps, plants, people in 6 poses, light, steam…).

**Controls:** drag or scroll to pan and zoom, pinch on touch, WASD to move, `0` to fit, `P` to save a PNG, double-click a room to fly to it.

**URL options:** `?room=<id>`, `&zoom=N`, `?frame=N` (freeze time), `?still` (no idle tour).

## Use without Claude

The template is a normal HTML file. Replace everything below the `SCENE — edit below` comment with your own `room({...})` calls.

## Source & inspiration

Inspired by Kevin Ngo's ["a small light, room by room"](https://a-small-light-three.vercel.app/): 25 mini rooms, each with Claude keeping people company, made with Claude Opus 5 ([tweet](https://x.com/kevin_t_ngo/status/2100238648218427563)). This skill reuses the ideas behind the look (isometric rooms, halftone inks, misaligned color plates, redrawing at 12 fps). The engine and scenes here are original code.

## License

MIT
