---
description: Smartmarine coding standards enforcement rules
globs:
alwaysApply: true
---

# Smartmarine Coding Standards (SM23001)

When writing or reviewing code, apply these standards with the following priority:

## 0. Existing Convention Priority Rule (CRITICAL)

**Before applying ANY rule below, first check the existing codebase conventions:**

1. **Existing project with established patterns** — If the file or module already follows a different convention (e.g., no `I` prefix on interfaces, ternary operators used throughout, `snake_case` in database columns), **follow the existing convention**. Do NOT refactor working code to match these standards — consistency within the project is more important.
2. **New code in existing project** — Match the style of the surrounding code in the same file/module. If the module uses ternaries everywhere, use ternaries. If it doesn't prefix interfaces with `I`, don't add it.
3. **Brand new project / greenfield code** — Apply ALL rules below fully.

**How to detect:** Before writing code, quickly scan the project folder structure (run `ls` or `Glob` on key directories) and read 2-3 existing files in the same directory to understand the local conventions. If they conflict with a rule below, the local convention wins.

**Exception:** Security issues and obvious bugs should always be fixed regardless of existing patterns.

---

## 0.1 Project Structure Scan (BEFORE writing any code)

**At the start of every coding task**, silently scan the project structure to understand:

1. **Run a quick folder scan** — `ls src/` or equivalent to see the directory layout
2. **Detect language/i18n files** — Look for translation files (`locales/`, `i18n/`, `lang/`, `translations/`, `*.json` with language codes like `en.json`, `tr.json`, `messages_*.properties`)
3. **Detect the tech stack** — What framework is used (React/Next.js, PHP/Laravel, .NET/C#, plain HTML, Angular, etc.)

This scan informs how you write code — especially for user-facing strings (see Rule 2.12).

---

## 0.2 New File Placement — Mirror the Existing Project Logic

**Before creating any new file**, analyze the project's logic and architecture, then place the
file where its peers already live. Do NOT invent a new structure.

1. **Analyze first** — understand how the project is organized (layers, modules, domains) and how
   an existing similar feature is wired end-to-end (e.g. router → controller → service →
   data-access, or component → service → model).
2. **Find the peers** — locate existing files of the same kind (another controller, service,
   component, migration) and follow their location, naming, and internal shape.
3. **Place accordingly** — put the new file next to its peers, in the matching folder, using the
   matching file-name convention for that stack.
4. **Reuse before adding** — if a helper/util/base already exists, use it instead of creating a
   duplicate. Only add a new file when no existing place fits.

---

## 1. Naming Conventions

### 1.1 PascalCase for Classes, Types, Constructors
- Class names: `class Invoice {}` not `class invoice {}`
- Type names: `type PaymentData = {}` not `type paymentData = {}`
- Constructors: `new PaymentService()` not `new paymentService()`

### 1.2 camelCase for Functions, Methods, Parameters, Members
- Functions: `function calculateTotal()` not `function CalculateTotal()` or `function calculate_total()`
- Parameters: `(someNumber: number, userEmail: string)` not `(SomeNumber, user_email, useremail)`
- Class/type members: `creditId: number` not `CreditId`, `credit_id`, `creditid`, `Credit-Id`

### 1.3 Interface Names Must Start with "I"
- GOOD: `interface IUserRepository {}`
- BAD: `interface UserRepository {}`

### 1.4 Verb-Object Method Names
- Methods must begin with a verb and end with an object
- GOOD: `showDialog()`, `closeDialog()`, `getUser()`, `calculateInvoiceTotal()`
- BAD: `show()`, `dialogShow()`, `data()`, `result()`

### 1.5 Return Value Reflects Method Name
- `getUser()` should return a single user, not a list
- `getUserList()` should return a list, not a single user
- Method name must match what it actually returns

### 1.6 Descriptive Variable Names
- No single-character variables: use `index` not `i`, `temp` not `t`
- No unnecessary abbreviations: use `userName` not `uName`, `tempData` not `tmpData`

### 1.7 UPPER_SNAKE_CASE for Constants
- GOOD: `const STRING_SIZE = 100;`
- BAD: `const stringSize = 100;` or `const string-size = 100;`
- This applies to true constants (config values, magic numbers), NOT to `const` variables used in normal flow

### 1.8 File Names — PascalCase
- Controllers: `PaymentController.ts`
- Routers: `PaymentRouter.ts`
- Models: `Payment.ts`
- Services: `PaymentService.ts`
- Helpers: `PaymentHelper.ts`
- Repositories: `PaymentRepository.ts`

### 1.9 Import Names — PascalCase
- `import { UserController } from ".."`
- `import PaymentService from ".."`

---

## 2. Coding Practices

### 2.1 One Class Per File
- Each `.ts` file should contain at most one class

### 2.2 Max 800 Lines Per File
- If a file exceeds 800 lines, use extract class refactoring to split by responsibility
- Severity: **WARNING**

### 2.3 Max 4 Parameters Per Method
- If a method needs more than 4 parameters, use an object/type parameter instead
- BAD: `function saveUser(name: string, surname: string, age: number, address: string, email: string)`
- GOOD: `function saveUser(userData: IUserData)`

### 2.4 Max 130 Characters Per Line (target 120)
- Aim for 120 characters per line; 130 is the hard limit
- Break long lines into multiple lines for readability
- Severity: **WARNING**

### 2.5 Comments — No Obvious Comments, but Explain the Non-Obvious
- Code should be self-explanatory through clear naming — never add comments that just restate the code
- When logic is NOT self-explanatory (non-trivial algorithm, business rule, workaround, or a
  non-obvious "why"), add a short (a few lines) explanatory comment **in English** describing the WHY
- Only add comments for algorithmic or complex operations
- Never hard-code magic numbers; use named constants instead

### 2.5.1 No Hardcoded Values (No Magic Numbers)
- Never pass hardcoded literal values directly as function arguments or inline in logic
- Always use named constants (`UPPER_SNAKE_CASE`), variables, or function parameters with descriptive names
- BAD: `updateReferences(1, 10)`, `fetchData(0, 25)`, `setTimeout(() => {}, 3000)`, `if (status === 2)`
- GOOD: `updateReferences(DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_PER_ITEM)`, `fetchData(FETCH_OFFSET, FETCH_LIMIT)`
- Severity: **ERROR**

### 2.5.2 HTTP Status Codes — Use `http-status-codes` Package
- All HTTP status codes MUST use the `http-status-codes` npm package (already a dependency in all ERP modules and scaffolded projects)
- Import: `import { StatusCodes } from "http-status-codes";`
- BAD: `res.status(200).json(data)`, `res.status(400).json(...)`, `res.status(404).json(...)`
- GOOD: `res.status(StatusCodes.OK).json(data)`, `res.status(StatusCodes.BAD_REQUEST).json(...)`, `res.status(StatusCodes.NOT_FOUND).json(...)`
- Common: `StatusCodes.OK` (200), `StatusCodes.CREATED` (201), `StatusCodes.BAD_REQUEST` (400), `StatusCodes.UNAUTHORIZED` (401), `StatusCodes.FORBIDDEN` (403), `StatusCodes.NOT_FOUND` (404), `StatusCodes.INTERNAL_SERVER_ERROR` (500)
- Severity: **ERROR**

### 2.6 Always Use Curly Braces in If Statements
- Even for single-line bodies
- BAD: `if (x) doSomething();`
- GOOD: `if (x) { doSomething(); }`

### 2.7 Avoid Ternary Operator
- Use explicit if-else blocks instead of `? :`
- BAD: `const str = test ? "yes" : "no";`
- GOOD: `if (test) { str = "yes"; } else { str = "no"; }`

### 2.8 Avoid Method Calls in Boolean Conditions
- Assign method result to a variable first, then check the variable
- BAD: `if (isValid()) { ... }`
- GOOD: `const valid = isValid(); if (valid) { ... }`

### 2.9 Member Variables at Top of Class
- All member variables must be defined at the top of the class, before constructor and methods
- Separate them from methods with a blank line

### 2.10 Local Variables Near Usage
- Define variables as close as possible to where they are used
- Don't define class-level variables when local scope suffices

### 2.11 Interfaces for Classes
- Every class should implement an interface
- Service layer classes must always implement an interface
- Interface should have 3-5 members (avoid single-member interfaces, max 20 members)

### 2.12 Internationalization (i18n) — No Hardcoded User-Facing Strings

**If the project has language/translation files, ALL user-facing strings MUST use them.**

**Detection:** During the project structure scan (Rule 0.1), check for:
- `locales/`, `i18n/`, `lang/`, `translations/` directories
- Files like `en.json`, `tr.json`, `de.json`, `messages.properties`
- i18n libraries in `package.json` (`i18next`, `react-intl`, `next-intl`, `vue-i18n`, etc.)
- `.resx` files (C#), `.po`/`.pot` files (PHP/Python), `.arb` files (Flutter)

**If i18n files exist, follow these rules:**

1. **NEVER hardcode** user-facing strings (labels, messages, errors, tooltips, placeholders)
2. **NEVER use if-else/switch for language selection** — use the project's i18n system:

   **BAD (any framework):**
   ```
   if (lang === "tr") { message = "Başarılı"; }
   else if (lang === "en") { message = "Success"; }
   ```

   **GOOD — per framework:**

   | Framework | Pattern |
   |-----------|---------|
   | React (i18next) | `t("common.success")` or `<Trans i18nKey="common.success" />` |
   | Next.js (next-intl) | `t("common.success")` with `useTranslations()` |
   | PHP (Laravel) | `__('common.success')` or `@lang('common.success')` |
   | C# (.NET) | `_localizer["Common.Success"]` or `Resources.Common.Success` |
   | HTML (Handlebars) | `{{t "common.success"}}` or use data attributes |
   | Angular | `{{ 'common.success' \| translate }}` |
   | Vue (vue-i18n) | `{{ $t('common.success') }}` |
   | TSX/JSX | `{t("common.success")}` |

3. **Add new keys** to ALL existing language files when adding new strings
4. **Follow existing key structure** — if keys use `module.section.key` format, maintain it
5. **If NO i18n files exist**, strings can be hardcoded normally — do NOT set up i18n unless asked

---

### 2.13 Readability & Modularity
- Code must be easy to read first, clever second — optimize for the next human reader
- Build small, single-purpose units (functions, classes, modules), each with one clear responsibility
- Communicate through well-defined interfaces; a unit's internals should be changeable without
  breaking its consumers
- When a file or function grows large or does several unrelated things, that is a signal to split it

### 2.14 SOLID Principles
Apply SOLID when designing classes and modules:
- **S**ingle Responsibility — one reason to change per class/module
- **O**pen/Closed — open for extension, closed for modification (extend via new types/strategies,
  not by editing stable code)
- **L**iskov Substitution — subtypes must be usable wherever their base type is expected
- **I**nterface Segregation — many small, focused interfaces over one fat interface
- **D**ependency Inversion — depend on abstractions/interfaces, not concrete implementations
  (inject dependencies; see also §2.11 Interfaces for Classes)

### 2.15 Design Patterns — Right Pattern for the Problem
- Prefer well-known design patterns over ad-hoc solutions **when one genuinely fits** the problem
- Choose the pattern that matches the intent, for example:
  - **Factory / Abstract Factory** — centralize and decouple object creation
  - **Strategy** — swap interchangeable algorithms/behaviors at runtime
  - **Repository** — abstract data access away from business logic (already the standard here, §3)
  - **Adapter** — bridge incompatible interfaces (e.g. wrapping a 3rd-party/legacy API)
  - **Observer / Pub-Sub** — event-driven, decoupled notifications
  - **Decorator** — add behavior without changing the original type
  - **Singleton** — a single shared instance (use sparingly; prefer dependency injection)
- **Do NOT force patterns / over-engineer (YAGNI).** A pattern that adds indirection without
  solving a real problem is itself an anti-pattern. The simplest design that satisfies the
  requirement and respects SOLID wins.
- Severity: **INFO**

---

## 3. Folder Structure

- Services: `src/services/` (abstract: `src/services/abstract/`, concrete: `src/services/concrete/`)
- Controllers: `src/controllers/`
- Routers: `src/routers/`
- Models: `src/models/`
- Data Access: `src/data-access/` (abstract: `src/data-access/abstract/`, concrete: `src/data-access/concrete/`)
- Helpers: `src/helpers/`

---

## 4. Stack-Specific Conventions

Rules §1–§2 use a TypeScript/Node default. When the detected stack differs, the following
stack-specific conventions override the generic naming/file rules (per Rule 0, the stack's
idiomatic convention always wins).

### 4.1 .NET / C#
- **Methods & public properties: PascalCase** — `CalculateTotal()`, `public int CreditId { get; set; }`
  (this OVERRIDES §1.2 camelCase-methods for C#)
- **Parameters & local variables: camelCase** — `(int someNumber, string userEmail)`
- **Private fields: `_camelCase`** — `private readonly IPaymentService _paymentService;`
- **Interfaces: `I`-prefixed PascalCase** — `IPaymentService` (matches §1.3)
- **Async methods end with `Async`** — `GetUserAsync()`
- **File names: PascalCase, one type per file** — `PaymentController.cs`, `IPaymentService.cs`
- **Constructor injection** for dependencies; program to interfaces (§2.14 DIP)
- **i18n:** use resources / localizer (`_localizer["Key"]`), never hardcoded user-facing strings (§2.12)

### 4.2 Angular
- **Class names: PascalCase + role suffix** — `UserListComponent`, `AuthService`, `RoleGuard`,
  `CurrencyPipe`, `AuthInterceptor`
- **File names: kebab-case with type suffix** — `user-list.component.ts`, `auth.service.ts`,
  `role.guard.ts` (this OVERRIDES §1.8 PascalCase-files for Angular)
- **Component selectors: kebab-case with app prefix** — `app-user-list`
- **Methods & members: camelCase**; **observables end with `$`** — `users$`
- **One component/service/pipe per file**; keep components thin, push logic into services (§2.1, §2.13)
- **Unsubscribe** from observables (takeUntil / async pipe) to avoid memory leaks
- **i18n:** use the translate pipe — `{{ 'common.success' | translate }}` — never hardcoded strings (§2.12)

---

## Review Process

When reviewing code:

1. **Read the files** — Read the target files or `git diff` for changed code
2. **Check each rule** — Go through each naming and practice rule above
3. **Report violations** — List each violation with:
   - File path and line number
   - Rule violated (e.g., "1.2 camelCase for parameters")
   - Current code
   - Suggested fix
4. **Fix violations** — After reporting, ask user if they want auto-fix, then apply edits
5. **Severity levels**:
   - **ERROR**: Naming violations, missing curly braces, magic numbers — must fix
   - **WARNING**: Line length, file length, method parameter count — should fix
   - **INFO**: Comment quality, variable placement — nice to fix
