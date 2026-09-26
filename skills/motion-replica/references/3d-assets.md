# 3D assets

`templates/replica/assets/assets3d.js` is a classic script exposing
`Assets3D(THREE, addons)`. Call it from the page's inline module after importing three:

```js
const A3 = Assets3D(THREE, { RoomEnvironment, GLTFLoader, MeshoptDecoder, FontLoader, TextGeometry, RoundedBoxGeometry });
```

## Contents
1. Look: lighting and tone
2. The kit
3. Material recipes
4. Sourcing models (licences, prep, repaint)
5. 3D type from any font
6. Lookdev loop

## 1. Look

Ad renders are soft studio renders: big even key light, gentle reflections, no hard shadows,
no visible floor. `Stage` gives every scene a PMREM'd `RoomEnvironment` (reflections), a key
light from the upper left, a faint cool rim from behind right, and `NeutralToneMapping`, which
keeps saturated brand colours from going pastel the way ACES does. Stage options:
`fov` (26° is close to a product-shot lens; lower flattens perspective), `exposure`, `env`
(environment intensity).

## 2. The kit

| builder | returns | notes |
|---|---|---|
| `makePack()` | `{group, top, money}` | Crimped foil pouch 330×480. Pillow surfaces front and back pinch into zig-zag crimps (the alpha-cut texture). `top` is the tear-off strip, pivoted at the tear line. `money` holds the bill stacks peeking out. Branding is a canvas draw in `skin()`, so swap the word, font and colour there. |
| `makeBill(w, curl)` | group | Curled note, front/back canvas textures. |
| `makeStack(w, t)` | group | Banded stack: box with edge-striped sides and a paper band. |
| `makeBall(r)` | group | Pebbled-leather basketball: 8-panel seams (projected great circles) in colour and bump maps. |
| `makeWatch()` | group | Diver's watch: steel case, printed bezel, dial, hands, glass, crown, rounded link bracelet that curves back. |
| `orangeCoin(glyph, d)` | group | Lathed coin with raised rim, embossed glyph (bump from the glyph mask). Glyphs: `bnb poly op eth sol sq bow none`; add more to `GLYPH` as canvas-path functions on a 100-unit box. |
| `tokenCoin(kind, d)` | group | `cat` (chrome rim, emoji face), `leaf` (clear-coat green), `pglass` (silver with a transmissive glass "P"), `stonk` (cel-shaded + ink outline). Copy one as a pattern for new tokens. |
| `loadCar(b64?)` → `makeCar(len)` | group | Parses an embedded GLB once; `makeCar` clones it scaled to `len` px long, three-quarter view. |
| `makeMegapotText(str, size)` | `{group, chars}` | Extruded, bevelled glyphs from `window.RUBIK_TYPEFACE`. `chars` are per-glyph pivots for flip-ins. |

Coins store their diameter in `userData.d` (used when shrinking into a DOM icon of known size).

## 3. Material recipes

- **Car paint**: `MeshPhysicalMaterial({ color, metalness: .25, roughness: .3, clearcoat: 1, clearcoatRoughness: .04 })`.
- **Foil or plastic pouch**: physical material, roughness about .44, clearcoat .4. The pouch
  still reads flat viewed head-on unless the **texture** carries shading: darken toward the
  pinched sides and just inside the crimp lines, and lighten the middle. Geometry alone
  isn't enough at 3/4 scale.
- **Black car glass**: near-black physical, roughness .05, clearcoat 1, `envMapIntensity ~.5`.
- **Brushed and polished steel**: `metalness: 1`, roughness .18 (polished) / .34 (brushed); alternate them on links.
- **Glass glyph**: `transmission .55, thickness 22, ior 1.5, attenuationColor` tinted, clearcoat 1. Needs the GPU (see gotchas).
- **Cel-shaded / comic**: `MeshToonMaterial` with a 3-step `NearestFilter` ramp, plus an
  inverted hull (a `BackSide` black copy scaled up a few px) for the ink outline.
- **Coins that read as coins**: a lathe profile with a raised rim (`coinGeo`). Keep metalness
  low for coloured coins (0.1) or they turn into mirrors of the environment.

## 4. Sourcing models

Build procedurally when you can. Source a model when the object is complex hard-surface and
instantly recognisable (cars, sneakers, headphones, phones).

- **Where**: Khronos glTF-Sample-Assets (`github.com/KhronosGroup/glTF-Sample-Assets`, each model
  has `metadata.json` with its licence). The example uses `CarConcept` (CC-BY 4.0, Eric Chadwick /
  Darmstadt Graphics Group). `ChronographWatch` (CC-BY 4.0) and `ToyCar` are also there. Poly Haven
  models are CC0. Avoid a model whose licence you can't read: the three.js example Ferrari
  links to a disabled Sketchfab page.
- **Check the silhouette first**: render it in lookdev from the reference's angle. The three.js
  Ferrari is the open-top Spider. A lofted roof bolted on still looked like a lid, and the user
  called it weird. Swap models rather than patch shape.
- **Prep**: `bash scripts/prep-glb.sh in.glb assets/car-glb.js CAR_GLB "credit"`. It prints the
  material names; repaint by those names in `loadCar` (`/^Paint/` → paint, `Glass`, `/^Rim/`).
- **Strip trademarks**: hide or replace logo-bearing materials (the CarConcept tyre sidewalls
  carry a brand logo and there's a licence plate).
- **Credit**: CC-BY needs attribution in the published video's description. Tell the user.

## 5. 3D type

```sh
curl -sLO "https://github.com/google/fonts/raw/main/ofl/rubik/Rubik%5Bwght%5D.ttf"
uv run scripts/font2typeface.py "Rubik[wght].ttf" assets/rubik-typeface.js --wght 900 --chars '$0123456789,.'
```

`TextGeometry` with `bevelThickness ~18, bevelSize ~10, bevelSegments 10` at size 350 gives the
puffy look. Pass a material **array** `[face, sides]` and make the sides a darker shade of the face
colour, because that contrast is what reads as depth. Kerning is manual: each glyph is its own pivot
spaced by its advance plus a small gap.

## 6. Lookdev loop

Put every asset on `lookdev.html` and render it with `render.py lookdev.html --stills 0`.
Check it against a reference crop, change one material or shape, and repeat. `?spin=40`
rotates everything to check the back or side. Only wire an asset into the timeline once it
survives a side-by-side with the reference at the same apparent size.
