"""Generate the score and sound effects for The Lantern Ghost with ElevenLabs.

usage: uv run gen.py plan | score [take] | sfx [name ...] | all
Files that already exist are skipped, so a rerun never re-spends credits.
Every call's billed cost (the character-cost header) is appended to costs.jsonl.

Template note: the cue data here is The Lantern Ghost's. For a new film, replace CHUNKS (score sections) and SFX
from your own cue sheet; keep the rest.
"""
import json, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import httpx

HERE = Path(__file__).parent
SFX_DIR = HERE / "sfx"; SFX_DIR.mkdir(exist_ok=True)
API = "https://api.elevenlabs.io/v1"


def key():
    return subprocess.run(["security", "find-generic-password", "-s", "ELEVENLABS_API_KEY", "-w"],
                          capture_output=True, text=True, check=True).stdout.strip()


def log_cost(kind, name, r):
    rec = {"t": time.strftime("%H:%M:%S"), "kind": kind, "name": name, "status": r.status_code,
           "cost": r.headers.get("character-cost"), "song_id": r.headers.get("song-id")}
    with open(HERE / "costs.jsonl", "a") as f: f.write(json.dumps(rec) + "\n")
    print(rec, flush=True)


# ---------------- score ----------------
# One chunk per story section, cut on the shot boundaries (STORY.md). 61.5 s total.
NEG = ["vocals", "lyrics", "sung words", "rap", "pop", "electronic beat", "synth bass", "drum kit", "edm", "trap",
       "horror", "scary"]
STYLE = ["cinematic orchestral film score", "Japanese hand-drawn animated feature soundtrack", "gentle and magical",
         "small acoustic chamber orchestra", "intimate warm recording", "great production quality"]
CHUNKS = [
    ("[Before Dawn] {music box and piano, very sparse}", 11.0,
     STYLE + ["solo felt piano, a few slow notes", "music-box celesta answers softly", "high violin harmonics held",
              "hushed blue stillness before dawn", "pianissimo", "66 BPM", "A minor"]),
    ("[The Pool] {curious, almost silent}", 8.5,
     ["single low cello drone", "a few curious celesta and harp notes", "a soft bass clarinet phrase",
      "mysterious but kind, not scary", "very quiet", "A minor"]),
    ("[Rising] {buoyant, hesitant}", 7.5,
     ["clarinet and flute rise in a light hesitant figure", "harp glissando upward", "pizzicato strings",
      "weightless, floating, a little playful", "pianissimo to piano", "A minor turning to C major"]),
    ("[The Flower] {the theme, first time}", 9.5,
     ["solo oboe plays a simple tender theme", "harp arpeggios", "warm strings enter softly underneath",
      "a small gentle swell at the end as a light kindles", "piano to mezzo piano", "C major"]),
    ("[Down the Hill] {flowing waltz}", 12.0,
     ["the theme on violins and piano in a flowing 3/4 waltz", "glockenspiel sparkles", "woodwinds dancing",
      "growing warmth and momentum", "crescendo", "C major"]),
    ("[Release] {full swell as the sun rises}", 6.5,
     ["full orchestra swells to fortissimo", "soaring violins carry the theme", "wordless choir", "french horns",
      "cymbal swell", "radiant, overwhelming, bittersweet joy", "C major"]),
    ("[Morning] {solo piano, fading}", 6.5,
     ["solo piano plays the theme softly once", "soft strings hold underneath", "peaceful and bittersweet",
      "final chord rings out and fades to silence", "pianissimo", "C major"]),
]


def plan():
    chunks = []
    for i, (text, dur, pos) in enumerate(CHUNKS):
        chunks.append({"text": text, "duration_ms": int(round(dur * 1000)), "positive_styles": pos,
                       "negative_styles": NEG + (["loud", "drums", "percussion"] if i in (0, 1, 2, 3, 6) else []),
                       "context_adherence": "high" if i not in (1,) else "medium"})
    return {"chunks": chunks}


def gen_score(take=1, seed=None):
    out = HERE / f"score_t{take}.mp3"
    if out.exists(): print("skip", out.name); return
    body = {"composition_plan": plan(), "model_id": "music_v2_5"}
    if seed is not None: body["seed"] = seed
    for fmt in ("mp3_48000_192", "mp3_44100_128"):
        r = httpx.post(f"{API}/music", params={"output_format": fmt}, headers={"xi-api-key": key()},
                       json=body, timeout=600)
        log_cost("music", out.name + ":" + fmt, r)
        if r.status_code == 200:
            out.write_bytes(r.content); print("wrote", out, len(r.content)); return
        print(r.text[:800])
        if "format" not in r.text.lower() and "tier" not in r.text.lower(): break


