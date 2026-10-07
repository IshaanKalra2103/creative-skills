# Motion

Motion explains change. Nothing moves on a page that did not change, except
one signature moment that people remember.

## 1. Rules

- **Content is visible by default.** Never hide content with CSS and wait for
  JavaScript to reveal it. If a scroll reveal fails (slow device, a
  screenshot, a crawler, a print), the visitor sees blank sections **[scan]**.
  Enhance with `@supports (animation-timeline: view())` or add the hidden
  state from JS *before* observing.
- **Reduced motion:** wrap anything that moves more than a fade in
  `@media (prefers-reduced-motion: no-preference)`. The matrix's `motion`
  pass fails anything still moving **[matrix]**. Marquees and parallax stop
  completely.
- **Durations:** 120 to 200ms for UI feedback, 250 to 400ms for transitions,
  longer only for a cinematic moment.
- **Easing:** no `linear` or default `ease` for movement. Use a strong
  ease-out for entrances (`cubic-bezier(.2,.8,.2,1)`), and springs via
  `linear()` for physical things:
  `--spring: linear(0, 0.42 9%, 0.84 21%, 1.02 33%, 1.05 41%, 1.01 55%, 0.99 70%, 1);`
- **Build pipelines and `linear()`:** some CSS toolchains (seen with
  Tailwind v4 in Next.js 16) silently drop a `linear()` easing written inside
  the `animation` shorthand, and every rule after it in the file. Put the
  spring in a custom property, whose value is never parsed, and use it:
  `--spring: linear(…)` then `animation-timing-function: var(--spring)`.
  After any CSS change in a framework project, confirm the rule reached the
  built stylesheet (the rendered page in `shoot.mjs` is the proof).
- **Interruptible:** hover and press states respond instantly and reverse
  from where they are.
- **Performance:** animate `transform` and `opacity` only; `will-change`
  sparingly; nothing that causes layout per frame.

## 2. Tools (2026)

- **View Transitions** (`document.startViewTransition`, and cross-document
  `@view-transition { navigation: auto; }`) for page and state changes.
  Supported in Chromium and Safari; Firefox falls back to an instant change,
  which is fine.
- **Scroll-driven animations** (`animation-timeline: view()` / `scroll()`)
  for scroll-linked effects without JavaScript. Chromium and Safari 26+;
  Firefox support has lagged, so feature-detect with `@supports` and make
  the static version good.
- **`@starting-style`** for entry animations of elements that appear
  (dialogs, popovers).
- **The Web Animations API** for anything orchestrated; GSAP or Motion
  only if the project already has them or the signature truly needs them.

## 3. The signature

One interaction per product that someone would describe to a friend, born
from the concept, done perfectly. Storyboard it in DIRECTION.md: trigger,
frames, timing, easing, the reduced-motion version.

Examples of the register (they show the size of the idea; do not reuse
them): a bakery menu where today's loaves strike through as they sell
out; a music school site where the hero is a piano roll you can play; a
museum shop where the object turns as the pointer moves across it.

Test it with `filmstrip.mjs`: the frames should read as a sequence, and the
reduced-motion frame should be complete and calm.

Not a signature: fade-up on scroll, a hover lift, a marquee, a typing
animation, a cursor follower.
