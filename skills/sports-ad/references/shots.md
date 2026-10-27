# Shots

The shot types a sports ad is built from. For each: what the camera does, what it does for
the ad, how long it usually holds, how to get it (the still's composition and the line for the
video prompt), and the `move` that fakes it in the animatic when the source is a still.

Lengths are at 120 bpm, where a beat is 15 frames at 30 fps (0.5 s).

## Camera position

| shot | the camera | for | still: compose | video prompt line |
|---|---|---|---|---|
| ground level | on the surface, lens a few cm up | speed, the shoe and the ground together | horizon low, the surface large and soft in the foreground | "camera on the ground, lens just above the grass" |
| low angle | below the subject looking up | power, a hero | the athlete against the lights or sky, foreshortened legs | "low angle looking up at him" |
| eye level | at chest height, level | observation, calm | rarely the hero shot; for prep and walk-ins | "eye level, level horizon" |
| high angle | above, looking down at an angle | vulnerability, the pattern of play | the surface as the background | "high angle looking down" |
| overhead (top-down) | straight down, often a drone | scale, graphic shapes: lines, circles, the shadow | the lines of the court or pitch as a design | "straight top-down drone shot" |
| through an object | behind a net, fence, hoop, glass, between legs | the payoff (ball in the net), voyeur energy | the object sharp or soft across the frame | "from behind the goal, looking out through the net" |
| POV | from the athlete's eyes | immersion: the ball arriving, the ramp, the green | hands or feet at the bottom edge | "first-person point of view" |
| macro | centimetres from the product | the product's first read: texture, stitching, studs | a detail fills the frame, a sliver in focus | "extreme macro, very shallow focus" |

## Camera move

| shot | what it is | for | holds | video prompt line | animatic `move` |
|---|---|---|---|---|---|
| static | locked off | contrast after movement; a slow-motion hero | 1-4 beats | "locked-off camera, no camera movement" | `{}` |
| push-in | the camera moves toward the subject | focus, tension, the product read | 2-4 beats | "slow push-in toward the boot" | `"zoom": [1.0, 1.18]` |
| pull-out | moves away, revealing | reveal the place, the end of a sequence | 2-4 beats | "the camera pulls back to reveal the empty stadium" | `"zoom": [1.25, 1.0]` |
| tracking shot (track) | travels sideways at the subject's speed, parallel to it | speed with the subject held in frame; the background streams past | 2-4 beats | "camera low, tracking sideways at his speed, keeping him centred; the background streams past with motion blur" | `"pan": [[0.38, 0.55], [0.6, 0.55]]`, `"zoom": 1.25`, `"shake": 6`, `"ease": "linear"` |
| leading (dolly back) | moves backward ahead of a subject coming at it | menace, a player growing in frame | 2-3 beats | "the camera moves backward ahead of him as he runs straight at the lens" | `"zoom": [1.0, 1.25]` |
| follow | moves forward behind the subject | anticipation: a tunnel walk, a run-up | 2-4 beats | "steadicam following close behind him" | `"zoom": [1.0, 1.1]`, `"shake": 3` |
| orbit (arc) | circles around the subject | a frozen or slow moment shown in 3D | 2-4 beats | "the camera arcs around him in slow motion" | hard to fake; use `"roll"` and `"pan"` |
| crane | rises or drops vertically | reveal, scale, an ending | 3-4 beats | "the camera cranes up from the boots to the floodlights" | `"pan": [[0.5, 0.75], [0.5, 0.35]]` |
| whip pan | a very fast pan that blurs | energy; a transition between two shots | 2-6 frames | "a fast whip pan to the right" | the `whip` transition |
| handheld | small wandering movement | documentary, raw training, closeness | any | "handheld, slight natural camera shake" | `"shake": 4` |
| snorricam | rigged to the athlete; the body stays fixed, the world moves | effort, disorientation | 1-2 beats | "camera rigged to his chest facing him" | not fakeable from a still |
| rack focus | focus shifts from one plane to another | lead the eye: the boot, then the goal | 2-3 beats | "focus racks from the boot in the foreground to the goal behind" | not fakeable; cut instead |

## Time

| device | what | for | how |
|---|---|---|---|
| real time | 1x | action that must read as fast | `"speed": 1` |
| slow motion | 0.1-0.5x, shot at high speed | the hero moment: contact, spray, sweat, fabric | generate the clip slow ("in slow motion, 120 fps look"), or slow it with `"speed"` and `"interp": 4` |
| speed ramp | real time into slow motion and back inside one shot | contact on the hero moment, a beat of tension | `"speed": [[0, 1], [13, 1], [15, 0.12], [55, 0.12], [65, 1.2]]` |
| freeze | the picture stops | a punctuation, type over a frozen moment | a speed of 0 for some frames, often with a hit |
| fast | above 1x | a run-up, a transition, comedy | `"speed": 1.5` |

Ramps want frames to slow down. A 24 or 30 fps AI clip slowed to 0.25x shows each frame four
times; set `"interp": 4` on the shot to motion-interpolate the clip first (ffmpeg
minterpolate), or ask the video model for slow motion in the clip itself and play it at 1x.

## Size

Extreme close-up (macro), close-up (the boots, the ball, the hands, the face), medium (knees
or waist up), full (head to toe), wide (the athlete small in the place). Change size at every
cut in a fast build; two shots of the same size and angle in a row read as a jump cut.

## Shots by job

| job in the ad | shots |
|---|---|
| open (the product's first read) | macro push-in, product in the dark, an insert of hands lacing |
| build (speed, skill) | tracking shot, leading, ground level, handheld, short holds |
| tension (the beat before) | static, push-in on the eyes or the boot, slow motion, a gap in the music |
| hero moment | low side angle, ramp to slow motion, a hit on contact |
| payoff | through an object (the net), the reaction, the crowd |
| outro | walking away toward the light, pull-out, crane up |
| packshot and end card | studio packshot, a turntable, the logo on black |

## Video prompts per shot

A video model gets one shot per clip. Write:

1. The camera: position, move, speed of the move ("low on the grass, tracking sideways at his
   speed").
2. The subject's action, as the body does it, in the order it happens, using the sport file's
   phases ("he plants his left foot beside the ball, swings his right leg through and strikes
   it with his laces; the ball leaves the frame to the right").
3. The physics that sells it: spray, turf, net shiver, fabric, sweat, rain.
4. Speed: "real time" or "slow motion".
5. What must not change: "the boots keep their exact colours and design throughout; one ball."

Keep it to one action. A clip that has to dribble, cut and shoot will lose the ball or a leg.
