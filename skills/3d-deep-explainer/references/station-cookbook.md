# Station cookbook

Reusable parts, each with when to use it and working code against the kit (`K`) from `dx-core.js`. All snippets
assume this preamble inside `build(ctx)`:

```js
const { THREE, K, scene, hover } = ctx;
const { M, mesh, RB, CSS, hdr, seg, ease, lerp, damp, MatrixDisplay, Chip, Rays, Beam, Dial, tag, textPlane, FONT, MONO } = K;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const regHover = (d) => hover.push({ obj: d.cells, info: (hit) => d.hover(hit.instanceId) });
function stand(x, z, yTop, w = 1.6) {              // dark foot + two brass posts; a display sits on top at y = 0.22 + yTop
  const g = new THREE.Group(); g.position.set(x, 0.22, z); scene.add(g);
  mesh(RB(w + 0.3, 0.12, 0.7, 0.04), M.dark, 0, 0.06, 0, g);
  for (const sx of [-1, 1]) mesh(new THREE.CylinderGeometry(0.035, 0.035, yTop - 0.12, 10), M.brass, sx * w / 2, (yTop + 0.12) / 2, 0, g);
  return g;
}
```
Coordinates: bench top y = 0, plinth top y = 0.22, viewer at +z. Stations occupy about 8–12 units of x.

---

## 1. Value grid: vectors and matrices with real numbers
**Use for** any vector or small matrix (embeddings, activations, keys, features). One row per item; hover shows
4 decimals. `kind: "div"` for signed raw values; a semantic colour name for typed vectors.

