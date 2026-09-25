# The ten families

Each family is a snippet in `template/families/<name>.html` and a CSS block `.f-<name>` in `assets/stamp.css`.
Everything inside a stamp is in **cqw of the stamp**, so tune sizes as percentages of its width, never px.
**Image framing (`object-position`, brightness) goes inline on the `<img>`, not in the family CSS**, because it changes per image.

Sizing lives on the `<figure>`: `--w` (width in the *tile's* cqw), `--ar` (width/height), `--rot` (tilt, keep it within ±3°).
Tiles are 4:5, or 8:5 with `.wide`. Tile colours: `t-red`, `t-green`, `t-black`, `t-cream`.

| family | tile | `--w` / `--ar` | image wants | treatment |
|---|---|---|---|---|
| museum | black | 66 / .72 | old-master portrait or interior with a clear object | color; lift dark oils with inline `brightness(1.3)` |
| pixel | black | 70 / .8 | a face or portrait, colour | color; `.art` aspect-ratio must equal the image's |
| botanical | cream, wide | 80 / 1.62 (3 papers) | botanical/mycology plates on pale paper | color plates + `multiply`; a dark plate → `ink` mode + `.ink` sepia |
| condensed | red/black, wide | 52 / 1.08 | **high-key** bw photo or painting, figures on a light ground | bw + `multiply` onto the cream face |
| window | red | 43 / .46 | a tall painting, or a vertical slice of a wide one | color, `object-position` picks the slice |
| swiss | black | 78 / .82 (2 papers) | engraved hand/figure on a light ground, a planet, a woodcut landscape | bw + `multiply` into flat blue; bw + `multiply` over a red sun disc |
| ticket | black, wide | 72 / 1.6 | a dramatic bw face or scene, horizontal | bw, contrast 1.35, halftone dot overlay |
| panels | green | 72 / .78 | four bw details: hand, moon, face, planet | bw + `luminosity` over dark green = green duotone |
| poster | black | 70 / .75 | a bw face, close-up | bw + `multiply` into red = red duotone |
| circle | black | 60 / .66 | **high-key** bw archival photo (sky, fog, beach) | bw + `multiply`; the red disc and bar overlap the panel edge |

## Per family: parts and rules

### museum (old-master editorial)
Parts: `.fill` painting, `.shade` gradient, 3 yellow `.dot`s (d1 large, hard-light, half off the right edge), `.brand` issuer in serif + mono,
`.val` serif denomination, `.coords`, `.obj` sparkle + words, `h2` grotesk 800 headline in yellow (3 short lines), `.cat` two-column catalogue
table (cat. no / artist / title / date / medium / size, **real facts** about the artwork), `.foot`.
Rule: the headline sits in the bottom 40% over the dark shade. Keep dots off the headline.

### pixel (fragmented portrait)
`.art` gets `style="--img:url(...);aspect-ratio:W/H"` and `data-pattern` of 7 rows × 6 cols: `.` image, `K` black, `b` blue, `c` cream,
`s` = an image chunk taken from 2 cells right/2 up. Keep the eyes and mouth cells as `.` or `s`; put blue and cream round the edges of the face.
`.x1–.x3` are loose squares outside the grid. Headline: 3 words in caps, grotesk 800.

### botanical (se-tenant strip)
Three `.paper`s side by side in one `.stamp` (touching = joined perforations). Each has `.den` (serif numeral + CENTS), `.tr` micro-copy,
`.plate`, and `.ttl` (serif small caps + mono line). Middle stamp: a `.pm` postmark. Last: an italic `.note`.
Denominations rise across the strip (08, 12, 20). Titles read as a sequence.

### condensed (one giant word)
`h2` in Anton, sized so the word spans ~95% of the width (`font-size` ≈ 140 / letters cqw, then tune), `scaleY(1.32)`.
`.lb` leader labels (`.r` flips direction) point at things in the picture, positioned inline. `.strip` along the bottom:
quote in mono caps, globe, word list, value in Anton. Oxblood on cream.

### window (narrow slot)
`.slot` image occupies the middle 38%. Left column: huge serif `.val`, `.wp`, a `.pm` postmark straddling the slot edge,
an italic 3-line `blockquote`, a globe, and `.carriers`. The right column carries the year of the artwork and 4 words.

### swiss (Swiss-Japanese pair)
Two `.paper`s with a 3% gap. **A**: serif headline, a red rule, a 3-line Japanese translation, a `.blue` panel with a cream `.moon` disc and a
`multiply`'d engraved `.hand` (rotated to reach up), an SVG orbit line, red dots, a bottom `.band` photo, and a footer with a JP phrase.
**B**: serif issuer, vertical `.chikyu` kanji (地球 / 月 / 海…), a `.earth` disc (`clip-path:circle()` to drop any black surround),
an `.axis` line, a `.land` panel (red `.sun` + bw woodcut multiplied), vertical `.flow` JP, a `.hanko` seal (one kanji), and coordinates.
Get the Japanese right: short, natural phrases. Don't machine-translate the English headline word for word.

### ticket (street-label)
`.top` 5-cell header row, `.ph` photo + `.dots` halftone, `.jp` 3-line heavy Japanese on the left, `.word` = one lowercase word in
Inter Tight 900, red, speckle-masked, overlapping the photo (`line-height ≥ 1`, or the mask clips the descenders), `.kata` katakana of the word,
and the `.bot` row: A-box with QR and barcode, a middle blurb, an R-box with a warning triangle, POSTAL VALUE.

### panels (green duotone)
`.panels` = 4 `.pn` (image with `mix-blend-mode:luminosity` on dark green) + `.labels` (01 word / 02 word…). The `.field` holds an italic
quote, a big grotesk `.val`, the SVG orbit diagram, a list, a colour `.chip`, and a globe. `.word` = one 6-letter wordmark in Archivo 900 at
`font-stretch:125%`, with the first O replaced by the sparkle-in-circle SVG (change the letters after `</svg>`; an O-less word can drop the SVG).

### poster (red duotone)
`.top` row (issuer, globes, sparkle, list, boxed value), `h2` a 4–5 letter word in Anton at ~40cqw with the speckle mask, a `.haz` hazard band
and an italic `.slog`, the `.ph` face multiplied into red with a black border, and a `.bot` row (№ box, lists, globe, barcode).

### circle (red-circle collage)
A big grotesk `.val`, a `.panel` photo (right 60%), a `.sun` disc overlapping the panel's top-right corner, `.bar` + `.bar2` overlapping its left edge,
mono lists down the left column, a barcode, a serial, and years stacked on the right. The serial and years should be real (e.g. the photo's date).

## Copy pattern (all families)
- One issuer name used everywhere (masthead, `.brand`, footers, postmark ring). Fictional: **never a real museum or post office**.
- Denominations vary across the set: ¢ / € / plain decimal ("0.90 POSTES").
- Micro-copy is 3–6 one-word lines closed with `<span class="rule"></span>` (renders "—").
- One human line per stamp: an italic serif aphorism **or** a bold grotesk slogan, never both at equal weight.
- Facts must be true: artwork title, date, medium, size, museum coordinates, event dates. Look them up; don't guess.
