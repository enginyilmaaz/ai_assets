# Changelog

All notable changes to the global rules catalog are documented here.

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
