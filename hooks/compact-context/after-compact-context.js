#!/usr/bin/env node
'use strict';
/**
 * SessionStart(compact) hook — runs right after a compaction.
 *
 * Compaction drops the conversation body from the context window, but the session
 * transcript on disk still holds every message from before it. This hook prints
 * where that file is, how to search it without reloading it, and the project state
 * the summary is most likely to have lost (branch, uncommitted files, last commits).
 *
 * A SessionStart hook's stdout is added to the session context, so the output stays
 * small and bounded. Every failure path is silent and exits 0: a hook must never be
 * the reason a session fails to start.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MAX_STATUS_LINES = 15;   // uncommitted files listed before truncating
const MAX_STATE_LINES = 30;    // lines quoted from a project state file
const MAX_STATE_BYTES = 262144; // skip a state file larger than this

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch (e) { return ''; }
}

function git(cwd, args) {
  try {
    return execFileSync('git', ['-C', cwd].concat(args), {
      encoding: 'utf8',
      timeout: 4000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (e) { return ''; }
}

function humanSize(bytes) {
  if (!Number.isFinite(bytes)) return '?';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  return Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

function main() {
  let input = {};
  try { input = JSON.parse(readStdin() || '{}') || {}; } catch (e) { input = {}; }

  const transcript = typeof input.transcript_path === 'string' ? input.transcript_path : '';
  const cwd = (typeof input.cwd === 'string' && input.cwd) ? input.cwd : process.cwd();
  const out = [];

  out.push('## The context was just compacted');

  let transcriptExists = false;
  try { transcriptExists = !!transcript && fs.statSync(transcript).isFile(); } catch (e) { transcriptExists = false; }

  if (transcriptExists) {
    let size = '?';
    try { size = humanSize(fs.statSync(transcript).size); } catch (e) { /* keep '?' */ }
    out.push('');
    out.push('The full pre-compact conversation is still on disk (' + size + '):');
    out.push('  ' + transcript);
    out.push('If a detail established earlier is missing — a file path, an ID, a decision the user');
    out.push('already made, an approach they rejected — search that file instead of guessing or');
    out.push('asking again. NEVER read it whole: it can hold ~1M tokens and would refill this');
    out.push('context in one shot. Search it and keep only what matched:');
    if (process.platform === 'win32') {
      out.push("  Select-String -Pattern '<term>' -Path '" + transcript + "' | Select-Object -Last 15");
    } else {
      out.push("  grep -h -i -- '<term>' '" + transcript + "' | tail -15 | cut -c1-300");
    }
  }

  out.push('');
  out.push('### Project state right now');
  out.push('cwd: ' + cwd);

  if (git(cwd, ['rev-parse', '--is-inside-work-tree']) === 'true') {
    const branch = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
    if (branch) out.push('branch: ' + branch);

    const status = git(cwd, ['status', '--short']).split('\n').filter(Boolean);
    if (status.length) {
      out.push('uncommitted (' + status.length + '):');
      status.slice(0, MAX_STATUS_LINES).forEach(function (l) { out.push('  ' + l); });
      if (status.length > MAX_STATUS_LINES) {
        out.push('  … ' + (status.length - MAX_STATUS_LINES) + ' more');
      }
    } else {
      out.push('working tree: clean');
    }

    const log = git(cwd, ['log', '--oneline', '-5']);
    if (log) {
      out.push('recent commits:');
      log.split('\n').forEach(function (l) { out.push('  ' + l); });
    }
  } else {
    out.push('(not a git repository)');
  }

  const stateFiles = ['STATE.md', 'NOTES.md', path.join('.claude', 'STATE.md')];
  for (let i = 0; i < stateFiles.length; i++) {
    const p = path.join(cwd, stateFiles[i]);
    try {
      const st = fs.statSync(p);
      if (!st.isFile() || st.size > MAX_STATE_BYTES) continue;
      const head = fs.readFileSync(p, 'utf8').split(/\r?\n/).slice(0, MAX_STATE_LINES);
      out.push('');
      out.push('### ' + stateFiles[i] + ' (first ' + MAX_STATE_LINES + ' lines)');
      head.forEach(function (l) { out.push(l); });
      break;
    } catch (e) { /* no such file — try the next one */ }
  }

  process.stdout.write(out.join('\n') + '\n');
}

try { main(); } catch (e) { /* never break session start */ }
process.exit(0);
