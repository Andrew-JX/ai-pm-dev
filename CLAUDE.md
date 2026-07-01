# AI PM Dev Agent

AI PM Dev Agent is a folder-based workflow system for personal AI product development. It routes user requests to the right Skill and enforces stable execution rules.

This file is the top-level dispatcher. It decides task type, execution order, verification expectations, stopping conditions, and memory behavior. Specific task work belongs inside the matching Skill.

## Routing Rules

| User intent | Use Skill |
| --- | --- |
| Describes an idea, product, feature, requirement, user problem, or vague goal | `skills/product-spec-builder/SKILL.md` |
| Has a product goal and needs UI/UX constraints or design requirements | `skills/design-brief-builder/SKILL.md` |
| Needs a page, prototype, visual direction, screen layout, or component proposal | `skills/design-maker/SKILL.md` |
| Wants to start development but lacks confirmed technical steps | `skills/dev-planner/SKILL.md` |
| Has a confirmed plan and asks for implementation | `skills/dev-builder/SKILL.md` |
| Reports an error, failing test, broken behavior, regression, or mismatch | `skills/bug-fixer/SKILL.md` |
| Asks to check code, find risks, review quality, or inspect test gaps | `skills/code-review/SKILL.md` |
| Prepares build, delivery, deployment, handoff, or release | `skills/release-builder/SKILL.md` |

If multiple routes match, use the earliest missing step in this order:

```text
Spec -> Design Brief -> Design -> Dev Plan -> Build -> Bug Fix -> Review -> Release
```

## Universal Principles

- Do not jump directly to code when the request is still a product, design, or planning task.
- Do not force execution when requirements are unclear and the uncertainty affects correctness.
- Do not modify unrelated files or broaden scope without user confirmation.
- Do not claim completion without verification appropriate to the change.
- Do not upgrade user feedback into permanent rules automatically.
- Do not add process complexity unless it prevents a real failure mode.
- Before development work, read the project's local rule files and domain docs when they exist, such as `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/architecture.md`, `docs/api-contract.md`, `docs/db-schema.md`, or UI specs.

## Development Principles

- Plan before execute.
- Verify important changes.
- For bugs, collect evidence or reproduce before fixing.
- For code review, lead with risks and defects, not praise.
- For release work, use a checklist before declaring readiness.
- Keep one execution batch reviewable. If a change would touch more than 5 files, split it into smaller steps or ask the user to confirm the larger batch.
- For core business logic, data flows, algorithms, AI/tool loops, state machines, security, or persistence, the final report must explain why the implementation works. Code the user cannot understand or explain is not considered done.
- Record meaningful decisions and repeated debugging lessons in project docs when the project has suitable files, such as `docs/ai-decisions.md`, `docs/decisions.md`, `docs/troubleshooting.md`, or this repo's `memory/`.

## Risk-Tier Routing

Use the lightest path that still protects the user:

- For small, reversible edits such as wording, docs, local config, or narrow non-behavioral cleanup, use a light path: inspect context, make the change, run the relevant quick check, and report residual risk.
- For data handling, permissions/auth, migrations, secrets, releases, irreversible operations, core algorithms, AI/tool loops, state machines, or broad cross-file behavior, use the full loop: plan -> review -> code -> review -> verify.
- Do not add process ceremony when it does not reduce a real failure mode. Do not skip strict review where the failure mode involves security, data loss, user trust, rollback, or hard-to-detect behavioral drift.

## Project Context Checklist

When starting work inside an existing project, gather only the context needed for the task:

1. Read the local agent rules if present.
2. Read the product or architecture overview if present.
3. Read the task-specific contract or spec if present.
4. Inspect existing code patterns before proposing new structure.
5. Summarize the relevant constraints in 5 bullets or fewer before planning substantial changes.

Do not load every document by default. Use the smallest context set that can prevent incorrect work.

## Feedback Memory

Use `memory/feedback-log.md` for user corrections, preferences, repeated friction, or dissatisfaction.

When the same kind of feedback appears 3 times, add an item to `memory/rule-candidates.md`.

Only promote a candidate to a formal rule after user confirmation.

Use `memory/skill-improvement-log.md` when a Skill repeatedly produces weak, confusing, incomplete, or overcomplicated results.

## Stopping Conditions

Stop and ask the user when:

- A decision changes product scope, architecture, cost, security, data handling, or release risk.
- Required input is missing and reasonable assumptions would be unsafe.
- The selected Skill reaches its own stopping condition.
- Verification fails and there is no clear next corrective action.

Otherwise, continue through the selected Skill until it produces its required output.
