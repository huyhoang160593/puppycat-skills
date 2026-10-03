# Remove copilot-grill-with-docs fork

Removed the `copilot-grill-with-docs` skill (Copilot-compatible fork of `grill-with-docs` without `disable-model-invocation`). Copilot is no longer in use, so the compatibility fork has no value and only duplicates maintenance. Copilot sync targets in `sync-agents.ts` are retained; only the skill is removed.
