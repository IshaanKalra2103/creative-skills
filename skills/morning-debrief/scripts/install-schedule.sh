#!/bin/bash
# install-schedule.sh <project_dir> <HH> <MM> [weekdays|daily]
# install-schedule.sh <project_dir> --remove
set -euo pipefail

PROJECT="$(cd "${1:?usage: install-schedule.sh <project_dir> <HH> <MM> [weekdays|daily]}" && pwd)"
SLUG="$(basename "$PROJECT" | tr '[:upper:] ' '[:lower:]-')"
LABEL="com.$(id -un).morning-debrief.$SLUG"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
RUNNER="$HOME/.claude/skills/morning-debrief/scripts/run-scheduled.sh"

if [ "${2:-}" = "--remove" ]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"; echo "removed $LABEL"; exit 0
fi

HH="${2:?hour}"; MM="${3:?minute}"; WHEN="${4:-weekdays}"
chmod +x "$RUNNER"

days=""
if [ "$WHEN" = "weekdays" ]; then
  for d in 1 2 3 4 5; do
    days="$days
    <dict><key>Weekday</key><integer>$d</integer><key>Hour</key><integer>$HH</integer><key>Minute</key><integer>$MM</integer></dict>"
  done
else
  days="
    <dict><key>Hour</key><integer>$HH</integer><key>Minute</key><integer>$MM</integer></dict>"
fi

cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$RUNNER</string><string>$PROJECT</string></array>
  <key>StartCalendarInterval</key><array>$days
  </array>
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/morning-debrief/launchd.out.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/morning-debrief/launchd.err.log</string>
</dict></plist>
PLISTEOF

mkdir -p "$HOME/Library/Logs/morning-debrief"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "installed $LABEL — $WHEN at $HH:$MM for $PROJECT"
echo "run now:  launchctl kickstart -k gui/$(id -u)/$LABEL"
