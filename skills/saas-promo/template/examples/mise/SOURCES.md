# mise: sources

## Showcase

The mise home window (`screens/window.html` → `assets/window_*.png`), the editor
(`screens/editor.html` → `assets/screen_chrome.png`, `screen_text.png`, `screen_card.png`)
and the generated NOCHE taco bar site (`screens/site.html` → `assets/screen_site.png`,
`screen_site_word.png`) are original HTML designs. Photos via Openverse, credited below;
cut-outs made with `tools/images/cutout.py`.

- Window hero, `screens/img/grill_5.jpg`: "Steak...on the Grill" by Another Pint Please..., CC BY-NC-SA 2.0, https://www.flickr.com/photos/53484449@N00/2186673560
- Taquería tile, Noche avatar and the hero plate (`assets/screen_hero_pastor.png`), `screens/img/taco_1.jpg`: "Tacos al Pastor - El Tigre, DF, México" by The Way of Slow Travel, CC BY-NC-SA 2.0, https://www.flickr.com/photos/38330543@N06/5515386075
- Bakery tile, `screens/img/bread_4.jpg`: "Sourdough Bread Loaf", CC0 1.0, https://www.rawpixel.com/image/5969750/sourdough-bread-loaf
- Wine bar tile, `screens/img/wine_2.jpg`: "Wine glasses" by sermoa, CC BY-SA 2.0, https://www.flickr.com/photos/89953410@N00/6838210225
- Ramen tile, `screens/img/ramen.jpg`: "momofuku ramen bowl" by Foodie Buddha, CC BY-NC 2.0, https://www.flickr.com/photos/11981131@N03/6406395627
- Salsa bar close-up, `screens/img/chili.jpg`: "Heap of Dried Red Chili Peppers" by qubodup, CC0 1.0, https://www.flickr.com/photos/21051491@N02/7698343400
- Baja fish cut-out (`screens/img/cut/fish_tacos.png`, `assets/screen_hero_fish.png`): "Mmm... fish tacos" by jeffreyw, CC BY 2.0, https://www.flickr.com/photos/7927684@N03/9641664708
- Birria cut-out (`screens/img/cut/birria.png`, `assets/screen_hero_birria.png`): "Carne de Cerdo en Adobo para los Tacos al Pastor" by jlastras, CC BY 2.0, https://www.flickr.com/photos/22662305@N04/4226083265
- Mezcalita cut-out, `screens/img/cut/cocktail.png`: "Mezcal cocktail" by sarahstierch, CC BY 2.0, https://www.flickr.com/photos/7633518@N08/53146799454
- Lime cut-out, `screens/img/cut/lime.png`: "Lemon and Lime" by wwarby, CC BY 2.0, https://www.flickr.com/photos/26782864@N00/11781986025
- Logo, `assets/logo.svg`: "mise" set in Fraunces Black Italic (SIL OFL 1.1, Undercase Type), converted to paths with fontTools.
- Fonts on the screens (loaded from Google Fonts at render time, all SIL OFL 1.1): Fraunces, Anton, Inter, Space Mono.

## Wall

Eight fictional businesses "built with mise" and the centre poster, designed as HTML in
`screens/cards/cards.html` and rendered by `screens/cards/render.sh` to `assets/card_*.png`
(640x360 at 2x). All names, menus and prices are invented. Photos come from Openverse (via
`tools/images/fetch.py`), each used under its licence; files in `screens/img/`:

- `wall_bread_5.jpg` (cut out -> `wall_bread_cut.png` (Crumb & Rye)): Malthouse sourdough by treehouse1977, CC BY-SA 2.0, https://www.flickr.com/photos/13071852@N00/4650494745
- `wall_wine_8.jpg` (amber duotone crop (Skin Contact)): 09-apr-07 by sashafatcat, CC BY 2.0, https://www.flickr.com/photos/91255327@N00/3421891911
- `wall_ramen_1.jpg` (circle crop (Okawari)): momofuku ramen bowl by Foodie Buddha, CC BY-NC 2.0, https://www.flickr.com/photos/11981131@N03/6406395627
- `wall_coffee_8.jpg` (full bleed, darkened (Slow Roast Co.)): Fresh coffee beans roasting machine by unknown, CC0 1.0, https://www.rawpixel.com/image/6039167/photo-image-background-public-domain-coffee
- `wall_icecream_2.jpg` (cut out -> `wall_cone_pink_cut.png` (Lola's)): Strawberry Ice Cream Cone by TheCulinaryGeek, CC BY 2.0, https://www.flickr.com/photos/72949902@N00/5076899310
- `wall_icecream_8.jpg` (cut out -> `wall_cone_berry_cut.png` (Lola's)): Ice Cream Cone Cupcakes by seelensturm, CC BY 2.0, https://www.flickr.com/photos/61404197@N00/4721105089
- `wall_pizza_6.jpg` (cut out -> `wall_pizza6_cut.png` (Slice Club)): pizza slice by stockcatalog, CC BY 2.0, https://www.flickr.com/photos/151691693@N02/42102998944
- `wall_oyster_3.jpg` (hard crop (The Pearl)): Oysters on Ice by naotakem, CC BY 2.0, https://www.flickr.com/photos/12832970@N00/4766990252
- `wall_dumpling_1.jpg` (photo grid (Golden Fold)): basil chicken dumpling by stu_spivack, CC BY-SA 2.0, https://www.flickr.com/photos/35034346243@N01/134506201
- `wall_dumpling_3.jpg` (photo grid (Golden Fold)): Korean dumpling[만두] by KFoodaddict, CC BY 2.0, https://www.flickr.com/photos/61056459@N05/6779015132
- `wall_dumpling_5.jpg` (photo grid (Golden Fold)): Omega3 Mango Dumpling by snowpea&bokchoi, CC BY 2.0, https://www.flickr.com/photos/28531775@N06/4266837850
- `wall_taco_1.jpg` (clipped into the arch (Late Night Tacos poster)): Tacos al Pastor - El Tigre, DF, México by The Way of Slow Travel, CC BY-NC-SA 2.0, https://www.flickr.com/photos/38330543@N06/5515386075
- `wall_chili_1.jpg` (circle crop (Late Night Tacos poster)): Heap of Dried Red Chili Peppers by qubodup, CC0 1.0, https://www.flickr.com/photos/21051491@N02/7698343400
- `wall_lime_2.jpg` (one lime cut out -> `wall_lime_cut.png` (Late Night Tacos poster)): limes up close by Florian Maul, CC BY-SA 2.0, https://www.flickr.com/photos/22451763@N00/69667785

Shapes (arches, stripes, steps, checker, moon, squiggle) are drawn in CSS/SVG. Fonts, loaded from
Google Fonts at render time (SIL OFL): Fraunces, Instrument Serif, Space Mono, Noto Sans JP,
Archivo Black, Shrikhand, Anton, Cormorant Garamond, Bricolage Grotesque, Inter.
