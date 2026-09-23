#!/usr/bin/env bash
# Scaffold a film: copy the engine + template into <dest>, the model to <dest>/assets/model.glb,
# and print its node names so you can map them to build stages.
#   new-film.sh <dest> <model.glb>
set -euo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
dest=$1; model=$2
mkdir -p "$dest/assets"
cp "$here/template/engine.js" "$here/template/styles.css" "$dest/"
[[ -f $dest/film.js ]] || cp "$here/template/film.js" "$dest/film.js"
[[ -f $dest/index.html ]] || cp "$here/template/index.html" "$dest/index.html"
cp "$model" "$dest/assets/model.glb"
node "$here/scripts/glb-parts.mjs" "$dest/assets/model.glb"
cat <<MSG

Scaffolded $dest (stages: 'auto' until you map them)
  1. Map node names above to stages in window.XRAY ($dest/index.html); references/config.md
  2. Check the stage split: PAGE='index.html?parts' node $here/scripts/shot.mjs $dest /tmp/p.png 38
  3. Contact sheet:         node $here/scripts/shot.mjs $dest /tmp/sheet.png 1 8 20 30 38 49 58 71 78 95
  4. Serve it:              node $here/scripts/serve.mjs $dest 5173
MSG
