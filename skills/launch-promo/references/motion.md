# Motion: the vocabulary, with numbers

Everything is a pure function of `t` (seconds). Beats hang off voiceover words: `W('word')` is the start of that word in the placed VO, `W('word', n, after)` the n-th match after a time. Re-timing the voice re-times the film.

Helpers are in `src/lib.js` (`L.*`):
- **Progress:** `p(t, t0, d, ease)` returns 0→1 over a window.
- **Springs:** `spring(t, t0, f, z)` is a closed-form damped spring (f = Hz, z = damping ratio). `pop(t, t0)` is a bouncier spring.
- **Window and noise:** `win()` gives a fade in/out window. `noise1(x)` is smooth 1-D noise for drift. `hash(n)` gives deterministic per-item randomness.
- **Text and DOM:** `rise()` (word-rise headlines), `type()` (typewriter), `txt()` (cached textContent) and `set()` (cached style writes, which keep `seek` cheap).

## Curves and durations

| motion | curve | duration |
|---|---|---|
| entrances (words, panels, chips) | `outCubic` | 0.20–0.34 s |
| exits | `inCubic` | 0.16–0.25 s |
| camera, wipes, flips, spins | `inOutCubic` | 0.22–0.42 s |
| fly-ins to a resting spot | `spring f 2.1–2.6, z 0.62–0.70` | settles in ~0.6 s |
| pops (stickers, chips, tags, badges) | `pop`: `spring f 3.2–3.6, z 0.42–0.50` | ~20–25% overshoot, clamp scale to 1.25–1.3 |
| toggle knob | `outBack` | 0.18 s |
| stamps | `outCubic`, scale 2.2 → 1 | 0.16 s |

## Motion density (measure it)

`scripts/motion_stats.py` measures the share of frames that change and the longest still hold.
- **Reference:** 61% of frames moving, longest still 1.17 s.
- **Loopcast film:** 83% and 1.07 s.

Aim for 60–85% moving and no hold over ~1.2 s. Hold longer only on the final lockup. If a scene feels like a slide, add one of these:
- a camera push (+3% scale over 2–3 s)
- a glow drift
- a device float
- a count-up
- a state change every 0.25–0.5 s

## Text in

- **Word rise** (`L.rise`): each word sits in an `overflow:hidden` mask and slides up from `translateY(108%)` over 0.34 s `outCubic`, starting at its VO word + 0.03 s. One headline = 1–2 explicit lines.
- **Headline out:** blur 0→14 px, opacity 1→0 and scale 1→1.04 over 0.18 s `inCubic`, timed to the first word of the next line minus ~0.1 s.
- **Wordmark letter drop** (`C.wordmark().update(t, t0, 0.055)`): each letter springs (`f 2.8, z 0.62`) from (+46 px, +80 px, 16°, scale 1.3) to rest, staggered by 0.055 s, with a `tick` SFX per letter.
- **Typewriter** (`L.type`): 24–48 characters/s. The caret blinks at 2.2 Hz and stays solid while typing.
- **Counters:** `from + span * Math.pow(progress, 1.4–1.6)` accelerates like a feed blowing up. Format with `L.fmt`. Settle on the real number.
- **Word cycler** (the "breadth" beat): one word per ~0.11 s. The old word rolls up and out while the new one rolls in, in lockstep, so they never overlap. A counter ticks up beside it, then it lands on the payoff ("this week.").
- **Highlight sweep:** an accent box under the payoff words, `scaleX 0→1` from the left over 0.32 s, starting 0.28 s after the word lands.

## Objects in

- **Sticker pop:** a position spring from an off-centre spot (`f 2.6, z 0.62`) combined with a scale `pop` from 0.35 (clamped at 1.3), and the rotation settling −14° → −4°. Opacity jumps in over 0.06 s.
- **Pill flood:** 12–24 pills, each a `pop` from 0, with a 28–35 ms stagger, rotations ±6° from `hash(i)`, and a `blip` on every other one.
- **Floating hearts:** 11 hearts rise 380 px over 1.15 s along the phone's edge with a sine sway, popping in and fading out.
- **Badge counter:** a `pop` in, a count accelerating to "99+", and a small scale pulse (`1 + 0.12·max(0, sin(40t))`) while counting.
- **Keycap press:** sinks 10 px in 0.05 s and back in 0.15 s, and the underside shadow shrinks by the same amount.
- **Cursor click:** glides in over 0.55 s `inOutCubic`, presses down for 0.06 s and up over 0.16 s, the button shifts into its shadow, and a ring ripples from 20 to 110 px over 0.45 s.
- **Stamp:** comes in at 2.2× and −8…−11° and lands in 0.16 s with `stamp` SFX. Use it for a state that can't be argued with ("✕ TREND MISSED", "SENT ✓", "8 SHORTS FOUND").
- **Starburst** (`C.burst`): a jagged accent star behind a device. It pops in on "boom" with a slight rotation.
- **Paper plane:** flies from a sent message to the top of the frame, leaving a dotted trail.

