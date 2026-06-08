# AI PM Dev Agent

[中文文档](README.zh-CN.md)

A local AI product development agent for installing workflow rules, routing tasks, and tracking the current task state.

v0.4 provides a local CLI agent. It installs reusable rules and Skills into real projects, generates task-specific prompts, routes work into the right Skill, and remembers the current task state.

## What It Is

AI PM Dev Agent is currently a local workflow agent, not a hosted service.

It gives you:

- `CLAUDE.md`: top-level routing rules.
- `skills/`: task workflows for spec, design, planning, building, debugging, review, and release.
- `templates/`: reusable output templates.
- `memory/`: feedback and improvement logs.
- `ai-pm-dev`: a local CLI that installs the workflow, starts tasks, and reads task state.

## Correct Ways To Run It

### Option A: Global Command, Recommended

Run this once from the `ai-pm-dev` repository:

```bash
cd E:\studyspace\ai-pm-dev
npm link
```

Then you can run this from any folder:

```bash
ai-pm-dev init "C:\Users\15942\Desktop\11"
ai-pm-dev start "我想开始实现登录功能，请先给技术计划" --target "C:\Users\15942\Desktop\11" --save
ai-pm-dev status --target "C:\Users\15942\Desktop\11"
```

### Option B: Absolute Path, No Global Link

Use this from any folder:

```bash
node E:\studyspace\ai-pm-dev\bin\ai-pm-dev.mjs init "C:\Users\15942\Desktop\11"
```

### Option C: Repository-Relative, For Development

This only works after you `cd` into the `ai-pm-dev` repository:

```bash
cd E:\studyspace\ai-pm-dev
node bin\ai-pm-dev.mjs init "C:\Users\15942\Desktop\11"
```

This does not work from the target project unless that target project already contains `bin/ai-pm-dev.mjs`.

## Commands

```bash
ai-pm-dev init <target>
ai-pm-dev start "<task>" --target <target> --save
ai-pm-dev status --target <target>
```

`init` copies this workflow pack into the target project:

```text
your-project/
  CLAUDE.md
  skills/
  templates/
  memory/
```

It backs up an existing `CLAUDE.md` to `CLAUDE.ai-pm-dev-backup.md`, merges `skills/` and `templates/`, and does not overwrite existing `memory/*.md` logs.

`start --save` writes:

```text
memory/current-task-prompt.md
.ai-pm-dev/state.json
```

Then open Codex, Claude Code, or another AI coding tool from the target project root and paste the generated prompt.

## Examples

```bash
ai-pm-dev start "我想开始实现登录功能，请先给技术计划" --target "C:\Users\15942\Desktop\11" --save
```

```bash
ai-pm-dev start "页面提交后报 500" --type bug --target "C:\Users\15942\Desktop\11" --save
```

```bash
ai-pm-dev status --target "C:\Users\15942\Desktop\11"
```

## Lower-Level Scripts

The CLI wraps these scripts:

- `scripts/init-ai-pm-dev.mjs`
- `scripts/start-task.mjs`

Windows PowerShell wrappers are also available:

```powershell
.\scripts\init-ai-pm-dev.ps1 -Target "E:\path\to\your-project"
.\scripts\start-task.ps1 -Task "I want a development plan first"
```

## Test

```bash
npm test
```

## Current Version

v0.4 is intentionally simple: files, Skills, templates, memory logs, an initializer, a task starter, and a local Agent CLI with saved task state.
