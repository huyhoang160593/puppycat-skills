## Tool Description

Anytype API client for objects, types, properties, tags, and collections. Handles idempotent type creation, property normalization, inline tag assignment, and global property conflict detection.

## Tool Schema

### setup

`anytypeHelper` is a kernel global — call methods directly, never import. `env` is a GLOBAL variable, never `args.env`.

**Output pattern:** All mutators return `{ ok, error, ... }`. `error` is a string on failure, `null` on success. Getters return data directly; on failure they return `[]` or `null` with `.error` attached. Always check `.error` when a result is empty.

---

### property_types

Properties are flattened onto the object: `obj.genre`, `obj.rating` — same level as `obj.name`.

| Format | Type | Example |
|---|---|---|
| text, url, email, phone | string | `obj.genre === "sci-fi"` |
| number | number | `obj.rating === 9` |
| checkbox | boolean | `obj.watched === true` |
| date | string (ISO 8601) | `obj.due_date === "2024-01-15T10:00:00Z"` |
| select | string — tag **KEY** | `obj.status === "in_progress"` |
| multi_select | string[] — tag **keys** | `obj.categories === ["action", "sci_fi"]` |
| objects | string[] — object IDs | `obj.assignee === ["bafyrei..."]` |

**select/multi_select return tag KEYS, not display names.** Writing `status: "In Progress"` creates key `"in_progress"`; reading returns `"in_progress"`.

---

### createType(opts) [mutator]

Create or ensure a type exists (idempotent). Properties are GLOBAL — if a requested key exists space-wide with a DIFFERENT format, the helper renames it as `<typeKey>_<key>` and reports in `renamed_properties`. **Always check `renamed_properties` and use those keys.**

**Input:**
- `opts.key` (string, required) — unique type key, lowercase + underscores
- `opts.name` (string) — display name; defaults to `key`
- `opts.plural_name` (string) — defaults to `name + "s"`
- `opts.layout` (string) — `"basic"` (default), `"todo"`, `"profile"`, `"note"`
- `opts.icon` (object | string) — optional, e.g. `"🎬"` or `{ emoji: "🎬" }`
- `opts.properties` (array) — `{ key: string, name?: string, format: string }`. Valid formats: `"text"`, `"number"`, `"date"`, `"checkbox"`, `"url"`, `"email"`, `"phone"`, `"select"`, `"multi_select"`, `"objects"`

**Output:** `{ ok, error, type: { id, key, name, plural_name, layout, properties }, created, added_properties?, renamed_properties?, property_warnings?, key_warnings? }`

- Already exists with all properties → `ok: true, created: false`
- Exists but missing properties → adds them, returns `added_properties`
- Format conflict → renames key, returns `renamed_properties` + `property_warnings`

```js
var result = anytypeHelper.createType({
  key: "movie", name: "Movie",
  properties: [
    { key: "genre", format: "text" },
    { key: "rating", format: "number" },
    { key: "watched", format: "checkbox" },
    { key: "status", format: "select" },
    { key: "categories", format: "multi_select" }
  ]
});
```

---

### createObject(typeKey, data?) [mutator]

Create an object. Type must exist (call `createType` first). Pass human-readable values — the helper detects formats and creates missing select/multi_select tags automatically.

**Input:**
- `typeKey` (string, required) — type **KEY** (e.g. `"movie"`), not type ID
- `data.name` (string) — display name
- `data.body` (string) — markdown body
- `data.icon` (object | string) — optional
- `data.template_id` (string) — optional
- `data.tags` (string[] | object[]) — inline tag creation on built-in `"tag"` property. String or `{ name, color?, key? }`.
- Extra top-level fields in `data` are treated as property values

**Property value formats when writing:** `string` → text/select (auto-detected), `number` → number, `boolean` → checkbox, `string[]` → multi_select tag names (created if missing).

**Output:** `{ ok, error, id?, object?: { id, name, type: {id, key, name}, ... } }` — NO `markdown` field; call `getObject(id)` for full content.

```js
var result = anytypeHelper.createObject("movie", {
  name: "Dune",
  genre: "sci-fi",              // text
  rating: 9,                    // number
  watched: true,                // checkbox
  status: "In Progress",        // select → key "in_progress"
  categories: ["Action", "Sci-Fi"],  // multi_select → keys "action", "sci_fi"
  body: "# Dune\n\nSet in a distant future."
});
```

---

### updateObject(objId, data) [mutator]

PATCH an existing object. Same property handling as `createObject`. Only fields present in `data` are changed.

**Input:** `objId` (string), `data` — same shape as `createObject` data. Optional `data.typeKey` avoids extra fetch for select/multi_select resolution.

**Output:** `{ ok, id, object?, error }` — `id` always present (echo of input).

