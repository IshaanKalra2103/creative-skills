# `window.XRAY` config

Set in a classic `<script>` in `index.html`, before `engine.js` loads. Every field is optional except `model.url`.

```js
window.XRAY = {
  model: { url: 'assets/model.glb', forward: '+z', size: 4.5 },
  stages: 'auto',            // or { lead: [...], base: [...], frame: [...], core: [...], shell: [...], skin: [...] }
  split: 'auto',             // 'auto' | 'islands' | 'slices' | false
  fallback: 'shell',
  from: {},                  // per-stage fly-in override, e.g. { core: [0, 1.2, 0] }
  density: [],               // [[regex, value], ...]
  defaultDensity: 0.8,
  gain: 1.2,
  track: { front: [], top: [], detail: [] },
  focus: 'node_or_path',     // or [x, y, z]
};
```

## model

| field | default | meaning |
|---|---|---|
| `url` | `assets/model.glb` | GLB or glTF. Draco, meshopt and KTX2 are wired up (the Draco and Basis decoders are fetched from jsDelivr only when a file needs them). Cross-origin URLs need CORS; jsDelivr's `gh/` mirror of a GitHub repo works |
| `forward` | `+z` | which way the model's front faces. glTF's convention is +Z; many car downloads face −Z. The engine turns the front to −Z, where the front-view camera sits |
| `size` | `4.5` | the largest extent after scaling. The film's frames are relative to the model, so this mostly sets the floor-reflection falloff and near/far planes; leave it unless the look is off |

After normalising, the model sits on y = 0, centred on x/z. `M = { l, w, h }` (length along z, width along x, height) is logged as `[xray] size …` and passed to `film.js`.

## stages

Six build stages, in the order the default film reveals them:

| stage | reference car | think of it as |
|---|---|---|
| `lead` | grille, lamps, badges | the first thing seen, at the front |
| `base` | four wheel groups | ground contacts |
| `frame` | metal, brakes, underbody | structure |
| `core` | seats, dash, steering wheel | interior |
| `shell` | body, chrome, wipers | outer panels |
| `skin` | glass | the thinnest outer layer, last on |

`stages: { lead: ['^grills$', '^lights$'], … }`: regex strings tested against object names as three.js sees them (run `scripts/glb-parts.mjs`: spaces become `_`, `[ ] . : /` are dropped, duplicates get `_1`, `_2` … in load order). The scene is walked top-down, and **the first object whose name matches claims its whole subtree**, so matching a group takes all its meshes. Anchor your regexes (`^body$`), or `^lights` also eats `lights_red`.

Meshes that no regex claims go to `fallback` (default `shell`). `stages: 'auto'` (or omitting it): the front 12% of the length leads, and the rest is sorted by height into five equal bands, base → skin.

A stage with no parts logs a warning; the film still runs, it just shows nothing new at that beat.

## split

AI sculpts, scans and many downloads are one merged mesh, which leaves nothing to assemble.

- `'auto'` (default): split only when the model has fewer than 6 meshes.
- `'islands'`: weld vertices by position, find connected pieces. The 40 largest become parts; the rest merge into a 3×3×3 grid of buckets so crumbs don't become hundreds of draw calls. It falls back to slices when there are fewer than 6 islands.
- `'slices'`: triangles are bucketed by centre into the six stages: front band → `lead`, then five equal-count height bands. Each slice also gets up to 3 invisible helper boxes (its densest 0.12·L cells) so the tracker has nodes to lock onto.
- `false`: never split.

Split pieces are named `<mesh>_island<i>` / `<mesh>_slice<i>` and carry a stage hint that wins over `fallback`. Skinned meshes are never split.

## density, gain

`density: [['^glass', 0.2], ['^metal', 1.1]]` sets per-mesh darkness, first match wins, `defaultDensity` otherwise. It's tested against *mesh* names (inside a claimed group too), so `^brake` hits every `brake_N` disc. Glass and big body panels read best at 0.2–0.5, and dense mechanical bits at 1.0–1.3. `gain` scales everything (the film fades it at the end). If the whole model is grey mush, lower `gain` or the shell's density; if it's faint, raise them.

## track, focus

Tracker node lists for the three camera set-ups the film uses (`trackSet` 0 = front, 1 = overhead, 2 = close-up). Entries are node names, or `'parent/prefix'` for the first descendant of `parent` whose name starts with `prefix` (`'wheel_fr/brake'`). Missing lists are auto-picked: mid-sized parts (5–35% of the length), spread out, ordered left to right. For `detail` they're picked near `focus`.

Nodes are boxed only once their stage has landed (reveal ≥ 0.6), so a node in a late stage won't show in an early beat. The first reference bug was a steering wheel tracked while still parked above the car.

`focus`: the close-up target: a node name/path (its bbox centre and diagonal become `F` and `fs` in `film.js`) or `[x, y, z]` in normalised model space. Auto: the mid-sized part furthest toward the front and +x, which is the corner that sits screen-left from overhead, like the reference.

## URL options

- `?p=NN`: jump to NN% with an unsmoothed scroll (captions and ScrollTrigger behave as in real scrolling); used by `shot.mjs`.
- `?parts`: log every part with its stage, centre and size.
- `window.xray` exposes `{ S, tl, camera, root, parts, find, M, focus, TRACK_SETS }` for poking in devtools.
