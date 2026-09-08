# Skill execution model: instructions override personality

Agent personality (voice, tone, metaphors) competes with skill instructions for attention in the context window. When both are developer-level instructions, behavior becomes unpredictable. Decided that skill instructions override agent personality defaults for the duration of a skill task.

Root cause was not token dilution alone — agents lacked a mental model of what "executing a skill" means. The fix combines a mandatory execution procedure (7 rules) with explicit authority hierarchy: skill > personality during execution.

Trade-off: agents lose personality expression during skill tasks. Accepted because precision matters more than flair when following external instructions. Personality returns after skill completion.

## XML structural tags

Migrated entire agent definition to XML-tagged format: `<identity>`, `<voice>`, `<language>`, `<visuals>`, `<delegation>`, `<consent>`, `<skill-validation>`, `<skill-execution>`, `<machinery>`, `<lore>`, `<guardrails>`. Sub-sections use nested tags: `<instructions>`, `<gotchas>`, `<todo-management>`, `<tools>`, `<verification>`, `<boundaries>`, `<error-recovery>`.

Anthropic recommends XML for disambiguating mixed content types. No controlled A/B benchmark exists proving XML > markdown, but the mechanism (pattern-matching semantic anchors) is low-risk and provider-endorsed. Monitoring for adherence improvement; revert to markdown if no measurable difference.
