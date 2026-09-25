# createDiorama(config) — full contract

```js
import { createDiorama } from './engine.js';   // needs an importmap for "three"
createDiorama({ title, accent, marker, uiAccent, seed, look, room, camera, build, staff, visitors, items, steps, hud, city, ui, host });
```

## Coordinates

`x` runs right-back, `z` left-front, `y` up. The camera sits at +x,+z looking in (azimuth .785, elevation .62). So:

- **far walls** (full height, where wall-mounted things go): `z = room.z0` (appears top-right, faces +z) and `x = room.x0` (appears top-left, faces +x). Only the +x, +z and top faces of anything are visible.
- **near walls** are `room.frontH` tall. The door is always on the `x = room.x1` wall, between `room.door.z0` and `room.door.z1`, with a porch `room.porch` deep outside it.
- A person is about 0.65 tall, a table top about 0.35, a counter 0.48 and the walls 1.15. Keep props at that scale.

## Top level

| key | default | meaning |
|---|---|---|
| `title` | — | small heading above the step list |
| `accent` | `0xe09a42` | the one saturated colour (food, soap, neon). `kit.accent(...)` uses it; it survives the dither in colour |
| `marker` | `0x2c63ff` | location-pin colour in the city step |
| `uiAccent` | `#2c63ff` | active step title colour |
| `seed` | 7 | rng seed for build + crowd |
| `look` | see `DEFAULT_LOOK` | `cellCss` (3), `levels` (5), `minBlock/maxBlock` (.09/.42), `black/white` (.24/.86), `pen` (.6), `light/dark` RGB arrays |
| `room` | `{x0:-3,x1:3,z0:-2.4,z1:2.6,wallH:1.15,frontH:.26,porch:.75,door:{z0,z1}}` | the shell the engine builds for you |
| `camera` | `{az:.785, el:.62, margin:1}` | room shot; auto-fitted to the room + porch, and pushed right of the step list on wide screens |
| `ui` | true | inject step list, scroll track, HUD, hint. `false` = bring your own (`host` element, call `api.setStep`) |
| `hud` | inside/in line/seated/served | `{statKey: label}`; stat keys are `inside, queued, seated, served` |

## build(k) — the kit

All geometry is boxes. Every mesh is stamped with the **current group** (`k.group('name')`), which is what steps highlight.

- `k.group(name)` — set the group for everything built next. Built-ins: `room` (default), `visitors`, `staff`, `shell`.
- `k.box(x, yBottom, z, w, h, d, tone, parent?, tint?)` — centre-x, bottom-y, centre-z. `tone` 0 black … 1 white. Returns the Mesh.
- `k.slab(x0, x1, y0, y1, z0, z1, tone, parent?, tint?)` — the same box, given by its extents. This is usually easier.
- `k.accent(x, y, z, w, h, d, tone=1, parent?)` — a box in the accent colour.
- `k.block(x0, x1, z0, z1)` — an obstacle for walking. Every floor-standing thing needs one, or people walk through it. Padding of 0.1 is added.
- `k.staffOnly(x0, x1, z0, z1)` — visitors path around this zone (behind counters, back rooms).
- `k.seat({ x, z, yaw, pool='default', anim?, plate:[x,y,z]? })` — where a visitor sits. `yaw` = facing (`Math.atan2(dx, dz)` toward what they face: 0 = +z, π = −z, π/2 = +x, −π/2 = −x). `plate` = where their carried item is set down.
- `k.digits('247', cx, cy, zWall, w, h, tone=.95, gap=.05, tint?)` — seven-segment numbers on a wall facing +z.
- `k.plant(x, z, scale=1)` — a potted plant, with its obstacle.
- `k.tick((t, dt, world) => {})` — per-frame hook. `world.people` holds every person (`p.visitor`, `p.state`, `p.visitPt`, `p.pos`); use it to make machines react to people.
- `k.scene`, `k.THREE`, `k.rnd()`, `k.rr(a,b)`, `k.pick(arr)`, `k.room`, `k.porch`, `k.ACCENT`, `k.MARKER`.

For moving props (drums, fans, a cat), make a `THREE.Group`, build into it with the `parent` arg, `k.scene.add(group)`, and animate it in `k.tick`.

