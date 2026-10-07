# The slop catalog

AI slop is not ugliness. It is the **average**: every decision left at the
value most likely to appear in training data. Each tell below is harmless
alone. Together they make a screen that could belong to any app in any
category, and people recognise that in under a second, the same way they
recognise stock photography.

## The two faces of 2025 slop

Asked to design a habit tracker and a finance app with no guidance, a strong
model produced these, and they are what every reviewer has seen a thousand
times. Learn them by name.

**"Calm Wellness".** Cream ground `#F4F0EA`, a serif display (Fraunces) for
"Good morning, *Maya.*" with the name in terracotta italic, a week strip of
progress rings, a dark "You're on a roll" card with a ring and a radial glow,
then rows of white cards each with a pastel icon chip, a 🔥 streak count, and a
round check. Inter for everything else. A floating tab bar with a terracotta
"+" in the middle. Detail screen: a gradient orange streak card with a 68pt
number, three stat tiles, a calendar of tinted pills, a sage capsule button.

**"Dark Fintech".** Near-black ground, a lime `#D4F45A`-ish accent, Manrope.
Gradient avatar circle, "Good morning / Maya Lindqvist", a 52pt balance with
small grey cents, a lime pill "€214 less than last week", a bar chart card
with one lime bar, three identical category tiles each with its own colour
chip and progress bar, a "Recent" list with "See all". Detail: a big
monogram tile, a map card with a glowing pin, a budget bar card, a pill
"Completed" with a check.

Both are competent. Both are *the* default. If your screen shares more than
two features with either, start over from the concept sentence.

The cure is never "do the opposite". It is **make the decision**: name what
this app is, and let that decide the value. Each entry gives the tell, why it
reads as machine-made, and what a designer does instead.

`shoot.mjs` catches the ones marked **[scan]**. The rest only your eye catches.

---

## 1. Structure

**The dashboard reflex.** Greeting, then a hero card with a big number, then a
2x2 grid of stat tiles, then "Recent activity". Every app, regardless of what
it does, gets the analytics-dashboard skeleton.
*Instead:* ask what the person opens the app to **do** in the next ten
seconds, and give that the whole first screen. A habit app's first screen is
the act of checking off, not a report on checking off. Stats live one tap away.

**"Good morning, Maya."** / **"Welcome back, Alex 👋"** at the top of the home screen. **[scan]**
A greeting is the most expensive real estate on the screen spent on nothing.
*Instead:* the date, the place, the thing. Or nothing: a large title that
names the screen (Today, Library, Trips). Apple's own apps never greet you.

**The three-stat row.** Three equal columns of big value over small label
("650 ml / every 8 days", "Sat 11 / next water", "1,850 / lux") dropped
under every hero. It is the dashboard reflex in miniature.
*Instead:* say the one fact that matters as a sentence, or make one number
the hero and let the others be quiet text. Three stats is a choice, not a
template.

**Everything is a card.** **[scan]** Every group gets a rounded rectangle,
white on light grey, with a shadow. Then cards appear inside cards.
*Instead:* group with **space and alignment** first, hairline dividers second,
containers last. A card is earned when the thing is an object you can pick up
(a ticket, a recipe, a photo, a pass), not when it is a section.

**Uniform rhythm.** 16pt between everything. Every gap the same, so nothing
groups and nothing breathes.
*Instead:* tight within a group (4 to 8), loose between groups (24 to 40),
and one generous break per screen (48+) where the eye rests. See layout.md.

**The symmetrical stack.** Every block full width, centred, same height.
*Instead:* one element owns the screen. Let it be big, let it be off-centre,
let it bleed. Then everything else is quiet and small.

**Fake depth everywhere.** **[scan]** Shadows on every tile.
*Instead:* iOS 26 depth has two layers: content, and the Liquid Glass
navigation layer floating over it. Content mostly sits flat.

**Five tabs plus a floating "+" button in the middle.** **[scan]** A pattern from 2016
Android-era Dribbble.
*Instead:* two to four tabs, a separate search tab if search matters, and
the primary action placed where the content is (a toolbar button, an inline
row, a bottom accessory).

**The onboarding carousel.** Three swipeable illustrated slides of features,
dots at the bottom, Skip in the corner.
*Instead:* put people into the product on the first screen and teach in
context. If there must be a welcome, make it one screen that does one thing
(a choice, a permission with a reason, a first entry).

