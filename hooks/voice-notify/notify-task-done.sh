#!/usr/bin/env bash
# Claude Code Stop hook — play a short notification sound when a tool-using turn ends.
# Plays a fixed clip (notification.mp3, installed next to this script). Gated on tool
# use: plain (no-tool) chat replies stay silent. No text-to-speech — just the chime.

HOOKDIR="$HOME/.claude/hooks"
SOUND="$HOOKDIR/notification.mp3"

INPUT="$(cat 2>/dev/null || true)"
TRANSCRIPT="$(printf '%s' "$INPUT" | python3 -c 'import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get("transcript_path") or "")
except Exception:
    print("")' 2>/dev/null || true)"

# Gate: only chime for turns that actually used a tool.
USED_TOOL=0
if [ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ]; then
  USED_TOOL="$(python3 - "$TRANSCRIPT" <<'PY' 2>/dev/null
import sys, json
rows = []
with open(sys.argv[1], encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line:
            try: rows.append(json.loads(line))
            except Exception: pass
def is_human(r):
    if r.get("type") != "user": return False
    c = r.get("message", {}).get("content")
    if isinstance(c, str): return True
    if isinstance(c, list):
        return not any(isinstance(b, dict) and b.get("type") == "tool_result" for b in c)
    return False
start = 0
for i in range(len(rows) - 1, -1, -1):
    if is_human(rows[i]): start = i; break
for r in rows[start:]:
    if r.get("type") == "assistant":
        c = r.get("message", {}).get("content")
        if isinstance(c, list) and any(isinstance(b, dict) and b.get("type") == "tool_use" for b in c):
            print(1); break
else:
    print(0)
PY
)"
fi
[ -n "$USED_TOOL" ] || USED_TOOL=0
[ "$USED_TOOL" = "1" ] || exit 0

# Play the notification sound (background, non-blocking). paplay handles mp3 via libsndfile.
[ -s "$SOUND" ] || exit 0
paplay "$SOUND" >/dev/null 2>&1 &
exit 0
