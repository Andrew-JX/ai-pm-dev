# AI PM Dev Agent

[中文文档](README.zh-CN.md)

AI PM Dev Agent is a local CLI agent that installs AI product development workflows into any project and generates task prompts for Codex, Claude Code, or similar AI coding tools.

It is not a web app or background service. It does these things:

1. `init`: installs `CLAUDE.md`, `skills/`, `templates/`, and `memory/` into a target project.
2. `start`: routes a task to the right Skill and generates a prompt for your AI coding tool.
3. `status`: shows the current task phase, Skill, and next step.
4. `doctor`: checks whether the package and target project are ready.
5. `onboarding`: prints the shortest beginner path.
6. `release-check`: prints the release readiness checklist.

## Install

### Option A: Install From GitHub

Use this before the package is published to npm:

```bash
npm install -g github:Andrew-JX/ai-pm-dev
```

Then run from any directory:

```bash
ai-pm-dev --help
ai-pm-dev doctor
```

### Option B: Install From npm

After npm publishing:

```bash
npm install -g ai-pm-dev
```

Then:

```bash
ai-pm-dev --help
```

## Three-Step Usage

Assume your target project is:

```text
C:\Users\15942\Desktop\11
```

Step 1, initialize the target project:

```bash
ai-pm-dev init "C:\Users\15942\Desktop\11"
ai-pm-dev doctor --target "C:\Users\15942\Desktop\11"
```

Step 2, start a task:

```bash
ai-pm-dev start "我想开始实现登录功能，请先给技术计划" --target "C:\Users\15942\Desktop\11" --save
```

Step 3, open the target project and paste the generated prompt into Codex or Claude Code:

```bash
cd "C:\Users\15942\Desktop\11"
```

Copy the content of `memory/current-task-prompt.md`.

## Commands

```bash
ai-pm-dev init <target-project>
ai-pm-dev start "<task>" --target <target-project> --save
ai-pm-dev status --target <target-project>
ai-pm-dev doctor --target <target-project>
ai-pm-dev onboarding
ai-pm-dev release-check
```

Force a route:

```bash
ai-pm-dev start "The submit page returns 500" --type bug --target "C:\Users\15942\Desktop\11" --save
```

Supported types:

```text
spec
brief
design
plan
build
bug
review
release
```

## What init Installs

```text
your-project/
  CLAUDE.md
  skills/
  templates/
  memory/
```

If `CLAUDE.md` already exists, it is backed up as:

```text
CLAUDE.ai-pm-dev-backup.md
```

Existing `memory/*.md` files are preserved.

## What start Saves

With `--save`, `start` writes:

```text
memory/current-task-prompt.md
.ai-pm-dev/state.json
```

Paste `memory/current-task-prompt.md` into your AI coding tool.

## What doctor Checks

```bash
ai-pm-dev doctor --target "C:\Users\15942\Desktop\11"
```

It checks package assets, target existence, target initialization, the 8 core Skills, generated task prompt, and task state. Failed checks include a fix command.

## What onboarding Shows

```bash
ai-pm-dev onboarding
```

It prints the shortest beginner path: initialize a project, start a task, open the prompt, and paste it into Codex or Claude Code.

## What release-check Shows

```bash
ai-pm-dev release-check
```

It prints the release checklist: `npm test`, `npm pack --dry-run`, CLI help, doctor, README checks, and package metadata checks.
It also reminds you to verify `CHANGELOG.md`.

## Developer Usage

Only use this form when developing this package itself:

```bash
cd E:\studyspace\ai-pm-dev
node bin\ai-pm-dev.mjs --help
node bin\ai-pm-dev.mjs init "C:\Users\15942\Desktop\11"
```

Do not run this from a target project:

```bash
node bin\ai-pm-dev.mjs init "C:\Users\15942\Desktop\11"
```

That only works if the current folder contains `bin/ai-pm-dev.mjs`.

## Current Boundary

v0.7 is a distributable local CLI agent with self-check and release-check commands.

It does not open Codex or Claude Code by itself, and it does not directly modify your application code. It installs workflow rules, routes tasks, generates prompts, and saves task state.
