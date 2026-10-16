# /// script
# dependencies = ["httpx"]
# ///
"""A music bed for a spec from the ElevenLabs Music API (optional; any track in audio/ works too).

uv run tools/music.py path/to/video.toml     # -> <dir>/audio/music.wav (length = the video)

The spec's [music] table:
    styles = ["lo-fi documentary", "warm analog synth pads", "soft vinyl crackle", "90 bpm"]
    negative = ["vocals", "drums too loud"]
    sections = [{ name = "Intro", until = 4.0 }, { name = "Main", until = 22.0, styles = ["fuller beat"] }, { name = "Outro" }]
Section boundaries in seconds; the last one runs to the end of the video. Keep sections >= 3 s.
Add it to the mix with `audio = [{ file = "vo.wav" }, { file = "music.wav", gain = -16 }]`.
Key: $ELEVENLABS_API_KEY, else the macOS Keychain item ELEVENLABS_API_KEY.
"""
import json, os, pathlib, subprocess, sys, tomllib


def key():
    if os.environ.get("ELEVENLABS_API_KEY"):
        return os.environ["ELEVENLABS_API_KEY"]
    r = subprocess.run(["security", "find-generic-password", "-s", "ELEVENLABS_API_KEY", "-w"], capture_output=True, text=True)
    if r.returncode:
        sys.exit("no ElevenLabs key: export ELEVENLABS_API_KEY or add it to the Keychain")
    return r.stdout.strip()


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    import httpx
    spec = pathlib.Path(sys.argv[1]).resolve()
    d = spec.parent
    root = tomllib.loads(spec.read_text())
    cfg = root.get("music", {})
    end = float(root.get("video", {}).get("end", 0) or 0)
    if not end:
        words = json.loads((d / "build/words.json").read_text())
        end = words[-1]["e"] + float(root.get("video", {}).get("tail", 1.0))
    base, neg = cfg.get("styles", ["documentary underscore", "warm analog synths", "steady pulse"]), cfg.get("negative", ["vocals"])
    sections = cfg.get("sections", [{"name": "Main"}])
    chunks, prev = [], 0.0
    for i, s in enumerate(sections):
        until = end if i == len(sections) - 1 else float(s["until"])
        ms = int(round((until - prev) * 1000))
        prev = until
        if ms < 3000:
            print(f"warning: section {s.get('name')} is {ms} ms (< 3 s)", file=sys.stderr)
        chunks.append({"text": f"[{s.get('name', 'Section')}]", "duration_ms": ms, "positive_styles": base + s.get("styles", []),
                       "negative_styles": neg + s.get("negative", []), "context_adherence": "high"})
    r = httpx.post("https://api.elevenlabs.io/v1/music", params={"output_format": "mp3_44100_128"},
                   headers={"xi-api-key": key(), "Content-Type": "application/json"},
                   json={"composition_plan": {"chunks": chunks}, "model_id": cfg.get("model", "music_v2_5")}, timeout=600)
    if r.status_code != 200:
        sys.exit(f"ElevenLabs music {r.status_code}: {r.text[:600]}")
    (d / "build").mkdir(exist_ok=True)
    (d / "audio").mkdir(exist_ok=True)
    mp3 = d / "build/music.mp3"
    mp3.write_bytes(r.content)
    fade = max(0.0, end - 1.2)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp3), "-af", f"atrim=0:{end:.3f},afade=t=out:st={fade:.3f}:d=1.2",
                    "-ac", "2", "-ar", "48000", str(d / "audio/music.wav")], check=True)
    print(json.dumps({"ok": True, "out": str(d / "audio/music.wav"), "seconds": round(end, 2)}))


if __name__ == "__main__":
    main()
