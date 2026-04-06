---
name: nodejs-backend-scaffold
description: Create a new Node.js backend project from scratch - Express, Sequelize, PostgreSQL, Repository pattern, layered architecture. Usage examples - 'create new backend project', 'yeni backend projesi olustur', 'scaffold new project', 'new nodejs backend', 'yeni proje kur'
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
argument-hint: [project name and description, e.g. "task-manager - a task management API"]
---

# Node.js Backend Project Scaffold

You are an assistant that creates new Node.js backend projects following a clean layered architecture pattern. This pattern uses Express + TypeScript: Router -> Controller -> Service -> Repository -> Model.

## How This Skill Works

When the user wants to create a new backend project, follow these steps:

1. **Gather requirements** from the user:
   - Project name (kebab-case, e.g. `task-manager`)
   - Brief description
   - Port number (default: 3000)
   - Database needs: `none` (no DB), `sqlite` (small/simple), `postgres` (medium/large)
   - Initial entities to create (e.g. "Task", "Category")
   - Whether S3/file upload is needed
   - Whether RabbitMQ messaging is needed
   - Whether cron jobs are needed

2. **Create the project directory and ALL files** based on the templates below.

3. **If PostgreSQL is selected**, attempt to create the database using the PostgreSQL MCP server. If that fails, tell the user to create the database manually.

4. **Run `yarn install`** to install dependencies.

5. **Verify the project starts** with `yarn dev`.

---

## Project Directory Structure

```
<project-name>/
├── app.ts                          # Entry point
├── global.d.ts                     # Global type declarations
├── package.json
├── tsconfig.json
├── nodemon.json
├── .gitignore
├── src/
│   ├── config/
│   │   ├── settings.ts             # Settings loader
│   │   └── settings-template.ts    # Settings template (auto-copied to settings.override.ts)
│   ├── constants/
│   │   ├── index.ts
│   │   └── Events.ts               # Event enum (if RabbitMQ enabled)
│   ├── controllers/
│   │   ├── index.ts                # Barrel export
│   │   └── <Entity>Controller.ts
│   ├── data-access/
│   │   ├── index.ts                # Barrel export
│   │   ├── abstract/
│   │   │   └── I<Entity>Repository.ts
│   │   └── concrete/
│   │       └── <Entity>Repository.ts
│   ├── helpers/
│   │   └── index.ts
│   ├── libs/
│   │   ├── database.ts             # Sequelize setup (if DB enabled)
│   │   ├── s3.ts                   # S3 setup (if S3 enabled)
│   │   ├── pdf.ts                  # PDF generation (optional)
│   │   ├── configs/
│   │   │   ├── index.ts
│   │   │   └── loggerConfig.ts
│   │   └── rabbitmq/               # (if RabbitMQ enabled)
│   │       ├── RabbitMq.ts
│   │       └── EventManager.ts
│   ├── middlewares/
│   │   ├── index.ts
│   │   ├── errorHandler.ts
│   │   ├── jwt.ts
│   │   └── LoggerMiddleware.ts
│   ├── migrations/                 # (if DB enabled)
│   ├── models/
│   │   ├── index.ts                # Barrel export
│   │   └── <Entity>.ts
│   ├── routers/
│   │   ├── index.ts                # RootRouter
│   │   └── <Entity>Router.ts
│   ├── rpcs/                       # (if RabbitMQ enabled)
│   │   ├── publishers/
│   │   │   └── index.ts
│   │   └── subscribers/
│   │       └── index.ts
│   ├── services/
│   │   ├── index.ts                # Barrel export
│   │   ├── abstract/
│   │   │   └── I<Entity>Service.ts
│   │   └── concrete/
│   │       └── <Entity>Service.ts
│   ├── crons/                      # (if cron enabled)
│   │   └── index.ts
│   ├── events/                     # (if RabbitMQ enabled)
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── index.ts
│       └── logger.ts
```

---

## File Naming Conventions

| Layer | File Name Pattern | Class/Interface Name |
|-------|-------------------|---------------------|
| Model | `<Entity>.ts` (PascalCase) | `const <Entity>: SequelizeModel = sequelize.define("<TableName>", {...})` |
| Repository Interface | `I<Entity>Repository.ts` | `export interface I<Entity>Repository { ... }` |
| Repository Concrete | `<Entity>Repository.ts` | `export class <Entity>Repository implements I<Entity>Repository { ... }` |
| Service Interface | `I<Entity>Service.ts` | `export interface I<Entity>Service { ... }` |
| Service Concrete | `<Entity>Service.ts` | `export class <Entity>Service implements I<Entity>Service { ... }` |
| Controller | `<Entity>Controller.ts` | `export class <Entity>Controller { ... }` |
| Router | `<Entity>Router.ts` | `const <Entity>Router: Router = Router()` |
| RPC Publisher | `<action>Publisher.ts` (camelCase) | `export async function <action>Publisher(...) { ... }` |
| RPC Subscriber | `<action>Subscriber.ts` (camelCase) | `export async function <action>Subscriber() { ... }` |
| Cron | `<Name>Cron.ts` (PascalCase) | `export async function Setup<Name>Cron() { ... }` |
| Event Handler | `<EventName>Handler.ts` | `export const handle<EventName> = async (msg) => { ... }` |

## Method Naming Conventions

