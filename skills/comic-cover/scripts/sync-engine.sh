#!/usr/bin/env bash
# engine/ is shared: every example carries a byte-identical copy. Change engine/, then run this.
set -euo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
for d in "$here"/examples/*/; do rsync -a --delete "$here/engine/" "$d/engine/"; echo "synced ${d%/}"; done
