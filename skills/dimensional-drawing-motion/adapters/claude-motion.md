# Adapter: Claude Motion (claude.ai)

Primary target. The reference film was made and tuned here.

## Create the film

1. On claude.ai, create an Artifact from the **Motion** type (Artifact tool → `quickstart` with intent `other`, or the Motion `type_url` from a `types` listing). Follow the instructions the type returns; they win over this file if they differ.
2. Write the store documents with the `ArtifactData` tool (pin every write with `if_version` once a document exists):

| collection | doc_id | data |
|---|---|---|
| `film` | `meta` | `{ "title": "<Component> Drawing Motion", "v": 1 }` |
| `film` | `script` | `{ "code": "window.CUT = kit.scenes();" }` |
| `modules` | `scenes.json` | `{ "kind": "json", "text": "<JSON below as a string>" }` |
| `modules` | `base.css` | `{ "kind": "css", "text": "<templates/base.css>" }` (keep the type's own base rules and append the `.dw-*` rules) |
| `modules` | `scene-drawing.js` | `{ "kind": "js", "text": "<your adapted templates/scene-dialog.js>" }` |

`scenes.json`:

```json
{
  "v": 1,
  "stage": "final",
  "look": "Technical drawing: the component's dimensional drawing draws itself line by line, camera pulls back, layers explode, full sheet completes. Black line on white.",
  "palettes": [["#FFFFFF", "#111111", "#111111", "#767676"]],
  "width": 1920, "height": 1080, "fps": 60, "background": "#FFFFFF",
  "fonts": { "sans": { "family": "Arimo", "or": "instrument-sans" } },
  "scenes": [{ "id": "drawing", "name": "The drawing", "dur": 11, "desc": "Header draws up close, pull back to plan, layers lift into the exploded view, out to the whole sheet." }]
}
```

The scene id in `scenes.json` must match `kit.scene('drawing', …)` and the module name `scene-<id>.js`.

3. Open the artifact, scrub the timeline, and export MP4 from the Motion UI.

## Iterating

- Small timing change: `str_replace` on the `text` field of `modules/scene-drawing.js` (e.g. the `t / 0.85` factor or a `DW_CAM` key).
- Before writing, test locally: `adapters/headless/render.mjs --still <t>` renders any frame with the same scene file, so you can look at the key beats without a round trip.
- Fonts: Motion loads Arimo; the headless renderer falls back to Helvetica/Arial when offline (same metrics).
