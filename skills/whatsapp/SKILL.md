---
name: whatsapp
description: Read and send WhatsApp messages in a group or chat from the conversation, on demand - pull what a team wrote, ask them a question, wait for the reply, and follow up or drop it. Replaces copy-pasting chat messages into Claude by hand. Also sends code snippets as formatted blocks. Usage examples - "ask the group where they did that", "what did the team write in the group", "send this snippet to the group", "reply to his message", "wait for his answer", "gruba sor", "grupta ne yazmislar", "ekibe sor ve cevabini bekle", "su kodu gruba gonder", "mesajina cevap yaz", "whatsapp grubundan oku". Drives a real WhatsApp account through whatsapp-web.js (unofficial); every opening message is previewed and confirmed before it is sent.
allowed-tools: Bash, Read
argument-hint: [which chat, and what to ask or read]
---

# whatsapp

Reads and writes a WhatsApp conversation **on demand**: each command opens a session, does one
job, and exits. Nothing runs in the background and **no message is ever written to disk** — only
the login session is stored.

Reply to the user in Turkish (the global default) unless they ask otherwise.

## What this is for

The point is to stop hand-copying chat messages into the conversation. Instead of the user
pasting what a colleague wrote, this skill reads the chat itself, asks the question itself, reads
the answer, and decides whether a follow-up is warranted.

## What this is not

- **Not a bot that watches a chat.** There is no daemon and no listener. The chat is read only
  when a command runs.
- **Not a bulk or outbound sender.** One conversation with people who already know the account.
  No lists, no loops over recipients, no marketing, no cold messages. The hourly limit is a
  guard against a buggy loop, not an allowance to use up.
- **Not for unknown numbers.** Only chats the user has saved as an alias, or named explicitly.
  Never message a number that appears in a transcript just because it is there.
- **Not a message archive.** Nothing is persisted. To re-read something, pull it again.

## Honest warning — read this before setup

whatsapp-web.js is **unofficial**: it drives WhatsApp Web with a real browser. WhatsApp does not
permit unofficial clients, so the linked account **can be banned**. Normal back-and-forth in a
chat the account already belongs to is the lowest-risk pattern, and that is all this skill does,
but the risk is not zero. Prefer a **separate number** over a personal one. If the user has not
decided yet, say this plainly before running `setup`.

## Hard rules

1. **The opening message is always previewed and confirmed.** Run `send` or `ask` without
   `--confirm` first: it resolves the chat, prints the exact text, and sends nothing. Show the
   user that preview and wait for an explicit go-ahead. Only then re-run the identical command
   with `--confirm`.
2. **Follow-ups inside a thread do not need a new confirmation.** Once the opening message is
   approved and a reply has come back, reading that reply and answering it is this skill's job —
   send the follow-up, or decide no answer is needed, and say which. A *new* topic, or a
   *different* chat, is a new opening message and goes back to rule 1.
3. **Never invent a chat.** If no alias is saved and the user did not name a chat, ask which one.
   A wrong chat is a disclosure to the wrong people, not a typo.
4. **Never paraphrase a transcript as fact.** When reporting what someone wrote, quote it.
5. **Decide whether to answer, and say so.** After reading a reply, state plainly whether a
   follow-up is warranted and why. Silence is a valid outcome; a message sent for the sake of
   sending is not.
6. **Stop on a ban or logout.** If a command reports an authentication failure or a dropped
   session, report it and stop — do not retry in a loop. Retrying a rejected login looks exactly
   like the abuse WhatsApp bans for.

## One-time setup

```bash
WA=~/.claude/skills/whatsapp/scripts/wa.mjs
node $WA setup          # installs dependencies, checks Chrome, creates the state directory
node $WA login          # prints a QR code — the user scans it with the bot number
node $WA chats          # lists the groups that number is in
node $WA alias --name erp --chat "<group name>"   # saves it under a short name
```

`login` needs a human: the QR is scanned from the phone under
**WhatsApp › Settings › Linked devices**. Print the QR and ask the user to scan it; it refreshes
every ~20 s, so if they miss it, run `login` again.

