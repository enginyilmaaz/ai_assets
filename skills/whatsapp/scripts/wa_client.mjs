// WhatsApp Web client wrapper for the whatsapp skill.
// Owns every interaction with whatsapp-web.js: bringing a session up, resolving
// a chat, reading a transcript, sending, and waiting for a reply.
//
// whatsapp-web.js is imported dynamically so that commands which do not touch
// WhatsApp (`setup`, `alias`, `doctor`) still run before the dependency exists.

import fs from "node:fs";

import {
  CHROME_PATH,
  HEADLESS,
  MAX_MEDIA_BYTES,
  READY_TIMEOUT_MS,
  SEND_DELAY_MS,
  SESSION_DIR,
  SHUTDOWN_TIMEOUT_MS,
  STATE_DIR,
  SKILL_DIR,
  WAIT_TIMEOUT_MS,
  chromeArgs,
  ensureStateDir,
  formatTimestamp,
  readConfig,
  sleep,
  truncate,
} from "./wa_lib.mjs";

const GROUP_SUFFIX = "@g.us";
const USER_SUFFIX = "@c.us";
// An international number, with or without +, spaces, dashes or brackets.
const PHONE_PATTERN = /^\+?[1-9]\d{9,14}$/;

export async function loadLibrary() {
  try {
    // whatsapp-web.js is CommonJS, so a dynamic import puts its exports on
    // `default`; older/bundled resolutions expose them as named exports.
    const mod = await import("whatsapp-web.js");
    return mod.default?.Client ? mod.default : mod;
  } catch (e) {
    throw new Error(
      `whatsapp-web.js is not installed (${e.code || e.message}). ` +
        `Run: node ${SKILL_DIR}/scripts/wa.mjs setup`,
    );
  }
}

export function assertChromeAvailable() {
  if (!fs.existsSync(CHROME_PATH)) {
    throw new Error(
      `Chrome not found at ${CHROME_PATH}. Install Google Chrome or point WA_CHROME_PATH at it.`,
    );
  }
}

// Builds a client and returns it alongside a promise that settles when the
// session is usable. The client is handed back immediately and separately from
// that promise on purpose: a failed login still leaves a Chromium running, so
// the caller needs the handle in order to tear it down.
//
// `onQr` is called when a login code is needed; without it an unlinked session
// is an error rather than a silent wait.
export async function createSession({ onQr = null } = {}) {
  assertChromeAvailable();
  ensureStateDir();
  const { Client, LocalAuth } = await loadLibrary();

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: STATE_DIR }),
    puppeteer: { executablePath: CHROME_PATH, headless: HEADLESS, args: chromeArgs() },
  });

  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`WhatsApp Web did not become ready within ${READY_TIMEOUT_MS} ms`));
    }, READY_TIMEOUT_MS);
    const settle = (act) => (value) => {
      clearTimeout(timer);
      act(value);
    };

    client.on("ready", () => settle(resolve)(client));
    client.on("auth_failure", (msg) =>
      settle(reject)(new Error(`authentication failed: ${msg}. Re-link with: wa.mjs login`)),
    );
    client.on("qr", (qr) => {
      if (!onQr) {
        settle(reject)(new Error("no linked session. Link the bot number first with: wa.mjs login"));
        return;
      }
      onQr(qr);
    });

    // Chrome and page-injection failures never surface as an event, so they are
    // folded into the same promise to keep one place that settles.
    client.initialize().catch((e) => settle(reject)(e));
  });

  return { client, ready };
}

// whatsapp-web.js keeps a Chromium alive and does not always settle on destroy,
// so a stuck shutdown must not hang the command.
export async function shutdown(client) {
  if (!client) return;
  try {
    await Promise.race([client.destroy(), sleep(SHUTDOWN_TIMEOUT_MS)]);
  } catch {
    // A failed teardown is not worth reporting over the command's own result.
  }
}

export function sessionExists() {
  return fs.existsSync(SESSION_DIR) && fs.readdirSync(SESSION_DIR).length > 0;
}

export function describeAccount(client) {
  const info = client.info || {};
  return { number: info.wid?.user || null, name: info.pushname || null, platform: info.platform || null };
}

// ---------------------------------------------------------------------------
// Chat resolution
// ---------------------------------------------------------------------------