```js
const d = new MatrixDisplay({ maxRows: 10, cols: 8, pitch: 0.27, kind: "div", scale: 1.2, title: "x = c + p",
  titleColor: CSS.accent, colLabels: null, sym: (r, c) => `x<sub>${r + 1}</sub>[${c + 1}]` });
d.position.set(X, 0.75, 0.3); scene.add(d); regHover(d); stand(X, 0.3, 0.53, 1.9);
// setData:  d.setData(rows, rowLabels, { scale });  d.setHighlight(t);
// update:   for (i) d.setRowAmt(i, ease.outBack(seg(tau, 0.2 + i * .08, 0.6 + i * .08))); d.numAlpha = seg(tau, 1, 1.5); d.update();
```
Pitch 0.27 suits 8 columns, 0.36 suits ≤ 4 columns, and 0.22–0.24 a single row. `scale` = |value| that hits full
colour (set it from the data's real range, or everything looks the same). `labelW` reserves room for row labels.

## 2. Grid plane: pairwise scores (attention, confusion, DP table, adjacency)
**Use for** an n×n relation where rows and columns mean different things. Draw the board on a dark screen, with
an instanced tile per cell and one canvas for numbers and labels, and mark the query row.

```js
const att = new THREE.Group(); att.position.set(X, 0, 0.1); scene.add(att);
const back = mesh(RB(1, 1, 0.12, 0.05), M.screen, 0, 0, -0.12, att);
const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }), 100);
att.add(tiles); hover.push({ obj: tiles, info: (h) => cellInfo(h.instanceId) });
const txt = textPlane(5.6, 5.6, 200, { renderOrder: 7 }); att.add(txt.mesh);
function layout(M_, allowed, labels, t) {            // M_[r][s] in [0,1] (weights), allowed[r][s] bool
  const n = M_.length, pa = Math.min(0.6, 3.0 / n), gw = n * pa, base = 1.2, m4 = new THREE.Matrix4(), col = new THREE.Color();
  back.scale.set(gw + 1.9, gw + 1.15, 1); back.position.set(-0.35, base + gw / 2 + 0.2, -0.14);
  let i = 0;
  for (let r = 0; r < n; r++) for (let s = 0; s < n; s++, i++) {
    m4.compose(v3(-gw / 2 + (s + .5) * pa, base + (n - 1 - r) * pa + pa / 2, 0), new THREE.Quaternion(), v3(pa * .9, pa * .9, .04));
    tiles.setMatrixAt(i, m4);
    if (!allowed[r][s]) col.set(CSS.bad).multiplyScalar(r === t ? .55 : .32);                 // masked = dim red, shows "−∞"
    else col.set("#2fd3cc").multiplyScalar((0.04 + 1.05 * Math.pow(M_[r][s], .8)) * (r === t ? 1.25 : .8));
    tiles.setColorAt(i, col);
  }
  tiles.count = i; tiles.instanceMatrix.needsUpdate = true; tiles.instanceColor.needsUpdate = true;
  txt.mesh.position.set(-0.4, base + gw / 2 + 0.3, 0.05);
  // txt.draw: numbers centred per cell (mono, black stroke), row labels right-aligned in the query colour, column
  // labels above in the key colour (shrink to fit the column), a rounded rect around row t, and an axis caption.
}
```
Keep the tile brightness under the bloom threshold (≤ ~1.3), or the numbers drown. A 3-step toggle (raw score →
masked → softmax) on the same board teaches the pipeline better than three boards would.

## 3. Lens: a linear map applied to every row
**Use for** `y = W x` when the same W hits many inputs (weight sharing). One lens per matrix; rays fan from each
input row into the lens centre and out to each output row.

```js
const lg = new THREE.Group(); lg.position.set(X, 0.95, 0.42); scene.add(lg);
const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.07, 48).rotateX(Math.PI / 2), M.tint(CSS.query, 0.22, 0.1));
disc.renderOrder = 4; lg.add(disc);
lg.add(new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.025, 10, 64), M.glow(CSS.query, 1.7)));
const gear = mesh(K.gearGeo(0.62, 0.55, 36, 0.05, 0.1), M.brass, 0, 0, -0.02, lg);        // rotate slowly in update
mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 12), M.brass, 0, -0.84, -0.02, lg); mesh(RB(0.62, 0.12, 0.62, 0.04), M.dark, 0, -1.1, -0.02, lg);
const rays = new Rays(CSS.query, { intensity: 0.75, density: 2.2, opacity: 0.6 }); scene.add(rays);
// setData: rays.setSegments(rows.flatMap((_, i) => [[v3(inRight, inRowY(i), .3), lg.position, 0, .6], [lg.position, v3(outLeft, outRowY(i), .3), .6, 1]]));
// intro pulse: disc.material.emissiveIntensity = 0.1 + 0.9 * seg(tau,.3,.6) * (1 - seg(tau,1.1,1.6));
```
Big output projections (vocab heads) read better as a **knurled barrel**: `K.knurlGeo(0.98, 0.95, 140, 0.05)`
rotated onto the x axis, a brass gear ring at the back, and tinted half-spheres front and back (scale x 0.24) that
slide apart when exploded.

## 4. Beams ∝ weight into a Σ (weighted sum)
**Use for** "the output is a weighted mix": attention heads, softmax pooling, ensembles, kernel regression.
Radius ∝ √weight reads as area ∝ weight; small flyers travel the beams to show the arrival.

```js
const beams = sources.map(() => { const b = new Beam(CSS.query, { density: 3, speed: 1.1, intensity: 2.2, opacity: 0.9 }); scene.add(b); return b; });
function layoutBeams(w, ex) {
  sources.forEach((src, i) => {
    const a = src.clone(), b = sigmaPos.clone(), mid = a.clone().lerp(b, .5); mid.y += 0.55 + 0.15 * i; mid.z += 0.35;
    beams[i].curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    beams[i].setCurve(beams[i].curve, 0.006 + 0.07 * Math.sqrt(w[i]));
    beams[i].visible = w[i] > 1e-4;
  });
}
// Σ funnel: open brass cone + rim torus + "Σ" textPlane in the accent colour; output display just after it.
// flyers: small spheres (or 1-row MatrixDisplays of w_i·v_i) at curve.getPoint(ease.inOut(seg(tau, 2 + .12 i, 3 + .12 i)))
```
Rebuild the curves whenever endpoints move (exploded view), not every frame: store `_ex` and compare.

## 5. Histogram that re-sorts (distribution / ranking)
**Use for** softmax outputs, vocab predictions, class scores. Bars sorted by value, the winner in accent with a
pill label, logits greyed at the right edge. When values change, bars glide to their new rank.

```js
const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }), N); scene.add(bars);
const ys = new Array(N).fill(null), rowY = (rank) => by0 + (N - 1 - rank) * rp + rp / 2;
// update:
order.forEach((i, rank) => {
  const y = ys[i] = damp(ys[i] ?? rowY(rank), rowY(rank), 8, dt);
  const len = Math.max(0.015, p[i] * BARW * grow);
  m4.compose(v3(BAR0 + len / 2, y, -0.03), q0, v3(len, 0.19, 0.12)); bars.setMatrixAt(i, m4);
  bars.setColorAt(i, col.set(rank === 0 ? CSS.accent : "#3c8f96").multiplyScalar(rank === 0 ? 1.45 : .5 + 1.2 * Math.sqrt(p[i])));
});
bars.instanceMatrix.needsUpdate = bars.instanceColor.needsUpdate = true;   // redraw the label canvas only when a bar moved
```
Index instances by item, not by rank, so hover stays correct (`hit.instanceId` = item).

## 6. Gauge dial (one scalar that matters)
**Use for** loss, perplexity, entropy / "effective choices", accuracy, speed.

```js
const dial = new Dial({ r: 1.0, min: 1, max: 13, major: 2, minor: 1, label: "PPL = exp(NLL)", sub: "effective # of equal choices",
  color: CSS.accent, marks: [{ v: 13, color: CSS.bad }] });
dial.position.set(X, 3.5, 0.25); scene.add(dial);
mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 12), M.brass, X, 2.0, 0.05, scene);   // post
// setData: dial.setValue(Math.min(max, v), v.toFixed(2));   update: dial.update(dt);   on enter: dial.shown = dial.o.min (needle sweeps up)
```
Pair two dials when one leads to the other (per-item −log p → the mean's PPL).

## 7. Cabinet of drawers (lookup table)
**Use for** embedding tables, hash tables, caches keyed by id, registers. One drawer per row with the id, the
key and the row's own cells glowing inside. Used drawers slide out, and the row flies onto the rail.

```js
for (let id = 0; id < V; id++) {
  const d = new THREE.Group(); d.position.set(0, base + (V - 1 - id) * pitch + pitch / 2, 0.85); cab.add(d);
  mesh(RB(W - 0.22, pitch - 0.06, 0.08, 0.03), M.dark, 0, 0, 0, d);                         // face
  mesh(new THREE.SphereGeometry(0.045, 12, 8), M.brass, 0.95, 0, 0.07, d);                   // knob
  mesh(new THREE.BoxGeometry(W - 0.3, 0.05, 1.45), M.darker, 0, -0.12, -0.75, d);            // tray
  const lbl = textPlane(1.9, pitch - 0.08, 300); lbl.mesh.position.set(-0.08, 0, 0.045); d.add(lbl.mesh);   // "6  is"
  const cells = new THREE.InstancedMesh(RB(1, 1, 1, .12, 2), new THREE.MeshBasicMaterial({ toneMapped: false }), D);   // the row, inside the tray
  d.add(cells); drawers.push(d);
}
// update: d.userData.pull = damp(pull, target, 10, dt); d.position.z = 0.85 + pull * 1.15;
// flyer: a 1-row MatrixDisplay along QuadraticBezier(drawer front -> destination row, mid lifted 0.9)
```

## 8. Router dial + experts (gating, selection, sparsity)
**Use for** MoE routing, branch prediction, attention heads chosen, any top-k pick. The dial face shows the gate
bars with values; chosen modules light up (rim colour by rank), and unchosen ones go dark with a red "never run" pill.

```js
// dial face (canvas on a disc): 4 bars, height = gate, cyan if in top-k else grey, value above, "E1".."E4" below
experts.forEach((ex, e) => {
  const r = top.indexOf(e), on = r >= 0;
  ex.rimM.color.copy(on ? hdr(r === 0 ? CSS.accent : CSS.amber, 2.2) : new THREE.Color(0x15181c));
  ex.tag.setText(`E${e + 1}`, on ? `active · g ${topw[r].toFixed(2)}` : "never run");
  ex.tag.element.classList.toggle("warn", !on);
});
```
Show total vs active parameters in the stat chips; that's the point of the station.

## 9. Shelf that grows (cache, memory, stack, queue)
**Use for** KV caches, buffers, DP memo tables, call stacks. Rows = what is stored (per layer K and V), columns =
time steps. Each step adds a column; bracket labels show phases (PREFILL vs DECODE).

```js
// per shelf row r: InstancedMesh of small bars; for column i, cell c: height = 0.04 + 0.42 * |val| / scale
m4.compose(v3(X(i) - 0.455 + c * 0.13, ys[r] - 0.02 + h / 2, z), q0, v3(0.1, h, 0.06));
// reveal: im.count = 8 * columnsVisible  (cheap: no per-frame matrix rewrites)
// stale entries: a translucent red box over the column (MeshBasic, opacity .18, depthWrite false) + "stale" warn tag
```
A carriage on a gantry (brass block + open steel tube with an amber ring) that "drops" the new chip makes each
step physical.

## 10. Residual bypass arch and "+" glyphs
**Use for** skip connections, accumulators, "add, don't replace".

```js
const ring = new THREE.Group(); ring.position.set(0.4, 1.0, -0.9); block.add(ring);           // behind the block, not through it
mesh(new THREE.TorusGeometry(1.75, 0.07, 14, 96, Math.PI), M.brass, 0, 0, 0, ring);           // half torus = arch
const flow = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.032, 10, 96, Math.PI), K.flowMaterial(CSS.accent, { density: 10, speed: -0.5, intensity: 2.6 }));
flow.position.z = 0.08; ring.add(flow);
// plus a 3-row display:  z_in / + f(z_in) / = z_out   so the sum is literally visible
```
A "+" or "=" glyph is two `M.glow` boxes (0.34 × 0.075). Pulse their HDR multiplier when data passes.

## 11. Exploded stacks and the stream through them
**Use for** depth (layers, pipeline stages, protocol layers). Deck 2 sits on telescoping posts (brass outer
sleeve, steel inner rod, collar) behind the stations, and `explodeAmt` lifts it. One glowing tube runs through
every deck in order:

```js
const curve = new THREE.CatmullRomCurve3([...points through deck 1, up the side, through deck 2, on to the output], false, "catmullrom", 0.35);
const stream = new Beam(CSS.accent, { density: 22, speed: 0.35, intensity: 2.6, segs: 400, radial: 10 });
const halo = new Beam(CSS.accent, { density: 22, speed: 0.35, intensity: 0.55, opacity: 0.35, segs: 400, radial: 10 });
stream.setCurve(curve, 0.05); halo.setCurve(curve, 0.13);     // rebuild only when the deck height changed
```
Put posts at the back edge only (z ≈ −2.35). Posts at the front cut straight through the displays in close-ups.

## 12. Gate and chips (discrete items entering the machine)
**Use for** tokenization, parsing, packetizing, sampling. A brass-framed glass gate with a glowing edge and a
scanning line. The raw input rides a ribbon into it, and chips with id badges pop out the other side, staggered.

```js
const chip = new Chip("favorite", { color: CSS.accent });   // .w = width, .setGlow(css, k)
chip.position.set(lerp(0, 2.3, k), lerp(1.86, rowY(i), k), 0); chip.scale.setScalar(lerp(.25, 1, k));   // k = ease.out(seg(tau, 1.2 + .13 i, 2 + .13 i))
```

## 13. Pill labels and hover
```js
const t = tag("Router W_r", "4 × 8 · softmax · top-2", { stages: [6], dot: CSS.accent, cy: 1, cond: (S) => S.model === "moe" });
t.position.set(x, y, z); parent.add(t);          // cy: 1 = anchor bottom (label sits above the point); cx: 0 = to the right
```
3–5 labels per station is enough. Every value-bearing mesh gets a hover entry, which takes the pressure off the
labels.
