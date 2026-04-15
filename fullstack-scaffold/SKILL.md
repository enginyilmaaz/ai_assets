---
name: fullstack-scaffold
description: Create a full-stack project (backend + frontend) in one command. Scaffolds both a Node.js Express backend and Next.js frontend with matching architecture, routes, and naming conventions. Usage examples - 'create fullstack project', 'yeni fullstack proje', 'scaffold full project', 'hem backend hem frontend olustur'
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent, Skill
argument-hint: [project name and description, e.g. "task-manager - a task management app with Tasks and Categories"]
---

# Full-Stack Project Scaffold

## CRITICAL RULES

1. **Only do what you are told.** Even if you have full permissions, understand the exact scope of the request and do not go beyond it. Never do something that was not explicitly asked. Never delete anything unless told to delete. Never remove anything unless told to remove.
2. **Review before acting.** Before making any changes, check and review first. Never modify, delete, or create files that were not specifically mentioned or approved by the user, even if you have permission to do so.
3. **Answer directly when asked.** If the user asks whether you did, updated, or changed something, answer with a clear yes or no and the reason. For example: "No, I did not update X because Y." Do not dodge the question.
4. **Task-scoped commit/push.** When working on a task and the user says "commit" or "push", ONLY commit/push the changes related to that task. Unrelated changes MUST NOT be deleted, stashed, reverted, or included in the commit/push. They must remain in the working directory exactly as they were. Use explicit `git add <file>` for task-related files only — never `git add -A`, `git add .`, or `git stash`.
5. **Stay within the working directory.** Never go outside the current working directory to make changes, even if you have full skip/permission privileges. Only operate outside the working directory if the user explicitly specifies a path (e.g., "check XX path and change this"). Default: all operations happen inside the current working directory.

---

You are an assistant that creates full-stack projects by orchestrating both the `nodejs-backend-scaffold` and `nextjs-frontend-scaffold` skills together.

## How This Skill Works

### Step 1: Gather Requirements (ask once, use for both)

Ask the user for:
- **Project name** (kebab-case, e.g. `task-manager`)
- **Description** (brief, e.g. "Task management application")
- **Entities** (e.g. "Task, Category, Tag")
- **Backend port** (default: 5000)
- **Frontend port** (default: 3000)
- **Database**: none / sqlite / postgres
- **Features needed**: auth, S3 file upload, RabbitMQ, cron jobs, i18n, charts, Socket.IO
- **Project location** (default: current directory, creates `<name>-backend/` and `<name>-frontend/`)

### Step 2: Create Backend

Invoke the `nodejs-backend-scaffold` skill with the gathered info:
- Project path: `<location>/<name>-backend/`
- Port: backend port
- DB: as selected
- Entities: same list
- S3/RabbitMQ/Cron: as selected

### Step 3: Create Frontend

Invoke the `nextjs-frontend-scaffold` skill with the gathered info:
- Project path: `<location>/<name>-frontend/`
- Port: frontend port
- API URL: `http://localhost:<backend-port>`
- Auth: yes if backend has auth
- ACL: yes if backend has roles
- Entities: same list (pages + services matching backend routes)

### Step 4: Verify Integration

After both are created:
1. Confirm the frontend's `NEXT_PUBLIC_API_URL` points to the backend port
2. Confirm the frontend service URLs match backend route patterns
3. Start backend: `cd <name>-backend && yarn dev`
4. Start frontend: `cd <name>-frontend && yarn dev`
5. Report both running URLs to the user

## Route Matching

The two skills use matching route conventions:

| Backend Route | Frontend Service Call |
|--------------|---------------------|
| `POST /v1/{module}/{entities}/create{entity}` | `Api.post('/v1/{module}/{entities}/create{entity}', ...)` |
| `PUT /v1/{module}/{entities}/update{entity}/:id` | `Api.put('/v1/{module}/{entities}/update{entity}/${id}', ...)` |
| `GET /v1/{module}/{entities}/get{entity}byid/:id` | `Api.get('/v1/{module}/{entities}/get{entity}byid/${id}', ...)` |
| `GET /v1/{module}/{entities}/getall{entities}` | `Api.get('/v1/{module}/{entities}/getall{entities}', ..., params)` |
| `DELETE /v1/{module}/{entities}/delete{entity}/:id` | `Api.delete('/v1/{module}/{entities}/delete{entity}/${id}', ...)` |

## Execution Strategy

Use the Agent tool to run both scaffolds **in parallel** for speed:
- Agent 1: Creates the backend project
- Agent 2: Creates the frontend project

Both agents should follow their respective skill templates exactly.

After both complete, do a final integration check and report results.

## Output Structure

```
<project-location>/
├── <name>-backend/          # Node.js Express backend
│   ├── app.ts
│   ├── package.json
│   └── src/
│       ├── controllers/
│       ├── services/
│       ├── data-access/
│       ├── models/
│       ├── routers/
│       └── ...
├── <name>-frontend/         # Next.js frontend
│   ├── next.config.js
│   ├── package.json
│   └── src/
│       ├── pages/
│       ├── views/
│       ├── services/
│       ├── configs/api.ts
│       └── ...
└── (optional) docker-compose.yml
```

## Optional: Docker Compose

If the user wants Docker support, also create a `docker-compose.yml` at the root:

```yaml
version: '3.8'
services:
  backend:
    build: ./<name>-backend
    ports:
      - "{{BACKEND_PORT}}:{{BACKEND_PORT}}"
    environment:
      - NODE_ENV=dev
    depends_on:
      - db

  frontend:
    build: ./<name>-frontend
    ports:
      - "{{FRONTEND_PORT}}:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:{{BACKEND_PORT}}
    depends_on:
      - backend

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: {{DB_NAME}}
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```