## staff: [...]

```js
{ name?, role: 'post' | 'patrol' | 'courier', at: [x, z], yaw, anim, group='staff', apron, holds: 'clipboard'|'phone'|'mop', tone=.3, head=.22, speed,
  stops: [{ at:[x,z], yaw, t:[min,max], anim }] }   // patrol only
```

- `post` stands at `at` and plays `anim` forever.
- `patrol` walks between `stops`, pausing `t` seconds at each one and playing that stop's `anim`.
- `courier` waits at `at` until a counter station with `fetch.courier === name` places an order. Then it carries the item to `fetch.stand(...)`, drops it at `fetch.drop(...)`, and walks back.

**Animations:** `idle cook stir type serve write order talk read reach load fold mop eat`.
- `serve` types only while a visitor is within 1.0 of the person.
- Seated people use the seat's `anim`, falling back to the station's `anim`, then `eat`.

## visitors

```js
{ max=16, rate=[3,6], rushRate=[1.4,2.6], tone=[.3,.6], carry?: 'itemName', startSeated=3, route: [station, ...] }
```

Visitors spawn on the porch, come through the door, run the `route` in order, then leave. Arrivals cluster into rushes. `startSeated` people are already in the first seat station's pool at load, each with that station's `startItem`.

**Stations:** any station can take `chance` (0–1). If the roll fails, the visitor skips it.

- `{ type:'queue', slot: i => [x,z], max=6, face }` feeds the **counter that follows it**. Visitors move up as the queue shortens. If the queue is full, new arrivals leave.
- `{ type:'counter', spots:[{x,z,yaw}], dwell:[a,b], give?:'item', fetch?:{...} }` — a visitor stands at a free spot for `dwell` seconds. A counter with no queue before it makes visitors wait on the spot until a place frees up.
  - `give` hands them an item on the spot.
  - `fetch: { courier, item, prep:[a,b], takeout?:{item, chance}, stand:(i, spot)=>[x,z], drop:(i, spot)=>[x,y,z], standYaw }` makes a courier bring the item. A takeout item makes the visitor skip the next seat station. Takeout is also forced when that pool is full.
- `{ type:'seat', pool, dwell:[a,b], anim, consume=true, ifFull:'exit'|'skip', startItem? }` — sit, and set the carried item on `plate`. With `consume:false`, they pick it back up when they leave.
- `{ type:'visit', points:[[x,z,yaw],...], dwell:[a,b], anim, ifFull:'skip'|'exit' }` — stand at a free point for a while. Points are claimed, so two people never share one. Use it for machines, shelves, browsing and folding.

## items: { name: { hand?: bool, build: (k, group) => {} } }

The built-in items are `tray bag cup box paper laptop`. `hand:true` items are carried at the side; the rest are held in front with both arms. Build with `k.box(..., group)` / `k.accent(..., group)` at a local origin, bottom at y = 0.

## steps: [...]

```js
{ title, body, show: null | ['group', ...], city?: true }
```

- `show: null` inks everything.
- A list keeps only those groups inked. Every other group is washed out: it fades to paper with outlines at half strength, and loses its colour.
- `city: true` moves the camera. It drops to elevation .3 and zooms out to `city.camera.zoom` (.4). The store's front walls rise, the roof drops on, and the city grows out of the ground around it.
- Scrolling picks a step by fixed thresholds, like the reference site. Clicking a title scrolls to that step.

## city

```js
{ stores=4, seed=11, maxHeight=6.2, camera:{ az, el, zoom } }   // or false
```

- Streets are laid out on a grid scaled to the room, with the store's block in the middle.
- Towers get taller toward the back and stay low on the camera side, so they never hide the store.
- `stores` extra low buildings get blue marker pillars; the store's own roof gets one too.
- Cars run both ways on every street and pedestrians walk the sidewalks.

## Returned api / URL flags

`api = { scene, camera, kit, people, seats, route, stats(), T, setStep(n) }`, also exposed as `window.__diorama`.

- `?step=N` pins a step (fractions work) and ignores scrolling.
- `?speed=N` speeds up the sim.
- `prefers-reduced-motion` halves the sim speed and makes the step changes snap instead of fading.
