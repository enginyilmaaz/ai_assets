---
name: jira-api
description: Jira REST API wrapper - attachment download, status transitions, issue assignment, search. Works with any Jira project. Uses Atlassian MCP first, REST API fallback. Usage examples - 'download jira attachment', 'jira resmini indir', 'transition jira issue', 'assign jira task'
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
argument-hint: Jira issue key (e.g. 'PROJ-123')
---

# Jira API Skill

This skill provides a generic Jira REST API wrapper for any Jira project:
1. **Attachment download** - Download binary files (images, videos, PDFs) from Jira issues via REST API
2. **Issue operations** - Assign, transition, search, comment via MCP or REST API fallback
3. **Credential management** - Per-user API token setup

For project-specific workflows (ERP task automation, Playwright verification), see project-specific Jira skills.

## CRITICAL RULES

1. **Only do what you are told.** Even if you have full permissions, understand the exact scope of the request and do not go beyond it. Never do something that was not explicitly asked. Never delete anything unless told to delete. Never remove anything unless told to remove.
2. **Review before acting.** Before making any changes, check and review first. Never modify, delete, or create files that were not specifically mentioned or approved by the user, even if you have permission to do so.
3. **Answer directly when asked.** If the user asks whether you did, updated, or changed something, answer with a clear yes or no and the reason. For example: "No, I did not update X because Y." Do not dodge the question.
4. **Only use APIs documented in this skill.** Do NOT search the web, guess endpoints, or invent API calls. If an operation is not listed here, ask the user.
5. **If an API call fails, report the error to the user.** Do NOT retry with different/guessed endpoints. Show the HTTP status code and error message, then ask how to proceed.
6. **MCP first, REST API fallback.** Always try MCP tools first. Only use REST API for operations MCP cannot do (attachments) or when MCP explicitly fails.
7. **NEVER use Python.** All API calls, credential reads, and scripting MUST use `node -e`. No `python3`, no `python`, no `.py` files. Node.js is the only runtime allowed in this skill.

---

## Atlassian MCP Plugin Check (BEFORE any MCP call)

**This check MUST run before the first MCP tool call in the session.** If MCP tools are not available, the user cannot use any MCP-based Jira operations.

### Step 1: Check if Atlassian MCP plugin is installed

Try calling any Atlassian MCP tool (e.g., `getJiraIssue` with a dummy key). If the tool is not recognized or returns a "tool not found" error, the plugin is NOT installed.

### Step 2: If Atlassian MCP is NOT installed, guide the user

Display this message:

```
Atlassian MCP plugin is not installed. It is required for Jira operations.

To install it, run this command in your terminal:

  claude mcp add atlassian -- npx -y @anthropic-ai/atlassian-mcp-server@latest

After installation, restart Claude Code for the plugin to take effect.
```

### Step 3: After plugin is installed, authenticate via OAuth

Once the plugin is available, the user needs to authenticate. When any MCP tool is called for the first time, the Atlassian MCP server will automatically trigger an OAuth flow.

Display this message:

```
Atlassian MCP plugin is installed. You need to authenticate with your Atlassian account.

When I make the first Jira request, an OAuth login link will appear in the terminal.
1. Click the link or copy-paste it into your browser
2. Log in with your Atlassian account
3. Click "Allow" to grant access
4. Return to Claude Code — authentication will complete automatically

Let me try reading a Jira issue now to trigger the login flow...
```

### Step 4: Verify authentication succeeded

If the MCP call returns valid data, authentication is complete. If it fails with an auth error:

```
Authentication failed. Please try again:
1. Run: claude mcp remove atlassian
2. Run: claude mcp add atlassian -- npx -y @anthropic-ai/atlassian-mcp-server@latest
3. Restart Claude Code
4. Try again — the OAuth link will appear when I make a Jira request
```

**NOTE:** This check only needs to happen once per session.

---

## API Credentials (for REST API fallback)

Credentials are stored per-user in `~/.claude/jira-credentials.json`.

### Check if credentials exist

```bash
node -e "console.log(require('fs').existsSync(require('os').homedir()+'/.claude/jira-credentials.json')?'CREDENTIALS_OK':'CREDENTIALS_MISSING')"
```

### If CREDENTIALS_MISSING, ask the user

```
An API token is required for Jira REST API operations (attachment download, etc.).

To create an API Token:
1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Enter "Claude Code" as the label
4. Click "Create" and copy the token

Please provide:
- Your Jira email address
- API Token
- Jira base URL (e.g. https://yourcompany.atlassian.net)
```

### Save credentials

```bash
node -e "
const os=require('os'),fs=require('fs'),path=require('path');
const file=path.join(os.homedir(),'.claude','jira-credentials.json');
fs.writeFileSync(file,JSON.stringify({email:'USER_EMAIL',apiToken:'USER_TOKEN',baseUrl:'USER_BASE_URL'},null,2));
if(process.platform!=='win32') fs.chmodSync(file,0o600);
console.log('Saved to',file);
"
```

- NEVER commit this file to git
- NEVER display the token back to user after saving

### Verify credentials

```bash
node -e "
const c=JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.claude/jira-credentials.json','utf8'));
fetch(c.baseUrl+'/rest/api/3/myself',{
  headers:{'Authorization':'Basic '+Buffer.from(c.email+':'+c.apiToken).toString('base64')}
}).then(r=>r.json()).then(d=>console.log('AUTH OK:',d.displayName||'FAIL'))
"
```

---

## REST API Reference (cross-platform node -e commands)

