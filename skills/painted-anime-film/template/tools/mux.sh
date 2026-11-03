#!/bin/sh
# Picture master + soundtrack -> render/<name>.mp4 (video stream copied) and render/<name>-share.mp4 (lighter).
# Run after: node tools/film.mjs render/picture.mp4  and  (cd audio && uv run mix.py)
set -e; cd "$(dirname "$0")/.."
NAME=${NAME:-$(basename "$PWD")}
AAC=aac_at; ffmpeg -hide_banner -encoders 2>/dev/null | grep -q aac_at || AAC=aac
ffmpeg -y -hide_banner -loglevel error -i render/picture.mp4 -i audio/soundtrack.wav -map 0:v -map 1:a \
  -c:v copy -c:a $AAC -b:a 256k -movflags +faststart render/$NAME.mp4
ffmpeg -y -hide_banner -loglevel error -i render/picture.mp4 -i audio/soundtrack.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 19 -tune grain -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a $AAC -b:a 256k -movflags +faststart render/$NAME-share.mp4
/bin/ls -la render/*.mp4
