---
name: devam
description: Resume an earlier Claude Code session — list past sessions across ALL projects (title · topic · last activity · project), let the user pick one, and continue where they left off in the CURRENT session. `/devam <id>` loads a session directly; `/devam <keyword>` searches session titles. Usage examples - "resume session", "continue previous session", "list my old chats", "reopen an old session", "eski sohbete devam et", "oturuma devam", "oturumları listele", "kaldığım yerden devam et", "önceki sohbeti aç".
allowed-tools: Bash, Read, Write
argument-hint: "[session-id | search-keyword] (empty → interactive list)"
---

# devam — resume an earlier Claude Code session

Purpose: find past Claude Code sessions on this machine, show **title / topic / last activity / project**, let the user choose, then load a bounded digest of the chosen session and **continue the work in the current session**.

Sessions are stored per project at `~/.claude/projects/<project>/<uuid>.jsonl` (one file = one session). A slash command / skill cannot turn the running session into another OS process, so "resume" here means loading a bounded slice of the chosen transcript as context and continuing in the current session. If the user wants a true native resume, remind them of `claude --resume <id>`.

**Reply to the user in their own language** (for this user, Turkish by default). All the script's output is English/structural — localize the list and the "where we left off" summary when you present them.

**Argument:** `$ARGUMENTS`

## 0) Setup
- **Helper script:** `devam.mjs` sits next to this file, in the skill's base directory (printed as "Base directory for this skill: …" when the skill loads). Call it as `node "<base>/devam.mjs" <subcommand> …` — the same command on Linux, macOS and Windows. Subcommands:
  - `CURRENT=<UUID> LIMIT=40 node <base>/devam.mjs list` → newest sessions across all projects
  - `CURRENT=<UUID> node <base>/devam.mjs list "<keyword>"` → title-filtered
  - `node <base>/devam.mjs find <id>` → resolve an id/prefix to a full path (may print `NONE` / `AMBIGUOUS`)
  - `TAIL=28 node <base>/devam.mjs digest <id>` → chosen session's META + recent turns
  - On Windows PowerShell an environment variable goes in front of the command as `$env:TAIL=28`, not inline.
- **`devam.sh` is the older bash equivalent** and is kept for a Linux shell session. It needs bash, jq, GNU find/stat/date, grep, awk and sed, so do not reach for it on Windows.
- **Current session id (CURRENT):** the uuid in your own scratchpad directory path (e.g. `/tmp/claude-*/<project>/<UUID>/scratchpad` → `UUID`). Pass it so the list can mark `«this session»` and you don't resume yourself by accident.

## 1) Interpret the argument
- **Empty** → run `list`, present the table in the user's language, ask them to reply with a number or an id, wait.
- **Looks like an id** (hex + dashes only, ≥6 chars, no spaces) → run `find <arg>` first:
  - single path → that session; go to step 3.
  - `NONE` → it may actually be a search term; treat it as a **filter** (below).
  - `AMBIGUOUS` → show the candidates, ask which one.
- **Otherwise** (a word / has spaces) → run `list "<arg>"` (title search), present, let them pick.

## 2) Selection
- If the user replies with a **number**, map it to that row's id from the table you just showed.
- If they paste an **id**, resolve with `find` when needed.
- If the chosen session is `«this session»`, say they are already here; confirm they meant a different one.

## 3) Continue (where we left off)
- Run `TAIL=28 node <base>/devam.mjs digest <id>`. Read META (TITLE, FOLDER, BRANCH, TURNS, FIRST REQUEST, LAST PROMPT) + the recent turns.
- Give a short **"where we left off" summary in the user's language**: goal (FIRST REQUEST / title) · what was done (from recent turns) · pending / next step · any open question.
- **Folder warning:** if `FOLDER` differs from the current working directory, warn the user ("this chat was under `<FOLDER>`, we're now in `<cwd>`; I may need to switch there for related files").
- **Confirm** the next step (or state in one line what you'll do) and continue the work in the current session.
- If you need more detail, the raw file path is in the `FILE:` line of `digest`/`find`; raise `TAIL` for wider context. Do not slurp that `.jsonl` — a transcript can pass 500 MB; read a bounded slice, and on Linux `jq` over it works too.

## Notes
- The filter searches **titles** (raw grep over transcripts is useless because every transcript embeds the skill catalog); sessions without an auto-title won't match a filter but still appear in the unfiltered list.
- The list shows the newest ~40 sessions across all projects; use a filter to reach older ones.
- The digest reads only a bounded slice, never the whole (possibly multi-MB) transcript.

## Notes on the helper itself
- `devam.mjs` needs nothing but node — no bash, jq, GNU find/stat/date, grep, awk, sed or coreutils — so it is the same command on every platform.
- It never loads a transcript into memory. `list` stats every file, sorts by last-modified and only then opens the few it will show, stopping each read once it has the title; `digest` streams the file once and keeps only the last `TAIL` turns. A 549 MB transcript digests in a few seconds in about 140 MB of RSS.
