#!/usr/bin/env bash
# Long-task interim announcer. Spawned at turn start by interim-start.sh (a
# UserPromptSubmit hook) and killed by the Stop hook when the turn ends. Every
# INTERVAL seconds while the turn is still running it announces
# "«topic» hala çalışıyor, şu an «activity»" via edge-tts. Pure bash — no LLM,
# zero Claude tokens.
#
# Args: $1 = session_id, $2 = transcript_path

VOICE="tr-TR-AhmetNeural"
HOOKDIR="$HOME/.claude/hooks"
EDGE_TTS="$HOME/.local/bin/edge-tts"
SESSION="$1"
TRANSCRIPT="$2"
INTERVAL="${INTERIM_INTERVAL:-600}"   # 10 minutes
PIDFILE="$HOOKDIR/.interim-$SESSION.pid"

[ -n "$SESSION" ] || exit 0
echo $$ > "$PIDFILE"
SLEEP_PID=""
# `sleep & wait` so a SIGTERM interrupts the wait and the trap fires immediately
# (a bare `sleep` would delay the trap until it finished). Clean up + exit on signal.
trap 'rm -f "$PIDFILE" 2>/dev/null; [ -n "$SLEEP_PID" ] && kill "$SLEEP_PID" 2>/dev/null; exit 0' TERM INT HUP

while true; do
  sleep "$INTERVAL" & SLEEP_PID=$!
  wait "$SLEEP_PID" 2>/dev/null
  [ -f "$PIDFILE" ] || exit 0          # Stop hook removed it → turn ended
  [ -f "$TRANSCRIPT" ] || continue

  TEXT="$(python3 - "$TRANSCRIPT" <<'PY' 2>/dev/null
import sys, json
rows = []
with open(sys.argv[1], encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line:
            try: rows.append(json.loads(line))
            except Exception: pass
title = ""
for r in rows:
    if r.get("type") == "ai-title" and r.get("aiTitle"):
        title = str(r["aiTitle"]).strip()
ACT = {"Edit": "dosya düzenleniyor", "Write": "dosya yazılıyor", "Read": "dosya okunuyor",
       "Bash": "komut çalıştırılıyor", "Grep": "kod aranıyor", "Glob": "dosya aranıyor",
       "Task": "alt görev çalışıyor", "Agent": "alt görev çalışıyor", "Workflow": "iş akışı çalışıyor",
       "WebFetch": "web'den veri çekiliyor", "WebSearch": "web araması yapılıyor"}
act = ""
for r in reversed(rows):
    if r.get("type") == "assistant":
        c = r.get("message", {}).get("content")
        if isinstance(c, list):
            for b in c:
                if isinstance(b, dict) and b.get("type") == "tool_use":
                    act = ACT.get(b.get("name"), "işlem yapılıyor")
                    break
        if act:
            break
msg = (title + " " if title else "") + "hala çalışıyor"
if act:
    msg += ", şu an " + act
print(msg)
PY
)"
  [ -z "$TEXT" ] && TEXT="Görev hala çalışıyor"

  TMP="$HOOKDIR/.interim-$SESSION.mp3"
  "$EDGE_TTS" --voice "$VOICE" --text "$TEXT" --write-media "$TMP" >/dev/null 2>&1 && paplay "$TMP" >/dev/null 2>&1
  rm -f "$TMP"
done
