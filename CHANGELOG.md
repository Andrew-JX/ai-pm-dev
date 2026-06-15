# Changelog

## Unreleased — 1.1.0 (Project Operating Layer + Quality Gate)

Operating layer:

- `init` now installs a project operating layer: `AGENTS.md` (the entry file for downstream AI tools), a `docs/` core stub set (`PROJECT_BRIEF`, `UI_SPEC`, `acceptance-tests`, `decision-log`, `open-questions`, `progress`, `troubleshooting`), and a thin `CLAUDE.md` that points to `AGENTS.md`.
- `prd` now fills the operating layer: seeds `docs/PROJECT_BRIEF.md`, `docs/UI_SPEC.md`, `docs/acceptance-tests.md`, appends a `docs/decision-log.md` entry, and records blank interview answers in `docs/open-questions.md`.
- Fix PRD session naming: CJK ideas no longer produce scrambled latin slugs (e.g. `yes-no-no-next`); they fall back to a clean `<timestamp>-session` name.
- `doctor` now checks for the operating layer (`AGENTS.md` + `docs/` core set).
- Each Skill now declares a `Maintains` section naming the docs it owns and must update.
- Existing user-edited `docs/` files are preserved; only unfilled stubs are seeded.

Quality gate:

- Add `ai-pm-dev prd check`: scores the latest PRD session (required vs recommended checks), writes `quality-report.md`, and prints an overall PASS/WARN/FAIL. AI-specific gaps are WARN ("mark not-applicable"), not FAIL, for no-AI products.

Interview redesign:

- Add `ai-pm-dev prd --lang <zh|en>` (interactive language choice when omitted) and `--type <ai-tool|saas|consumer|internal-tool>`.
- Non-AI project types skip the three AI-specific questions and record them as open questions instead of forcing blank answers. Default (no `--type`) keeps all 12 questions.

Example:

- Add `examples/quick-date/`: a full end-to-end run (idea → PRD → docs → handoffs → quality report → retrospective).

Lower the cost of keeping docs current (so they drift less):

- Add one-line append commands: `ai-pm-dev decide "<decision>" [--why ...]`, `ai-pm-dev note "<progress>"`, `ai-pm-dev pitfall "<symptom>" [--cause ...] [--fix ...]`. They append to `docs/decision-log.md`, `docs/progress.md`, and `docs/troubleshooting.md` and strip the placeholder rows on first real entry.
- `doctor` now lists core docs that are still empty stubs as a soft reminder to fill or remove them.
- Fix: `ai-pm-dev init .` now installs into the user's working directory instead of the package directory.

## 1.0.0

- Add interactive `prd` sessions for PM interview-driven AI-PRD generation.
- Generate session assets: conversation, structured answers, AI-PRD, prototype brief, risks, acceptance tests, and Codex/v0/Figma handoff prompts.
- Save `memory/current-ai-prd.md`, `memory/current-task-prompt.md`, and PRD session state.
- Add `prd status` and `prd handoff --to <codex|v0|figma>`.
- Add the `prd-generator` Skill and AI-PRD templates.

## 0.8.0

- Add `config get`, `config set target <path>`, and `config clear`.
- Let `start`, `status`, and `doctor` use the configured target when `--target` is omitted.
- Add isolated config tests using `AI_PM_DEV_HOME`.

## 0.7.0

- Add `doctor` command for package and target project self-checks.
- Add `onboarding` command for the shortest beginner path.
- Add `release-check` command for publish readiness.
- Add npm pack dry-run coverage in tests.
- Update English and Chinese README files with self-check and release guidance.

## 0.5.0

- Make the CLI package distributable through npm or GitHub installation.
- Add package metadata and file allowlist.
- Add English and Chinese README files.

## 0.4.0

- Add local `ai-pm-dev` CLI with `init`, `start`, and `status`.
- Save task state to `.ai-pm-dev/state.json`.

## 0.3.0

- Add task prompt starter with Skill routing.

## 0.2.0

- Add project initializer scripts.

## 0.1.0

- Add folder-based workflow rules, 8 core Skills, templates, and memory files.
