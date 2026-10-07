# Type

Type is most of a website. Choose it like casting a voice, then set it with
the care of a printer.

## 1. Choosing a face

Ask what the concept *sounds* like, then find a face with that voice. Write
one sentence in DIRECTION.md: "<Face>, because <reason tied to the concept>."
"Clean and modern" is not a reason; it is the absence of one.

The scan warns on the **default reach** list (slop.md §3): Inter, Geist,
Poppins, Manrope, DM Sans, Plus Jakarta Sans, Space Grotesk, Outfit, Sora,
Instrument Serif, Fraunces, Playfair, Cormorant, Lora, Roboto, Open Sans,
JetBrains Mono, Space Mono. Using one is allowed when the reason is real (Inter
for a dense app UI that must render small numbers perfectly is a reason). Using
one because it came to mind first is the slop.

### Faces by voice

All free for commercial web use. **G** = Google Fonts, **F** = Fontshare
(free, ITF licence), **O** = open-source elsewhere (GitHub). Check the licence
before shipping; licences change.

| Voice | Faces | Notes |
|---|---|---|
| Precise, engineered | Schibsted Grotesk G, Familjen Grotesk G, Public Sans G, Switzer F, Hanken Grotesk G, Rethink Sans G, Albert Sans G | neo-grotesques with personality in the details |
| Wide, confident | Archivo G (width axis 62 to 125), Mona Sans / Hubot Sans O (width axis), Unbounded G, Anybody G (width 50 to 150), Krona One G | use the width axis: one family, expanded display, normal text |
| Condensed, signage | Big Shoulders Display G, Barlow Condensed G, Saira Condensed G, Antonio G, Six Caps G | headlines that fill a width; never for body |
| Warm grotesque | Bricolage Grotesque G (optical size axis), General Sans F, Be Vietnam Pro G, Figtree (default-ish), Onest G | friendlier than neo-grotesques |
| Literary serif | Newsreader G (optical sizes), Source Serif 4 G (optical sizes), Literata G, Spectral G, Crimson Pro G, Gelasio G | true text faces, long reading |
| Display serif with presence | Gloock G, Young Serif G, Zodiak F, Gambetta F, Erode F, Boska F, Bodoni Moda G, Libre Caslon Display G | big headlines; pair with a quiet sans |
| Soft, rounded | Fredoka G, Baloo 2 G, M PLUS Rounded 1c G, Chillax F, Varela Round G | toys, consumer, kids, food |
| Mono with character | Martian Mono G (width axis), Commit Mono O, Fragment Mono G, Azeret Mono G, Red Hat Mono G, Spline Sans Mono G, IBM Plex Mono G | figures, code, instruments |
| Pixel and screen | Silkscreen G, Pixelify Sans G, VT323 G, Redaction O, Press Start 2P G | interface nostalgia; display only |
| Signage and play | Bungee G, Rubik Mono One G, Climate Crisis G, Shrikhand G, Bagel Fat One G, Dela Gothic One G | one word at a time |
| Hyper-legible | Atkinson Hyperlegible Next G, Lexend (default-ish), Public Sans G | accessibility-led products, dense apps |

Also: **the system UI font, on purpose.** `system-ui` gives SF Pro on Apple,
Segoe UI on Windows, Roboto on Android, and Ubuntu, Cantarell or DejaVu on
Linux. For an app that should feel native that is a real choice, but the page
will look different on each OS (run the matrix). For a marketing site it is
almost never right.

### Pairing

- **One family is often enough.** A superfamily with width, weight and
  optical-size axes gives all the contrast you need.
- **Two at most** in the content; a third only for code or data. **[scan]**
- Pair by **contrast of role, harmony of construction**: a display serif with
  a sans of similar x-height; a condensed headline with a normal-width text
  face from the same era.
- Never a serif word dropped into a sans headline to look designed.

## 2. The scale

Six to eight steps, written as tokens, used everywhere. For sites, display
steps are fluid; text steps are fixed.

```css
:root {
  --t-display: clamp(3.25rem, 1.5rem + 7vw, 8.5rem); /* the one moment */
  --t-h1: clamp(2.5rem, 1.6rem + 3.6vw, 4.75rem);
  --t-h2: clamp(1.75rem, 1.3rem + 1.8vw, 2.75rem);
  --t-h3: 1.375rem;
  --t-body: 1.125rem;   /* 18px for reading sites; 16px floor */
  --t-small: 0.9375rem; /* 15px */
  --t-meta: 0.8125rem;  /* 13px: the floor for anything that must be read */
}
```

