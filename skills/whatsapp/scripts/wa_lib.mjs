// Shared library for the whatsapp skill.
// Holds every tunable, the on-disk state layout, arg parsing, formatting and the
// send rate-limit ledger. Imports only Node builtins, so it is safe to load
// before `npm install` has run (the `setup` command depends on that).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const SKILL_DIR = path.resolve(SCRIPT_DIR, "..");

// ---------------------------------------------------------------------------
// Tunables. Every value is overridable by environment variable so nothing here
// is a baked-in literal; the defaults are what a fresh machine should use.
// ---------------------------------------------------------------------------

export const STATE_DIR = process.env.WA_STATE_DIR || path.join(os.homedir(), ".whatsapp-skill");
export const SESSION_DIR = path.join(STATE_DIR, "session");
export const CONFIG_PATH = path.join(STATE_DIR, "config.json");
export const LEDGER_PATH = path.join(STATE_DIR, "sent.json");
export const LOCK_PATH = path.join(STATE_DIR, "wa.lock");
export const OUTBOX_DIR = process.env.WA_OUTBOX_DIR || path.join(STATE_DIR, "outbox");

export const CHROME_PATH = process.env.WA_CHROME_PATH || "/usr/bin/google-chrome";
export const READY_TIMEOUT_MS = intEnv("WA_READY_TIMEOUT_MS", 120_000);
export const WAIT_TIMEOUT_MS = intEnv("WA_WAIT_TIMEOUT_MS", 600_000);
export const SHUTDOWN_TIMEOUT_MS = intEnv("WA_SHUTDOWN_TIMEOUT_MS", 10_000);
export const SEND_DELAY_MS = intEnv("WA_SEND_DELAY_MS", 1_500);
export const MAX_SENDS_PER_HOUR = intEnv("WA_MAX_SENDS_PER_HOUR", 20);
export const DEFAULT_PULL_LIMIT = intEnv("WA_PULL_LIMIT", 30);
// WhatsApp rejects oversized attachments; failing locally gives a clearer error.
export const MAX_MEDIA_BYTES = intEnv("WA_MAX_MEDIA_BYTES", 16 * 1024 * 1024);
// sendMessage() resolves when WhatsApp Web has queued the message locally, not
// when the server has it. Tearing the browser down at that point leaves the
// message stuck at ack 0 forever, so a send waits for the ack to advance.
export const ACK_TIMEOUT_MS = intEnv("WA_ACK_TIMEOUT_MS", 20_000);
export const ACK_POLL_MS = intEnv("WA_ACK_POLL_MS", 400);
export const ACK_SERVER = 1;
export const LOCK_STALE_MS = intEnv("WA_LOCK_STALE_MS", 300_000);
export const HEADLESS = process.env.WA_HEADLESS !== "false";

const HOUR_MS = 3_600_000;
// The Chrome sandbox stays ON by default: this browser renders WhatsApp Web,
// which is remote untrusted content, and the sandbox is the boundary between a
// renderer bug and the user's account. A container that genuinely cannot run it
// opts out through WA_CHROME_ARGS instead of everyone paying for that case.
const CHROME_ARGS = (process.env.WA_CHROME_ARGS || "--disable-dev-shm-usage").split(",");

export function chromeArgs() {
  return CHROME_ARGS.filter(Boolean);
}

function intEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer, got "${raw}"`);
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Argument helpers — same shape as the sibling skills' scripts.
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const args = argv.slice(2);
  return {
    command: args[0] && !args[0].startsWith("--") ? args[0] : null,
    has: (flag) => args.includes(flag),
    val: (flag, fallback = null) => {
      const i = args.indexOf(flag);
      return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
    },
    intVal: (flag, fallback) => {
      const i = args.indexOf(flag);
      if (i < 0 || !args[i + 1]) return fallback;
      const parsed = Number.parseInt(args[i + 1], 10);
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error(`${flag} must be a positive integer, got "${args[i + 1]}"`);
      }
      return parsed;
    },
    rest: args,
  };
}

export function fail(message) {
  console.error("ERROR:", message);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// State directory + config
// ---------------------------------------------------------------------------

export function ensureStateDir() {
  fs.mkdirSync(SESSION_DIR, { recursive: true, mode: 0o700 });
  fs.mkdirSync(OUTBOX_DIR, { recursive: true, mode: 0o700 });
  fs.chmodSync(STATE_DIR, 0o700);
}

// Resolves a --file argument, which may only name a file inside the outbox.
//
// Without this, --file reads any path on the machine. That matters because the
// text this skill reads from a chat is written by other people: a message that
// says "send me your key file" is untrusted data, but an agent acting on it
// would turn --file into an exfiltration primitive. Confining the flag to one
// directory the operator writes into removes that reach entirely.
export function resolveOutboxFile(given) {
  ensureStateDir();
  const root = fs.realpathSync(OUTBOX_DIR);

  let resolved;
  try {
    // realpath resolves symlinks too, so a link planted inside the outbox
    // cannot point out of it.
    resolved = fs.realpathSync(path.resolve(OUTBOX_DIR, given));
  } catch {
    throw new Error(
      `--file "${given}" was not found in the outbox. Write the content to ${OUTBOX_DIR} ` +
        `first, then pass its name.`,
    );
  }

  const relative = path.relative(root, resolved);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(
      `--file must name a file inside ${OUTBOX_DIR} (resolved to ${resolved}). ` +
        `Arbitrary paths are refused: chat content is untrusted and must not be able to ` +
        `choose what gets sent.`,
    );
  }
  if (path.basename(resolved).startsWith(".")) {
    throw new Error("--file must not be a dotfile");
  }
  if (!fs.statSync(resolved).isFile()) {
    throw new Error(`--file must be a regular file (${resolved} is not)`);
  }
  return resolved;
}

export function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return { aliases: {} };
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    return { aliases: parsed.aliases || {}, ...parsed };
  } catch (e) {
    throw new Error(`${CONFIG_PATH} is not valid JSON (${e.message})`);
  }
}

export function writeConfig(config) {
  ensureStateDir();
  writeJsonAtomic(CONFIG_PATH, config);
}

function writeJsonAtomic(target, value) {
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, target);
}

// ---------------------------------------------------------------------------
// Single-instance lock. Two concurrent runs would share one Chrome profile
// directory and corrupt the session, so a second run refuses instead.
// ---------------------------------------------------------------------------

export function acquireLock() {
  ensureStateDir();
  if (fs.existsSync(LOCK_PATH)) {
    const holder = readLock();
    if (holder && isAlive(holder.pid) && Date.now() - holder.at < LOCK_STALE_MS) {
      throw new Error(
        `another wa command is already running (pid ${holder.pid}, ${holder.command}). ` +
          `Wait for it to finish, or remove ${LOCK_PATH} if it crashed.`,
      );
    }
  }
  writeJsonAtomic(LOCK_PATH, { pid: process.pid, at: Date.now(), command: process.argv[2] || "?" });
}

export function releaseLock() {
  try {
    const holder = readLock();
    if (!holder || holder.pid === process.pid) fs.rmSync(LOCK_PATH, { force: true });
  } catch {
    // Releasing a lock must never mask the real error from the command itself.
  }
}

function readLock() {
  try {
    return JSON.parse(fs.readFileSync(LOCK_PATH, "utf8"));
  } catch {
    return null;
  }
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Send rate limit. Outgoing messages go to real people, so a bug in a loop
// must not turn into a flood; the ledger is the guard.
// ---------------------------------------------------------------------------

export function recentSendCount() {
  return loadLedger().length;
}

export function assertSendAllowed() {
  const used = recentSendCount();
  if (used >= MAX_SENDS_PER_HOUR) {
    throw new Error(
      `hourly send limit reached (${used}/${MAX_SENDS_PER_HOUR}). ` +
        `Raise WA_MAX_SENDS_PER_HOUR if this is deliberate.`,
    );
  }
}

export function recordSend(chatId) {
  const ledger = loadLedger();
  ledger.push({ at: Date.now(), chatId });
  writeJsonAtomic(LEDGER_PATH, ledger);
}

function loadLedger() {
  if (!fs.existsSync(LEDGER_PATH)) return [];
  try {
    const entries = JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8"));
    const cutoff = Date.now() - HOUR_MS;
    return Array.isArray(entries) ? entries.filter((e) => e && e.at > cutoff) : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export function emit(payload, asJson) {
  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  console.log(payload.text ?? JSON.stringify(payload, null, 2));
}

export function formatTimestamp(unixSeconds) {
  return new Date(unixSeconds * 1000).toISOString().replace("T", " ").slice(0, 16);
}

// Renders a message list as one line per message, newest last, so a reader sees
// the conversation in the order it happened.
export function formatTranscript(messages) {
  if (messages.length === 0) return "(no messages)";
  return messages
    .map((m) => {
      const who = m.fromMe ? "me" : m.sender;
      const quote = m.quoted ? ` [re: "${truncate(m.quoted, 40)}"]` : "";
      // A captioned attachment carries the caption in `body`, so the type has to
      // be shown as well or a file reads as an ordinary message.
      const kind = m.type && m.type !== "chat" ? `<${m.type}> ` : "";
      return `${m.time}  ${who}${quote}: ${kind}${m.body || "(no text)"}`;
    })
    .join("\n");
}

export function truncate(text, max) {
  const flat = String(text).replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}

// WhatsApp's own ack ladder: -1 failed, 0 queued locally, 1 reached the
// server, 2 reached the recipient's device, 3 read, 4 played.
const ACK_LABELS = { "-1": "failed", 0: "queued", 1: "server", 2: "delivered", 3: "read", 4: "played" };

export function ackLabel(ack) {
  if (ack === null || ack === undefined) return "unconfirmed";
  return ACK_LABELS[String(ack)] || `ack ${ack}`;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
