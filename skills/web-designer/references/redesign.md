# Redesigning an existing site or app

A redesign replaces a look, not a business. Before Step 1, add a
`## Current` section to DIRECTION.md.

## 1. Capture it

- **Live URL:** `node <skill>/scripts/shoot.mjs https://example.com --out shots/before --full`
  then `node <skill>/scripts/matrix.mjs https://example.com --out shots/before/matrix`.
  For more pages, shoot each important URL (home, pricing, a product, the
  app's core screen).
- **A repo:** run its dev server and shoot `http://localhost:<port>/…`.
- **Only screenshots:** read them, and rebuild the core screen as
  `before.html` if you need to measure it.
- Logged-in apps: ask the user for a dev or staging URL, or a test account;
  never ask for production credentials in chat.

## 2. Audit it

- Which slop face(s) does it wear (slop.md)? List the scan's FAILs and the
  matrix's FAILs. These are free wins to show the user.
- What works and must survive: a strong photo, a clever line, a feature
  people use, brand equity (the logo, the name, a colour people recognise).

## 3. Inventory: keep / lose / unknown

Every page, section, feature, data point and asset. The keep list is a
contract: the redesign must contain every item on it, checked off in the
report. Unknowns become questions for the user.

## 4. Harvest

Logo (SVG if possible), product photos, brand colours actually in use,
fonts actually loaded, real copy, real numbers, real testimonials. Use them
before inventing anything.

## 5. Decisions for the user

Changes to the name, the logo, the navigation structure, the pricing
presentation, the removal of a page or feature: list them as decisions, do
not make them silently.

## 6. The new direction

The current look counts as a **history row** for this project: the new
direction must differ from it on at least 4 of the 6 look columns
(`history.mjs check "<new>" --vs "<old>"`) (unless the
user wants an evolution, in which case say which columns you keep and why).

## 7. Before/after

`before-after.html`: the old and new first screens side by side at desktop
and phone, plus a short table of scan and matrix results before and after.
Shoot it like everything else. This is the deliverable people share.