These numbers are a register, not your scale. Derive yours from the concept:
a poster site's display step may be 200px; an instrument app's largest text
may be 28px.

- **Real contrast:** the display moment at least 3x body on sites. Weight
  contrast of two steps (400 next to 700, not 500 next to 600).
- **Apps:** 13 to 14px body is normal for dense UI; 12px is the floor for
  metadata; headings are modest and hierarchy comes from weight, colour and
  position. Do not import marketing sizes into an app.
- **Line height:** 1.45 to 1.65 for body, 1.0 to 1.15 for display, tighter as
  size grows.
- **Measure:** 45 to 75 characters for reading text (`max-width: 65ch`).
  **[scan]**

## 3. Setting

- **Tracking:** tighten display (-1% to -4% at 48px+, more for heavy
  weights); never track lowercase body; open small caps and uppercase labels
  by 4 to 8%.
- **Numerals:** `font-variant-numeric: tabular-nums` wherever numbers align or
  change (tables, prices, timers, stats). Lining figures in UI, old-style in
  long-form if the face has them.
- **Sentence case** for headings, buttons and labels. Title Case Reads Like A
  Slide.
- **Optical sizes:** set `font-optical-sizing: auto` on faces with an `opsz`
  axis (Newsreader, Source Serif 4, Bricolage).
- **Widows and rags:** `text-wrap: balance` on headings, `text-wrap: pretty`
  on paragraphs.
- **Hyphenation:** `hyphens: auto` with a correct `lang` on long-form body
  text in narrow columns, especially German and Dutch. **Never on headings or
  display type**: "ware-houses" in a headline is a defect, whoever asks for it.
- **Real punctuation:** curly quotes, en dashes in ranges (9–5), the
  multiplication sign (1920×1080), non-breaking spaces before units.

## 4. Loading fonts properly (and the same on every OS)

The fallback is what Windows, Linux and slow networks see first. Make it
close, so the page does not jump.

- **Self-host or use the framework's font loader** (`next/font`,
  Fontsource, `@fontsource-variable/*`). Subset to the languages you need.
  Variable fonts when you use three or more weights.
- **Preload** the one or two files the first screen needs:
  `<link rel="preload" href="/fonts/display.woff2" as="font" type="font/woff2" crossorigin>`.
- **Self-hosting without a framework:** take the files from Fontsource's
  CDN, which serves real variable fonts:
  `https://cdn.jsdelivr.net/fontsource/fonts/<id>:vf@latest/latin-wght-normal.woff2`
  (variable) or `https://cdn.jsdelivr.net/fontsource/fonts/<id>@latest/latin-400-normal.woff2`
  (one static weight), where `<id>` is the family in lowercase with dashes
  (`schibsted-grotesk`). Google's CSS API may hand you static instances for a
  weight range, so check: a variable file renders 300 and 700 differently from
  one file.
- `font-display: swap` for text faces; `optional` for decorative ones.
- **Metric-matched fallback**, so the swap does not reflow:

  ```css
  @font-face {
    font-family: "Display Fallback";
    src: local("Arial"), local("Liberation Sans"), local("Arimo");
    size-adjust: 104%; ascent-override: 92%; descent-override: 24%; line-gap-override: 0%;
  }
  :root { --font-display: "Gloock", "Display Fallback", Georgia, serif; }
  ```

  `next/font` does this automatically (`adjustFontFallback`). Elsewhere,
  compute the numbers: `node <skill>/scripts/fallback.mjs path/to/font.woff2`
  prints the `@font-face` block for Arial (sans) or Times New Roman
  (`--serif`) fallbacks.
- **Write fallback stacks for every OS**, not just the Mac:
  - sans: `"Your Face", system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Liberation Sans", sans-serif`
  - serif: `"Your Face", Georgia, "Times New Roman", "Liberation Serif", serif`
  - mono: `"Your Mono", ui-monospace, "SF Mono", Menlo, Consolas, "Cascadia Mono", "Liberation Mono", monospace`
  `ui-monospace`, `ui-serif` and `-apple-system` exist only on Apple
  platforms; Windows and Linux skip them. The matrix shows what each stack
  becomes (platforms.md).

## 5. Things the scan checks

More than three families in use, default-reach faces, more than 11 sizes, a
flat hero scale, text under 11px, many 11px labels, running text under 15px
(13 in apps), lines over 88 characters, loose display tracking, eyebrow
overload, numbered mono eyebrows.
