#!/usr/bin/env node
// CLI entry point for the whatsapp skill.
//
// Every command that talks to WhatsApp opens a session, does one job and exits;
// nothing stays running in the background. Sending is a two-step flow: a run
// without --confirm resolves and prints the message but sends nothing.

import { execFileSync } from "node:child_process";
import fs from "node:fs";

import {
  CHROME_PATH,
  CONFIG_PATH,
  DEFAULT_PULL_LIMIT,
  MAX_SENDS_PER_HOUR,
  OUTBOX_DIR,
  ackLabel,
  formatBytes,
  SESSION_DIR,
  SKILL_DIR,
  STATE_DIR,
  WAIT_TIMEOUT_MS,
  acquireLock,
  assertSendAllowed,
  emit,
  fail,
  formatTranscript,
  parseArgs,
  readConfig,
  recentSendCount,
  recordSend,
  releaseLock,
  resolveOutboxFile,
  writeConfig,
} from "./wa_lib.mjs";

import {
  assertChromeAvailable,
  describeAccount,
  fetchTranscript,
  listGroups,
  loadLibrary,
  resolveChatId,
  sendMedia,
  sendText,
  sessionExists,
  shutdown,
  createSession,
  waitForReply,
} from "./wa_client.mjs";

const USAGE = `whatsapp skill — read and send messages in a chat, on demand.

  setup                                      install dependencies and check the machine
  doctor                                     report what is ready and what is missing
  login                                      link the bot number by QR code (one time)
  logout --confirm                           drop the linked session
  status                                     show which number is linked
  chats                                      list the groups this number is in
  alias --name <alias> --chat <id|name>      remember a chat under a short name
  alias --list | --remove <alias>            show or forget saved aliases
  pull --chat <alias> [--limit N]            read the last N messages
  send --chat <alias> --text "..."           PREVIEW only, nothing is sent
  send --chat <alias> --text "..." --confirm send it
  send --chat <alias> --media <name> --confirm  send a file from the outbox
  ask  --chat <alias> --text "..." --confirm send, then wait for the reply

Common flags: --json  --file <name in outbox>  --code  --media <name in outbox>
              --as-document | --as-media  --quote <msgId>  --wait <seconds>
              --mode any|quoted
--file and --media may only name a file inside the outbox directory; arbitrary
paths are refused. With --media, --text becomes the caption.
Settings come from environment variables (WA_STATE_DIR, WA_OUTBOX_DIR, WA_CHROME_PATH,
WA_MAX_SENDS_PER_HOUR, WA_READY_TIMEOUT_MS, WA_WAIT_TIMEOUT_MS, WA_HEADLESS).
`;

const COMMANDS = {
  setup: cmdSetup,
  doctor: cmdDoctor,
  login: cmdLogin,
  logout: cmdLogout,
  status: cmdStatus,
  chats: cmdChats,
  alias: cmdAlias,
  pull: cmdPull,
  send: cmdSend,
  ask: cmdAsk,
};

const args = parseArgs(process.argv);
const asJson = args.has("--json");

if (!args.command || args.has("--help") || args.has("-h")) {
  console.log(USAGE);
  process.exit(args.command ? 0 : 1);
}

const handler = COMMANDS[args.command];
if (!handler) fail(`unknown command "${args.command}". Run with --help for the list.`);

try {
  await handler();
  process.exit(0);
} catch (e) {
  fail(e.message);
}

// ---------------------------------------------------------------------------
// Machine setup
// ---------------------------------------------------------------------------

async function cmdSetup() {
  const steps = [];

  assertChromeAvailable();
  steps.push(`chrome        OK  ${CHROME_PATH}`);

  console.error("Installing dependencies (this downloads no second browser)...");
  execFileSync("npm", ["install", "--no-audit", "--no-fund"], {
    cwd: SKILL_DIR,
    stdio: "inherit",
    env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: "true" },
  });
  await loadLibrary();
  steps.push("dependencies  OK  whatsapp-web.js installed");

  fs.mkdirSync(SESSION_DIR, { recursive: true, mode: 0o700 });
  steps.push(`state dir     OK  ${STATE_DIR} (mode 700)`);

  const linked = sessionExists();
  steps.push(
    linked
      ? "session       OK  a number is already linked"
      : "session       --  not linked yet, next step: wa.mjs login",
  );

  emit({ ok: true, linked, steps, text: `${steps.join("\n")}\n\nSetup complete.` }, asJson);
}

