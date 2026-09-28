## Test artifacts — clean up whatever a test run leaves behind
- After any Playwright (or equivalent test-tool) run, **delete the artifacts it produced** — `test-results/`, `playwright-report/`, traces, videos, screenshots, `.last-run.json`, downloaded files and any temp copies. Do it automatically at the end of the job, **even when the run failed, was cancelled, or you exited early**.
- Also stop what you started: kill the background `yarn test` / `test:ui` / report-server processes and close every browser session, then verify with `pgrep -fa 'playwright|chromium|chrome|firefox'`.
- Keep an artifact only when the user asked for it (e.g. "send me the screenshot") or when it IS the deliverable — then say where it is instead of deleting it silently.
