# Mascots

The template's mascot is an original mochi: a dough dome with a flat sagging bottom, a two-leaf
sprout, dot eyes, a small "w" mouth and hatched blush. Any original character works if it
fills the same state (`mascot::Mochi`) and draws from points.

## Never a known character

If the reference uses a game, anime, cartoon or brand mascot, design a new one. Don't keep its
silhouette, colours, face or signature features. Change at least the body shape, the face kit
and the accessory. Pick the theme from the word (food, plant, animal, object), not from the
reference.

## Recipe (10 minutes)

1. **Silhouette first:** a simple closed shape that reads at 120 px and survives squash
   (dome, teardrop, bean, rounded square, cloud, onigiri triangle). Generate it as a radial or
   parametric polygon (`body` in `mascot::draw`) so squash can scale points.
2. **One accessory on top** that can spring and sway: sprout, bow, antenna, steam curl,
   ears, a cherry. It sells the landing (`sprout_angle` wobble).
3. **Face kit** with one shape per state, all in ink:
   - idle: dot eyes, a small mouth (w, smile, cat mouth)
   - blink: short lines
   - effort / slurp: `> <` chevrons and a dark open-mouth ellipse
   - full cheeks: wider body at mid height, a small "o"
   - happy: `^ ^` and a filled D-shaped smile
   - blush: three hatch lines per cheek (or dots, or ovals)
4. **Proportions:** about 150 px wide on the word, 1.55x for the final pose. Eyes about
   0.55 of the height up; keep the face in the upper-middle so the squash doesn't flatten it.

## Motion numbers that read as cute

- Landing squash: `wobble(t, 17, 5)`, `sy = 1 - 0.6w` when squashing, `1 - 1.15w` when
  stretching. Stretch harder than squash. `sx = sy^-0.8` keeps the volume.
- Seed splat: `wobble(t, 22, 8)` at 0.55 scale; grow with `spring(t, 17, 7.5)`.
- Breathing: ±2.2% at 1.15 s per cycle. Blink 0.07 s, twice, 0.18 s apart.
- Anticipation before the slurp: 0.17 s squash to -16%, then 0.16 s stretch to +8% while the
  mouth opens. Shiver ±2.5 px at 70 rad/s while slurping, and inflate +30%.
- Hop: 0.2 s ease-in-out arc, 170 px lift, stretched +25% in the air.

## Swapping it in

Keep `state()` (it carries the beats) and replace `draw()`. `mouth()` must return where
things get sucked in, and the seat (`Word::sit`) is the bottom centre. If the new body is
taller, raise `LAND.1` so the final pose stays centred.
