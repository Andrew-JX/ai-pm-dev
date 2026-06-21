# AI PM Dev Agent Plan

AI PM Dev Agent is a folder-based workflow system for personal AI product development.

It is not a chatbot, prompt collection, UI, or multi-agent platform. v0.1 made AI coding tools follow stable role, process, and quality rules during product development work. v0.2 adds a simple initializer so the workflow can be installed into real projects without manual copying. v0.3 adds a task prompt starter so users do not need to remember routing prompts. v0.4 adds a local Agent CLI with task state. v0.5 makes the CLI distributable through npm or GitHub installation. v0.6 adds self-check and onboarding. v0.7 adds release readiness checks. v0.8 adds local config with a default target project. v1.0 adds interactive PM interview sessions that turn a product idea into structured AI-PRD assets and downstream agent handoffs.

## v0.1 Scope

- Build top-level routing rules in `CLAUDE.md`.
- Create 8 reusable Skills.
- Define routing, inputs, workflows, outputs, prohibitions, validation, and stopping conditions.
- Add templates for repeated artifacts.
- Add memory files for feedback, rule candidates, and skill improvement notes.
- Add a practical usage guide for using the workflow inside real projects.

## v0.1 Non-Goals

- Web UI
- Automatic sub-agent dispatch
- Automatic hooks
- Automatic rule graduation
- Automatic GitHub integration
- Automatic deployment

## Directory

```text
ai-pm-dev/
  CLAUDE.md
  README.md
  README.zh-CN.md
  CHANGELOG.md
  package.json
  AI_PM_DEV_AGENT_PLAN.md
  bin/
    ai-pm-dev.mjs
  scripts/
    init-ai-pm-dev.mjs
    init-ai-pm-dev.ps1
    init-ai-pm-dev.sh
    start-task.mjs
    start-task.ps1
    start-task.sh
  skills/
    product-spec-builder/
      SKILL.md
    design-brief-builder/
      SKILL.md
    design-maker/
      SKILL.md
    dev-planner/
      SKILL.md
    dev-builder/
      SKILL.md
    bug-fixer/
      SKILL.md
    code-review/
      SKILL.md
    release-builder/
      SKILL.md
    prd-generator/
      SKILL.md
  templates/
  memory/
  tests/
    init-ai-pm-dev.test.mjs
    start-task.test.mjs
    agent-cli.test.mjs
    doctor-release.test.mjs
    package-metadata.test.mjs
    config.test.mjs
```

## v0.2 Scope

- Add one-command initialization for target projects.
- Support Windows PowerShell, cross-platform Node, and shell wrapper usage.
- Back up existing `CLAUDE.md` before replacing it.
- Merge workflow `skills/` and `templates/`.
- Preserve existing target `memory/*.md` logs.
- Support `--dry-run`, `--force`, and `--include-readme`.
- Add no-dependency tests for initialization behavior.

## v0.3 Scope

- Add a task starter that generates the next AI conversation prompt.
- Route tasks to the 8 core Skills by simple keywords.
- Allow explicit routing with `--type`.
- Save generated prompts to `memory/current-task-prompt.md`.
- Add tests for route selection, explicit type selection, and prompt saving.

## v0.4 Scope

- Add a local `ai-pm-dev` Agent CLI.
- Support `init`, `start`, and `status` commands.
- Save task state in `.ai-pm-dev/state.json`.
- Expose the CLI through `package.json` `bin`.
- Keep lower-level scripts available as implementation details.
- Add tests for CLI init, task start, and status.

## v0.5 Scope

- Remove package-private status so the CLI can be distributed.
- Add package `files` metadata so installs include workflow assets.
- Make the README start with real user installation commands.
- Maintain separate English and Chinese README files.
- Add tests for package metadata.

## v0.6 Scope

- Add `doctor` for package and target project self-checks.
- Add `onboarding` for the shortest beginner path.
- Improve recovery instructions when a target is not initialized.
- Add tests for uninitialized and initialized target checks.

## v0.7 Scope

- Add `release-check` for publish readiness.
- Add `CHANGELOG.md` for release notes.
- Add npm pack dry-run coverage in tests.
- Update package version to `0.7.0`.
- Update English and Chinese README files with doctor and release-check usage.

