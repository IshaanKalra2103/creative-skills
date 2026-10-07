#!/usr/bin/env bash
# compare.sh <FxName> [time]  ->  compare/<FxName>.png : upstream cover.jpg | gallery frame
# Run from anywhere. Needs the upstream source for its covers:
#   git clone --depth 1 https://github.com/shader-effects-inc/shaders <skill>/.upstream/shader-effects
# or set SHADER_EFFECTS to an existing checkout.
set -euo pipefail
name="$1"; t="${2:-1s}"
here="$(cd "$(dirname "$0")/.." && pwd)"
upstream="${SHADER_EFFECTS:-$here/.upstream/shader-effects}"
cover="$upstream/packages/core/src/shaders/$name/cover.jpg"
cd "$here/gallery"
lower="$(echo "$name" | tr '[:upper:]' '[:lower:]')"
cargo run --release -q -- frame "$name@$t" --only "$name" >/dev/null
port="frames/${lower}_${t}.png"
mkdir -p compare
if [ -f "$cover" ]; then
  ffmpeg -hide_banner -loglevel error -y -i "$cover" -i "$port" \
    -filter_complex "[0]scale=-2:540[a];[1]scale=-2:540[b];[a][b]hstack" "compare/$name.png"
else
  cp "$port" "compare/$name.png"; echo "no cover for $name" >&2
fi
echo "$here/gallery/compare/$name.png"
