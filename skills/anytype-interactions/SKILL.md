---
name: anytype-interactions
description: Complete workflow for Anytype — setup, credentials, script execution, data model, and API reference for the Anytype Agent Runtime.
disable-model-invocation: true
---

# Anytype Interactions

## Setup Wizard

Run these steps **in order** before executing any script. Stop and report to user if any step fails.

### Step 1: Find runtime

Check for `anytype-agent-runtime` in two places (in order):

1. **PATH**: `which anytype-agent-runtime`
2. **Known location** (absolute path):
   - Linux/macOS: `$HOME/.local/bin/anytype-agent-runtime`
   - Windows: `%USERPROFILE%\.local\bin\anytype-agent-runtime.exe`

If found at either → record the path, proceed to Step 2.

### Step 2: Install runtime (only if Step 1 found nothing)

**Ask the user first**: "anytype-agent-runtime is not installed. Should I download and install it?"

If yes:

```bash
# Linux x86_64:
curl -L -o ~/.local/bin/anytype-agent-runtime \
  https://github.com/anyproto/anytype-agent-runtime/releases/latest/download/anytype-agent-runtime-linux-amd64
# macOS arm64:
curl -L -o ~/.local/bin/anytype-agent-runtime \
  https://github.com/anyproto/anytype-agent-runtime/releases/latest/download/anytype-agent-runtime-darwin-arm64
# macOS x86_64:
curl -L -o ~/.local/bin/anytype-agent-runtime \
  https://github.com/anyproto/anytype-agent-runtime/releases/latest/download/anytype-agent-runtime-darwin-amd64
chmod +x ~/.local/bin/anytype-agent-runtime
```

**Verify**: `<runtime-path> --help` must succeed.

### Step 3: Credential check

The runtime reads `.env` from the **current working directory** (project root, not skill folder). Required variables:

```
ANYTYPE_API_URL=http://127.0.0.1:31009
ANYTYPE_API_KEY=your-api-key
ANYTYPE_SPACE_ID=your-space-id
```

Check if `.env` exists with all 3 variables:

