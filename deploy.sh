#!/usr/bin/env bash
# Deploy this repo's Claude Code skills + commands into ~/.claude.
#
# ai_assets is the world-public asset tier; this script installs its skills and slash
# commands straight into your local Claude Code config without the app:
#
#   ./deploy.sh            # install
#   ./deploy.sh --dry-run  # preview, change nothing
#
# Installs:  skills/    -> ~/.claude/skills/
#            commands/  -> ~/.claude/commands/   (group folders, e.g. claude/move-session.md + .sh)
# Hooks and rules are managed by the management app (settings.json / CLAUDE.md), not
# by this script. Idempotent; override target root with CLAUDE_HOME (default ~/.claude).

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="${CLAUDE_HOME:-$HOME/.claude}"
DRY=0
[ "${1:-}" = "--dry-run" ] && DRY=1

run() { if [ "$DRY" = 1 ]; then echo "  [dry-run] $*"; else "$@"; fi; }

install_group() {  # $1 = absolute source dir, $2 = ~/.claude subdir, $3 = label
  local src="$1" dest="$CLAUDE_DIR/$2" n=0
  [ -d "$src" ] || { echo "  ($3: yok, atlandı)"; return 0; }
  run mkdir -p "$dest"
  for item in "$src"/*/; do
    [ -e "$item" ] || continue
    local base; base="$(basename "$item")"
    run rm -rf "$dest/$base"
    run cp -a "$item" "$dest/$base"
    echo "  + $2/$base"
    n=$((n + 1))
  done
  echo "  -> $3: $n item(s)"
}

echo "ai_assets -> $CLAUDE_DIR$([ "$DRY" = 1 ] && echo '  (dry-run)')"
install_group "$REPO_DIR/skills"   skills   "skills"
install_group "$REPO_DIR/commands" commands "commands"
echo "Done."
