---
name: investigate
description: Investigate a question against primary sources and write findings to the repo. Use when the user asks for docs gathered, API facts checked, or a topic investigated.
disable-model-invocation: true
argument-hint: "What question should I investigate?"
---
Spin up a **background agent** to do the investigation, so you keep working while it reads.

Its job:

1. Investigate the question against **primary sources** (official docs, source code, specs, first-party APIs), not a secondary write-up of them. Follow every claim back to the source that owns it.
2. Write the findings to a single Markdown file, citing each claim's source. End with an **"Open Questions"** section: list follow-up questions worth investigating further, each with a brief reason why it matters and a pointer (link or file) to the relevant source. Skip this section only if there are genuinely no meaningful follow-ups.
3. Save it where the repo already keeps such notes; match the existing convention, and if there is none, put it somewhere sensible and say where.
