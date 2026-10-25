# adidas x NBA spec spot

A 15.6 s, 1080x1350 spec spot for the adidas x NBA official game ball, in the look and editing
of Ali Zeyada's Behance case study for the same product. `../../assets/preview.jpg` shows
frames from the final cut; `../../references/case-study.md` tells how it was made and what
went wrong.

| file | what it is |
|---|---|
| `spot.json` | The final cut in this skill's format: 9 shots, 7 sources, 5 video segments, 24 snap beats, the comp finish, QA sections. |
| `stills/*.txt` | The prompts for the photoreal stills. `player_base.txt` and `hoop_common.txt` are the shared look blocks; the others add the shot. |
| `stills/*.jpg` | The start stills, small: `player_cross` (the dribble clip), `player_gather` (the jump shot), `hoop_h1` (backboard), `hoop_h2` (under the net), `rack_start` (the ball rack). |
| `briefs/*.md` | The Vizard briefs: `player.md` (project 120582, 99 credits), `hoop.md` (120603, 182 credits), `rack.md` (120678, 260 credits). All on the Flash tier. |
| `qa.json` | Jev QA of the final cut against the reference. |
| `qa_clock.json` | Jev QA of the rejected version with a shot-clock countdown and a CG ball rain. Both reports also hold the dropped `artifact` question. |

## Rebuilding it

The spot.json is complete, but the media it needs are not in this repo: the Vizard clips
(unpack them to `frames/dribble`, `jumpshot`, `board`, `net`, `rack`), the two Blender renders
(`renders/hero`, 52 frames of the ball turning, and `renders/macro`, 8 frames of a ball macro),
the soundtrack (`runtime/track.wav`), the logos (`runtime/adidas_mark.png`, `nba.png`,
`spalding.png`, white on transparent) and the reference (`ref/ref.mp4`). With those in place:

```sh
cp spot.json ~/spots/adidas/ && <skill>/template/tools/spot.sh ~/spots/adidas
```

The beat ranges in `spot.json` show how a snap section is laid out on a track; they are the
best starting point for a spot of your own.

## Sources

- Reference: Ali Zeyada, adidas x NBA official game ball case study on Behance. Its videos,
  images and soundtrack are not included. The final cut used the reference's soundtrack and
  is for study only.
- Stills: generated with gpt-image from the prompts here. The product shots used a photo of
  the ball as a look reference, which is not included.
- Video: generated in Vizard from those stills.
- adidas, NBA and Spalding names and marks belong to their owners. This is unsolicited spec
  work, not affiliated with or endorsed by them.
