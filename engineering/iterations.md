# Iterations

This file folds the historical `AI_PM_DEV_AGENT_PLAN.md` into the engineering record.
Each entry records what shipped and which product or workflow hypothesis was tested.

## v0.1 - Folder-Based Workflow Rules

Delivered:
- Top-level routing rules in `CLAUDE.md`.
- Eight reusable Skills with routing, inputs, workflows, outputs, prohibitions,
  validation, and stopping conditions.
- Templates and memory files for feedback, rule candidates, and skill improvement notes.
- Practical usage guidance for applying the workflow inside real projects.

Hypothesis tested:
- A folder-based operating layer can make AI coding tools follow stable product,
  process, and quality rules without a separate agent platform.

Result:
- Validated enough to continue: reusable roles, templates, and memory records gave the
  project a repeatable structure, but installation still required manual copying.

## v0.2 - Project Initializer

Delivered:
- One-command initialization for target projects.
- Existing `CLAUDE.md` backup before replacement.
- Workflow `skills/` and `templates/` merge behavior.
- Preservation of target `memory/*.md` logs.
- `--dry-run`, `--force`, and `--include-readme`.
- No-dependency initialization tests.

Hypothesis tested:
- The workflow becomes meaningfully more usable when it can be installed into real
  projects without manual file copying.

Result:
- Validated. Initialization behavior became testable and repeatable across targets.

## v0.3 - Task Starter

Delivered:
- A task starter that generates the next AI conversation prompt.
- Keyword routing to the core Skills.
- Explicit routing with `--type`.
- Saved prompts in `memory/current-task-prompt.md`.
- Tests for route selection, explicit type selection, and prompt saving.

Hypothesis tested:
- Users should not need to remember routing prompts for every new AI work session.

Result:
- Validated. The tool could now turn a short task into a structured handoff prompt.

## v0.4 - Local CLI and Task State

Delivered:
- Local `ai-pm-dev` CLI.
- `init`, `start`, and `status` commands.
- Task state in `.ai-pm-dev/state.json`.
- CLI exposure through `package.json` `bin`.
- Lower-level scripts retained as implementation details.
- CLI tests for init, start, and status.

Hypothesis tested:
- A small local CLI is the right workflow kernel for project state and repeatable AI
  handoffs.

Result:
- Validated. The workflow moved from file kit toward an executable local tool.

## v0.5 - Distributable Package

Delivered:
- Package-private status removed.
- `package.json.files` metadata added for workflow assets.
- English and Chinese READMEs with real installation commands.
- Package metadata tests.

Hypothesis tested:
- The workflow should be installable from npm/GitHub rather than copied as a local
  reference folder.

Result:
- Validated. Package metadata became part of the tested release surface.

## v0.6 - Doctor and Onboarding

Delivered:
- `doctor` command for package and target self-checks.
- `onboarding` command for the shortest beginner path.
- Recovery instructions for uninitialized targets.
- Tests for uninitialized and initialized target checks.

Hypothesis tested:
- A workflow CLI needs self-diagnosis before users can trust it in messy local projects.

Result:
- Validated. The tool could explain missing setup and guide recovery.

## v0.7 - Release Readiness

Delivered:
- `release-check` for publish readiness.
- `CHANGELOG.md`.
- `npm pack --dry-run` coverage.
- Version update to `0.7.0`.
- README updates for doctor and release-check.

Hypothesis tested:
- Release discipline should be encoded in the same local workflow rather than remembered
  manually.

Result:
- Validated. Pack contents and release readiness became testable.

## v0.8 - Local Config

Delivered:
- `config get`, `config set target <path>`, and `config clear`.
- User-level AI PM Dev config directory.
- `AI_PM_DEV_HOME` for isolated tests and custom config homes.
- `start`, `status`, and `doctor` defaulting to configured target when `--target` is
  omitted.
- Docs and changelog updates.

Hypothesis tested:
- Repeated local usage improves when the active project target can be remembered safely.

Result:
- Validated. The CLI became less repetitive while remaining test-isolatable.

## v1.0 - Interactive PM Interview and Operating Layer

Delivered:
- `ai-pm-dev prd` interactive PM interview workflow.
- Structured questions covering users, pain, workflow, MVP scope, data, deterministic
  rules, AI boundaries, trust, risk, and acceptance.
- PRD sessions under `.ai-pm-dev/prd-sessions/<timestamp-slug>/`.
- Generated `conversation.md`, `answers.json`, `ai-prd.md`, `prototype-brief.md`,
  `risks.md`, `acceptance-tests.md`, and Codex/v0/Figma handoffs.
- Current PRD and Codex handoff pointers in `memory/current-ai-prd.md` and
  `memory/current-task-prompt.md`.
- `prd status` and `prd handoff --to <codex|v0|figma>`.
- `prd-generator` as the ninth core Skill.
- Project operating layer: `AGENTS.md`, core `docs/` stubs, Skill ownership, and
  `doctor` checks.
- Follow-on console features through v1.12, including `prd check`, language/type
  interview options, adaptive follow-ups, `examples/quick-date`, read-only dashboard,
  PR template install, decision records, ownership routing, structured bug intake,
  development Skill hardening, workflow lint, and GitHub-facing positioning refresh.