---

## 2. Typography

**One weight, one size, everywhere.** **[scan]** Body text 16, titles 20
semibold, labels 14 medium. Hierarchy flat as a spreadsheet.
*Instead:* real contrast. A 34 to 64pt display moment against 13 to 15pt
metadata. Weight contrast of at least two steps (regular next to bold, not
medium next to semibold).

**The default reach fonts.** **[scan]** Inter, Poppins, Montserrat, Plus
Jakarta, Manrope, DM Sans for UI; Playfair Display, DM Serif, Cormorant, Lora
for "elegant"; Space Grotesk for "techy". They are not bad fonts. They are the
fonts that mean nobody chose.
*Instead:* on iOS the strongest move is usually Apple's own family **used with
intent**: SF Pro Expanded or Compressed for display, New York for editorial,
SF Rounded for soft, SF Mono for instrument. Or a custom face with a reason
you can say out loud. See type.md.

**Title Case On Every Label.** Reads like a slide deck.
*Instead:* sentence case for everything except proper nouns and the rare
deliberate headline.

**ALL CAPS EYEBROWS above every section**, letter-spaced, grey, 11pt.
*Instead:* at most one per screen, and only when it adds information (a
date, a category). Usually the heading carries itself.

**Mixed families for decoration.** A serif word dropped into a sans headline
to look "designed".
*Instead:* if you want the Five Minute Journal move (roman headline with one
italic word), it is the **same family**, roman and italic, and the italic word
is the one that carries the meaning. See type.md, "The emphasis word".

**Default tracking on display sizes.** Big type set at 0 letter-spacing looks
loose and cheap.
*Instead:* tighten as size grows (-0.5 to -2% at 28 to 64pt, more for heavy
weights; Expanded widths need less).

**Text below 11pt.** **[scan]** The iOS floor is 11 (caption 2). Anything
smaller is unreadable on a phone and fails review in spirit.

---

## 3. Colour

**Indigo-to-violet gradients.** **[scan]** The single most recognisable AI
tell: purple hero card, purple button, purple glow.
*Instead:* a colour that comes from the app's world (see color.md). If the
concept genuinely is violet, flat violet, not a gradient.

**Confetti.** **[scan]** Every stat tile its own pastel: blue tile, green tile,
orange tile, pink tile. Every category its own colour.
*Instead:* one accent that owns one role (the primary action, or "today", or
"done"). Neutrals do the rest. Semantic red/green only where money or state
needs them. If categories need distinguishing, use shape, label, or position
before hue.

**Tinted-square icon chips.** **[scan]** A 36pt rounded square of 12% accent
holding a coloured glyph, at the start of every row.
*Instead:* Settings-style chips are right in Settings-like lists. Elsewhere,
a bare symbol in the text colour, or no icon. If every row has one, none of
them mean anything.

**Grey on grey.** **[scan]** #9CA3AF secondary text on #F3F4F6, failing
contrast. Tailwind grey on a phone.
*Instead:* secondary text tinted from the ink or ground hue, and measured.

**Glow.** **[scan]** Coloured zero-offset box-shadows, neon outlines, blurred
colour blobs floating behind content.
*Instead:* nothing on UI elements. Light on iOS chrome comes from the
material (glass, vibrancy), not from paint. Light *inside an illustration*
(a lit window, a lamp, a sunrise) is a physical phenomenon and allowed, as
long as it belongs to the scene and not to a button.

**Mesh gradient as personality.** A swirling MeshGradient background on the
home screen to make it "feel premium".
*Instead:* use one only if it carries meaning (weather, time of day, audio).
Decoration that moves draws the eye away from the content and dates in months.

---

## 4. Icons and imagery

**Emoji as icons.** **[scan]** 🔥 for streaks, 💧 for water, 💰 for money.
*Instead:* SF Symbols, one weight matched to adjacent text, one rendering
mode. Emoji belong in user content, never in the chrome.

**Mixed icon sets and weights.** Outline here, filled there, 1.5px stroke
next to 2.5px.
*Instead:* one set, one weight. Filled for selected tab state only.

**The unDraw person.** Flat illustrated people with purple shirts, a big
plant, a floating phone.
*Instead:* real photography with an art direction, or illustration by one
hand with one style used everywhere, or typography. Or nothing.

