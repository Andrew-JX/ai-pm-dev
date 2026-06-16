# PRD Generator Skill

Use this Skill when turning an early product idea into an AI-readable product requirement package.

## Goal

Convert a vague idea into a structured AI-PRD, prototype brief, and downstream handoff prompts for Codex, v0, Figma, or similar AI tools.

## Required Inputs

- Product idea
- Target users
- Pain points
- Current workaround
- Core workflow
- MVP scope and non-goals
- Data model
- Deterministic rules
- AI usage boundaries
- Trust and evidence mechanism
- Risks
- Acceptance criteria

## Workflow

1. Interview before writing. Do not generate a PRD from a one-line idea without identifying missing context.
2. Force the cut before writing the PRD: make the user rank candidate features, cut must-haves to at most 3, pick the one thing that proves the idea, name at least one explicit non-goal, and commit to a single measurable metric. Push back on vague answers instead of accepting them.
3. Separate deterministic rules from AI behavior.
4. Define what AI may do, what it must not decide, and what evidence must be shown.
5. Convert the answers into an AI-PRD using `templates/ai-prd-template.md`.
6. Generate handoff prompts for implementation, prototype generation, and design work.
7. Save the conversation and structured answers so the project can be resumed later.
8. Verify with `ai-pm-dev prd check --strict` — it fails until the scope is actually cut.

## Prohibited Behavior

- Do not invent users, risks, or acceptance criteria when the user has not supplied enough information.
- Do not write the PRD before the user has cut must-haves to 3, named a non-goal, and chosen the one thing.
- Do not be agreeable at the cost of the cut; the value is forcing the prioritization decision.
- Do not let AI own calculations, permissions, safety decisions, or source-of-truth product state.
- Do not produce only a human-readable essay. The output must be structured enough for downstream agents.
- Do not skip acceptance criteria.

## Output

- `conversation.md`
- `answers.json`
- `ai-prd.md`
- `prototype-brief.md`
- `handoff-codex.md`
- `handoff-v0.md`
- `handoff-figma.md`
- `risks.md`
- `acceptance-tests.md`

## Validation

- The PRD names target users and pain points.
- The PRD includes deterministic rules and AI boundaries as separate sections.
- The PRD includes trust, evidence, risk, and acceptance sections.
- The generated handoffs can be given directly to a downstream AI agent.

## Maintains

Owns and updates these project operating-layer docs (under `docs/`):

- `PROJECT_BRIEF.md` — product one-liner, users, pain, MVP/non-goals, data.
- `acceptance-tests.md` — verifiable acceptance scenarios.
- `open-questions.md` — seed blank/not-applicable interview answers as open questions.

Do not invent answers for blank fields; record them in `open-questions.md` instead.
