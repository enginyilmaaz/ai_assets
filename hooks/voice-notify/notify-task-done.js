import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));

const SOUND_PATH = path.join(os.homedir(), '.claude', 'hooks', 'notification.mp3');
const PLAY_TIMEOUT_MS = 2000;

function readTranscriptRows(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    return [];
  }
  return fs.readFileSync(transcriptPath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function isHuman(row) {
  if (row.type !== 'user') return false;
  const content = row.message?.content;
  if (typeof content === 'string') return true;
  if (Array.isArray(content)) {
    return !content.some((block) => typeof block === 'object' && block.type === 'tool_result');
  }
  return false;
}

function hasToolUse(rows) {
  let start = 0;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (isHuman(rows[index])) {
      start = index;
      break;
    }
  }
  return rows.slice(start).some((row) => {
    if (row.type !== 'assistant') return false;
    const content = row.message?.content;
    return Array.isArray(content) && content.some((block) => block.type === 'tool_use');
  });
}

function playNotification() {
  if (!fs.existsSync(SOUND_PATH)) {
    return;
  }
  const isWindows = process.platform === 'win32';
  const command = isWindows
    ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
    : 'paplay';
  const args = isWindows
    ? ['-NoProfile', '-File', path.join(SCRIPT_DIRECTORY, 'play-notification.ps1'), SOUND_PATH]
    : [SOUND_PATH];
  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    shell: false
  });
  child.on('error', () => {});
  child.unref();
}

function main() {
  let input = '';
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      const payload = JSON.parse(input || '{}');
      const rows = readTranscriptRows(payload.transcript_path || '');
      if (hasToolUse(rows)) {
        playNotification();
      }
    } catch {
      // A Stop hook must never block the turn, even with a missing or invalid transcript.
    }
  });
}

main();
