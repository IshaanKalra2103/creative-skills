# Music

A sports ad's music is a beat you can move to, not a film score. The cut hangs on it: the
cuts sit on its beats, the hero moment lands on its drop, and the end card stops it dead.

## Sports ad, not trailer

On the example, the first Suno prompt asked for "cinematic risers and braams, stadium impact
hits, tense staccato string ostinato intro ... epic". It came back as trailer music, and the
user rejected it: "sounds more like a movie music and not a sports ad music". What made it
sound like a sports ad:

| keep | leave out |
|---|---|
| a genre with a groove: phonk, grime, drill, trap, baile funk, drum and bass, big-beat, punk | cinematic, orchestral, strings, braams, trailer, film score, choir, epic |
| a stomp-stomp-clap or a four-on-the-floor kick you can feel the stride in | pads, piano, ambient intros |
| crowd or gang chants ("hey!"), whistles, a cowbell or a riff you can hum | long risers that replace the beat |
| an 808 or a distorted bass that drops out for a bar, then comes back | a slow swell into a single hit |
| swagger: "aggressive, swaggering, sneaker ad energy" | "epic", "heroic", "majestic" |

Match the genre to the sport and the market: grime or drill for UK football, baile funk or
phonk for Brazilian flair, trap for basketball, punk or big-beat for skate, drum and bass for
running. Name the tempo; 130-150 bpm suits a 15 s spot.

## Making it in Suno

Drive the user's own Chrome (browser-harness; ask first, they must be signed in):

1. suno.com/create, Advanced. Lyrics empty for an instrumental.
2. Styles (up to 1000 characters): genre, tempo and key, the drums, the bass, the hook, the
   structure you need ("short 8-bar build with a snare roll, one bar of silence then a heavy
   bass drop"), then the mood words. Put what it must not be under Exclude styles.
3. Create gives two takes. Let the user listen; they hear what you can't.
4. Download (the track's menu, Download, WAV). A paid plan has a monthly download count;
   each first download of a song uses one, later ones are free. Chrome saves into its own
   download folder: send downloads to the project with CDP
   `Browser.setDownloadBehavior(behavior="allow", downloadPath=...)` and set it back to
   `default` straight after, because it applies to everything the user downloads meanwhile.

Generated music is fine for a spec film; check Suno's terms for the user's plan before any
commercial use.

## Fitting it to the cut

```sh
uv run tools/track.py music/take_b.wav --at 6.857
```

It prints the tempo, the downbeats and the drops (a bar whose bass jumps, marked "after a gap"
when the bass was out the beat before), and for each drop the `score.music.in` that lands it
at 6.857 s into the ad. Pick the drop that comes after a gap and a build. Then:

- set `bpm` to the track's tempo and lay the shots out in beats from frame 0, so the cuts
  fall on the track's beats (the `in` from track.py is itself on a beat);
- put the hero moment's first frame (contact, the dunk, the finish line) on the drop: a shot
  that starts there, or a hit at `"D+4b"`;
- let the bar where the bass is out carry the wind-up: slow motion, no cuts;
- stop the track on the end card with `mute` and put an `impact` and a `subdrop` there.

On the example (140 bpm, 12.86 frames a beat) the drop at 20.58 s in the track landed on
frame 206, the strike's contact, with `in` 13.726.
