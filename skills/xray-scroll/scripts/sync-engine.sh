#!/usr/bin/env bash
# Copy template/engine.js + styles.css into every example (and any extra film dirs given).
# film.js and index.html are per film and are left alone.
set -euo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
for d in "$here"/examples/*/ "$@"; do cp "$here/template/engine.js" "$here/template/styles.css" "$d"; echo "synced $d"; done
