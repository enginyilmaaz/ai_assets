#!/usr/bin/env bash
# UserPromptSubmit hook — starts the long-task interim announcer for this turn.
# The Stop hook kills it when the turn ends. Pure bash, zero Claude tokens.

HOOKDIR="$HOME/.claude/hooks"
INPUT="$(cat 2>/dev/null || true)"
META="$(printf '%s' "$INPUT" | python3 -c 'import sys, json
try:
    d = json.load(sys.stdin)
    print((d.get("session_id") or "") + "\t" + (d.get("transcript_path") or ""))
except Exception:
    print("\t")' 2>/dev/null || printf '\t')"
SESSION="${META%%$'\t'*}"
TRANSCRIPT="${META##*$'\t'}"
[ -n "$SESSION" ] || exit 0

PIDFILE="$HOOKDIR/.interim-$SESSION.pid"
# Safety: stop any leftover timer from a previous turn of this session.
[ -f "$PIDFILE" ] && kill "$(cat "$PIDFILE" 2>/dev/null)" 2>/dev/null
rm -f "$PIDFILE"

setsid bash "$HOOKDIR/interim-notify.sh" "$SESSION" "$TRANSCRIPT" >/dev/null 2>&1 < /dev/null &
exit 0
