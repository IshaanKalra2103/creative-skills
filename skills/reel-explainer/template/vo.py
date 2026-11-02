# /// script
# dependencies = ["httpx"]
# ///
"""Voiceover for the reel from script.json, plus the word timings that the caption and the scenes hang off.

uv run vo.py plan     # free, offline: estimated word timings -> vo_words.js (block out scenes before paying for TTS)
uv run vo.py say      # free draft voice (macOS `say`, one clip per line, words spread by length) -> build/vo.wav + vo_words.js
uv run vo.py take     # one ElevenLabs take with character timestamps (cached by text+voice+settings) -> build/vo_take.{mp3,json}
uv run vo.py place    # cut the take into lines, lay each at max(target, previous end + 0.12) -> build/vo.wav + vo_words.js
uv run vo.py kokoro [--voice af_heart] [--speed 1.0]
                      # FREE local voice: Kokoro-82M, one clip per line (cached by text+voice+speed), placed like the others,
                      # then Parakeet word timings (align) -> build/vo.wav + vo_words.js. Voices: af_heart af_bella am_michael am_puck bf_emma bm_george ...
uv run vo.py align [kokoro|say|take]
                      # real word timings from NVIDIA Parakeet (mlx) for existing clips: free `say` drafts, Kokoro clips, or the ElevenLabs take.
                      # Rewrites build/vo.wav + vo_words.js. Default: kokoro clips if cached, else say. Accepts --voice/--speed to pick the kokoro clips.
Helpers (own PEP 723 envs, run via `uv run`): tts_kokoro.py (python<3.13), align_parakeet.py (parakeet-mlx). First run downloads ~1.5 GB of wheels + the
Parakeet model (~2.4 GB) + spaCy en_core_web_sm; later runs are cached.

script.json: {"voice": "<ElevenLabs voice id>", "model": "...", "settings": {...}, "say_voice": "Samantha", "say_rate": 195,
              "lines": [[<target start s>, "Your screen ignores a *pen* pressed hard."], ...]}
One line = one caption. Wrap the line's keyword in *asterisks*: the caption boxes it. Asterisks never reach the voice.
Keep every word one token with no inner spaces ("T-I-M", "120", "4.5") so script words and TTS words line up 1:1.
Writes window.VO_WORDS = [{w, s, e, line, k}] (k = keyword) and window.VO_END = last word + 1.6 s (the reel's length when FILM.dur is 'auto').
Key: $ELEVENLABS_API_KEY, else the macOS Keychain item ELEVENLABS_API_KEY. It is never printed.
"""
import base64, difflib, hashlib, json, os, pathlib, re, subprocess, sys

HERE = pathlib.Path(__file__).resolve().parent
B = HERE / "build"
CFG = json.loads((HERE / "script.json").read_text())
RAW = [(float(l[0]), l[1]) for l in CFG["lines"]]
LINES = [(t, s.replace("*", "")) for t, s in RAW]
VOICE = CFG.get("voice", "EXAVITQu4vr4xnSDxMaL")
MODEL = CFG.get("model", "eleven_multilingual_v2")
SETTINGS = CFG.get("settings", {"stability": 0.4, "similarity_boost": 0.8, "style": 0.25, "use_speaker_boost": True, "speed": 1.1})
TAIL = 1.6


def keyflags(s):
    """Which tokens of a line sit inside *...* (a keyword may span several words)."""
    out, inside = [], False
    for w in s.split():
        out.append(inside or "*" in w)
        if w.count("*") % 2: inside = not inside
    return out


KEYS = [keyflags(s) for _, s in RAW]


def key():
    if os.environ.get("ELEVENLABS_API_KEY"): return os.environ["ELEVENLABS_API_KEY"]
    r = subprocess.run(["security", "find-generic-password", "-s", "ELEVENLABS_API_KEY", "-w"], capture_output=True, text=True)
    if r.returncode: sys.exit("no ElevenLabs key: export ELEVENLABS_API_KEY or add it to the Keychain (or draft with `vo.py say`)")
    return r.stdout.strip()


def write_words(placed):
    for w in placed: w["k"] = int(KEYS[w["line"]][w.pop("i")])
    end = round(max(float(CFG.get("end", 0)), placed[-1]["e"] + TAIL), 2)
    (B / "vo_words.json").write_text(json.dumps(placed, indent=0))
    (HERE / "vo_words.js").write_text(f"window.VO_WORDS = {json.dumps(placed)};\nwindow.VO_END = {end};\n")
    return end


