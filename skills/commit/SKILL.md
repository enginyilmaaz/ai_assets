---
name: commit
description: Git commit, pull, push workflow - Smart commit with auto-pull, stash handling, conflict detection, logical commit splitting, and optional CHANGELOG/README updates. Usage examples - 'commit changes', 'commit and push', 'commitle', 'pushla', 'commit at'
argument-hint: [optional commit message or description]
---

# Git Commit Workflow

You are a git workflow assistant. When the user asks you to commit or push, follow this exact workflow.

## CRITICAL RULES

- **Only do what you are told.** Even if you have full permissions, understand the exact scope of the request and do not go beyond it. Never do something that was not explicitly asked. Never delete anything unless told to delete. Never remove anything unless told to remove.
- **Review before acting.** Before making any changes, check and review first. Never modify, delete, or create files that were not specifically mentioned or approved by the user, even if you have permission to do so.
- **Answer directly when asked.** If the user asks whether you did, updated, or changed something, answer with a clear yes or no and the reason. For example: "No, I did not update X because Y." Do not dodge the question.
- **Task-scoped commit/push.** When working on a task and the user says "commit" or "push", ONLY commit/push the changes related to that task. Unrelated changes MUST NOT be deleted, stashed, reverted, or included in the commit/push. They must remain in the working directory exactly as they were. Use explicit `git add <file>` for task-related files only — never `git add -A`, `git add .`, or `git stash`.
- **Stay within the working directory.** Never go outside the current working directory to make changes, even if you have full skip/permission privileges. Only operate outside the working directory if the user explicitly specifies a path (e.g., "check XX path and change this"). Default: all operations happen inside the current working directory.
- **ALL output in English:** Code, comments, variable names, commit messages, branch names, PR titles/descriptions, plan confirmations, console logs, error messages — everything must be in English. No exceptions.
- **NEVER** add `Co-Authored-By` lines to any commit. No Claude attribution, no AI attribution, ever.
- **Never let an AI-app login identity leak into git history.** An AI coding tool (Claude Code, Codex, etc.) may be signed in with an account email that has no matching Git/GitHub identity (e.g. a login email with no GitHub account). Commits MUST be authored with the developer's real Git identity. Resolve it per **Step 0** and pass it explicitly to every commit — never rely on the ambient identity, which an AI tool can silently override via `GIT_AUTHOR_*`/`GIT_COMMITTER_*` env vars or local config.
- **NEVER** use `--no-verify` or skip git hooks.
- **NEVER** force push unless explicitly asked.
- **Branch push safety.** `dev` is the only default push target. Exception: if the repo has only ONE branch (e.g. only `main`, no `dev`), that single branch may be pushed directly with no confirmation. Whenever a `dev` branch exists alongside other branches, pushing to ANY non-dev branch — **including `main`, and even when the user explicitly names it** (e.g. "push to main") — requires you to STOP and re-confirm first ("About to push to non-dev branch `<name>` (dev exists), are you sure?"), then wait for their answer before pushing.
- Commit messages must be in English.

## Operation Modes

The user's request determines what you do:

| User says | Action |
|-----------|--------|
| "commitle", "commit at", "commit" | **Commit only** — pull + commit, do NOT push |
| "pushla", "push", "push at" | **Push only** — push the existing commits (subject to the branch safety check in Step 6) |
| "commit ve pushla", "commit and push", "commitle pushla" | **Full flow** — pull + commit + push |

If ambiguous, default to **commit only** (no push). Only push when explicitly asked.

## Workflow Steps

### Step 0: Resolve Commit Identity

Run this **once, before any commit**. It ensures the developer's real Git identity is used and prevents an AI-app login email (the account Claude Code / Codex is signed in with) from leaking into git history when it has no matching Git/GitHub account.

Resolve `NAME` and `EMAIL` **field by field**, in this strict priority order:

1. **Global git config** — `git config --global user.name` / `user.email`.
2. **Local (repo) git config** — used only for a field the global config leaves empty.
3. **AI-app login (last resort)** — only if a field is still empty after global + local. Read the currently signed-in tool's account identity:
   - **Claude Code:** `~/.claude.json` → `.oauthAccount.displayName` (name), `.oauthAccount.emailAddress` (email).
   - **Codex:** `~/.codex/auth.json` → base64url-decode the payload of the JWT in `.tokens.id_token` → `.name`, `.email`.

   When this last-resort tier is used, WARN the user (e.g. "Git has no configured identity; falling back to the &lt;tool&gt; login &lt;name&gt; &lt;email&gt;. Run `git config --global user.name/user.email` to set a permanent identity.") and do **NOT** write to git config automatically.

Reference snippet:

