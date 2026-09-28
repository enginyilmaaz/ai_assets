# Changelog

All notable changes to the global rules catalog are documented here.

## [1.12.0] - 2026-09-28

### Added
- Rule: `spec-files` (Specs — ask where they live, delete them when the work is done) — before writing a spec / plan / design document, ask whether it belongs in the session's temporary folder or in the project repo, with **repo as the pre-selected default**; once the work it describes is completely finished, delete the spec wherever it was written, including from the repo as a separate cleanup commit, and never leave a stale spec behind for finished work.
- Rule: `test-artifacts` (Test artifacts — clean up whatever a test run leaves behind) — after any Playwright or equivalent test run, automatically delete `test-results/`, `playwright-report/`, traces, videos, screenshots, `.last-run.json` and temp copies even when the run failed or was cancelled; also kill the background test / report-server processes and close every browser session, keeping an artifact only when it was asked for or IS the deliverable.

## [1.11.0] - 2026-09-27

### Added
- Rule: `package-manager` (Package manager — match the project, never mix) — detect the package manager a project already uses from its lockfile / `packageManager` field / CI commands and stay on it; never run `npm` in a yarn, pnpm or bun project, never leave a second foreign lockfile (e.g. a `package-lock.json` next to `yarn.lock`), and ask when a project has nothing to go by. Applies to every ecosystem, not just Node.

## [1.10.0] - 2026-09-17

### Added
- Rule: `form-inputs` (Form inputs — errors only under an input) — no helper/hint/description text under inputs and no long placeholder explanations; the space under an input shows only the field's validation error, and only while the field is in error.
- Rule: `alternative-designs` (Alternative designs — show them live, step by step) — present alternative designs live on localhost via the Superpowers brainstorming visual companion: at least 5 genuinely different styles, built step by step like in Figma, with every screen and every collapsed element's content shown.
- Rule: `artifact-approval` (Artifacts — never create one without approval) — never create, publish or update an Artifact without asking first and getting explicit approval; until then, deliver in the terminal or as a local file.

## [1.9.0] - 2026-07-26

### Changed
- Rule: `git-push` (Git branch push safety) — simplified to "always commit/push via the commit skill." The detailed branch-push logic (dev is the default target, single-branch repos push directly, non-dev pushes re-confirmed even when explicitly named) now lives in the `commit` skill.

## [1.8.0] - 2026-07-26

### Removed
- Rule: `notify-summary` — retired. The `voice-notify` hook now plays a fixed notification sound (`notification.mp3`) instead of edge-tts, so there is no per-turn `.turn-summary` to write; the CLAUDE.md "Notifications" section was simplified to match.

## [1.7.0] - 2026-07-24

### Added
- Rule: `notify-summary` (Task-completion voice summary) — at the end of every tool-using turn, write a one-line topic + task-type summary to `~/.claude/hooks/.turn-summary`; the `voice-notify` hook speaks it (topic + type, e.g. "ERP log araştırması tamamlandı") and falls back to the conversation title if absent.

## [1.6.0] - 2026-07-22

### Added
- Rule: `git-token-scope` (Git tokens — scoped injection, never clobber global auth) — when a task needs a token for one repo, inject it per-command (`git -c http.extraHeader=…`, or a one-off `https://<token>@github.com/…` URL) instead of `gh auth login` / `gh auth refresh`, which overwrite the machine's global GitHub credential and can silently break access to every other repo.

## [1.5.0] - 2026-07-21

### Added
- Rule: `design-standards` (Design & build — full-stack, modular, clean and on-brand) — when you design or build, cover both backend and frontend as one coherent whole, keep the architecture modular and best-practice, make deliverables clean/professional/modern, match the existing system's colors and visual identity, and use realistic (non-absurd) examples.

## [1.4.0] - 2026-07-21

### Added
- Rule: `coding-conventions` (Coding conventions — follow them when writing code) — when writing or editing code, follow the project's coding conventions (naming, file/folder placement, style, idioms) and apply the `coding-conventions` skill if available.

## [1.3.0] - 2026-07-21

### Added
- Rule: `respect-structure` (Understand before acting — respect existing structure) — before working in an unfamiliar system, first map it (folder structure, search, related skills), stay within its existing folder structure and naming conventions, and reuse existing components instead of duplicating or breaking the overall design.

## [1.2.0] - 2026-07-17

### Added
- Rule: `local-tools` (Tools — install locally, never system-wide) — install any tool/package a task needs into the project's `tools/` folder instead of the system; keep it gitignored; ask the user whether to delete it once the task is done.

## [1.1.0] - 2026-07-16

### Added
- Rule: `git-push` (Git branch push safety) — only push to `dev`; never push to a non-dev branch without explicit confirmation; single-branch repos (e.g. only `main`) are exempt.

## [1.0.0] - 2026-07-12

### Added
- Initial catalog seeded from the maintainer's global `~/.claude/CLAUDE.md`.
- Rules: `language` (default Turkish replies), `skills` (prefer skills; commit/push via the commit skill), `safety` (ask before out-of-project file changes).
- `manifest.json` catalog with per-rule localized (EN/TR) names and descriptions.
- `preamble.md` (`# Global Preferences` header).
