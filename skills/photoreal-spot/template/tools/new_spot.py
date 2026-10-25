# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Start a spot: make the folder layout and copy the starter spot.json into it.
usage: uv run tools/new_spot.py DIR
"""
import os, shutil, sys

here = os.path.dirname(os.path.abspath(__file__))
d = os.path.abspath(sys.argv[1])
if os.path.exists(os.path.join(d, "spot.json")):
    raise SystemExit(f"{d}/spot.json exists already")
for sub in ["ref", "stills", "raw", "frames", "renders", "runtime", "out"]:
    os.makedirs(os.path.join(d, sub), exist_ok=True)
shutil.copy(os.path.join(here, "..", "spot.json"), os.path.join(d, "spot.json"))
print(f"""{d}
  ref/       the reference spot (mp4), for study.py, hits.py and qa.py
  stills/    prompts (.txt) and the photoreal stills they make
  raw/       the AI clips exactly as delivered
  frames/    unpacked clips, one folder per source (unpack.py)
  renders/   plates by shot id (plates.py, snaps.py, any 3D renders)
  runtime/   plates.mp4 (assemble.py), the soundtrack, logos for the end card
  out/       renders of the cut
next: study the reference (SKILL.md, step 1), then edit spot.json""")
