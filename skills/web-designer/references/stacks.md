# Building it in the user's stack

The deliverable is **real code in the project**, not a picture of a page.
Read the project before writing anything.

## 1. Find out what exists

- `package.json`: framework (Next, Remix, Astro, SvelteKit, Nuxt, Vite +
  React/Vue/Svelte), styling (Tailwind and its version, CSS Modules,
  styled-components, vanilla-extract, Sass), component library (shadcn/ui,
  Radix, MUI, Chakra, Mantine, Headless UI), icon set.
- Existing tokens, a theme file, global CSS, fonts already loaded.
- Framework docs that ship in `node_modules` (some frameworks change APIs
  between versions; follow the installed version's docs, not memory).
- How the project runs: the dev script and port. Shoot the real dev server
  URL, not a copy.

**No project yet?** Build a plain static site: `index.html`, `styles.css`,
optional `main.js`, an `assets/` folder. No build step, no framework, opens
anywhere, deploys anywhere. Add a framework only if the user asks.

**Do not add dependencies** to an existing project without saying so.
Never swap the project's framework or styling system.

## 2. Tokens first

One source of truth, named by role (color.md §2, type.md §2, layout.md §4):

```css
/* tokens.css */
:root {
  --ground: …; --surface: …; --ink: …; --ink-2: …; --rule: …; --accent: …; --accent-ink: …; --focus: …;
  --font-display: "…", <metric-matched fallback>, …; --font-text: "…", …; --font-mono: "…", …;
  --t-display: …; --t-h1: …; --t-h2: …; --t-h3: …; --t-body: …; --t-small: …; --t-meta: …;
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 24px; --s-6: 40px; --s-7: 64px; --s-8: 104px;
  --r-s: …; --r-m: …; --r-l: …;
  --ease-out: cubic-bezier(.2,.8,.2,1); --spring: linear(…);
}
```

### Tailwind v4

Tokens live in CSS with `@theme`, and Tailwind generates utilities from them:

```css
@import "tailwindcss";
@theme {
  --color-ground: oklch(…); --color-ink: oklch(…); --color-accent: oklch(…);
  --font-display: "…", …; --font-sans: "…", …;
  --text-display: clamp(…); --radius-m: …;
}
```

Then `bg-ground text-ink font-display text-display`. Remove the default
palette from use (do not reach for `slate-500`, `indigo-600`): if a colour
is not a token, it is a default.

### Tailwind v3

Same tokens as CSS variables, mapped in `tailwind.config.js` under
`theme.extend` (`colors: { ground: "var(--ground)" }`).

### shadcn/ui

shadcn is a set of components *you own*, styled by CSS variables
(`--background`, `--foreground`, `--primary`, `--radius`, …). Its defaults
are the shadcn Dashboard face (slop.md). To make it yours:

1. Rewrite the variables in `globals.css` from DIRECTION.md (all of them,
   light and dark).
2. Change `--radius` to the concept's radius family.
3. Edit the component files themselves where the concept needs it (button
   heights and weights, input borders, table density, card usage).
4. Replace the default Lucide stroke (`strokeWidth={2}`) with a weight that
   matches the type, or another set.

### Next.js

Fonts through `next/font` (`next/font/google` or `next/font/local`), which
self-hosts, subsets and generates metric-matched fallbacks
(`adjustFontFallback`). Images through `next/image` with real `sizes`.
Check the installed version's docs for API changes before writing code.

### Others

- **Astro, SvelteKit, Nuxt, Remix:** tokens in a global stylesheet; fonts
  self-hosted via Fontsource; follow the framework's image component.
- **CSS Modules / Sass / vanilla CSS:** tokens as custom properties in a
  global file; components consume `var(--…)` only.
- **MUI / Chakra / Mantine:** map the tokens into the library's theme
  object; override component defaults in the theme, not per instance.

## 3. Build order

1. Tokens and fonts, then a `/__tokens` or `tokens.html` page showing every
   colour, size and space (shoot it once: it is the cheapest review).
2. The core page or screen, with real content from DIRECTION.md.
3. Its states (app.md §3), its dark mode, its phone layout.
4. The other pages and screens.

## 4. Build traps (seen with Tailwind v4 in Next.js 16)

The build can drop CSS silently. A `linear()` easing inside the `animation`
shorthand dropped every rule after it; a rule whose only declaration was a
custom property (`.x:focus-within .y { --p: 1 }`) vanished. Both compiled
without a warning. So after a CSS change, check that the rule reached the
built stylesheet (the dev server's CSS link, or simply: does the shot show
it?), and prefer real properties over custom-property-only overrides. If the
render still shows the old CSS after an edit, the dev server's persistent
cache can be stale: stop it, delete its cache (`.next/` for Next.js,
`node_modules/.vite` for Vite) and start it again before debugging the CSS.

## 5. Quality floor (non-negotiable)

Semantic HTML (landmarks, headings in order, buttons are `<button>`, links
are `<a>`), labels on every field, visible focus, `lang`, a viewport meta,
`color-scheme`, images sized, no layout shift on font load, works without
JavaScript where it can (content visible, links work), Lighthouse-level
performance basics (preloaded hero, lazy below the fold, no 4MB PNGs).
