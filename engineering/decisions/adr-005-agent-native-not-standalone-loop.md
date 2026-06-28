# ADR-005: Agent-Native Discipline Layer, Not a Standalone AI Loop

Status: Accepted (amends `PRODUCT_VISION_AND_RESTRUCTURE.zh-CN.md` §2 and §4.2)

## Context

v1.2.0 shipped `prd clarify`: a standalone, system-owned LLM clarification loop that uses
its own `ANTHROPIC_API_KEY` to interrogate a vague idea into a gate-worthy PRD. The product
hypothesis behind it (PRODUCT_VISION §2/§4.2) was that the primary users are non-technical
founders / PMs who have no code agent and therefore need ai-pm-dev to be a self-contained
web "AI product coach" that does the asking itself.

In review the maintainer corrected that assumption against the real audience: **everyone who
would actually use `ai-pm-dev` is already inside a code agent** — Claude Code, Codex, or a
domestic agent such as "workbuddy" — whether they are vibecoding, doing professional
development, or work users. People who would not use a code agent would not use this tool
either.

Consequence of that correction: the host agent already performs clarification better than a
standalone loop can — it has full repository/document context, the user already lives in it,
and it does not cost a second metered API bill. A separate "blind" loop (which only sees the
JSON answers fed to it, not the repo) is redundant-or-worse for the real audience, not just
for technical power users.

## Decision

`ai-pm-dev` is an **agent-native discipline layer**, not an agent-competing AI loop. Its moat
is the structure a general code agent lacks on its own:

- the PM-challenge skill protocol (force rank → cut must-haves to ≤3 → the one thing → an
  explicit non-goal → one measurable metric),
- the `prd check --strict` quality gate that will not pass until scope is actually cut,
- the standardized artifact tree, handoff format, and decision/memory audit trail.

The clarification *intelligence* lives in the host agent via skills; the CLI's job is the
deterministic part — materialize artifacts and run the gate. Therefore:

- `prd clarify` (the standalone API-key loop) is **demoted, not deleted**: it is kept only for
  web / headless / no-agent one-shot use. No further investment.
- The first-class path is: host agent runs the skill (full context, no double billing) → calls
  the CLI to write the stage's artifacts and gate them.
- Next development (the "A" direction) extends the delivery chain *forward* past the PRD —
  `PRD → MVP scope → page/architecture stub → delivery checklist` (vision §10) — but as
  skill + CLI driven by the host agent, reusing the PRD backbone (materializer + `workflow-core`
  gate rules + `check` command). Not a new AI loop.
- Cross-agent portability (an install layer for Codex/workbuddy beyond `CLAUDE.md`/`AGENTS.md`,
  the "B" direction) is deferred. Validation of clarification quality is also deferred by
  maintainer decision: go straight to A.

## Consequences

- This amends the written vision: the standalone web "AI coach" is no longer the primary bet.
  Future work should not drift back toward building a self-contained web clarification
  experience because §2/§4.2 says so — read this ADR first.
- Do not build additional standalone LLM loops. When a stage needs intelligence, the host
  agent provides it through a skill; the CLI stays deterministic (materialize + gate). Any new
  server-side LLM call must be justified at the plan gate against this ADR.
- The engineering substrate from v1.2.0 is retained and reused: `evaluateAnswerGates`
  (single-source gate logic), the schema normalize/validate helpers, the artifact writers, and
  the `llm-runs/<runId>` record hook are the right spine for the next stages.
- `prd clarify` stays green and supported for its niche surfaces but is out of the investment
  path.
