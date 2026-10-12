# /// script
# dependencies = ["httpx"]
# ///
"""Voiceover from script.json: one ElevenLabs take, cut at line boundaries, each line laid at its target start time.

uv run vo.py plan     # offline: estimated word timings -> vo_words.js (block out the animation before paying for TTS)
uv run vo.py take     # one TTS take with character timestamps (cached by text+voice+settings) -> build/vo_take.{mp3,json}
uv run vo.py place    # cut the take into lines, lay each at max(target, previous end + 0.12) -> build/vo.wav + vo_words.js

script.json: {"voice": "<ElevenLabs voice id>", "model": "...", "settings": {...}, "end": <film length>,
              "lines": [[<target start s>, "<line>"], ...]}
Scenes anchor to words with W('word') / W('word', nth, after) (src/core.js), so re-placing the VO moves the animation with it.
Key: $ELEVENLABS_API_KEY, else the macOS Keychain item ELEVENLABS_API_KEY. It is never printed.
"""
import base64, hashlib, json, os, pathlib, re, subprocess, sys

HERE = pathlib.Path(__file__).resolve().parent
B = HERE / "build"
CFG = json.loads((HERE / "script.json").read_text())
LINES = [(float(t), s) for t, s in CFG["lines"]]
VOICE = CFG.get("voice", "EXAVITQu4vr4xnSDxMaL")
MODEL = CFG.get("model", "eleven_multilingual_v2")
SETTINGS = CFG.get("settings", {"stability": 0.4, "similarity_boost": 0.8, "style": 0.25, "use_speaker_boost": True, "speed": 1.15})
END = float(CFG["end"])


def key():
    if os.environ.get("ELEVENLABS_API_KEY"): return os.environ["ELEVENLABS_API_KEY"]
    r = subprocess.run(["security", "find-generic-password", "-s", "ELEVENLABS_API_KEY", "-w"], capture_output=True, text=True)
    if r.returncode: sys.exit("no ElevenLabs key: export ELEVENLABS_API_KEY or add it to the Keychain")
    return r.stdout.strip()


def write_words(placed):
    (B / "vo_words.json").write_text(json.dumps(placed, indent=0))
    (HERE / "vo_words.js").write_text("window.VO_WORDS = " + json.dumps(placed) + ";\n")


def plan():
    """Estimated timings, calibrated on a real ElevenLabs take at speed 1.15: 0.05 s + 0.048 s per letter, pauses after punctuation."""
    placed, cursor = [], 0.0
    for k, (target, text) in enumerate(LINES):
        t = start = max(target, cursor + 0.12)
        for w in text.split():
            d = 0.05 + 0.048 * len(re.sub(r"[^\w']", "", w))
            placed.append({"w": w, "s": round(t, 3), "e": round(t + d, 3), "line": k})
            t += d + (0.28 if w[-1] in ".?!" else 0.14 if w[-1] in ",;:" else 0.02)
        cursor = t
        print(f"L{k+1:02d} target {target:6.2f} start {start:6.2f} est end {t:6.2f}{'  DRIFT %+.2f' % (start - target) if start - target > 0.01 else ''}  {text}")
    write_words(placed)
    print(json.dumps({"ok": True, "mode": "plan", "out": str(HERE / "vo_words.js"), "words": len(placed)}))


def words_from_alignment(a):
    out, buf, s0, e0 = [], "", 0.0, 0.0
    for ch, s, e in zip(a["characters"], a["character_start_times_seconds"], a["character_end_times_seconds"]):
        if ch.isspace():
            if buf: out.append({"w": buf, "s": s0, "e": e0}); buf = ""
            continue
        if not buf: s0 = s
        buf += ch; e0 = e
    if buf: out.append({"w": buf, "s": s0, "e": e0})
    return out


def take():
    import httpx
    text = " ".join(t for _, t in LINES)
    h = hashlib.sha256(json.dumps([text, VOICE, MODEL, SETTINGS]).encode()).hexdigest()[:16]
    mp3, meta = B / f"vo_take_{h}.mp3", B / f"vo_take_{h}.json"
    if not mp3.exists():
        r = httpx.post(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps",
                       params={"output_format": "mp3_44100_128"}, headers={"xi-api-key": key()},
                       json={"text": text, "model_id": MODEL, "voice_settings": SETTINGS}, timeout=300)
        if r.status_code != 200:
            sys.exit(f"ElevenLabs {r.status_code}: {r.text[:400]}")
        d = r.json()
        mp3.write_bytes(base64.b64decode(d["audio_base64"]))
        meta.write_text(json.dumps({"text": text, "words": words_from_alignment(d["alignment"])}))
    for p, q in ((mp3, B / "vo_take.mp3"), (meta, B / "vo_take.json")):
        q.unlink(missing_ok=True); q.symlink_to(p.name)
    print(json.dumps({"ok": True, "chars": len(text), "take": str(mp3)}))


def place():
    words = json.loads((B / "vo_take.json").read_text())["words"]
    i, segs = 0, []
    for target, text in LINES:
        n = len(text.split()); segs.append((target, words[i:i + n])); i += n
    assert i == len(words), f"word count mismatch: script {i} vs take {len(words)} (hyphens/numbers split differently?)"
    parts, placed, cursor = [], [], 0.0
    for k, (target, ws) in enumerate(segs):
        a = max(0.0, ws[0]["s"] - 0.06)
        b = (ws[-1]["e"] + segs[k + 1][1][0]["s"]) / 2 if k + 1 < len(segs) else ws[-1]["e"] + 0.5
        b = min(b, ws[-1]["e"] + 0.18)
        start = max(target, cursor + 0.12)
        parts.append((a, b, start))
        for w in ws:
            placed.append({"w": w["w"], "s": round(w["s"] - a + start, 3), "e": round(w["e"] - a + start, 3), "line": k})
        cursor = start + (b - a)
        drift = start - target
        print(f"L{k+1:02d} target {target:6.2f} start {start:6.2f} dur {b-a:5.2f} end {cursor:6.2f}"
              f"{'  DRIFT %+.2f (line runs long: shorten it or raise speed)' % drift if abs(drift) > 0.01 else ''}  {' '.join(w['w'] for w in ws)}")
    fl = [f"[0:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={b-a-0.04:.3f}:d=0.04,"
          f"adelay={int(s*1000)}|{int(s*1000)}[l{k}]" for k, (a, b, s) in enumerate(parts)]
    fl.append("".join(f"[l{k}]" for k in range(len(parts))) + f"amix=inputs={len(parts)}:normalize=0,apad=whole_dur={END}[out]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(B / "vo_take.mp3"), "-filter_complex", ";".join(fl), "-map", "[out]",
                    "-ar", "48000", "-ac", "2", "-t", str(END), str(B / "vo.wav")], check=True)
    write_words(placed)
    print(json.dumps({"ok": True, "out": str(B / "vo.wav"), "words": len(placed)}))


if __name__ == "__main__":
    B.mkdir(exist_ok=True)
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd not in ("plan", "take", "place"): sys.exit(__doc__)
    {"plan": plan, "take": take, "place": place}[cmd]()