**3D glossy blobs and clay icons.** Generated "3D icon" sets for empty
states and features.
*Instead:* an empty state that is a sentence and an action. See copy.md.

**Grey placeholder boxes with a mountain glyph.** Content left for later.
*Instead:* real images, or a deliberate flat colour field with a real
caption. Mockups get judged on what they show.

**Generic stock.** The smiling woman with a laptop, the latte, the
handshake.
*Instead:* if the app has user content (photos, covers, food), the content
is the imagery. Show realistic, specific, slightly imperfect content.

---

## 5. Copy and data

**Marketing voice in the UI.** **[scan]** "Effortlessly track your journey",
"Unlock your potential", "Your all-in-one hub", "Let's get started!".
*Instead:* the label says what the thing is. "Add habit", not "Start your
journey". Write like a calm, specific person. See copy.md.

**Fake-perfect data.** 1,234 steps, $1,000.00, 12-day streak, 75% progress,
"John Doe", "Lorem ipsum". **[scan]**
*Instead:* specific, uneven, believable content. $1,284.37. A 23-day streak
that broke last month. Real-sounding names from the user's world. Specific
data is the cheapest premium signal there is.

**Exclamation marks and emoji in system copy.** **[scan]**
*Instead:* full stops. The app is not excited; it is useful.

**AI sparkles.** ✨ next to any feature with a model behind it.
*Instead:* name what it does. "Summary", "Suggested".

---

## 6. Motion

**Everything fades up on load.** Staggered fade-and-slide on every element of
every screen.
*Instead:* motion explains a change of state. Nothing moves on a screen that
did not change. See motion.md.

**Linear and ease-in-out timing.** CSS defaults, 300ms, everywhere.
*Instead:* springs. Interruptible, velocity-preserving, short.

**Bounce for its own sake.** Every button overshoots.
*Instead:* bounce is for things that are physically tossed or celebrated.
Most UI motion is critically damped.

**No signature.** The app has no interaction anyone would describe to a
friend.
*Instead:* one bespoke moment (see motion.md, "The signature"), done
perfectly, with a haptic.

---

## 7. The overcorrection

The first version of this skill was tested on a habit tracker, a finance app
and a recipe app. All three came back as the **same app**: pale grey paper,
near-black ink, one red, SF Mono figures, hairline-ruled rows, no images. A
time card, a passbook and a kitchen ticket. Each was clever. Together they
were a house style, and an austere one.

This happens because the cures for slop (fewer colours, no cards, no
gradients, no illustration, specific data) all subtract, and a process that
only subtracts ends at a wireframe with good fonts. The concept step makes it
worse when every concept is a **printed form**: a receipt, a ledger, a ticket,
a label, a timetable. Printed forms are grey, black, one ink colour and
monospace by nature.

Award-winning apps are not austere. Crouton is full of food. Flighty is dense
but alive with colour and maps. (Not Boring) Weather is a 3D toy. Bears
Gratitude is hand-drawn bears. Partiful is loud. Apple's own Sports, Invites
and News are image-led and saturated. **Restraint is a tool, not the goal.
Specificity is the goal.**

So:

- At most **one** printed-form concept in any exploration of three.
- The core screen carries a **richness source**: photography, an
  illustration or shape language, a colour field, or a material. All-type,
  all-grey screens fail the rubric's richness line.
- If a design you are about to ship is light grey, black, one red, mono and
  ruled, stop and justify it against the other two explorations in writing.

## 8. The tests

Run the six quick tests and the scored rubric in
[critique.md](critique.md). Short version:

1. **The logo test.** Cover the app name. Could this be any app in the
   category? If yes, the direction has not reached the screen.
2. **The squint test.** Squint until the text blurs. Is there exactly one
   thing your eye lands on first, and is it the right thing?
3. **The category test.** Picture the top three apps in this category.
   Does yours look like their average? Then it is slop, however clean.
4. **The specificity test.** Point at any value: a colour, a size, a gap,
   a word. Can you say why it is that and not the default? Every unexplained
   value is a default.
5. **The feature test.** Would an editor put this screen on the App Store
   Today tab? What would the headline say about how it looks?
6. **The subtraction test.** Remove one element. Did the screen get worse?
   If not, leave it out.
