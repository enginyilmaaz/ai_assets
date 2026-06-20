---
name: coding-conventions
description: Proactively apply Smartmarine coding standards (SM23001) WHILE writing code - naming, new-file placement, readability, modularity, SOLID, design patterns, max file/line size, English comments. Invoke BEFORE and WHILE creating or editing ANY code in any stack (.NET/C#, Angular, Node/TS, etc.). Usage examples - writing new code, creating a file, adding a function/class/endpoint/component, implementing a feature, refactoring; 'kod yaz', 'yeni dosya olustur', 'fonksiyon ekle', 'class ekle', 'feature yaz', 'endpoint ekle', 'component olustur'.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

# Coding Conventions (Proactive - SM23001)

Apply this BEFORE and WHILE writing code, not after. It is the **proactive twin** of the
`code-review` skill: both enforce the SAME rules from one source of truth.

**Single source of truth:** [coding-standards.md](../code-review/coding-standards.md)
(absolute path: `/home/administrator/.claude/skills/code-review/coding-standards.md`)

Read it for the full, detailed rule set. This SKILL.md is the short "when + how to apply"
wrapper - it does not duplicate the rules.

---

## CRITICAL RULES (guardrails)

1. **Existing convention wins.** Never refactor working code just to match these standards.
   Match the surrounding file/module style. Greenfield code -> apply all rules fully.
2. **Only do what you are told.** Stay within the task scope and the working directory; never
   modify, delete, or create files that were not requested.
3. **All output in English** - code, identifiers, comments, commit messages, logs, errors.
   No exceptions.

---

## Workflow (every coding task)

1. **Analyze the project first.** Before creating anything, scan the structure (`ls`/Glob key
   dirs, read 2-3 sibling files) to learn the project's logic, architecture, stack, and
   conventions. (coding-standards.md Rule 0, 0.1)
2. **Place new files where they belong.** Mirror the existing project layout - a new
   service/controller/component goes next to its peers, in the matching folder, with the
   matching file-name convention. Reuse existing helpers/bases before adding new files. Do not
   invent a new structure. (Rule 0.2)
3. **Detect the stack** and apply its specific conventions (§4). Watch the overrides: C# methods
   are **PascalCase**, Angular files are **kebab-case** - these differ from the TS defaults.
4. **Write to the standards** - naming (§1), verb-object methods, no magic numbers, curly
   braces, <=4 params, etc. (§2).
5. **Keep it readable & modular** - small single-purpose units, **SOLID** principles, and the
   **right design pattern for the problem** (§2.13-§2.15). Do NOT force patterns / over-engineer
   (YAGNI) - choose the pattern that fits; the simplest correct design wins.
6. **Size limits** - **max 800 lines per file**, **max 130 chars per line (target 120)**. Over
   the limit -> split by responsibility (extract class/function). (§2.2, §2.4)
7. **Comment the non-obvious.** Self-explanatory code needs no comments; when logic is
   non-trivial (algorithm, business rule, workaround, non-obvious "why"), add a short English
   comment on the WHY. (§2.5)

---

## Relationship to other skills

- **Complementary** to domain skills (`erp`, `erp-frontend`, `sp`, `dm`, the scaffolds): those
  define architecture/structure; this defines cross-cutting naming, readability, and practices.
  Domain skill wins on architecture; this skill wins on style/conventions; local convention
  wins over both.
- **Reactive counterpart:** run the `code-review` skill to audit code after the fact. Same rules,
  different timing.