**Credential helper (reuse in all commands):**
```js
const c = JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.claude/jira-credentials.json','utf8'));
const auth = 'Basic ' + Buffer.from(c.email+':'+c.apiToken).toString('base64');
const BASE = c.baseUrl + '/rest/api/3';
```

**Get available transitions:**
```bash
node -e "
const c=JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.claude/jira-credentials.json','utf8'));
fetch(c.baseUrl+'/rest/api/3/issue/ISSUE_KEY/transitions',{
  headers:{'Authorization':'Basic '+Buffer.from(c.email+':'+c.apiToken).toString('base64')}
}).then(r=>r.json()).then(d=>{
  d.transitions.forEach(t=>console.log('  ID='+t.id+' \"'+t.name+'\" -> \"'+t.to.name+'\"'))
})
"
```

**Transition issue:**
```bash
node -e "
const c=JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.claude/jira-credentials.json','utf8'));
fetch(c.baseUrl+'/rest/api/3/issue/ISSUE_KEY/transitions',{
  method:'POST',
  headers:{'Authorization':'Basic '+Buffer.from(c.email+':'+c.apiToken).toString('base64'),'Content-Type':'application/json'},
  body:JSON.stringify({transition:{id:'TRANSITION_ID'}})
}).then(r=>{console.log(r.ok?'OK':'FAIL',r.status)})
"
```

**Assign issue:**
```bash
node -e "
const c=JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.claude/jira-credentials.json','utf8'));
const auth='Basic '+Buffer.from(c.email+':'+c.apiToken).toString('base64');
fetch(c.baseUrl+'/rest/api/3/myself',{headers:{Authorization:auth}})
.then(r=>r.json()).then(me=>
  fetch(c.baseUrl+'/rest/api/3/issue/ISSUE_KEY/assignee',{
    method:'PUT',headers:{Authorization:auth,'Content-Type':'application/json'},
    body:JSON.stringify({accountId:me.accountId})
  })
).then(r=>{console.log(r.ok?'Assigned':'FAIL',r.status)})
"
```

**Search issues (POST):**
```bash
node -e "
const c=JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.claude/jira-credentials.json','utf8'));
fetch(c.baseUrl+'/rest/api/3/search/jql',{
  method:'POST',
  headers:{'Authorization':'Basic '+Buffer.from(c.email+':'+c.apiToken).toString('base64'),'Content-Type':'application/json'},
  body:JSON.stringify({jql:'JQL_QUERY',maxResults:10,fields:['key','summary','status']})
}).then(r=>r.json()).then(d=>{
  d.issues.forEach(i=>console.log(i.key+' ['+i.fields.status.name+'] '+i.fields.summary))
})
"
```

**Download attachment:**
```bash
node -e "
const c=JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.claude/jira-credentials.json','utf8'));
const fs=require('fs');
fetch(c.baseUrl+'/rest/api/3/attachment/content/ATTACHMENT_ID',{
  headers:{'Authorization':'Basic '+Buffer.from(c.email+':'+c.apiToken).toString('base64')},redirect:'follow'
}).then(r=>r.arrayBuffer()).then(buf=>{
  fs.writeFileSync('/tmp/FILENAME',Buffer.from(buf));
  console.log('Downloaded:',Buffer.from(buf).length,'bytes');
})
"
```

**NOTE:** The old `GET /rest/api/3/search` endpoint is deprecated. Always use `POST /rest/api/3/search/jql`.

---

## MCP vs REST API Decision

| Operation | MCP Tool | REST API Fallback |
|---|---|---|
| Read issue details | `getJiraIssue` | - |
| Search issues | `searchJiraIssuesUsingJql` | `POST /search/jql` |
| Add comments | `addCommentToJiraIssue` | - |
| Transition status | `transitionJiraIssue` | `POST /issue/{key}/transitions` |
| Assign issue | `editJiraIssue` | `PUT /issue/{key}/assignee` |
| Get transitions | `getTransitionsForJiraIssue` | `GET /issue/{key}/transitions` |
| **Download attachments** | **NOT SUPPORTED** | **`GET /attachment/content/{id}`** |
| **Upload attachments** | **NOT SUPPORTED** | **`POST /issue/{key}/attachments`** |

**Rule:** Always try MCP first. Use REST API only when MCP doesn't support the operation (attachments) or when MCP fails.

---

## Automatic Attachment Download Workflow

**This workflow runs AUTOMATICALLY every time an issue is loaded.** Do NOT skip it. Do NOT ask the user.

### Step 1: Get issue details and check for attachments

Use Atlassian MCP `getJiraIssue` to get the issue. Check:
- `attachment[]` field — list of file attachments
- Extract: `id`, `filename`, `mimeType`, `size` from each attachment

### Step 2: If attachments exist, download ALL automatically

1. Check API credentials exist
2. Download ALL attachments to `/tmp/`
3. No need to ask the user — just download everything

### Step 3: Verify and display

- Check each file size > 1KB (94 bytes = auth error JSON)
- Use Read tool to display images
- Report summary for non-image files

---

## Error Reference

| Symptom | Cause | Fix |
|---|---|---|
| `401 Unauthorized` | Invalid email or expired token | Re-create API token |
| `403 Forbidden` | No project permission | Needs "Browse projects" permission |
| `404 Not Found` | Wrong attachment ID | Re-check from `getJiraIssue` |
| Downloaded file is 94 bytes | Got error JSON instead of binary | Check credentials |
| `CREDENTIALS_MISSING` | First time use | Guide through API token creation |

---

## Global Rules

1. **ALL output in English.**
2. **NEVER use Python.** All scripting must be `node -e` only.
3. **User approval for medium-complexity changes:** If the change affects 3+ files, present the plan first.

---

## Task: $ARGUMENTS
