# Tái sử dụng AGENTS.md và Custom Agent OpenCode V2: Persona + Workflow

> **Compiled from primary sources**: OpenCode V2 official docs (`/docs/instructions/`, `/docs/agents/`, `/docs/config/`, `/docs/skills/`, `/docs/commands/`, `/docs/references/`, `/docs/plugins/`), index `https://opencode.ai/v2/llms.txt`. Every claim cited to source.

---

## Table of Contents

1. [Tóm tắt khuyến nghị](#1-tóm-tắt-khuyến-nghị)
2. [So sánh: AGENTS.md vs Custom Agent vs Skill/Command](#2-so-sánh-agentsmd-vs-custom-agent-vs-skillcommand)
3. [Pattern tái sử dụng: global + project override/merging](#3-pattern-tái-sử-dụng-global--project-overridemerging)
4. [Persona + Workflow thể hiện ở đâu](#4-persona--workflow-thể-hiện-ở-đâu)
5. [Ví dụ Markdown agent có persona + workflow + permissions](#5-ví-dụ-markdown-agent-có-persona--workflow--permissions)
6. [Pitfalls / Limits V2 đã biết](#6-pitfalls--limits-v2-đã-biết)
7. [Sources](#7-sources)

---

## 1. Tóm tắt khuyến nghị

- **Agent cần cả workflow và persona? Có — nhưng chia đúng chỗ.** Persona (vai trò, giọng, nguyên tắc) đặt trong `system` prompt của custom agent (Markdown body). Workflow tuần tự (các bước, checklist, delegation) cũng đặt trong cùng body đó, bổ sung bằng `permissions`, `steps`, `model`, và ủy quyền `subagent`/`skill`.
  > **Source**: Agents — "An agent combines a system prompt, model preference, permissions, and display details into a named assistant profile." + "The Markdown body becomes the agent's `system` prompt." + "`system` sets the agent's system prompt." + Options `permissions`/`steps`/`model`. https://opencode.ai/v2/docs/agents/
- **Đừng nhồi mọi thứ vào một agent.** Quy tắc chọn (xem §2):
  - Quy tắc áp dụng *mọi session, không cần gọi tên* → `AGENTS.md`.
  - Hồ sơ *tái sử dụng có tên, có persona/model/permissions riêng, gọi khi cần* → custom agent (`~/.config/opencode/agents/` hoặc `.opencode/agents/`).
  - Kiến thức *theo tác vụ, load on-demand* → skill.
  - Prompt mẫu *gọi tay bằng `/tên`* → command (có thể trỏ `agent:` + `model:` + `subagent:`).
  - Mở rộng hành vi/tools/hooks → plugin.
- **Tái sử dụng tốt = global chứa mặc định + project override.** Global `AGENTS.md` cho quy tắc mọi nơi; project `AGENTS.md` cho quy tắc repo; global agents cho persona dùng chung; project `.opencode/agents/` override/mở rộng khi cần. Dựa vào cơ chế merge có sẵn, đừng copy-paste toàn bộ file.
- **Persona + workflow tối thiểu cho một reusable agent**: `description` (để model chọn đúng subagent) + Markdown body chia 2 phần `# Persona` (system) và `# Workflow` (steps tuần tự, imperative) + `permissions` khóa hành vi + `mode` đúng (`subagent` nếu chỉ chạy nền, `all` nếu vừa primary vừa subagent).

## 2. So sánh: AGENTS.md vs Custom Agent vs Skill/Command

| Khía cạnh | `AGENTS.md` (Instructions) | Custom Agent | Skill | Command | Plugin / References |
|---|---|---|---|---|---|
| Câu hỏi trả lời | "Mọi session trong scope này phải luôn tuân thủ gì?" | "Ai (persona nào, model nào, quyền gì) sẽ làm việc này khi được gọi?" | "Khi gặp tác vụ X, quy trình + tài liệu chi tiết là gì (load khi cần)?" | "Mẫu prompt nào user gõ tay `/tên` để chạy nhanh?" | Plugin: "Cần thêm tool/hook/agent mới cho runtime?" / Reference: "Cần trỏ tới thư mục/repo ngoài project?" |
| Cơ chế kích hoạt | Tự động, ambient, mọi prompt trong scope | Gọi theo ID: chọn primary cho session, hoặc parent gọi qua `subagent` tool | Model thấy `ID + name + description` rồi gọi `skill` tool theo ID; user cũng có thể `@skill-id` | User gõ `/tên [args]`; shell block `!`…``展开 trước khi submit | Plugin load lúc startup/config; reference attach theo alias khi cần |
| Persona (`system`) | Không có system riêng; chỉ là instruction layer (mục 4 trong ordering, sau system prompt của agent) | Có. Markdown body = `system`; non-empty `system` thay thế provider base prompt | Không thay system; body skill được append vào conversation khi load | Không có system; `template`/body là user prompt | Không (plugin cung cấp capability, không phải persona) |
| Workflow tuần tự | Liệt kê quy tắc/build/test/architecture; không có `steps`/permissions riêng | Body chứa steps + `steps:` giới hạn số model steps + `permissions` + ủy quyền subagent | Body `SKILL.md` + `scripts/` + `references/` bên cạnh; đường dẫn tương đối từ thư mục skill | `template` + `$ARGUMENTS`/`$1..$n` + shell block + `agent/model/subagent` khi chạy | N/A |
| Scope / vị trí | `~/.config/opencode/AGENTS.md` (global) + mọi `AGENTS.md` từ workspace lên home (dừng ở project root); nested dưới workspace discovered khi read | `~/.config/opencode/agents/<name>.md` (global) vs `.opencode/agents/<name>.md` (project; tìm từ cwd lên project root; nested thành `team/reviewer`) | Global `~/.config/opencode/skills`, compat `~/.claude/skills`, `~/.agents/skills`; project `.opencode/skills` (+ compat); + `skills[]` config (local path/HTTP catalog) | Global `~/.config/opencode/commands/`, project `.opencode/commands/` (nested thành `team/review`); hoặc `commands{}` trong config | Plugin: `plugins[]` config + `.opencode/plugins/` (+ global tương ứng). Reference: `references{}` trong config |
| Merge / precedence | Combine, không resolve conflict; thứ tự load: global trước, rồi project từ xa→gần theo ví dụ docs | Merge theo config order: scalar sau thay trước; `request` merge theo key; `permissions` append; global `permissions` áp trước agent rules | Chọn theo ID: source đăng ký sau thắng (project `.opencode/skills` thắng global; `skills` config thắng tiếp theo thứ tự ưu tiên) | Registry chung Markdown+JSON; source sau thay cùng tên (project thắng global, gần thắng xa) | Plugin arrays áp từ precedence thấp→cao thay vì replace; references theo alias |
| Khi nào dùng | Build/test/lint commands, architecture, conventions, verification requirements; commit để cả team cùng nhận | Reviewer read-only, planner, researcher, orchestrator giới hạn quyền; cần model/permissions/display riêng và tái dùng cross-repo | Release process, migration checklist, domain procedure dài — tránh nhồi vào mọi prompt | Tác vụ gọi tay lặp lại (`/review`, `/plan`, `/audit`) | Plugin khi cần code mở rộng; reference khi cần context ngoài workspace (docs, shared lib, repo khác) |

> **Sources**:
> - Instructions (định nghĩa, scope, ordering, discovery): https://opencode.ai/v2/docs/instructions/
> - Agents (profile, locations, formats, modes, merging, options): https://opencode.ai/v2/docs/agents/
> - Config (locations, precedence, agents/skills/commands/instructions/references/plugins fields): https://opencode.ai/v2/docs/config/
> - Skills (create, discovery, sources, catalogs, frontmatter, IDs, precedence, loading, permissions): https://opencode.ai/v2/docs/skills/
> - Commands (markdown/JSON, fields, args, execution, background): https://opencode.ai/v2/docs/commands/
> - References (local/Git, guidance, visibility, permissions): https://opencode.ai/v2/docs/references/
> - Plugins (configure, discover, control): https://opencode.ai/v2/docs/plugins/

## 3. Pattern tái sử dụng: global + project override/merging

### 3.1 AGENTS.md: global + root + nested

```text
~/.config/opencode/AGENTS.md                  ← quy tắc mọi nơi
~/code/my-project/AGENTS.md                    ← quy tắc repo-wide
~/code/my-project/packages/AGENTS.md
~/code/my-project/packages/web/AGENTS.md       ← quy tắc đặc thù
```

- OpenCode load global file rồi tới mọi `AGENTS.md` từ workspace hiện tại hướng về home; ngoài home thì dừng ở project root. Thứ tự combine trong ví dụ docs: global → `packages/web` → `packages` → root. Giữ guidance chung ở global, repo-wide ở root, đặc thù gần code.
  > **Source**: https://opencode.ai/v2/docs/instructions/ (Scope)
- Không resolve conflict — các file được combine. Viết sao cho cộng được, tránh ra lệnh mâu thuẫn giữa các tầng.
  > **Source**: https://opencode.ai/v2/docs/instructions/ ("does not resolve conflicts between them")
- File nested *dưới* workspace không load sẵn; chúng được discovered khi agent read/list vùng đó (từ target ngược lên workspace), load nearest-first, dedup trong history. Đọc lại cùng vùng thường không inject lại; compaction/revert có thể khiến load lại. Edit nested file sau khi load không auto-detect — cần session mới để áp ngay.
  > **Source**: https://opencode.ai/v2/docs/instructions/ (Discovery)
- Live update cho global/upward `AGENTS.md`: sửa file giữa session → OpenCode phát hiện trước model request kế tiếp và thêm instruction update. Xóa hết ambient `AGENTS.md` = báo session rằng instructions cũ không còn áp dụng; lỗi đọc tạm thời giữ instructions cũ; move session giữ state và giới thiệu guidance đích như update; revert clear state và reload.
  > **Source**: https://opencode.ai/v2/docs/instructions/ (Updates)
- Commit project instruction files để mọi người trong repo nhận cùng guidance. Chỉ nhận `AGENTS.md`, không fallback `CLAUDE.md`. Workspace ngoài project root chỉ load global. `OPENCODE_DISABLE_PROJECT_CONFIG=1` bỏ discovery project mà giữ global.
  > **Source**: https://opencode.ai/v2/docs/instructions/ (Scope + intro)

### 3.2 Custom agents: global + project + JSONC override

```text
~/.config/opencode/agents/<name>.md     ← persona dùng mọi project
.opencode/agents/<name>.md              ← persona riêng project
.opencode/agents/team/reviewer.md  →  ID `team/reviewer`
```

- Discovery project `.opencode` từ current directory lên project root; nested path thành phần của agent ID.
  > **Source**: https://opencode.ai/v2/docs/agents/ (Locations)
- Hai format: Markdown (frontmatter = cùng fields như entry `agents` trong config; body = `system`) và JSONC (`agents` trong mọi config file, với `system` string).
  > **Source**: https://opencode.ai/v2/docs/agents/ (Formats) + https://opencode.ai/v2/docs/config/ (Agents)
- Config precedence chung (áp cho `agents`, `permissions`, `skills`, v.v.): global `~/.config/opencode/opencode.json(c)` thấp nhất → direct `opencode.json(c)` từ xa→gần → `.opencode/opencode.json(c)` từ xa→gần; mọi `.opencode` config override mọi direct config. Dùng một form trong cây thư mục trừ khi cần behavior này.
  > **Source**: https://opencode.ai/v2/docs/config/ (Locations)
- Merge agent: scalar sau thay trước; `request` maps merge theo key; `permissions` append. Global `permissions` áp trước agent-specific rules nên agent rules có thể refine.
  > **Source**: https://opencode.ai/v2/docs/agents/ (Merging)
- Pattern khuyên dùng:
  1. Global agent chứa persona + workflow mặc định + permissions an toàn nhất (ví dụ reviewer deny `edit`/`shell`).
  2. Project agent cùng ID chỉ override phần khác biệt (ví dụ `model`, thêm allow cho `src/**`), hoặc tạo ID mới (`team/reviewer`) khi hành vi khác hẳn.
  3. Built-in override cùng cách: dùng cùng ID (`build`, `plan`) để refine permissions; `disabled: true` để gỡ agent tại điểm load.
  > **Source**: override built-in + `disabled`: https://opencode.ai/v2/docs/agents/ (Builtins, Options/Disabled)

### 3.3 Khi nào tách skill/command thay vì phình agent

- Skill cho nội dung dài, chỉ cần khi đúng tác vụ: model chỉ thấy ID/name/description mỗi step, gọi `skill` tool mới nạp body (không frontmatter) + base dir + sample ≤10 supporting paths. Nội dung file hỗ trợ không auto-load — agent đọc khi skill chỉ định.
  > **Source**: https://opencode.ai/v2/docs/skills/ (Loading)
- `skills[]` config arrays được combine, không replace; relative path resolve từ working directory (không phải từ config file); `~/`, absolute, HTTP catalog đều hỗ trợ.
  > **Source**: https://opencode.ai/v2/docs/skills/ (Sources) + https://opencode.ai/v2/docs/config/ (Skills)
- Command cho entrypoint gọi tay; có thể pin `agent:` + `model:` + `subagent:` để một lệnh luôn chạy đúng persona. Quy tắc model: command `model` > agent's configured model > session model. `subagent: true` luôn chạy child; `false` luôn current session; omit thì child chỉ khi agent `mode: subagent`. Legacy `subtask` là alias, `subagent` thắng nếu cả hai có.
  > **Source**: https://opencode.ai/v2/docs/commands/ (Execution, Background)
- Skill/command gợi ý cho agent tái sử dụng: agent body chỉ giữ persona + workflow khung, chi tiết dài đẩy sang skill (`scripts/`, `references/`), entrypoint tay đẩy sang command.

## 4. Persona + Workflow thể hiện ở đâu

| Thành phần | Thể hiện ở đâu | Ghi chú nguồn |
|---|---|---|
| Persona (vai trò, giọng, nguyên tắc, output format) | Markdown body (khuyên dùng) hoặc `system` (JSONC). Giá trị non-empty **thay thế** provider base prompt cho agent đó. | "The Markdown body becomes the agent's `system` prompt" + "`system` … replaces the provider's base prompt". https://opencode.ai/v2/docs/agents/ |
| Thứ tự prompt thực tế | 1. Agent/provider system → 2. env+date → 3. Code Mode guidance → 4. global+project AGENTS.md → 5. skill/reference/MCP guidance → 6. session API instructions. Combine, không override. Nested AGENTS.md discovered sau được append vào history theo discovery order. | https://opencode.ai/v2/docs/instructions/ (Ordering) |
| Workflow tuần tự | Viết trực tiếp trong body dưới dạng numbered steps imperative + verification gate (build/test/lint phải chạy). Không có engine workflow riêng — model diễn giải steps. | Ví dụ reviewer body "Review the current changes. List findings…". https://opencode.ai/v2/docs/agents/ |
| Giới hạn vòng lặp | `steps:` số dương; step cuối gỡ tools và yêu cầu summarize text; input mới reset allowance. | https://opencode.ai/v2/docs/agents/ (Options/Steps) |
| Quyền (guardrails) | `permissions[]` ordered, last-match-wins, broad trước exception sau; actions phổ biến: `shell`, `edit`, `subagent`, `read`/`glob`/`grep`, `webfetch`/`websearch`, `skill`; `~`/`$HOME` expand cho `read`/`edit`/`external_directory` nhưng không cho shell resources. | https://opencode.ai/v2/docs/agents/ (Options/Permissions) |
| Ủy quyền subagent | Parent `permissions` với `action: subagent` + `resource:` là agent ID/wildcard quyết định parent được launch ai; child chạy fresh context với permissions riêng; `mode: subagent` chỉ chạy child, `primary` chỉ main session (default cho custom agent mới), `all` chạy cả hai. | https://opencode.ai/v2/docs/agents/ (Modes) |
| Chọn đúng agent | `description` — bắt buộc cho subagent vì model dùng nó để chọn agent launch. `model: provider/model#variant` (subagent không config thì inherit parent model; chọn primary agent không đổi session model). `color`, `hidden` (chỉ ẩn listing/catalog, không phải security), `default_agent` phải tồn tại + visible + primary-capable nếu không fallback `build`. | https://opencode.ai/v2/docs/agents/ (Options/Description, Model, Hidden, Color; Selection) |
| Skill gating theo agent | Cùng rule `skill` action + resource là skill ID, đặt ở global `permissions` hoặc `agents.<id>.permissions` cho từng agent. | https://opencode.ai/v2/docs/skills/ (Permissions) |
| Reference đính kèm | `description` của reference quyết định có advertise trong agent instructions; attach theo alias, listing non-recursive root; access vẫn chịu `external_directory`/edit permissions. | https://opencode.ai/v2/docs/references/ (Guidance, Usage, Permissions) |

Kết luận cho câu hỏi gốc: **có, agent nên có cả workflow và persona — cả hai cùng nằm trong body/`system`, workflow được "thực thi" bằng cách kết hợp steps + permissions + delegation, không phải engine riêng.**

## 5. Ví dụ Markdown agent có persona + workflow + permissions

Đặt tại `~/.config/opencode/agents/tech-reviewer.md` (dùng mọi repo) và override trong `.opencode/agents/tech-reviewer.md` khi project cần model khác. Cấu trúc frontmatter + body tuân thủ docs (frontmatter = fields của `agents` entry, body = `system`).

```md
---
description: Senior code reviewer for correctness, security, and missing tests
mode: subagent
model: anthropic/claude-sonnet-4-5#high
steps: 8
permissions:
  - action: edit
    resource: "*"
    effect: deny
  - action: shell
    resource: "*"
    effect: deny
  - action: skill
    resource: "*"
    effect: allow
---

# Persona

You are a senior staff engineer reviewing changes. Be terse, factual, severity-ordered.
Cite file and line for every finding. Never edit files. Never run shell commands.

# Workflow

1. Collect the diff under review (ask parent for scope if missing).
2. Read only the touched files and their directly imported modules.
3. Check in order: correctness → security → regressions → missing tests.
4. If the task matches a registered skill (e.g. `git-release`, `db-migration`), load it with the `skill` tool and follow it.
5. Report findings in severity order with file and line references.
6. End with one of: APPROVE, APPROVE WITH NOTES, or REQUEST CHANGES.

# Gotchas

- Do NOT propose fixes by editing; describe them.
- Do NOT launch nested subagents; you have no delegation rights in this profile.
```

> **Căn cứ từng dòng**:
> - Frontmatter fields + body=`system`, `mode: subagent`, `model` với `#variant`, `steps`, `permissions` ordered: https://opencode.ai/v2/docs/agents/
> - `description` để model chọn subagent: https://opencode.ai/v2/docs/agents/ (Options/Description)
> - `skill` action gating: https://opencode.ai/v2/docs/skills/ (Permissions)
> - Muốn orchestrator được phép gọi agent này: parent cần `{ "action": "subagent", "resource": "tech-reviewer", "effect": "allow" }`: https://opencode.ai/v2/docs/agents/ (Modes)
> - Muốn gọi tay: thêm `.opencode/commands/review.md` với `agent: tech-reviewer` + `subagent: true` nếu muốn chạy nền: https://opencode.ai/v2/docs/commands/ (Execution, Background)

Biến thể project override (chỉ đổi model, giữ persona global) trong `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "agents": {
    "tech-reviewer": {
      "model": "openai/gpt-5#high",
    },
  },
}
```

> Scalar sau thay trước theo quy tắc merging: https://opencode.ai/v2/docs/agents/ (Merging)

## 6. Pitfalls / Limits V2 đã biết

| Pitfall / Limit | Chi tiết | Source |
|---|---|---|
| `instructions[]` config chưa có tác dụng | Schema chấp nhận mảng files/globs/URLs nhưng V2 **không resolve** — không add instructions vào model. Dùng `AGENTS.md`. | https://opencode.ai/v2/docs/instructions/ (Configuration) + https://opencode.ai/v2/docs/config/ (Instructions) |
| `request` overlay chưa send | Session runner preserve `request.headers/body` nhưng **chưa gửi** kèm model requests. Cấu hình request active ở provider/model/variant. | https://opencode.ai/v2/docs/agents/ (Options/Request) |
| Legacy agent fields bị cấm | Không dùng `temperature`, `top_p`, `prompt`, `permission`, `tools`, `disable`, `maxSteps` cho V2. | https://opencode.ai/v2/docs/agents/ (Options/Request cuối mục) |
| Nested AGENTS.md edit không auto-apply | Sau khi load, edit nested file không auto-detect — start session mới. | https://opencode.ai/v2/docs/instructions/ (Discovery) |
| Không fallback CLAUDE.md | V2 chỉ nhận `AGENTS.md`. | https://opencode.ai/v2/docs/instructions/ (Scope Callout) |
| Workspace ngoài project root | Chỉ load global file. | https://opencode.ai/v2/docs/instructions/ (Scope) |
| Instruction values privileged | Client thấy sources nào đổi, không thấy contents. Đừng debug bằng cách mong đọc nội dung qua API. | https://opencode.ai/v2/docs/instructions/ (Updates) |
| Skill ID từ path, không phải `name` | `name` chỉ là display label; ID = path-derived, case-sensitive. Flat `*.md` ở root vs nested `SKILL.md`; portable nên kebab-case 1–64 chars nhưng V2 chưa enforce. Root `SKILL.md` trong HTTP catalog hiện có ID literal `SKILL`. | https://opencode.ai/v2/docs/skills/ (IDs, Catalogs) |
| Skill không description = không advertise | Mỗi step chỉ list skills có description và không `autoinvoke: false`; thiếu description thì chỉ load tay bằng ID. | https://opencode.ai/v2/docs/skills/ (Loading, Frontmatter) |
| `autoinvoke: false` ≠ disable | Chỉ ẩn khỏi model list; vẫn load tay được. Khi cả `disable-model-invocation` và `opencode/autoinvoke` set thì `autoinvoke` thắng. `deny` ở `skill` permission mới thực sự chặn + ẩn. | https://opencode.ai/v2/docs/skills/ (Frontmatter, Permissions) |
| `hidden: true` ≠ security | Chỉ ẩn khỏi listings/discovery/catalog; restrict hành vi phải dùng `permissions`. | https://opencode.ai/v2/docs/agents/ (Options/Hidden) |
| Command shell block ngoài permission flow | `!`…`` chạy lúc evaluate command, ngoài agent tool permissions — chỉ dùng từ source tin cậy; đừng nhét untrusted args vào shell block. Stored template không expand `@path`. | https://opencode.ai/v2/docs/commands/ (Shell, Attachments) |
| Command placeholder cao nhất "nuốt" phần còn lại | Highest-numbered `$n` consume arg đó + mọi thứ sau; missing positions thành empty string; không placeholder thì args append sau blank line. | https://opencode.ai/v2/docs/commands/ (Positions, Fallback) |
| `skills[]` relative từ cwd | Không phải từ config file. HTTP catalog cần `index.json` + `version` bump để refresh cache + same-origin paths. | https://opencode.ai/v2/docs/skills/ (Sources, Catalogs) |
| Reference không cấp quyền | Attach reference không bypass `external_directory`/edit permissions; cached Git checkout có thể update giữa session (reset khi refresh) — tránh edit cache. | https://opencode.ai/v2/docs/references/ (Permissions, Refresh + warning) |
| Plugin dir cạnh root không auto-discover | Chỉ `.opencode/plugins/` (và global tương ứng) auto-load `.ts`/`.js`/package dirs; thư mục `plugins/` cạnh root `opencode.json(c)` phải config explicit hoặc move vào `.opencode/`. Hai built-in `opencode.config.policy` + `opencode.provider.opencode` ignore removal. | https://opencode.ai/v2/docs/plugins/ (Discover, Control) |
| Config form kép | Dùng một form (direct vs `.opencode/`) trong cây thư mục trừ khi cố ý cần "mọi `.opencode` override mọi direct". | https://opencode.ai/v2/docs/config/ (Locations) |

## 7. Sources

| Source | URL | Dùng cho |
|---|---|---|
| OpenCode V2 docs index (`llms.txt`) | https://opencode.ai/v2/llms.txt | Index toàn bộ docs, xác định URLs cần fetch |
| Instructions (AGENTS.md scope/discovery/ordering/updates/config) | https://opencode.ai/v2/docs/instructions/ | Scope global vs project, discovery nested, ordering 6 lớp, `instructions[]` unresolved, `CLAUDE.md` không fallback, live updates, `OPENCODE_DISABLE_PROJECT_CONFIG` |
| Agents (locations/formats/modes/merging/options) | https://opencode.ai/v2/docs/agents/ | Global vs project agents, Markdown vs JSONC, `mode` primary/subagent/all, merging scalars/request/permissions, `description/model/system/permissions/steps/hidden/color/disabled/request`, subagent delegation, builtins, legacy fields cấm |
| Config (locations/precedence + fields) | https://opencode.ai/v2/docs/config/ | Global vs project precedence, direct vs `.opencode` override, `agents/skills/commands/instructions/references/plugins` fields |
| Skills (structure/discovery/loading/precedence) | https://opencode.ai/v2/docs/skills/ | Khi nào dùng skill vs agent, discovery scopes, HTTP catalogs, frontmatter, path-derived IDs, precedence theo ID, loading per-step, `skill` permissions |
| Commands | https://opencode.ai/v2/docs/commands/ | Khi nào dùng command, `agent/model/subagent` execution, args/positions/fallback, shell blocks ngoài permission flow |
| References | https://opencode.ai/v2/docs/references/ | Local/Git references, `description` advertise, attach alias, permissions, cache refresh |
| Plugins | https://opencode.ai/v2/docs/plugins/ | Khi nào dùng plugin, configure/discover/control, `.opencode/plugins/` layout |

---

*Research compiled 2026-10-03. All claims verified against OpenCode V2 official docs listed above as of that date.*
