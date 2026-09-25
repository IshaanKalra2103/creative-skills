#!/usr/bin/env bash
# Scaffold a cover: copy the engine + template into <dest>, convert the model to <dest>/assets/model.glb,
# then print the probe command so you can find the landmarks (emitter hand, head, props).
#   new-cover.sh <dest> <model.(obj|fbx|gltf|glb)> [maxTris]
set -euo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
dest=$1; model=$2
mkdir -p "$dest/assets"
cp -R "$here/engine" "$dest/"
[[ -f $dest/index.html ]] || cp "$here/template/index.html" "$dest/index.html"
"$here/scripts/build-model.sh" "$model" "$dest/assets/model.glb" "${3:-200000}"
cat <<MSG

Scaffolded $dest
  1. Look at the model:  PAGE='engine/probe.html' node $here/scripts/shot.mjs $dest /tmp/probe.png
  2. Fill window.COVER in $dest/index.html (landmarks from the probe output)
  3. Check the cover:    node $here/scripts/shot.mjs $dest /tmp/cover.png
  4. Serve it:           node $here/scripts/serve.mjs $dest 5173
MSG
