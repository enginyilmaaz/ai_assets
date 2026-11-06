## Test infrastructure — ask before introducing it
- Before writing a test or adding a test framework, check whether the project **already has test infrastructure**: a `test` script, a runner among its dependencies, an existing test folder, a CI step that runs tests.
- **When it has none, stop and ask** whether to set one up, and wait for the answer. Do not introduce a runner, a `test` script, a test folder or a first test on your own initiative — and do not write a test-first plan for such a project until that question has been answered.
- **When it already has one, use it as it is** — the same runner, the same layout, the same command. Adding tests to a project that already tests is ordinary work and needs no permission.
- The reason is cost, not principle: on a small change, standing up a harness and writing the first tests takes longer than the change itself. That is the user's time, and spending it is their call, not an assumption to make on their behalf.
