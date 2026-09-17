# skills

[Claude Code](https://claude.com/claude-code) skills I've made. Each one lives in `skills/<name>/` and is self-contained: a `SKILL.md` plus templates, examples and references.

| skill | what it does |
|---|---|
| [riso-rooms](skills/riso-rooms) | Isometric illustrations that look risograph-printed: cutaway rooms with halftone inks, misaligned plates and wobbly lines, drawn in code on a canvas you can pan and zoom. |
| [logo-intro](skills/logo-intro) | A kinetic name/logo intro in plain JS: atom rings, hyperspace warp, flash, letters popping in with doodles, a boiling highlight box, a wipe to a sparkle. |

## Install

Clone once, then link the skills you want:

```sh
git clone https://github.com/IshaanKalra2103/riso-rooms ~/src/claude-skills
ln -s ~/src/claude-skills/skills/riso-rooms ~/.claude/skills/riso-rooms
ln -s ~/src/claude-skills/skills/logo-intro ~/.claude/skills/logo-intro
```

Then ask Claude Code for one (e.g. "make an animated intro for my name") or run `/logo-intro`, `/riso-rooms`.

---

## riso-rooms

![A late-night listening room drawn with riso-rooms](skills/riso-rooms/assets/listening-room.png)

*`examples/listening-room.html`: records spinning, string lights twinkling, a dancer, a cat. Every mark is drawn in code.*

- `SKILL.md`: the rules for the look, the workflow (plan rooms → block out → screenshot → add clutter → animate), and guidance on scale, density and tone.
- `template/index.html`: a zero-dependency engine plus two example rooms.
- `examples/listening-room.html`: a full single-room scene (the image above).
- `references/api.md`: the drawing API (boxes, walls, windows, bookcases, lamps, plants, people in 6 poses, light, steam…).

**Controls:** drag or scroll to pan and zoom, pinch on touch, WASD to move, `0` to fit, `P` to save a PNG, double-click a room to fly to it.
**URL options:** `?room=<id>`, `&zoom=N`, `?frame=N` (freeze time), `?still` (no idle tour).

Inspired by Kevin Ngo's ["a small light, room by room"](https://a-small-light-three.vercel.app/) ([tweet](https://x.com/kevin_t_ngo/status/2100238648218427563)). The engine and scenes here are original code.

## logo-intro

![Stages of the logo intro](skills/logo-intro/assets/frames.png)

- `SKILL.md`: the stage timeline, how to retime or cut stages, the rules of the look, and how to check it with frozen-frame screenshots.
- `template/index.html`: the whole animation (~350 lines of canvas JS, no libraries).

**Controls:** click or space to replay.
**URL options:** `?name=ada`, `&accent=0` (which letter gets the box), `&yellow=ff5a36&blue=00a37a` (any palette key, hex without `#`), `&speed=0.8`, `?t=9` (freeze time).

Made by rebuilding a reference motion-graphics intro frame by frame in JavaScript.

## License

MIT
