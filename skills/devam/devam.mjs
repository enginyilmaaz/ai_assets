#!/usr/bin/env node
// Session browser for the `devam` skill — a Node replacement for devam.sh, so
// the skill needs no bash, jq, GNU find/stat/date, grep, awk or sed.
//
// Transcripts are big: on a working machine the corpus reaches several GB and a
// single .jsonl can pass 500 MB. Nothing here may read a whole file into
// memory. Every pass streams the file line by line and keeps only what it is
// asked for — a handful of metadata fields, or a ring buffer of the last few
// turns. `list` stats first, sorts by mtime, and only then opens the few files
// it is actually going to show.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PROJECTS = process.env.CLAUDE_PROJECTS_DIR
  || path.join(os.homedir(), '.claude', 'projects');
const USAGE = 'usage: devam.mjs {list [filter]|find <id>|digest <id>}';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LIMIT = Number(process.env.LIMIT || 40);
const TAIL = Number(process.env.TAIL || 24);
const CURRENT = process.env.CURRENT || '';
const READ_CHUNK_BYTES = 1 << 20;
const MAX_LINE_BYTES = 8 << 20;

function clean(value) {
  return String(value || '').replace(/[\n\r\t]+/g, ' ').trim();
}

function isSynthetic(value) {
  const text = value.trimStart();
  return text === '' || text.startsWith('<') || text.startsWith('Base directory for this skill:')
    || text.startsWith('Caveat:') || text.startsWith('[Request interrupted') || text.startsWith('API Error');
}

function contentText(row) {
  const content = row.message?.content;
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content.filter((block) => block.type === 'text').map((block) => block.text).join(' ');
  }
  return '';
}

function isHuman(row) {
  return row.type === 'user' && !isSynthetic(contentText(row));
}

// Read `filePath` one line at a time. `onLine` returning false stops the walk,
// which lets a metadata-only pass give up after the first few lines instead of
// reading hundreds of megabytes. A line longer than MAX_LINE_BYTES is dropped
// rather than grown without bound.
function forEachLine(filePath, onLine) {
  let descriptor;
  try {
    descriptor = fs.openSync(filePath, 'r');
  } catch {
    return;
  }
  const buffer = Buffer.allocUnsafe(READ_CHUNK_BYTES);
  let pending = '';
  try {
    for (;;) {
      const read = fs.readSync(descriptor, buffer, 0, READ_CHUNK_BYTES, null);
      if (read <= 0) {
        break;
      }
      pending += buffer.toString('utf8', 0, read);
      let newline = pending.indexOf('\n');
      while (newline !== -1) {
        const line = pending.slice(0, newline);
        pending = pending.slice(newline + 1);
        if (line.trim() && onLine(line) === false) {
          return;
        }
        newline = pending.indexOf('\n');
      }
      if (pending.length > MAX_LINE_BYTES) {
        pending = '';
      }
    }
    if (pending.trim()) {
      onLine(pending);
    }
  } finally {
    fs.closeSync(descriptor);
  }
}

function parseLine(line) {
  try {
    return JSON.parse(line.replace(/^﻿/, ''));
  } catch {
    return null;
  }
}

// Title, cwd and the first human request all sit near the top of a transcript,
// so this stops as soon as it has them instead of walking the whole file.
function readMetadata(filePath) {
  const meta = { title: '', cwd: '', first: '', branch: '', lastPrompt: '' };
  forEachLine(filePath, (line) => {
    const row = parseLine(line);
    if (!row) {
      return true;
    }
    if (!meta.title && row.aiTitle) meta.title = clean(row.aiTitle);
    if (!meta.cwd && row.cwd) meta.cwd = clean(row.cwd);
    if (!meta.branch && row.gitBranch) meta.branch = row.gitBranch;
    if (!meta.lastPrompt && row.lastPrompt) meta.lastPrompt = clean(row.lastPrompt);
    if (!meta.first && isHuman(row)) meta.first = clean(contentText(row));
    return !(meta.title && meta.cwd && meta.first);
  });
  return meta;
}

// One full pass, retaining only the last `tail` rendered turns.
function readDigest(filePath, tail) {
  const meta = { title: '', cwd: '', first: '', branch: '', lastPrompt: '' };
  const recent = [];
  let turns = 0;

  forEachLine(filePath, (line) => {
    const row = parseLine(line);
    if (!row) {
      return true;
    }
    if (!meta.title && row.aiTitle) meta.title = clean(row.aiTitle);
    if (!meta.cwd && row.cwd) meta.cwd = clean(row.cwd);
    if (!meta.branch && row.gitBranch) meta.branch = row.gitBranch;
    if (!meta.lastPrompt && row.lastPrompt) meta.lastPrompt = clean(row.lastPrompt);

    let rendered = '';
    if (isHuman(row)) {
      if (!meta.first) meta.first = clean(contentText(row));
      rendered = `[YOU] ${clean(contentText(row)).slice(0, 280)}`;
    } else if (row.type === 'assistant' && Array.isArray(row.message?.content)) {
      const text = row.message.content.map((block) => {
        if (block.type === 'text') return block.text;
        if (block.type === 'tool_use') return `«tool:${block.name}»`;
        return '';
      }).filter(Boolean).join(' ');
      if (clean(text)) {
        rendered = `[CLAUDE] ${clean(text).slice(0, 280)}`;
      }
    }
    if (rendered) {
      turns += 1;
      recent.push(rendered);
      if (recent.length > tail) {
        recent.shift();
      }
    }
    return true;
  });

  return { meta, recent, turns };
}

