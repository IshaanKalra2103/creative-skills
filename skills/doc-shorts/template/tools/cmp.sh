#!/bin/zsh
# Side-by-side review against a reference reel: reference | ours at the same ticks.
#   REF=path/to/f10 tools/cmp.sh spec.toml OUT.png 40 41 45
# REF holds the reference's distinct frames as NNN.png = tick NNN-1 (scripts/study.sh makes
# them). Without REF it shows ours only, which still works as a quick multi-tick strip.
set -e
here=${0:A:h}/..
spec=${1:A}; out=${2:A}; shift 2
tmp=$(mktemp -d)
frames=()
for k in "$@"; do frames+=$((3 * k)); done
SPEC=$spec $here/target/release/docshort frame ${(j:,:)frames} -o $tmp >/dev/null 2>&1
inputs=(); n=0
for k in "$@"; do
  f=$((3 * k))
  if [ -n "$REF" ]; then inputs+=(-i $REF/$(printf "%03d" $((k + 1))).png); n=$((n + 1)); fi
  inputs+=(-i $tmp/$f.png); n=$((n + 1))
done
filt=""; labels=""
for ((i = 0; i < n; i++)); do filt+="[$i]scale=360:640[v$i];"; labels+="[v$i]"; done
ffmpeg -v error -y "${inputs[@]}" -filter_complex "${filt}${labels}hstack=inputs=$n" $out
rm -rf $tmp
echo $out