```js
anytypeHelper.updateObject(objId, { name: "Dune: Part Two", rating: 10 });
anytypeHelper.updateObject(objId, { body: "# Updated\n\nNew content." });
anytypeHelper.updateObject(objId, { status: "Done", typeKey: "movie" });
```

---

### deleteObject(objId) [mutator]

Soft-delete (archive). Object becomes `archived: true`; `getObject(id)` returns `null` after.

**Input/Output:** `objId` (string) → `{ ok, id, error }`

---

### appendToObject(objId, text) [mutator]

Append markdown to an object. Fetches current content, concatenates, PATCHes back.

**Input:** `objId` (string), `text` (string) — separator `"\n"` is added automatically.

**Output:** `{ ok, id, object?, error }`

```js
anytypeHelper.appendToObject(noteId, "\n## New Section\nContent here.");
```

---

### applyDiff(objId, blocksOrText) [mutator]

Surgical search/replace on an object's markdown. Use instead of `updateObject({body})` when editing a section of a long page — cheaper than re-emitting the whole body.

Three match strategies (escalating): exact substring → normalized line-by-line → head/tail anchor (≥4 lines). Fails on ambiguous match (multiple occurrences).

**Input:** `objId` (string), `blocksOrText` — `[{search, replace}]` array or raw LLM text with `<<<<<<< SEARCH / ======= / >>>>>>> REPLACE` delimiters.

**Output:** `{ ok, id, blocksApplied, lengthBefore, lengthAfter }` on success; `{ ok: false, id, error }` on failure.

**When to use:**
- `updateObject({body})` → replacing whole body
- `appendToObject` → adding to end
- `applyDiff` → editing sections in place

```js
anytypeHelper.applyDiff(pageId, [
  { search: "## Old heading\nold line", replace: "## New heading\nnew line" }
]);
```

---

### parseDiffBlocks(text) [getter]

Parse aider-style search/replace blocks from raw LLM text. Returns `[{search, replace}]` (empty array if no delimiters found).

---

### getObjects(typeKey?, options?) [getter]

List objects. Auto-paginates. Returns **partial data — no `markdown`**.

**Input:** `typeKey` (string, optional), `options.limit` (default 100), `options.offset` (default 0).

**Output:** Array of partial objects with `.pagination` and optional `.error`. Without `typeKey`, returns system objects too (types, properties, collections).

```js
var objs = anytypeHelper.getObjects("movie");
objs.length; objs.pagination.total;
// { id, name, snippet, type: {id, key, name}, ...properties }
```

---

### getObject(objId) [getter]

Fetch a single object **with full markdown content**. Returns `null` on any failure (not found, bad ID, server error).

**Output:** `{ id, name, snippet, type, markdown, ...properties }` or `null`.

```js
var obj = anytypeHelper.getObject("bafyrei...");
if (obj) console.log(obj.markdown, obj.rating);
```

---

### search(...queries) [getter]

Hybrid full-text + semantic vector search. Results deduplicated by object ID. Max 10 results.

**Input:** One or more `string` or `{ query: string, types?: string[] }`. Multiple args run parallel searches, merged.

**Output:** Array with unified `.text` field (matched chunk for vector results, snippet for FTS). Use `.text` directly — no need for `getObject`.

```js
var results = anytypeHelper.search("how to manage emotions");
results[0].text;  // "Cognitive behavioral therapy helps..."

var results = anytypeHelper.search(
  { query: "recipe", types: ["page"] },
  "ingredients"
);
```

---

### getTypes() [getter]

All types in the space. `properties` is a flat `{ propKey: format }` map — IDs intentionally omitted.

**Output:** `[{ key, name, plural_name, layout, archived, icon?, properties }]`

---

### getProperties() [getter]

All properties in the space (GLOBAL — one key, one format).

**Output:** `[{ id, key, name, format }]`

---

### getProperty(propKey) [getter]

Look up a single property by key. Returns `null` if not found (not an error — use to check existence).

**Output:** `{ id, key, name, format }` or `null`.

---

### describeType(typeKey) [getter]

One-call snapshot: metadata, all properties with formats, existing select/multi_select tag values, object count, sample object. Use BEFORE `createObject` on types you didn't create this session — avoids creating duplicate tags.

**Input:** `typeKey` (string). Returns `null` if type doesn't exist.

**Output:**
```js
{
  type: { key, name, layout, plural_name, icon, archived, id },
  properties: [{ key, name, format, existing_tags?: [{key, name, color, id}], inferred_from_sample?: boolean }],
  object_count: number,
  sample: object | null
}
```

```js
var info = anytypeHelper.describeType("project");
// info.properties[0].existing_tags → [{ key: "63454ad0...", name: "To Do", color: "blue" }, ...]
anytypeHelper.createObject("project", { name: "My App", status: "In Progress" });
```

