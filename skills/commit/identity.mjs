#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function readGitValue(scope, key) {
  try {
    return execFileSync('git', ['config', scope, key], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return '';
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^﻿/, ''));
}

function readClaudeIdentity() {
  const filePath = path.join(os.homedir(), '.claude.json');
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const account = readJson(filePath).oauthAccount || {};
  return {
    name: account.displayName || '',
    email: account.emailAddress || ''
  };
}

function readCodexIdentity() {
  const filePath = path.join(os.homedir(), '.codex', 'auth.json');
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const tokens = readJson(filePath).tokens || {};
  const token = tokens.id_token || '';
  const payload = token.split('.')[1];
  if (!payload) {
    return null;
  }
  const account = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  return { name: account.name || '', email: account.email || '' };
}

function getIdentity() {
  const globalName = readGitValue('--global', 'user.name');
  const globalEmail = readGitValue('--global', 'user.email');
  const localName = readGitValue('--local', 'user.name');
  const localEmail = readGitValue('--local', 'user.email');
  let name = globalName || localName;
  let email = globalEmail || localEmail;
  let usedFallback = false;

  if (!name || !email) {
    const account = readClaudeIdentity() || readCodexIdentity();
    if (account) {
      name = name || account.name;
      email = email || account.email;
      usedFallback = true;
    }
  }
  if (usedFallback) {
    console.error(`WARNING: git identity not configured; using AI-app login: ${name} <${email}>`);
  }
  if (!name || !email) {
    throw new Error('Git identity is not configured');
  }
  return { name, email };
}

function main() {
  const identity = getIdentity();
  const field = (process.argv[2] || 'name').replace(/^--/, '');
  if (field === 'name' || field === 'email') {
    console.log(identity[field]);
  } else {
    console.log(JSON.stringify(identity));
  }
}

try {
  main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}
