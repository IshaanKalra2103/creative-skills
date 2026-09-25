#!/usr/bin/env bash
# Screenshots for review.
#   scripts/shot.sh <page.html> [outdir]
#   → desktop.png (1440 wide, 2x retina), phone.png (390 via iframe), stamps.png (every stamp in the zoom view, tiled)
# Read desktop.png for the collage, then stamps.png for detail — most fixes come from the per-stamp view.
set -euo pipefail
page=$(cd "$(dirname "$1")" && pwd)/$(basename "$1"); out=${2:-$(dirname "$page")/shots}; mkdir -p "$out"
chrome=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
run(){ "$chrome" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=9000 --allow-file-access-from-files "$@" 2>/dev/null; }
rows=$(python3 -c "
import re,sys; h=open('$page').read(); b=h[h.index('<main'):]
t=re.findall(r'<section class=\"tile[^\"]*\"',b); cells=sum(2 if 'wide' in x else 1 for x in t); print(-(-cells//4))")
run --force-device-scale-factor=2 --window-size=1440,$((rows*450)) --screenshot="$out/desktop@2x.png" "file://$page?still"
harness=$(mktemp -t phoneXXXX).html
echo "<body style='margin:0;background:#333'><iframe src='file://$page?still' style='border:0;width:390px;height:9000px'></iframe>" > "$harness"
run --force-device-scale-factor=1 --window-size=390,9000 --screenshot="$out/phone.png" "file://$harness"; rm -f "$harness"
n=$(grep -o 'class="stamp ' "$page" | wc -l | tr -d ' ')
for ((k=0; k<n; k++)); do run --force-device-scale-factor=1 --window-size=1000,800 --screenshot="$out/z_$k.png" "file://$page?z=$k"; done
uv run -q --with pillow python - "$out" "$n" <<'PY'
import sys; from PIL import Image
out, n = sys.argv[1], int(sys.argv[2])
d = Image.open(f"{out}/desktop@2x.png"); d.resize((d.width // 2, d.height // 2)).save(f"{out}/desktop.png")
cols = 3; W, H = 1000, 800; s = Image.new("RGB", (cols * W, H * ((n + cols - 1) // cols)))
for k in range(n): s.paste(Image.open(f"{out}/z_{k}.png"), ((k % cols) * W, (k // cols) * H))
s.save(f"{out}/stamps.png")
import glob, os; [os.remove(f) for f in glob.glob(f"{out}/z_*.png")]
print(f"{out}/desktop.png  {out}/desktop@2x.png  {out}/phone.png  {out}/stamps.png ({n} stamps)")
PY