// Stat only — nothing is opened here.
function listCandidates() {
  const found = [];
  const walk = (directory, depth) => {
    if (depth > 2) {
      return;
    }
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath, depth + 1);
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        try {
          found.push({
            id: path.basename(entry.name, '.jsonl'),
            path: entryPath,
            mtime: fs.statSync(entryPath).mtimeMs
          });
        } catch {
          // a transcript that vanished between readdir and stat
        }
      }
    }
  };
  walk(PROJECTS, 0);
  return found.sort((left, right) => right.mtime - left.mtime);
}

function resolveSession(id) {
  return listCandidates().filter((session) => session.id.startsWith(id));
}

function formatDate(mtime) {
  const date = new Date(mtime);
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${MONTHS[date.getMonth()]} ${hours}:${minutes}`;
}

function truncate(value, length) {
  return value.length > length ? value.slice(0, length) : value;
}

function listCommand(filter) {
  const needle = (filter || '').toLowerCase();
  const rows = [];
  for (const candidate of listCandidates()) {
    const meta = readMetadata(candidate.path);
    const title = meta.title || meta.first;
    if (needle && !title.toLowerCase().includes(needle)) {
      continue;
    }
    rows.push({ ...candidate, title, cwd: meta.cwd });
    if (rows.length >= LIMIT) {
      break;
    }
  }

  console.log(`${'#'.padEnd(3)}  ${'Last active'.padEnd(13)}  ${'Title'.padEnd(44)}  ${'Project'.padEnd(26)}  id`);
  console.log('--------------------------------------------------------------------------------------------------------------');
  rows.forEach((session, index) => {
    const title = session.title || '(untitled)';
    const project = session.cwd ? session.cwd.replace(os.homedir(), '~') : '?';
    const mark = CURRENT && session.id.startsWith(CURRENT) ? ' «this session»' : '';
    console.log(`${String(index + 1).padEnd(3)}  ${formatDate(session.mtime).padEnd(13)}  ${truncate(title, 44).padEnd(44)}  ${truncate(project, 26).padEnd(26)}  ${session.id.slice(0, 8).padEnd(8)}${mark}`);
  });
  console.log();
  if (rows.length === 0) {
    console.log(filter ? '(no matches — filter searches titles)' : '(no sessions found)');
  } else {
    console.log(`(shown: ${rows.length})`);
  }
}

function findCommand(id) {
  const matches = resolveSession(id);
  if (matches.length === 0) {
    console.log('NONE');
    process.exitCode = 1;
  } else if (matches.length > 1) {
    console.log('AMBIGUOUS matches:');
    matches.forEach((match) => console.log(match.id));
    process.exitCode = 2;
  } else {
    console.log(matches[0].path);
  }
}

function digestCommand(id) {
  const matches = resolveSession(id);
  if (matches.length === 0) {
    console.log(`NOT FOUND: ${id}`);
    process.exitCode = 1;
    return;
  }
  if (matches.length > 1) {
    console.log('AMBIGUOUS matches:');
    matches.forEach((match) => console.log(match.id));
    process.exitCode = 2;
    return;
  }

  const session = matches[0];
  const { meta, recent, turns } = readDigest(session.path, TAIL);
  console.log(`FILE: ${session.path}`);
  console.log('=========== META ===========');
  console.log(`TITLE : ${meta.title || meta.first}`);
  console.log(`FOLDER: ${meta.cwd}`);
  console.log(`BRANCH: ${meta.branch}`);
  console.log(`TURNS : ${turns}`);
  console.log(`FIRST REQUEST: ${meta.first.slice(0, 200)}`);
  console.log(`LAST PROMPT  : ${meta.lastPrompt.slice(0, 300)}`);
  console.log('=========== RECENT CONVERSATION TURNS ===========');
  recent.forEach((turn) => console.log(turn));
  console.log(`(total turns: ${turns}; id: ${session.id})`);
}

function main() {
  const [command, argument] = process.argv.slice(2);
  if (command === 'list') {
    listCommand(argument);
  } else if (command === 'find') {
    if (!argument) {
      console.error(USAGE);
      process.exitCode = 64;
    } else {
      findCommand(argument);
    }
  } else if (command === 'digest') {
    if (!argument) {
      console.error(USAGE);
      process.exitCode = 64;
    } else {
      digestCommand(argument);
    }
  } else {
    console.error(USAGE);
    process.exitCode = 64;
  }
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exitCode = 1;
}
