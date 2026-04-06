# General AI Skills for Claude Code

Reusable [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills that work with any project. Not tied to any specific product or codebase.

## Skills

| Skill | Command | Description |
|-------|---------|-------------|
| `analyze` | `/analyze` | Read-only code audit — Big-O complexity, anti-patterns, good patterns, A-F grade |
| `code-review` | `/code-review` | Coding standards review — naming conventions, practices, structure |
| `commit` | `/commit` | Git workflow — pull, stash, commit, push with smart conflict handling |
| `general-coding` | — (auto) | General coding rules — language, scope, no hardcoded values, http-status-codes |
| `optimize` | `/optimize` | Performance optimization — O(n²)→O(n), N+1 queries, Map/Set, batching |
| `fullstack-scaffold` | `/fullstack-scaffold` | Full-stack project (backend + frontend) in one command |
| `nodejs-backend-scaffold` | `/nodejs-backend-scaffold` | Node.js Express backend with layered architecture |
| `nextjs-frontend-scaffold` | `/nextjs-frontend-scaffold` | Next.js frontend with MUI, React Query, CASL ACL |
| `playwright` | `/playwright` | E2E testing — Chrome + Firefox, FHD + 2K, HTML report |
| `jira-api` | `/jira-api` | Jira REST API wrapper — attachments, transitions, assignment, search |

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
/playwright write login test
/jira-api PROJ-123
```

Some skills (like `general-coding`) auto-apply based on context.

## Structure

Each skill is a directory containing:

```
skill-name/
├── SKILL.md              # Main skill definition (frontmatter + instructions)
├── additional-file.md    # Referenced documentation (optional)
└── ...
```