| Operation | Repository Method | Service Method | Controller Method |
|-----------|------------------|----------------|-------------------|
| Create | `Create<Entity>(data)` | `Create<Entity>(data)` | `Create<Entity>(req, res)` |
| Update | `Update<Entity>(id, data)` | `Update<Entity>(id, data)` | `Update<Entity>(req, res)` |
| Get by ID | `Get<Entity>ById(id)` | `Get<Entity>ById(id)` | `Get<Entity>ById(req, res)` |
| Get all | `GetAll<Entities>(offset, limit, keyword, orderBy, sortBy, filters)` | `GetAll<Entities>(...)` | `GetAll<Entities>(req, res)` |
| Delete | `Delete<Entity>(ids)` | `Delete<Entity>(ids)` | `Delete<Entity>(req, res)` |
| Bulk delete | `Delete<Entity>(ids)` (same, accepts array) | `Delete<Entity>(ids)` | `BulkDelete<Entities>(req, res)` |

## Route Naming Conventions

```
POST   /<module>/<entities>/create<entity>          # Create
POST   /<module>/<entities>/export                   # Export (XLSX/CSV/PDF)
PUT    /<module>/<entities>/update<entity>/:id       # Update
GET    /<module>/<entities>/get<entity>byid/:id      # Get by ID
GET    /<module>/<entities>/getall<entities>          # Get all (paginated)
GET    /<module>/<entities>/getall<entities>fordropdown  # Get for dropdown
DELETE /<module>/<entities>/delete<entity>/:id        # Delete
DELETE /<module>/<entities>/bulkdelete<entities>      # Bulk delete
```

---

## Code Templates

### package.json

```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "1.0.0",
  "description": "{{PROJECT_DESCRIPTION}}",
  "main": "app.ts",
  "type": "commonjs",
  "scripts": {
    "dev": "NODE_OPTIONS=--max-old-space-size=256 NODE_ENV=dev nodemon --swc app.ts",
    "staging": "NODE_OPTIONS=--max-old-space-size=256 NODE_ENV=staging nodemon --swc app.ts",
    "prod": "NODE_ENV=prod nodemon --swc app.ts",
    "start": "NODE_OPTIONS=--max-old-space-size=256 nodemon --swc app.ts",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "cookie-parser": "1.4.7",
    "express": "5.2.1",
    "http-status-codes": "^2.2.0",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "tsconfig-paths": "^4.2.0",
    "uuid": "^9.0.1",
    "winston": "^3.9.0",
    "winston-daily-rotate-file": "^4.7.1"
  },
  "devDependencies": {
    "@swc/core": "^1.11.9",
    "@types/cookie-parser": "1.4.10",
    "@types/express": "4.17.25",
    "@types/jsonwebtoken": "^8.5.9",
    "@types/multer": "^1.4.12",
    "@types/node": "^18.11.3",
    "@types/uuid": "^9.0.8",
    "nodemon": "^3.1.9",
    "ts-node": "^10.9.2",
    "typescript": "^5.8.2"
  },
  "resolutions": {
    "@types/express": "4.17.25",
    "@types/express-serve-static-core": "4.19.8"
  }
}
```

**Additional dependencies based on options:**
- If `postgres` DB: add `"sequelize": "6.37.8"`, `"pg": "8.20.0"`, `"pg-hstore": "2.3.4"` to dependencies, `"@types/sequelize": "^4.28.14"` to devDependencies
- If `sqlite` DB: add `"sequelize": "6.37.8"`, `"sqlite3": "^5.1.7"` to dependencies, `"@types/sequelize": "^4.28.14"` to devDependencies
- If S3 enabled: add `"@aws-sdk/client-s3": "^3.x"`, `"@aws-sdk/s3-request-presigner": "^3.x"` to dependencies
- If RabbitMQ enabled: add `"amqplib": "^0.10.4"` to dependencies
- If cron enabled: add `"node-cron": "^3.0.3"` to dependencies, `"@types/node-cron": "^3.0.11"` to devDependencies
- If Excel export needed: add `"exceljs": "^4.4.0"` to dependencies

### tsconfig.json

```json
{
  "ts-node": {
    "transpileOnly": true,
    "typeCheck": false,
    "files": false,
    "require": [
      "tsconfig-paths/register"
    ]
  },
  "compilerOptions": {
    "target": "esnext",
    "module": "commonjs",
    "outDir": "./dist",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "paths": {
      "@type/*": ["./src/types/*"],
      "@models": ["./src/models/index.ts"],
      "@services": ["./src/services/index.ts"],
      "@helpers": ["./src/helpers/index.ts"],
      "@routers": ["./src/routers/index.ts"],
      "@repositories": ["./src/data-access/index.ts"],
      "@middlewares": ["./src/middlewares/index.ts"],
      "@controllers": ["./src/controllers/index.ts"],
      "@settings": ["./src/config/settings.ts"],
      "@database": ["./src/libs/database.ts"]
    }
  },
  "include": ["**/*.ts", "**/*.d.ts"],
  "exclude": ["node_modules"]
}
```

**If RabbitMQ/events enabled**, add to paths: `"@events": ["./src/events/index.ts"]`

### nodemon.json

```json
{
  "watch": ["src", "app.ts", "global.d.ts"],
  "ignore": [
    "node_modules",
    "logs",
    "src/assets",
    "src/**/*.test.ts",
    "src/**/*.spec.ts"
  ],
  "ext": "ts,json"
}
```

