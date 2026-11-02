#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

let PROJECTS = process.env.CLAUDE_PROJECTS_DIR || path.join(os.homedir(), '.claude', 'projects');
let ACTIVE = process.env.CLAUDE_SESSION_ID || '';
const USAGE = 'Usage: delete-session.js <session-id> [more-ids...] [--dry-run]';

function walkEntries(directory, depth, entries) {
  if (depth > 2 || !fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      entries.push(entryPath);
      walkEntries(entryPath, depth + 1, entries);
    } else {
      entries.push(entryPath);
    }
  }
}

function targetsFor(id) {
  const entries = [];
  walkEntries(PROJECTS, 0, entries);
  return entries.filter((entryPath) => {
    const base = path.basename(entryPath);
    return base === `${id}.jsonl` || base === id;
  });
}

function assertUnderProjects(targetPath) {
  const root = fs.realpathSync(PROJECTS);
  const target = fs.realpathSync(targetPath);
  const relative = path.relative(root, target);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to delete outside PROJECTS: ${target}`);
  }
}

function getDirectorySize(targetPath) {
  const stats = fs.statSync(targetPath);
  if (stats.isFile()) return stats.size;
  return fs.readdirSync(targetPath, { withFileTypes: true })
    .reduce((total, entry) => total + getDirectorySize(path.join(targetPath, entry.name)), 0);
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${bytes}B`;
}

function deleteIds(dryRun, ids) {
  let any = 0;
  let skipped = 0;
  for (const id of ids) {
    if (ACTIVE && id === ACTIVE) {
      console.log(`skipped (active session, cannot delete): ${id}`);
      skipped = 1;
      continue;
    }
    const targets = targetsFor(id);
    if (targets.length === 0) {
      console.log(`not found: ${id}`);
      continue;
    }
    for (const target of targets) {
      assertUnderProjects(target);
      const size = formatSize(getDirectorySize(target));
      any = 1;
      if (dryRun) {
        console.log(`would delete: ${target} (${size})`);
      } else {
        fs.rmSync(target, { recursive: true, force: true });
        console.log(`deleted: ${target} (${size})`);
      }
    }
  }
  if (!any && !skipped) {
    throw new Error('nothing to delete');
  }
}

function selfTest() {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'delete-session-'));
  try {
    const projects = path.join(temporaryDirectory, 'projects');
    PROJECTS = projects;
    const projectDirectory = path.join(projects, '-proj');
    const firstDirectory = path.join(projectDirectory, 'aaa', 'tool-results');
    const secondFile = path.join(projectDirectory, 'bbb.jsonl');
    fs.mkdirSync(firstDirectory, { recursive: true });
    fs.writeFileSync(path.join(projectDirectory, 'aaa.jsonl'), '{"type":"user"}\n');
    fs.writeFileSync(path.join(firstDirectory, 'r.txt'), 'x');
    fs.writeFileSync(secondFile, '{"type":"user"}\n');

    process.env.CLAUDE_PROJECTS_DIR = projects;
    deleteIds(1, ['aaa']);
    if (!fs.existsSync(path.join(projectDirectory, 'aaa.jsonl'))) {
      throw new Error('selftest: dry-run deleted a file');
    }

    deleteIds(0, ['aaa']);
    if (fs.existsSync(path.join(projectDirectory, 'aaa.jsonl')) || fs.existsSync(path.join(projectDirectory, 'aaa'))) {
      throw new Error('selftest: session was not deleted');
    }
    if (!fs.existsSync(secondFile)) {
      throw new Error('selftest: unrelated session was deleted');
    }

    ACTIVE = 'bbb';
    deleteIds(0, ['bbb']);
    if (!fs.existsSync(secondFile)) {
      throw new Error('selftest: active session was not protected');
    }
    console.log('selftest OK');
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--selftest') {
    selfTest();
    return;
  }
  if (args.length === 0) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }
  if (!fs.existsSync(PROJECTS)) {
    throw new Error(`projects directory does not exist: ${PROJECTS}`);
  }

  const dryRun = args.includes('--dry-run') ? 1 : 0;
  const ids = args.filter((argument) => !argument.startsWith('--'));
  if (ids.length === 0) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }
  deleteIds(dryRun, ids);
  if (dryRun) {
    console.log('(dry-run — nothing was deleted)');
  }
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exitCode = 1;
}
