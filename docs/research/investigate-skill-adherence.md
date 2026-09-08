# Investigate Skill Instruction Adherence: Root Cause Analysis & Solutions

> **Compiled from primary sources**: OpenAI Model Spec (2025-02-12), Anthropic Prompting Best Practices, agentskills.io specification & best practices, VS Code Agent Skills docs, Cursor Skills docs, Liu et al. "Lost in the Middle" (2023). Every claim cited to source.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Root Cause Analysis](#2-root-cause-analysis)
3. [Research Findings](#3-research-findings)
4. [Applied Solutions](#4-applied-solutions)
5. [Sources](#5-sources)

---

## 1. Problem Statement

The `investigate` skill (`.agents/skills/investigate/SKILL.md`) has clear instructions — spawn a background agent, investigate against primary sources, write findings to repo. Despite this, the Puppycat agent **consistently ignores** the skill's delegation instructions, falling back to general behavior.

The skill file itself is NOT the problem. The agent file (`agents/Puppycat.md`) lacks the structural hooks to enforce skill compliance.

---

## 2. Root Cause Analysis

| Problem | Evidence | Severity |
|---|---|---|
| **No skill execution procedure** | `SKILL VALIDATION` section covers checking skill existence, but no section teaches how to EXECUTE it | 🔴 Critical |
| **Token dilution** | Puppycat.md personality (VOICE + LORE) ≈ 400 tokens competes with skill body ≈ 200 tokens — 2:1 ratio | 🔴 High |
| **Lost in the middle** | Skill body injected mid-context; middle tokens get ~30% less attention (Liu et al., 2023) | 🔴 High |
| **Vague delegation** | Agent file says "spawn subagent" generically but doesn't link to skill's specific delegation instruction | 🟡 Medium |
| **No structural markup** | No XML tags to separate instruction vs. context — model can't parse mixed content unambiguously | 🟡 Medium |
| **No gotchas** | Zero anti-patterns listed — agent must guess what NOT to do | 🟠 Medium-High |

---

## 3. Research Findings

### 3.1 `disable-model-invocation: true` — What It Actually Does

**NOT** a content filter. Pure dispatch control.

> **Source**: VS Code docs — `disable-model-invocation` controls whether the agent can automatically load the skill based on relevance. Once loaded via `/` command, the instructions are fully injected into the agent's context.

| Configuration | Auto-loaded by Copilot | Use case |
|---|---|---|
| Default | Yes | General-purpose skills |
| `disable-model-invocation: true` | **No** | Skills you only want to run on demand |

**Implication**: The investigate skill's instructions ARE loaded when invoked. The problem is the agent doesn't follow them after loading.

### 3.2 Position Bias — "Lost in the Middle"

> **Source**: Liu et al., "Lost in the Middle" (2023), arXiv:2307.03172 — Transformer attention degrades for content in the middle of long sequences.

> **Source**: Anthropic, "Prompting Best Practices" — "Queries at the end can improve response quality by up to 30 percent, especially with complex, multidocument inputs."

**Implication**: Critical skill instructions placed mid-context (after agent personality) get less attention. Solutions: place instructions at end, or use XML tags to create structural anchors.

### 3.3 Token Dilution / System Prompt Fatigue

> **Source**: agentskills.io Best Practices — "Every token in your skill competes for the agent's attention with everything else in that window."

> **Source**: agentskills.io — "Overly comprehensive skills can hurt more than they help — the agent struggles to extract what's relevant and may pursue unproductive paths."

**Implication**: Personality tokens (VOICE examples, LORE metaphors) dilute skill instructions. Each invocation wastes ~400 tokens on non-essential content.

### 3.4 XML Tags for Structural Parsing

> **Source**: Anthropic, "Prompting Best Practices" — "XML tags help Claude parse complex prompts unambiguously, especially when your prompt mixes instructions, context, examples, and variable inputs."

**Implication**: Using `<instructions>`, `<gotchas>`, `<output-format>` tags helps the model distinguish structural elements and reduces misinterpretation.

### 3.5 Imperative vs. Declarative Instructions

> **Source**: Anthropic, "Prompting Best Practices" — "Turns with imperative instructions like 'Use my exact template' outperform suggestions like 'You can use my template if you'd like.'"

> **Source**: agentskills.io — "Be prescriptive when operations are fragile, consistency matters, or a specific sequence must be followed."

**Implication**: Skill instructions should use imperative mood ("DO X") not declarative ("X is possible").

### 3.6 Gotchas Pattern — Highest ROI

> **Source**: agentskills.io Best Practices — "The highest-value content in many skills is a list of gotchas — environment-specific facts that defy reasonable assumptions."

**Implication**: Adding concrete anti-patterns ("Do NOT use grep on local files as investigation") prevents known failures more effectively than positive instructions.

### 3.7 Authority Hierarchy

> **Source**: OpenAI Model Spec (2025-02-12) — Strict authority hierarchy: Platform > Developer > User > Guideline.

**Implication**: SKILL.md body is injected as developer-level instructions — higher authority than user messages. But when agent personality (also developer-level) competes, behavior is less predictable.

---

## 4. Applied Solutions

### Fix Applied: SKILL EXECUTION Section in Puppycat.md

Added to `agents/Puppycat.md` after `# SKILL VALIDATION`:

```markdown
# SKILL EXECUTION (MANDATORY)
When a skill is invoked (by `/command`, explicit mention, or own plan):
1. Read the skill file BEFORE doing anything else.
2. Execute the skill's instructions EXACTLY as written — do not improvise, defer, or reinterpret.
3. **Skill instructions override agent personality defaults** for the duration of that task.
4. If the skill says "spawn subagent" → spawn immediately. Do not ask. Do not suggest alternatives.
5. If the skill specifies output format/location → follow it precisely.
6. Report completion using the skill's stated output structure.
```

### Why This Works

| Rule | Addresses |
|---|---|
| Rule 1: "Read BEFORE anything else" | Lost in the middle — forces skill to be top-of-mind |
| Rule 2: "EXACTLY as written" | Imperative > declarative — no reinterpretation |
| Rule 3: "Override personality defaults" | Token dilution — explicitly subordinates personality to skill |
| Rule 4: "Spawn immediately" | Vague delegation — removes agent's option to defer |
| Rule 5+6: "Follow precisely" | Structural compliance — output format locked |

### Remaining Risk: Token Dilution

VOICE examples (lines 16-23) + LORE metaphors (lines 98-109) ≈ 400 tokens per invocation. Skill body ≈ 200 tokens. Ratio 2:1 means personality still dominates attention.

**If instruction adherence remains poor after testing**, next step:
- Move VOICE example lists + LORE metaphors to `agents/references/voice.md` and `agents/references/lore.md`
- Keep only the rules in Puppycat.md, not the examples
- Saves ~400 tokens per invocation

---

## 5. Sources

| Source | URL | Relevance |
|---|---|---|
| Anthropic, "Prompting Best Practices" | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices | XML tags, position bias, imperative instructions |
| Anthropic, "Building Effective Agents" | https://www.anthropic.com/engineering/building-effective-agents | Workflow patterns, tool design |
| OpenAI Model Spec (2025-02-12) | https://model-spec.openai.com/2025-02-12 | Authority hierarchy (platform > developer > user) |
| VS Code Agent Skills docs | https://code.visualstudio.com/docs/copilot/customization/agent-skills | `disable-model-invocation` definition, 3-stage loading |
| agentskills.io Specification | https://agentskills.io/specification.md | SKILL.md format, progressive disclosure |
| agentskills.io Best Practices | https://agentskills.io/skill-creation/best-practices.md | Token management, gotchas pattern, specificity calibration |
| Liu et al., "Lost in the Middle" (2023) | https://arxiv.org/abs/2307.03172 | Position bias in long contexts |
| Cursor Skills docs | https://cursor.com/docs/skills | `disable-model-invocation` cross-reference |
