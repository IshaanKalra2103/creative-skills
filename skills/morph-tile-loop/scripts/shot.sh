#!/usr/bin/env bash
# Screenshot a loop at several times and tile them into one contact sheet.
#   shot.sh <loop.html> <out.png> [times...]      default times: 0 0.5 1.2 2 3 4 5 6 7 7.6
#   shot.sh <loop.html> <out.mp4> --mp4 [fps] [seconds]   full render (slow: one Chrome launch per frame)
set -euo pipefail
html=$(cd "$(dirname "$1")" && pwd)/$(basename "$1"); out=$2; shift 2
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
command -v google-chrome >/dev/null && CHROME=${CHROME_BIN:-google-chrome} || true
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
snap() { "$CHROME" --headless=new --hide-scrollbars --window-size=${3:-640,360} --virtual-time-budget=1000 \
  --screenshot="$2" "file://$html?t=$1" >/dev/null 2>&1; }

if [[ "${1:-}" == "--mp4" ]]; then
  fps=${2:-24}; secs=${3:-8}; total=$(awk "BEGIN{print int($fps*$secs)}")
  for ((f=0; f<total; f++)); do
    snap "$(awk "BEGIN{print $f/$fps}")" "$tmp/$(printf %05d $f).png" 1280,720
  done
  ffmpeg -loglevel error -y -framerate "$fps" -i "$tmp/%05d.png" -pix_fmt yuv420p "$out"
else
  times=("$@"); [[ ${#times[@]} -eq 0 ]] && times=(0 0.5 1.2 2 3 4 5 6 7 7.6)
  i=0; for t in "${times[@]}"; do snap "$t" "$tmp/$(printf %03d $i).png"; i=$((i+1)); done
  ffmpeg -loglevel error -y -i "$tmp/%03d.png" -vf "tile=2x$(( (i+1)/2 ))" "$out"
fi
echo "$out"
