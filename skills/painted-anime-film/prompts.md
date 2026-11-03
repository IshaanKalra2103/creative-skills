# Prompts

## Start a new film

Fill in the brackets. One sentence of premise is enough: the skill turns it into a beat sheet, shots, a colour script and a soundtrack.

```
Use the painted-anime-film skill. Make a [45-75] s wordless anime short in the Studio Ghibli
style: [a character] [does something] and [the world changes because of it].
Setting: [place, time of day, weather]. The character is original, [size and material:
heavy and ancient / tiny and weightless / ...]. [Optional: one image the film must have.]
Add sound (score + SFX) and render it as an mp4.
```

Premises that fit the skill (one change, one signature moment, a witness):
- A paper crane, folded by no one, unfolds in a dusty attic and flies the first letter out through a broken window into snow.
- A stone fox statue at a mountain shrine shakes off a winter of ice and runs the first spring meltwater down the steps.
- A rusted lighthouse keeper robot relights the lamp on the night the fishing boats are lost in fog.
- A cloud whale sinks low over a drought valley at dusk and rains on the cracked paddies.
- A moth made of embers leaves a dying campfire and lights every lantern of a night market.

For follow-ups, name the shot and what is wrong with it, ideally with a screenshot ("shot 11: the lantern keeps moving, the flame floats next to the window"). The skill's QA table (`references/qa.md`) maps most complaints to a fix.

## The prompts that made the examples

### The Guardian of the Morning Forest (`examples/forest-guardian/`)

The opening prompt, pasted as is (it was followed by "dont use any skills", since this film is where the skill came from):

```
Create a 2D anime scene for the web. It must look completely like real Japanese anime, as if it were
taken directly from a finished theatrical anime film. This is traditional-looking, hand-drawn 2D anime,
not a 3D animation, a moving illustration, or a stylized web graphic.

Deliver the final result as a single, self-contained HTML file. Use any tools, libraries, references,
guides, literally anything etc.

Use Studio Ghibli films as the art style reference for the design, line work, painted backgrounds,
color, and atmosphere. Create an original giant robot as the main character. No people appear in the
scene. Use any tools or techniques you want, including 3D, as long as the final result looks 100% like
hand-drawn 2D anime.

SCENE
At sunrise, mist hangs over an abandoned forest. A giant robot has knelt here for so long that moss,
wildflowers, and old trees have grown over its body. A small bird lands on its shoulder as the first
ray of sunlight reaches its weathered face. Deep inside its chest, a faint light flickers on. The
ground trembles and birds burst from the treetops. With a deep, creaking groan, the robot slowly rises
as soil, vines, and leaves pour from its armor. It lifts its head toward a gap in the canopy. The
engines ignite, sending a great ring of wind across the forest. The robot tears into the golden sky,
leaving a curving trail of light and mist as leaves spiral down through the sunbeams.

ANIME QUALITY STANDARD
Every frame must look as if it was drawn by professional anime animators and painted by master
background artists for a finished theatrical film.

Robot: A hand-drawn anime mecha that feels heavy, ancient, and full of personality, with cel-colored
forms, chipped paint, rust, moss, and believable weathering. Keep it on-model from every angle, and let
its posture and glowing eyes express emotion.
Line art: Confident, delicate, hand-inked anime line work with subtle variation in thickness and
pressure.
Coloring: Traditional anime cel coloring with clean color areas, simple hard-edged shadows, and a soft,
natural palette.
Backgrounds: Richly detailed, hand-painted anime backgrounds in a gouache style, with visible
brushwork, natural color variation, layered foliage, and real depth.
Lighting: Golden sunrise light, colorful shadows, glowing mist, and soft atmosphere that unite the
robot and background.
Animation: Authentic hand-drawn anime timing with real weight, strong key poses, natural holds, and
overlapping movement in vines, grass, leaves, birds, and falling debris. The robot should rise slowly
and feel massive, then launch with explosive power.
Direction: Cinematic anime shots, beautiful composition, thoughtful staging, and pacing that starts
quietly, builds tension, and ends in a soaring climax.
IT MUST NOT LOOK LIKE
- 3D: No plastic materials, CGI shading, visible polygons, game-engine lighting, or computer-perfect
  perspective.
- SVG or vector art: No simple geometric shapes, perfect curves, uniform outlines, flat corporate
  illustration, or basic gradients.
- Web animation: No sliding layers, constant bobbing, floating parts, smooth software easing, or
  puppet-like joint rotation.

You are free to change any part of the prompt, if it would result, in better results.
- AI art: No warped shapes, melted details, flickering, or changing robot designs.
- Non-anime art: No Western cartoon designs, realistic rendering, soft painterly shading on the robot,
  or generic digital illustration.
- Amateur work: No stiff poses, empty backgrounds, repeated trees, muddy colors, clip art,
  placeholders, or unfinished details.

The result should feel awe-inspiring, nostalgic, and full of wonder, like the moment an old forgotten
dream comes back to life. Before finishing, inspect random frames as still images. If any frame does
not look completely like real 2D anime, keep improving it. Do not stop until every frame could pass as
a still from a theatrical anime film.
```

Sound, in a later session:

```
now add sound to it, make it cinematic as the video itself and then render as an mp4
```

### The Lantern Ghost (`examples/lantern-ghost/`)

The prompt that made the skill and, as its first test, this film:

```
make this into a skill for the style, cinematography, story progression etc. so that we can adapt to
different stories. for a try, show a ghost (studio ghibli style) rising from the shadows and bringing
brightness to the world with it
```

Follow-ups:

```
i want sfx and bgm too
```

```
[screenshot of the last shot] this looks weird, also the lamp post keeps on moving and is not static
which is weird
```

The last one became two QA rows and a rule: props keep one drawing (no boil), held codas lock the camera, and a flame is drawn inside its lamp's opening, clipped to it.
