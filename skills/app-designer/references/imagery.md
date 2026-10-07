# Imagery and icons

## 1. Icons

- **SF Symbols in the app.** 6,000+ glyphs that match SF Pro's weights and
  metrics. Set the symbol weight to the weight of the text next to it, and
  its scale (`.imageScale(.small/.medium/.large)`) to the context. Use
  hierarchical or monochrome rendering; multicolour only where the glyph
  is the content (weather).
- **In mockups**, SF Symbols are not available as a web font. Draw simple
  inline SVGs in the SF style: stroke 1.6 to 2pt at 22 to 24pt sizes, round
  caps and joins, geometric. Or use Phosphor Icons (regular or bold) from
  `https://unpkg.com/@phosphor-icons/web` and note "SF Symbol: <name>" in
  the spec. One set, one weight per screen.
- Filled glyphs for the selected tab only. Outline everywhere else, or
  filled everywhere, but decide.
- **Fewer icons.** A label alone is often clearer. Icons next to every row
  title, every section heading and every button is decoration.
- No emoji in the chrome. Ever.

## 2. Photography

Real photography is the fastest way out of slop and the most common thing
missing from generated designs.

- **Content is imagery.** Recipe photos, book covers, places, products,
  the user's own photos. Design screens around that content, large.
- **One art direction across the app:** the same light (soft daylight,
  hard flash, golden hour), the same distance (macro, mid, wide), the same
  grade (warm, cool, filmic, clean). Write it in DIRECTION.md.
- Crop with intent: tight crops feel editorial, wide ones feel calm. The
  subject sits on a third, not dead centre, unless the layout is symmetric.
- Text on photos: scrim only where the text sits, or put the text below
  the image. Check contrast on the actual frame.

### Getting images into mockups

In order of preference:

1. **The user's own assets.** Ask for them.
2. **Generated images,** if an image tool is available in the session (an
   image-generation MCP or API). Write one style preamble (camera, light,
   grade, surface) and reuse it verbatim in every prompt so the set looks
   like one shoot. Never generate people as hero content unless they will be
   replaced, and never generate text inside images.
   Only with the user's permission if it spends their credits.
3. **Unsplash photos by direct URL** (`https://images.unsplash.com/photo-<id>?w=1200&q=80`).
   Only use IDs you have verified load: `shoot.mjs` prints every failed
   request. A broken image in a mockup is worse than none.
   Unsplash search needs an API key and often fails; IDs from memory are
   hit and miss and rarely share one art direction. Treat them as stand-ins
   and say so.
4. **Make the imagery.** If photos are out of reach, choose a richness
   source you can draw: an SVG shape language, a lit CSS object, a
   pattern system, illustration in one consistent hand, a colour field that
   carries meaning. Drawn well, this beats mismatched stock.
5. **A deliberate colour field** with the image's subject written as a small
   caption ("Photo: lemon tart, overhead, morning light"). Honest and still
   composed. Never a grey box with a mountain glyph.

### Drawing it in SVG (mockups)

- Presentation attributes do not resolve CSS variables: `fill="var(--leaf)"`
  fails; write `style="fill: var(--leaf)"`.
- A nested `<svg>` clips its children; add `overflow="visible"` or size the
  viewBox to the art.
- Art that has to live on a small phone should sit in a flexing box
  (`flex: 1; min-height: 0`) with `preserveAspectRatio="xMidYMax meet"`, and
  the text anchored to the bottom, so the art shrinks instead of colliding.
- SVG-only richness can score fully. What it cannot fake is painted texture;
  do not chase gouache grain with noise filters, commit to clean cut shapes.

## 3. Illustration

Only if the concept is genuinely illustrated, and then **one hand, one
style, used everywhere**: the same line weight, palette and level of detail
from the onboarding to the empty states. A single expressive mascot or
drawing style (Bears Gratitude, Duolingo) beats a library of generic
scenes.

Banned as defaults: flat "unDraw"-style people, isometric tech scenes, glossy
3D blob icons, clay renders, AI-generated characters with no consistency.

## 4. The app icon

The icon is the first design anyone sees, and it is part of the required set
(SKILL.md Step 4): design it in `<section class="app-icon">`, which shoots at
1032px. Rules that separate crafted from generated:

- One idea, one silhouette, readable at 29pt on a busy home screen.
- Two or three colours. No text, no photos, no thin lines.
- Designed for the iOS 26 layered icon system (Icon Composer): foreground
  layers over a background, so it works in default, dark, clear and
  tinted modes.
- Not a generic glyph (a checkmark, a leaf, a chart) on a gradient
  squircle. If the symbol could be any app's icon, it is not yours.