## v0.8 Scope

- Add `config get`, `config set target <path>`, and `config clear`.
- Store config in the user-level AI PM Dev config directory.
- Support `AI_PM_DEV_HOME` for isolated tests and custom config homes.
- Let `start`, `status`, and `doctor` use the configured target when `--target` is omitted.
- Update docs and changelog.

## v1.0 Scope

- Add `ai-pm-dev prd` as an interactive PM interview workflow.
- Ask structured questions about users, pain, workflow, MVP scope, data, deterministic rules, AI boundaries, trust, risk, and acceptance.
- Save PRD sessions under `.ai-pm-dev/prd-sessions/<timestamp-slug>/`.
- Generate `conversation.md`, `answers.json`, `ai-prd.md`, `prototype-brief.md`, `risks.md`, `acceptance-tests.md`, and handoff prompts for Codex, v0, and Figma.
- Save the current AI-PRD and Codex handoff into `memory/current-ai-prd.md` and `memory/current-task-prompt.md`.
- Add `ai-pm-dev prd status` and `ai-pm-dev prd handoff --to <codex|v0|figma>`.
- Add `prd-generator` as the ninth core Skill.

## v1.0 Non-Goals

- No LLM API dependency.
- No Dify workflow integration.
- No Axure automation.
- No generated frontend prototype yet.
- No multi-agent execution. v1.0 only prepares structured handoff prompts.

## v1.1 Scope — Project Operating Layer (IMPLEMENTED)

Status: implemented in three batches — (1) `init` operating-layer scaffold, (2) `prd`
fills docs + clean session naming, (3) Skill->doc `Maintains` + `doctor` checks. All tests pass.

### Problem this round fixes

Today `init` copies the dispatcher's own `CLAUDE.md` plus `skills/`, `templates/`, and
`memory/` into the target. `prd` writes only into `.ai-pm-dev/prd-sessions/<session>/`
and two `memory/*.md` files. Nothing lands in `docs/`. So when a downstream tool
(Claude Code, Codex, v0, Figma) opens the project, there is no project-specific entry
file and no durable, AI-readable constraint layer. The user still has to hand-write a
prompt explaining how to work — which defeats the tool's purpose.

The fix: `init` + `prd` must install and populate a durable **project operating layer**
modeled on the FitMind project (`AGENTS.md` + structured `docs/` + ongoing doc updates),
and each Skill must own and maintain specific docs.

Confirmed decisions (2026-06-15):
- This round's single main line = the operating layer. Other items are scheduled below, not dropped.
- Division of labor: `init` scaffolds the layer; `prd` fills it from interview answers.
- Work mode: this written plan first, then implement after confirmation.

### Docs scaffolding strategy (tiered stubs + manifest, not a pile of empty files)

A fixed pile of empty docs is noise and does not fit every stack. Instead:

1. `init` always materializes a small **core set** as *self-documenting stubs* — each stub
   has a one-line purpose, its owning Skill, and `Status: TODO`. The core set applies to
   any project regardless of size or stack.
2. A **docs manifest** (a table inside `AGENTS.md`) declares the *full intended set* with
   `file -> purpose -> owning skill -> status`. Optional/stack-specific docs are declared
   here but not yet created.
3. Heavier or stack-specific docs are **materialized on demand by the owning Skill** when
   its phase begins (e.g. `dev-planner` creates `architecture.md`; `dev-builder` maintains
   `progress.md`; backend-only docs appear only when persistence/API exists).
4. `prd` fills the core docs from interview answers.
5. Pruning is trivial: delete the file and remove its manifest row.

Core set, created as stubs at `init` (every project):

```text
docs/PROJECT_BRIEF.md      product one-liner, users, pain, MVP/non-goals   (prd-generator)
docs/UI_SPEC.md            screens, states, interaction, visual direction  (design-brief-builder / design-maker)
docs/acceptance-tests.md   verifiable acceptance scenarios                 (prd-generator / code-review)
docs/decision-log.md       why MVP includes/excludes things                (all skills append)
docs/open-questions.md     unconfirmed gaps, blank/"not-applicable" answers (all skills)
docs/progress.md           done / not-done / tests run                     (dev-builder)
docs/troubleshooting.md    debugging lessons, repeated pitfalls            (bug-fixer)
```