### .gitignore

```
node_modules/
logs/
dist/
src/config/settings.override.ts
.env
*.log
```

### global.d.ts

```typescript
import { Transaction, ModelStatic, WhereOptions } from "sequelize";
import { Request as ExpressRequest } from "express";
export type UserType = "admin" | "user";

declare global {
  interface DbTransaction extends Transaction { }
  type DbWhereOptions = WhereOptions;
  interface SequelizeModel extends ModelStatic<any> {
    associate?: () => void;
  }
}

declare module "express" {
  export interface RequestPayload {
    id: string;
    email: string;
    type: UserType;
  }
  export interface Request extends ExpressRequest {
    user?: RequestPayload;
    admin?: RequestPayload;
    branchId?: string;
    session?: any;
  }
}
```

**If no database**, remove the Sequelize-related types (DbTransaction, DbWhereOptions, SequelizeModel).

### app.ts (with PostgreSQL)

```typescript
import express from 'express';
import settings from '@settings';
import { sequelize, SequelizeModel } from './src/libs/database';
import { errorhandler } from './src/middlewares/errorHandler';
import { RootRouter } from './src/routers';
import { LoggerMiddleware } from './src/middlewares';
import cookieParser from "cookie-parser";

const env = process.env.NODE_ENV;
const app = express();
const moduleName = settings.module;
const port = process.argv[2] || settings.backendPort || {{PORT}};

// Middleware
app.use(express.json({ limit: "100mb" }));
app.use(cookieParser());
app.use(LoggerMiddleware);

// Routes
app.use('/v1/', RootRouter);
app.use('/api/v1', RootRouter);
app.use(errorhandler);

// Database startup
sequelize.authenticate()
  .then(async () => {
    console.log('Database connection established.');

    // Sync models (creates tables if not exist)
    await sequelize.sync();
    console.log('Database synchronized.');

    // Associate models
    const models = sequelize.models as { [key: string]: SequelizeModel };
    Object.values(models).forEach((model) => {
      if (model.associate) model.associate();
    });

    // Start server
    const server = app.listen(port, () => {
      console.log(`${moduleName} is listening in ${env} on port ${port}`);
    });
  })
  .catch((error: any) => {
    console.error('Application startup failed:', error);
    process.exit(1);
  });
```

### app.ts (without database)

```typescript
import express from 'express';
import settings from '@settings';
import { errorhandler } from './src/middlewares/errorHandler';
import { RootRouter } from './src/routers';
import { LoggerMiddleware } from './src/middlewares';
import cookieParser from "cookie-parser";

const env = process.env.NODE_ENV;
const app = express();
const moduleName = settings.module;
const port = process.argv[2] || settings.backendPort || {{PORT}};

// Middleware
app.use(express.json({ limit: "100mb" }));
app.use(cookieParser());
app.use(LoggerMiddleware);

// Routes
app.use('/v1/', RootRouter);
app.use('/api/v1', RootRouter);
app.use(errorhandler);

// Start server
app.listen(port, () => {
  console.log(`${moduleName} is listening in ${env} on port ${port}`);
});
```

### src/config/settings.ts

```typescript
import fs from "fs";
import path from "path";
import util from 'util';

const env = process.env.NODE_ENV as string;

const settingsTemplatePath = path.resolve(__dirname, "./settings-template.ts");
const settingsOverridePath = path.resolve(__dirname, `./settings.override.ts`);
const fileErrorMessage = "The config file %s was created from the template because the file could not be found. Please update that file and run it again.";

if (!fs.existsSync(settingsOverridePath)) {
  try {
    fs.copyFileSync(settingsTemplatePath, settingsOverridePath);
    console.log(util.format(fileErrorMessage, settingsOverridePath));
  } catch (error: any) {
    console.error(`Failed to copy template file to ${settingsOverridePath}`);
    console.error(error);
    process.exit(1);
  }
}

let settingsOverride;
try {
  settingsOverride = require(settingsOverridePath).settings;
} catch (error: any) {
  console.error('Failed to load settings override file');
  console.error(error);
  process.exit(1);
}

import { loggerConfig } from "../libs/configs";

const defaultSettings: Record<string, any> = {
  dev: { ...loggerConfig },
  staging: { ...loggerConfig },
  production: { ...loggerConfig },
  test: { ...loggerConfig }
};

export default { ...(defaultSettings as Record<string, any>)[env], ...(settingsOverride as Record<string, any>)[env] };
```

### src/config/settings-template.ts (with PostgreSQL)

