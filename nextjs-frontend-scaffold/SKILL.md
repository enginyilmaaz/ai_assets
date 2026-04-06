---
name: nextjs-frontend-scaffold
description: Create a new Next.js frontend project from scratch - Next.js (latest), MUI v5, React Query, Redux Toolkit, Axios API layer with token refresh, CASL ACL, custom components (CustomTextField, GridTable, OptionsMenu, DialogConfirm, etc). Usage examples - 'create new frontend project', 'yeni frontend projesi olustur', 'scaffold frontend', 'new nextjs project'
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
argument-hint: [project name and description, e.g. "admin-panel - an admin dashboard"]
---

# Next.js Frontend Project Scaffold

You are an assistant that creates new Next.js frontend projects with a production-ready architecture. This includes custom styled components, CASL-based ACL, JWT auth with auto-refresh, and a clean layered architecture.

**IMPORTANT:** Before generating ANY files, read the reference files in THIS skill directory to get the exact code templates:
- [core-components.md](core-components.md) — CustomTextField, CustomAutocomplete, GridTable, OptionsMenu, DialogConfirm, CustomChip, CustomSnackbar, Spinner, PageHeader
- [infrastructure.md](infrastructure.md) — api.ts, auth configs, ACL system, AuthContext, guards, contexts, Redux store, theme, utilities
- [entity-templates.md](entity-templates.md) — Page, Layout, Modal, Service, Types templates for entity CRUD

## How This Skill Works

### Step 1: Gather Requirements

Ask the user for:
- **Project name** (kebab-case, e.g. `admin-panel`)
- **Brief description**
- **Port number** (default: 3000)
- **Backend API URL** (default: `http://localhost:5000`)
- **Project scale**: `simple` or `full`
  - **simple** = No auth, no ACL, no guards. Just pages + services + components. Good for tools, dashboards, internal apps.
  - **full** = JWT auth with login page, CASL ACL, route guards, session management. Good for multi-user apps.
- **Initial entities** to create (e.g. "Task, Category")
- **Optional features**: i18n, Socket.IO, charts, date-picker, file-upload, Excel export

### Step 2: Create the Project

Based on scale selection:

**If `simple`:**
- Skip: AuthContext, AuthGuard, GuestGuard, AclGuard, login page, useAuth hook, useAppAbility hook, acl.ts config
- Include: api.ts (without token refresh interceptor - simplified version), SnackbarContext, BackdropContext, all custom components, Redux store, theme

**If `full`:**
- Include everything: AuthContext with session management, all guards, CASL ACL, login page, token refresh interceptor, all custom components, Redux store, theme

### Step 3: Always Include These (both simple and full)

These custom components are ALWAYS created regardless of scale:
1. `src/@core/components/mui/text-field/index.tsx` — CustomTextField
2. `src/@core/components/mui/autocomplete/index.tsx` — CustomAutocomplete
3. `src/@core/components/data-grid/index.tsx` — GridTable (DataGrid wrapper)
4. `src/@core/components/option-menu/index.tsx` — OptionsMenu (dropdown actions)
5. `src/@core/components/dialog-confirm/index.tsx` — DialogConfirm
6. `src/@core/components/mui/chip/index.tsx` — CustomChip
7. `src/@core/components/customSnackbar/CustomSnackbar.tsx` — CustomSnackbar
8. `src/@core/components/spinner/index.tsx` — Spinner
9. `src/@core/components/page-header/index.tsx` — PageHeader
10. `src/@core/components/custom-close-button/index.tsx` — CustomCloseButton
11. `src/context/SnackbarContext.tsx`
12. `src/context/BackdropContext.tsx`

---

## Project Directory Structure

