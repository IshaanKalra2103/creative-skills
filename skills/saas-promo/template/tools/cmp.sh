#!/bin/zsh
# Reference vs ours at the same seconds (one row per time: reference | ours, 640 px each).
#   REF=path/to/original.mp4 tools/cmp.sh spec.toml out.png 2.0 4.5 7.25
#   FULL=1 ... -> full size, reference above ours.  W=960 for wider tiles.
set -e
here=${0:A:h}/..
spec=${1:A}; out=${2:A}; shift 2
ref=${REF:?set REF to the reference video}
tmp=$(mktemp -d)
times=(); for s in "$@"; do times+=("${s}s"); done
SPEC=$spec $here/target/release/saaspromo frame ${(j:,:)times} -o $tmp >$tmp/log 2>&1 || { cat $tmp/log; exit 1; }
w=${W:-640}
inputs=(); filt=""; rows=""; i=0
for s in "$@"; do
  ours=$tmp/${s}s.png
  ffmpeg -v error -y -ss $s -i $ref -frames:v 1 -vf scale=1920:1080 $tmp/ref_$i.png
  inputs+=(-i $tmp/ref_$i.png -i $ours)
  if [[ -n $FULL ]]; then filt+="[$((2*i))][$((2*i+1))]vstack[r$i];"
  else filt+="[$((2*i))]scale=$w:-1[a$i];[$((2*i+1))]scale=$w:-1[b$i];[a$i][b$i]hstack[r$i];"; fi
  rows+="[r$i]"; i=$((i+1))
done
if [[ $i -gt 1 ]]; then filt+="${rows}vstack=inputs=${i}[o]"; else filt+="${rows}null[o]"; fi
ffmpeg -v error -y "${inputs[@]}" -filter_complex "$filt" -map "[o]" $out
grep -iE "warn|error|no match" $tmp/log | sort -u | head -5 || true
rm -rf $tmp
echo $out
