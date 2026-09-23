#!/usr/bin/env bash
# Scaffold a page from any image: copies the engine + template into <dest> and writes <dest>/image.js.
#   new.sh <dest> <image> [veil|filings] [prep-image.py flags, e.g. --cutout none]
set -euo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
dest=$1; src=$2; mode=${3:-veil}
[[ $mode == veil || $mode == filings ]] || { echo "mode must be veil or filings" >&2; exit 1; }
shift $(( $# >= 3 ? 3 : 2 ))
mkdir -p "$dest"
cp "$here/template/engine.js" "$dest/"
if [[ ! -f $dest/index.html ]]; then
  sed "s/mode: 'veil',  /mode: '$mode',/" "$here/template/index.html" > "$dest/index.html"
fi
uv run --quiet "$here/scripts/prep-image.py" "$src" "$dest/image.js" "$@"
cat <<MSG

Scaffolded $dest ($mode). It runs straight from file://.
  1. Captions, credit line and window.DITHER: $dest/index.html  (fields: references/config.md)
  2. Contact sheet:  node $here/scripts/shot.mjs $dest /tmp/sheet.png
  3. Open it:        open $dest/index.html
MSG