def report(k, target, start, end, text):
    drift = start - target
    print(f"L{k+1:02d} target {target:6.2f} start {start:6.2f} end {end:6.2f}"
          f"{'  DRIFT %+.2f (the line before runs long)' % drift if drift > 0.01 else ''}  {text}")


def est(text, t0=0.0):
    """Estimated word timings for one line from t0: 0.05 s + 0.048 s per letter, pauses after punctuation
    (calibrated on an ElevenLabs take at speed ~1.1). Returns (words, end of last word)."""
    out, t = [], t0
    for i, w in enumerate(text.split()):
        d = 0.05 + 0.048 * len(re.sub(r"[^\w']", "", w))
        out.append({"w": w, "s": t, "e": t + d, "i": i})
        t += d + (0.28 if w[-1] in ".?!" else 0.14 if w[-1] in ",;:" else 0.02)
    return out, out[-1]["e"]


def plan():
    placed, cursor = [], 0.0
    for k, (target, text) in enumerate(LINES):
        start = max(target, cursor + 0.12)
        ws, cursor = est(text, start)
        placed += [{**w, "s": round(w["s"], 3), "e": round(w["e"], 3), "line": k} for w in ws]
        report(k, target, start, cursor, text)
    end = write_words(placed)
    print(json.dumps({"ok": True, "mode": "plan", "words": len(placed), "end": end}))


def mix_clips(parts, end):
    """parts: [(audio file, start s, trim_from s, trim_to s or None)] -> build/vo.wav, each clip laid at its start."""
    ins, fl = [], []
    for i, (f, s, a, b) in enumerate(parts):
        ins += ["-i", str(f)]
        trim = f"atrim={a:.3f}:{b:.3f}," if b is not None else ""
        out = f"afade=t=out:st={b - a - 0.04:.3f}:d=0.04," if b is not None else ""
        fl.append(f"[{i}:a]aresample=48000,{trim}asetpts=PTS-STARTPTS,afade=t=in:d=0.02,{out}adelay=delays={int(s*1000)}:all=1[l{i}]")
    fl.append("".join(f"[l{i}]" for i in range(len(parts))) + f"amix=inputs={len(parts)}:normalize=0,apad=whole_dur={end}[out]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fl), "-map", "[out]",
                    "-ar", "48000", "-ac", "2", "-t", str(end), str(B / "vo.wav")], check=True)


def say():
    """Free draft voice: one `say` clip per line; word times = the estimator stretched to the clip's real length."""
    voice, rate = CFG.get("say_voice", "Samantha"), str(CFG.get("say_rate", 195))
    placed, parts, cursor = [], [], 0.0
    for k, (target, text) in enumerate(LINES):
        clip = B / f"say_{k:02d}.aiff"
        subprocess.run(["say", "-v", voice, "-r", rate, "-o", str(clip), text], check=True)
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(clip)],
                                   capture_output=True, text=True, check=True).stdout)
        start = max(target, cursor + 0.12)
        ws, last = est(text)
        k_ = max(dur - 0.1, 0.2) / last  # `say` starts at once and leaves ~0.1 s of tail
        placed += [{**w, "s": round(start + w["s"] * k_, 3), "e": round(start + w["e"] * k_, 3), "line": k} for w in ws]
        parts.append((clip, start, 0.0, None)); cursor = start + dur
        report(k, target, start, cursor, text)
    end = write_words(placed)
    mix_clips(parts, end)
    print(json.dumps({"ok": True, "mode": "say", "out": str(B / "vo.wav"), "words": len(placed), "end": end}))


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


def place(words=None, mode="place"):
    words = words or json.loads((B / "vo_take.json").read_text())["words"]
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
        parts.append((B / "vo_take.mp3", start, a, b))
        placed += [{"w": w["w"], "s": round(w["s"] - a + start, 3), "e": round(w["e"] - a + start, 3), "line": k, "i": j} for j, w in enumerate(ws)]
        cursor = start + (b - a)
        report(k, target, start, cursor, " ".join(w["w"] for w in ws))
    end = write_words(placed)
    mix_clips(parts, end)
    print(json.dumps({"ok": True, "mode": mode, "out": str(B / "vo.wav"), "words": len(placed), "end": end}))


