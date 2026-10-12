# Aesthetic: the sticker-print launch look

Warm paper and ink, one acid accent, one brand field colour, hard offset shadows instead of blur, heavy tight type, grain over everything. It reads as printed stickers on a desk rather than as a UI kit. All values below are what the engine ships and what was measured off the reference (`scripts/palette.py`).

## Palette (FILM.theme)

| key | hex | css var | role |
|---|---|---|---|
| `paper` | `#F1EFEB` | `--paper` | light scenes. Warm off-white, never pure white |
| `ink` | `#1F1D19` | `--ink` | type, every outline, every hard shadow |
| `accent` | `#D1FD4E` | `--lime` | the loud colour: stickers, the mascot, keywords on dark, highlight boxes, active-card borders, one full-bleed beat |
| `accent2` | `#6233D9` | `--purple` | the brand field: the logo reveal and the price beat are flooded with it |
| `accent2Text` | `#5B2FE0` | `--violet` | `accent2` tuned for type on paper ("viral.", "in your texts.") and bot chat bubbles |
| `dark` | `#201E1A` | `--dark` | dark scenes (warm, not black). `card #292722` and `well #151311` sit on it |
| `alert` | `#E0364C` | `--red` | notification badges, "missed" stamps |
| `pink` | `#EF5A6F` | `--pink` | the one bad word ("lose.") |

Rules:
- At most two accents in one frame. Paper + ink + accent2Text on light; dark + paper type + accent on dark; accent2 field + paper type + accent on the brand beats.
- To rebrand, change `accent2`/`accent2Text` to the product's colour and keep an acid `accent` that fights it (lime against purple, orange against navy, pink against green). Check type contrast on paper.
- No gradients except the two soft accent glows on paper scenes and imagery inside a device.

## Surfaces

