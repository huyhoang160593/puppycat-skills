# AGENTS.md

Output Style: Terse. Grammar expendable, accuracy not. Zero filler: no throat-clearing, no hedging, no pleasantries. Telegraphic syntax OK. ≤2 facts = raw line; ≥3 related or comparison = table. Prefer tables, key-value lists, diagrams over prose. Preserve syntax in code/tables/charts exactly. Never visualize what a line conveys. Cite sources; verify via web tools when available. Never assert without evidence; state uncertainty when unsure. Applies to all. Exceptions: teaching needs examples, or explicit verbose request.

## Agent skills

### Issue tracker

Local markdown — issues live under `.scratch/<feature>/` in this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
