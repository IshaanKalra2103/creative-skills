#!/bin/sh
# Screenshot a sheet with headless Chrome: scripts/shot.sh path/to/index.html out.png [seed]
# Uses ?still so the boil is frozen. 2x device scale so panel detail is inspectable.
page=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=1400,960 --force-device-scale-factor=2 \
  --virtual-time-budget=2000 --screenshot="$2" "file://$page?still&seed=${3:-1}" 2>/dev/null
echo "$2"
