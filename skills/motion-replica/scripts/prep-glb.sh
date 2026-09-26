#!/usr/bin/env bash
# Shrink a GLB and embed it as a base64 <script> so the page still works from file://
# (fetch() of a local .glb is blocked there).
#
#   bash prep-glb.sh model.glb assets/car-glb.js CAR_GLB "Car Concept by Eric Chadwick / DGG, CC-BY 4.0"
#
# --palette/--join/--simplify are off on purpose: the defaults merge untextured materials
# and drop their names, and the page repaints parts BY MATERIAL NAME (Paint*, Glass, Rim*).
# The material list is printed at the end — use those names in the repaint.
set -euo pipefail
in="$1"; out="$2"; var="${3:-MODEL_GLB}"; credit="${4:-add source + licence here}"; tex="${TEX_SIZE:-1024}"
tmpd="$(mktemp -d)"; tmp="$tmpd/model.glb"; trap 'rm -rf "$tmpd"' EXIT
npx -y @gltf-transform/cli@4 optimize "$in" "$tmp" \
  --texture-compress webp --texture-size "$tex" --compress meshopt \
  --palette false --join false --simplify false
python3 - "$tmp" "$out" "$var" "$credit" <<'EOF'
import base64, pathlib, sys
src, out, var, credit = sys.argv[1:]
b = pathlib.Path(src).read_bytes()
pathlib.Path(out).parent.mkdir(parents=True, exist_ok=True)
pathlib.Path(out).write_text(f"// {credit}\n// meshopt + webp, base64-embedded so the page works from file://\nwindow.{var}=\"{base64.b64encode(b).decode()}\";\n")
print(f"{out}: {len(b)/1e6:.2f} MB glb → window.{var}")
EOF
echo "materials:"
npx -y @gltf-transform/cli@4 inspect "$tmp" --format md 2>/dev/null | sed -n '/MATERIALS/,/TEXTURES/p' | grep -E '^\| [0-9]' | cut -d'|' -f3 | sed 's/^ */  /'
