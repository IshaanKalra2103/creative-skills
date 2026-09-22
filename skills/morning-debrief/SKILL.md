---
name: morning-debrief
description: Make a daily "brief" page for a project — one self-contained HTML file with a painting header, a greeting, the one thing to push forward, top to-dos, what's waiting on others, what changed, the day's schedule, and what's coming — pulled from the project's real sources (Slack via slackhub, Granola, calendar, git, local checklists and run logs). Use when the user asks for a morning brief/debrief, a daily brief, "what's my day look like on <project>", or when a scheduled run invokes /morning-debrief. Project-agnostic; per-project sources live in a config file.
---

# Morning debrief

One HTML page a person reads in two minutes and knows what to do next. The page's code
(`assets/template.html`) is fixed; **the only thing you write is the brief's JSON**, then
`scripts/render.py` pours it into the template, embeds a public-domain painting, and writes
one self-contained file (no network needed to open it).

## 1. Find the project config

Look, in order, for `.claude/morning-debrief.md`, `morning-debrief.md`, or
`docs/morning-debrief.md` under the current project. It names:

- **project** — the name on the page ("Atlas"), and who it's for (first name).
- **sources** — which of the kinds below to read, with project-specific details (Slack
  workspace name, which folders hold notes/checklists/run logs, which calendar keyword).
- **output** — folder for `YYYY-MM-DD.html` + `YYYY-MM-DD.json` (default `briefs/`).
- **house rules** — anything the project insists on (e.g. "log every change", people's
  pronouns, tone).

No config → ask once for project name, sources and output folder, then write the config so
the next (possibly unattended) run doesn't need to ask.

## 2. Gather — only what's real

Read each configured source. Skip a source that isn't reachable and say so in the brief's
`gaps` list; never fill a gap with a guess.

| Kind | How |
|---|---|
| Slack | `slackhub sync` (CLI), then slackhub MCP `unreads` / `recent` / `search` scoped to the configured workspace. Note who is waiting on a reply. |
| Meeting notes | Granola MCP `list_meetings` (since the last brief) → `get_meetings` for the relevant ones; also any exported notes folder. |
| Calendar | Calendar MCP `list_events` for today and tomorrow — **check the account is the user's** (the calendar's summary/email); if it isn't, record a gap. |
| Checklists / action items | The project's to-do files (e.g. `CHECKLIST_<date>.md`, `ACTION_ITEMS.md`); carry forward the open ones. |
| Work done | `git log --since` in the project's repos, change logs, run logs. |
| Previous brief | Last `YYYY-MM-DD.json` in the output folder — for "new since last time" and to avoid repeating stale items. |

Convert every relative date to an absolute one. Times in the user's local zone.

## 3. Write the brief JSON

Schema (all sections optional except `greeting`; omit empty ones):

```json
{
  "meta": {"project": "Atlas", "person": "Sam", "generated_at": "2026-09-22T14:00:00-04:00"},
  "greeting": "One or two sentences, warm and specific: what kind of day it is and the one thing that matters.",
  "push_forward": {"title": "The single highest-value next move", "body": "Why now, in 1-2 sentences.",
                   "prompt": "A ready-to-paste instruction for Claude that does it."},
  "top_todos": [{"id": "stable-slug", "label": "Area", "title": "Do the thing", "body": "Context: why, due, who asked.",
                 "source": {"name": "Slack", "url": "https://…"}}],
  "waiting_on": [{"who": "Platform team", "what": "the database role the deploy needs", "since": "2026-09-21", "note": "Follow up if nothing by 3pm"}],
  "new_updates": [{"tag": "Run", "title": "What changed", "body": "One or two sentences.", "bullets": ["optional detail"],
                   "source": {"name": "REPORT.md", "url": "file:///…"}}],
  "your_day": [{"time": "3:30 PM", "end_time": "4:30 PM", "title": "Meeting", "note": "What to bring.",
                "prep_prompt": "Prep me for …"}],
  "looking_ahead": [{"when": "Fri 25 Sep", "title": "…", "body": "…"}],
  "explainer": {"src": "YYYY-MM-DD-explainer.mp4", "caption": "One line on what the film shows."},
  "gaps": ["Calendar: connected account isn't the user's, so the schedule comes from …"],
  "sources": [{"name": "Slack", "url": "https://app.slack.com/client"}]
}
```

Rules:
- **3–5 top to-dos**, ordered by what unblocks the most. The rest stays in the checklist.
- Every to-do and update **cites a source** (URL or `file://` path). No source → leave it out.
- `push_forward.prompt` and `prep_prompt` must be concrete enough to run as-is.
- Plain words, short sentences. No hype, no filler, no emoji.
- Refer to people as the config says; if pronouns aren't stated, use they/them or names.
- Don't invent meetings, deadlines, or replies. Unknown → `gaps`.

Save it as `<output>/YYYY-MM-DD.json`.

## 4. Render and open

```bash
python3 ~/.claude/skills/morning-debrief/scripts/render.py <output>/YYYY-MM-DD.json <output>/YYYY-MM-DD.html
open <output>/YYYY-MM-DD.html      # interactive runs, and scheduled runs
```

The page's type is Newsreader (Google Fonts) over the system sans, on #F7F7F7 with a
yellow accent — a close, freely-licensed match for the look of Dia's brief. It uses no
one else's fonts, logo or name.

`render.py` picks the day's painting from `assets/paintings.json` (public domain, via
Wikimedia Commons), caches and downsizes it, and embeds it; with no network it falls back
to a painted gradient. To-do checkboxes remember their state in the browser per day.

Then follow the project's house rules (e.g. add a change-log line) and reply with the file
path plus the push-forward item in one line.

## 4b. The 10-second explainer (only if the config asks for one)

A short hand-drawn film of the day, embedded above "What's new". Use the
`hand-drawn-canvas-animation` skill and keep a reusable workspace so npm and the
render script are installed once:

```bash
F=~/.cache/morning-debrief/film        # core.js, render.mjs, package.json, node_modules
node render.mjs <film>.html --grid 24 --ar 16:9     # look before rendering everything
node render.mjs <film>.html --ar 16:9               # writes out/<film>-final.mp4 (with score)
```

Shape that works for a daily brief: 5 hard cuts in 10 s (24/30/27/24/15 drawn frames),
one *anchor* object in every shot, the day's three numbers as the story (a pile → a
filter → what's still missing), one blueprint interlude, and `signOff` at the end. Short
hand labels are allowed here (at most three words a shot) — an explainer needs its
numbers. Keep every cue time on the 1/12 s grid. Copy the mp4 next to the brief and put
its file name in `explainer.src`.

## 5. Run it on a schedule (macOS)

`scripts/install-schedule.sh <project_dir> <HH> <MM> [weekdays|daily]` writes a LaunchAgent
that runs `scripts/run-scheduled.sh <project_dir>` at that time. The runner calls
`claude -p` in the project with a fixed allow-list (read/write files, slackhub, Granola,
calendar, python, git log, open) — no blanket permission bypass — logs to
`~/Library/Logs/morning-debrief/`, and opens the brief when done.
`scripts/install-schedule.sh <project_dir> --remove` uninstalls it.
