 

# puppycat-skills

A collection of custom AI agent skills — created, refined, and curated for use across workspaces.

Big thanks to [Matt Pocock](https://github.com/mattpocock/skills) for building an excellent set of skills that served as the foundation for this repo.

## Skills

| Skill                       | Description                                                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `teaching`                | Fork of Matt Pocock's`teach` skill. Generates self-contained HTML lessons organized by subject, focused on long-term retention via retrieval practice and spacing                              |
| `anytype-interactions`    | Based on [anyproto/anytype-agents-skill](https://github.com/anyproto/anytype-agents-skill). Restructured as a proper skill with setup wizard, stdin-pipe execution, data model, and API reference. |
| `investigate`             | Fork of Matt Pocock's`research` skill. Investigate a question against primary sources and write findings to the repo. Delegates to a background agent so you keep working while it reads.      |

## Agents

| Agent       | Description                                                                |
| ----------- | -------------------------------------------------------------------------- |
| `AGENTS.md` | Global base rule (gated persona + additive defaults). Source of truth for personal globals. |

## Setup

Add skills from this repo to any workspace:

```bash
npx skills@latest add huyhoang160593/puppycat-skills
```

## Scripts

> **Requires:** Node.js ≥ 23.6 (native `.ts` execution support)

```bash
node -v
```

### Sync Skills

Sync skills into `.agents/skills/` (local) or `~/.agents/skills/` (global):

```bash
node sync-skills.ts              # interactive menu
node sync-skills.ts --all        # sync to both local + global
node sync-skills.ts --local      # sync local only
node sync-skills.ts --global     # sync global only
node sync-skills.ts --all --dry-run  # preview without changing
node sync-skills.ts --all --yes      # skip confirmation
```

- **Local** = clean mirror (deletes existing, copies fresh)
- **Global** = additive (adds/updates only, keeps existing)

### Sync Agents

Sync the global base rule (`agents/AGENTS.md`) to OpenCode + Ante globals:

```bash
node sync-agents.ts              # sync to both globals (asks once)
node sync-agents.ts --to <path>  # sync to a custom path
node sync-agents.ts --dry-run    # preview without changing
node sync-agents.ts --yes        # skip confirmation
node sync-agents.ts --unsync     # delete from both globals (asks once)
node sync-agents.ts --unsync --to <path>  # delete from a custom path
```

Unsync guard: only deletes targets identical to the source. Hand-modified
files are skipped with a warning (delete manually or re-sync first).

| Target                           | Tool     | Level  |
| -------------------------------- | -------- | ------ |
| `~/.config/opencode/AGENTS.md` | OpenCode | global |
| `~/.ante/AGENTS.md` (`$ANTE_HOME` aware) | Ante | global |

## License

MIT — The 99's Puppycat
