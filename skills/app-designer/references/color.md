# Colour

## 1. Roles before values

Every app gets exactly these roles. Write them as tokens in DIRECTION.md, for
light and dark, before drawing anything.

| Token | Role |
|---|---|
| `ground` | The screen background. |
| `raised` | A surface that sits on the ground (a sheet, a grouped list, an object). Often absent. |
| `ink` | Primary text and glyphs. |
| `ink-2` | Secondary text. Tinted from ink or ground, never a random grey. |
| `ink-3` | Tertiary text, placeholders, disabled. Still 3:1 if it carries meaning. |
| `rule` | Hairlines and separators. |
| `accent` | The one colour. It owns one role. |
| `on-accent` | Text and glyphs on the accent. |
| `positive` / `negative` | Only if the domain needs them (money, health). Not decorative. |

Nine roles. If the design needs more colours than this, it needs fewer.

## 2. Where the colour comes from

**Never from "modern app palette".** From the concept sentence's object:

- A boarding pass: white, black, one airline colour.
- A pharmacy label: white, black, a regulatory green or red.
- A seed packet: kraft, a printed ink colour, a photo.
- A train departure board: black, amber, white.
- A ceramics studio: raw clay, glaze blue, kiln black.
- A swimming pool: chlorine blue, tile white, lane-rope red.

Then check it does not land in a trap:

- **The AI-purple trap.** Indigo/violet gradients, lavender cards, purple
  glows. Never unless the concept is literally purple, and then flat.
- **The wellness-cream trap.** Cream ground, terracotta or sage accent,
  espresso ink. It is the default for anything calm, so every calm app looks
  the same. Rotate the ground: newsprint grey, cool bone, pale blue, white.
- **The fintech-dark trap.** Navy or near-black ground, an electric lime,
  green or teal accent, glass cards. Every crypto and budget app since 2023.
- **The Tailwind trap.** `#3B82F6`, `#10B981`, `#F59E0B`, `#EF4444`, `#6366F1`,
  gray-400 on gray-50. You can feel these. Pick your own values.

## 3. The accent

- **One accent, one role.** Pick the role: the primary action, or "today",
  or "complete", or "live". Then use it only there. An accent used everywhere
  is a theme colour, and a theme colour is noise.
- **Proportion:** the accent covers roughly 5 to 10% of a screen. The
  exception is a colour-field direction, where the accent *is* the ground and
  ink does the rest.
- **System tint follows the role.** If the accent's role is "action" or
  "selection", tint the system with it (`.tint(accent)`) so toggles, links and
  the selected tab agree. If its role is a *state* ("over budget", "live",
  "today"), tint the system with ink instead, and keep the accent for that
  state alone. The role wins over the tint. Write which in DIRECTION.md.
- **One hue, two values is still one accent.** A light accent that works as
  a fill (lamp yellow) often fails as text on a light ground; pair it with a
  darker value of the same hue for text. Name both in DIRECTION.md.
- The accent may double as the domain's semantic colour (red for "over" in a
  finance app) when that is its one role. Do not add a second red.
- Avoid pure hue values (`#FF0000`, `#00FF00`). Shift hue and drop
  saturation slightly: `#E5322D` is a red, `#FF0000` is a default.

## 4. Neutrals carry the screen

- **Tint your neutrals** 2 to 6% towards the accent or ground hue. A cool app
  has cool greys, a warm app warm greys. Pure `#888` on a tinted ground looks
  dirty.
- Step greys in clear levels. Three or four levels of ink, two of surface.
  Each must be distinguishable at a glance.
- **Contrast is measured, not guessed.** Body ≥ 4.5:1, large text and
  glyphs ≥ 3:1. The scan measures text on solid grounds; check text on
  images yourself.

## 5. Dark mode is a second design

- Not an inversion. Elevation goes **lighter** in dark mode (raised surfaces
  are lighter than the ground), the opposite of shadows in light mode.
- iOS dark grounds: `#000000` base on OLED is native and correct; `#1C1C1E`
  and `#2C2C2E` for raised levels. A custom dark ground should keep the
  direction's hue: an editorial app might use `#141311`, an instrument
  `#0B0C0E`.
- Desaturate and lighten the accent in dark mode a few steps; saturated
  colours vibrate on black.
- Images may need slight dimming, and white backgrounds inside images
  (product shots) need a container.
- Design both, ship both, screenshot both.

## 6. Gradients and materials

- iOS 26 depth comes from **Liquid Glass** on the navigation layer, not from
  gradients on content. In SwiftUI it is `.glassEffect()`; never fake it with
  a blur over content cards.
- A gradient is allowed when it is **a physical phenomenon**: sky, light
  falloff, a photo scrim, a heat map. Then it is subtle and one-directional.
- Scrims under text on images: a gradient only where the text sits, from
  0% to 50 to 70% black over 40% of the image height. Never a full-frame dark
  overlay.
- No gradients on buttons. No gradient text.

## 7. Colour-field directions

When the ground itself is saturated and carries meaning (one hue per mode,
per state, per item):

- The **grounds are a system**, not accents: name each ground and what it
  means in DIRECTION.md. The one-accent rule then applies to the elements
  *on* the ground: one colour for the primary action or highlight, ink for
  everything else.
- **Dark mode keeps the hue**: the same ground, deepened (cobalt becomes a
  deep navy-cobalt, tomato becomes oxblood), not swapped for grey-black. The
  meaning survives, the brightness drops.
- Glass over a colour field is tinted by the field: set `--glass` in the
  mockup to a translucent white or a lighter value of the ground.

## 8. Colour as information

The best apps use colour to **say** something:

- Weather apps tint the ground by conditions and time.
- Flighty colours the flight by its status.
- A habit app could warm the ground as the day fills in.
- A colour-field app swaps the ground per mode.

If your colour does not mean anything, it is decoration, and it has to be
very good to survive.
