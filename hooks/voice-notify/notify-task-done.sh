#!/usr/bin/env bash
# Claude Code Stop hook — speak a short Turkish announcement when a tool-using turn
# ends. The announcement is topic + task-type aware: Claude writes a one-line summary
# to $HOOKDIR/.turn-summary during the turn (e.g. "ERP log araştırması tamamlandı",
# "X debug edildi", "soru cevaplandı"); this hook speaks it and deletes it. If no
# summary was written (Claude forgot, or a plain non-summarised turn), it falls back
# to "«conversation auto-title» tamamlandı", and offline it falls back to a cached
# generic clip. Also stops the long-task interim timer for this session.
#
# Voice: tr-TR-AhmetNeural.

VOICE="tr-TR-AhmetNeural"
HOOKDIR="$HOME/.claude/hooks"
GENERIC_MP3="$HOOKDIR/task-done.mp3"
SUMMARY="$HOOKDIR/.turn-summary"
EDGE_TTS="$HOME/.local/bin/edge-tts"

INPUT="$(cat 2>/dev/null || true)"
META="$(printf '%s' "$INPUT" | python3 -c 'import sys, json
try:
    d = json.load(sys.stdin)
    print((d.get("transcript_path") or "") + "\t" + (d.get("session_id") or ""))
except Exception:
    print("\t")' 2>/dev/null || printf '\t')"
TRANSCRIPT="${META%%$'\t'*}"
SESSION="${META##*$'\t'}"

# Turn ended → stop this session's long-task interim timer (kill the whole process
# group, since it runs under setsid, so the sleeping child dies too).
if [ -n "$SESSION" ]; then
  PIDFILE="$HOOKDIR/.interim-$SESSION.pid"
  if [ -f "$PIDFILE" ]; then
    IPID="$(cat "$PIDFILE" 2>/dev/null)"
    rm -f "$PIDFILE"
    [ -n "$IPID" ] && kill -TERM "$IPID" 2>/dev/null
  fi
fi

# Gate: only announce for turns that actually used a tool.
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
if [ "$USED_TOOL" != "1" ]; then rm -f "$SUMMARY"; exit 0; fi

# 1) Preferred: the one-line summary Claude wrote this turn (topic + type aware).
TEXT=""
if [ -s "$SUMMARY" ]; then
  TEXT="$(head -c 220 "$SUMMARY" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g; s/^ //; s/ $//')"
fi
rm -f "$SUMMARY"

# 2) Fallback: the conversation auto-title + "tamamlandı".
if [ -z "$TEXT" ] && [ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ]; then
  LABEL="$(python3 - "$TRANSCRIPT" <<'PY' 2>/dev/null
import sys, json
title = ""
with open(sys.argv[1], encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line: continue
        try: r = json.loads(line)
        except Exception: continue
        if r.get("type") == "ai-title" and r.get("aiTitle"):
            title = str(r["aiTitle"]).strip()
print(title)
PY
)"
  [ -n "$LABEL" ] && TEXT="$LABEL tamamlandı."
fi
[ -z "$TEXT" ] && TEXT="Görev tamamlandı."

# Synthesise + play (dynamic). Offline → cached generic clip.
TMP="$HOOKDIR/.dyn-$$.mp3"
if "$EDGE_TTS" --voice "$VOICE" --text "$TEXT" --write-media "$TMP" >/dev/null 2>&1 && [ -s "$TMP" ]; then
  { paplay "$TMP" >/dev/null 2>&1; rm -f "$TMP"; } &
  exit 0
fi
rm -f "$TMP" 2>/dev/null
[ -s "$GENERIC_MP3" ] || "$EDGE_TTS" --voice "$VOICE" --text "Görev tamamlandı." --write-media "$GENERIC_MP3" >/dev/null 2>&1 || exit 0
paplay "$GENERIC_MP3" >/dev/null 2>&1 &
exit 0
