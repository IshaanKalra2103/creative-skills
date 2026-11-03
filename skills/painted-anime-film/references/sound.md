# Sound: score, effects, mix

The soundtrack is mixed on the film's own clock. Each event time comes from the shot code: a shot's start plus a constant in that shot's file, such as `TOUCH`, `SNAP` or `lightAt(x)`. Never time sound by ear against a playback.

Scripts are in `template/audio/` (uv project): `gen.py` generates, `mix.py` mixes, `analyze.py` measures clips, `qa_plot.py` plots stems against events. Both worked examples have full versions: `examples/forest-guardian/audio/` (heavy robot, booms) and The Lantern Ghost (weightless, glass and liquid).

## Order of work

1. The picture is locked, or at least every shot's length and its key event constants are.
2. **Write the cue sheet and show it to the user before spending credits.** It has two tables: score sections (film time, section name, instruments and dynamics) and SFX (time, what it is). Add a credit estimate and the account balance (`GET /v1/user/subscription`, which is free). Wait for a go-ahead.
3. `uv run gen.py all`. Existing files are skipped, so a rerun never re-spends. Billed costs are appended to `costs.jsonl`.
4. `uv run analyze.py`: the onset and peak time of every clip. Use these to offset `place()` so the clip's transient lands on the event frame, not the clip's start.
5. `uv run mix.py`, which writes `soundtrack.wav` (48 kHz, -16 LUFS, -1.3 dBTP), `stems/` and `mix_report.txt`. Then run `uv run qa_plot.py` and read `qa.png`: every red event line should sit on a transient.
6. Embed and mux:
   ```
   ffmpeg -y -i audio/soundtrack.wav -c:a aac_at -b:a 192k audio/soundtrack.m4a
   node build.mjs          # embeds the m4a as a data URI
   sh tools/mux.sh         # render/<name>.mp4 + <name>-share.mp4
   ```

## Score (Eleven Music, `music_v2_5`)

- Use one `composition_plan` with one chunk per story section, and cut the chunks on shot boundaries so the sum equals the film length. Each chunk has a `[Section] {direction}` text, positive styles (instruments, dynamics, mood, key, BPM), and negative styles (vocals, drums, EDM; also "horror" for gentle films). Use `context_adherence: "high"`, or `"medium"` for the quiet transition chunk.
- Shape the score like the story: near silence for the sign beats, the theme first stated small at the contact beat, growth through the transformation, the full orchestra exactly on the signature moment, then a solo instrument on the coda.
- Keep one key family across chunks (D major for the robot, A minor to C major for the ghost) so the joins hold.
- Cost is not reported in the response header. Read the subscription balance before and after the call.

## SFX (`eleven_text_to_sound_v2`)

- Write prompts as physical descriptions: what moves, the material, the size, the distance. Add "very close and quiet" or "far away" explicitly.
- About 10 credits per second. Loop beds (`loop: true`) run 14–22 s and are crossfaded in the mix.
- Match the character's physics. A heavy character gets impacts plus synth sub-booms. A weightless one gets no impacts or whooshes on its body, only liquid, glass and flame.
- Generate one clip per distinct sound and reuse it with pans for repeats (four lanterns, one clip).

## Mix rules (`mix.py`)

- Use four buses: score, amb, fx and low (synth). FX get a shared reverb. The score is sidechain-ducked up to 4 dB under the foley.
- A character's light or power gets a synth tone whose level follows the same keyframe table as the picture (`CORE_KEYS` for the robot, shot 7's `EMIT` for the ghost), stepped on the same frames.
- Ambience tells the time of day. Fade the night bed out as the morning bed and birds come in, timed to the colour change, not to the cut.
- Dip the score 2–4 dB under small, important sounds (a strand snapping, lanterns catching).
- `DUR` = rendered frames / 24 exactly, and `FADE_OUT` matches the last shot's `fadeOut`.
