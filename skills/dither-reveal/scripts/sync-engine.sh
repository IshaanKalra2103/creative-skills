#!/usr/bin/env bash
# Copy template/engine.js into every example page that loads it (and any extra page dirs given).
# index.html and image.js are per page and are left alone. examples/geode is standalone and skipped.
set -euo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
for d in "$here"/examples/*/ "$@"; do
  grep -q 'src="engine.js"' "$d/index.html" 2>/dev/null || continue
  cp "$here/template/engine.js" "$d"; echo "synced $d"
done