async function cmdDoctor() {
  const checks = [
    check("node", process.version, true),
    check("chrome", CHROME_PATH, fs.existsSync(CHROME_PATH)),
    check("dependencies", "whatsapp-web.js", await dependencyPresent()),
    check("state dir", STATE_DIR, fs.existsSync(STATE_DIR)),
    check("session", SESSION_DIR, sessionExists()),
    check("config", CONFIG_PATH, fs.existsSync(CONFIG_PATH)),
    check("outbox", OUTBOX_DIR, fs.existsSync(OUTBOX_DIR)),
    check("sends this hour", `${recentSendCount()}/${MAX_SENDS_PER_HOUR}`, true),
  ];
  const text = checks.map((c) => `${c.ok ? "OK  " : "--  "}${c.name.padEnd(16)}${c.detail}`).join("\n");
  emit({ ok: checks.every((c) => c.ok), checks, text }, asJson);
}

function check(name, detail, ok) {
  return { name, detail, ok: Boolean(ok) };
}

async function dependencyPresent() {
  try {
    await loadLibrary();
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

async function cmdLogin() {
  if (sessionExists() && !args.has("--force")) {
    emit(
      { ok: true, text: "A session already exists. Use --force to re-link, or run: wa.mjs status" },
      asJson,
    );
    return;
  }

  const { default: qrcode } = await import("qrcode-terminal");
  await withClient(
    async (client) => {
      const account = describeAccount(client);
      emit({ ok: true, ...account, text: `Linked: +${account.number} (${account.name})` }, asJson);
    },
    {
      onQr: (qr) => {
        console.error("\nScan this with the bot number: WhatsApp > Settings > Linked devices\n");
        qrcode.generate(qr, { small: true });
      },
    },
  );
}

async function cmdLogout() {
  if (!args.has("--confirm")) {
    emit(
      {
        ok: true,
        sent: false,
        text:
          `This removes the linked session at ${SESSION_DIR}; the next use needs a new QR scan.\n` +
          "NOT DONE : re-run with --confirm",
      },
      asJson,
    );
    return;
  }
  fs.rmSync(SESSION_DIR, { recursive: true, force: true });
  emit({ ok: true, text: "Session removed. Re-link with: wa.mjs login" }, asJson);
}

async function cmdStatus() {
  await withClient(async (client) => {
    const account = describeAccount(client);
    const text =
      `linked number : +${account.number}\n` +
      `display name  : ${account.name}\n` +
      `sends this hour: ${recentSendCount()}/${MAX_SENDS_PER_HOUR}`;
    emit({ ok: true, ...account, text }, asJson);
  });
}

// ---------------------------------------------------------------------------
// Chats and aliases
// ---------------------------------------------------------------------------

async function cmdChats() {
  await withClient(async (client) => {
    const groups = await listGroups(client);
    const text = groups.length
      ? groups.map((g) => `${g.name}\n  ${g.id}${g.unread ? `  (${g.unread} unread)` : ""}`).join("\n")
      : "(this number is in no groups)";
    emit({ ok: true, groups, text }, asJson);
  });
}

async function cmdAlias() {
  const config = readConfig();

  if (args.has("--list") || (!args.val("--name") && !args.val("--remove"))) {
    const entries = Object.entries(config.aliases);
    const text = entries.length
      ? entries.map(([k, v]) => `${k.padEnd(12)} ${aliasId(v)}  ${aliasName(v)}`).join("\n")
      : `(no aliases yet — save one with: wa.mjs alias --name erp --chat "<group name>")`;
    emit({ ok: true, aliases: config.aliases, text }, asJson);
    return;
  }

  const removing = args.val("--remove");
  if (removing) {
    if (!config.aliases[removing]) throw new Error(`no alias named "${removing}"`);
    delete config.aliases[removing];
    writeConfig(config);
    emit({ ok: true, text: `Removed alias "${removing}".` }, asJson);
    return;
  }

  const name = args.val("--name");
  const target = args.val("--chat");
  if (!target) throw new Error("alias --name <alias> needs --chat <id or group name>");

  // Resolving through a live session means an alias can be saved from a group
  // name, and that the saved id is one WhatsApp actually knows.
  await withClient(async (client) => {
    const chatId = await resolveChatId(client, target);
    const chat = await client.getChatById(chatId);
    config.aliases[name] = { id: chatId, name: chat.name || chatId };
    writeConfig(config);
    emit({ ok: true, alias: name, id: chatId, text: `"${name}" -> ${chat.name} (${chatId})` }, asJson);
  });
}

function aliasId(value) {
  return typeof value === "string" ? value : value.id;
}

function aliasName(value) {
  return typeof value === "string" ? "" : value.name || "";
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

async function cmdPull() {
  const target = requireChat();
  const limit = args.intVal("--limit", DEFAULT_PULL_LIMIT);

  await withClient(async (client) => {
    const chatId = await resolveChatId(client, target);
    const { chatName, messages } = await fetchTranscript(client, chatId, limit);
    emit(
      { ok: true, chat: chatName, chatId, count: messages.length, messages,
        text: `${chatName} — last ${messages.length}\n\n${formatTranscript(messages)}` },
      asJson,
    );
  });
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

async function cmdSend() {
  if (args.val("--media")) {
    await sendAttachment();
    return;
  }

  const { target, text, file } = sendInputs();

  if (!args.has("--confirm")) {
    emit(previewPayload(target, text, "send", file), asJson);
    return;
  }

  assertSendAllowed();
  await withClient(async (client) => {
    const chatId = await resolveChatId(client, target);
    const sent = await sendText(client, chatId, text, { quotedMessageId: args.val("--quote") });
    recordSend(chatId);
    const report = deliveryReport(sent, chatId);
    emit(
      { ok: true, sent: report.confirmed, ack: report.ack, ackLabel: report.ackLabel, chatId,
        messageId: sent.id, text: `${report.headline}\nid: ${sent.id}` },
      asJson,
    );
  });
}

async function sendAttachment() {
  const target = requireChat();
  const media = resolveOutboxFile(args.val("--media"));
  const caption = args.val("--text");
  const bytes = fs.statSync(media).size;
  const asDocument = args.has("--as-document") ? true : args.has("--as-media") ? false : null;

  if (!args.has("--confirm")) {
    const alias = readConfig().aliases[target];
    const where = alias ? `${aliasName(alias)} (${aliasId(alias)})` : `${target} (resolved on send)`;
    emit(
      { ok: true, sent: false, chat: where, media, bytes,
        text:
          `chat    : ${where}\n` +
          `quota   : ${recentSendCount()}/${MAX_SENDS_PER_HOUR} sends this hour\n` +
          `file    : ${media} (${formatBytes(bytes)})\n` +
          `caption : ${caption || "(none)"}\n` +
          `NOT SENT : re-run the same send with --confirm` },
      asJson,
    );
    return;
  }

  assertSendAllowed();
  await withClient(async (client) => {
    const chatId = await resolveChatId(client, target);
    const sent = await sendMedia(client, chatId, media, { caption, asDocument });
    recordSend(chatId);
    const report = deliveryReport(sent, chatId);
    emit(
      { ok: true, ...sent, sent: report.confirmed, ackLabel: report.ackLabel, chatId, messageId: sent.id,
        text:
          `${report.headline}\n` +
          `rode as: ${sent.asDocument ? "document" : "inline media"}\n` +
          `file: ${media} (${sent.mimetype}, ${formatBytes(sent.bytes)})\nid: ${sent.id}` },
      asJson,
    );
  });
}

async function cmdAsk() {
  const { target, text, file } = sendInputs();
  const waitSeconds = args.intVal("--wait", 0);
  const waitMs = waitSeconds > 0 ? waitSeconds * 1000 : WAIT_TIMEOUT_MS;
  const mode = args.val("--mode", "any");
  if (!["any", "quoted"].includes(mode)) throw new Error(`--mode must be "any" or "quoted"`);

  if (!args.has("--confirm")) {
    const preview = previewPayload(target, text, "ask", file);
    preview.text += `\nThen waits up to ${Math.round(waitMs / 1000)}s for a reply (mode: ${mode}).`;
    emit(preview, asJson);
    return;
  }

  assertSendAllowed();
  await withClient(async (client) => {
    const chatId = await resolveChatId(client, target);
    // The listener is attached before sending so a fast reply cannot slip past.
    const sentRef = {};
    const pending = waitForReply(client, { chatId, sentRef, mode, timeoutMs: waitMs });

    const sent = await sendText(client, chatId, text, { quotedMessageId: args.val("--quote") });
    sentRef.id = sent.id;
    recordSend(chatId);
    const report = deliveryReport(sent, chatId);
    console.error(`${report.headline}; waiting up to ${Math.round(waitMs / 1000)}s for a reply...`);

    const reply = await pending;
    const body = reply
      ? `REPLY from ${reply.sender} at ${reply.time}:\n${reply.body || `<${reply.type}>`}`
      : `NO REPLY within ${Math.round(waitMs / 1000)}s. Read later with: wa.mjs pull --chat ${target}`;
    emit(
      { ok: true, sent: report.confirmed, ack: report.ack, ackLabel: report.ackLabel, chatId,
        messageId: sent.id, reply, text: `${report.headline}\n\n${body}` },
      asJson,
    );
  });
}

function sendInputs() {
  const target = requireChat();
  const given = args.val("--file");
  const file = given ? resolveOutboxFile(given) : null;
  let text = file ? fs.readFileSync(file, "utf8") : args.val("--text");
  if (!text || !text.trim()) throw new Error("nothing to send. Pass --text \"...\" or --file <name>");
  if (args.has("--code")) text = ["```", text.replace(/\s+$/, ""), "```"].join("\n");
  return { target, text, file };
}

function previewPayload(target, text, verb, file = null) {
  const alias = readConfig().aliases[target];
  const where = alias ? `${aliasName(alias)} (${aliasId(alias)})` : `${target} (resolved on send)`;
  // A file-backed send always names its source and size: the operator has to be
  // able to see what is about to leave the machine, not just the rendered text.
  const source = file ? `source: ${file} (${fs.statSync(file).size} bytes)\n` : "";
  return {
    ok: true,
    sent: false,
    chat: where,
    body: text,
    file,
    text:
      `chat  : ${where}\n` +
      `quota : ${recentSendCount()}/${MAX_SENDS_PER_HOUR} sends this hour\n` +
      source +
      `----- message -----\n${text}\n-------------------\n` +
      `NOT SENT : re-run the same ${verb} with --confirm`,
  };
}

// Says what WhatsApp actually confirmed. A send that never left the queue must
// not be reported as sent — that was the original defect: sendMessage() resolves
// on a local queue, so "SENT" was printed for messages that never arrived.
function deliveryReport(sent, chatId) {
  const ack = sent.ack;
  if (typeof ack === "number" && ack < 0) {
    throw new Error(
      `WhatsApp rejected the message (ack ${ack}) to ${chatId}. It was not delivered. ` +
        `Check the recipient and try once more; do not loop.`,
    );
  }
  const confirmed = typeof ack === "number" && ack >= 1;
  const headline = confirmed
    ? `SENT to ${chatId} (confirmed: ${ackLabel(ack)})`
    : `QUEUED to ${chatId} — NOT CONFIRMED.\n` +
      `WhatsApp did not acknowledge it in time, so it may never arrive. Check the chat with ` +
      `"pull" before sending it again — resending blindly can deliver it twice.`;
  return { confirmed, ack, ackLabel: ackLabel(ack), headline };
}

function requireChat() {
  const target = args.val("--chat");
  if (!target) throw new Error("--chat <alias|id|group name> is required");
  return target;
}

// ---------------------------------------------------------------------------
// Session lifecycle shared by every WhatsApp-touching command
// ---------------------------------------------------------------------------

async function withClient(job, { onQr = null } = {}) {
  acquireLock();
  const { client, ready } = await createSession({ onQr });
  try {
    await ready;
    await job(client);
  } finally {
    await shutdown(client);
    releaseLock();
  }
}