```typescript
export const settings: Record<string, any> = {
  dev: {
    environment: "dev",
    module: "{{MODULE_NAME}}",
    backendPort: {{PORT}},
    database: {
      host: "localhost",
      database: "{{DB_NAME}}",
      port: 5432,
      username: "postgres",
      password: "postgres",
      dialect: "postgres",
      sync: { force: false },
      pool: { max: 20, min: 0, acquire: 60000, idle: 10000 },
      logging: false,
      define: { timestamps: true, freezeTableName: false },
      dialectOptions: {
        ssl: false
      },
    },
    secrets: {
      admin: {
        accessToken: "dev-access-token-secret-change-me",
        refreshToken: "dev-refresh-token-secret-change-me",
      },
    },
  },
  staging: {
    environment: "staging",
    module: "{{MODULE_NAME}}",
    backendPort: {{PORT}},
    database: {
      host: "replace-with-db-hostname",
      database: "{{DB_NAME}}",
      port: 5432,
      username: "replace-with-db-username",
      password: "replace-with-db-password",
      dialect: "postgres",
      sync: { force: false },
      pool: { max: 20, min: 0, acquire: 60000, idle: 10000 },
      logging: false,
      define: { timestamps: true, freezeTableName: false },
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false },
      },
    },
    secrets: {
      admin: {
        accessToken: "replace-with-admin-access-token",
        refreshToken: "replace-with-admin-refresh-token",
      },
    },
  },
  production: {
    environment: "production",
    module: "{{MODULE_NAME}}",
    backendPort: {{PORT}},
    database: {
      host: "replace-with-db-hostname",
      database: "{{DB_NAME}}",
      port: 5432,
      username: "replace-with-db-username",
      password: "replace-with-db-password",
      dialect: "postgres",
      sync: { force: false },
      pool: { max: 20, min: 0, acquire: 60000, idle: 10000 },
      logging: false,
      define: { timestamps: true, freezeTableName: false },
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false },
      },
    },
    secrets: {
      admin: {
        accessToken: "replace-with-admin-access-token",
        refreshToken: "replace-with-admin-refresh-token",
      },
    },
  },
  test: {
    environment: "test",
    module: "{{MODULE_NAME}}",
    backendPort: {{PORT}},
    database: {
      host: "localhost",
      database: "{{DB_NAME}}_test",
      port: 5432,
      username: "postgres",
      password: "postgres",
      dialect: "postgres",
      sync: { force: false },
      pool: { max: 5, min: 0, acquire: 60000, idle: 10000 },
      logging: false,
      define: { timestamps: true, freezeTableName: false },
      dialectOptions: { ssl: false },
    },
    secrets: {
      admin: {
        accessToken: "test-access-token-secret",
        refreshToken: "test-refresh-token-secret",
      },
    },
  }
};
```

**If S3 is enabled**, add to each environment block:
```typescript
    storage: {
      s3: {
        client: {
          forcePathStyle: false,
          endpoint: "replace-with-s3-endpoint",
          region: "replace-with-region",
          credentials: {
            accessKeyId: "replace-with-access-key-id",
            secretAccessKey: "replace-with-secret-access-key",
          },
        },
        bucketName: "replace-with-bucket-name",
        bucketUrl: "replace-with-bucket-url",
        uploadPath: "uploads/{{MODULE_NAME}}/",
      },
    },
```

**If RabbitMQ is enabled**, add to each environment block:
```typescript
    amqp: {
      hostname: "localhost",
      port: "5672",
      vhost: "/",
      username: "guest",
      password: "guest",
    },
```

### src/config/settings-template.ts (without database / SQLite)

For no-database projects, remove the entire `database` block. For SQLite, replace with:
```typescript
    database: {
      dialect: "sqlite",
      storage: "./database.sqlite",
      sync: { force: false },
      logging: false,
      define: { timestamps: true, freezeTableName: false },
    },
```

### src/libs/database.ts (PostgreSQL)

```typescript
import { Sequelize, Options, DataTypes, QueryTypes, Transaction, TransactionOptions, ModelStatic } from "sequelize";
import settings from "@settings";

export interface SequelizeModel extends ModelStatic<any> {
  associate?: () => void;
}

const dbConfig: Options = {
  host: settings.database.host,
  port: settings.database.port,
  database: settings.database.database,
  username: settings.database.username,
  password: settings.database.password,
  dialect: settings.database.dialect,
  pool: settings.database.pool,
  logging: settings.database.logging,
  define: settings.database.define,
  dialectOptions: settings.database.dialectOptions,
};

const sequelize = new Sequelize(dbConfig);

export {
  sequelize,
  DataTypes,
  QueryTypes,
  Transaction,
  TransactionOptions,
};

export const testConnection = () => sequelize.authenticate();
export const CreateTransaction = (options?: TransactionOptions) => sequelize.transaction(options);
export const closeConnection = () => sequelize.close();
```

### src/libs/database.ts (SQLite)

```typescript
import { Sequelize, Options, DataTypes, QueryTypes, Transaction, TransactionOptions, ModelStatic } from "sequelize";
import settings from "@settings";

export interface SequelizeModel extends ModelStatic<any> {
  associate?: () => void;
}

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: settings.database.storage || "./database.sqlite",
  logging: settings.database.logging || false,
  define: settings.database.define,
});

export {
  sequelize,
  DataTypes,
  QueryTypes,
  Transaction,
  TransactionOptions,
};

export const testConnection = () => sequelize.authenticate();
export const CreateTransaction = (options?: TransactionOptions) => sequelize.transaction(options);
export const closeConnection = () => sequelize.close();
```

### src/libs/configs/loggerConfig.ts

