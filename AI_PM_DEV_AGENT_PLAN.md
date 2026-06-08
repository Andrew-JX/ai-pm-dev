# AI PM Dev Agent Plan

AI PM Dev Agent is a folder-based workflow system for personal AI product development.

It is not a chatbot, prompt collection, UI, or multi-agent platform. v0.1 made AI coding tools follow stable role, process, and quality rules during product development work. v0.2 adds a simple initializer so the workflow can be installed into real projects without manual copying. v0.3 adds a task prompt starter so users do not need to remember routing prompts. v0.4 adds a local Agent CLI with task state. v0.5 makes the CLI distributable through npm or GitHub installation. v0.6 adds self-check and onboarding. v0.7 adds release readiness checks. v0.8 adds local config with a default target project.

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
