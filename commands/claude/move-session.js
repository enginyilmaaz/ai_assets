#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

let PROJECTS = process.env.CLAUDE_PROJECTS_DIR || path.join(os.homedir(), '.claude', 'projects');
const USAGE = 'Usage: move-session.js <session-id|latest> [target-project-dir] [--delete] [--dry-run]';

function encodeProjectPath(value) {
  return value.replace(/[^a-zA-Z0-9]/g, '-');
}

function walkFiles(directory, depth, files) {
  if (depth > 2 || !fs.existsSync(directory)) {
    return;
  }
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkFiles(entryPath, depth + 1, files);
    } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      files.push(entryPath);
    }
  }
}

function findSession(sessionId) {
  const files = [];
  walkFiles(PROJECTS, 0, files);
  if (sessionId === 'latest') {
    files.sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);
    if (!files.length) {
      throw new Error('No sessions found');
    }
    return { file: files[0], sessionId: path.basename(files[0], '.jsonl') };
  }

  const matches = files.filter((file) => path.basename(file) === `${sessionId}.jsonl`);
  if (matches.length === 0) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  if (matches.length > 1) {
    throw new Error(`Ambiguous session id: ${sessionId}`);
  }
  return { file: matches[0], sessionId };
}

function readOldProjectPath(sourceFile) {
  const cwds = new Set();
  for (const line of fs.readFileSync(sourceFile, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }
    try {
      const row = JSON.parse(line);
      if (typeof row.cwd === 'string') {
        cwds.add(row.cwd);
      }
    } catch {
      // Invalid rows are handled by the final verifier after the move.
    }
  }
  return [...cwds].sort((left, right) => left.length - right.length)[0] || '';
}

function copyDirectory(source, destination, overwrite) {
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destinationPath, { recursive: true });
      copyDirectory(sourcePath, destinationPath, overwrite);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      if (!overwrite && fs.existsSync(destinationPath)) {
        continue;
      }
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

// Replace the project path inside the decoded strings of each record, never
// in the raw file text. A Windows path is full of backslashes and the file
// holds them JSON-escaped (C:\\Users\\...), so a text-level search for the
// in-memory path (C:\Users\...) matches nothing and the transcript is moved
// with every path still pointing at the old directory — silently, because the
// verification that followed searched the same way and also found nothing.
function replacePathInValue(value, oldPath, newPath) {
  if (typeof value === 'string') {
    return value.split(oldPath).join(newPath);
  }
  if (Array.isArray(value)) {
    return value.map((item) => replacePathInValue(item, oldPath, newPath));
  }
  if (value && typeof value === 'object') {
    const next = {};
    for (const [key, item] of Object.entries(value)) {
      next[key] = replacePathInValue(item, oldPath, newPath);
    }
    return next;
  }
  return value;
}

function rewriteTranscript(content, oldPath, newPath) {
  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);
  const rewritten = lines.map((line) => {
    if (!line.trim()) {
      return line;
    }
    try {
      return JSON.stringify(replacePathInValue(JSON.parse(line), oldPath, newPath));
    } catch {
      // Not a JSON record; the verifier reports it. Fall back to a plain
      // text replacement so a damaged line is at least not left stale.
      return line.split(oldPath).join(newPath);
    }
  });
  return rewritten.join(newline);
}

function verifyTranscript(filePath, oldPath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  let invalid = 0;
  let stale = 0;
  for (const line of lines) {
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      invalid += 1;
      if (line.includes(oldPath)) {
        stale += 1;
      }
      continue;
    }
    // Look for the old path in the decoded values, so an escaped Windows
    // path is still caught.
    if (JSON.stringify(row).includes(JSON.stringify(oldPath).slice(1, -1))) {
      stale += 1;
    }
  }
  if (invalid > 0) {
    throw new Error(`Verification failed: ${invalid} invalid JSON lines`);
  }
  if (stale > 0) {
    throw new Error(`Verification failed: old project path remains in ${stale} record(s)`);
  }
  console.log(`verified: ${lines.length} lines, 0 invalid JSON`);
}

