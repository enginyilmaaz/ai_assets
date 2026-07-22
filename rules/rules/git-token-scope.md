## Git tokens — scoped injection, never clobber global auth
- When a task needs a token to reach one repo (clone / pull / push / API), **NEVER** run `gh auth login`, `gh auth refresh`, or otherwise reset the machine's global GitHub credential — a global reset overwrites the existing auth and can silently revoke access to every other repo.
- Read the current credential non-destructively when you need it: `printf 'protocol=https\nhost=github.com\n\n' | git credential fill`.
- Use the token in a **scoped, reversible** way instead:
  - **Per-command (preferred — nothing persisted):** `git -c http.extraHeader="AUTHORIZATION: bearer <token>" <cmd>`; for REST calls pass it in the `Authorization: Bearer <token>` header.
  - **One-off remote URL:** `git <cmd> https://<token>@github.com/<owner>/<repo>.git …` for a single command only — do **NOT** persist it via `git remote set-url` (that writes the token in plaintext into `.git/config`).
- Rationale: a global auth reset is a destructive side effect that breaks unrelated repos; scoped injection stays isolated and reversible.