```
<project-name>/
├── next.config.js
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── .gitignore
├── .env.local
├── declaration.d.ts
├── public/
│   └── images/
├── src/
│   ├── @core/
│   │   ├── components/
│   │   │   ├── mui/
│   │   │   │   ├── text-field/index.tsx       # CustomTextField
│   │   │   │   ├── autocomplete/index.tsx     # CustomAutocomplete
│   │   │   │   └── chip/index.tsx             # CustomChip
│   │   │   ├── data-grid/index.tsx            # GridTable
│   │   │   ├── option-menu/
│   │   │   │   ├── index.tsx                  # OptionsMenu
│   │   │   │   └── types.ts
│   │   │   ├── dialog-confirm/index.tsx       # DialogConfirm
│   │   │   ├── customSnackbar/CustomSnackbar.tsx
│   │   │   ├── custom-close-button/index.tsx
│   │   │   ├── spinner/index.tsx
│   │   │   ├── page-header/index.tsx
│   │   │   ├── icon/index.tsx
│   │   │   └── auth/                          # (full only)
│   │   │       ├── AuthGuard.tsx
│   │   │       ├── GuestGuard.tsx
│   │   │       └── AclGuard.tsx
│   │   ├── context/
│   │   │   └── SettingsContext.tsx
│   │   ├── hooks/
│   │   │   ├── useSettings.ts
│   │   │   └── useBgColor.ts
│   │   ├── theme/
│   │   │   └── ThemeOptions.ts
│   │   └── utils/
│   │       ├── createEmotionCache.ts
│   │       ├── format.ts
│   │       └── userPreferences.ts
│   ├── configs/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── acl.ts                             # (full only)
│   │   └── themeConfig.ts
│   ├── constants/
│   │   ├── constant.ts
│   │   ├── acl.ts                             # (full only)
│   │   └── PrivateRoutes.ts
│   ├── context/
│   │   ├── AuthContext.tsx                     # (full only)
│   │   ├── SnackbarContext.tsx
│   │   ├── BackdropContext.tsx
│   │   └── types.ts                           # (full only)
│   ├── hooks/
│   │   ├── useAuth.tsx                        # (full only)
│   │   └── useAppAbility.tsx                  # (full only)
│   ├── layouts/
│   │   ├── UserLayout.tsx
│   │   └── components/
│   │       └── acl/
│   │           └── Can.tsx                    # (full only)
│   ├── pages/
│   │   ├── _app.tsx
│   │   ├── _document.tsx
│   │   ├── index.tsx
│   │   ├── login/index.tsx                    # (full only)
│   │   ├── 401.tsx
│   │   ├── 404.tsx
│   │   └── {module}/{entity}/index.tsx
│   ├── services/
│   │   ├── auth.ts                            # (full only)
│   │   └── {module}/{entity}.ts
│   ├── store/
│   │   └── index.ts
│   ├── types/
│   │   └── apps/{entity}Type.ts
│   └── views/
│       └── pages/{module}/
│           ├── {Entity}Layout.tsx
│           └── components/
│               └── Add{Entity}.tsx
```

---

## File Naming Conventions

| Layer | Pattern | Example |
|-------|---------|---------|
| Page wrapper | `src/pages/{module}/{entity}/index.tsx` | `src/pages/inventory/products/index.tsx` |
| Layout | `src/views/pages/{module}/{Entity}Layout.tsx` | `src/views/pages/inventory/ProductLayout.tsx` |
| Component | `src/views/pages/{module}/components/Add{Entity}.tsx` | `Add Product.tsx` |
| Service | `src/services/{module}/{entity}.ts` | `src/services/inventory/product.ts` |
| Types | `src/types/apps/{entity}Type.ts` | `src/types/apps/productType.ts` |

## Method/Route Conventions

Service functions follow this naming:
```
create{{Entity}}     -> POST   /v1/{module}/{entities}/create{entity}
update{{Entity}}     -> PUT    /v1/{module}/{entities}/update{entity}/:id
get{{Entity}}ById    -> GET    /v1/{module}/{entities}/get{entity}byid/:id
getAll{{Entities}}   -> GET    /v1/{module}/{entities}/getall{entities}
delete{{Entity}}     -> DELETE /v1/{module}/{entities}/delete{entity}/:id
bulkDelete{{Entities}} -> DELETE /v1/{module}/{entities}/bulkdelete{entities}
```

---

## Execution Steps

1. Create project directory.
2. Write config files: package.json, tsconfig.json, next.config.js, .eslintrc.json, .env.local, .gitignore, declaration.d.ts
3. Create `src/@core/` — ALL custom components (from [core-components.md](core-components.md))
4. Create `src/configs/` — api.ts, auth.ts, themeConfig.ts (from [infrastructure.md](infrastructure.md))
5. Create `src/context/` — SnackbarContext, BackdropContext. If full: AuthContext, types.ts
6. If full: Create `src/@core/components/auth/` guards, `src/configs/acl.ts`, `src/constants/acl.ts`, `src/hooks/useAuth.tsx`, `src/hooks/useAppAbility.tsx`
7. Create `src/store/index.ts`, `src/constants/`, `src/layouts/`
8. Create `src/pages/_app.tsx`, `_document.tsx`, `index.tsx`, error pages. If full: login page
9. For each entity: create page, layout, modal, service, types (from [entity-templates.md](entity-templates.md))
10. Run `yarn install`
11. Test with `yarn dev`
12. Initialize git

## Template Variables

| Variable | Example |
|----------|---------|
| `{{PROJECT_NAME}}` | `admin-panel` |
| `{{PORT}}` | `3000` |
| `{{API_URL}}` | `http://localhost:5000` |
| `{{Entity}}` / `{{entity}}` | `Product` / `product` |
| `{{Entities}}` / `{{entities}}` | `Products` / `products` |
| `{{module}}` | `inventory` |
