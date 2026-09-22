#!/bin/bash
# Unattended daily brief for one project. Called by the LaunchAgent that
# install-schedule.sh writes; safe to run by hand:  run-scheduled.sh <project_dir>
set -uo pipefail

PROJECT="${1:?usage: run-scheduled.sh <project_dir>}"
LOGDIR="$HOME/Library/Logs/morning-debrief"
mkdir -p "$LOGDIR"
LOG="$LOGDIR/$(date +%Y-%m-%d).log"
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# Only the tools the skill actually needs. No blanket permission bypass.
ALLOWED='Skill,Read,Write,Edit,Glob,Grep,TodoWrite,
mcp__slackhub__recent,mcp__slackhub__unreads,mcp__slackhub__search,mcp__slackhub__digest,
mcp__granola__list_meetings,mcp__granola__get_meetings,mcp__granola__query_granola_meetings,
Bash(slackhub sync),Bash(python3 *),Bash(node *),Bash(npm *),Bash(date *),Bash(ls *),Bash(cat *),
Bash(head *),Bash(tail *),Bash(grep *),Bash(git log *),Bash(git status *),Bash(open *),Bash(cp *),Bash(mkdir *),
Bash(gcloud projects get-iam-policy *),Bash(gcloud auth print-access-token)'
ALLOWED="${ALLOWED//$'\n'/}"

cd "$PROJECT" || exit 1
{
  echo "=== $(date '+%F %T %Z') — morning-debrief for $PROJECT"
  claude -p "Use the morning-debrief skill to build today's brief for this project. Follow its config file and house rules, render the page, and open it when it's done." \
    --allowedTools "$ALLOWED" 2>&1
  echo "=== exit $? at $(date '+%T')"
} >> "$LOG" 2>&1

# Open the newest brief even if Claude did not (e.g. it ran out of allowed tools).
BRIEF="$(ls -t "$PROJECT"/docs/briefs/*.html "$PROJECT"/briefs/*.html 2>/dev/null | head -1)"
[ -n "$BRIEF" ] && open "$BRIEF"
