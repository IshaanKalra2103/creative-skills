#!/usr/bin/env bash
# Study a reference clip: download, probe, contact sheets, every frame, then measure
# palette, coverage per frame, line boil (on twos?) and the audio envelope.
#
#   scripts/study.sh <url-or-file> <out-dir>
#
# Writes into <out-dir>: src.mp4, probe.txt, sheet.png (6 fps overall), intro.png and
# outro.png (every frame of the first/last 48), f/NNN.png, report.txt.
set -euo pipefail
src="$1"; out="$2"
here="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$out/f"
if [[ -f "$src" ]]; then
  cp "$src" "$out/src.mp4"
else
  yt-dlp -q -f "bv*+ba/b" --merge-output-format mp4 -o "$out/src.%(ext)s" "$src"
fi
ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate,nb_frames,duration -of compact "$out/src.mp4" | tee "$out/probe.txt"
n=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$out/src.mp4")
ffmpeg -v error -y -i "$out/src.mp4" -vf "fps=6,scale=270:-1,tile=6x6" -frames:v 1 "$out/sheet.png"
ffmpeg -v error -y -i "$out/src.mp4" -vf "select='lt(n\,48)',scale=270:-1,tile=8x6" -fps_mode vfr -frames:v 1 "$out/intro.png"
ffmpeg -v error -y -i "$out/src.mp4" -vf "select='gte(n\,$((n - 48)))',scale=270:-1,tile=8x6" -fps_mode vfr -frames:v 1 "$out/outro.png"
ffmpeg -v error -y -i "$out/src.mp4" "$out/f/%03d.png"
if ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$out/src.mp4" | grep -q audio; then
  ffmpeg -v error -y -i "$out/src.mp4" -vn -ac 1 -ar 16000 "$out/audio.wav"
fi
uv run -q --with pillow python -I "$here/study.py" "$out" | tee "$out/report.txt"
