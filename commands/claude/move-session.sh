#!/usr/bin/env bash
# Move a Claude Code session transcript to another project directory.
# Rewrites the old project path inside the transcript so --resume works from the new location.
#
# Usage:
#   move-session.sh <session-id|latest> [target-project-dir] [--delete] [--dry-run]
#   move-session.sh --selftest
set -euo pipefail

PROJECTS="${CLAUDE_PROJECTS_DIR:-$HOME/.claude/projects}"

encode() { printf '%s' "$1" | sed 's/[^a-zA-Z0-9]/-/g'; }

# Git Bash rewrites any argument or environment value that looks like a POSIX
# path into a Windows one before it reaches a native program such as py.exe.
# That is wanted for the file we open, and wrong for the two path STRINGS we
# search and replace inside the transcript: translated, they no longer match
# the text in the file, so the rewrite silently replaces nothing. Hex does not
# look like a path, so it crosses the boundary untouched.
hex() { printf '%s' "$1" | od -An -v -tx1 | tr -d ' \n'; }

die() { echo "hata: $*" >&2; exit 1; }

# Windows Python launcher is py -3; every other platform keeps python3.
# -X utf8 is not cosmetic: Python on Windows encodes stdout with the ANSI code
# page (cp1252 on a Turkish install), so the first Turkish character in a
# progress line raises UnicodeEncodeError and takes the whole move down. UTF-8
# mode is the default everywhere this script already worked, so it changes
# nothing on Linux or macOS.
PYTHON=(python3 -X utf8)
if [ "${OS:-}" = "Windows_NT" ] && command -v py >/dev/null 2>&1; then
  PYTHON=(py -3 -X utf8)
fi

# --- selftest: round-trip a fake session through the mover -------------------
if [ "${1:-}" = "--selftest" ]; then
  TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
  export CLAUDE_PROJECTS_DIR="$TMP/projects"
  OLDP="$TMP/old/proj"; NEWP="$TMP/new/proj"; mkdir -p "$OLDP" "$NEWP"
  SRC_DIR="$CLAUDE_PROJECTS_DIR/$(encode "$OLDP")"
  mkdir -p "$SRC_DIR/sess-1/tool-results" "$SRC_DIR/memory"
  printf '%s\n' \
    "{\"type\":\"user\",\"cwd\":\"$OLDP\",\"message\":{\"content\":\"see $OLDP/src/a.ts\"}}" \
    "{\"type\":\"assistant\",\"cwd\":\"$OLDP/sub\",\"message\":{\"content\":\"ok\"}}" \
    > "$SRC_DIR/sess-1.jsonl"
  echo 'x' > "$SRC_DIR/sess-1/tool-results/r.txt"
  echo '- note' > "$SRC_DIR/memory/MEMORY.md"

  "$0" sess-1 "$NEWP" >/dev/null

  DST="$CLAUDE_PROJECTS_DIR/$(encode "$NEWP")"
  # Check the decoded records, not the raw text: a path holding a backslash
  # is stored escaped, and grep would read the backslash as a regex escape.
  "${PYTHON[@]}" - "$DST/sess-1.jsonl" "$(hex "$OLDP")" "$(hex "$NEWP")" <<'PYCHECK' || die "selftest: rewrite hatalı"
import json, sys
target, old_hex, new_hex = sys.argv[1:4]
old_path = bytes.fromhex(old_hex).decode('utf-8')
new_path = bytes.fromhex(new_hex).decode('utf-8')
rows = []
with open(target, encoding='utf-8') as handle:
    for line in handle:
        if line.strip():
            rows.append(json.loads(line))
problems = []
if len(rows) != 2:
    problems.append(f"{len(rows)} kayıt bulundu, 2 bekleniyordu")
else:
    if rows[0].get('cwd') != new_path:
        problems.append("cwd rewrite yok")
    if rows[0].get('message', {}).get('content') != f'see {new_path}/src/a.ts':
        problems.append("gövde yolu rewrite yok")
    if rows[1].get('cwd') != f'{new_path}/sub':
        problems.append("alt dizin cwd rewrite yok")
for row in rows:
    if old_path in json.dumps(row, ensure_ascii=False, separators=(',', ':')):
        problems.append("eski yol kalmış")
        break
for problem in problems:
    print(problem, file=sys.stderr)
sys.exit(1 if problems else 0)
PYCHECK
  [ -f "$DST/sess-1/tool-results/r.txt" ] || die "selftest: tool-results taşınmadı"
  [ -f "$DST/memory/MEMORY.md" ]          || die "selftest: memory taşınmadı"
  [ -f "$SRC_DIR/sess-1.jsonl" ]          || die "selftest: --delete yokken orijinal silinmiş"
  echo "selftest OK"
  exit 0
fi

# --- args -------------------------------------------------------------------
SID="${1:-}"; [ -n "$SID" ] || die "kullanım: move-session.sh <session-id|latest> [hedef-dizin] [--delete] [--dry-run]"
shift
DEST_PATH="$PWD"; DELETE=0; DRY=0
for a in "$@"; do
  case "$a" in
    --delete)  DELETE=1 ;;
    --dry-run) DRY=1 ;;
    -*)        die "bilinmeyen seçenek: $a" ;;
    *)         DEST_PATH=$(cd "$a" 2>/dev/null && pwd) || die "hedef dizin yok: $a" ;;
  esac
