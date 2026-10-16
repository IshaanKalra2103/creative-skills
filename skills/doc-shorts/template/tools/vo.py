# /// script
# dependencies = ["httpx"]
# ///
"""Narration for a spec: one ElevenLabs take with character timestamps.

uv run tools/vo.py path/to/video.toml          # -> <dir>/audio/vo.wav + <dir>/build/words.json
uv run tools/vo.py path/to/video.toml --plan   # offline: estimated words.json, to block out cues before paying

The spec's [voice] table:
    text = "One simple idea changed the internet forever. ..."   # or lines = ["...", "..."]
    voice = "nPczCjzI2devNBz1zQrb"      # ElevenLabs voice id (default Brian: deep, resonant)
    model = "eleven_multilingual_v2"
    speed = 1.1                          # documentary shorts read fast; 1.05-1.15
    stability = 0.45, similarity = 0.8, style = 0.3
    lead = 0.0                           # seconds of silence before the first word
Shots cue on words (`cue = "Stanford"`), so a new take moves the cuts with it.
The take is cached in build/ by text+voice+settings. Key: $ELEVENLABS_API_KEY, else the macOS
Keychain item ELEVENLABS_API_KEY. It is never printed.
"""
import base64, hashlib, json, os, pathlib, re, subprocess, sys, tomllib


def key():
    if os.environ.get("ELEVENLABS_API_KEY"):
        return os.environ["ELEVENLABS_API_KEY"]
    r = subprocess.run(["security", "find-generic-password", "-s", "ELEVENLABS_API_KEY", "-w"], capture_output=True, text=True)
    if r.returncode:
        sys.exit("no ElevenLabs key: export ELEVENLABS_API_KEY or add it to the Keychain")
    return r.stdout.strip()


def words_from_alignment(a, lead):
    out, buf, s0, e0 = [], "", 0.0, 0.0
    for ch, s, e in zip(a["characters"], a["character_start_times_seconds"], a["character_end_times_seconds"]):
        if ch.isspace():
            if buf:
                out.append({"w": buf, "s": round(s0 + lead, 3), "e": round(e0 + lead, 3)})
                buf = ""
            continue
        if not buf:
            s0 = s
        buf += ch
        e0 = e
    if buf:
        out.append({"w": buf, "s": round(s0 + lead, 3), "e": round(e0 + lead, 3)})
    return out


def plan(text, lead, speed):
    """Rough timings (about 0.05 s + 0.048 s per letter at speed 1.15, pauses after punctuation)."""
    k = 1.15 / speed
    out, t = [], lead
    for w in text.split():
        d = (0.05 + 0.048 * len(re.sub(r"[^\w']", "", w))) * k
        out.append({"w": w, "s": round(t, 3), "e": round(t + d, 3)})
        t += d + (0.3 if w[-1] in ".?!" else 0.15 if w[-1] in ",;:" else 0.02) * k
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    spec = pathlib.Path(sys.argv[1]).resolve()
    d = spec.parent
    cfg = tomllib.loads(spec.read_text()).get("voice", {})
    text = cfg.get("text") or " ".join(cfg.get("lines", []))
    if not text:
        sys.exit("the spec needs [voice] text = \"...\" (or lines = [...])")
    voice = cfg.get("voice", "nPczCjzI2devNBz1zQrb")
    model = cfg.get("model", "eleven_multilingual_v2")
    speed = float(cfg.get("speed", 1.1))
    lead = float(cfg.get("lead", 0.0))
    settings = {"stability": cfg.get("stability", 0.45), "similarity_boost": cfg.get("similarity", 0.8),
                "style": cfg.get("style", 0.3), "use_speaker_boost": True, "speed": speed}
    (d / "build").mkdir(exist_ok=True)
    (d / "audio").mkdir(exist_ok=True)

    if "--plan" in sys.argv:
        words = plan(text, lead, speed)
        (d / "build/words.json").write_text(json.dumps(words, indent=0))
        print(json.dumps({"ok": True, "mode": "plan", "words": len(words), "est_end": words[-1]["e"]}))
        return

    import httpx
    h = hashlib.sha256(json.dumps([text, voice, model, settings]).encode()).hexdigest()[:16]
    mp3, meta = d / f"build/vo_take_{h}.mp3", d / f"build/vo_take_{h}.json"
    if not mp3.exists():
        r = httpx.post(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps",
                       params={"output_format": "mp3_44100_128"}, headers={"xi-api-key": key()},
                       json={"text": text, "model_id": model, "voice_settings": settings}, timeout=300)
        if r.status_code != 200:
            sys.exit(f"ElevenLabs {r.status_code}: {r.text[:400]}")
        j = r.json()
        mp3.write_bytes(base64.b64decode(j["audio_base64"]))
        meta.write_text(json.dumps(j["alignment"]))
    words = words_from_alignment(json.loads(meta.read_text()), lead)
    (d / "build/words.json").write_text(json.dumps(words, indent=0))
    # stereo 48 kHz wav, `lead` seconds of silence in front
    delay = int(lead * 1000)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp3), "-af", f"adelay={delay}:all=1", "-ac", "2", "-ar", "48000", str(d / "audio/vo.wav")], check=True)
    print(json.dumps({"ok": True, "out": str(d / "audio/vo.wav"), "words": len(words), "end": words[-1]["e"], "chars": len(text)}))


if __name__ == "__main__":
    main()
