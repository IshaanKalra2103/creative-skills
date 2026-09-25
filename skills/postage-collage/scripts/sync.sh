#!/usr/bin/env bash
# Copy the runtime (assets/stamp.css + stamp.js) into every example after editing it.
set -euo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
for d in "$here"/examples/*/; do cp "$here/assets/stamp.css" "$here/assets/stamp.js" "$d"; echo "synced $d"; done
