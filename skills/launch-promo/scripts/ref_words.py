# /// script
# dependencies = ["mlx-whisper"]
# ///
"""Transcribe a reference video's voiceover with word timings, and print each line's start time.

uv run ref_words.py ref.mp4 [out.json]
The line starts are the target column of your script.json: write your own line for each reference line,
keep it about as long, and vo.py place lays it at the same moment, so your cut can follow the reference's beats.
Also use it on your own final mix: every line should come back word for word (proof the music/SFX don't bury the voice).
Apple Silicon (mlx). Elsewhere swap in openai-whisper / faster-whisper with word_timestamps=True.
"""
import json, subprocess, sys, tempfile

if len(sys.argv) < 2: sys.exit(__doc__)
import mlx_whisper
wav = tempfile.mktemp(suffix=".wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", sys.argv[1], "-vn", "-ac", "1", "-ar", "16000", wav], check=True)
r = mlx_whisper.transcribe(wav, path_or_hf_repo="mlx-community/whisper-large-v3-turbo", word_timestamps=True)
lines = [{"start": round(s["start"], 2), "end": round(s["end"], 2), "text": s["text"].strip(),
          "words": [{"w": w["word"].strip(), "s": round(w["start"], 2), "e": round(w["end"], 2)} for w in s.get("words", [])]} for s in r["segments"]]
for l in lines:
    st = l["words"][0]["s"] if l["words"] else l["start"]
    print(f"[{st:6.2f}, \"{l['text']}\"],   # {len(l['text'].split())} words, {l['end'] - st:.2f} s")
if len(sys.argv) > 2:
    json.dump(lines, open(sys.argv[2], "w"), indent=1); print("->", sys.argv[2])
