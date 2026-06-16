# AGENTS.md — Project Operating Layer

> Project entry file for AI coding tools (Claude Code, Codex, v0, Figma).
> Installed by `ai-pm-dev init`. Project specifics are filled by `ai-pm-dev prd`.

**Project:** _(to be filled by `ai-pm-dev prd`)_
**One-liner:** _(to be filled by `ai-pm-dev prd`)_

This project uses the AI PM Dev operating layer. Any AI tool working here reads this file
first, then follows the protocol below. Do not invent process — it lives in this file and
in the `docs/` it points to.

## Before any task

1. Read `docs/PROJECT_BRIEF.md`, `docs/open-questions.md`, and `docs/acceptance-tests.md`.
2. Read `memory/current-ai-prd.md` if it exists (the latest PRD).
3. Restate your understanding of the task in one or two sentences.
4. If a key gap would make the work incorrect, ask at most 5 clarifying questions before coding.
5. Do not expand scope beyond the MVP until the user confirms. MVP and non-goals live in `docs/PROJECT_BRIEF.md`.

## After any task

1. Update `docs/decision-log.md` with meaningful decisions (what was included/excluded and why).
2. Update `docs/open-questions.md` (resolve answered ones, add new gaps).
3. Update `docs/progress.md` (done / not-done / tests run).
4. Report: what was completed, what was not, tests run, and residual risk.

Fast path — these append one line each so updating is cheap (run from the project root):

```bash
ai-pm-dev decide "<decision>" --why "<reason>"
ai-pm-dev note "<progress note>"
ai-pm-dev pitfall "<symptom>" --cause "<cause>" --fix "<fix>"
ai-pm-dev keyword "<term>" --explain "<plain words>"   # a key-term card
ai-pm-dev learned "<the main chain in your own words>"  # an understanding note
```

Run `ai-pm-dev doctor` to see which docs are still empty stubs.

## Collaboration style

The goal is not only to ship the feature, but for the user to be able to explain it.

- Plain language first, then the term: say what a step does and why before naming the pattern.
- Bring the user along on verification: say exactly what to run, where to look, and what
  result to expect — do not just declare it tested.
- After a non-trivial change, explain the main chain end to end (request → entry point →
  service/logic → data → what the user sees), then close-read the 3–6 key files.
- Capability over speed: advancing the feature is not the only goal; the user being able to
  restate the logic in their own words matters more.
- Never delete the user's own comments, notes, or progress markers when editing — they are
  thinking scaffolding, not noise.

## PM challenge (before a spec, PRD, or a new feature)

Do the hard PM work — do not accept a feature wishlist at face value. Before writing a spec,
a PRD, or building a new feature, interrogate the user until these are settled:

1. **Rank.** Make the user order the candidate features by value, out loud.
2. **Cut to 3.** Refuse to proceed with more than 3 must-haves for v1. Make them defer the rest.
3. **The one thing.** Ask which single feature proves the idea if they could ship only one.
4. **A non-goal.** Make them name at least one thing v1 will deliberately not do, and why.
5. **One metric.** Make them commit to a single measurable success signal.
6. **Defend the boundary.** If they try to re-add a cut item later, ask what they will drop to
   make room — scope is a fixed budget, not a growing list.

Then stress-test the plan before writing it down:

7. **Surface the load-bearing assumptions.** Ask "what must be true for this to work?" List
   them, then rank by the *cheapest test that would disprove it* — push the user to validate
   the most fragile, most load-bearing assumption first, not the most comfortable one.
8. **Pre-mortem.** Ask "imagine v1 has already failed — what is the most likely reason?"
   Turn the top one or two into a risk or an open question, not a vague worry.

Do not write the PRD or the code until 1–5 are answered. Push back on vague answers; ask the
sharp follow-up. Record the result with `ai-pm-dev prd` and verify with `ai-pm-dev prd check
--strict` (it fails until the cutting is done). The goal is to force the decision, not to be
agreeable.

## Docs manifest

`init` creates the core set as stubs. Heavier or stack-specific docs are declared here and
created on demand by the owning skill when its phase begins. To prune: delete the file and
remove its row.

| Doc | Purpose | Owner skill | Status |
| --- | --- | --- | --- |
| `docs/PROJECT_BRIEF.md` | Product one-liner, users, pain, MVP/non-goals | prd-generator | core stub |
| `docs/UI_SPEC.md` | Screens, states, interaction, visual direction | design-brief-builder / design-maker | core stub |
| `docs/acceptance-tests.md` | Verifiable acceptance scenarios | prd-generator / code-review | core stub |
| `docs/decision-log.md` | Why the MVP includes/excludes things | all skills append | core stub |
| `docs/open-questions.md` | Unconfirmed gaps, blank/not-applicable answers | all skills | core stub |
| `docs/progress.md` | Done / not-done / tests run | dev-builder | core stub |
| `docs/troubleshooting.md` | Debugging lessons, repeated pitfalls | bug-fixer | core stub |
| `docs/architecture.md` | System structure and data flow | dev-planner | on demand |
| `docs/api-contract.md` | API endpoints and contracts (if a backend exists) | dev-planner / dev-builder | on demand |
| `docs/db-schema.md` | Persistence schema (if persistence exists) | dev-builder | on demand |
| `docs/roadmap.md` | Phasing and sequencing | dev-planner / release-builder | on demand |
| `docs/local-run-guide.md` | How to run the project locally | release-builder | on demand |
| `docs/release-checklist.md` | Pre-release checks | release-builder | on demand |
| `docs/demo-script.md` | Demo walkthrough | release-builder | on demand |
| `docs/keywords.md` | Own-words cards for key terms (`ai-pm-dev keyword`) | you | on demand |
| `docs/learning-log.md` | Own-words understanding notes (`ai-pm-dev learned`) | you | on demand |

## Routing to skills

Pick the earliest missing step. Skill files live in `skills/<name>/SKILL.md`.

| Intent | Skill |
| --- | --- |
| Idea, feature, requirement, vague goal | `product-spec-builder` / `prd-generator` |
| Needs UI/UX constraints or design requirements | `design-brief-builder` |
| Needs a page, prototype, layout, component proposal | `design-maker` |
| Wants to start dev but lacks confirmed steps | `dev-planner` |
| Has a confirmed plan, wants implementation | `dev-builder` |
| Reports an error, failing test, regression | `bug-fixer` |
| Wants code review, risk/test-gap inspection | `code-review` |
| Prepares build, delivery, release, handoff | `release-builder` |

Order: `Spec -> Design Brief -> Design -> Dev Plan -> Build -> Bug Fix -> Review -> Release`.
