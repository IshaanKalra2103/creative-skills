# Cutting to the soundtrack

```sh
uv run tools/hits.py runtime/track.wav --out ref/hits.json        # or the reference mp4
```

It prints the tempo and beat length in frames, every percussive onset with its strength,
spans with no sub bass under 120 Hz (breakdowns), quiet dips, and where the track fades and
goes silent.

## Where cuts go

- Main cuts (shot changes, with a lens kick in `comp.kicks`): the strongest onsets, and the
  first onset after a breakdown or dip, where the bass comes back. That reads as the drop.
- Snap rolls: where onsets come every half or quarter beat. Hold beats for the onset gaps
  (4 frames at about 110 BPM on eighth notes).
- Breakdowns: a held shot (the hero product) or a slow move. Don't snap through them.
- The tagline lines on two hits; the end logos one per hit; the lockup lands on the last
  strong onset and the fade finishes when the track goes silent.

Cuts can sit one frame before an onset: the eye reads the cut while the ear hears the hit.
Check by playing the render, not only on the numbers.

## Audio in the comp

`comp.audio` lists files in `runtime/` with a start in seconds and a gain. The example plays
one track from 0 at 0 dB and nothing else. For a mix of your own, add sound effects as more
entries (a whoosh on each whip, an impact on each kick) and keep the music 4-6 dB under them.

## Rights

A reference spot's soundtrack is for study. A cut with it is not cleared to publish; for
anything public use licensed music or your own.
