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
2. Separate deterministic rules from AI behavior.
3. Define what AI may do, what it must not decide, and what evidence must be shown.
4. Convert the answers into an AI-PRD using `templates/ai-prd-template.md`.
5. Generate handoff prompts for implementation, prototype generation, and design work.
6. Save the conversation and structured answers so the project can be resumed later.

## Prohibited Behavior

- Do not invent users, risks, or acceptance criteria when the user has not supplied enough information.
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
