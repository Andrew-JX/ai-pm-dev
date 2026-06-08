# Changelog

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