## Devices

- **Phone fly-in:** a spring from (+520, +700) px and −28° to its pose at −5°. Then it floats with `noise1`: ±6–8 px and ±1.2°.
- **Phone flip** (to change what it shows): `rotateY` −14° → −90° over 0.16 s `inCubic`, swap the screen, then +90° → 0° over 0.2 s `outCubic`, translating sideways at the same time. The swap is invisible edge-on.
- **Phone drop** (exit): +1050 px down and +24° over 0.26–0.32 s `inCubic`, with a `fall` SFX.
- **Phone → black hand-off:**
  - The screen gets a dark overlay over 0.12 s.
  - Then over 0.25 s the rotations go to 0 and the phone moves to centre and scales ×~6, until its black screen fills the frame.
  - The next scene starts on that dark colour.
  - The mascot is drawn above the zoom and lands exactly where the next scene expects it.
- **Browser window in:** slides in from the left behind the phone at `rotateY(32°)`, which settles to 0 over ~0.4 s.
- **Terminal in:** flies in from the right with a tilt that settles over ~0.3 s.

## Active card

The active card lifts 34 px, scales to 1.03, its border mixes to accent and it gains a 60 px accent glow over 0.22 s. It settles back 0.1 s before the next card activates. Inactive cards **keep their finished demo**, so the row ends as a completed checklist. Cards rise in a stagger of 0.12 s (`spring f 2.4, z 0.7`) from +700 px.

## The mascot

- **Fall:** `inQuad` into place while stretched (sx 0.88, sy 1.16).
- **Land:** a squash impulse of `0.38 · exp(-9·dt) · cos(34·dt)` on sx/sy, with a `land` SFX.
- **To lockup:** a spring (`f 2.0, z 0.7`).
- **Blink:** a 0.06 s triangle on eye scaleY.
- **Look:** offset the pupil 6–8 px toward whatever matters.
- **Spin:** 360° over 0.42 s `inOutCubic` with a 40 px hop.
- **Arms:** rotate ±28° with excitement.
- **Icon morph:** on the final music hit, crossfade to the `iconMode` body over 0.22 s with a 12% pulse.

## Transitions (pick by what the cut means)

| transition | how | when |
|---|---|---|
| ring wipe | accent disc, then brand disc 0.05 s later, both radius 0→2400 over 0.3 s `inCubic` from the centre, with a white rim ring that fades | the logo reveal |
| circle out of an object | `clip-path: circle()` growing from an on-screen object's centre (the mascot), 0.3 s | into the price/offer beat |
| right wipe | `clip-path: inset(0 0 0 X%)` X 100→0 over 0.22 s, content sliding 260 px → 0 | brand → how-it-works |
| panel rise | `inset(Y px 0 0 0 round R R 0 0)`, top 1080→0 and R 60→0 over 0.22–0.24 s | into a dark scene |
| inner panel rise | the same, on an inner div rather than the root, so a mascot can stay drawn above the wipe | when an object must ride across the cut |
| diagonal corner wipe | a polygon clip from the bottom-right corner, ~0.2 s | into the accent-field breadth beat |
| curved wipe | `circle(R at 3280px 540px)`, R 1350→3300 over 0.3 s | into the end card |
| phone → black zoom | above | light device scene → dark scene |
| dim and keep | invert + darken + blur the old layer over 0.22–0.28 s instead of cutting | a mood change inside one scene (1 AM) |

**Hand-off contracts.** When scenes are built separately (by you or by parallel agents), write down for each cut: the time, the transition, and every object that crosses it, with its exact box. For example: "the mascot sits at {left 1616, top 101, size 174} at 23.95; the next scene draws its own from that box". Without these, every cut has a one-frame jump.

## Camera and life

- Glows drift with `noise1(t·0.35)·30 px`.
- A scene's sticker layer pushes in +3% over 2–3 s.
- Titles drift ±6 px.
- The badge pulses while counting.
- Nothing in the frame is ever fully still, except the final lockup and the last ~1 s.
