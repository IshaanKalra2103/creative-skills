# Characters

Characters are 3D-assisted drawings: simple meshes rendered as flat cels with ink. The 3D exists only to keep them on-model from every angle. The result must never read as 3D.

## Design

- Make it original. Borrow the sensibility (round, soft, slightly odd, sincere), never a known character's design.
- It must read in silhouette at thumbnail size: one big shape and two or three small ones (head, arms, a tail, a wick).
- Faces are minimal: small dark eyes with a catchlight carry most of the emotion. Posture and the eyes do the acting; mouths are optional.
- Give it two or three local colours at most, plus one designed shadow colour for each. Add one accent, such as a glow, a scarf or a stripe.
- Put weathering or texture in the object's own space (moss, rust, chips in `gl.js` mat 0), so it sticks to the surface while it moves.

## Construction

- Build with `loft` (cross-sections along y; superellipse rings), `lathe` (a profile turned around y) and `rbox` (rounded box). Merge parts per joint with `mergeMesh(xformMesh(part, M))`.
- Give every part an `id` so the ink pass draws the boundary between parts that touch.
- Use `smooth: 60–80` on organic shapes so cel shadow edges are clean curves, not facets.
- Build a joint hierarchy as plain matrices (`MUL(T(...), RY(a), RX(b))`). `evalPose` and `solveIK` in the forest example show a full rig with two-bone IK legs and arms.
- Soft bodies (cloth, a ghost, jelly) keep their JS mesh and re-deform vertices per drawing. Write `pos` from a rest copy with a deform function of `(vertex, held time)`, recompute normals or reuse rest normals rotated, and call `glUpdateMesh` only when `drawSeed` changes.

## Materials (glRender `mat.type`)

| Type | For | Notes |
|---|---|---|
| 0 | painted metal | `col`, `col2` stripe colour, `stripe` y, `rust`, `chip`, `moss` |
| 1 | dark joints | |
| 2 | eyes | dark glass with a catchlight; `emit` lights them |
| 3 | stone, bark | `col` and `col2` mixed by noise |
| 4 | plain cel | rim light |
| 5 | lamps | `emit` 0..1 toward `emitCol` |
| 6 | soft cel with a designed shadow | `col` is the lit colour, `col2` the shadow colour |
| 7 | shadow catcher | used by `ground:` in `celLayer` |

Any type takes `emit`/`emitCol` (an inner glow that also lifts the shadow) and `coat: worldY` with `coatCol`/`coatA`. A coat paints everything below a world height (soil from the ground up; shadow running off a body as the height drops).

## On-model check

Before any shot, render a turnaround: 8 yaws × 2 pitches on a neutral grey plate. Then render the key poses of every shot at the shot's own lens, and look for facets, line clutter, broken silhouettes and changes in proportion. Fix the design once here, not per shot.