```typescript
import winston from 'winston';
import dailyRotateFile from 'winston-daily-rotate-file';
const { timestamp, json, colorize, label, combine, prettyPrint } = winston.format;

export const loggerConfig = {
  logger: {
    winston: {
      defaultMeta: {
        api: "NODE SERVER",
      },
      transports: [
        new dailyRotateFile({
          datePattern: "DD.MM.YYYY",
          filename: "%DATE%.debug.log",
          dirname: './logs/',
          level: "debug",
        }),
        new dailyRotateFile({
          datePattern: "DD.MM.YYYY",
          filename: "%DATE%.error.log",
          dirname: './logs/',
          level: 'error'
        })
      ],
      format: combine(
        label({ label: 'App V1' }),
        timestamp(),
        prettyPrint(),
        colorize(),
        json()
      )
    }
  }
};
```

### src/libs/configs/index.ts

```typescript
import { loggerConfig } from "./loggerConfig";
export { loggerConfig };
```

### src/utils/logger.ts

```typescript
import { createLogger } from 'winston';
import settings from '@settings';
const logger = createLogger(settings.logger.winston);

export { logger };
```

### src/utils/index.ts

```typescript
import { logger } from "./logger";
export { logger };
```

### src/middlewares/errorHandler.ts

```typescript
import { NextFunction, Request, Response } from "express";

export const errorhandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  const code = res.statusCode ? res.statusCode : 500;
  res.status(code);
  res.json({
    message: error.message,
    stack: error.stack,
  });
};
```

### src/middlewares/LoggerMiddleware.ts

```typescript
import { logger } from '../utils';
import { NextFunction, Request, Response } from "express";

export function LoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  logger.info({
    ipAdress: req.ip,
    path: req.path,
    body: req.body,
    params: req.params,
    query: req.query,
    url: req.url
  });
  next();
}
```

### src/middlewares/jwt.ts

```typescript
import { NextFunction, Request, Response, RequestPayload } from "express";
import { verify } from "jsonwebtoken";
import settings from "@settings";
import { StatusCodes } from "http-status-codes";
const adminAccessTokenKey = settings.secrets.admin.accessToken;

export function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.split(" ")[1];
  const branchId = (req.headers["x-branch"] as string);

  if (!token) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Please login" });
  }

  try {
    const adminTokenResponse = verify(
      token,
      adminAccessTokenKey as string
    ) as RequestPayload;
    req.admin = adminTokenResponse;
    req.branchId = branchId;
    next();
  } catch (error) {
    console.error(error);
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Invalid access token" });
  }
}
```

### src/middlewares/index.ts

```typescript
import { LoggerMiddleware } from "./LoggerMiddleware";
export { LoggerMiddleware };
```

### src/libs/rabbitmq/RabbitMq.ts (only if RabbitMQ enabled)

```typescript
import settings from "@settings";
import amqplib from "amqplib";

const amqpParams = {
  protocol: "amqp",
  hostname: settings.amqp.hostname || "localhost",
  port: settings.amqp.port || 5672,
  username: settings.amqp.username || "guest",
  password: settings.amqp.password || "guest",
  vhost: settings.amqp.vhost || "/",
};

let connection: amqplib.Connection | null = null;
let channel: amqplib.Channel | null = null;

async function getChannel(): Promise<amqplib.Channel> {
  if (!connection) {
    connection = await amqplib.connect(amqpParams);
  }
  if (!channel) {
    channel = await connection.createChannel();
  }
  return channel;
}

export async function requestReply(queue: string, payload: any, timeout = 30000): Promise<any> {
  const ch = await getChannel();
  const replyQueue = await ch.assertQueue('', { exclusive: true });

  return new Promise((resolve, reject) => {
    const correlationId = require('uuid').v4();
    const timer = setTimeout(() => reject(new Error(`RPC timeout: ${queue}`)), timeout);

    ch.consume(replyQueue.queue, (msg) => {
      if (msg && msg.properties.correlationId === correlationId) {
        clearTimeout(timer);
        resolve(JSON.parse(msg.content.toString()));
        ch.cancel(msg.fields.consumerTag);
      }
    }, { noAck: true });

    ch.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
      correlationId,
      replyTo: replyQueue.queue,
    });
  });
}

export async function subscribeAndReply(queue: string, handler: (msg: any) => Promise<any>): Promise<void> {
  const ch = await getChannel();
  await ch.assertQueue(queue, { durable: true });
  ch.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      const result = await handler(payload);
      ch.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(result)), {
        correlationId: msg.properties.correlationId,
      });
      ch.ack(msg);
    } catch (error) {
      console.error(`Error processing ${queue}:`, error);
      ch.ack(msg);
    }
  });
}
```

---

## Entity Templates

### Model Template: src/models/<Entity>.ts

```typescript
import { sequelize, DataTypes } from "../libs/database";

const {{Entity}}: SequelizeModel = sequelize.define(
  "{{TableName}}",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    // Add entity-specific columns here
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "Active",
    },
  },
);

// Associations
{{Entity}}.associate = function () {
  const models = sequelize.models;
  // Example: {{Entity}}.belongsTo(models.OtherEntity, { foreignKey: "other_id" });
  // Example: {{Entity}}.hasMany(models.ChildEntity, { foreignKey: "{{entity}}_id" });
};

export { {{Entity}} };
```

### Repository Interface: src/data-access/abstract/I<Entity>Repository.ts