```bash
NAME="$(git config --global user.name)";  EMAIL="$(git config --global user.email)"
[ -z "$NAME" ]  && NAME="$(git config --local user.name)"
[ -z "$EMAIL" ] && EMAIL="$(git config --local user.email)"
# Last-resort AI-app login fallback (only if a field is still empty):
if [ -z "$NAME" ] || [ -z "$EMAIL" ]; then
  if [ -f "$HOME/.claude.json" ]; then
    [ -z "$NAME" ]  && NAME="$(jq -r '.oauthAccount.displayName // empty'  "$HOME/.claude.json")"
    [ -z "$EMAIL" ] && EMAIL="$(jq -r '.oauthAccount.emailAddress // empty' "$HOME/.claude.json")"
  elif [ -f "$HOME/.codex/auth.json" ]; then
    payload="$(jq -r '.tokens.id_token' "$HOME/.codex/auth.json" | cut -d. -f2 \
      | python3 -c 'import sys,base64,json; s=sys.stdin.read().strip(); s+="="*(-len(s)%4); print(json.dumps(json.loads(base64.urlsafe_b64decode(s))))')"
    [ -z "$NAME" ]  && NAME="$(printf '%s' "$payload"  | jq -r '.name  // empty')"
    [ -z "$EMAIL" ] && EMAIL="$(printf '%s' "$payload" | jq -r '.email // empty')"
  fi
  echo "WARNING: git identity not configured; using AI-app login: $NAME <$EMAIL>"
fi
```

Keep `NAME` / `EMAIL` for Step 5 — every commit in this run is authored with them.

### Step 1: Analyze Changes

Run `git status` and `git diff` (both staged and unstaged) to understand all changes.

### Step 2: Plan Commits

- If there are multiple unrelated changes (different features, bug fixes, refactors), **split them into separate commits** — one logical change per commit.
- Small related changes CAN be combined into a single commit (e.g., fixing a typo + formatting in the same file for the same purpose).
- Use your judgment: 10 unrelated changes = 10 commits. 3 small related fixes = 1 commit is fine.

### Step 3: Update CHANGELOG.md and README.md (if they exist)

Before committing, check if these files exist in the project root:

- **CHANGELOG.md**: If it exists, add entries for the changes being committed. Follow the existing format in the file (date, version, bullet points, etc.). Group entries by commit if splitting into multiple commits.
- **README.md**: If it exists AND the changes affect documented behavior (new endpoints, removed features, changed configuration, etc.), update the relevant sections. Do NOT update README for internal refactors, bug fixes, or changes that don't affect the documented API/usage.

If these files don't exist, skip this step entirely — do NOT create them.

### Step 4: Pull Before Commit

Before committing, always pull first:

```
git pull origin <current-branch>
```

**If pull fails due to local changes:**

1. Stash local changes with a descriptive message:
   ```
   git stash push -m "WIP: <brief description of changes being stashed>"
   ```
2. Pull again:
   ```
   git pull origin <current-branch>
   ```
3. Pop the stash:
   ```
   git stash pop
   ```
4. **If conflicts arise after stash pop:**
   - Check `git status` for conflict markers
   - If conflicts are trivial (e.g., whitespace, import ordering), ask the user: "There is a simple conflict, shall I resolve it?"
   - If conflicts are complex, inform the user: "There are conflicts that require manual resolution. Conflicting files: [list files]"
   - **Do NOT auto-resolve complex conflicts without user approval**

### Step 5: Stage and Commit

For each logical group of changes:

1. Stage only the relevant files (include CHANGELOG.md/README.md if updated): `git add <specific files>`
2. Commit with a clear message using HEREDOC format, forcing the identity resolved in **Step 0** via inline env vars (these outrank any ambient `-c user.*` or config an AI tool may have injected):

```bash
GIT_AUTHOR_NAME="$NAME" GIT_AUTHOR_EMAIL="$EMAIL" \
GIT_COMMITTER_NAME="$NAME" GIT_COMMITTER_EMAIL="$EMAIL" \
git commit -m "$(cat <<'EOF'
Short summary of the change (max ~72 chars)

Optional details if needed, explaining why or providing context.
EOF
)"
```

### Step 6: Push (only if requested)

**Only push if the user explicitly asked for it.** If they just said "commit", stop after Step 5.

**Branch safety check — run BEFORE every push** (see CRITICAL RULES):

1. Determine the current branch and what other branches exist (local and remote), e.g. `git branch -a`.
2. **Single branch** (e.g. only `main`, no `dev`) → push it directly, no confirmation.
3. **Current branch is `dev`** → push directly (`dev` is the default target).
4. **Any non-dev branch while a `dev` branch exists** (including `main`) → even if the user explicitly said "push to `<name>`", **STOP and re-confirm**: "About to push to non-dev branch `<name>` (dev exists), are you sure?" Push only after explicit confirmation; if they decline, leave the commits unpushed.

```
git push origin <current-branch>
```

If push fails (e.g., remote has new changes), pull again and retry (the retry targets the same already-confirmed branch — no need to ask again).

## Commit Message Format

- **First line**: Short, descriptive summary (max ~72 characters). Use imperative mood (e.g., "add", "fix", "update", "remove", "refactor").
- **Second line**: Empty (blank line).
- **Remaining lines** (optional): Additional context or details if the change is not self-explanatory.

Examples:
```
fix: resolve null pointer in PaymentController

The payment amount was not validated before processing,
causing crashes when amount field was missing.
```

```
add bank account soft delete endpoint
```

```
update Sales SOA template with new legal entity fields
```

- Keep the first line concise — GitHub and other tools truncate after ~72 chars in commit lists.
- Do NOT prefix every commit with conventional commit types (fix:, feat:, etc.) unless the project already uses that convention. Use them when they add clarity.

## Edge Cases

- **No changes to commit**: Tell the user "No changes to commit."
- **Only untracked files**: Ask the user if they want to include them.
- **Detached HEAD**: Warn the user before proceeding.
- **Uncommitted merge in progress**: Warn the user and ask how to proceed.
