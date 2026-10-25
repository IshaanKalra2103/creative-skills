#!/bin/sh
# Build a spot end to end: video plates, snap cuts, assemble, then the comp.
# usage: tools/spot.sh SPOT_DIR [OUT.mp4]   (default OUT: SPOT_DIR/out/<folder name>.mp4)
set -e
here=$(cd "$(dirname "$0")" && pwd)
spot=$(cd "$1" && pwd)
out=${2:-$spot/out/$(basename "$spot").mp4}
mkdir -p "$(dirname "$out")"
out=$(cd "$(dirname "$out")" && pwd)/$(basename "$out")
uv run -q "$here/plates.py" "$spot"
uv run -q "$here/snaps.py" "$spot"
uv run -q "$here/assemble.py" "$spot"
cd "$here/../comp"
SPOT="$spot/spot.json" cargo run -q --release -- render -o "$out"
