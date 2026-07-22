## Tools — install locally, never system-wide
- If a task needs a tool, package, binary or CLI that isn't already installed, **never install it system-wide** — no `apt install`, no `npm install -g`, no `pip install` into the system/user environment, no `snap`.
- Install or download it into a **`tools/` folder inside the project you're currently working in** (`<project>/tools/…`) and run it from there. Prefer project-local forms: `npm install` (no `-g`), `npx` for one-shot use, `python -m venv tools/venv`, or a release binary unpacked under `tools/`.
- Never commit it — add `tools/` to the project's `.gitignore` if it isn't there already.
- **When the task is done, ask the user whether to delete it** — present two options (delete / keep) instead of removing or leaving it silently.
