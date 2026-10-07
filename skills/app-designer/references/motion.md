# Motion and feel

Screenshots win the click. Motion and feel win the award. Apple Design Award
juries use the app; the thing they remember is how it *responded*.

## 1. What motion is for

Motion explains a change of state. Every animation answers one of:

- **Where did that come from / go?** (navigation, a sheet, a zoom from a
  thumbnail into a detail)
- **What just happened?** (a check, a save, a number changing)
- **What can I do?** (a drag affordance, a rubber band at a limit)
- **How did that feel?** (a reward at a real milestone)

If an animation answers none of these, delete it. Nothing moves on a screen
that did not change. No staggered fade-up entrances on every screen.

## 2. Springs, not curves

iOS motion is spring-based, interruptible, and velocity-preserving. Use
springs everywhere; never linear, never 300ms ease-in-out by habit.

| Use | SwiftUI | Character |
|---|---|---|
| Most UI changes | `.smooth` / `.spring(duration: 0.35, bounce: 0)` | settles without overshoot |
| Quick toggles, selection | `.snappy` / `.spring(duration: 0.25, bounce: 0.1)` | fast, crisp |
| Tossed or celebrated objects | `.bouncy` / `.spring(duration: 0.5, bounce: 0.3)` | playful overshoot |
| Big transitions, sheets | `.spring(duration: 0.5, bounce: 0.05)` | weighty |

Durations: feedback 100 to 200ms, small changes 250 to 350ms, navigation 400
to 500ms. Longer than 600ms feels slow on a phone unless it is a moment.

In HTML prototypes, approximate a spring with `linear()`:

```css
--spring-smooth: linear(0, 0.157, 0.438, 0.66, 0.808, 0.897, 0.948, 0.976, 0.99, 0.997, 1);
--spring-bouncy: linear(0, 0.204, 0.624, 0.96, 1.112, 1.12, 1.064, 1.012, 0.988, 0.988, 0.996, 1);
```

Animate only `transform` and `opacity` (and `clip-path`). Never `all`.

## 3. The native vocabulary (use it before inventing)

- **Zoom navigation:** `.navigationTransition(.zoom(sourceID:in:))` with
  `.matchedTransitionSource` on the thumbnail. Tapping a card grows it into
  the detail view, and a swipe pulls it back. This alone makes an app feel
  premium.
- **Matched geometry:** `matchedGeometryEffect` to move an element between
  two layouts.
- **Numbers:** `.contentTransition(.numericText())` so digits roll.
- **Symbols:** `.symbolEffect(.bounce)`, `.replace`, `.wiggle`, `.breathe`;
  `.contentTransition(.symbolEffect(.replace))` when an icon swaps.
- **Scroll:** `.scrollTransition` for items easing in/out at edges, used
  subtly. `.scrollTargetBehavior(.viewAligned)` for paging carousels.
- **Glass:** `GlassEffectContainer` + `.glassEffectID` so toolbar buttons merge
  and split as liquid.
- **Phase / keyframe:** `PhaseAnimator` and `KeyframeAnimator` for the one
  choreographed moment.

## 4. Haptics

Haptics are half of feel and almost always forgotten.

- `.sensoryFeedback(.selection, trigger:)` on pickers, segmented choices,
  snapping.
- `.impact(weight: .light)` when something lands or docks.
- `.success` on completion, `.warning` and `.error` when something fails.
- **Never** on every tap. Haptics on everything is the motion equivalent of
  every button being purple.

Write the haptic next to every interaction in the spec.

## 5. Direct manipulation

The step from good to award-level is usually here: things follow the finger.

- Drag to dismiss, drag to reorder, drag to scrub.
- Elements track the finger 1:1, then hand off to a spring with the release
  velocity.
- Rubber-band at limits, never a hard stop.
- Long-press lifts (scale 1.03 to 1.05, a soft shadow) before a context menu
  or drag.
- Press states on everything tappable: scale 0.97 or a dim, 100ms in, spring
  out.

## 6. The signature

Every award app has **one interaction people describe to a friend**: the
Flighty departure board, the Halide focus dial, the Things checkmark, the
(Not Boring) weather toy, Crouton's hands-free cooking. Design yours on
purpose:

1. It lives on the core action (the thing done every day), not in a
   corner.
2. It comes from the concept sentence. A "train departure board" app has
   flapping digits. A "pocket notebook" app has a pen stroke. A "seed packet"
   app has something that grows.
3. It is short (under a second), interruptible, has a haptic, and stays
   delightful on the 100th time. If it gets in the way by day three, it is a
   gimmick.
4. Write it as a storyboard in DIRECTION.md: trigger, frames, timing,
   haptic, reduced-motion fallback.
5. Show it: in mockups as 3 to 4 frames of the sequence side by side, or as a
   working HTML prototype.

### Showing it in a mockup

- A storyboard panel with `.mini` frames (device.css) is the clearest form
  when the moment is about shape and position. At mini scale text is
  unreadable and unscanned, so when the moment is about words (underlining,
  a number rolling), show 2 to 3 full frames instead.
- `data-freeze="ms"` pauses a screen's CSS animations at a time. Springs are
  front-loaded: a smooth spring is ~90% of the way there at half its
  duration, so freeze at 25 to 40% of the duration to catch a readable
  in-between frame, or pose the in-between state by hand.

## 7. Reduced motion

`@Environment(\.accessibilityReduceMotion)`. Replace movement with
cross-fades, keep feedback. Never lose information when motion is off.
