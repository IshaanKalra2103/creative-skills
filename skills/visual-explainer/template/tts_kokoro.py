# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["kokoro>=0.9.4", "misaki[en]", "soundfile", "numpy"]
# ///
"""Local Kokoro-82M TTS. Called by vo.py; not meant to be run by hand.
uv run tts_kokoro.py jobs.json [--voice af_heart] [--speed 1.0]
jobs.json = [{"text": "...", "out": "/path/clip.wav"}, ...]  -> 24 kHz mono wavs. Model loads once for all jobs."""
import argparse, json, sys, time
import numpy as np, soundfile as sf

ap = argparse.ArgumentParser()
ap.add_argument("jobs"); ap.add_argument("--voice", default="af_heart"); ap.add_argument("--speed", type=float, default=1.0)
a = ap.parse_args()
from kokoro import KPipeline
# 'a' = American English, 'b' = British English (voice prefix af_/am_ vs bf_/bm_)
pipe = KPipeline(lang_code="b" if a.voice[0] == "b" else "a", repo_id="hexgrad/Kokoro-82M")
for j in json.load(open(a.jobs)):
    t0 = time.time()
    chunks = [np.asarray(au) for _, _, au in pipe(j["text"], voice=a.voice, speed=a.speed, split_pattern=r"\n+") if au is not None]
    audio = np.concatenate(chunks)
    sf.write(j["out"], audio, 24000)
    print(f"{len(audio)/24000:5.2f}s audio in {time.time()-t0:4.1f}s  {j['text'][:50]}", file=sys.stderr)