function moveSession(options) {
  const { sessionId, destination, dryRun, deleteOriginal } = options;
  const session = findSession(sessionId);
  const oldPath = readOldProjectPath(session.file);
  if (!oldPath) {
    throw new Error('Transcript has no cwd');
  }
  const destinationDirectory = path.join(PROJECTS, encodeProjectPath(destination));
  console.log(`session: ${session.sessionId}`);
  console.log(`source: ${path.dirname(session.file)}`);
  console.log(`target: ${destinationDirectory}`);
  console.log(`path: ${oldPath} -> ${destination}`);

  if (oldPath === destination) {
    console.log('Already in the correct location.');
    return;
  }
  if (dryRun) {
    console.log('(dry-run — no files were written)');
    return;
  }

  const originalContent = fs.readFileSync(session.file, 'utf8');
  const updatedContent = rewriteTranscript(originalContent, oldPath, destination);
  const destinationFile = path.join(destinationDirectory, `${session.sessionId}.jsonl`);
  fs.mkdirSync(destinationDirectory, { recursive: true });
  fs.writeFileSync(destinationFile, updatedContent, { mode: 0o600 });

  const sessionDirectory = path.join(path.dirname(session.file), session.sessionId);
  if (fs.existsSync(sessionDirectory)) {
    copyDirectory(sessionDirectory, path.join(destinationDirectory, session.sessionId), true);
  }
  const memoryDirectory = path.join(path.dirname(session.file), 'memory');
  if (fs.existsSync(memoryDirectory)) {
    copyDirectory(memoryDirectory, path.join(destinationDirectory, 'memory'), false);
  }

  verifyTranscript(destinationFile, oldPath);
  if (deleteOriginal) {
    fs.rmSync(session.file, { force: true });
    fs.rmSync(sessionDirectory, { recursive: true, force: true });
    console.log('Original removed.');
  } else {
    console.log(`Original kept as a backup: ${session.file}`);
  }
  console.log(`Move complete. Resume with: cd ${destination} && claude --resume ${session.sessionId}`);
}

function selfTest() {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'move-session-'));
  try {
    const projects = path.join(temporaryDirectory, 'projects');
    const oldProject = path.join(temporaryDirectory, 'old', 'proj');
    const newProject = path.join(temporaryDirectory, 'new', 'proj');
    PROJECTS = projects;
    process.env.CLAUDE_PROJECTS_DIR = projects;
    const sourceDirectory = path.join(projects, encodeProjectPath(oldProject));
    const sourceFile = path.join(sourceDirectory, 'sess-1.jsonl');
    fs.mkdirSync(path.join(sourceDirectory, 'sess-1', 'tool-results'), { recursive: true });
    fs.mkdirSync(path.join(sourceDirectory, 'memory'), { recursive: true });
    fs.writeFileSync(sourceFile, [
      JSON.stringify({ type: 'user', cwd: oldProject, message: { content: `see ${oldProject}/src/a.ts` } }),
      JSON.stringify({ type: 'assistant', cwd: `${oldProject}/sub`, message: { content: 'ok' } })
    ].join('\n') + '\n');
    fs.writeFileSync(path.join(sourceDirectory, 'sess-1', 'tool-results', 'r.txt'), 'x');
    fs.writeFileSync(path.join(sourceDirectory, 'memory', 'MEMORY.md'), '- note');

    moveSession({ sessionId: 'sess-1', destination: newProject, dryRun: false, deleteOriginal: false });
    const destinationFile = path.join(projects, encodeProjectPath(newProject), 'sess-1.jsonl');
    const content = fs.readFileSync(destinationFile, 'utf8');
    // Compare parsed records, never the serialised text: a Windows path is
    // full of backslashes and JSON.stringify escapes every one of them, so a
    // raw substring search for the path never matches there even when the
    // rewrite was correct.
    const records = content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
    if (records.length !== 2) {
      throw new Error(`selftest: expected 2 records, found ${records.length}`);
    }
    if (records[0].cwd !== newProject) {
      throw new Error(`selftest: cwd rewrite missing (got ${records[0].cwd})`);
    }
    if (records[0].message.content !== `see ${newProject}/src/a.ts`) {
      throw new Error(`selftest: body path rewrite missing (got ${records[0].message.content})`);
    }
    if (records[1].cwd !== `${newProject}/sub`) {
      throw new Error(`selftest: subdirectory cwd rewrite missing (got ${records[1].cwd})`);
    }
    if (records.some((record) => JSON.stringify(record).includes(oldProject))) {
      throw new Error('selftest: old path remains');
    }
    if (!fs.existsSync(path.join(projects, encodeProjectPath(newProject), 'sess-1', 'tool-results', 'r.txt'))) {
      throw new Error('selftest: tool-results not moved');
    }
    if (!fs.existsSync(path.join(projects, encodeProjectPath(newProject), 'memory', 'MEMORY.md'))) {
      throw new Error('selftest: memory not moved');
    }
    if (!fs.existsSync(sourceFile)) {
      throw new Error('selftest: original was removed without --delete');
    }
    console.log('selftest OK');
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function parseArguments(argv) {
  let destination = process.cwd();
  let dryRun = false;
  let deleteOriginal = false;
  for (const argument of argv) {
    if (argument === '--delete') {
      deleteOriginal = true;
    } else if (argument === '--dry-run') {
      dryRun = true;
    } else if (argument.startsWith('--')) {
      throw new Error(`Unknown option: ${argument}`);
    } else {
      destination = path.resolve(argument);
    }
  }
  return { destination, dryRun, deleteOriginal };
}

function main() {
  const [sessionId, ...rest] = process.argv.slice(2);
  if (sessionId === '--selftest') {
    selfTest();
    return;
  }
  if (!sessionId) {
    console.error(USAGE);
    process.exit(64);
  }
  const { destination, dryRun, deleteOriginal } = parseArguments(rest);
  moveSession({ sessionId, destination, dryRun, deleteOriginal });
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}
