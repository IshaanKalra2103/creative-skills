# Learning from references

The skill learns three things from the web and from real ads before it designs anything: the
product, the sport's movement, and an ad's editing grammar.

## The product

```sh
uv run tools/refs.py refs/product hv1 "nike hypervenom phantom 1 black orange" --source bing --must hypervenom -n 18
```

Look at the sheet. Keep three images that show the exact model and colourway: a side view, a
detail (texture, logo), the sole. Delete wrong colourways and other models. Image search
drifts to similar products; `--must` with the model name keeps it honest. Google (through your
Chrome, with the browser-harness CLI) is the most relevant source; Bing's endpoint works
without a browser when `--must` is set.

## The movement

```sh
uv run tools/refs.py refs/movement strike "football laces strike action photo" -n 12
```

For each movement, pull 8-12 real photos, look at the sheet, and write what the body does at
each phase into `sports/<sport>.md` (the plant foot, the knee, the arms, the toe). These
photos are also the `--control` set for `qa.py`: they show what a real frame scores.

## An ad's grammar

From an ad the user gives you (a file, or a link they provide):

```sh
uv run tools/study.py ref.mp4 ref/study      # cuts, holds, flashes, pace, tempo, cuts on the beat
uv run tools/label.py ref.mp4 ref/study      # per shot: size, angle, move, subject, light, way in
```

Read `cuts.jpg`, `shotlog.md` and `shotlog.jpg` together and write down:

- the average hold, and how holds change through the ad (the pace lines in study.py's output);
- how many cuts sit on a beat (study.py prints it) and where the music drops;
- the shot size sequence and which sizes hold longest;
- the camera moves it uses, and where;
- the transitions: plain cuts, flashes, whips, match cuts, hits inside shots;
- the light and the one colour.

Then design your own shot list with that grammar: the same rhythm and devices, your own
shots. Don't copy its shots, and don't use its music or footage in anything published.

`label.py` works from three frames per shot, so a camera move is a guess when the subject also
moves, and Jev's image support is a preview: correct the log by hand where the contact sheet
says otherwise. Checked on the example's own animatic (where the truth is known), it named the
open "close-up, ground, push, product, night", caught the impact flashes inside shots as "hit
(same shot)", and the study found 120.0 bpm with the real cuts 0.2 frames off the beat.