# ---------------- sound effects ----------------
# name: (prompt, seconds, loop, prompt_influence). Times in the comments are film seconds (where it lands in mix.py).
# The ghost itself is weightless: no impacts, no whooshes on its body, only liquid, glass and flame.
SFX = {
    # 0-19.5 grey hour
    "predawn_bed": ("Very quiet countryside before dawn: a few distant crickets, faint far-off stream, the softest breeze, deep stillness, calm field recording", 22, True, 0.4),  # 0-36
    "dew_drop": ("A single small water droplet falls and lands on a stone with a tiny clear resonant plip, very close and quiet", 1.5, False, 0.6),  # 3.2
    "temple_bell": ("One soft strike of a large temple bell far away across a valley, long warm decay into silence", 5.0, False, 0.5),  # 6.0
    "pool_ripple": ("A dark still pool of liquid ripples once: a soft deep bloop and gentle lapping rings, intimate and quiet", 2.5, False, 0.5),  # 12.3
    "mote_rise": ("A tiny glassy magical shimmer slowly rising in pitch, delicate and airy, like a firefly of light", 2.5, False, 0.5),  # 13.3
    "blink_twinkle": ("A tiny soft high twinkle, a single delicate glass chime, very quiet", 1.0, False, 0.6),  # 17.0, 18.0
    # 19.5-27 rise
    "ghost_rise": ("Thick dark liquid slowly stretching and pulling upward out of a pool, soft viscous gloopy stretch, syrupy and quiet, no impact", 4.0, False, 0.5),  # 20.6
    "strand_snap": ("A soft elastic snap of a thick syrup strand breaking with a light wet pop, then small drips", 1.5, False, 0.6),  # 22.7
    "drips": ("A few heavy liquid drops fall one by one into a dark pool, soft plops and small ripples", 3.0, False, 0.5),  # 22.9
    # 27-36.5 flower and kindle
    "flower_bloom": ("A delicate flower bud unfurling with a soft papery rustle, with a gentle rising magical chime shimmer", 3.0, False, 0.5),  # 28.7
    "kindle": ("A small candle wick catching flame in three soft steps: tiny puffs of ignition, then a warm gentle flicker", 3.0, False, 0.6),  # 32.9
    # 36.5-48.5 descent and village
    "wake_shimmer": ("A warm magical shimmer sweeping gently past, grass and leaves rustling in a soft breeze as morning arrives", 7.0, False, 0.5),  # 36.6
    "birds_wake": ("Morning songbirds waking up one by one in the countryside, first a single bird, then a few more joining, gentle and sparse", 9.0, False, 0.45),  # 38-48
    "lantern_light": ("A small paper lantern lighting: a soft candle catch and a brief warm flicker, very close and gentle", 1.5, False, 0.6),  # 44.2 45.6 46.9 48.2
    # 48.5-55 release
    "release_gust": ("A huge soft gust of warm wind carrying thousands of flower petals, a sparkling magical shimmer rushing outward across a wide valley and away into the distance", 6.0, False, 0.5),  # 49.9
    "petals_flutter": ("Many flower petals fluttering and tumbling through the air close by, soft papery flutters", 4.0, False, 0.5),  # 50.2
    # 55-61.5 coda
    "morning_bed": ("Bright peaceful early morning countryside: birdsong, a gentle breeze in grass, a distant stream, warm and calm field recording", 14.0, True, 0.4),  # 48.5-61.5
    "flame_coda": ("A small candle flame flickering softly inside a stone lantern, a gentle breeze, very close and quiet", 6.0, False, 0.5),  # 55
}


def gen_sfx_one(name):
    out = SFX_DIR / f"{name}.mp3"
    if out.exists(): print("skip", out.name); return
    prompt, dur, loop, infl = SFX[name]
    body = {"text": prompt, "duration_seconds": dur, "prompt_influence": infl, "model_id": "eleven_text_to_sound_v2"}
    if loop: body["loop"] = True
    for attempt in range(3):
        r = httpx.post(f"{API}/sound-generation", params={"output_format": "mp3_44100_128"},
                       headers={"xi-api-key": key()}, json=body, timeout=180)
        log_cost("sfx", name, r)
        if r.status_code == 200: out.write_bytes(r.content); return
        print(name, r.status_code, r.text[:400])
        if r.status_code != 429: return
        time.sleep(5 * (attempt + 1))


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "plan"
    if what in ("score", "all"):
        gen_score(int(sys.argv[2]) if what == "score" and len(sys.argv) > 2 else 1)
    if what in ("sfx", "all"):
        names = sys.argv[2:] if what == "sfx" and len(sys.argv) > 2 else list(SFX)
        with ThreadPoolExecutor(3) as ex: list(ex.map(gen_sfx_one, names))
    if what == "plan":
        print("score s", sum(c[1] for c in CHUNKS), "| sfx s", sum(v[1] for v in SFX.values()), "| sfx est credits", int(10 * sum(v[1] for v in SFX.values())))
