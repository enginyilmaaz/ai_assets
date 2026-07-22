#!/usr/bin/env bash
# Claude Code Stop hook — when a tool-using turn ends, speak "<task> tamamlandı"
# via edge-tts, where <task> is the conversation's clean auto-title (aiTitle) so you
# can tell WHICH task finished when several run at once. Falls back to a cached
# generic "Görev tamamlandı." clip when there is no title or synthesis fails
# (offline). Plain chat replies stay silent. Voice: tr-TR-AhmetNeural.
#
# To change the voice, edit VOICE and delete the cached generic mp3 so it regenerates.

VOICE="tr-TR-AhmetNeural"
GENERIC_MP3="$HOME/.claude/hooks/task-done.mp3"
EDGE_TTS="$HOME/.local/bin/edge-tts"

# Stop-hook payload arrives as JSON on stdin; pull out the transcript path.
INPUT="$(cat 2>/dev/null || true)"
TRANSCRIPT="$(printf '%s' "$INPUT" | python3 -c 'import sys, json
try:
    print(json.load(sys.stdin).get("transcript_path", ""))
except Exception:
    print("")' 2>/dev/null || true)"

[ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ] || exit 0

# One pass over the transcript: line 1 = did the last turn use a tool (1/0);
# line 2 = latest conversation auto-title (may be empty).
OUT="$(python3 - "$TRANSCRIPT" <<'PY' 2>/dev/null
import sys, json

rows = []
with open(sys.argv[1], encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line:
            try:
                rows.append(json.loads(line))
            except Exception:
                pass


def is_human(r):
    if r.get("type") != "user":
        return False
    c = r.get("message", {}).get("content")
    if isinstance(c, str):
        return True
    if isinstance(c, list):
        return not any(isinstance(b, dict) and b.get("type") == "tool_result" for b in c)
    return False


start = 0
for i in range(len(rows) - 1, -1, -1):
    if is_human(rows[i]):
        start = i
        break

used = False
for r in rows[start:]:
    if r.get("type") == "assistant":
        c = r.get("message", {}).get("content")
        if isinstance(c, list) and any(
            isinstance(b, dict) and b.get("type") == "tool_use" for b in c
        ):
            used = True
            break

title = ""
for r in rows:
    if r.get("type") == "ai-title" and r.get("aiTitle"):
        title = str(r["aiTitle"]).strip()

print("1" if used else "0")
print(title)
PY
)"

USED="$(printf '%s\n' "$OUT" | sed -n '1p')"
LABEL="$(printf '%s\n' "$OUT" | sed -n '2p')"
[ "$USED" = "1" ] || exit 0

# Preferred: synthesise "<task> tamamlandı" for the current title (needs network).
if [ -n "$LABEL" ]; then
  TMP="$HOME/.claude/hooks/.dyn-$$.mp3"
  if "$EDGE_TTS" --voice "$VOICE" --text "$LABEL tamamlandı." --write-media "$TMP" >/dev/null 2>&1 && [ -s "$TMP" ]; then
    { paplay "$TMP" >/dev/null 2>&1; rm -f "$TMP"; } &
    exit 0
  fi
  rm -f "$TMP" 2>/dev/null
fi

# Fallback: cached generic clip (offline-safe; regenerated on first miss).
[ -s "$GENERIC_MP3" ] || "$EDGE_TTS" --voice "$VOICE" --text "Görev tamamlandı." --write-media "$GENERIC_MP3" >/dev/null 2>&1 || exit 0
paplay "$GENERIC_MP3" >/dev/null 2>&1 &
exit 0
