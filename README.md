 

# puppycat-skills

A collection of custom AI agent skills — created, refined, and curated for use across workspaces.

Big thanks to [Matt Pocock](https://github.com/mattpocock/skills) for building an excellent set of skills that served as the foundation for this repo.

## Skills

| Skill                    | Description                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `teaching`             | Fork of Matt Pocock's`teach` skill. Generates self-contained HTML lessons organized by subject, focused on long-term retention via retrieval practice and spacing                              |
| `anytype-interactions` | Based on[anyproto/anytype-agents-skill](https://github.com/anyproto/anytype-agents-skill). Restructured as a proper skill with setup wizard, stdin-pipe execution, data model, and API reference. |
| `investigate`          | Fork of Matt Pocock's`research` skill. Investigate a question against primary sources and write findings to the repo. Delegates to a background agent so you keep working while it reads.      |
| `copilot-grill-with-docs` | Fork of Matt Pocock's `grill-with-docs` (Copilot-compatible: removes `disable-model-invocation: true`). Relentless interview to sharpen a plan/design while creating ADRs and glossary.                           |

## Agents

| Agent      | Description                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| `Puppycat` | Space Outlaw cursed into a small form. Roasts your human but never lets them fail. Ultra-terse, tough-love. |

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

Sync agents to Copilot, Claude Code, etc.:

```bash
node sync-agents.ts              # interactive menu
node sync-agents.ts --all        # sync to all destinations
node sync-agents.ts --to ~/.copilot/agents/  # custom path
node sync-agents.ts --all --dry-run  # preview without changing
node sync-agents.ts --all --yes      # skip confirmation
```

| Destination | Tool | Level |
| --- | --- | --- |
| `.github/agents/` | Copilot | workspace |
| `.claude/agents/` | Claude Code | workspace |
| `~/.copilot/agents/` | Copilot | global |
| `~/.claude/agents/` | Claude Code | global |
| `~/.agents/agents/` | Generic | global |

Copilot destinations auto-rename files to `*.agent.md` format.

## License

MIT — The 99's Puppycat
