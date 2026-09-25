#!/usr/bin/env bash
# Screenshot a signal-print page with headless Chrome (full sheet, 1500 wide).
#   shot.sh <page.html> [out.png] [height=2400]
set -euo pipefail
page="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
out="${2:-${page%.html}.png}"; h="${3:-2400}"
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$chrome" ] || chrome="$(command -v google-chrome || command -v chromium)"
"$chrome" --headless=new --disable-gpu --hide-scrollbars --window-size=1500,"$h" \
  --virtual-time-budget=4000 --screenshot="$out" "file://$page" 2>/dev/null
echo "$out"
