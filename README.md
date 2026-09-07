 

# puppycat-skills

A collection of custom AI agent skills — created, refined, and curated for use across workspaces.

Big thanks to [Matt Pocock](https://github.com/mattpocock/skills) for building an excellent set of skills that served as the foundation for this repo.

## Skills

| Skill                    | Description                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `teaching`             | Fork of Matt Pocock's`teach` skill. Generates self-contained HTML lessons organized by subject, focused on long-term retention via retrieval practice and spacing                              |
| `anytype-interactions` | Based on[anyproto/anytype-agents-skill](https://github.com/anyproto/anytype-agents-skill). Restructured as a proper skill with setup wizard, stdin-pipe execution, data model, and API reference. |
| `investigate`          | Fork of Matt Pocock's`research` skill. Investigate a question against primary sources and write findings to the repo. Delegates to a background agent so you keep working while it reads.      |

## Agents

| Agent      | Description                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| `Puppycat` | Space Outlaw cursed into a small form. Roasts your human but never lets them fail. Ultra-terse, tough-love. |

## Setup

Add skills from this repo to any workspace:

```bash
npx skills@latest add huyhoang160593/puppycat-skills
```

## Develop

To test skills locally, sync them into your current workspace's `.agents/skills/`:

```bash
npm run sync:skills          # sync
npm run sync:skills:dry      # preview (dry run)
```

This copies everything from `skills/` → `.agents/skills/`, replacing the target. Useful for iterating on a skill before publishing.

To sync agents to various AI tool destinations (Copilot, Claude Code, etc.):

```bash
npm run sync:agents          # interactive menu
npm run sync:agents:dry      # preview (dry run)
npm run sync:agents:all      # sync to all configured destinations
```

Agents are synced from `agents/` to your chosen destination. Supports workspace-level (`.github/agents/`, `.claude/agents/`) and global (`~/.copilot/agents/`, `~/.claude/agents/`, `~/.agents/agents/`) paths. Copilot destinations auto-rename files to `*.agent.md` format.

## License

MIT — The 99's Puppycat
