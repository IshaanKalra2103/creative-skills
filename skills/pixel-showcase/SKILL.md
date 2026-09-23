---
name: pixel-showcase
description: Build a gacha-style "who's that?" reveal for pixel-art game sprites in one HTML file — a black silhouette on a rune circle, press-and-hold to charge while the light escalates through rarity colours, a lights-out beat for epic+, hitstop and flash, then the silhouette bursts into its own pixels which fly home row by row wearing their real colours; name drop, type/stat card, NEW/SHINY stamps, a saved dex, chip-tune Web Audio. Ships two templates - Pokémon (live animated Gen 1 sprites + cries from PokeAPI) and procedurally generated creatures (offline, 30 seeded species). Use when the user wants a sprite reveal, a "who's that Pokémon" game, a loot/gacha/summon animation for pixel characters, a showcase page for their own game's sprites, or a pixel-art character collection toy.
---

# Pixel Showcase

One HTML file, no libraries: Canvas 2D at an integer pixel scale, Web Audio chip voices, a CSS bloom layer. `assets/showcase.png` shows the stages.

| template | sprites | needs network |
|---|---|---|
| `template/pokemon.html` | Gen 1 (151) animated Black/White GIFs + shinies, names/types/stats from PokeAPI, cry on reveal | yes (PokeAPI + raw.githubusercontent, CORS `*`) |
| `template/creatures.html` | 30 species generated from seeds: mirrored body mask, eyes, mouth/fangs, legs, wings, horns, ears, crown by rarity, EPX 2x, blink + breathe frames | no |

## The reveal (phases in `S.phase`)

| phase | what happens |
|---|---|
| `loading` | (Pokémon) fetch data + decode GIF frames; "..." or "NO SIGNAL - RETRYING" |
| `drop` 0.55s | silhouette falls onto the rune circle, bounce, land thud |
| `idle` | hold (pointer or Space) charges `S.v` over 1.6s; release decays it. Heartbeat speeds up, pillar of light widens, motes spiral in, charge bar under the circle |
| tease | at `v` = .3/.55/.8 the light jumps up a rarity tier (never past the real one): flash, shake, arpeggio. The colour *is* the tell |
| `eyes` (epic+) | lights out; creatures' eyes blink on (Pokémon: just the dark beat) |
| `burst` | hitstop (longer per rarity) → white flash → every opaque pixel of frame 0 explodes outward, hovers, then flies home on a curved path, top rows first; each landing ticks a pip |
| `shown` | sprite animates; name letters drop, types, stars pop, stat bars fill, stamp (NEW! / xN / SHINY!), god rays for rare+, confetti epic+, cry (Pokémon). Tap = poke / skip |
| `leave` | sprite zips into the DEX counter, next summon drops |

Rarity rules: every effect escalates with tier and never appears below it (rays 0/8/12/16, burst distance, hitstop, stars, sparkles, confetti, jingle length). Odds `.55/.27/.13/.05`; the bottom pills force the next tier.

## Workflow

1. Copy a template: `cp ~/.claude/skills/pixel-showcase/template/pokemon.html <dest>/index.html` (or `creatures.html`).
2. Serve it (`python3 -m http.server 8765` in the folder, background). `file://` mostly works but a server is what you test with.
3. Customize (below), then **verify with screenshots** — motion can't be judged from code. With Playwright: load, wait ~3s (drop + fetch), dispatch `pointerdown` on `#hit` and never release, screenshot at ~+1.1s (charge), ~+2.9s (burst, epic via the Epic pill), ~+8s (card). Take two card shots 0.5s apart to confirm the sprite animates. Check `#err` is empty and the console has no errors. Stop the server when done.

## Customizing

- **Your own game's sprites** (start from `pokemon.html`): replace `POOLS` (ids per tier) and `loadMon`. `loadMon` only has to return `{key, id, r, shiny, name, types, stats:[0..1 x3], grids:[grid0], w, h, frames:[canvas...], sil:[rows...], durs, total, fi(t), tints:{}, animated}` — frames cropped to one shared box, `grid0` = frame 0 as `'#rrggbb'`/`'.'` cells (drives the burst), `sil[i]` = frame i as `'#'`/`'.'` strings. `decodeGif` (WebCodecs `ImageDecoder`) handles any GIF; for a sprite sheet, slice it into canvases instead. `TYPE_COL` maps type names to palette keys.
- **Tiers/odds/effects**: `RAR` (name, ramp, odds, rays, stars, hitstop, burst distance, title colours).
- **Shiny rate**: `SHINY_ODDS` (1/16 by default, deliberately generous).
- **Creature look**: `BODY`/`ACC` ramps, size per tier (`bw`, `bh`), feature odds in `getSpecies`, names from `SYL1`/`SYL2`.
- **Scene**: `background()` (per-pixel lit sky/floor, rays, pillar), `obelisk()`, `runeCircle()`; layout constants in `resize()` (`TOP`, `FY`, `SC` picks the largest integer scale giving ~200 logical px across).
- **Dex** persists in `localStorage` (`poke-summon` / `sprite-summon`), wrapped in try/catch.

## Rules of the look

- Integer scale, `image-rendering: pixelated`, no smoothing, no alpha, no blur inside the canvas. Gradients are 6-step palette ramps with 4x4 Bayer dither; bloom is a separate blurred CSS copy.
- One fixed palette (`PAL`, ~30 colours). Rarity ramps: silver, teal, violet, gold. Imported sprites keep their own colours; everything around them stays on-palette.
- Text is the 3x5 bitmap font with 1px black outline; titles use per-row ramps, legendary cycles gold.
- Shake is a CSS translate by whole screen pixels × `SC`, so pixels never go sub-pixel.
- `prefers-reduced-motion`: shake, particle counts and burst distance scale down.
- Sound: pulse-25%/square/triangle/noise only, through a short echo; starts on first interaction; mute button.

## Gotchas

- First rAF timestamp can precede `performance.now()` → clamp `dt` to ≥0, or frame indices go negative.
- Hold is ignored during `drop`/`loading` — wait before dispatching a synthetic press.
- `ImageDecoder` is Chromium-only; elsewhere the Pokémon template falls back to the static PNG with a float bob.
- Big sprites (~60px) crowd the obelisks on narrow screens; `OBX` sets their distance.
- Pokémon sprites, names and cries are © Nintendo / Game Freak / The Pokémon Company and are fetched at runtime from PokeAPI, not bundled. Keep it a personal/fan toy; use your own sprites for anything public or commercial.
