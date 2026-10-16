#!/usr/bin/env bash
# Scaffold a new 3D explainer from the template.
#   scripts/new_explainer.sh <target-dir> ["SMALL TITLE"] ["BIG TITLE"]
# Copies templates/ into <target-dir> (refuses to overwrite a non-empty dir), sets the title,
# and prints the next steps. The result opens straight from file://.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${1:?usage: new_explainer.sh <target-dir> [\"SMALL TITLE\"] [\"BIG TITLE\"]}"
T1="${2:-THE SOFT}"
T2="${3:-LOOKUP}"
if [ -d "$DEST" ] && [ -n "$(ls -A "$DEST" 2>/dev/null)" ]; then
  echo "refusing: $DEST exists and is not empty" >&2; exit 1
fi
mkdir -p "$DEST"
cp -R "$HERE/templates/." "$DEST/"
# set the two-weight title (and the browser tab title) in the explainer config
python3 - "$DEST/dx-explainer.js" "$T1" "$T2" <<'PY'
import sys, re, json
p, t1, t2 = sys.argv[1:4]
s = open(p).read()
s = re.sub(r'title: \[[^\]]*\],', 'title: [%s, %s],' % (json.dumps(t1), json.dumps(t2)), s, count=1)
s = re.sub(r'pageTitle: "[^"]*",', 'pageTitle: %s,' % json.dumps((t1 + " " + t2).title()), s, count=1)
open(p, "w").write(s)
PY
echo "created $DEST"
echo "next:"
echo "  1. replace dx-compute.js with your real computation (+ tools/reference.py, then: node tools/verify.js)"
echo "  2. rewrite stations/text/tour in dx-explainer.js"
echo "  3. open file://$(cd "$DEST" && pwd)/index.html"
echo "  4. uv run --no-project --with playwright python $HERE/scripts/shoot.py $(cd "$DEST" && pwd)/index.html"
