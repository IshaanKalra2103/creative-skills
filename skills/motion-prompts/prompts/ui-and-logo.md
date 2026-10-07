# UI, logo & motion systems

Interface animation, logo reveals, Figma-to-motion, scroll sections and reusable motion systems.

6 prompts behind 7 videos. Every entry credits its creator and links the original post; videos and prompts belong to their creators.

## Reusable briefs

### Orange dot motion system

[@ultimaxbt](https://x.com/ultimaxbt/status/2107486052550062398) · 2026-10-06 · [watch](https://media.prompt-motion.com/ultimaxbt-bbebf5/video.1fb88a84.mp4) · [entry](https://prompt-motion.com/ultimaxbt-bbebf5)  
`template` `long brief` `HTML` `landscape`

```text
<inputs>
Ask me for: a short label for the opening toggle, one hero word, a percentage for the graph, the text for the final card, one accent color, and a track with a clear beat.
</inputs>

<direction>
A 2D motion design film in 16:9. Use a warm off-white canvas, near-black backgrounds, bold typography and one vivid orange accent. The orange dot connects every scene: it starts in the UI, becomes the dot over a letter, traces a spring graph, grows into a shape and returns on the end card. A cursor makes the opening click feel real. Keep the motion sharp and controlled, with small spring overshoots and no dead time.
Banned: stock footage, gradients, glows, particle bursts, random transitions and motion that isn't connected to an element already on screen.
</direction>

<structure>
Around 15 seconds, with a visual change on every major beat.
Open: a cursor clicks the orange toggle beside "Reduce Motion". The letters bend and move into place until only "Motion" remains, with the orange dot above the "i".
Spring: the dot jumps away from the word and lands on a graph. Its path draws a spring response, overshoots the target and settles beside a "+22%" callout.
Shape: the dot shoots across a line, grows into an orange circle and fills the frame. A black rounded square rotates inside it, then stretches into a pill. The scene contracts to a single orange dot on black.
Type: words like "SPRINGS", "EASING", "KINETIC TYPE", "3D" and "SOUND" orbit the dot. The circle of type opens out into a field of tiny dots.
Reveal: the halftone field expands and flips to black, revealing the final card: "Opus 5.5", "Motion designer." and "0 keyframes".
Return: the orange dot moves back through the halftone, graph and toggle. Match the final frame to the first so the video loops cleanly.
</structure>

<build>
1. One HTML file, 1920x1080 at 60fps. Compute every visual from time inside seek(t): no CSS transitions, timers or state carried between frames.
2. Use closed-form springs for the toggle, bouncing dot and graph. Draw the graph from the same spring function that moves the dot.
3. Animate letters individually for the "Reduce Motion" to "Motion" transformation. Keep the orange dot attached to the "i" until it begins its jump.
4. Make the orange circle, rotating square and pill different states of the same shape. Preserve its position and motion through each transformation.
5. Place the orbiting words along a circular path, then move their letters outward to hand the frame over to the halftone grid.
6. Draw the halftone as a grid of dots whose sizes respond to the orange dot. Let it grow past the frame edges before revealing the end card.
7. Sync the click, dot landing, graph peak, shape changes and final title to measured beats. Render one frame per beat to check the pacing before the full export.
</build>

<gotchas>
The graph and dot must follow the same motion or the spring will feel fake. Keep the orange accent consistent across every scene. Give outgoing and incoming text separate timing so letters don't overlap. When a shape fills the screen, scale it past all four corners. Match the cursor, dot and typography in the first and last frames to avoid a loop stutter.
</gotchas>

<start>
Ask me for the inputs, then show me the beat map and four stills (toggle, graph, kinetic type, end card) before building the full video.
</start>
```

### “Ask me for: 8 to 12 UI states I…” · 2 videos

`template` `long brief` `square`

```text
<inputs>
Ask me for: 8 to 12 UI states I want the shape to become (e.g. button, loader, player, slider, toggle, tabs, chart, command palette, toast), pure black and white or one accent color, and a royalty-free song around 120 BPM (e.g. Mixkit, free for commercial use).
</inputs>

<direction>
Dribbble-level UI motion. One shape, never cut: every state is the same element morphing its size, radius and color while its content swaps with a short blur. A cursor drives every change with real clicks and drags. Light warm-gray canvas, black and white components, one clean UI font (Geist). Springs everywhere, a tiny overshoot at most. The camera zooms so each state fills the frame. The last frame is the first frame, so it loops.
Banned: bouncy easing, particle bursts, glows, gradients on UI chrome, mismatched icon strokes, dead time, anything that looks like a template.
</direction>

<structure>
120 BPM, 7 bars, something happens on every beat.
Button → loader → check → dynamic island → music player with a play/pause morph → scrub the progress bar → it becomes a volume slider that stretches when dragged past max → a toggle flips on the beat → the knob becomes a liquid tab indicator → the tabs open into a chart that draws itself, with a tooltip on hover → it collapses into ⌘K → type to filter → enter → toast → back to the button.
</structure>

<build>
1. One HTML file, square 1440x1440. Every style is computed from time inside seek(t): no CSS transitions, no timers, no state carried between frames.
2. Springs are closed-form step responses. A value that changes target many times is the sum of one spring per change, so it stays a pure function of time.
3. The tab indicator's two edges ride different springs, so the leading edge stretches ahead of the trailing one. Same trick for the toggle knob.
4. Drags are direct manipulation: while the cursor is held, the value is computed from its position. On release it springs back from wherever it was.
5. Analyze the song with numpy for the beat grid and start on a downbeat. Place every UI sound by its measured peak.
6. Render with Playwright: 4 subframes per frame, blended with ffmpeg tmix for motion blur at 60fps.
7. Render one frame per beat before the full render. Fix anything off the grid, cramped or hard to read.
</build>

<gotchas>
Never put will-change on anything the camera scales or the text renders blurry. Text that swaps inside a morphing container needs its own enter and exit timing or it overlaps. Make the last frame identical to the first, cursor position and speed included, or the loop stutters.
</gotchas>

<start>
Ask me for the inputs, then show me the state list on the beat grid before you write any code.
</start>
```

Made with it:

- Shape morphing through UI states: [@twoclipping](https://x.com/twoclipping/status/2103273003555402193) · 2026-09-24 · [watch](https://media.prompt-motion.com/twoclipping-opus-5-5-is-f-cking/video.eef090ae.mp4) · [entry](https://prompt-motion.com/twoclipping-5cba86) · `HTML + Playwright`
- Morphing UI states loop: [@demonugc](https://x.com/demonugc/status/2103526713208525162) · 2026-09-25 · [watch](https://media.prompt-motion.com/demonugc-opus-5-5-is-f-cking/video.8b5d1453.mp4) · [entry](https://prompt-motion.com/demonugc-4c5753) · `HTML, Playwright`

## Prompts

### Badge unlock screen animation

[@BThreeAgency](https://x.com/BThreeAgency/status/2103739079745827092) · 2026-09-26 · [watch](https://media.prompt-motion.com/bthreeagency-you-must-be-kidding/video.a48723f7.mp4) · [entry](https://prompt-motion.com/bthreeagency-b9b8d9)  
`one-shot` `landscape`

```text
Using the linked Figma frame build a badge unlock screen. Match the design exactly. Use the file's assets, lighting, type and layout and add only the motion. Animate the badge so it feels premium and celebratory. Build its scene and then celebrate with gold particles. Treat the badge as a solid 3D object that tilts toward the
cursor following the rules of physics. Keep it fast and smooth, it should not be bouncy.
```

### TypingMind logo reveal

[@tdinh_me](https://x.com/tdinh_me/status/2103704250329301409) · 2026-09-26 · [watch](https://media.prompt-motion.com/tdinh-me-use-this-prompt-and/video.f19334df.mp4) · [entry](https://prompt-motion.com/tdinh-me-815acb)  
`landscape`

```text
Create an impressive motion design video of a slow-reveal transition that assembles and eventually reveals the TypingMind logo.
```

### Sahi trading terminal reveal

[@dale_vaz](https://x.com/dale_vaz/status/2103290592679879074) · 2026-09-25 · [watch](https://media.prompt-motion.com/dale-vaz-claude-opus-5-5-is/video.d41ee170.mp4) · [entry](https://prompt-motion.com/dale-vaz-cc612a)  
`JavaScript` `one-shot` `landscape`

```text
create a self contained aesthetically pleasing, breathtaking animation of the Sahi Trading Terminal. it should start with a single dot on a black screen and then have multiple windows show up on the screen such as Charts, Positons , Option Chain, Watchlist. And zoom into and out at multiple scales. Finally the camera zooms out to make the desktop look like a point in space. And then it zooms back in to reveal a mobile screen in landscape mode with a chart in one half and an option chain in another. The video ends in Sjngle Screen Trading on SAHI
use javascript for it. be detailed and accurate. it should be visually stunning
```

### Five scroll-based sections

[@ercankeskinx](https://x.com/ercankeskinx/status/2102995443818897906) · 2026-09-24 · [watch](https://media.prompt-motion.com/ercankeskinx-gave-opus-5-5-a/video.670f1145.mp4) · [entry](https://prompt-motion.com/ercankeskinx-ec2568)  
`one-shot` `landscape`

```text
Build 5 completely different scroll-based sections, decide the context & layout yourself.
```
