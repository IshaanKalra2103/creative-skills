#!/usr/bin/env python3
"""Render a morning-debrief JSON into one self-contained HTML page.

    python3 render.py brief.json brief.html [--painting N]

Picks the day's painting from ../assets/paintings.json (public domain, Wikimedia
Commons), caches a downsized copy in ~/.cache/morning-debrief/, and embeds it as a
data URI. With no network and no cache, the page falls back to a gradient.
Standard library only (uses macOS `sips` to downsize when available).
"""

import argparse
import base64
import html
import json
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
TEMPLATE = HERE / "assets/template.html"
PAINTINGS = HERE / "assets/paintings.json"
CACHE = Path.home() / ".cache/morning-debrief"
COMMONS = "https://commons.wikimedia.org/wiki/Special:FilePath/{}?width=1600"
UA = "morning-debrief/1.0 (personal daily brief; Claude Code skill)"


def painting_for(day: date, override: int | None) -> dict:
    works = json.loads(PAINTINGS.read_text())
    return works[(override if override is not None else day.toordinal()) % len(works)]


def fetch_painting(work: dict) -> str | None:
    CACHE.mkdir(parents=True, exist_ok=True)
    small = CACHE / (Path(work["file"]).stem[:80] + ".small.jpg")
    if not small.exists():
        raw = CACHE / "download.tmp"
        try:
            url = COMMONS.format(urllib.parse.quote(work["file"]))
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r, raw.open("wb") as f:
                shutil.copyfileobj(r, f)
        except Exception as e:  # offline or moved file: gradient fallback
            print(f"painting download failed ({e}); using gradient", file=sys.stderr)
            return None
        if shutil.which("sips"):
            subprocess.run(["sips", "-Z", "1400", "-s", "format", "jpeg", "-s", "formatOptions", "72",
                            str(raw), "--out", str(small)], capture_output=True)
        if not small.exists():
            raw.replace(small)
        raw.unlink(missing_ok=True)
    return "data:image/jpeg;base64," + base64.b64encode(small.read_bytes()).decode()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("data", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--painting", type=int, help="index into paintings.json (default: by date)")
    args = ap.parse_args()

    brief = json.loads(args.data.read_text())
    meta = brief.setdefault("meta", {})
    when = datetime.fromisoformat(meta["generated_at"]) if meta.get("generated_at") else datetime.now().astimezone()
    meta.setdefault("generated_at", when.isoformat())

    work = painting_for(when.date(), args.painting)
    brief["painting"] = {"caption": work["caption"], "position": work.get("position", "center"),
                         "data_uri": fetch_painting(work)}

    payload = json.dumps(brief, ensure_ascii=False).replace("</", "<\\/")
    title = f"The {when.strftime('%A')} Brief — {meta.get('project', 'Daily')}, {when.strftime('%-d %B')}"
    page = TEMPLATE.read_text().replace("__TITLE__", html.escape(title)).replace("__BRIEF_JSON__", payload)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(page)
    print(f"wrote {args.out} ({len(page) // 1024} KB) — painting: {work['caption']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
