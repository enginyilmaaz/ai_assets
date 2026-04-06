---
description: 
globs: 
alwaysApply: true
---

# General Coding Rules

These rules apply to ALL projects — ERP, standalone backends, frontends, and any other codebase.

---

## Language & Communication

Answer in the language of the question:

Respond in whichever language the question is asked. All explanations, status updates, questions, and communication with the user MUST be in the same language the user is writing in. When writing code, always use English programming language syntax. All comment lines within code must always be written in English regardless of the language used in the question. API response messages, error messages, and log messages in code stay in English.

Comment Language:

All comment lines within the code must always be written in English.

---

## Scope & Change Control

Strict Scope Boundaries:

Only change or correct the requested parts of the code.
Do not modify unrelated code blocks.
Before making any change, clearly identify the scope/boundaries of the given prompt or task. Do NOT touch, modify, refactor, rename, or delete anything outside those boundaries. If a task says "fix function X", only function X is modified — nothing else in the file changes. If a task says "add endpoint Y", only the new endpoint and its direct dependencies are created — existing code remains untouched.

No Unnecessary Changes:

Make modifications only if explicitly requested.
Do not alter or remove existing variable names, function names, or code segments unless instructed.

Code Originality:

Apply changes only to the parts explicitly mentioned by the user.
The structure, flow, and functionality of the existing code must remain intact.

---

## Code Output

Complete Code Output:

When code corrections are requested, return the complete code — even if it is lengthy.
If a specific function is requested, only that function should be returned; if the request is to return the entire code, then output the complete code.

Placeholders:

When fixing placeholders, write a sensible message with proper sentence structure (i.e., only the first letter is capitalized).

Mandatory Fields:

For mandatory fields, add (*) (including parentheses) in red to the right of the label.

---

## Code Quality

Senior Software Developer Approach:

Write code with a senior software developer mindset, focusing on algorithmic logic, code optimization, readability, and maintainability.

No Hardcoded Values (No Magic Numbers):

Never pass hardcoded literal values directly as function arguments or inline in logic. Always use named constants, variables, or function parameters with descriptive names. This applies everywhere — controllers, services, helpers, and all layers.

BAD:
```typescript
updateReferences(1, 10);
fetchData(0, 25);
setTimeout(() => {}, 3000);
if (status === 2) { ... }
```

GOOD:
```typescript
const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_PAGE_PER_ITEM = 10;
updateReferences(DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_PER_ITEM);

const FETCH_OFFSET = 0;
const FETCH_LIMIT = 25;
fetchData(FETCH_OFFSET, FETCH_LIMIT);

const RETRY_DELAY_MS = 3000;
setTimeout(() => {}, RETRY_DELAY_MS);

const STATUS_APPROVED = 2;
if (status === STATUS_APPROVED) { ... }
```

If the values come from a function parameter, use that parameter — do not re-hardcode the value at the call site.

HTTP Status Codes — Use `http-status-codes` Package:

All HTTP status codes MUST use the `http-status-codes` npm package instead of raw numbers. Import `StatusCodes` from the package and use named constants.

```typescript
import { StatusCodes } from "http-status-codes";

// BAD
res.status(200).json(data);
res.status(400).json({ error: "Bad request" });
res.status(404).json({ error: "Not found" });
res.status(500).json({ error: "Server error" });

// GOOD
res.status(StatusCodes.OK).json(data);
res.status(StatusCodes.BAD_REQUEST).json({ error: "Bad request" });
res.status(StatusCodes.NOT_FOUND).json({ error: "Not found" });
res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Server error" });
```

Common StatusCodes: OK (200), CREATED (201), BAD_REQUEST (400), UNAUTHORIZED (401), FORBIDDEN (403), NOT_FOUND (404), INTERNAL_SERVER_ERROR (500).

---

## Git Operations

Always Use `/commit` Skill:

When committing or pushing code, ALWAYS use the `/commit` skill (via the Skill tool) instead of running raw `git commit` or `git push` commands. The `/commit` skill handles auto-pull, stash management, conflict detection, logical commit splitting, and push — never bypass it with direct git commands.

---

## Duplicate Prevention

Search Existing Files and Components:

Before creating ANY new file (model, service, controller, helper, etc.):
1. Search the current project for files with similar names or purposes using Glob and Grep
2. If a similar file or component exists:
   - Ask the user whether to extend/modify the existing one or create a new one
   - Explain what was found and how it relates to the requested task
3. If no similar file exists, proceed with creation directly
4. For functions/methods: search for existing methods with similar names or logic in the same service/controller before writing new ones