// Accepts an alias from config.json, a raw serialized id, or a group-name
// fragment. A name fragment that matches more than one group is an error rather
// than a guess, because the wrong guess sends a message to the wrong people.
export async function resolveChatId(client, target) {
  if (!target) throw new Error("no chat given. Pass --chat <alias|id|group name>");

  const alias = readConfig().aliases[target];
  if (alias) return typeof alias === "string" ? alias : alias.id;
  if (target.endsWith(GROUP_SUFFIX) || target.endsWith(USER_SUFFIX)) return target;

  // A bare phone number is asked of WhatsApp rather than assembled into an id,
  // so a number that is not on WhatsApp fails here instead of sending nowhere.
  const digits = target.replace(/[\s()+-]/g, "");
  if (PHONE_PATTERN.test(target.replace(/[\s()-]/g, ""))) {
    const numberId = await client.getNumberId(digits);
    if (!numberId) throw new Error(`${target} is not registered on WhatsApp`);
    return numberId._serialized;
  }

  const needle = target.toLowerCase();
  const groups = await listGroups(client);
  const matches = groups.filter((g) => g.name.toLowerCase().includes(needle));

  if (matches.length === 1) return matches[0].id;
  if (matches.length === 0) {
    throw new Error(
      `no chat matches "${target}". List the groups with: wa.mjs chats, ` +
        `then save one with: wa.mjs alias --name <alias> --chat <id>`,
    );
  }
  throw new Error(
    `"${target}" matches ${matches.length} groups (${matches.map((m) => m.name).join(", ")}). ` +
      `Use the exact id or an alias.`,
  );
}

export async function listGroups(client) {
  const chats = await client.getChats();
  return chats
    .filter((c) => c.isGroup)
    .map((c) => ({ id: c.id._serialized, name: c.name || "(unnamed)", unread: c.unreadCount }));
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export async function fetchTranscript(client, chatId, limit) {
  const chat = await client.getChatById(chatId);
  const messages = await chat.fetchMessages({ limit });
  const described = await Promise.all(messages.map((m) => describeMessage(m)));
  return { chatName: chat.name || chatId, messages: described.sort((a, b) => a.ts - b.ts) };
}

export async function describeMessage(msg) {
  return {
    id: msg.id?._serialized || null,
    ts: msg.timestamp || 0,
    time: formatTimestamp(msg.timestamp || 0),
    fromMe: Boolean(msg.fromMe),
    sender: await senderLabel(msg),
    type: msg.type || "chat",
    body: msg.body || "",
    quoted: await quotedPreview(msg),
    quotedId: await quotedId(msg),
  };
}

async function senderLabel(msg) {
  if (msg.fromMe) return "me";
  try {
    const contact = await msg.getContact();
    return contact.pushname || contact.name || contact.number || msg.author || msg.from;
  } catch {
    return msg.author || msg.from || "unknown";
  }
}

async function quotedPreview(msg) {
  if (!msg.hasQuotedMsg) return null;
  try {
    const quoted = await msg.getQuotedMessage();
    return truncate(quoted.body || `<${quoted.type}>`, 80);
  } catch {
    return null;
  }
}

async function quotedId(msg) {
  if (!msg.hasQuotedMsg) return null;
  try {
    const quoted = await msg.getQuotedMessage();
    return quoted.id?._serialized || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

// A short pause before sending keeps the traffic shaped like a person typing
// rather than a script firing the moment a socket opens.
export async function sendText(client, chatId, text, { quotedMessageId = null } = {}) {
  await sleep(SEND_DELAY_MS);
  const options = quotedMessageId ? { quotedMessageId } : {};
  const sent = await client.sendMessage(chatId, text, options);
  return { id: sent.id?._serialized || null, ts: sent.timestamp || Math.floor(Date.now() / 1000) };
}

// Sends a file from the outbox as an attachment, with an optional caption.
// Images and videos ride as media; anything else goes as a document so the
// recipient gets the original file rather than a re-encoded preview.
export async function sendMedia(client, chatId, filePath, { caption = null, asDocument = null } = {}) {
  const { MessageMedia } = await loadLibrary();
  const size = fs.statSync(filePath).size;
  if (size > MAX_MEDIA_BYTES) {
    throw new Error(
      `${filePath} is ${size} bytes, over the ${MAX_MEDIA_BYTES}-byte limit. ` +
        `Raise WA_MAX_MEDIA_BYTES only if WhatsApp will accept it.`,
    );
  }

  const media = MessageMedia.fromFilePath(filePath);
  const inline = /^(image|video)\//.test(media.mimetype || "");
  const options = { sendMediaAsDocument: asDocument === null ? !inline : asDocument };
  if (caption) options.caption = caption;

  await sleep(SEND_DELAY_MS);
  const sent = await client.sendMessage(chatId, media, options);
  return {
    id: sent.id?._serialized || null,
    mimetype: media.mimetype,
    bytes: size,
    asDocument: options.sendMediaAsDocument,
  };
}

// Resolves with the first incoming message in `chatId` after this call.
// mode "quoted" narrows that to messages that actually quote `sentId`, which is
// stricter but misses the common case of a group replying without quoting.
export function waitForReply(client, { chatId, sentRef = {}, mode = "any", timeoutMs = WAIT_TIMEOUT_MS }) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);

    const onMessage = async (msg) => {
      try {
        if (msg.fromMe || msg.from !== chatId) return;
        const described = await describeMessage(msg);
        if (mode === "quoted" && described.quotedId !== sentRef.id) return;
        clearTimeout(timer);
        client.off("message", onMessage);
        resolve(described);
      } catch {
        // A malformed event must not abort the wait; later messages still count.
      }
    };

    client.on("message", onMessage);
  });
}
