# Colour

A palette you can name and remember, with one accent that has one job, a
dark mode that is designed rather than inverted, and every pair measured.

## 1. Where the palette comes from

From the concept's world, never from the category or the mood word.
"A tide chart" gives chart paper, survey blue and a tide-table red. "A night
market" gives sodium orange, wet asphalt and neon only where a sign would be.
"A seed packet" gives a printed field colour, a botanical green and kraft.

Name the source of every colour in DIRECTION.md: "Ground `#…`: the faded
blue of a blueprint". A colour you cannot explain is a default.

**Refuse the category colour** (write it down): green for money, blue for
trust and SaaS, violet for AI, warm paper and forest green for "considered"
brands, navy for finance, sage for wellness, black and lime for crypto.

## 2. Roles, not swatches

Tokens are named by job, in OKLCH (perceptual, predictable lightness, easy
dark variants). The hex in the comments is for humans.

```css
:root {
  color-scheme: light dark;
  --ground:   oklch(97% 0.012 250);  /* page */
  --surface:  oklch(100% 0 0);       /* things that float: menus, dialogs */
  --ink:      oklch(22% 0.02 250);   /* text */
  --ink-2:    oklch(45% 0.02 250);   /* secondary text, still 4.5:1 on ground */
  --rule:     oklch(88% 0.01 250);   /* hairlines */
  --accent:   oklch(62% 0.19 35);    /* the ONE job: primary action, or "now" */
  --accent-ink: oklch(99% 0 0);      /* text on accent */
  --focus:    oklch(55% 0.2 260);    /* focus ring; may equal accent if it passes 3:1 */
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* dark values, designed, not inverted */ }
}
:root[data-theme="dark"] { /* same dark values, for a manual toggle */ }
```

- **Neutrals are tinted** toward the ground's hue (chroma 0.005 to 0.02),
  never pure grey from a framework.
- **One accent** with one job. A second hue only if the concept demands it
  and it has a different job. Semantic colours (status) are separate tokens
  and appear only where state lives. **[scan]** counts saturated hue families.
- **Colour-field directions** may have a different ground per section; each
  ground is a token with a meaning.
- Put `color-scheme` on `:root` so form controls, scrollbars and the
  canvas match the theme on every browser.

## 3. Contrast (measured, not felt)

- Body and UI text: **4.5:1**. Large text (24px+, or 18.66px bold): **3:1**.
  Icons, borders of inputs and focus rings: **3:1** against neighbours.
- Text on images: the scan measures the real pixels behind the text and fails
  it below threshold **[scan]**. Fix with a scrim, a solid band, a darker
  crop, or by moving the text.
- Disabled is the only exemption, and disabled must still be readable enough
  to know what it is.
- APCA is a useful second opinion for thin weights and dark mode; ship to
  WCAG 2 AA because that is what audits use.

## 4. Dark mode

Design it; do not invert it.

- The dark ground is a colour, not `#000`: a deep version of the concept's
  hue (`oklch(18% 0.02 250)`), or true black only for OLED-first, image-led
  pages.
- Reduce chroma and lift lightness of the accent so it does not vibrate.
- Elevation goes *lighter* in dark mode (surfaces lighter than the ground),
  not shadowed.
- Images: dim slightly (`filter: brightness(.9)`) only if they glare;
  swap illustrations for dark versions when they have a white ground.
- Check every pair again. The scan runs on the dark render with
  `shoot.mjs --dark`.

If the product has no dark mode, say so in DIRECTION.md, and still set
`color-scheme: light` so dark-mode browsers do not paint dark form controls
on a light page.

## 5. Status (web apps)

Apps need state colour. Keep it disciplined:

- **Four states at most** with hue: positive, attention, critical, and
  neutral or info. Map every domain state onto those (on route = neutral,
  delayed = attention, late = critical, delivered = positive).
- **Never hue alone.** Pair with a shape, an icon, a position or a word:
  colour-blind users, High Contrast mode and greyscale printouts lose hue.
- **Saturation by urgency.** Only what needs action is saturated; "fine" is
  quiet ink.
- **Categories** (projects, tags, users) are not states. Distinguish them by
  label, by position, or by a muted categorical set, never by the same
  saturated hues as state.
- Charts: a sequential ramp of the accent, or one highlighted series against
  neutrals. dataviz conventions apply.

## 6. Forced colours (Windows High Contrast)

Windows users with High Contrast on see your page with *their* colours:
backgrounds are removed and replaced by system colours. Controls whose only
edge was a background colour vanish.

- Give buttons, inputs, toggles and cards a `border` or `outline`
  (`1px solid transparent` is enough: forced colours paint it visible).
- Do not convey state with background alone; the matrix's `windows-hc` pass
  fails controls that lose their shape **[scan]**.
- Use `@media (forced-colors: active)` only to fix specifics (SVG icons with
  `fill: currentColor`, focus rings with `outline-color: Highlight`).

## 7. The scan checks

Hue families (more than four fails), indigo/violet gradients, gradient text,
glows, blurred blobs, gradient count, dot-grid backdrops, contrast on solid
ground, contrast over images (pixel-measured).