```typescript
export interface I{{Entity}}Repository {
  Create{{Entity}}(data: any): Promise<any>;
  Update{{Entity}}(id: string, data: any): Promise<any>;
  Get{{Entity}}ById(id: string): Promise<any>;
  GetAll{{Entities}}(
    offset: number,
    limit: number,
    keyword: string,
    orderBy: string,
    sortBy: "ASC" | "DESC",
    filters: Array<{ column: string; value: string }>
  ): Promise<any>;
  Delete{{Entity}}(ids: string | string[]): Promise<any>;
}
```

### Repository Concrete: src/data-access/concrete/<Entity>Repository.ts

```typescript
import { {{Entity}} } from "@models";
import { Op, cast, col, where } from "sequelize";
import { I{{Entity}}Repository } from "../abstract/I{{Entity}}Repository";

export class {{Entity}}Repository implements I{{Entity}}Repository {
  public Create{{Entity}} = async (data: any) => {
    return await {{Entity}}.create(data);
  };

  public Update{{Entity}} = async (id: string, data: any) => {
    return await {{Entity}}.update(data, {
      where: { id },
    });
  };

  public Get{{Entity}}ById = async (id: string) => {
    return await {{Entity}}.findByPk(id);
  };

  public GetAll{{Entities}} = async (
    offset: number,
    limit: number,
    keyword: string,
    orderBy: string = "updatedAt",
    sortBy: "ASC" | "DESC" = "DESC",
    filters: Array<{ column: string; value: string }>
  ) => {
    const conditions: any[] = [];

    if (keyword && keyword.trim() !== "") {
      conditions.push({
        [Op.or]: [
          where(cast(col("{{TableName}}.name"), "TEXT"), {
            [Op.iLike]: `%${keyword}%`,
          }),
        ],
      });
    }

    for (const filter of filters) {
      const value = filter.value?.trim();
      if (!value) continue;
      conditions.push(
        where(cast(col(`{{TableName}}.${filter.column}`), "TEXT"), {
          [Op.iLike]: `%${value}%`,
        })
      );
    }

    return await {{Entity}}.findAndCountAll({
      where: { [Op.and]: conditions },
      offset,
      limit,
      order: [[orderBy, sortBy]],
    });
  };

  public Delete{{Entity}} = async (ids: string | string[]) => {
    return await {{Entity}}.destroy({ where: { id: ids } });
  };
}
```

### Service Interface: src/services/abstract/I<Entity>Service.ts

```typescript
export interface I{{Entity}}Service {
  Create{{Entity}}(data: any): Promise<any>;
  Update{{Entity}}(id: string, data: any): Promise<any>;
  Get{{Entity}}ById(id: string): Promise<any>;
  GetAll{{Entities}}(
    page: number,
    limit: number,
    keyword: string,
    orderBy: string,
    sortBy: "ASC" | "DESC",
    filters: any
  ): Promise<any>;
  Delete{{Entity}}(ids: string | string[]): Promise<any>;
}
```

### Service Concrete: src/services/concrete/<Entity>Service.ts

```typescript
import { {{Entity}}Repository } from "../../data-access";
import { I{{Entity}}Service } from "../abstract/I{{Entity}}Service";

export class {{Entity}}Service implements I{{Entity}}Service {
  private {{entity}}Repository: {{Entity}}Repository;

  constructor() {
    this.{{entity}}Repository = new {{Entity}}Repository();
  }

  Create{{Entity}} = async (data: any): Promise<any> => {
    return await this.{{entity}}Repository.Create{{Entity}}(data);
  };

  Update{{Entity}} = async (id: string, data: any): Promise<any> => {
    return await this.{{entity}}Repository.Update{{Entity}}(id, data);
  };

  Get{{Entity}}ById = async (id: string): Promise<any> => {
    return await this.{{entity}}Repository.Get{{Entity}}ById(id);
  };

  GetAll{{Entities}} = async (
    page: number,
    limit: number,
    keyword: string,
    orderBy: string = "updatedAt",
    sortBy: "ASC" | "DESC" = "DESC",
    filters: any
  ): Promise<any> => {
    return await this.{{entity}}Repository.GetAll{{Entities}}(page, limit, keyword, orderBy, sortBy, filters);
  };

  Delete{{Entity}} = async (ids: string | string[]): Promise<any> => {
    return await this.{{entity}}Repository.Delete{{Entity}}(ids);
  };
}
```

### Controller: src/controllers/<Entity>Controller.ts

