# Engine API (templates/dx-*.js)

Load order (classic scripts, so file:// works): `dx-compute.js → dx-core.js → dx-world.js → dx-engine.js →
dx-explainer.js`, then one `<script type="module">` imports three@0.160.0 + addons from jsDelivr and calls
`DX.start(THREE, addons)`. Only the CDN imports are modules. Never `import` a local file (see gotchas).

## DX.define(cfg): the whole explainer is one config object

```js
DX.define({
  title: ["THE SOFT", "LOOKUP"],            // small-caps line + big accent line
  pageTitle: "The Soft Lookup",            // <title>
  description: "2–3 lines, html ok",
  backLink: { href: "../index.html", text: "&larr; study hub" },   // or null
  colors: { query: "blue", key: "green" },  // semantic colours -> K.CSS/K.COL[name] and CSS var(--c-name)
  bench: { x0: -12.5, x1: 22.5 },           // workbench extent (world x); stations live between
  wallScreens: [{ x, caption, art(ctx2d, w, h) }],   // optional; default = abstract screens every 15 units
  stations: [                               // order = station number = key 1..9
    { name: "Match: q · k", short: "Match", plinth: { x: -5.1, w: 10.4, label: "match" } },
  ],
  state: { query: "sweet+red", tau: 1, mode: "soft" },    // initial S (deep-copied; the tour resets to it)
  controls: [                               // rendered top-right, in order
    { key: "query", label: "Query", hint: "small right-aligned hint", type: "seg", options: [["v", "Label"], …] },
    { key: "tau", label: "Temperature τ", type: "range", min: 0.1, max: 3, step: 0.05, fmt: (v, S, R) => `τ = ${v}` },
    { key: "mode", type: "seg", options: […], stages: [2, 3] },      // contextual: only shown on these stations
    { key: "gen", type: "button", label: "Generate ▸", primary: true, onClick: (api) => … , stages: [10] },
    // per control: half: true (pairs two in a row), rerun: false (UI-only), refocus: true (re-fly camera),
    //              onChange(api, value) (side effects before the rerun)
  ],
  explode: true,                            // false hides the Assembled/Exploded control and the X key
  compute: (S) => R,                        // THE REAL COMPUTATION: return every intermediate
  text: (stage, R, S, api) => ({ chips: [["label", "value"], …], html: "<p>…</p><div class='fx'>…</div>", kick: "layer 1" }),
  console: (R, S, api) => "<span class='tok on'>…</span>…",   // optional live strip above the filmstrip
  tour: [{ stage: 1, dur: 8, pre: (api) => …, acts: [[3.6, (api) => api.set("query", "crunchy")], …] }],
  keys: { m: (api) => api.set("model", api.S.model === "dense" ? "moe" : "dense") },      // extra hotkeys
  init: (api) => …,                         // after URL params are applied, before the first compute
  update: (dt, api) => …,                   // per-frame hook (rarely needed)
  onUI: (api) => …,                         // after every UI refresh (e.g. custom panel widgets)
  onExplode: (api) => …,
  labelRange: 34,                           // hide pill labels farther than this from the camera
  build: (ctx) => [station1, station2, …],  // one object per cfg.stations entry
});
```

## Station contract

```js
{
  setData(R, S) {},      // called after every compute: push numbers into displays, rebuild beams/rays
  enter(delay) {},       // the station became current; start its intro after `delay` s (= 70% of the camera fly)
  update(dt, S) {},      // every frame, for EVERY station (cheap; gate heavy work on S.stage if needed)
  focus(S) { return { target: Vector3, pos: Vector3, fit: 10.4 }; },   // camera framing; fit = world width to fit beside the HUD
  skipIntro() {},        // jump the intro to its end state (used for thumbnails and screenshots)
}
```
The intro-clock pattern: `st.tau` starts at `-delay` in `enter`, `update` adds `dt`, and animation reads
`seg(tau, a, b)`. `skipIntro` sets `tau = 99`, and code treats `tau > 50` as "fully shown".

## ctx (passed to build) and api

`ctx = { THREE, A (addons), K (kit), scene, camera, hover, S, cfg, params, world, api }`
- `ctx.hover.push({ obj: mesh, info: (hit) => html })`: raycast tooltip; `hit.instanceId` for instanced meshes.
  `MatrixDisplay` has `.hover(id)` built in, so: `hover.push({ obj: d.cells, info: h => d.hover(h.instanceId) })`.
- `ctx.world.plinth(x, w, label)`: extra plinths beyond the automatic ones.

`api = { S, R (getter), K, ctx, set(key, v), rerun(), refresh(), goStage(n, dur), startTour(), stopTour(), isTouring(), camera, controls, renderer, scene }`
- `api.set(key, v)`: the one way to change state. Coerces numbers, runs `onChange`, re-runs compute unless
  `rerun:false`, refreshes the UI. `api.set("explode", 1)` drives the exploded view.
- `S` always has `stage`, `explode` (0/1 target), `explodeAmt` (damped 0..1, use this in update), `time`.

## Kit (K = DX.core(THREE, A)) highlights

- Math/easing: `clamp, lerp, seg(t,a,b), damp(cur,target,λ,dt), ease.inOut/out/outBack/sine`.
- Colour: `CSS`, `COL`, `semantic(map)`, `hdr(css, k)` (HDR colour for glow), `divColor(v, scale)`, `divCss`.
- Materials `M.*` (see design-language.md), `RB(w,h,d,r)`, `mesh(geo, mat, x, y, z, parent)`, `gearGeo`, `knurlGeo`, `ringGeo`.
- `textPlane(wUnits, hUnits, ppu, {renderOrder, brightness, opacity})` → `{ mesh, draw(fn(ctx2d, W, H, ppu)), mat }`.
- `fmt(v, decimals)`: proper minus sign, −∞/∞.
- `MatrixDisplay({maxRows, cols, pitch, kind, scale, title, titleColor, colLabels, labelW, padR, numbers, case, rails, sym, hiColor, depth})`
  `.setData(rows, labels, {title, scale})`, `.setHighlight(r)`, `.setRowAmt(r, 0..1)` (pop-in), `.numAlpha`,
  `.dimRows[]`, `.rowY(r)`, `.update()` (call every frame), `.hover(id)`. Anchored bottom-centre; row 0 on top.
- `Chip(text, {color, glow, h})` `.setText`, `.setGlow(css, k)`, `.w` (width).
- `Beam(css, {density, speed, intensity, opacity, segs, radial})` `.setCurve(curve, radius)`; animated flow
  shader; `material.uniforms.uOpacity/uColor`.
- `Rays(css, opts)` `.setSegments([[p0, p1, t0, t1], …])`: line bundles; t0/t1 = position along the light path (for the pulse).
- `Dial({r, min, max, major, minor, label, sub, color, marks, bands, tick})` `.setValue(v, readout)`, `.update(dt)`.
- `tag(text, sub, {stages, cond(S), dot, cls: "warn"|"hot"|"big", cx, cy})` → CSS2DObject; `.setText(t, sub)`.
- `timeU`: shared time uniform (all flow shaders); `dotTexture()`.

## URL parameters

| param | effect |
|---|---|
| `?stage=N` | start at station N |
| `?<stateKey>=v` | preset any key of `cfg.state` (`?mode=hard&tau=0.3`) |
| `?explode=1` | start exploded |
| `?record&fps=30` | deterministic capture mode (below) |

## Window hooks

- `window.__ready`: true once booted (thumbnails rendered, first fly started).
- `window.__dx = { api, stations: [names], tourLength }`: used by shoot.py; handy in devtools.
- Record mode only: `window.__tourLength` (s) and `window.__frame(i)`, which starts the tour on the first call,
  steps the simulation by exactly `1/fps` until frame i, renders, and returns `{ t, done, stage }`. CSS
  transitions are disabled (`body.record *`), grain drops to 0.014, and the loader, tooltip and back link hide.

## Engine behaviours you get for free

Camera director (eased flights with a crane arc, `fit` framing, refit on resize), filmstrip thumbnails rendered
from each station's focus at boot, scrubber, keyboard (1–9/0, ←/→, X, T, ?), tour with progress bar (any click on
the canvas stops it), contextual control rows, pill-label visibility by station/condition/distance, hover
tooltips, bottom-sheet layout ≤ 860 px, adaptive pixel ratio (steps down 0.25 when < 52 fps for 2 s), MSAA
only below DPR 1.75.
