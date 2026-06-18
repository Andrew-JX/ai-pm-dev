# Changelog

## Unreleased — 1.1.0 (Project Operating Layer + Quality Gate)

Force the hard PM work (cut scope, set priorities) instead of only collecting answers:

- PRD interview is built around prioritization: must-haves capped at 3, a non-goal, "the one thing", and a single measurable metric. The form carries the forcing wording but does not nag — rigor lives in the gate and the downstream AI's PM-challenge protocol.
- Each PRD session and `docs/scope.md` records must-haves / the one thing / non-goals / the cut list / the metric.
- `prd check` adds required forcing checks; `prd check --strict` exits non-zero when prioritization/cutting is missing, so it can gate a commit or CI run.
- `AGENTS.md` adds a "PM challenge" protocol and the `product-spec-builder` / `prd-generator` skills now mandate it: before writing a spec/PRD/feature, the downstream AI must make the user rank, cut to 3, pick the one thing, name a non-goal, and commit to one metric — pushing back instead of being agreeable.
- Sharpen the PM challenge with two techniques borrowed from established PM practice: assumption red-teaming (surface load-bearing assumptions, rank by cheapest disproving test) and a pre-mortem (imagine v1 failed — why?).
- `code-review` skill now does an intent-vs-implementation reconciliation: check the code actually delivers `docs/acceptance-tests.md` and `docs/scope.md` must-haves and did not sneak in a non-goal; report each divergence (claims X, does Y, where) as its own finding.


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

Lower the friction of first use:

- Add `ai-pm-dev prd --from-note <file>`: seed the idea from an existing note or chat log (first line becomes the idea, the full note is saved as `source-note.md`) instead of retyping it.
- Add `ai-pm-dev prd --quick`: capture only idea/users/pain and hand the real interrogation to the downstream AI's PM-challenge protocol; unanswered items go to `docs/open-questions.md`.
- `init` now prints concrete next steps (`prd`, `doctor`) and how downstream tools pick up the project.
- Add a `LICENSE` file (MIT) and an `engines` field (Node >= 18).

Balance the lifecycle — flesh out the development-side skills so it is a full product flow, not just product/PM:

- `dev-planner`: plan in vertical minimal slices aligned to `scope.md`, define each slice's "done = correct" before coding, and mark the human-led-vs-AI-executed boundary (data model, permission/security, destructive changes are human-confirmed).
- `dev-builder`: one minimal closed loop at a time (build → verify → next); stop and confirm before silently making a boundary decision.
- `bug-fixer`: isolate by layer (frontend/backend/db/config/deps) following logs and runtime, narrow systematically by bisection instead of guessing, and add a regression guard after the fix.
- `code-review`: focus the review on human-owned boundaries (permissions, data flow/consistency, transactions, security) where AI implementations drift most.
- `release-builder`: a "real, not a demo" check against `acceptance-tests.md` / `PROJECT_BRIEF.md`, real-user-path smoke, secrets-not-in-repo, and a rehearsed rollback.

Build-to-learn collaboration (so the project becomes capability, not just a finished feature):

- Add `ai-pm-dev keyword "<term>" --explain ...` and `ai-pm-dev learned "<own words>"`, appending to on-demand `docs/keywords.md` and `docs/learning-log.md` (no bloat for normal projects).
- `AGENTS.md` now carries a "Collaboration style" section: plain-language-first, bring-the-user-along verification, explain the main request chain, capability over speed, and never delete the user's own comments/notes.
- `dev-builder` skill strengthened to explain the request→entry→service→data→UI chain, close-read the 3–6 key files, and preserve the user's notes/comments.

Lower the cost of keeping docs current (so they drift less):

- Add one-line append commands: `ai-pm-dev decide "<decision>" [--why ...]`, `ai-pm-dev note "<progress>"`, `ai-pm-dev pitfall "<symptom>" [--cause ...] [--fix ...]`. They append to `docs/decision-log.md`, `docs/progress.md`, and `docs/troubleshooting.md` and strip the placeholder rows on first real entry.
- `doctor` now lists core docs that are still empty stubs as a soft reminder to fill or remove them.
- `AGENTS.md` / `CLAUDE.md` now state the single-source-of-record rule up front: log decisions/progress/pitfalls into `docs/` via the CLI, never spin up a separate `CHANGELOG.md`/`NOTES.md` to record them. `doctor` warns when a `CHANGELOG.md` exists while `docs/decision-log.md` is still empty.
- Add `ai-pm-dev install-hook` / `uninstall-hook`: an opt-in git pre-commit gate that blocks a commit when code/content changed but `docs/` was not updated (bypass with `git commit --no-verify`). The hard enforcement layer the soft reminders could not provide.
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