Hypothesis tested:
- A local workflow kernel can turn an idea into durable AI-readable PRD assets and
  downstream handoff prompts without depending on an LLM API or multi-agent runtime.

Result:
- Validated as the console baseline. `v1.0.0` later froze this pre-Web CLI line at
  commit `bc3300b`.

Open learning from this era:
- Optional LLM-driven free-description parsing remains future scope.
- The example still benefits from a real prototype screenshot or v0 output.
- README Chinese display issues were console encoding artifacts, not file corruption.

## v1.0.0 - Console CLI Snapshot

Delivered:
- Immutable release tag for the console CLI before the Web workbench.
- A stable baseline for comparing productized UI work against the local workflow kernel.

Hypothesis tested:
- The CLI kernel should be preserved as a recoverable version before adding a Web shell.

Result:
- Validated. The tag gives reviewers and future maintainers a fixed pre-Web reference.

## v1.1.0 - Product Workbench Phase 1

Delivered:
- `apps/web`: local Vite + React + TypeScript workbench.
- Project path selection, idea entry, phase lifeline, current phase card, artifact cards,
  PRD/scope/acceptance previews, open questions, decisions, progress, PRD gate status,
  and next-action suggestions.
- Local Node API bound to `127.0.0.1` for `/api/project`, `/api/prd`, `/api/check`,
  `/api/checkpoint`, `/api/note`, and `/api/decision`.
- Web actions continued to trigger existing CLI capabilities instead of reimplementing
  the workflow kernel.
- Quick PRD stdin switched to JSON keyed by field to avoid positional answer drift.

Hypothesis tested:
- The existing CLI workflow can be visualized as a lightweight product workbench without
  introducing a new agent runtime or replacing CLI behavior.

Result:
- Validated for Phase 1. Review noted that the lifeline and companion UX direction works,
  while deeper AI clarification remains future product differentiation.

## v1.1.1 - Workflow-Core Extraction

Delivered:
- Shared root `workflow-core/` module for questions, item parsing, document constants,
  PRD gate rules, quality report builders, installer/PR templates, and ownership routing.
- CLI and Web API import the same rule definitions.
- `prd check` still writes the same stdout and markdown, and additionally writes
  `quality-report.json`.
- Web workbench reads the structured quality JSON snapshot and shows `UNKNOWN` when it is
  absent, rather than parsing or live-recomputing old markdown reports.
- Bad quick-PRD JSON stdin now fails cleanly instead of surfacing a raw `SyntaxError`.
- Package metadata and pack dry-run tests guard that `workflow-core/` ships.

Hypothesis tested:
- Duplicate CLI/Web rules can be extracted into a shared module while preserving user
  visible behavior.

Result:
- Validated by characterization tests, full `npm test`, and `npm run web:build`. This
  created the stable base for later cleanup and documentation structure work.

## v1.2.0 - Phase 2: AI Clarification Loop

Delivered (3 reviewer-audited batches, all gates and builds green):
- `llm/` infrastructure: Anthropic SDK wrapper (env-only key, timeout + AbortController,
  retry, injectable/mockable SDK), model constants (`claude-opus-4-8` default,
  `claude-sonnet-4-6` cost path), schema normalize/validate helpers.
- `ai-pm-dev prd clarify` (interactive) and `prd clarify --json-turn` (pure-JSON stdout
  machine mode for the web), reusing `writePrdAssets()` with no second write path.
- Gate-backed convergence reusing `workflow-core`'s `evaluateAnswerGates` (single source of
  truth; clarification never converges on a PRD that `prd check` would reject). A measurable
  metric is a soft target, not a hard gate, matching `prd check`.
- Graceful degradation to the template quick PRD without a key, or on timeout / SDK error /
  invalid JSON / schema failure / failed repair retry / turn-limit.
- Per-turn record hook `.ai-pm-dev/llm-runs/<runId>/llm-calls.jsonl` (incl. failed/degraded
  turns; never the key or headers); web `/api/prd/clarify` + AI Clarify UI; schema aligned to
  the 14 authoritative answer keys.

Hypothesis tested:
- That the product differentiator is a standalone, system-owned AI clarification loop that
  turns a vague idea into a gate-worthy PRD on its own API key.

Result:
- Engineering: shipped and audited clean (pinned-SHA review of `6c01139` / `d1237e2` /
  `3141f0a`, full `npm test` + `npm run web:build`, no key/SDK leak in the web bundle).
- Product hypothesis: **disproved for the real audience.** Review established that everyone who
  would use `ai-pm-dev` is already inside a code agent (Claude Code / Codex / domestic agents
  like workbuddy), which clarifies better than a blind standalone loop — full context, no
  double billing. The differentiator is the discipline + artifacts + gate ridden on top of any
  agent, not "an AI that asks questions." Recorded in ADR-005: ai-pm-dev is agent-native;
  `prd clarify` is demoted to web/headless/no-agent surfaces; investment moves to extending the
  delivery chain past the PRD (the "A" direction). The v1.2.0 substrate
  (`evaluateAnswerGates`, schema/validation helpers, artifact writers, `llm-runs` record hook)
  is retained and reused for those stages.
- Process lesson (this counts as a deliverable): a shipped, technically-clean feature can still
  rest on a wrong product premise. The cheap correction was a single direction conversation,
  not more code — exactly the kind of dev-process learning ai-pm-dev itself should capture.