Declared in manifest, created on demand by the owning Skill:

```text
docs/architecture.md       (dev-planner)
docs/api-contract.md       (dev-planner / dev-builder — only if a backend exists)
docs/db-schema.md          (dev-builder — only if persistence exists)
docs/roadmap.md            (dev-planner / release-builder)
docs/local-run-guide.md    (release-builder)
docs/release-checklist.md  (release-builder)
docs/demo-script.md        (release-builder)
```

### AGENTS.md (the project entry file)

`init` generates a project-specific `AGENTS.md` containing:

- Project name and one-liner (placeholder at init; filled by `prd`).
- **Before any task**: read `docs/PROJECT_BRIEF.md`, `docs/open-questions.md`,
  `docs/acceptance-tests.md`, and `memory/current-ai-prd.md`; restate the task;
  ask at most N clarifying questions when a key gap exists; do not expand scope before
  MVP boundaries are confirmed.
- **After any task**: update `docs/decision-log.md`, `docs/open-questions.md`,
  `docs/progress.md`; report done / not-done / tests run / residual risk.
- The **docs manifest** table.
- The routing table to the 9 Skills.

`CLAUDE.md` in the target becomes a thin pointer to `AGENTS.md` plus the routing table,
so there is one source of truth instead of the dispatcher file masquerading as project rules.

### memory/ vs docs/ (avoid duplication)

- `docs/` holds project state (the FitMind model).
- `memory/` keeps only AI-PM-Dev's own logs (`feedback-log.md`, `rule-candidates.md`,
  `skill-improvement-log.md`) plus the "latest pointer" files (`current-ai-prd.md`,
  `current-task-prompt.md`). Project state is not duplicated into `memory/`.

### Skill -> doc ownership

Each `SKILL.md` gains a **Maintains** section naming the docs it must create/update, so
doc maintenance becomes a skill responsibility rather than an afterthought:

```text
prd-generator         PROJECT_BRIEF.md, acceptance-tests.md, open-questions.md
design-brief-builder  UI_SPEC.md (constraints)
design-maker          UI_SPEC.md (screens/states), decision-log.md (UI decisions)
dev-planner           architecture.md, roadmap.md, acceptance-tests.md (slices)
dev-builder           progress.md, api-contract.md, db-schema.md, decision-log.md
bug-fixer             troubleshooting.md
code-review           reviews against acceptance-tests.md, architecture.md, UI_SPEC.md
release-builder       local-run-guide.md, release-checklist.md, demo-script.md
product-spec-builder  PROJECT_BRIEF.md
```

### Code changes

- `scripts/init-ai-pm-dev.mjs`: generate `AGENTS.md`, the `docs/` core stubs + manifest,
  and a target `CLAUDE.md` pointer. Keep existing backup/`--dry-run`/`--force` behavior.
- `bin/ai-pm-dev.mjs` `writePrdAssets`: after the session is written, fill
  `docs/PROJECT_BRIEF.md`, `docs/UI_SPEC.md`, `docs/acceptance-tests.md` from answers;
  append a `decision-log.md` entry; seed `open-questions.md` from blank answers.
- Session naming: replace `slugify(idea)` (which produced `yes-no-no-no-yes-no-next-mmmm`)
  with a clean `timestamp + short title` scheme.
- `doctor`: add an operating-layer check (AGENTS.md + docs core set present).

### Tests

- `init` creates `AGENTS.md`, docs core stubs, and the manifest.
- `prd` fills `PROJECT_BRIEF.md` / `UI_SPEC.md` / `acceptance-tests.md` and seeds open-questions.
- `doctor` reports operating-layer status.

### Implementation batches (CLAUDE.md caps one batch at ~5 files)

1. `init` operating-layer scaffold: init script + `AGENTS.md` template + docs stub
   templates + target `CLAUDE.md` pointer + init tests.
2. `prd` fills docs core + clean session naming + prd tests.
3. Skill->doc `Maintains` sections in the 9 `SKILL.md` + `doctor` checks + manifest wiring + tests.

### Follow-on scope (IMPLEMENTED in the same round)

