# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["parakeet-mlx"]
# ///
"""Parakeet ASR word timestamps for audio clips. Called by vo.py; not meant to be run by hand.
uv run align_parakeet.py out.json clip1.wav clip2.wav ...
out.json = {clip path: [{"w": word, "s": start s, "e": end s}, ...]} (times relative to the clip). Model loads once."""
import json, subprocess, sys
import numpy as np
from parakeet_mlx import from_pretrained



def snap(path, ws):
    """Parakeet frames are 80 ms and word starts often include the pause before them. Where a silent run (energy < 4% of the local
    peak) ends within -0.05..+0.25 s of a word start, move the start to the end of that silence (and the previous word's end back)."""
    sr = 16000
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32)
    if len(x) < sr // 10: return ws
    h = sr // 200
    e = np.sqrt(np.convolve(x * x, np.ones(h) / h, "same"))
    for i, w in enumerate(ws):
        a, b = max(int((w["s"] - 0.35) * sr), 0), min(int((w["s"] + 0.25) * sr), len(e))
        seg = e[a:b]
        if len(seg) < 10: continue
        q = seg < 0.04 * seg.max()
        ends = [a + j for j in range(len(seg) - 1) if q[j] and not q[j + 1] and q[max(j - 20, 0):j + 1].all()]  # runs >= ~100 ms
        ends = [t / sr for t in ends if -0.05 <= t / sr - w["s"] <= 0.25]
        if ends:
            w["s"] = min(ends, key=lambda t: abs(t - w["s"])) - 0.01
            if i and ws[i - 1]["e"] > w["s"]: ws[i - 1]["e"] = w["s"]
    return ws


out_path, clips = sys.argv[1], sys.argv[2:]
model = from_pretrained("mlx-community/parakeet-tdt-0.6b-v2")
res = {}
for c in clips:
    r = model.transcribe(c)
    ws = []
    for s in r.sentences:
        for t in s.tokens:  # tokens are sub-words; a leading space starts a new word
            if t.text.startswith(" ") or not ws:
                ws.append({"w": t.text.strip(), "s": t.start, "e": t.end})
            else:
                ws[-1]["w"] += t.text; ws[-1]["e"] = t.end
    res[c] = snap(c, ws)
json.dump(res, open(out_path, "w"))