```typescript
import { {{Entity}}Service } from "@services";
import { Request, Response } from "express";
import { validate } from "uuid";

export class {{Entity}}Controller {
  private {{entity}}Service: {{Entity}}Service;

  constructor() {
    this.{{entity}}Service = new {{Entity}}Service();
  }

  public Create{{Entity}} = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      if (!data.name) {
        return res.status(400).json({ error: "Name is required" });
      }
      const result = await this.{{entity}}Service.Create{{Entity}}(data);
      return res.status(201).json({ message: "{{Entity}} created successfully", data: result });
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({ error: "Something went wrong" });
    }
  };

  public Update{{Entity}} = async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const data = req.body;
      if (!id) return res.status(400).json({ error: "Invalid id" });

      const existing = await this.{{entity}}Service.Get{{Entity}}ById(id);
      if (!existing) return res.status(400).json({ error: "{{Entity}} not found" });

      await this.{{entity}}Service.Update{{Entity}}(id, data);
      return res.status(200).json({ message: "{{Entity}} updated successfully" });
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({ error: "Something went wrong" });
    }
  };

  public Get{{Entity}}ById = async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: "Please provide an ID" });

      const data = await this.{{entity}}Service.Get{{Entity}}ById(id);
      if (!data) return res.status(400).json({ error: "{{Entity}} not found" });

      return res.status(200).json({ data });
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({ error: "Something went wrong" });
    }
  };

  public GetAll{{Entities}} = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const keyword = (req.query.keyword as string || "").trim();
      const orderBy = req.query.orderBy as string || "updatedAt";
      const sortBy = (req.query.sortBy as "ASC" | "DESC") || "DESC";

      let filters: Array<{ column: string; value: string }> = [];
      if (typeof req.query.filters === "string") {
        try {
          const parsed = JSON.parse(req.query.filters);
          if (Array.isArray(parsed)) filters = parsed;
        } catch (err) {
          console.error("Invalid filters JSON:", err);
        }
      }

      const data = await this.{{entity}}Service.GetAll{{Entities}}(offset, limit, keyword, orderBy, sortBy, filters);
      return res.status(200).json({ data: data.rows, count: data.count });
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({ error: "Something went wrong" });
    }
  };

  public Delete{{Entity}} = async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      if (!validate(id)) return res.status(400).json({ error: "Invalid ID" });

      const existing = await this.{{entity}}Service.Get{{Entity}}ById(id);
      if (!existing) return res.status(400).json({ error: "{{Entity}} not found" });

      await this.{{entity}}Service.Delete{{Entity}}(id);
      return res.status(200).json({ message: "{{Entity}} deleted successfully" });
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({ error: "Something went wrong" });
    }
  };

  public BulkDelete{{Entities}} = async (req: Request, res: Response) => {
    try {
      const ids: string[] = req.body?.ids;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Please provide IDs" });
      }

      const success: string[] = [];
      const errors: string[] = [];

      for (const id of ids) {
        if (!validate(id)) {
          errors.push(`Invalid ID: ${id}`);
          continue;
        }
        const existing = await this.{{entity}}Service.Get{{Entity}}ById(id);
        if (!existing) {
          errors.push(`{{Entity}} not found: ${id}`);
          continue;
        }
        await this.{{entity}}Service.Delete{{Entity}}(id);
        success.push(`Deleted: ${id}`);
      }

      if (errors.length === 0) {
        return res.status(200).json({ success, message: "All items deleted successfully" });
      }
      return res.status(200).json({ success, errors, message: "Some items could not be deleted" });
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({ error: "Something went wrong" });
    }
  };
}
```

### Router: src/routers/<Entity>Router.ts

```typescript
import { Router } from "express";
import { {{Entity}}Controller } from "@controllers";
import { isAuthenticated } from "../middlewares/jwt";

const {{Entity}}Router: Router = Router();
const {{entity}}Controller = new {{Entity}}Controller();

{{Entity}}Router.post("/{{module}}/{{entities}}/create{{entity}}", isAuthenticated, {{entity}}Controller.Create{{Entity}});

{{Entity}}Router.put("/{{module}}/{{entities}}/update{{entity}}/:id", isAuthenticated, {{entity}}Controller.Update{{Entity}});

{{Entity}}Router.get("/{{module}}/{{entities}}/get{{entity}}byid/:id", isAuthenticated, {{entity}}Controller.Get{{Entity}}ById);
{{Entity}}Router.get("/{{module}}/{{entities}}/getall{{entities}}", isAuthenticated, {{entity}}Controller.GetAll{{Entities}});

{{Entity}}Router.delete("/{{module}}/{{entities}}/delete{{entity}}/:id", isAuthenticated, {{entity}}Controller.Delete{{Entity}});
{{Entity}}Router.delete("/{{module}}/{{entities}}/bulkdelete{{entities}}", isAuthenticated, {{entity}}Controller.BulkDelete{{Entities}});

export { {{Entity}}Router };
```

### RootRouter: src/routers/index.ts

```typescript
import { Router } from "express";
// Import entity routers here
// import { {{Entity}}Router } from "./{{Entity}}Router";

const RootRouter: Router = Router();

// Register entity routers here
// RootRouter.use({{Entity}}Router);

export { RootRouter };
```

### Barrel Exports

**src/models/index.ts:**
```typescript
// export { {{Entity}} } from "./{{Entity}}";
```

**src/services/index.ts:**
```typescript
// export { {{Entity}}Service } from "./concrete/{{Entity}}Service";
```

**src/data-access/index.ts:**
```typescript
// export { {{Entity}}Repository } from "./concrete/{{Entity}}Repository";
```

**src/controllers/index.ts:**
```typescript
// export { {{Entity}}Controller } from "./{{Entity}}Controller";
```

**src/helpers/index.ts:**
```typescript
// Export helpers here
```

**src/constants/index.ts:**
```typescript
// Export constants here
```

**src/types/index.ts:**
```typescript
// Export types here
```

---

## RPC Templates (only if RabbitMQ enabled)

### Publisher Template: src/rpcs/publishers/<action>Publisher.ts

```typescript
import { requestReply } from "../../libs/rabbitmq/RabbitMq";

export async function {{action}}Publisher(payload: any): Promise<any> {
  try {
    const result = await requestReply("{{queueName}}", payload);
    return result;
  } catch (error) {
    console.error("{{action}}Publisher error:", error);
    return null;
  }
}
```

