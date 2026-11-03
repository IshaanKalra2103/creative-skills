"""Generate the score and sound effects with ElevenLabs.

usage: uv run gen.py score | sfx [name ...] | all
Files that already exist are skipped, so a rerun never re-spends credits.
Every call's billed cost (the character-cost header) is appended to costs.jsonl.
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
# One chunk per story beat, cut on the shot boundaries (seconds from guardian.html SHOTS).
NEG = ["vocals", "lyrics", "sung words", "rap", "pop", "electronic beat", "synth bass", "drum kit", "edm", "trap"]
STYLE = ["cinematic orchestral film score", "Japanese animated feature film soundtrack", "pastoral and tender",
         "hand-played acoustic orchestra", "intimate warm recording", "great production quality"]
CHUNKS = [
    ("[Dawn] {solo piano, very sparse}", 8.0,
     STYLE + ["solo felt piano, slow and sparse", "soft high violins holding a quiet chord", "hushed, pianissimo",
              "morning stillness", "76 BPM", "D major"]),
    ("[The Bird] {flute melody enters}", 6.0,
     ["wooden flute plays a light curious melody", "harp arpeggios", "pizzicato strings", "gentle and playful",
      "pianissimo", "76 BPM", "D major"]),
    ("[First Light] {strings swell}", 5.5,
     ["warm string section swells", "piano carries a simple heartfelt theme", "golden, hopeful", "mezzo piano",
      "76 BPM", "D major"]),
    ("[Heartbeat] {music drops away}", 4.5,
     ["almost silent", "single low cello drone", "a few soft celesta notes", "mysterious, holding breath",
      "very quiet", "B minor"]),
    ("[Tremor] {tension rises}", 6.7,
     ["low timpani roll", "tremolo cellos and basses", "rising tension", "dark and ominous", "crescendo",
      "B minor"]),
    ("[The Rise] {colossal build}", 9.5,
     ["french horns in unison", "wordless choir", "full low strings", "slow massive build", "awe and wonder",
      "big orchestral swell", "crescendo to forte", "D major"]),
    ("[Look Up] {suspended awe}", 7.6,
     ["sustained shimmering string chord", "soft wordless choir pad", "glockenspiel sparkles", "suspended, wondrous",
      "held breath before something great", "mezzo forte", "D major"]),
    ("[Ignition] {driving ostinato}", 8.0,
     ["driving staccato string ostinato", "orchestral percussion and taiko building", "brass stabs",
      "urgent and exciting", "accelerating energy", "crescendo", "D major"]),
    ("[Flight] {the theme soars}", 7.4,
     ["full orchestra fortissimo", "soaring violins carry the main theme", "triumphant french horns", "choir",
      "cymbal swells", "joyful and free", "D major"]),
    ("[After] {solo piano, gentle ending}", 12.0,
     ["solo piano plays the theme softly", "soft strings underneath", "peaceful and bittersweet",
      "slowing down", "final chord rings out and fades to silence", "pianissimo", "D major"]),
]


def plan():
    chunks = []
    for i, (text, dur, pos) in enumerate(CHUNKS):
        chunks.append({"text": text, "duration_ms": int(round(dur * 1000)), "positive_styles": pos,
                       "negative_styles": NEG + (["loud", "drums"] if i in (0, 1, 3, 9) else []),
                       "context_adherence": "high" if i not in (3,) else "medium"})
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
# name: (prompt, seconds, loop, prompt_influence)
SFX = {
    "forest_bed": ("Peaceful early morning forest ambience, distant songbirds, soft breeze in the leaves, faint insects, calm natural field recording", 22, True, 0.4),
    "bird_flight": ("A small songbird flies in close with quick bursts of fluttering wing flaps, then flares its wings and lands softly on a mossy stone surface", 3.0, False, 0.6),
    "bird_chirps": ("A small songbird perched very close gives a few soft short chirps and tweets", 3.0, False, 0.5),
    "sun_glint": ("A soft magical shimmer, a delicate glassy glint of sunlight, gentle twinkle", 2.5, False, 0.5),
    "core_flicker": ("An ancient dormant machine sputters to life: faint electrical crackles and a flickering buzz, then a warm low hum swells and settles into a steady soft pulse", 4.0, False, 0.6),
    "ground_rumble": ("Deep earth rumble, the ground trembling, small pebbles rattling and hopping on soil, low and heavy", 5.0, False, 0.5),
    "stone_fingers": ("Huge stone fingers slowly dig into soft soil, grinding crunching earth, ancient metal creaking under strain", 3.5, False, 0.5),
    "flock_burst": ("A large flock of birds bursts out of the treetops all at once, many wings flapping loudly, alarmed bird calls, leaves rustling", 4.0, False, 0.6),
    "robot_rise": ("A colossal ancient robot slowly rises from the forest floor: deep groaning metal, giant creaking joints, roots and soil tearing, dirt and debris falling, massive and slow", 10.0, False, 0.5),
    "giant_thud": ("A single massive heavy footstep on soft earth, a deep boom, the ground shaking, debris settling", 2.5, False, 0.6),
    "debris_fall": ("Clumps of soil, pebbles and leaves falling and pattering onto the forest floor", 5.0, False, 0.5),
    "head_servo": ("Slow heavy mechanical servo whir and creak as a giant old robot head lifts, rusty metal, hydraulics", 3.0, False, 0.5),
    "eyes_on": ("An electrical flicker, then a bright clean power-on tone as glowing lights switch on, soft sci-fi", 2.0, False, 0.6),
    "jet_cough": ("A single rocket engine cough and sputter, a short burst of flame and smoke that dies out", 1.2, False, 0.6),
    "jet_ignite": ("Rocket thrusters ignite and catch, building into a powerful sustained roaring blast, dust and leaves blown away", 6.5, False, 0.6),
    "wind_ring": ("A huge gust of wind rushes outward across a forest canopy, leaves and branches thrashing and whooshing, rolling away into the distance", 4.0, False, 0.5),
    "liftoff": ("Explosive rocket lift-off, a deep boom and blast, debris thrown, a heavy object tearing up through tree branches", 3.0, False, 0.6),
    "flyby": ("A rocket-powered object streaks upward and away into the sky, a roaring whoosh fading into the distance", 5.0, False, 0.5),
    "sky_wind": ("High altitude wind above the clouds, airy and open, soft rushing air", 8.0, False, 0.4),
    "leaf_land": ("A single dry leaf softly lands on soil, a tiny delicate rustle, very quiet and close", 1.5, False, 0.5),
    "after_bed": ("A quiet forest clearing: soft crackle of smouldering embers, a gentle breeze, songbirds slowly returning, peaceful", 12.0, False, 0.4),
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
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what in ("score", "all"):
        gen_score(int(sys.argv[2]) if what == "score" and len(sys.argv) > 2 else 1)
    if what in ("sfx", "all"):
        names = sys.argv[2:] if what == "sfx" and len(sys.argv) > 2 else list(SFX)
        with ThreadPoolExecutor(3) as ex: list(ex.map(gen_sfx_one, names))
    if what == "plan":
        print(json.dumps(plan(), indent=1)); print("total s", sum(c[1] for c in CHUNKS))
