# `window.COVER` reference

Everything is optional except `model` and `masthead.title`. Units are metres, y is up. **Points are in model space**, which is what `engine/probe.html` reports (the GLB's scene at identity), so they stay valid when you change `hero.scale/position/rotation`.

```js
window.COVER = {
  model: 'assets/model.glb',

  hero: {
    name: 'Spidey',                 // hint line: "click Spidey"
    scale: 1,                       // uniform scale into the set (RobotExpressive is 4.4 units tall → 0.42)
    position: [0, 0, 0],            // metres
    rotation: [0, 0, 0],            // degrees, XYZ
    emitter: [x, y, z],             // where powers fire from (a raised hand). Default: top centre of the bbox
    emitterBone: 'Palm2R',          // …or follow a bone (rigged models; wins over emitter)
    head: [x, y, z],                // sense squiggles centre. Default: 10% below the top
    headBone: 'Head',
    pose: {clip: 'Punch', time: 0.35, play: false},  // clip name or index; play: true loops it on twos (12 fps)
    words: ['POW!'],                // SFX when the hero is clicked and sense is null
    shade: {                        // display-space RGB 0..1 multipliers
      warmShadow: [0.5, 0.27, 0.5], coolShadow: [0.3, 0.32, 0.52],
      coolSpec: [0.3, 0.46, 0.78], coolRim: [0.22, 0.36, 0.7], warmRim: [0.34, 0.2, 0.5],
    },
    decals: [                       // painted over the hero's own surface in the shader
      {kind: 'walk-signal',         // DON'T WALK hand ⇄ WALK figure + 7-segment countdown; clicking it toggles
       center: [x, y, z], normal: [x, y, z], up: [0, 1, 0],
       size: [w, h], depth: 0.035,  // depth = how far off the plane still counts (curved surfaces need more)
       keepSat: 0.5},               // skip vivid texels (fingers resting on it) above this saturation
      {kind: 'glow', center, normal, size, depth: 0.3, color: '#6ff6ff'},   // eyes, reactor, emblem; pulses
    ],
    hide: [{box: [[minX, minY, minZ], [maxX, maxY, maxZ]], match: 'unsaturated'}],   // discard a stray lump of a sculpt
    recolor: [{box, match: 'unsaturated', color: '#62101a'}],  // …or repaint it (hide + recolor share 4 slots).
                                    // 'unsaturated' spares saturated texels (the red club a khaki lump is draped over)
    hotspots: [                     // clickable regions of the hero mesh (max 4), outlined with their own ink line
      {box: [[minX, minY, minZ], [maxX, maxY, maxZ]],
       match: 'unsaturated',        // 'unsaturated' = only the prop's texels (skip vivid costume, cool darks, white); 'all'
       action: 'walk',              // 'walk' (toggle the walk-signal decal) | 'sense' | 'power' | 'sfx'
       words: ['CLANG!'], sound: 'click', label: 'walk signal'},  // label adds "click the walk signal" to the hint
    ],
  },

  camera: {
    az: -0.48,                      // radians around y; 0 = camera on +z (in front of a Meshy export)
    el: -0.44,                      // negative = below, looking up
    roll: -0.24,                    // dutch angle
    fov: 37,
    dist: 3.35, target: [x, y, z],  // omit both to auto-fit the hero with masthead headroom
    drag: true,                     // drag-to-orbit (springs back)
  },                                // URL overrides for exploring: ?az= &el= &roll= &dist= &fov= &seed= &stage= &still

  set: {
    kind: 'city',                   // 'city' | 'sky' | 'burst' | 'church'
    sky: 'storm',                   // 'storm' | 'dusk' | 'night' | 'day' | 'teal' (starry), or a palette object
                                    // {c: [4 colours dark→light], horizon, zenith, clouds: 0..1 (1 = full cloud bands), stars: 0..1}
    storm: true,                    // ambient lightning (storm sky only)
    ground: -6.5,                   // street level; how high the hero is perched
    street: 19, heights: [11, 22],  // ring radius and building height range
    seed: 7,                        // city layout
    corner: {                       // street furniture beside the hero (optional)
      pole: [x, z], top: 5.2, color: 0x4a4250,
      brackets: [[x, y, z, sx, sy, sz]],                   // boxes tying a prop on the model to the pole
      signs: [{text: 'COLUMBUS AV', y: 3.3, yaw: -0.45},   // yaw = direction the sign sticks out from the pole
              {text: 'ONE WAY', oneWay: true, y: 0.42, yaw: -0.5}],
      lamp: {yaw: 3.44, reach: 3.4},                        // cobra-head arm, or false
    },
    burst: {colors: ['#35c8ff', '#1b4fd0'], rays: 26},      // kind 'burst' (rays is an integer)
    church: {                       // kind 'church': a gothic nave side-on, window wall facing +z at `at`
      at: [x, y, z], yaw: 0,        // degrees
      bays: 4, bay: 6.5, right: 1.2, // bays of lancet windows between stepped buttresses (pinnacles + gilt crosses)
      windowWidth: 2.7, windowSpring: 5.4, windowSill: 1.4, eave: 10, span: 14, rise: 9,
      glow: '#ff9a3c', glowBay: 0, glowRange: 9,             // the lit window washes nearby stone faces
      stone: '#bba684', roof: '#7a3a2c', gilt: '#e2b54a', haze: '#6f8f88', crosses: true,
      arcade: true,                 // an open arch + free pier to the right of the nave (false to drop it)
      tower: {pos: [x, z], base, top, width: 5.2, spire: 13},  // bell tower; pos omitted = behind the nave. false = none
      bell: {words: ['BONNNG!'], sound: 'bell', label: 'bell tower', pulse: 1.8},  // click the tower; pulse = seconds of sense
    },
    // any kind can add masonry near the hero (these use the stone material, so they ink and take the window glow):
    blocks: [{size: [w, h, d], pos: [x, y, z], rot: [degX, degY, degZ], kind: 'ashlar', color}],
                                    // kind: 'ashlar' | 'tile' | 'slate' | 'brick' | 'plain' | 'gilt'. Something to stand on.
    spires: [{pos: [x, z], top, width: 0.8, base: -20, cross: true, color}],   // free-standing pinnacled piers
    arches: [{a: [x, z], b: [x, z], top, sill, thick: 0.6, margin: 0.35, color}],  // a screen wall with a pointed opening
    puffs: [{at: [u, v], depth: 3, size: [w, h], tone}],   // posterized smoke, anchored to the page: cover fractions,
                                    // metres along that ray from the opening camera, size as a fraction of cover width
                                    // (or {pos: [x, y, z], size: [w, h] metres} in the world)
  },

  power: {
    kind: 'web',                    // 'web' (strand + splat) | 'beam' (energy blast + starburst)
                                    // | 'club' (a club thrown on a cable: spins, ricochets, reels back; words land on impact) | 'none'
    words: ['THWIP!'],
    sound: 'thwip',                 // 'thwip' | 'zap' | 'pow' | 'click' | 'swish' | 'clack' | 'bell' | 'radar' | 'none'
    color: '#f6f4ff',               // strand / beam halo / club
    cable: '#c8202c',               // club only
  },
  skyClick: null,                   // 'lightning' | 'power' | 'sfx'; default = lightning on storm skies, else power

  sense: {                          // or null: then clicking the hero pops hero.words
    label: 'Spider-sense', key: 'S',
    duotone: ['#0d0008', '#f2142e'],  // backdrop ink + paper while it's on; the hero keeps full colour
    style: 'duotone',               // 'radar': the world goes black, drawn in glowing outlines and dots, with sonar
                                    // rings spreading from hero.head that light up what they pass (Daredevil)
    squiggles: true, sound: 'tingle',
  },
  spatter: [[u, v, radius, density]],   // up to 4 clusters of flicked ink droplets (cover fractions; radius ~.1,
                                        // density 0..1). Never on the hero.

  masthead: {
    title: 'SPIDER-MAN',            // one line, arched; long titles flatten automatically
    kicker: 'YOUR FRIENDLY NEIGHBORHOOD', credits: 'INKS BY SOBEL · …',
    font: 'Bangers',                // any Google Font family name; loaded on demand
    pattern: 'web',                 // 'web' | 'halftone' | 'stripes' | 'none' (inside the letters)
    face: ['#ff4a3d', '#e0202a', '#9e0f1d'], extrude: '#1c2a6b', kickerColor: '#ffd23f',
    left: 0.235, right: 0.975, baseline: 0.192, arch: 0.3,  // layout, fractions of the cover
  },

  dress: {
    issue: '1', month: 'SEPT', price: '$3.99',
    emblem: '<svg viewBox="-50 -50 100 100">…</svg>',  // corner-box art; default is a lightning bolt
    caption: ['ONE WAY IN.', 'NO WAY OUT!'],          // yellow box, bottom right; [] hides it
    barcode: '7 25274 00001 9  01',
  },
  hint: null,                       // override the generated hint line (HTML)
};
```

## Debug handle

`window.cover` in the page (and in `shot.mjs` frame JS):

| call | does |
|---|---|
| `cover.clickAt(u, v)` | a click at cover fraction (0..1, top-left origin); returns the picked id |
| `cover.pickId(u, v)` | id under that point without acting |
| `cover.strike(u, v)`, `cover.usePower(u, v)` | lightning / power at a point |
| `cover.setStage(0\|1\|2)`, `cover.setSense(bool)`, `cover.toggleWalk()` | states |
| `cover.fx.hold = true` | freeze bolts and beams mid-flash for screenshots |
| `cover.project([x, y, z])` | model-space point → % of the cover (check a landmark lands where you think) |
| `cover.RIG` | live camera rig: `az el roll dist target` |
| `cover.camera` | the three camera: unproject a cover point to place set pieces (`new THREE.Vector3(u*2-1, 1-v*2, .5).unproject(cover.camera)`) |
| `cover.hero` | `{emitter, head, center, box}` in world space |