### Subscriber Template: src/rpcs/subscribers/<action>Subscriber.ts

```typescript
import { subscribeAndReply } from "../../libs/rabbitmq/RabbitMq";
import { {{Entity}}Service } from "@services";

const {{entity}}Service = new {{Entity}}Service();

export async function {{action}}Subscriber(): Promise<void> {
  await subscribeAndReply("{{queueName}}", async (payload: any) => {
    const { id } = payload;
    return await {{entity}}Service.Get{{Entity}}ById(id);
  });
}
```

### src/rpcs/publishers/index.ts

```typescript
// export { {{action}}Publisher } from "./{{action}}Publisher";
```

### src/rpcs/subscribers/index.ts

```typescript
export async function setupAllSubscribers(): Promise<void> {
  // await {{action}}Subscriber();
  console.log("All RabbitMQ subscribers started.");
}
```

---

## Cron Template (only if cron enabled)

### src/crons/index.ts

```typescript
export async function setupAllCrons(): Promise<void> {
  // await Setup{{Name}}Cron();
  console.log("All cron jobs started.");
}
```

### Cron Job Template: src/crons/<Name>Cron.ts

```typescript
import cron from "node-cron";

export async function Setup{{Name}}Cron(): Promise<void> {
  // Run once on startup
  try {
    await {{name}}Job();
  } catch (error) {
    console.error("{{Name}} cron startup error:", error);
  }

  // Schedule: "0 0 * * *" = midnight daily
  cron.schedule("0 0 * * *", async () => {
    try {
      await {{name}}Job();
    } catch (error) {
      console.error("{{Name}} cron error:", error);
    }
  }, { timezone: "Europe/Istanbul" });

  console.log("{{Name}} cron scheduled.");
}

async function {{name}}Job(): Promise<void> {
  // Implement job logic here
}
```

---

## Events Template (only if RabbitMQ enabled)

### src/events/index.ts

```typescript
// import { Events } from "../constants";
// import { handle{{EventName}} } from "./handlers/{{EventName}}Handler";

export const SetupEvents: Record<string, any> = {
  // [Events.{{EventName}}]: handle{{EventName}},
};
```

### src/constants/Events.ts

```typescript
enum Events {
  // Add events here, e.g.:
  // EntityCreated = "EntityCreated",
  // EntityUpdated = "EntityUpdated",
}

export { Events };
```

---

## Code Quality Rules (MUST follow in all generated code)

### No Hardcoded Values (No Magic Numbers)
Never pass hardcoded literal values directly as function arguments or inline in logic. Always use named constants (`UPPER_SNAKE_CASE`), variables, or function parameters with descriptive names.

### HTTP Status Codes — Use `http-status-codes` Package
All HTTP status codes MUST use the `http-status-codes` npm package (already included in dependencies). Import `StatusCodes` and use named constants:
```typescript
import { StatusCodes } from "http-status-codes";
res.status(StatusCodes.OK).json(data);           // not res.status(200)
res.status(StatusCodes.BAD_REQUEST).json(error);  // not res.status(400)
res.status(StatusCodes.NOT_FOUND).json(error);    // not res.status(404)
```

---

## Execution Steps

When creating a project, do the following in order:

1. Create the project directory at the user's desired location.
2. Create ALL infrastructure files first (package.json, tsconfig.json, nodemon.json, .gitignore, global.d.ts).
3. Create all `src/` subdirectories.
4. Create config files (settings.ts, settings-template.ts).
5. Create libs (database.ts if needed, loggerConfig, logger).
6. Create middlewares (errorHandler, LoggerMiddleware, jwt, index).
7. Create all barrel index files (models, services, data-access, controllers, routers, helpers, constants, types, utils).
8. For each entity requested, create: Model, Repository (abstract + concrete), Service (abstract + concrete), Controller, Router.
9. Wire up all barrel exports and RootRouter.
10. If RabbitMQ: create rabbitmq libs, rpcs directories, events, constants/Events.ts.
11. If cron: create crons directory and index.
12. If PostgreSQL: try to create the database via `psql` or PostgreSQL MCP. On failure, inform user.
13. Run `yarn install`.
14. Test with `yarn dev` (start and verify it boots without errors, then stop).
15. Initialize git: `git init && git add . && git commit -m "Initial project scaffold"`.

**Note:** Step 15 is the ONLY exception where raw `git init` + `git commit` is allowed (brand new repo, no remote yet). For all subsequent commits and pushes, ALWAYS use the `/commit` skill.

## Template Variable Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `{{PROJECT_NAME}}` | kebab-case project name | `task-manager` |
| `{{PROJECT_DESCRIPTION}}` | Short description | `Task management API` |
| `{{MODULE_NAME}}` | Module identifier | `task-manager` |
| `{{PORT}}` | Server port | `3000` |
| `{{DB_NAME}}` | Database name (snake_case) | `task_manager_db` |
| `{{Entity}}` | PascalCase entity name | `Task` |
| `{{entity}}` | camelCase entity name | `task` |
| `{{Entities}}` | PascalCase plural | `Tasks` |
| `{{entities}}` | camelCase/lowercase plural | `tasks` |
| `{{TableName}}` | Database table name (PascalCase plural) | `Tasks` |
| `{{module}}` | URL module prefix | `task-manager` |
