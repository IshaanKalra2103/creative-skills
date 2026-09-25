#!/usr/bin/env bash
# Turn a folder of reference reels into things you can actually look at:
# one contact sheet per video (a frame every N seconds) and a cut count.
# Usage: bash scripts/study-reels.sh <videos-dir> <out-dir> [seconds-per-frame=2]
#        bash scripts/study-reels.sh <video.mp4> <out-dir> burst <start> <dur>   # 4 fps burst of one section
set -euo pipefail
src=$1; out=$2; mkdir -p "$out"

if [ "${3:-}" = "burst" ]; then
  n=$(basename "${src%.*}")
  ffmpeg -v error -y -ss "$4" -t "$5" -i "$src" -vf "fps=4,scale=200:-1,tile=8x5:padding=2" -frames:v 1 "$out/${n}_burst_$4.jpg"
  echo "$out/${n}_burst_$4.jpg"; exit 0
fi

step=${3:-2}
for f in "$src"/*.mp4; do
  n=$(basename "${f%.*}")
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  cuts=$(ffmpeg -i "$f" -vf "select='gt(scene,0.3)',showinfo" -f null - 2>&1 | grep -c pts_time || true)
  ffmpeg -v error -y -i "$f" -vf "fps=1/$step,scale=160:-1,tile=8x5:padding=2" -frames:v 1 -q:v 4 "$out/$n.jpg"
  printf "%s  dur=%5.1fs  cuts=%3s  -> %s\n" "$n" "$dur" "$cuts" "$out/$n.jpg"
done
