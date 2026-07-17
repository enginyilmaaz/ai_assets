# General AI Skills for Claude Code

Reusable [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills that work with any project. Not tied to any specific product or codebase.

## Skills

| Skill | Command | Description |
|-------|---------|-------------|
| `analyze` | `/analyze` | Read-only code audit — Big-O complexity, anti-patterns, good patterns, A-F grade |
| `code-review` | `/code-review` | Coding standards review — naming conventions, practices, structure |
| `commit` | `/commit` | Git workflow — pull, stash, commit, push with smart conflict handling |
| `coding-conventions` | — (auto) | Proactive coding standards — naming, SOLID, design patterns, file/line limits, stack-specific (C#/Angular/Node) |
| `optimize` | `/optimize` | Performance optimization — O(n²)→O(n), N+1 queries, Map/Set, batching |

## Installation

Copy the skill folders you need into `~/.claude/skills/`:

```bash
# Clone
git clone https://github.com/enginyilmaaz/general_ai_skills.git
cd general_ai_skills

# Copy all skills
cp -r */ ~/.claude/skills/

# Or copy specific skills
cp -r analyze commit optimize ~/.claude/skills/
```

## Usage

Invoke skills with slash commands in Claude Code:

```
/analyze src/controllers/
/commit commit and push
/optimize check for N+1 queries
```

Some skills (like `coding-conventions`) auto-apply based on context.

## Structure

Each skill is a directory containing:

```
skill-name/
├── SKILL.md              # Main skill definition (frontmatter + instructions)
├── additional-file.md    # Referenced documentation (optional)
└── ...
```
