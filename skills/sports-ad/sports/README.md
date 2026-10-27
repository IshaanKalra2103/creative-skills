# Sports

One file per sport. Read the sport's file before writing any still or video prompt for it,
and write a new one before making an ad for a sport that has none. `soccer.md` is the most
complete and is the model for the others.

| file | sport |
|---|---|
| `soccer.md` | soccer (football) |
| `basketball.md` | basketball |
| `american-football.md` | American football |
| `tennis.md` | tennis |
| `running.md` | running (track and road) |
| `baseball.md` | baseball |
| `boxing.md` | boxing |
| `golf.md` | golf |
| `skateboarding.md` | skateboarding |

## Adding a sport

Write `sports/<sport>.md` with these sections, in this order:

1. **Movements.** The 6-10 movements an ad in that sport would show. For each: the phases in
   order with their length in frames at 30 fps, the body cues that make it read as real (the
   ones a coach would check), the hero frame for the product, how to shoot it, and the tells
   that it is fake. Put the main movement's phases in a table.
2. **Props and setting.** The equipment with real sizes, the surfaces, the places, the weather
   that reads well on camera.
3. **Product hero moments.** Per product type (shoes, ball, apparel, equipment): the moments
   that show the product best.
4. **Shots that work.** A table of shot and what it is for, using the names in
   `references/shots.md`.
5. **Sound.** The sport's sounds, and where the music should drop out or hit.
6. **Video-model risks.** A table of risk, what happens, how to avoid it.
7. **Ad grammar.** What ads in this sport tend to do: structure, hold lengths, devices.

Learn the movements from footage and photos, not from memory: pull real photos of each
movement with `tools/refs.py` (`"<movement> <sport> action photo"`), look at the sheet, and
write down what the body does at each phase. If a reference ad exists, run `study.py` and
`label.py` on it and fold its shot log into the ad grammar section.