# ---------- Kokoro (local TTS) + Parakeet (local word timings) ----------
ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def spoken(n):
    """int -> English words ('120' -> 'one hundred twenty'; 1100-2099 read as years, 2013 -> 'twenty thirteen')."""
    if n < 20: return ONES[n]
    if n < 100: return TENS[n // 10] + ("" if n % 10 == 0 else " " + ONES[n % 10])
    if n < 1000: return ONES[n // 100] + " hundred" + ("" if n % 100 == 0 else " " + spoken(n % 100))
    if 1100 <= n <= 2099 and not 2000 <= n <= 2009 and n % 100:
        return spoken(n // 100) + " " + (("oh " + ONES[n % 100]) if n % 100 < 10 else spoken(n % 100))
    if n < 1000000: return spoken(n // 1000) + " thousand" + ("" if n % 1000 == 0 else " " + spoken(n % 1000))
    return str(n)


def subtokens(w):
    """One script/ASR word -> normalised comparable tokens (lowercase, no punctuation, digits spelled out, '4.5' -> 'four point five')."""
    w = w.lower().replace("%", " percent").replace("&", " and ")
    out = []
    for part in re.findall(r"\d+(?:\.\d+)?|[a-z']+", w.replace("\u2019", "'")):
        if part[0].isdigit():
            ip, _, fp = part.partition(".")
            out += spoken(int(ip)).split() + (["point"] + [ONES[int(d)] for d in fp] if fp else [])
        else:
            out.append(part.replace("'", ""))
    return [t for t in out if t]


def align_line(script_words, asr):
    """script_words: [str]; asr: [{w,s,e}] from Parakeet. Needleman-Wunsch over normalised sub-tokens, then one {w,s,e} per script word;
    script words that matched nothing are interpolated between their matched neighbours."""
    a = [(i, t) for i, w in enumerate(script_words) for t in subtokens(w)]
    b = [(j, t) for j, x in enumerate(asr) for t in subtokens(x["w"])]
    n, m = len(a), len(b)

    def sc(x, y):
        if x == y: return 2
        return 1 if difflib.SequenceMatcher(None, x, y).ratio() >= 0.75 else -1
    G = -1
    D = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1): D[i][0] = i * G
    for j in range(1, m + 1): D[0][j] = j * G
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            D[i][j] = max(D[i-1][j-1] + sc(a[i-1][1], b[j-1][1]), D[i-1][j] + G, D[i][j-1] + G)
    hits, i, j = {}, n, m  # script word index -> [asr word indices]
    while i > 0 and j > 0:
        if D[i][j] == D[i-1][j-1] + sc(a[i-1][1], b[j-1][1]):
            if sc(a[i-1][1], b[j-1][1]) > 0: hits.setdefault(a[i-1][0], []).append(b[j-1][0])
            i -= 1; j -= 1
        elif D[i][j] == D[i-1][j] + G: i -= 1
        else: j -= 1
    out = [None] * len(script_words)
    for k, js in hits.items(): out[k] = [min(asr[x]["s"] for x in js), max(asr[x]["e"] for x in js)]
    k = 0
    while k < len(out):  # interpolate runs of unmatched words
        if out[k] is not None: k += 1; continue
        r = k
        while r < len(out) and out[r] is None: r += 1
        wt = [0.05 + 0.048 * len(re.sub(r"\W", "", script_words[x])) for x in range(k, r)]
        lo = out[k-1][1] if k else None
        hi = out[r][0] if r < len(out) else None
        if lo is None and hi is None: lo, hi = asr[0]["s"], asr[-1]["e"]
        elif lo is None: lo = max(0.0, hi - sum(wt))
        elif hi is None: hi = lo + sum(wt)
        t = lo
        for x, d in zip(range(k, r), wt):
            d = (hi - lo) * d / sum(wt); out[x] = [t, t + d]; t += d
        k = r
    return [{"w": w, "s": o[0], "e": o[1]} for w, o in zip(script_words, out)]


def uvrun(script, *args):
    r = subprocess.run(["uv", "run", str(HERE / script), *map(str, args)], stderr=subprocess.PIPE, text=True)
    if r.returncode: sys.exit(f"{script} failed:\n{r.stderr[-1500:]}")
    return r.stderr


def parakeet(clips):
    """{clip path: [{w,s,e}]} - cached by the audio's sha1, so each clip is transcribed once."""
    res, todo = {}, []
    for c in clips:
        cache = B / f"asr_{hashlib.sha1(pathlib.Path(c).read_bytes()).hexdigest()[:16]}.json"
        if cache.exists(): res[str(c)] = json.loads(cache.read_text())
        else: todo.append((c, cache))
    if todo:
        out = B / "_asr.json"
        uvrun("align_parakeet.py", out, *[c for c, _ in todo])
        got = json.loads(out.read_text()); out.unlink()
        for c, cache in todo:
            res[str(c)] = got[str(c)]; cache.write_text(json.dumps(got[str(c)]))
    return res


def flag(name, default):
    return type(default)(sys.argv[sys.argv.index(name) + 1]) if name in sys.argv else default


def kokoro_clips():
    voice, speed = flag("--voice", "af_heart"), flag("--speed", 1.0)
    return [B / f"kokoro_{hashlib.sha256(json.dumps([t, voice, speed]).encode()).hexdigest()[:16]}.wav" for _, t in LINES], voice, speed


def duration(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)],
                                capture_output=True, text=True, check=True).stdout)