done

[ -d "$PROJECTS" ] || die "projects dizini yok: $PROJECTS"

if [ "$SID" = "latest" ]; then
  SRC_FILE=$(find "$PROJECTS" -maxdepth 2 -name '*.jsonl' -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)
  [ -n "$SRC_FILE" ] || die "hiç oturum bulunamadı"
  SID=$(basename "$SRC_FILE" .jsonl)
else
  SRC_FILE=$(find "$PROJECTS" -maxdepth 2 -name "$SID.jsonl" | head -1)
  [ -n "$SRC_FILE" ] || die "oturum bulunamadı: $SID"
fi
SRC_DIR=$(dirname "$SRC_FILE")

# --- old project path comes from the transcript itself, not from the user ----
OLD_PATH=$("${PYTHON[@]}" - "$SRC_FILE" <<'PY'
import json, sys
cwds = set()
for line in open(sys.argv[1], errors='replace'):
    try: d = json.loads(line)
    except Exception: continue
    if isinstance(d, dict) and isinstance(d.get('cwd'), str): cwds.add(d['cwd'])
print(min(cwds, key=len) if cwds else '')
PY
)
[ -n "$OLD_PATH" ] || die "transcript içinde cwd bulunamadı"

DEST_DIR="$PROJECTS/$(encode "$DEST_PATH")"

echo "oturum : $SID"
echo "kaynak : $SRC_DIR"
echo "hedef  : $DEST_DIR"
echo "yol    : $OLD_PATH  ->  $DEST_PATH"
[ "$OLD_PATH" = "$DEST_PATH" ] && { echo "zaten doğru konumda, iş yok."; exit 0; }
[ "$DRY" = 1 ] && { echo "(dry-run — hiçbir şey yazılmadı)"; exit 0; }

# --- move -------------------------------------------------------------------
# The rewrite runs per JSON record, not over the raw file text. A Windows path
# is full of backslashes: the transcript stores them escaped (C:\\Users\\...)
# while OLD_PATH holds them raw (C:\Users\...), so a text-level sed matches
# nothing and moves the transcript with every path still pointing at the old
# directory. Backslashes are escape characters to sed on top of that.
mkdir -p "$DEST_DIR"
"${PYTHON[@]}" - "$SRC_FILE" "$(hex "$OLD_PATH")" "$(hex "$DEST_PATH")" "$DEST_DIR/$SID.jsonl" <<'PYMOVE'
import json, sys

source, old_hex, new_hex, target = sys.argv[1:5]
old_path = bytes.fromhex(old_hex).decode('utf-8')
new_path = bytes.fromhex(new_hex).decode('utf-8')

def swap(value):
    if isinstance(value, str):
        return value.replace(old_path, new_path)
    if isinstance(value, list):
        return [swap(item) for item in value]
    if isinstance(value, dict):
        return {key: swap(item) for key, item in value.items()}
    return value

with open(source, encoding='utf-8', errors='replace') as handle:
    lines = handle.read().split('\n')

out = []
for line in lines:
    if not line.strip():
        out.append(line)
        continue
    try:
        out.append(json.dumps(swap(json.loads(line)), ensure_ascii=False, separators=(',', ':')))
    except Exception:
        # Not a JSON record; the verifier reports it. Replace textually so a
        # damaged line is at least not left stale.
        out.append(line.replace(old_path, new_path))

with open(target, 'w', encoding='utf-8', newline='\n') as handle:
    handle.write('\n'.join(out))
PYMOVE
chmod 600 "$DEST_DIR/$SID.jsonl"
[ -d "$SRC_DIR/$SID" ]     && cp -r "$SRC_DIR/$SID" "$DEST_DIR/"
[ -d "$SRC_DIR/memory" ]   && { mkdir -p "$DEST_DIR/memory"; cp -rn "$SRC_DIR/memory/." "$DEST_DIR/memory/" 2>/dev/null || true; }

# --- verify: valid JSON + no stale paths (the check that fails if logic breaks)
"${PYTHON[@]}" - "$DEST_DIR/$SID.jsonl" "$(hex "$OLD_PATH")" <<'PYVERIFY'
import json, sys
target, old_hex = sys.argv[1:3]
old_path = bytes.fromhex(old_hex).decode('utf-8')
n = bad = stale = 0
with open(target, encoding='utf-8', errors='replace') as handle:
    for line in handle:
        if not line.strip(): continue
        n += 1
        try:
            row = json.loads(line)
        except Exception:
            bad += 1
            if old_path in line: stale += 1
            continue
        # Search the decoded values, so an escaped Windows path is caught too.
        if old_path in json.dumps(row, ensure_ascii=False, separators=(',', ':')): stale += 1
print(f"doğrulama: {n} satır, {bad} bozuk JSON, {stale} eski yol")
sys.exit(1 if (bad or stale) else 0)
PYVERIFY

if [ "$DELETE" = 1 ]; then
  rm -rf "$SRC_FILE" "$SRC_DIR/$SID"
  echo "orijinal silindi."
else
  echo "orijinal yedek olarak duruyor: $SRC_FILE"
fi

echo
echo "tamam. devam etmek için:"
echo "  cd $DEST_PATH && claude --resume $SID"
