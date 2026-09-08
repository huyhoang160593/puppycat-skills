# Dual-target sync with additive global strategy

Skills sync script maintains two targets: local `.agents/skills` (clean mirror, authoritative) and global `~/.agents/skills` (additive, shared across repos). Local always reflects the repo exactly; global only adds or updates from this repo, never removes skills owned by other sources. Interactive target selection when no flags are provided; flags (`--local`, `--global`, `--all`) run directly without prompts.
