#!/usr/bin/env bash
# Screenshot a town page with headless Chrome and tile the shots into one contact sheet.
#   shot.sh <town.html> <out.png> [views...]     views are URL hashes; default: 1 1n
#   e.g. shot.sh examples/three-towns.html /tmp/sheet.png 1 2 3 2n
# Console errors from the page are printed.
set -euo pipefail
html=$(cd "$(dirname "$1")" && pwd)/$(basename "$1"); out=$2; shift 2
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
command -v google-chrome >/dev/null && CHROME=${CHROME_BIN:-google-chrome} || true
views=("$@"); [[ ${#views[@]} -eq 0 ]] && views=(1 1n)
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
i=0
for v in "${views[@]}"; do
  "$CHROME" --headless=new --hide-scrollbars --window-size=1280,720 --virtual-time-budget=2500 \
    --enable-logging=stderr --screenshot="$tmp/$(printf %03d $i).png" "file://$html#$v" 2>&1 \
    | grep -o 'CONSOLE.*' || true
  i=$((i+1))
done
if (( i == 1 )); then cp "$tmp/000.png" "$out"
else ffmpeg -loglevel error -y -i "$tmp/%03d.png" -vf "scale=640:-1,tile=2x$(( (i+1)/2 ))" "$out"; fi
echo "$out"
