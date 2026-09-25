# Verifying an isometric animation

A green test or a clean console is not "done". Every bug below was visible in the page and only caught by looking at the whole timeline or by a scripted scan. Do all of this before handing over.

## 1. Expose time

The page must have `window.freeze(t)` (hold the clock at `t`, `freeze(null)` resumes) and render everything from `state(t)`. Expose the loop length and any key times (`window.PIT_TIMES = { LAP, T_BOX, IN }`) so scripts can target moments.

## 2. Contact sheets of the whole loop

```sh
uv run scripts/shoot.py page.html --times 0:LOOP:0.15 --selector '#panel svg' --cols 6 --cell 400 --out /tmp/loop.png
```

Read the sheet. Then zoom strips (`--times a,b,c --cell 900`) on anything suspicious: moments where two objects are close, entries and exits, the loop seam. For interaction-driven pages, pass `--js` that sets the state directly (the filing cabinet: `--js "(DRAWERS[1].p = {t} * 50, DRAWERS.forEach(drawDrawer))"`).

## 3. Scripted checks (run with `--check` or in a browser console)

Each check below caught a real bug. Write the check, then **confirm it fails on the broken version** (re-run it with the old parameter) so a zero means something.

- **Moving object vs props**: for every `t` in the loop while the object moves, test footprint overlap (u-interval and d-interval) between it and every prop in its lane. Caught: the car driving through the rear jack after only the front jack was fixed.
- **Streamlines never cross**: sample every line's y at every x over a lap; line `i+1` (higher) must stay above line `i`. Caught: a violent wake tangling lines; the check reported 507 crossings on the old wake and 0 after.
- **Monotonic motion**: for each moving thing, its track index must never go backwards and must cover the expected distance per lap. Caught: car 23 creeping backwards along 9% of a straight because a lap fraction didn't wrap.
- **Range asserts in code**: `if (!(share > 0.5 && share < 1)) console.error(...)`. `shoot.py` fails on console errors, so these gate every run.
- **Order churn**: count how often a ranking changes per lap. 23 swaps per lap meant the timing tower would slide constantly; ranking by race time brought it to one overtake every ~40 s.
- **Pop-in**: largest per-frame jump in any object's opacity or position. A jump of 1.0 found rivals appearing mid-pit-lane.
- **Occupancy**: how many objects share a space at once (cars in the pit lane). A histogram showed 3–4 at once, which read as silly on the map.
- **Loop seam**: `state(0)` equals `state(LOOP)` for every visible value.

## 4. Known screenshot traps

- CSS transitions: rows caught mid-slide look like overlapping text. Wait longer than the transition before the shot.
- `IntersectionObserver` skips offscreen panels, so a full-page screenshot shows stale panels. Call each panel's frame function before shooting.
- `preserveAspectRatio="meet"` shows beyond the viewBox on wide screens; check at 1440×900 and at a phone width (390×844).

## 5. Look at it live

Open the file in the user's actual browser once, and watch a full loop at normal speed and at ¼ speed. Motion problems (speed, jerk, things lingering) don't show in stills.
