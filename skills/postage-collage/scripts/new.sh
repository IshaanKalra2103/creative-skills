#!/usr/bin/env bash
# Scaffold a stamp-collage page.
#   scripts/new.sh <dest> [family ...]
# Families (default: all ten, in a layout that tiles cleanly):
#   museum window pixel botanical poster panels swiss ticket condensed circle
# The page ships with the example's public-domain images and recipes.json so it renders at once;
# swap images/copy per stamp, then re-run images.py fetch/prep with your own recipes.
set -euo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
dest=${1:?usage: new.sh <dest> [family ...]}; shift || true
fams=("$@"); [ ${#fams[@]} -eq 0 ] && fams=(museum window pixel botanical poster panels swiss ticket condensed circle)
mkdir -p "$dest/assets" "$dest/shots"
cp "$here/assets/stamp.css" "$here/assets/stamp.js" "$dest/"
cp -n "$here/examples/the-long-post/assets/"*.jpg "$dest/assets/" 2>/dev/null || true
[ -f "$dest/recipes.json" ] || cp "$here/examples/the-long-post/recipes.json" "$dest/"
stamps=$(mktemp)
for f in "${fams[@]}"; do
  src="$here/template/families/$f.html"; [ -f "$src" ] || { echo "unknown family: $f" >&2; exit 1; }
  cat "$src" >> "$stamps"; echo >> "$stamps"
done
python3 - "$here/template/shell.html" "$stamps" "$dest/index.html" <<'PY'
import sys; shell, stamps, out = sys.argv[1:]
open(out, 'w').write(open(shell).read().replace('<!-- @STAMPS -->', open(stamps).read().rstrip()))
PY
rm -f "$stamps"
cells=$(python3 -c "import re;h=open('$dest/index.html').read();t=re.findall(r'<section class=\"tile[^\"]*\"',h);print(sum(2 if 'wide' in x else 1 for x in t))")
[ $((cells % 4)) -ne 0 ] && echo "note: $cells grid cells (wide tiles count 2) — not a multiple of 4, the last row will have a gap. Add/remove a family or toggle a tile's .wide." >&2
echo "$dest/index.html  (${#fams[@]} stamps: ${fams[*]})"
