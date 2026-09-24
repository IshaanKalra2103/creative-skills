#!/usr/bin/env bash
# Render QA stills of a painted-dance page with headless Chrome.
#   scripts/stills.sh film.html [out_dir] [strip_start_seconds]
# Writes t<sec>.png stills, sheet.png (contact sheet) and strip.png (8 frames at 12 fps).
set -euo pipefail
FILE=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
OUT=${2:-./qa}; STRIP=${3:-37.5}
mkdir -p "$OUT"
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
shot() { "$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=1920,1080 \
  --force-device-scale-factor=1 --screenshot="$OUT/$2.png" "file://$FILE?t=$1" 2>/dev/null; }
for t in 3 6 12 20 30 34 40 50 56.5 59.6; do shot "$t" "t$t"; done
for i in 0 1 2 3 4 5 6 7; do shot "$(python3 -c "print(round($STRIP+$i/12,4))")" "s$i"; done
uvx --with pillow python - "$OUT" <<'EOF'
import sys
from PIL import Image
o = sys.argv[1]
ts = ['3', '6', '12', '20', '30', '34', '40', '50', '56.5', '59.6']
ims = [Image.open(f'{o}/t{t}.png').convert('RGB').resize((640, 360)) for t in ts]
sheet = Image.new('RGB', (1920, 360 * 4))
for i, im in enumerate(ims): sheet.paste(im, ((i % 3) * 640, (i // 3) * 360))
sheet.save(f'{o}/sheet.png')
fr = [Image.open(f'{o}/s{i}.png').convert('RGB').crop((560, 150, 1360, 1000)).resize((400, 425)) for i in range(8)]
strip = Image.new('RGB', (1600, 850))
for i, im in enumerate(fr): strip.paste(im, ((i % 4) * 400, (i // 4) * 425))
strip.save(f'{o}/strip.png')
print('wrote', o + '/sheet.png', o + '/strip.png')
EOF
