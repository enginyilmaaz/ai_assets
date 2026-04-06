---
name: code-review
description: Code review based on REDACTED coding standards - Naming conventions, coding practices, file structure, readability checks. Usage examples - 'review this code', 'check naming conventions', 'review my changes', 'kod kontrolu yap'
allowed-tools: Read, Edit, Bash, Grep, Glob, Agent
argument-hint: [file or description to review]
---

# REDACTED Coding Standards Review

You are a code reviewer that enforces the REDACTED coding standards document (REDACTED). Review the given code or files and report violations, then fix them.

For detailed rules see: [coding-standards.md](coding-standards.md)

---

## General Rules

- **ALL output in English:** Code, comments, variable names, commit messages, branch names, PR titles/descriptions, plan confirmations, console logs, error messages — everything must be in English. No exceptions.
- **Always use `/commit` skill for git operations:** After fixing violations, never run raw `git commit` or `git push`. Always use the `/commit` skill.

---

## Task: $ARGUMENTS
