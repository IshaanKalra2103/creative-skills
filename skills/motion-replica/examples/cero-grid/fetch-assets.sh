#!/usr/bin/env bash
# Build the example's embedded car (kept out of git: 3.4 MB of base64).
# "Car Concept" — Eric Chadwick / Darmstadt Graphics Group, CC-BY 4.0, from a CC0 model by Unity Fan.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
tmpd="$(mktemp -d)"; tmp="$tmpd/CarConcept.glb"; trap 'rm -rf "$tmpd"' EXIT
curl -sL -o "$tmp" "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/glTF-Binary/CarConcept.glb"
bash "$here/../../scripts/prep-glb.sh" "$tmp" "$here/assets/car-glb.js" CAR_GLB \
  "Car Concept by Eric Chadwick / Darmstadt Graphics Group, CC-BY 4.0 (Khronos glTF-Sample-Assets), from a CC0 model by Unity Fan"
