# The slop catalog

AI slop is not ugly. It is **the average**: every decision left at the value
most likely to appear in training data. Each tell below is harmless alone.
Together they make a page that could belong to any company, and visitors
recognise that in under a second, the way they recognise stock photography.

The 2023 tells (purple gradients, glowing orbs, "Supercharge your workflow")
are now so mocked that strong models avoid them. **The slop moved.** Today it
is tasteful, warm and competent, and it is the same page every time. Learn the
current faces by name.

`shoot.mjs` catches what is marked **[scan]**. The rest only your eye catches.

---

## The four faces of 2026 slop

These were produced by a strong model asked, with no guidance, for four
unrelated sites (invoicing software, an AI meeting-notes tool, an
architecture studio, a coffee roaster) and two web apps (a courier dispatch
board, a feature-flag manager). The four sites came back as one site.

### 1. "The Paper Edition" (every marketing site)

Warm paper ground (`#F4F1EA`, `#F0ECE4`), near-black ink. A headline in a
condensed or editorial serif (Instrument Serif, Fraunces) or Geist at 80 to
96px, with **one word set in italic and in the accent colour** ("*Forget the
chasing.*", "*Not* in your notes.", "made to *weather well.*"). The accent is
forest green, vermilion or terracotta. Above the headline, a **pill badge**:
"● New: quarterly tax estimates, done for you" or "NEW · Follow-ups now send
from your own inbox ›". **[scan]** Under it, a grey 18px paragraph, then a
**black pill button with an arrow** beside a **ghost pill button** ("See how
it works", "See a 90-second call"), then small print: "Free for your first 3
clients. No card required." On the right or below, a **floating product
card**: a white rounded-20 panel with a soft long shadow, a mono label
("INVOICE", "LIVE TRANSCRIPT"), and a little toast overlapping its corner
("✓ Northfield paid €4,690.00"). Then a four-column **stats strip** in mono
("€1.2B / 11 days / 48,000 / 4.9/5"). Then **mono letter-spaced eyebrows**
over every section, often numbered ("01 — Studio"). **[scan]** A bento grid
of rounded cards. Three pricing cards with "Most popular" on the middle one.
**[scan]** An FAQ of `<details>`. A dark footer with four link columns.

It looks considered, so nobody questions it. That is the problem: it is the
considered-looking default, and it is identical across categories. An
architecture studio and an invoicing app should not share a palette, a
headline construction and a button style.

### 2. "The Launch Page" (the 2023 face, still everywhere)

Near-black or navy ground, a centred 64px Inter/Geist headline whose last
words are filled with an indigo-to-violet gradient **[scan]**, a radial
purple glow or blurred orb behind it **[scan]**, a product screenshot tilted
in perspective with a glowing border, a greyscale logo strip "Trusted by
teams at" **[scan]**, three feature cards each with an icon in a tinted
rounded square **[scan]**, a dot-grid backdrop fading out at the edges
**[scan]**, glassmorphic sticky nav, "Ready to get started?" in a gradient
band. Copy: "Supercharge", "seamless", "all-in-one". **[scan]**

### 3. "The shadcn Dashboard" (every web app, light)

A 260px sidebar with a logo tile, outline icons at the default 2px stroke
**[scan]**, a count on the right of each item, a "SAVED VIEWS" eyebrow with
coloured dots, and the user's avatar initials at the bottom. A top bar with
the page title, the date, a search field with a "/" or "⌘K" hint, a bell
with a red dot, and a blue "+ New job" button with a keyboard hint. Then
**a row of three to four KPI cards** ("Delivered today 112 / 186", "On-time
rate 94.2% +1.3 pts vs last Monday", "+20.1% from last month" **[scan]**),
each with a small icon and a sparkline. Then a chart or map card and a list
card side by side. Inter, 13 to 14px everywhere, pastel status pills, six
hue families doing six different jobs **[scan]**, everything in a white
rounded box on a grey ground, boxes inside boxes. **[scan]**

### 4. "The Dark Dev Tool" (every web app, dark)

The same skeleton on `#0B0B0C`: zinc greys, a breadcrumb ("Northwind / ●
checkout-web / Flags"), a stat strip of four numbers with one sparkline, a
search field and a row of filter tabs with counts, then a table of rows with
mono keys, green toggles, tag pills and initials avatars. Inter plus
JetBrains Mono. Coloured dots for projects. Text in `#71717A` on `#0B0B0C`
that fails contrast. **[scan]**

All four are competent. All four are *the* default. **If your page shares
more than three features with any face, start over from the concept.**

The cure is never "do the opposite" (that is just the next default). It is
**make the decision**: name what this product is, and let that decide each
value.

---

## 1. Page structure (sites)

**The template sequence.** Nav, pill, hero, logo strip, three features, a
bento, testimonials, three-tier pricing, FAQ, "Ready to get started?", footer.
Every product gets the same twelve sections in the same order.
*Instead:* list the questions *this* visitor has, in the order they have
them, and give each question one section. A coffee roaster's visitor asks
"what's on today, what does it taste like, how fast does it come"; an
architect's visitor asks "show me buildings". Most pages need five sections,
not twelve. See layout.md, "Page grammars".

**The centred hero.** Pill, headline, sub, two buttons, all centred over a
product shot. **[scan]**
*Instead:* the first screen is the product's strongest *evidence*, composed
for this product: the coffee, the building, the actual invoice being paid,
the dispatch map. Left-aligned, asymmetric, or full-bleed. The headline can
be smaller than you think when the evidence is strong.

**The announcement pill.** A rounded badge above the headline. **[scan]**
*Instead:* if there is news, it goes where news goes (a dated line in the
nav, a banner, the headline itself). Usually there is no news.

**Feature cards.** Three or six identical boxes of icon, heading, sentence.
**[scan]**
*Instead:* show the feature working. A real list, a table, a before/after,
a demo you can poke, one big example. If you must list features, list them
as type, without boxes and without icons.

**Bento grid.** Rounded tiles of mixed sizes, each with a mini illustration.
*Instead:* earned only when the tiles are real objects of different sizes
(products, projects, photos). As a features layout it is the 2024 template.

**The stats strip.** Four big numbers with captions under the hero. **[scan]**
for round ones.
*Instead:* one specific number in a sentence ("Freelancers got paid 11 days
sooner last year") beats four in a row. Fake round numbers (10,000+, 99.9%,
4.9/5) are skipped by every reader.

**Logo strip and testimonial wall.** **[scan]**
*Instead:* real customers only. One long, specific quote with a real name and
a photo beats nine cards. If there are no customers yet, say nothing.

**Three-tier pricing with "Most popular".** **[scan]**
*Instead:* as many plans as the business has. If it is one price, say it in
the hero. If there are tiers, a comparison table reads better than three
cards.

**"Ready to get started?"** The closing band that repeats the hero button.
*Instead:* end on the last useful thing (the address and hours, the
contact, the price), with the action in it.

## 2. App structure (web apps)

**The KPI reflex.** The first thing in every app is a row of metric cards.
**[scan]** for the shadcn phrasing.
*Instead:* ask what the user came to **do** in the next ten seconds and give
that the screen (app.md §1). The numbers become a single quiet line or a
filter; the work takes the space.

**Boxes in boxes.** Every region a white rounded card on a grey ground, with
more cards inside. **[scan]**
*Instead:* one surface. Separate regions with space, alignment and
hairlines. A panel is a box only when it floats (a sheet, a popover, a
dialog) or can be moved.

**Every colour has a job, and there are six jobs.** Blue for primary, green
for on-route, amber for delayed, red for late, violet for experiments, teal
for something else. **[scan]**
*Instead:* one accent for the one thing that needs attention, and state shown
by shape, position, weight and words as much as by hue. Status colour is
allowed; status confetti is not. See color.md, "Status".

**Sidebar by default.** A 260px sidebar for an app with four screens.
*Instead:* choose the shell from the work (layout.md, "Shells"): a top bar
for few sections, a sidebar for many, a canvas for spatial work, a command
bar for keyboard users, a split view for queues.

**Avatar initials everywhere.** Circles of two letters in every row.
*Instead:* names, in text. Faces when the product has real photos.

**Undesigned states.** Only the happy path exists.
*Instead:* design the empty, loading, error, offline, permission-denied and
"10,000 rows" states as part of the core screen (app.md).

## 3. Typography

**The default reach fonts.** **[scan]** Inter, Geist, Poppins, Manrope, DM
Sans, Plus Jakarta Sans, Space Grotesk, Outfit, Sora for UI; **Instrument
Serif** and **Fraunces** for "editorial"; JetBrains Mono and Geist Mono for
"technical". They are good fonts. They are the fonts that mean nobody chose.
*Instead:* type.md has a long list of faces grouped by voice, with reasons.
Choose a face whose voice is the concept's voice, and write the reason down.

**The italic accent word.** One word of the headline in italic, in the accent
colour. It was a good idea in 2023; now it is the signature of generated
pages.
*Instead:* if emphasis is needed, earn it with the sentence itself. If the
concept really is editorial, emphasis in the same colour, same family, and
only where a speaker would stress the word.

**Mono eyebrows.** Letter-spaced uppercase mono labels over every section,
often numbered "01 —", plus coordinates and a live local-time clock in the
header. **[scan]**
*Instead:* at most one label per screen, and only when it carries information.
A section heading usually carries itself.

**Flat scale or a scale with no steps.** **[scan]** Body 16, everything else
14 to 20; or 28 distinct sizes.
*Instead:* six to eight steps with real contrast, written as tokens. type.md.

**Loose display type.** **[scan]** 80px set at default tracking.
*Instead:* tighten as size grows; check the face's own spacing first.

**Tiny metadata.** **[scan]** 9 to 11px labels in grey.
*Instead:* 12px is the floor for anything someone needs to read; 13 to 14
for app metadata.

**Lines 100 characters long.** **[scan]**
*Instead:* 45 to 75 characters for reading text.

## 4. Colour

**Warm paper and ink with one forest-green or vermilion accent.** The Paper
Edition palette. Fine once; a uniform now.
*Instead:* color.md: derive the palette from the concept's world (a material,
a place, a printed object, a time of day). The ground is a decision, not
"warm off-white".

**Indigo-to-violet gradients, gradient text, glows, blobs.** **[scan]**
*Instead:* flat colour from the concept. Light only where it belongs to a
scene (a photo, an illustration).

**Grey on grey.** **[scan]** `#71717A` on white or on `#0B0B0C`.
*Instead:* measure. Secondary text still passes 4.5:1.

**One radius for everything.** **[scan]** `rounded-2xl` on every box.
*Instead:* the radius family follows the concept (sharp, soft, pill,
mixed by role) and nests concentrically.

**Shadows on everything, glass on everything.** **[scan]**
*Instead:* one or two elevation levels for things that actually float.

## 5. Imagery and icons

**No imagery, or the floating product card.** Every page's only picture is
a white rounded card mocking the product.
*Instead:* imagery.md. Photography with an art direction, illustration in
one hand, the product's real data as the image, a colour field, or a
material. The product card is fine when the product *is* the visual, but it
should be big, real and doing something, not a decoration.

**Placeholder and stock.** **[scan]** placehold.co, picsum, pravatar,
source.unsplash.com (dead), the smiling laptop woman, the latte.
*Instead:* the user's own photos, generated images with one art direction,
or a designed field with a real caption.

**Default icons at default weight.** **[scan]** 24 Lucide icons at 2px stroke
beside 15px text.
*Instead:* fewer icons. Where they stay, match stroke to the text weight and
size, and use one set.

**Emoji in the interface.** **[scan]** ✨ 🚀 🔥 ✓ as icons or in copy.

## 6. Copy

**Marketing voice.** **[scan]** supercharge, seamless, unlock, elevate,
all-in-one, built for modern teams, "say goodbye to", "ready to get started".
**The newer tell:** the clever two-beat headline ("Send the invoice. Get
paid.", "Be in the meeting. Not in your notes.", "Quiet buildings, made to
weather well."). Every generated hero is now a two-beat aphorism.
*Instead:* copy.md. Say the specific thing a customer would say to a friend.
Sometimes the best headline is the product's name and what it is.

**Placeholder people and companies.** **[scan]** Acme, John Doe, Sarah
Johnson, Northwind. (Northwind appeared in two of six baselines.)

**Small print under every button.** "No credit card required. Cancel
anytime." Only when it answers a real fear on this page.

**Em dashes everywhere.** **[scan]** The punctuation of generated prose.

## 7. Motion

**Fade-up on scroll for every block.** The page is invisible until JavaScript
reveals it; a slow observer or a screenshot shows blank sections. **[scan]**
*Instead:* content visible by default; animate what changes state, and maybe
one entrance. See motion.md.

**Marquees.** Infinite logo or text tickers. **[scan]** for reduced motion
in the matrix.

**Hover lift on every card.** translateY(-4px) and a bigger shadow.
*Instead:* hover states that say what clicking will do.

## 8. The overcorrection

An anti-slop process has its own slop. Told "not generic", models reach for
**the studio portfolio**: off-white paper, a giant serif or grotesk headline,
mono uppercase labels with numbers ("01 — Work"), coordinates and a live
clock in the header, hairline rules everywhere, a technical line drawing,
one rust accent, no photographs. The studio-site baseline above came out
exactly like this, and so did the first version of App Designer (grey
paper, mono, one red). It is clever once and a house style the second time.

This happens because every anti-slop cure subtracts (no gradients, no
cards, no icons, no colour), and subtraction ends at a wireframe with good
fonts. Great sites are not austere. Apple's product pages are image-led and
loud. Stripe Press is lush. Teenage Engineering is a toy shop. Linear's site
moves. Specificity is the goal; restraint is one tool.

**The second rut: the board.** Asked for a concept, models reach for the
transit board: a split-flap departure board, a timetable, a signal box, a
T-card planning board. In testing, two independent runs given the same
invoicing brief both shipped "a station departure board"; a coffee run
proposed "a departures board for this week's roasts"; a dispatch run
proposed "a railway signal box". It is a good idea once. It is not a
concept for everything that has rows.

So:

- The three explorations in Step 2 must differ on ground, type, richness
  and grammar. At most one may be "paper and ink".
- Every page carries a **richness source** on its first screen (imagery.md):
  photography, illustration, a colour field, a material, a 3D object, or the
  product's own live data. Type alone on paper is not one.
- If the result is off-white, serif, mono labels and one warm accent, stop
  and justify it in writing against the other two explorations.

## 9. The tests

1. **The swap test.** Put a competitor's logo on it. Does anything look
   wrong? If not, the direction has not reached the page.
2. **The squint test.** Blur your eyes. One thing lands first on every
   screen, and it is the right thing.
3. **The face test.** Count features shared with the four faces above.
   Three or more: rework.
4. **The specificity test.** Point at any value (a colour, a size, a gap, a
   word). Can you say why it is that and not the default?
5. **The screenshot test.** Would a designer screenshot this and post it?
   What would they say about it?
6. **The subtraction test.** Remove a section. Did the page get worse? If
   not, leave it out.