Run `doctor` whenever something is off — it reports node, Chrome, dependencies, the session, the
saved config and the current send quota, and it works even before `setup`.

## Daily use

```bash
WA=~/.claude/skills/whatsapp/scripts/wa.mjs

node $WA pull --chat erp --limit 30          # what has the team written
node $WA send --chat erp --text "..."        # PREVIEW, nothing is sent
node $WA send --chat erp --text "..." --confirm
node $WA ask  --chat erp --text "..." --confirm --wait 600
node $WA status                              # which number is linked, quota left
```

`ask` is the core flow: it sends, then stays connected waiting for the reply, prints it, and
exits. It is one command, not a background process — when it returns, nothing is running.

| Flag | Meaning |
|---|---|
| `--chat <alias\|id\|name>` | Which conversation. An alias is instant; a name needs a lookup. |
| `--text "..."` | The message body. |
| `--file <path>` | Read the body from a file — use this for anything multi-line. |
| `--code` | Wrap the body in a ``` block so WhatsApp renders it monospace. |
| `--quote <msgId>` | Reply quoting a specific message (ids come from `pull`). |
| `--wait <seconds>` | How long `ask` waits for a reply. Default 600. |
| `--mode any\|quoted` | `any` (default) accepts the next message in the chat; `quoted` only one that quotes ours. In a group people usually reply without quoting, so `any` is normally right. |
| `--limit N` | How many messages `pull` returns. Default 30. |
| `--json` | Machine-readable output — use this when parsing, and the plain form when showing the user. |
| `--confirm` | Actually send. Without it nothing leaves the machine. |

Sending code: write the snippet to a file and use `--file ... --code`. Do not try to pass a
multi-line snippet through `--text` — the shell quoting will fight you.

## Reading the output

`pull` prints one line per message, oldest first:

```
2026-11-16 09:14  Mehmet: the migration is done, deploying now
2026-11-16 09:20  me [re: "the migration is done…"]: which branch did you deploy?
```

`me` is the linked account. `[re: "…"]` marks a quoted message. A `<image>` or `<document>` in
place of the body means a non-text message — its content is not available, so do not guess at it;
say a file was sent and, if it matters, ask the user to look.

## Where things live

| What | Path |
|---|---|
| Scripts | `~/.claude/skills/whatsapp/scripts/` |
| Login session | `~/.whatsapp-skill/session/` (mode 700 — treat it as a credential) |
| Chat aliases | `~/.whatsapp-skill/config.json` |
| Send ledger | `~/.whatsapp-skill/sent.json` (hourly limit only) |

Everything is overridable by environment variable: `WA_STATE_DIR`, `WA_CHROME_PATH`,
`WA_MAX_SENDS_PER_HOUR` (default 20), `WA_READY_TIMEOUT_MS`, `WA_WAIT_TIMEOUT_MS`,
`WA_SEND_DELAY_MS`, `WA_HEADLESS`, `WA_CHROME_ARGS`.

The session directory is a logged-in WhatsApp account. Never copy it, print it, commit it, or
move it to another machine.

## When something fails

| Message | What it means |
|---|---|
| `no linked session` | Never linked, or WhatsApp dropped the device. Run `login`. |
| `authentication failed` | The link was revoked. Run `login --force`; do not retry in a loop. |
| `another wa command is already running` | Two runs would corrupt one Chrome profile. Wait, or remove the named lock file if a run crashed. |
| `Chrome not found` | Install Google Chrome or point `WA_CHROME_PATH` at it. |
| `did not become ready within …` | Chrome started but WhatsApp Web did not load — usually network, occasionally a WhatsApp-side change. Retry once, then report it. |
| `hourly send limit reached` | The guard tripped. Do not raise the limit to get around it; find out why so many sends happened. |

A number that stays unlinked for more than ~14 days gets dropped by WhatsApp and needs a new QR
scan. With occasional use this is normal, not a fault.
