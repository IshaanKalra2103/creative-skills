#!/usr/bin/env bash
# Reference and render side by side, 3 frames per second, one sheet.
#   scripts/compare.sh <reference.mp4> <render.mp4> [out.png]
set -euo pipefail
out="${3:-compare.png}"
ffmpeg -v error -y -i "$1" -i "$2" -filter_complex \
  "[0]scale=360:360,setsar=1[a];[1]scale=360:360,setsar=1[b];[a][b]hstack,fps=3,tile=4x4" \
  -frames:v 1 "$out"
echo "$out"
