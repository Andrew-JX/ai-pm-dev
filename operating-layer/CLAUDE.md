# CLAUDE.md

This project runs on the **AI PM Dev Agent** operating layer.

**Read [`AGENTS.md`](AGENTS.md) first.** It is the single source of truth for how to work in
this project: the before-task and after-task protocol, the `docs/` manifest, and the routing
table to the skills in `skills/`.

## Quick routing

| Intent | Skill |
| --- | --- |
| Idea, feature, requirement, vague goal | `skills/product-spec-builder/SKILL.md` / `skills/prd-generator/SKILL.md` |
| Needs UI/UX constraints | `skills/design-brief-builder/SKILL.md` |
| Needs a page, prototype, layout | `skills/design-maker/SKILL.md` |
| Wants to start dev but lacks confirmed steps | `skills/dev-planner/SKILL.md` |
| Has a confirmed plan, wants implementation | `skills/dev-builder/SKILL.md` |
| Reports an error, failing test, regression | `skills/bug-fixer/SKILL.md` |
| Wants code review or test-gap inspection | `skills/code-review/SKILL.md` |
| Prepares build, delivery, release | `skills/release-builder/SKILL.md` |

Order: `Spec -> Design Brief -> Design -> Dev Plan -> Build -> Bug Fix -> Review -> Release`.

Before starting, read `docs/PROJECT_BRIEF.md`, `docs/open-questions.md`, and
`docs/acceptance-tests.md`. After finishing, update `docs/decision-log.md`,
`docs/open-questions.md`, and `docs/progress.md`, then report done / not-done / tests / risk.
