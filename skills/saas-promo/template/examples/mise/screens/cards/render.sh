#!/bin/zsh
# Render every card in cards.html to assets/card_<id>.png (640x360 CSS px at 2x).
#   zsh examples/mise/screens/cards/render.sh [id ...]      (run from template/)
set -e
here=${0:A:h}
root=$here/../../../..
if (( $# )); then ids=($@); else ids=(bakery wine ramen coffee gelato pizza oyster dumpling poster); fi
for id in $ids; do
  uv run -q $root/tools/screens/render.py $here/cards.html $here/../../assets/card_$id.png --size 1400x2400 --scale 2 --select "#$id" 2>&1 | grep -v "GET /" || true
done
