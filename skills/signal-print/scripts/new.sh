#!/usr/bin/env bash
# Scaffold a signal-print page set from the LOOM example.
#   new.sh <dest-dir> [--name NAME] [--accent '#hex'] [--ink '#hex'] [--paper '#hex']
# Copies identity.html + svg-kit.html, swaps the colour tokens and the wordmark.
# Everything else (copy, vocabulary, the mark) is still LOOM's and must be rewritten by hand.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
dest="${1:?usage: new.sh <dest-dir> [--name NAME] [--accent '#hex'] [--ink '#hex'] [--paper '#hex']}"; shift
name="" accent="" ink="" paper=""
while [ $# -gt 0 ]; do
  case "$1" in
    --name) name="$2"; shift 2;;
    --accent) accent="$2"; shift 2;;
    --ink) ink="$2"; shift 2;;
    --paper) paper="$2"; shift 2;;
    *) echo "unknown option $1" >&2; exit 1;;
  esac
done
mkdir -p "$dest"
cp "$here/examples/loom/identity.html" "$here/examples/loom/svg-kit.html" "$dest/"
for f in "$dest/identity.html" "$dest/svg-kit.html"; do
  [ -n "$accent" ] && sed -i '' "s/#ff5217/$accent/Ig" "$f"
  [ -n "$ink" ]    && sed -i '' "s/#1b1916/$ink/Ig" "$f"
  [ -n "$paper" ]  && sed -i '' "s/#f5f2ea/$paper/Ig" "$f"
  if [ -n "$name" ]; then
    up="$(echo "$name" | tr '[:lower:]' '[:upper:]')"; low="$(echo "$name" | tr '[:upper:]' '[:lower:]')"
    sed -i '' -e "s/LOOM/$up/g" -e "s/>loom\./>$low./g" -e "s/'loom'/'$low'/g" -e "s/loom-\\\$/$low-\$/g" "$f"
  fi
done
echo "wrote $dest/identity.html and $dest/svg-kit.html"
echo "next: rewrite the vocabulary (references/grammar.md → Copy), redesign MARK in both files, then scripts/shot.sh"
