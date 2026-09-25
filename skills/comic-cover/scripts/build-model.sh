#!/usr/bin/env bash
# Convert any OBJ / FBX / glTF / GLB into one small web GLB for a cover:
# weld → decimate to a triangle budget (only if over it) → textures ≤2048 WebP → meshopt compression.
#   build-model.sh <input> <out.glb> [maxTris=200000]
# OBJ needs its .mtl + textures beside it. FBX uses FBX2glTF (x86_64 on macOS: runs under Rosetta).
# Tools come from npx / a small cache in ~/.cache/comic-cover-tools; nothing is installed globally.
set -euo pipefail
in=$1; out=$2; max=${3:-200000}
[[ -f $in ]] || { echo "no such file: $in" >&2; exit 1; }
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
GT=(npx -y @gltf-transform/cli@4)
ext=$(echo "${in##*.}" | tr '[:upper:]' '[:lower:]')
case $ext in
  obj) npx -y obj2gltf@3 -i "$in" -o "$tmp/a.glb" ;;
  fbx)
    cache=~/.cache/comic-cover-tools
    [[ -x $cache/node_modules/fbx2gltf/bin/$(uname)/FBX2glTF ]] || (mkdir -p "$cache" && cd "$cache" && npm i --silent fbx2gltf@0.9.7-p1 >/dev/null)
    bin=$cache/node_modules/fbx2gltf/bin/$(uname)/FBX2glTF; chmod +x "$bin"
    "$bin" --binary --input "$in" --output "$tmp/a" >/dev/null ;;
  gltf|glb) "${GT[@]}" copy "$in" "$tmp/a.glb" >/dev/null ;;
  *) echo "unsupported: .$ext (use obj, fbx, gltf or glb)" >&2; exit 1 ;;
esac
tris() { node -e '
  const b = require("fs").readFileSync(process.argv[1]); const j = JSON.parse(b.slice(20, 20 + b.readUInt32LE(12)).toString());
  let t = 0; for (const m of j.meshes || []) for (const p of m.primitives) t += (p.indices !== undefined ? j.accessors[p.indices].count : j.accessors[p.attributes.POSITION].count) / 3;
  console.log(Math.round(t));' "$1"; }
before=$(tris "$tmp/a.glb")
"${GT[@]}" weld "$tmp/a.glb" "$tmp/b.glb" >/dev/null
if (( before > max )); then
  ratio=$(node -e "console.log(($max / $before).toFixed(4))")
  "${GT[@]}" simplify "$tmp/b.glb" "$tmp/c.glb" --ratio "$ratio" --error 0.0008 >/dev/null
else cp "$tmp/b.glb" "$tmp/c.glb"; fi
"${GT[@]}" resize "$tmp/c.glb" "$tmp/d.glb" --width 2048 --height 2048 >/dev/null
"${GT[@]}" webp "$tmp/d.glb" "$tmp/e.glb" --quality 88 >/dev/null
mkdir -p "$(dirname "$out")"
"${GT[@]}" meshopt "$tmp/e.glb" "$out" --level medium >/dev/null
echo "$in: $before tris → $(tris "$out") tris, $(du -h "$out" | cut -f1 | tr -d ' ') → $out"