def lay_clips(clips, mode):
    """One clip per line -> Parakeet word times -> placed at max(target, previous end + 0.12), voice onset trimmed to ~0.06 s before the
    first word -> build/vo.wav + vo_words.js (same placement/drift report as `place`)."""
    asr = parakeet(clips)
    placed, parts, cursor = [], [], 0.0
    for k, ((target, text), clip) in enumerate(zip(LINES, clips)):
        ws = align_line(text.split(), asr[str(clip)])
        dur = duration(clip)
        a = max(0.0, ws[0]["s"] - 0.06)
        b = min(dur, ws[-1]["e"] + 0.25)
        start = max(target, cursor + 0.12)
        parts.append((clip, start, a, b if b < dur else None))
        placed += [{"w": w["w"], "s": round(w["s"] - a + start, 3), "e": round(w["e"] - a + start, 3), "line": k, "i": j} for j, w in enumerate(ws)]
        cursor = start + (min(b, dur) - a)
        report(k, target, start, cursor, text)
    end = write_words(placed)
    mix_clips(parts, end)
    print(json.dumps({"ok": True, "mode": mode, "out": str(B / "vo.wav"), "words": len(placed), "end": end}))


def kokoro():
    clips, voice, speed = kokoro_clips()
    todo = [{"text": t, "out": str(c)} for (_, t), c in zip(LINES, clips) if not c.exists()]
    if todo:
        (B / "_kokoro_jobs.json").write_text(json.dumps(todo))
        log = uvrun("tts_kokoro.py", B / "_kokoro_jobs.json", "--voice", voice, "--speed", speed)
        print("\n".join(l for l in log.splitlines() if " audio in " in l))
        (B / "_kokoro_jobs.json").unlink()
    lay_clips(clips, "kokoro")


def align_cmd():
    src = next((a for a in sys.argv[2:] if a in ("kokoro", "say", "take")), None)
    clips, _, _ = kokoro_clips()
    if src is None: src = "kokoro" if all(c.exists() for c in clips) else "say"
    if src == "kokoro":
        miss = [c.name for c in clips if not c.exists()]
        if miss: sys.exit(f"no kokoro clips for this voice/speed yet ({len(miss)} missing): run `vo.py kokoro` first")
        return lay_clips(clips, "align-kokoro")
    if src == "say":
        say_clips = [B / f"say_{k:02d}.aiff" for k in range(len(LINES))]
        if not all(c.exists() for c in say_clips): sys.exit("no say clips: run `vo.py say` first")
        return lay_clips(say_clips, "align-say")
    take_mp3 = B / "vo_take.mp3"  # the whole ElevenLabs take, aligned against the script words of all lines at once
    if not take_mp3.exists(): sys.exit("no ElevenLabs take: run `vo.py take` first")
    flat = [w for _, t in LINES for w in t.split()]
    words = align_line(flat, parakeet([take_mp3])[str(take_mp3)])
    place(words, "align-take")


if __name__ == "__main__":
    B.mkdir(exist_ok=True)
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    fns = {"plan": plan, "say": say, "take": take, "place": place, "kokoro": kokoro, "align": align_cmd}
    if cmd not in fns: sys.exit(__doc__)
    fns[cmd]()
