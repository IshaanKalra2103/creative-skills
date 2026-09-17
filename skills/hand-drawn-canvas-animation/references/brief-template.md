# Brief template

Fill this from the user's request before touching code. Keep it at the top of
the film's HTML as a comment together with the beat sheet.

```
BRIEF
Subject: <one sentence, e.g. "the life of a request inside a 4x RTX 3090 rig">
Format: <1:1 | 16:9 | 9:16>, output width <1080 | 1920 | 3840>, drawn 12 fps, output 24 fps, <N> seconds
Look: ink | riso | screen | pencil | mixed (name the cuts where the look changes)
Palette: paperInk | risoPop | screenSea | pencilMinimal | blueprintNight
         | makePalette({...}, base) | derivePalette(base, {hue, sat, light}) | duotone(a, b)
Finish: follows the palette unless stated
Anchor: <the element that survives every cut: a dot, a puppet, a thread>
Puppets: <list, 1..3, each with 3..6 pose params>
Beats (8..14, each 0.25..3 s):
  1. <what happens> | look <ink/riso/screen/pencil> | camera <static/push-in/follow> | recipe <A..Z> | sound <motif>
  2. ...
Must include: one establishing shot (A or U), one drawn transition (B, iris or torn section),
              one of C/D/E/O, one POV or gallery (H or P), sign-off (S)
Deliver: <name>.html, out/<name>.mp4, out/<name>-contact.jpg
```

Instruction to prepend when handing the brief to another agent:

```
You are drawing every frame of a short film in JavaScript on Canvas 2D,
one HTML file on top of core.js, following the hand-drawn-canvas-animation
skill. Rules in references/style.md are mandatory. Start from
assets/film-template.html. Write the beat sheet first, pick the palette and
render the style sheet and palette sheet, build the puppets, then scenes one
by one, render the contact sheet after every scene and fix what the review
checklist in SKILL.md flags. Do not use images, libraries, gradients on the
final canvas, filters or Math.random.
```