- v1.2 — `ai-pm-dev prd check` quality gate + `quality-report.md` (required vs recommended
  checks; AI gaps are WARN not FAIL; handoff-references-PRD check). DONE.
  Downstream gate coupling now checks `docs/scope.md`, `docs/acceptance-tests.md`, and
  all handoffs against the latest PRD gates. DONE.
- v1.3 — PRD interview: language choice (`--lang zh|en`, interactive prompt when omitted)
  and project-type templates (`--type ai-tool|saas|consumer|internal-tool`) that skip
  AI-specific questions for non-AI products and record them as open questions. DONE.
  Local adaptive follow-ups for sparse answers now write `follow-up-questions.md` and
  append priority gap questions into `docs/open-questions.md`. DONE.
  (Deferred sub-item: LLM-driven free-description parsing remains optional future scope.)
- v1.4 — `examples/quick-date/`: full end-to-end case (idea -> interview -> PRD -> docs ->
  handoffs -> quality report -> retrospective). DONE. (Prototype screenshot still to add by hand.)
- v1.5 — `ai-pm-dev dashboard`: read-only HTML project status view for scope, gate status,
  docs health, open questions, decisions, and timeline. DONE.
- v1.6 — `ai-pm-dev install-pr-template`: GitHub PR template gate inspired by mature OSS
  templates (summary, test evidence, release/docs notes) plus AI PM Dev scope checks
  (PRD session, mapped must-have, non-goal boundary). DONE.
- v1.7 — `ai-pm-dev decision-record`: KEP-lite decision records for larger changes,
  capturing summary/why, goals, non-goals, test plan, rollback plan, readiness checks,
  and a decision-log entry. DONE.
- v1.8 — `ai-pm-dev install-ownership` + `review-route`: local OWNERS-style routing
  that maps changed paths to owner skill lenses, docs to read, and required checks. DONE.
- v1.9 — `ai-pm-dev bug`: structured bug intake that requires actual behavior,
  expected behavior, minimal reproduction, impact, and verification before fix work. DONE.

- v1.10 — Development skill hardening: `dev-planner`, `dev-builder`, `bug-fixer`,
  `code-review`, and `release-builder` now carry AI collaboration guardrails for
  context packs, small reviewable slices, review routing, evidence-first verification,
  human confirmation on risky boundaries, and rollback readiness. DONE.
- v1.11 — `ai-pm-dev workflow check` / `skill lint`: static guardrail lint for the
  development-side skills; `--strict` fails when context, verification, risk boundary,
  docs update, or rollback guidance is missing. DONE.
- v1.12 — GitHub-facing positioning refresh: README/package/changelog now state that
  AI PM Dev Agent is a local Idea-to-Build workflow CLI / workflow kernel, not a
  general agent platform or Dify/Coze replacement. DONE.

### Still open

- README.zh-CN.md is valid UTF-8; the observed 乱码 is a PowerShell console rendering issue,
  not file corruption. Action: add a console-encoding note to the README and keep
  `release-check` verifying UTF-8 — no rewrite needed.
- Optional LLM-driven free-description parsing and follow-up refinement.
- Prototype screenshot / real v0 output in the example.

## First Real Test

Use a small feature and run the full loop:

```text
Need -> Spec -> Plan -> Build -> Review -> Verify -> Document
```

After the test, simplify anything that feels heavy, add missing checks, and record the first rule candidates.

## FitMind-Derived Iteration Notes

The first refinement comes from the FitMind project workflow:

- Project-local rules are valuable and should be read before development work.
- Large tasks should be split before execution when they exceed reviewable scope.
- Verification should include the relevant mix of build, lint, type-check, tests, smoke checks, and manual checks.
- Decision records and troubleshooting logs are not decoration; they are the memory layer that prevents repeated mistakes.
- For core logic, the user must be able to explain why the code works.

## Usage Model

Recommended: install globally with `npm install -g github:Andrew-JX/ai-pm-dev`, run `ai-pm-dev init`, then `ai-pm-dev start --save`, then paste the generated prompt into Codex or Claude Code from the target project root.

Manual fallback: copy the workflow files into the project root. Keeping `ai-pm-dev/` as a separate reference folder still works, but is less reliable because the rules are outside the active project root.
