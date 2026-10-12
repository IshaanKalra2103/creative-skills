# Audio: voice, music, effects, mix

There are three stems, all on the film's clock. The voice comes from ElevenLabs TTS, the music from the ElevenLabs Music API, and 120–180 synthesised SFX are registered by the scenes themselves. `audio.py` mixes them.

## Voice (`vo.py`)

1. Run `vo.py plan` (offline). It estimates word timings, calibrated on a real speed-1.15 take, so you can build and time scenes before spending characters.
2. Run `vo.py take`. It reads **the whole script as one take** with character timestamps, which gives a consistent voice and intonation across lines. The result is cached by text, voice and settings.
3. Run `vo.py place`. It cuts the take at line boundaries (halfway into each pause, capped at 0.18 s after the last word) and lays each line at `max(target, previous end + 0.12 s)` with 20/40 ms fades.
   - It prints DRIFT for any line pushed late. Fix that by shortening the line or raising `speed`, not by moving targets.
   - It writes `build/vo.wav` and `vo_words.js`.

Settings that worked:
- Voice and model: Sarah (premade `EXAVITQu4vr4xnSDxMaL`) on `eleven_multilingual_v2`.
- Voice settings: speed 1.15, stability 0.4, similarity 0.8, style 0.25, speaker boost on.
- Speed: the reference reads fast. At 1.08 the Loopcast script overran its slots by up to 3 s; at 1.15 with tightened lines it fit.
- Voice gender and pitch: the reference voice is female, median about 203 Hz.
- Starter tier: `mp3_44100_128` only. 192 kbps returns 403 below Creator.
- Cost: a 57 s script is about 780 characters.

## Music (`music.py` + `music.json`)

A composition plan has one chunk per section, and its boundaries sit on the film's cuts:

| section | Loopcast | what it does |
|---|---|---|
| Intro | 0 – 4 | light, plucks, kick |
| Problem | 4 – 10 | minor, low-passed, ticking hats, riser into… |
| Main | 10 – 50 | **drop on the brand reveal**, full groove, no breakdowns |
| Breakdown | 50 – 54 | drums and bass out under the end-card tagline |
| Outro | 54 – 57.5 | **one final hit** on the lockup / icon morph, ring out |

The model obeys structure loosely. Measure what came back (librosa beat track and per-second low/mid energy) before trusting the drop time. `audio.py` enforces the important parts anyway:
- the end-card breakdown: a high-pass at 420 Hz over `FILM.audio.bassCut`
- the fade: `FILM.audio.fadeOut`

Keep sections at 3 s or longer. 120 BPM (2 s bars) keeps the cut math easy.

## SFX (scenes call `sfx(t, type, gain, opt)`)

| type | sound | use |
|---|---|---|
| `pop` | descending sine blip + click | anything popping in: stickers, chips, tags, buttons |
| `blip` | short high sine | small items: pills (every other one), rows, chat bubbles |
| `tick` | click | each headline word and wordmark letter |
| `swoosh` | short band-passed noise sweep up | sticker fly-ins, card rises, slides |
| `whoosh` / `whoosh_down` | longer sweep up / down | scene-scale moves, mood drops |
| `wipe` | sweep + low thud | every wipe transition |
| `key` | click + thock | keycap presses |
| `type` (`{dur}`) | random-interval clicks | typewriters, terminals |
| `flip` | double swish | phone flips |
| `stamp` | low thud + crunch | stamps |
| `fall` / `land` | falling sweep / thud | mascot and phone drops |
| `impact` | long sub drop | the wordmark, the big sticker, the final hit |
| `toggle` | two clicks | toggles |
| `send` | rising chirp + air | sending a message |
| `ding` | bell partials | success counts (+4, +1,024) |
| `shutter` | double noise click | screenshots |
| `click` | click + small thud | cursor clicks |
| `riser` (`{dur}`) | rising sweep | before a big moment |

Levels are in `GAIN` in audio.py. Loud, frequent cues (ticks, blips) sit at 0.16–0.22; impacts at about 0.36. One cue every 0.3–0.6 s feels right; more becomes a rattle.

## Mix (`audio.py`)

- **Ducking:** the music ducks under the voice with an envelope follower (attack 25 ms, release 260 ms) that drops it by `FILM.audio.duck` (0.5, about −6 dB). `musicGain` is 0.3.
- **Level check:** keep the voice about 6–8 dB above the ducked music and the SFX below the voice. `stems.npy` lets you measure the RMS per window.
- **Limiting:** a soft limit (`tanh`), then `render.py mux` applies `loudnorm I=-14:TP=-1` (platform loudness) and AAC 256 k.
- **Proof the voice reads:** run `scripts/ref_words.py build/mix.wav` (Whisper) on the mix. Every line should come back word for word. If a word is lost, an SFX or the music is on top of it.
