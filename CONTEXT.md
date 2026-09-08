# Puppycat Skills

A collection of agent skills forked from mattpocock/skills with customizations.

## Language

### Skills

**teaching**:
A stateful teaching skill that organizes content into subject subdirectories with HTML lessons. Fork of upstream `teach` with added structure.
_Avoid_: teach, teach-gen, custom-teach, learning

### Sync

**Sync target**:
A destination directory where skills are deployed. This repo maintains two: local (`\.agents/skills`, clean mirror) and global (`~/.agents/skills`, additive).
_Avoid_: deployment target, output directory

**Clean mirror**:
A sync strategy that wipes the target directory and rebuilds it to exactly match the source. Used for the local target where this repo is the sole authority.
_Avoid_: full replace, atomic replace

**Additive sync**:
A sync strategy that writes only new or updated skills to the target, preserving skills owned by other sources. Used for the global target shared across repos.
_Avoid_: merge sync, partial sync
