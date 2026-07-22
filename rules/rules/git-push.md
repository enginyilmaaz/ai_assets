## Git — branch push safety
- **Never push directly to any branch other than `dev`.** The default (and normally the only) push target is `dev`.
- **Exception:** if a repo has only ONE branch (e.g. only `main`, no `dev`), that single branch may be pushed directly.
- Whenever a `dev` branch exists alongside other branches, **never push to a non-dev branch directly** — first **ask the user for explicit confirmation** ("about to push to non-dev branch `<name>`, are you sure?") and wait for their answer before pushing.
