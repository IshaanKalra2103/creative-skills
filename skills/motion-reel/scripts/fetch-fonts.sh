#!/usr/bin/env bash
# Download the OFL fonts both templates use into their fonts/ folders.
# Usage: bash scripts/fetch-fonts.sh
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
g=https://github.com/google/fonts/raw/main/ofl

mkdir -p "$here/templates/flat-poster/fonts" "$here/templates/depth-camera/fonts"
get() { [ -s "$2" ] || curl -sfL -o "$2" "$1"; echo "ok $(basename "$2")"; }

get "$g/anton/Anton-Regular.ttf"                      "$here/templates/flat-poster/fonts/Anton.ttf"
get "$g/ibmplexmono/IBMPlexMono-Medium.ttf"           "$here/templates/flat-poster/fonts/PlexMono.ttf"
get "$g/fredoka/Fredoka%5Bwdth,wght%5D.ttf"           "$here/templates/flat-poster/fonts/Fredoka.ttf"
get "$g/archivoblack/ArchivoBlack-Regular.ttf"        "$here/templates/depth-camera/fonts/ArchivoBlack.ttf"
get "$g/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf"     "$here/templates/depth-camera/fonts/JBMono.ttf"