- **Paper scenes:** paper + a 32 px dot grid (`radial-gradient` dots, ink at 17% alpha, 1.6 px) + two blurred accent glows (`.glow`, ~900 px, top-left and bottom-right) that drift a few px with `L.noise1`. Class `bg-paper`.
- **Dark scenes:** `dark` + white dots at 7.5% (`bg-dark`). Cards: `card` fill, 3 px `#3a3731` border, radius 30, inner `well`. Active card: border to accent, a 60 px accent glow.
- **Brand field:** `accent2` + white dots at 10% (`bg-purple`) + 6 concentric rings (white 16%, 2.5 px) that keep expanding slowly (`r = (i+1)*175 + (t*40 % 175)`).
- **Accent field:** one beat flooded with `accent` (the "scans 046 posts" breadth beat), ink dots at 13% (`bg-lime`).
- **Grain:** one `#grain` layer, `mix-blend-mode: overlay`, opacity 0.20–0.24, six pre-baked 384 px noise tiles chosen and offset per **frame** (not per sub-frame, so motion blur doesn't smear it away).
- **Night:** for "it's 1 AM" beats, a radial `#433E55 → #2A2733 → #161618`, and the previous layer is kept as a dimmed, inverted, blurred backdrop (`invert(.78) brightness(.56) blur(2px)`) instead of being cut away.

## Type

| use | face | spec |
|---|---|---|
| headlines | Inter variable | weight 900 (880 also works), letter-spacing −0.07em, line-height 0.94. 2 lines: line 1 ~92 px, line 2 (the punchline) ~150–160 px |
| titles on dark | Inter 900 | 100–118 px, the second half in accent ("Four **TinyFish primitives.**") |
| taglines | Inter 900 | 84–96 px, centred, measured at build |
| wordmark | Inter 900 | 236 px, −0.065em, one span per letter |
| eyebrows | Space Mono 700 | 22 px, tracking .16em, uppercase, accent on dark / ink on paper, typed on at 30 cps ("HOW IT WORKS →") |
| UI and chat | DM Sans 500–700 | 19–26 px |
| counters in UI | Space Mono 700 | big counters are Inter 900 |

Use typographic apostrophes (’) in headlines. Inter's straight `'` looks like a tick at 900. The headline word wrapper needs ~0.07em right margin or tight tracking glues words together (`.hl-w` in style.css).

## The sticker system

Everything on paper is a sticker: off-white `#F8F8F6`, solid ink border, and a hard ink shadow offset down-right. No blur shadows anywhere.

| piece | border | radius | shadow | notes |
|---|---|---|---|---|
| sticker card (`C.sticker`) | 4 px | 20 | 9px 11px | avatar circle + handle + Inter 900 message ~54 px, rotated −14…+10° |
| pill (`C.pill`) | 3 px | 40 | 5px 6px | 44 px avatar + Inter 800 28 px, rotated ±6°, used in floods of 12–24 |
| tag (`C.tag`) | 3 px | 12 | 5px 6px | Space Mono 700 uppercase, `.lime` variant for good news ("✓ RUN STARTED") |
| keycap (`C.key`) | 4 px | 18 | 12 px solid underside | ⌘C / ⌘V; presses sink 10 px and the underside shrinks |
| toggle (`C.toggle`) | 4 px | pill | none | knob slides 46 px with outBack; track turns accent |
| stamp | 4–5 px coloured | 10–12 | none | mono, rotated −8…−11°, slams in from 2.2× |
| big sticker ("FREE") | 6 px | 34 | 14px 16px | accent fill, Inter 900 ~170 px + mono sub-line |
| button | 5 px | pill | 9px 11px | accent fill; pressing shifts it into its shadow |

## Devices and panels

- **Phone (`C.phone`)**: 430×888, shell `#1E1D19`, radius 66; screen inset 14 px at radius 53; a side slab offset (10, 8) gives thickness. The Dynamic Island floats **inside** the screen, 15 px below the bezel (118×34). If it touches the bezel it reads as a notch blob. Status bar time and battery are centred on the island's height. Standard pose: `perspective(2400px) rotateY(-14deg) rotateX(4deg) rotate(-5deg)`, floating on `noise1`.
- **Chat inside phones**: header (avatar + name + mono handle + optional accent "● AUTOMATED" pill), mono day labels, bubbles: incoming `#E9E6E0`, yours accent with an ink border (right-aligned!), the product's in `accent2Text` with white text. Auto-scroll from bubble heights measured once at build.
- **Browser window**: paper panel, address-bar pill (`localhost:8501 · gtm serve`), status pill top right, a 3D slide-in (`rotateY(32deg)` settling to 0).
- **Terminal panel**: paper panel with an 18 px accent offset shadow, tabs (`zsh`, `gtm serve`), a status pill, command rows in accent, log rows with a spinner that becomes a check, a fade mask at the top of the log as it scrolls.
- **Dark feature cards**: ~390–510 × 560, loop icon top-left, `01 / 04` mono top-right, Inter 900 title, accent mono subtitle, a dark well with a live mini demo.

## The mascot

One character carries the film: a rounded accent square (ink outline 12, hard ink shadow), one eye that is a **product glyph** (a loop arrow for Loopcast: `loopArrow()` in components.js), an open mouth with an `accent2` tongue, stick arms with paper ball hands. `C.mascot({iconMode: true, arms: false, face: false})` is the same body as the app icon, so the end card can morph mascot → icon. Give it a reason to be on screen in every scene. It is also the object that carries hand-offs between scenes (see motion.md).

Design your own mascot for each product: change the eye glyph, the body shape (circle, squircle, blob), and the colours. Don't reuse someone else's character.

## Don'ts

- Corner HUD furniture (brackets, timecode, "MOTION · @name", progress bars) reads as template output. It is built but **off by default** (`?hud=1`).
- Blurred drop shadows, glassmorphism, purple-to-blue gradients, emoji used as icons in the layout. Emoji are fine *inside* chat/UI content.
- Pure white or pure black backgrounds; more than two accents in a frame.
- Text that wraps by accident: URLs must be `nowrap` + ellipsis, headlines are explicit lines.
