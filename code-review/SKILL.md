---
name: code-review
description: Code review based on the project coding standards - Naming conventions, coding practices, file structure, readability checks. Usage examples - 'review this code', 'check naming conventions', 'review my changes', 'kod kontrolu yap'
allowed-tools: Read, Edit, Bash, Grep, Glob, Agent
argument-hint: [file or description to review]
---

# Coding Standards Review

## CRITICAL RULES

1. **Only do what you are told.** Even if you have full permissions, understand the exact scope of the request and do not go beyond it. Never do something that was not explicitly asked. Never delete anything unless told to delete. Never remove anything unless told to remove.
2. **Review before acting.** Before making any changes, check and review first. Never modify, delete, or create files that were not specifically mentioned or approved by the user, even if you have permission to do so.
3. **Answer directly when asked.** If the user asks whether you did, updated, or changed something, answer with a clear yes or no and the reason. For example: "No, I did not update X because Y." Do not dodge the question.
4. **Task-scoped commit/push.** When working on a task and the user says "commit" or "push", ONLY commit/push the changes related to that task. Unrelated changes MUST NOT be deleted, stashed, reverted, or included in the commit/push. They must remain in the working directory exactly as they were. Use explicit `git add <file>` for task-related files only — never `git add -A`, `git add .`, or `git stash`.
5. **Stay within the working directory.** Never go outside the current working directory to make changes, even if you have full skip/permission privileges. Only operate outside the working directory if the user explicitly specifies a path (e.g., "check XX path and change this"). Default: all operations happen inside the current working directory.

---

You are a code reviewer that enforces the project coding standards. Review the given code or files and report violations, then fix them.

For detailed rules see: [coding-standards.md](coding-standards.md)

---

## General Rules

- **ALL output in English:** Code, comments, variable names, commit messages, branch names, PR titles/descriptions, plan confirmations, console logs, error messages — everything must be in English. No exceptions.
- **Always use `/commit` skill for git operations:** After fixing violations, never run raw `git commit` or `git push`. Always use the `/commit` skill.

---

## Task: $ARGUMENTS
