#!/bin/zsh
# Regression: render the same global ticks with the old film/ build and this engine on the
# Google spec, print mean abs difference per tick (0-255).  tools/pixdiff.sh 11 12 13
set -e
here=${0:A:h}/..
old=~/Documents/projects/creative/google-retro/film
spec=~/Documents/projects/creative/google-retro/spec/video.toml
a=$(mktemp -d); b=$(mktemp -d)
frames=(); for k in "$@"; do frames+=$((3 * k)); done
(cd $old && ./target/release/retro frame ${(j:,:)frames} -o $a >/dev/null 2>&1)
SPEC=$spec $here/target/release/docshort frame ${(j:,:)frames} -o $b >/dev/null 2>&1
uv run --with pillow --with numpy python -c "
import sys, numpy as np
from PIL import Image
for f in sys.argv[3:]:
    x = np.asarray(Image.open(f'{sys.argv[1]}/{f}.png').convert('RGB')).astype(float)
    y = np.asarray(Image.open(f'{sys.argv[2]}/{f}.png').convert('RGB')).astype(float)
    print(f'tick {int(f)//3}: mean abs diff {np.abs(x-y).mean():.3f}  max {np.abs(x-y).max():.0f}')
" $a $b ${frames[@]}
rm -rf $a $b
