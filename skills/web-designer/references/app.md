# Web apps

A web app is used, not visited. Someone spends hours in it. Design for the
hundredth session, not the first impression.

## 1. The core screen is the work

Ask: what does this person open the app to **do**, every day, in the next ten
seconds? That job owns the screen.

- A clinic receptionist: check people in and see who is waiting too long.
  The screen is today's arrivals in order, with the late ones raised; the
  day's numbers are one quiet line in the header.
- A newsroom editor: decide what runs next. The screen is the story queue
  and the slot it is heading for; the "stats" are filters ("late copy: 3").
- An accountant: reconcile. The screen is the unmatched transactions.

(These show the size of the decision. Do not reuse them: find the job in
your own brief.)

Metrics belong in a report screen, or as a sentence ("4 waiting over 20
minutes, 2 no-shows"), not as a row of cards (slop.md face 3).

## 2. Information design

- **Tables are the workhorse.** Left-align text, right-align numbers,
  tabular figures, a sticky header, column widths from the content, row
  height from the density setting, the primary column (the name) in the
  strongest weight. Truncate with an ellipsis and a full value on hover or
  focus; never wrap a status into four lines.
- **One primary per row.** The action you most often take on a row is the
  only button visible; the rest live in a menu or appear on hover and focus.
- **State is shown, not decorated** (color.md §5): a word and a shape, and
  hue only for what needs attention.
- **Time is relative near now, absolute far away** ("12 min ago",
  "Tue 14 Oct"), with the absolute time on hover.
- **Names, not avatars**, unless there are real photos.

## 3. The states nobody designs

Design every one of these on the core screen, in DIRECTION.md and in code:

| State | Do |
|---|---|
| **Empty (first run)** | One sentence of what will appear here and one action that makes it appear. Optionally a sample to load. |
| **Empty (filtered)** | "No flags match 'paymnt'." plus a way to clear the filter. |
| **Loading** | Skeletons that match the real layout, only after ~300ms; never a spinner in the middle of a blank page. |
| **Partial / slow** | Show what has arrived; mark what is stale ("updated 2 min ago"). |
| **Error** | What happened, in plain words, what the user can do, and a retry. Keep their input. |
| **Offline** | A banner, and what still works. |
| **Permission** | Why they cannot, and who can. |
| **Overflow** | The 10,000-row table, the 80-character name, the German label, the 7-digit number. Test with stress content (the matrix's l10n pass). |
| **Destructive** | Undo over "Are you sure?" where possible; a confirm with the object's name where not. |

## 4. Interaction

- **Keyboard first-class:** every action reachable by Tab; visible focus
  **[scan]**; shortcuts for frequent actions, shown in tooltips and menus; a
  command palette (⌘K / Ctrl+K: show the right modifier per OS) when there
  are many actions.
- **Optimistic UI** for safe actions, with undo; confirmation for dangerous
  ones in production contexts.
- **Forms:** labels above fields **[scan]**, inline validation after the
  field is left, errors that say how to fix, the submit button never
  disabled without saying why.
- **Toasts** for confirmations that need an undo; never for errors that need
  action.
- **URLs are state:** filters, tabs and the selected item live in the URL,
  so a view can be shared and the back button works.

## 5. Look

An app's direction (directions.md, "Web-app directions") lives in:

- the **surface** (one ground, maybe one raised level, hairlines),
- the **type** (one excellent UI face, perhaps a mono for data; 13 to 14px
  body),
- the **accent** (one, for the primary action or "needs you now"),
- the **material of the controls** (flat, bordered, tactile),
- one **signature moment** where the product's personality shows (a job
  being assigned slides along the route on the map; a flag rollout fills
  like a dial).

Everything else is calm, so the user's content is the loudest thing on screen.

## 6. Check

`shoot.mjs --app` (dense thresholds), at 1440 and 1280 for the desk, 768 for
the tablet, 390 for the phone. Decide explicitly what the phone version is
(a read-only companion, a triage view, the full app) and design that.

**Make every state reachable by URL** (`?state=empty`, `?state=error`,
`?state=offline`, `?rows=10000`), so each can be shot and scanned like a
page: `shoot.mjs "http://localhost:5173/?state=empty" --app --out shots/r1-empty`.
Interactions (the signature, a toast, a drawer) go through `filmstrip.mjs
--click`. An app's content cannot be visible without JavaScript; give it a
`<noscript>` line that says so.