- **All present** → proceed to Step 4.
- **Missing variables** → tell user which variables are missing, stop.
- **No `.env` at all** → proceed to [Authentication Flow](#authentication-flow) below.

### Step 4: Credential confirmation (once per session)

**Before first script in a session**, inform the user:

> "Using Anytype credentials from `.env`:
> - API URL: `ANYTYPE_API_URL`
> - API Key: (redacted)
> - Space ID: `ANYTYPE_SPACE_ID`
>
> Proceed?"

After confirmation, **do not ask again** this session.

### Authentication Flow

Only when `.env` doesn't exist. **Anytype Desktop app must be running.**

**Ask user first**: "No `.env` found. I need to set up credentials. You'll need to read a 4-digit code from your Anytype Desktop app. Ready?"

Then execute via stdin pipe (see [How to Run JS](#how-to-run-js--stdin-pipe) below):

**Auth Step 1 — Request challenge:**
```js
import { requestChallenge } from "anytypeHelper@v1";
export function main() {
  return requestChallenge({ baseUrl: env.ANYTYPE_API_URL || "http://127.0.0.1:31009" });
}
```
Output includes `challenge_id`. **Ask the user to read the 4-digit code from their Anytype Desktop app.**

**Auth Step 2 — Solve challenge:**
```js
import { solveChallenge } from "anytypeHelper@v1";
export function main() {
  return solveChallenge({
    baseUrl: env.ANYTYPE_API_URL || "http://127.0.0.1:31009",
    challenge_id: "CHALLENGE_ID_FROM_STEP_1",
    code: "CODE_FROM_USER"
  });
}
```
Output includes `api_key`.

**Auth Step 3 — List spaces:**
```js
import { createClient } from "anytypeHelper@v1";
export function main() {
  var client = createClient({ apiBaseUrl: env.ANYTYPE_API_URL || "http://127.0.0.1:31009", apiKey: "API_KEY_FROM_STEP_2" });
  return client.listSpaces();
}
```
Returns `{ ok: true, spaces: [{ id, name }, ...] }`. **Ask the user which space to use** if there are multiple. Or create a new one: `client.createSpace("My Space")`.

**Auth Step 4 — Write `.env`:**
```
ANYTYPE_API_URL=http://127.0.0.1:31009
ANYTYPE_API_KEY=api-key-from-step-2
ANYTYPE_SPACE_ID=space-id-from-step-3
```

After this, all scripts use credentials automatically via `env.ANYTYPE_API_KEY` etc. Return to [Step 4](#step-4-credential-confirmation-once-per-session) to confirm credentials with the user.

## How to Run JS — Stdin Pipe

**Never write script files to the workspace.** Pipe via stdin. The `-m` flag makes a directory a module search path for `anytypeHelper.js`.

### Basic pattern

```bash
echo 'export function main() { return "hello"; }' | <runtime-path> -m <path-to-skill-folder> -
```

### With imports and arguments

```bash
printf '%s\n' \
  'import { createClient } from "anytypeHelper@v1";' \
  'export function main() {' \
  '  var client = createClient({' \
  '    apiBaseUrl: env.ANYTYPE_API_URL,' \
  '    apiKey: env.ANYTYPE_API_KEY,' \
  '    spaceId: env.ANYTYPE_SPACE_ID' \
  '  });' \
  '  return client.getObjects("page");' \
  '}' \
  | <runtime-path> -m <path-to-skill-folder> -
```

### Key syntax rules

- `-` is the stdin sentinel — goes **after** `-m <path>`, **before** any `key=value` arguments
- `key=value` arguments after `-` → `args.key` in `main(args)`
- `printf` with `\n` for multi-line; `echo` for single-line

### Runtime output

The runtime prints:
- `trace: /tmp/anytype-trace-XXXX.json` — full trace file path
- `res: <value>` — return value of `main()`
- `err: <message>` — error if script failed
- Trace summary — table of all effects (fetch, helper calls, console.log)

Every side effect is recorded in the trace file (`-t file` or auto-generated temp). Use `console.log()` — output appears in the trace.

## Writing Scripts

### Engine constraints (Sobek)

- Synchronous only — no async/await
- Named imports only: `import { createClient } from "anytypeHelper@v1"`
- Use `anytypeHelper` methods — never `fetch()` directly (helper handles auth, pagination, errors)
- `fetch()` auto-parses JSON — use `resp.body`, never `JSON.parse(resp.body)`
- `console.log()` for debugging — output appears in the trace
- `var` or `const` both work; `for` loops always work

### Pre-flight checklist

- □ Uses **anytypeHelper methods**, not raw `fetch()`
- □ `createClient` uses **camelCase** (`apiKey`, not `api_key`)
- □ `createObject` first arg is a **string type key** (`"page"`, not `{type: "page"}`)
- □ Called `getTypes()` if creating new object types

## Data Model

### Objects

- `obj.name`, `obj.id` — name and ID
- `obj.type` — object (not string): `obj.type.name`, `obj.type.key`
- Properties flattened onto object: `obj.genre`, `obj.rating` — same level as `obj.name`
- `getObjects()`/`search()` return **no markdown** — call `getObject(id)` for full content
- `select`/`multi_select` values are tag **keys** (e.g. `"in_progress"`), not display names. Writing accepts display names (helper resolves); reading returns keys.

### Types

Call `getTypes()` first. Common types (vary by space):

| Key | Name | Layout | Notes |
|-----|------|--------|-------|
| `page` | Page | basic | Always available |
| `note` | Note | note | May not exist in new spaces |
| `task` | Task | action | Create with `createType({ key: "task", layout: "action" })` |
| `bookmark` | Bookmark | bookmark | Always available |
| `collection` | Collection | collection | Always available |
| `set` | Query | set | Always available |

Missing type → `createType()`. Before writing to an unfamiliar type → `describeType("typeKey")` to inspect properties and tag values.

### Properties

Properties are **global** — one key, one format, space-wide. Keys normalized to snake_case (`"myProp"` → `"my_prop"`). Always use the key from the API response.

## anytypeHelper API Reference

Read `anytypeHelper.md` in this skill folder for the full API. Summary:

**Queries:** getObjects, getObject, search, getTypes, getProperties, getProperty, describeType, getObjectsByTag, getCollectionObjects, listTags, listSpaces, getSpaceByName

**Mutations:** createObject, updateObject, deleteObject, appendToObject, createType, addTag, setTags, createCollection, addToCollection, removeFromCollection, createSpace

**Auth (standalone):** requestChallenge, solveChallenge

## What is Anytype

Local-first knowledge platform. Everything is an **object** with a **type**. Objects have typed properties (text, number, date, select, etc.) and are managed via the Anytype Agent Runtime (`anytypeHelper` library).
