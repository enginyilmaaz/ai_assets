#!/usr/bin/env bash
# Permanently delete Claude Code session transcript(s) under ~/.claude/projects.
# The driver (delete-session.md) lists projects/sessions and picks the ids;
# this engine deletes them safely.
#
# Safety:
#   - operates ONLY under PROJECTS (~/.claude/projects by default)
#   - NEVER deletes the active session ($CLAUDE_SESSION_ID)
#   - --dry-run prints what would be deleted and removes nothing
#
# Usage:
#   delete-session.sh <session-id> [more-ids...] [--dry-run]
#   delete-session.sh --selftest
set -euo pipefail

PROJECTS="${CLAUDE_PROJECTS_DIR:-$HOME/.claude/projects}"
ACTIVE="${CLAUDE_SESSION_ID:-}"

die() { echo "hata: $*" >&2; exit 1; }

# absolute path that must live under PROJECTS (defense-in-depth against a stray id)
under_projects() {
  local p root
  p=$(readlink -f "$1" 2>/dev/null || true)
  root=$(readlink -f "$PROJECTS" 2>/dev/null || printf '%s' "$PROJECTS")
  [ -n "$p" ] || return 1
  case "$p" in "$root"/*) return 0 ;; *) return 1 ;; esac
}

# the files/dirs that make up one session id: <id>.jsonl + optional <id>/ (tool-results)
targets_for() {
  local id="$1"
  find "$PROJECTS" -maxdepth 2 -name "$id.jsonl" 2>/dev/null || true
  find "$PROJECTS" -maxdepth 2 -type d -name "$id" 2>/dev/null || true
}

delete_ids() {
  local dry="$1"; shift
  local id t any=0 skipped=0
  for id in "$@"; do
    if [ -n "$ACTIVE" ] && [ "$id" = "$ACTIVE" ]; then
      echo "atlandı (aktif oturum, silinemez): $id"; skipped=1; continue
    fi
    local found=0 sz
    while IFS= read -r t; do
      [ -n "$t" ] || continue
      found=1; any=1
      under_projects "$t" || die "güvenlik: PROJECTS dışında, silinmiyor: $t"
      sz=$(du -sh "$t" 2>/dev/null | cut -f1); [ -n "$sz" ] || sz="?"
      if [ "$dry" = 1 ]; then
        echo "silinecek: $t  ($sz)"
      else
        rm -rf "$t"
        echo "silindi:   $t  ($sz)"
      fi
    done < <(targets_for "$id")
    [ "$found" = 0 ] && echo "bulunamadı: $id"
  done
  [ "$any" = 0 ] && [ "$skipped" = 0 ] && die "silinecek bir şey bulunamadı"
  return 0
}

# --- selftest: create fake sessions, exercise dry-run / delete / active-guard ---
if [ "${1:-}" = "--selftest" ]; then
  TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
  export CLAUDE_PROJECTS_DIR="$TMP/projects"
  PROJECTS="$CLAUDE_PROJECTS_DIR"
  PDIR="$PROJECTS/-proj"; mkdir -p "$PDIR/aaa/tool-results" "$PDIR/bbb"
  echo '{"type":"user"}' > "$PDIR/aaa.jsonl"
  echo 'x'              > "$PDIR/aaa/tool-results/r.txt"
  echo '{"type":"user"}' > "$PDIR/bbb.jsonl"

  ACTIVE="" delete_ids 1 aaa >/dev/null
  [ -f "$PDIR/aaa.jsonl" ] || die "selftest: dry-run sildi (olmamalıydı)"

  ACTIVE="" delete_ids 0 aaa >/dev/null
  [ -e "$PDIR/aaa.jsonl" ] && die "selftest: aaa.jsonl silinmedi"
  [ -e "$PDIR/aaa" ]       && die "selftest: aaa/ dizini silinmedi"
  [ -f "$PDIR/bbb.jsonl" ] || die "selftest: bbb yanlışlıkla silindi"

  ACTIVE="bbb" delete_ids 0 bbb >/dev/null || true
  [ -f "$PDIR/bbb.jsonl" ] || die "selftest: aktif oturum korunmadı"

  echo "selftest OK"
  exit 0
fi

# --- args -------------------------------------------------------------------
[ $# -ge 1 ] || die "kullanım: delete-session.sh <session-id> [more-ids...] [--dry-run]"
[ -d "$PROJECTS" ] || die "projects dizini yok: $PROJECTS"

DRY=0; IDS=()
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    -*)        die "bilinmeyen seçenek: $a" ;;
    *)         IDS+=("$a") ;;
  esac
done
[ "${#IDS[@]}" -ge 1 ] || die "en az bir session-id gerekli"

delete_ids "$DRY" "${IDS[@]}"
[ "$DRY" = 1 ] && echo "(dry-run — hiçbir şey silinmedi)"
exit 0
