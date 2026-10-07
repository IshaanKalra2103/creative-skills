# Layout

## 1. The canvas

| Device | Points | Safe top | Safe bottom | Margin |
|---|---|---|---|---|
| iPhone 17 / 17 Pro (design target) | 402 x 874 | 62 | 34 | 16 to 20 |
| iPhone 17 Pro Max | 440 x 956 | 62 | 34 | 20 |
| iPhone Air | 420 x 912 | 68 | 34 | 20 |
| iPhone SE-class / mini (check it fits) | 375 x 667-812 | 20-50 | 0-34 | 16 |

Design at 402 x 874. Check the smallest width before calling it done: a
layout that only works at 402 is fragile.

The display corner radius is about 55pt. Anything near a corner should be
concentric with it.

## 2. Margins and the grid

- **Pick one side margin per app and never break it** except for deliberate
  full-bleed. 16 is native, 20 is airier, 24 is editorial or gallery.
- Content width at 402 with a 16 margin is 370. Two columns with a 10 gutter
  are 180 each; three columns with 8 are 118.
- Full-bleed media goes edge to edge. Text never does.
- Align everything to the margin and to a few internal verticals. Count the
  distinct left edges on a screen: more than three is mess.

## 3. Rhythm

Spacing scale (pt): **4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80.**

- **Inside a group: 4 to 12.** Label to value, title to subtitle, icon to text.
- **Between groups: 24 to 40.**
- **One rest per screen: 48 to 80**, usually around the hero element.
  Screens whose job is comparison (a schedule, a ledger, a grid) may skip
  it; mark them `data-dense`. Density there is the point.
- **More space above a heading than below it.** The heading belongs to what
  follows. Equal space above and below makes a list of disconnected lines.
- Group by proximity before boxes. If you drew a card to show things belong
  together, check whether spacing alone would have done it.

**Optical, not mathematical.** Big type has internal space above the cap
height; a 64pt numeral needs less top margin than the number says. Round
icons look smaller than square ones at the same size. Correct against the
render.

## 4. One hero per screen

Every screen has exactly one element that owns it: a number, a photo, a
title, an action. It is noticeably bigger (2x or more) than anything else.
Everything else steps down and gets quieter.

Run the squint test on the render. If two things compete, shrink one.

## 5. iOS 26 structure

iOS 26 has two layers: **content** that fills the screen edge to edge and
scrolls under everything, and a **Liquid Glass navigation layer** floating
above it. Design both.

### Top

- Toolbar buttons: 44pt glass circles (`.glass` in mockups), inset 16 from the
  edges, vertically in the row just under the safe area (y 62 to 106 on the
  design target). Group related buttons in one capsule.
- Large title: 34pt bold (or the direction's display face) at the margin,
  starting around y 106 to 116. It collapses to an inline 17pt semibold title
  centred in the toolbar row on scroll.
- Content scrolls under the toolbar with a soft scroll-edge fade, not a
  solid bar.

### Bottom

- **Tab bar:** a floating glass capsule, about 62pt tall, inset about 20pt
  from the sides and about 21pt above the bottom edge. Two to five tabs.
  Selected tab: symbol and label tinted with the system tint (the accent or
  ink, per color.md §3) on a lighter inner capsule.
  Labels 10pt medium (a system metric, the one place below 11pt). In
  mockups mark the bar `data-system` so the scan accepts its metrics.
- **Search** as its own 62pt glass circle to the right of the tab bar when
  search is a destination.
- The tab bar can shrink to the selected tab on scroll and can carry a
  bottom accessory (a mini player, a timer) above it.
- **Primary action:** a capsule button 50 to 56pt tall in the thumb zone, or
  a toolbar button. Never a floating "+" in the tab bar.
- Leave the content's bottom padding clear of the tab bar (about 100pt) so
  the last item can scroll above it.
- **Keep the behaviour native, let the look follow the concept.** The
  glass tab bar is the default, not a uniform. A concept can restyle it
  (its own glyphs, a tinted glass, a shape that suits the world) or replace
  tabs with something better (a single-screen app needs no tab bar at all).
  What stays: reachable at the bottom, 44pt targets, state obvious,
  content scrolling beneath.

### Lists

- Inset grouped: 16 to 20 side margin, large continuous corner radius (about
  26 in iOS 26), rows at least 44pt (52 to 60 with a subtitle), separators
  inset to the text start, hairline 0.33pt.
- Plain lists for content (messages, entries). Grouped for settings and
  forms.
- Not everything is a list. If every screen is a list, the app is a
  settings panel.

### Sheets

- Partial-height sheets float inset from the edges with glass and large
  corners; at full height they attach. Use detents (medium, large) and a
  grabber.
- A sheet is for a task. A push is for going deeper. A full-screen cover is
  for a mode (camera, workout in progress).

## 6. Layouts that survive a small phone

Mockups get rendered at 402 x 874 and at 375 x 667. The pattern that
survives both:

```css
.screen { container-type: size; }
.screen .body { position: absolute; inset: var(--safe-top) 0 0; display: flex; flex-direction: column; }
.screen .hero { flex: 1; min-height: 0; }            /* the art or hero absorbs the difference */
@container (max-height: 760px) {                      /* prefix with .screen so it outranks base rules */
  .screen .secondary { display: none; }               /* drop what is least needed, never shrink type */
}
```

- Use `cqh` / `cqw` units for anything drawn to the screen's proportions
  (labels pinned to an SVG, a level line in a jar).
- `@container` rules lose to later rules of the same specificity; prefix
  them with `.screen`.
- Never shrink text to make it fit. Remove the least important thing.

## 7. Corners and shapes

- **Concentric radii:** inner radius = outer radius − padding. A 16pt-padded
  item inside a 26pt container gets 10. A card inset 16 from the display
  edge near the bottom gets about 39. SwiftUI: `ConcentricRectangle` /
  `.containerShape`.
- Use continuous (squircle) corners. In mockups plain border-radius is
  close enough; in SwiftUI, `RoundedRectangle(cornerRadius:style: .continuous)`.
- Pick a radius family and keep it: small (6 to 10) for chips and fields,
  medium (16 to 26) for containers, capsule for buttons. Mixed arbitrary
  radii are a tell.
- Square corners are a valid direction choice (Swiss, editorial). Commit.

## 8. Touch

- 44 x 44pt minimum hit area. A small drawn glyph can have a larger hit
  area; in mockups mark it `data-hit-expanded`.
- Primary actions in the bottom half of the screen.
- Destructive actions are never next to the primary action.
- Swipe actions on rows, long-press context menus, and pull-down
  gestures are where native apps hide secondary actions instead of
  cluttering rows with buttons.

## 9. Density

Award winners are rarely sparse **or** dense by default; they are dense where
the user compares (a schedule, a ledger) and sparse where the user decides
(a single action, a moment). Choose per screen, deliberately.
