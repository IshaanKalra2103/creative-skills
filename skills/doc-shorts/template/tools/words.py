# /// script
# dependencies = []
# ///
"""Word timings for your own narration (a recording, or the reference reel's audio).

uv run tools/words.py path/to/video.toml [audio/vo.wav]   # -> <dir>/build/words.json

Runs mlx-whisper (large-v3-turbo) through uvx on Apple Silicon. Shots then cue on words:
`cue = "Stanford"` or `cue = { word = "the", nth = 2, offset = -0.1 }`.
"""
import json, pathlib, subprocess, sys, tempfile

if len(sys.argv) < 2:
    sys.exit(__doc__)
spec = pathlib.Path(sys.argv[1]).resolve()
d = spec.parent
audio = pathlib.Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else d / "audio/vo.wav"
(d / "build").mkdir(exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
    wav = pathlib.Path(tmp) / "a.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(audio), "-ac", "1", "-ar", "16000", str(wav)], check=True)
    subprocess.run(["uvx", "--from", "mlx-whisper", "mlx_whisper", str(wav), "--model", "mlx-community/whisper-large-v3-turbo",
                    "--language", "en", "--word-timestamps", "True", "--output-format", "json", "--output-dir", tmp],
                   check=True, capture_output=True)
    j = json.loads((pathlib.Path(tmp) / "a.json").read_text())
words = [{"w": w["word"].strip(), "s": round(w["start"], 3), "e": round(w["end"], 3)} for seg in j["segments"] for w in seg["words"]]
(d / "build/words.json").write_text(json.dumps(words, indent=0))
print(" ".join(f"{w['w']}[{w['s']:.2f}]" for w in words))
print(json.dumps({"ok": True, "words": len(words), "out": str(d / "build/words.json")}))
