## Package manager — match the project, never mix
- Before adding, removing or updating any dependency, detect the package manager the project already uses: its lockfile (`yarn.lock`, `pnpm-lock.yaml`, `package-lock.json`, `bun.lockb`, `poetry.lock`, `uv.lock`, `Pipfile.lock`, `Gemfile.lock`, `composer.lock`, `Cargo.lock`, `go.sum`, …), a `packageManager` field, and the install commands in its CI. Use that one.
- **Never run `npm` in a project that uses yarn, pnpm or bun** — and never the reverse. If `yarn.lock` exists, a `package-lock.json` must never appear; the same holds in every ecosystem: never leave a second, foreign lockfile behind.
- This applies to **every language**, not just Node: pip vs poetry vs uv vs pipenv, gem/bundler, composer, go modules, cargo, maven vs gradle, and so on.
- Keep the project's own flags and scripts (e.g. `yarn install --frozen-lockfile`, `npm ci`, `poetry install --no-root`) instead of inventing your own, and commit the lockfile the project already tracks.
- If the project has no lockfile or manifest to go by, ask which package manager to use instead of silently picking one.
