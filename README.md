# ai_assets

Public catalog of reusable [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
**assets** — company-agnostic, not tied to any product. Consumed by the AI tool apps as
a single git submodule (`src/assets`). This is the **public** half; the private superset
lives in `smartmarine/sm_ai_assets`, which embeds this repo as its `public/` submodule.

## Layout

```
skills/    reusable skills (each a folder with SKILL.md); skills/hooks.json = skill-attached auto-trigger hooks
rules/     global CLAUDE.md rules — manifest.json (catalog) + rules/<id>.md (bodies) + preamble.md
hooks/     standalone hooks — manifest.json (catalog) + <id>/ (scripts)
```

## Skills

| Skill | Command | Description |
|-------|---------|-------------|
| `analyze` | `/analyze` | Read-only code audit — Big-O complexity, anti-patterns, good patterns, A–F grade |
| `code-review` | `/code-review` | Coding standards review — naming conventions, practices, structure |
| `commit` | `/commit` | Git workflow — pull, stash, commit, push with smart conflict handling |
| `coding-conventions` | — (auto) | Proactive coding standards — naming, SOLID, design patterns, file/line limits |
| `optimize` | `/optimize` | Performance optimization — O(n²)→O(n), N+1 queries, Map/Set, batching |

## Rules

Global instruction-file rules. `rules/manifest.json` is the catalog (`id`, `icon`,
`order`, localized name/description); each `rules/rules/<id>.md` is one `## Heading`
section a rules-manager app merges into `~/.claude/CLAUDE.md`.

## Hooks

Standalone Claude Code hooks. `hooks/manifest.json` is the catalog; each hook ships its
script under `hooks/<id>/` plus the `settings.json` fragment to install. Example:
`voice-notify` — a Stop hook that speaks the finished task's title via edge-tts.

## Consumption

The AI tool apps mount this repo at `src/assets` and install assets onto the machine
(skills → `~/.claude/skills/`, rules → `~/.claude/CLAUDE.md`, hooks → `~/.claude/hooks/`
+ `~/.claude/settings.json`). See `smartmarine_ai_app` / `ai_tools`.
