# /// script
# dependencies = ["httpx"]
# ///
"""Music bed from music.json via the ElevenLabs Music API (composition plan, one chunk per section).

uv run music.py [tag]   -> build/music_<tag>.mp3   (audio.py <tag> mixes it)

music.json: {"model": "music_v2_5", "base": [styles for every section], "negative": [...],
             "sections": [{"name": "Main", "until": 15.4, "styles": [...], "negative": [...], "text": "optional lyric-sheet note"}, ...]}
Each section runs from the previous section's "until" to its own, so put the boundaries on the film's cuts:
the drop on the logo reveal, the breakdown under the end-card tagline, one final hit on the lockup.
Keep sections >= 3 s. Music generation does not use TTS characters on the plans tried so far.
"""
import json, os, pathlib, subprocess, sys
import httpx

HERE = pathlib.Path(__file__).resolve().parent
B = HERE / "build"


def key():
    if os.environ.get("ELEVENLABS_API_KEY"): return os.environ["ELEVENLABS_API_KEY"]
    r = subprocess.run(["security", "find-generic-password", "-s", "ELEVENLABS_API_KEY", "-w"], capture_output=True, text=True)
    if r.returncode: sys.exit("no ElevenLabs key: export ELEVENLABS_API_KEY or add it to the Keychain")
    return r.stdout.strip()


def plan(cfg):
    chunks, prev = [], 0.0
    for s in cfg["sections"]:
        ms = int(round((s["until"] - prev) * 1000)); prev = s["until"]
        if ms < 3000: print(f"warning: section {s['name']} is {ms} ms (< 3 s)", file=sys.stderr)
        chunks.append({"text": s.get("text") or f"[{s['name']}]", "duration_ms": ms,
                       "positive_styles": cfg["base"] + s.get("styles", []),
                       "negative_styles": cfg.get("negative", []) + s.get("negative", []), "context_adherence": "high"})
    return {"chunks": chunks}


if __name__ == "__main__":
    tag = sys.argv[1] if len(sys.argv) > 1 else "a"
    cfg = json.loads((HERE / "music.json").read_text())
    p = plan(cfg); B.mkdir(exist_ok=True)
    print("sections:", [(c["text"].split("]")[0] + "]", c["duration_ms"]) for c in p["chunks"]], "total ms", sum(c["duration_ms"] for c in p["chunks"]))
    r = httpx.post("https://api.elevenlabs.io/v1/music", params={"output_format": "mp3_44100_128"},
                   headers={"xi-api-key": key(), "Content-Type": "application/json"},
                   json={"composition_plan": p, "model_id": cfg.get("model", "music_v2_5")}, timeout=600)
    if r.status_code != 200:
        sys.exit(f"HTTP {r.status_code} {r.text[:800]}")
    out = B / f"music_{tag}.mp3"; out.write_bytes(r.content)
    print(json.dumps({"ok": True, "out": str(out), "kb": len(r.content) // 1024}))
