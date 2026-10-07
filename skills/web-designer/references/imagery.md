# Imagery and richness

Every page carries a **richness source** on its first screen: something to
look at that belongs to this product. Type on paper is not one.

## 1. What imagery can you honestly get?

Decide this before the directions (SKILL.md Step 2), so you do not design a
photo-led page with no photos.

1. **The user's own assets**: product photos, the shop, the team, the
   building, screenshots, brand illustrations. Always first. Ask for them.
2. **Generated images**, if an image tool is connected and the user agreed to
   spend credits. One art direction for the whole set (camera, light,
   distance, grade, palette), written in DIRECTION.md before the first
   prompt. Never generate fake customers, fake team members, fake reviews or
   photos presented as a real place.
3. **The product itself**: real UI built in HTML at full fidelity, real data,
   real states. For software this is often the strongest image there is.
4. **Drawn in code**: SVG illustration in one hand, CSS shapes and
   materials, a colour field, a pattern from the concept, a three.js object.
5. **Data as image**: a map, a chart, a timetable, a big number, if the data
   is real.
6. **Verified photos** from a source with a licence (the user's library,
   Unsplash with the photographer credited, Wikimedia Commons with the
   licence checked). Load every URL to verify it before using it, and
   download the ones you use into the site's assets rather than hotlinking.
   On Commons, `https://commons.wikimedia.org/wiki/Special:FilePath/<File name>?width=1600`
   returns a resized file directly (raw thumbnail URLs often answer 400).

### When the category is photo-led and there are no photos

Architects, restaurants, hotels, fashion, products: these are sold by
photographs, and inventing them is dishonest. In order of preference:

1. **Ask for them.** Even phone photos of real work beat any illustration;
   design the frames so their crop and grade make them look intended.
2. **Generated imagery**, only if the user agrees and only for atmosphere,
   never presented as their real work, place or people.
3. **The artefacts of the work**: drawings, plans, sections, material
   samples, menus, fabric swatches, recipes, receipts. Real, specific, theirs.
4. **Type and colour carrying the page** (directions F and D), with photo
   frames designed to receive the real photos later and captioned honestly.

Watch for the drift into generic illustration: isometric buildings on a
pale ground read as 2018 SaaS art, however well drawn.

## 2. Art direction

Write it like a brief to a photographer or illustrator:

- **Photography:** subject, distance (macro, table-top, room, landscape),
  light (window light at 8am, flash at night, overcast), lens feel, grade
  (warm and lifted, cold and crushed), what is never in frame.
- **Illustration:** one hand, one line weight, one palette, one level of
  detail, used everywhere.
- **Shape language:** the motif from the concept (the tide line, the
  ticket stub, the arch of the warehouse door), used for dividers, masks,
  buttons and loaders.

## 3. Banned

The unDraw person, the 3D glossy blob, the gradient mesh as personality, the
generic laptop-and-latte stock, the greyscale logo wall, placeholder
services (placehold.co, picsum, pravatar, source.unsplash.com) **[scan]**,
broken image URLs **[scan]**.

## 4. Craft

- Modern formats (AVIF, WebP) with `srcset` and `sizes`; the hero image is
  preloaded or `fetchpriority="high"`; everything below the fold
  `loading="lazy"`.
- `width` and `height` attributes, or `aspect-ratio`, on every image, so
  nothing jumps **[scan]**.
- Art-direct crops per breakpoint with `<picture>` when the subject would
  be lost on a phone.
- `alt` that says what the image shows and why it is there; `alt=""` for
  decoration **[scan]**.
- Text over images: measured by the scan; use a scrim or a band when it
  fails.

## 5. Collateral (Step 7)

The same direction carries to the small things people see first:

- **Favicon set:** an SVG favicon that works on light and dark tabs
  (`prefers-color-scheme` inside the SVG, or a shape with its own ground),
  plus a 180px `apple-touch-icon` and a 512px PNG for the manifest.
- **Social card:** `og.html` at 1200×630, built from the tokens, kept inside
  the site folder (the script serves only the file's own folder, so a link to
  `../site/styles.css` would 404), rendered with
  `shoot.mjs site/og.html --widths 1200 --height 630 --scale 1 --no-scan`. Real headline,
  real image, readable at thumbnail size.
- **Email header, README hero, slide cover**: same tokens, same type.
