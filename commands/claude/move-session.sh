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

die() { echo "hata: $*" >&2; exit 1; }

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
  grep -q "\"cwd\":\"$NEWP\""      "$DST/sess-1.jsonl" || die "selftest: cwd rewrite yok"
  grep -q "$NEWP/src/a.ts"         "$DST/sess-1.jsonl" || die "selftest: gövde yolu rewrite yok"
  grep -q "\"cwd\":\"$NEWP/sub\""  "$DST/sess-1.jsonl" || die "selftest: alt dizin cwd rewrite yok"
  grep -q "$OLDP"                  "$DST/sess-1.jsonl" && die "selftest: eski yol kalmış"
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
OLD_PATH=$(python3 - "$SRC_FILE" <<'PY'
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
mkdir -p "$DEST_DIR"
sed "s#$OLD_PATH#$DEST_PATH#g" "$SRC_FILE" > "$DEST_DIR/$SID.jsonl"
chmod 600 "$DEST_DIR/$SID.jsonl"
[ -d "$SRC_DIR/$SID" ]     && cp -r "$SRC_DIR/$SID" "$DEST_DIR/"
[ -d "$SRC_DIR/memory" ]   && { mkdir -p "$DEST_DIR/memory"; cp -rn "$SRC_DIR/memory/." "$DEST_DIR/memory/" 2>/dev/null || true; }

# --- verify: valid JSON + no stale paths (the check that fails if logic breaks)
python3 - "$DEST_DIR/$SID.jsonl" <<'PY'
import json, sys
n = bad = 0
for line in open(sys.argv[1], errors='replace'):
    if not line.strip(): continue
    n += 1
    try: json.loads(line)
    except Exception: bad += 1
print(f"doğrulama: {n} satır, {bad} bozuk JSON")
sys.exit(1 if bad else 0)
PY
grep -q -- "$OLD_PATH" "$DEST_DIR/$SID.jsonl" && die "eski yol hâlâ duruyor — taşıma eksik"

if [ "$DELETE" = 1 ]; then
  rm -rf "$SRC_FILE" "$SRC_DIR/$SID"
  echo "orijinal silindi."
else
  echo "orijinal yedek olarak duruyor: $SRC_FILE"
fi

echo
echo "tamam. devam etmek için:"
echo "  cd $DEST_PATH && claude --resume $SID"
