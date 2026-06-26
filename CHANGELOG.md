# Changelog

## 1.1.1 — 2026-06-26 (Internal: workflow-core extraction)

- Extract a shared `workflow-core/` module (questions, items, doc constants, PRD gate rules, quality report, installer/PR/ownership templates); the CLI and the web API now import the same rule definitions instead of duplicating them.
- `prd check` now also writes `quality-report.json`; the web workbench reads that structured result instead of regex-parsing `quality-report.md` (shows UNKNOWN when absent).
- Bad quick-PRD JSON stdin now fails with a clean error instead of a raw SyntaxError.
- No user-facing behavior change: CLI stdout and generated markdown are unchanged.

## 1.1.0 — 2026-06-26 (Project Operating Layer + Quality Gate + Product Workbench)

Collaboration mechanisms — close the inbound side of context and record the lifecycle:

- Clarify the GitHub-facing positioning: AI PM Dev Agent is a local Idea-to-Build workflow CLI / workflow kernel, not a general agent platform or a Dify/Coze replacement.
- Add `ai-pm-dev brief`: a one-shot, paste-ready digest (one-liner, must-haves, the one thing, non-goals, open questions, recent decisions, progress, pitfalls, next step) to resume in a fresh AI session or hand to a new tool. The inbound counterpart to the outbound handoffs.
- Add `ai-pm-dev ask "<question>"`: append a clarifying question to `docs/open-questions.md` so it does not evaporate in chat; resolve it later with `decide`.
- Add `ai-pm-dev checkpoint "<phase>"` and `ai-pm-dev timeline`: record and view the session lifecycle (`prd` auto-records a checkpoint; mark build/verify/release yourself).
- Add `ai-pm-dev dashboard`: write a read-only HTML status dashboard for scope, gate status, docs health, open questions, decisions, and timeline.

Product workbench:

- Add `apps/web`: a local product workbench (Vite + React + TypeScript) that visualizes the existing CLI workflow with a phase lifecycle, artifact cards, PRD gate, and next-step guidance; it triggers quick PRD / `prd check` / checkpoint / decision through the existing CLI.
- Add a local Node API (`server.mjs`, bound to `127.0.0.1`): `/api/project`, `/api/prd`, `/api/check`, `/api/checkpoint`, `/api/note`, and `/api/decision`.
- Quick PRD input is now passed by field key (JSON stdin), not line order, avoiding silent field misalignment.
- Add root scripts: `npm run web` and `npm run web:build`.

Force the hard PM work (cut scope, set priorities) instead of only collecting answers:

- PRD interview is built around prioritization: must-haves capped at 3, a non-goal, "the one thing", and a single measurable metric. The form carries the forcing wording but does not nag — rigor lives in the gate and the downstream AI's PM-challenge protocol.
- Each PRD session and `docs/scope.md` records must-haves / the one thing / non-goals / the cut list / the metric.
- `prd check` adds required forcing checks; `prd check --strict` exits non-zero when prioritization/cutting is missing, so it can gate a commit or CI run.
- `prd check` now also checks downstream gate coupling: `docs/scope.md`, `docs/acceptance-tests.md`, and Codex/v0/Figma handoffs must still match and reference the latest PRD gates.
- Harden the scope/acceptance match so it stops false-failing on legitimate edits: multi-item fields (non-goals, the metric) are now matched per-item instead of as one whole string, so a human can reorder, re-bullet, or change casing around items in `docs/scope.md` without tripping the gate. The item text still needs to remain recognizable until structured schema support exists.
- Fix must-have miscounting: a single must-have that contains a comma (e.g. "track weight, steps and sleep") is no longer split into several. When you separate items with semicolons or new lines, commas stay inside one item, so the "≤3 must-haves" gate counts correctly.
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
- Strict mode now fails when project docs drift from the latest PRD or when handoffs stop pointing downstream tools to `ai-prd.md`, `scope.md`, and `acceptance-tests.md`.

Interview redesign:

- Add `ai-pm-dev prd --lang <zh|en>` (interactive language choice when omitted) and `--type <ai-tool|saas|consumer|internal-tool>`.
- Non-AI project types skip the three AI-specific questions and record them as open questions instead of forcing blank answers. Default (no `--type`) keeps all 12 questions.

Example:

- Add `examples/quick-date/`: a full end-to-end run (idea → PRD → docs → handoffs → quality report → retrospective).

Lower the friction of first use:

- Add `ai-pm-dev prd --from-note <file>`: seed the idea from an existing note or chat log (first line becomes the idea, the full note is saved as `source-note.md`) instead of retyping it.
- Add `ai-pm-dev prd --quick`: capture only idea/users/pain and hand the real interrogation to the downstream AI's PM-challenge protocol; unanswered items go to `docs/open-questions.md`.
- Add local adaptive PRD follow-ups: each PRD session writes `follow-up-questions.md` and appends the highest-value gap questions to `docs/open-questions.md` without calling an LLM API.
- `init` now prints concrete next steps (`prd`, `doctor`) and how downstream tools pick up the project.
- Add a `LICENSE` file (MIT) and an `engines` field (Node >= 18).

Balance the lifecycle — flesh out the development-side skills so it is a full product flow, not just product/PM:

- `dev-planner`: plan in vertical minimal slices aligned to `scope.md`, define each slice's "done = correct" before coding, and mark the human-led-vs-AI-executed boundary (data model, permission/security, destructive changes are human-confirmed).
- `dev-builder`: one minimal closed loop at a time (build → verify → next); stop and confirm before silently making a boundary decision.
- `bug-fixer`: isolate by layer (frontend/backend/db/config/deps) following logs and runtime, narrow systematically by bisection instead of guessing, and add a regression guard after the fix.
- `code-review`: focus the review on human-owned boundaries (permissions, data flow/consistency, transactions, security) where AI implementations drift most.
- `release-builder`: a "real, not a demo" check against `acceptance-tests.md` / `PROJECT_BRIEF.md`, real-user-path smoke, secrets-not-in-repo, and a rehearsed rollback.
- Harden `dev-planner`, `dev-builder`, `bug-fixer`, `code-review`, and `release-builder` with AI collaboration guardrails inspired by mature GitHub workflows: small reviewable slices, explicit context packs, routed review scope, evidence-first testing, human confirmation for risky boundaries, and rollback readiness.
- Add `ai-pm-dev workflow check` and `ai-pm-dev skill lint`: static guardrail checks for development-side skills. `--strict` exits non-zero when context, verification, risk boundary, docs update, or rollback guidance is missing.

Build-to-learn collaboration (so the project becomes capability, not just a finished feature):

- Add `ai-pm-dev keyword "<term>" --explain ...` and `ai-pm-dev learned "<own words>"`, appending to on-demand `docs/keywords.md` and `docs/learning-log.md` (no bloat for normal projects).
- `AGENTS.md` now carries a "Collaboration style" section: plain-language-first, bring-the-user-along verification, explain the main request chain, capability over speed, and never delete the user's own comments/notes.
- `dev-builder` skill strengthened to explain the request→entry→service→data→UI chain, close-read the 3–6 key files, and preserve the user's notes/comments.

Lower the cost of keeping docs current (so they drift less):

- Add one-line append commands: `ai-pm-dev decide "<decision>" [--why ...]`, `ai-pm-dev note "<progress>"`, `ai-pm-dev pitfall "<symptom>" [--cause ...] [--fix ...]`. They append to `docs/decision-log.md`, `docs/progress.md`, and `docs/troubleshooting.md` and strip the placeholder rows on first real entry.
- Add `ai-pm-dev decision-record "<title>"`: a KEP-lite record for larger changes, writing goals, non-goals, test plan, rollback plan, readiness checks, and a decision-log entry.
- Add `ai-pm-dev bug "<title>"`: a structured bug intake that requires actual behavior, expected behavior, reproduction steps, impact, and verification before writing `docs/bugs/`.
- `doctor` now lists core docs that are still empty stubs as a soft reminder to fill or remove them.
- `AGENTS.md` / `CLAUDE.md` now state the single-source-of-record rule up front: log decisions/progress/pitfalls into `docs/` via the CLI, never spin up a separate `CHANGELOG.md`/`NOTES.md` to record them. `doctor` warns when a `CHANGELOG.md` exists while `docs/decision-log.md` is still empty.
- Add `ai-pm-dev install-hook` / `uninstall-hook`: an opt-in git pre-commit gate that blocks a commit when code/content changed but `docs/` was not updated (bypass with `git commit --no-verify`). The hard enforcement layer the soft reminders could not provide.
- Add `ai-pm-dev install-pr-template`: an opt-in GitHub PR template gate that asks each PR to name the PRD session, mapped must-have, non-goal boundary, docs updates, test evidence, release note, and reviewer risks.
- Add `ai-pm-dev install-ownership` and `ai-pm-dev review-route`: local OWNERS-style routing that maps changed paths to owner skill lenses, docs to read, and checks to run.
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