---

### getObjectsByTag(typeKey, propKey, tagKey) [getter]

Filter objects by tag key on a multi_select property. Client-side filter (calls `getObjects` then filters).

**Input:** `typeKey`, `propKey` (e.g. `"categories"`), `tagKey` (e.g. `"action"` — the key, not display name).

---

### getCollectionObjects(collectionId, viewId?) [getter]

Objects inside a collection. Auto-discovers first view if `viewId` omitted.

**Output:** Array of partial objects (no markdown). `.error` on failure.

---

### listTags(propIdOrKey) [getter]

All tag options for a property. Accepts property **key** or **ID**.

**Output:** `[{ id, key, name, color }]`

```js
var tags = anytypeHelper.listTags("tag");  // [{ key: "sci_fi", name: "Sci-Fi", color: "blue" }, ...]
```

---

### addTag(objIdOrPropKey, tagName, tagKey?, color?) [mutator]

Polymorphic:
1. **Object ID** (length > 40, looks like `bafy…`): create tag option if missing on built-in `"tag"` property, then assign to object.
2. **Property key** (any other string): add tag option to that select/multi_select property. Doesn't touch objects.

**Input:** `objIdOrPropKey`, `tagName` (display name), `tagKey` (optional, auto-generated if omitted), `color` (optional, default `"blue"`. Options: grey, yellow, orange, red, pink, purple, blue, ice, teal, lime).

**Output:** Form 1: `{ ok, object, error, tag_key }`. Form 2: `{ ok, property_key, tag_key, created?, error }`.

```js
anytypeHelper.addTag(objId, "Sci-Fi", undefined, "purple");   // tags object
anytypeHelper.addTag("status", "To Watch");                    // adds option to property
```

---

### setTags(objId, propKey, tagKeys) [mutator]

**Replace** all tags on a multi_select property (non-additive). Pass `[]` to clear.

**Input:** `objId`, `propKey`, `tagKeys` (string[] of tag **keys**, not display names).

---

### createCollection(name, emoji?) [mutator]

Create a curated list.

**Output:** `{ ok, object, id, collection, error }` — `id`, `object.id`, `collection.id` are identical.

---

### addToCollection(collectionId, objectIds) [mutator]

Add objects to a collection (one API call). `objectIds` can be a single string or array.

---

### removeFromCollection(collectionId, objectId) [mutator]

Remove a **single** object from a collection. Unlike `addToCollection`, takes one ID, not an array.

---

### listPrograms() [program]

List programs (type `anytype_program` with `__anytype_program_name` set).

**Output:** `[{ id, name, version, title }]`

---

### getProgram(name, version?) [program]

Fetch program source code. Returns `null` if not found.

**Output:** `{ id, name, version, title, source, markdown }` or `null`.

---

### runProgram(name, args?, version?) [program]

Load and execute a program. Client credentials auto-merged into args.

**Output:** `{ ok, result, error, traces, program: { name, version, id } }`

---

### saveProgram(opts) [program]

Save or update a program. Creates if new, updates source if exists. **Always use this — never `createObject("anytype_program", ...)`.**

**Input:** `opts.name` (required), `opts.source` (required, must have `export function main(args)`), `opts.version` (default `"v1"`), `opts.title`, `opts.appendMarkdown` (extra markdown after code block).

**Output:** `{ ok, object?, name, version, error }`

---

### getTools() [program]

Objects tagged with `anytype_tool` on built-in `"tag"` property.

**Output:** `[{ id, name, description, programName?, programVersion? }]`

---

### getToolDescription(toolId) [program]

Extract `## Tool Description` section from object markdown.

**Output:** `{ tool: {id, name, ...}, description: string }` or `null`.

---

### getToolSchema(toolId) [program]

Extract `## Tool Schema` section from object markdown.

**Output:** `{ tool: {id, name, ...}, schema: string }` or `null`.

---

### fetchTraceSchema(traceObjectId) [getter]

Extract `## Trace Schema` section. Returns `string | null`.

---

### fetchTrace(traceObjectId) [getter]

Extract and JSON-parse `## Trace` section. Returns parsed object or `null`.

---

### key_concepts

1. **Properties are GLOBAL** — one key, one format, space-wide. `createType` handles conflicts automatically.
2. **Partial vs Full** — `getObjects()`/`search()` return objects WITHOUT `markdown`. Call `getObject(id)` for full content.
3. **Keys normalized to snake_case** — API converts `"myProp"` → `"my_prop"`. Prefer snake_case. `createType` returns `key_warnings` when normalization occurs. Always use the key from the API response.
4. **Type deletion is soft** — archived types keep their key reserved forever. Cannot recreate with same key.
