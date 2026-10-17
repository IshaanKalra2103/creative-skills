# bolt-weekend: sources

The film rebuilds bolt.new's "Bolt is free for everyone, all weekend long. And you could win
$10k!" promo (StackBlitz). `reference.jpg` holds frames from the original for comparison; the
original video and its music are not included. `audio/bgm.mp3` is an original track made with
`tools/bgm.py` (120 bpm); to use the promo's own music, put it in `audio/` and name it in
`[video] audio`.

## Screens (rebuilt as HTML, rendered to PNG at 2x with Playwright)

- `window_*.png`: the bolt.new home window, one layer per file (base, side, nav, hero, h1,
  h2, sub, prompt, icons, start, all). The hero gradient was measured from the reference.
  Serif headline: Literata Italic (Google Fonts, OFL); UI: Inter (OFL); icons: lucide-static
  0.469.0 (ISC).
- `logo.svg`: the bolt.new wordmark, the inline SVG from https://bolt.new (fetched 2026-10-17).
- `screen_editor_chrome.png`, `screen_editor_text.png`, `screen_editor_card.png`: the Bolt
  editor around the generated site. `screen_site.png`, `screen_site_move.png`: the STRIDE
  sneaker store (fonts: Anton, Archivo, Inter; all OFL).
- `screen_hero_*.png`: the hero shoe flipbook. Shoe photos: StockX 360 product spins of the
  Nike Shox TL "Metallic Silver", "Black Metallic Silver" and "Hyper Royal" (stand-ins: the
  reference's shoes are AI-generated); `screen_hero_olive.png` is a recolour.

## Card wall

- `card_*.png`: original fictional site thumbnails (HTML), with these pictures:
  - `card_move.png`: a Nike Pegasus Trail 5 GTX product image (static.nike.com)
  - `card_plants.png`: four potted plants and palm leaves (pngtree.com clip art)
  - `card_coffee.png`: a coffee cup and beans (pngtree.com clip art)
  - `card_travel.png`: a coast photo (Unsplash, photo-1758869160269-a393dfb84611)
  - `card_arch.png`: an architecture photo (via Pinterest)
  - `card_sky.jpg`: a sky with clouds (boxist.com), and `card_paper.png`: a crumpled paper
    ball (pngtree.com), both used inside the MAKE SOME NOISE collage
  - `card_planet.png`, `card_analytics.png`, `card_wave.png`: drawn in code / HTML (original)
- The OFFGRID card and the MAKE SOME NOISE poster are built-in `wall` cards drawn in code
  (an original collage, not the reference's art).
