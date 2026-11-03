#!/bin/sh
# Scaffold a new film from the template.
# usage: sh new_film.sh <dir> "<English title>" "<Japanese title>"
set -e
HERE=$(cd "$(dirname "$0")/.." && pwd)
DIR=$1; TITLE=${2:-Untitled}; JP=${3:-}
[ -z "$DIR" ] && { echo "usage: sh new_film.sh <dir> \"<title>\" \"<japanese title>\""; exit 1; }
[ -e "$DIR" ] && { echo "$DIR exists"; exit 1; }
mkdir -p "$DIR"; cp -R "$HERE/template/." "$DIR/"
cd "$DIR"
UPPER=$(printf '%s' "$TITLE" | tr '[:lower:]' '[:upper:]')
python3 - "$TITLE" "$JP" "$UPPER" <<'PY'
import sys; t, jp, up = sys.argv[1:]
s = open('src/shell.html').read().replace('{{TITLE}}', t).replace('{{TITLE_JP}}', jp or t).replace('{{TITLE_UPPER}}', up)
open('src/shell.html', 'w').write(s)
PY
cat > src/order.json <<'JSON'
["core.js", "paint.js", "kit.js", "gl.js", "mesh.js", "layer.js", "reveal.js", "fx.js", "bird.js", "audio.js", "main.js"]
JSON
mkdir -p render out
npm install --silent --no-audit --no-fund >/dev/null 2>&1 && echo "puppeteer-core installed" || echo "npm install failed: run it by hand"
echo "scaffolded $DIR. Add shot files to src/ and list them in src/order.json between bird.js and audio.js."
