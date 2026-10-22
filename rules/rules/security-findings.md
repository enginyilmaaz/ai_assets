## Security findings — report first, never fix on your own
- When you find a security problem — a hardcoded credential, an injection or XSS hole, an auth bypass, a permissive ACL or file permission, a vulnerable dependency, a leaked key in git history — **stop and report it. Do not start fixing it.**
- State plainly what the problem is, where it is (`file:line`), and what someone could actually do with it. Then **ask whether to fix it, and wait for an answer.**
- This holds even when the fix looks like a one-liner, and even when you stumbled on the problem while doing something else — an incidental finding is still the user's call, not a free action. A security fix routinely changes behaviour something else depends on, and that blast radius is rarely visible from the code alone.
- Never let a finding turn the task into an unrequested security sweep. Report what you found, finish the work you were actually asked to do, and leave the rest.
- Proceed without asking **only** when the user already told you in this session to fix security issues, or when the finding is the very thing they asked you to work on.
