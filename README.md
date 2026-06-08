# AI PM Dev Agent

A folder-based AI product development workflow system with a one-command project initializer and task prompt starter.

v0.3 focuses on making the workflow easier to start after installation. It copies reusable rules and Skills into real projects, then generates task-specific prompts that route common product development work into stable workflows: specification, design, planning, implementation, debugging, review, and release.

## Use

AI PM Dev Agent v0.3 does not need a server, UI, hooks, or automation.

Recommended on Windows PowerShell:

```powershell
.\scripts\init-ai-pm-dev.ps1 -Target "E:\path\to\your-project"
```

Cross-platform Node usage:

```bash
node scripts/init-ai-pm-dev.mjs --target /path/to/your-project
```

macOS, Linux, or Git Bash:

```bash
./scripts/init-ai-pm-dev.sh --target /path/to/your-project
```

The initializer copies this workflow pack into the target project:

```text
your-project/
  CLAUDE.md
  skills/
  templates/
  memory/
```

It backs up an existing `CLAUDE.md` to `CLAUDE.ai-pm-dev-backup.md` before replacing it. It merges `skills/` and `templates/`, and it does not overwrite existing `memory/*.md` logs.

Then start Codex, Claude Code, or another AI coding tool from the target project root and say:

```text
请先阅读 CLAUDE.md，并按其中的 AI PM Dev Agent 流程工作。
当前任务是：...
```

This is the most stable mode because the AI can read both the workflow rules and the real project files in the same workspace.

Useful options:

```bash
node scripts/init-ai-pm-dev.mjs --target /path/to/project --dry-run
node scripts/init-ai-pm-dev.mjs --target /path/to/project --include-readme
node scripts/init-ai-pm-dev.mjs --target /path/to/project --force
```

Manual fallback: copy `CLAUDE.md`, `skills/`, `templates/`, and `memory/` into the project root yourself.

## Start A Task

After initialization, you can generate the prompt for the next AI coding conversation:

```powershell
.\scripts\start-task.ps1 -Task "我想开始实现登录功能，请先给技术计划"
```

Cross-platform Node usage:

```bash
node scripts/start-task.mjs --task "我想开始实现登录功能，请先给技术计划"
```

Force a route when needed:

```bash
node scripts/start-task.mjs --type bug --task "页面提交后报 500"
```

Save the generated prompt into a project:

```bash
node scripts/start-task.mjs --task "准备发布这个版本" --target /path/to/project --save
```

This writes `memory/current-task-prompt.md`.

## Manual Prompt Template

```text
你现在在一个使用 AI PM Dev Agent v0.3 的项目里工作。

开始任务前请先：
1. 阅读 CLAUDE.md
2. 根据任务类型选择对应 skills/*/SKILL.md
3. 如果是开发任务，先读取项目本地规则和相关 docs
4. 先给 Plan，不要直接写代码，除非我明确要求直接执行

当前任务：
[写你的任务]
```

## Task Examples

Start with one of these task types:

- Describe a product idea or feature request.
- Ask for a design brief or UI direction.
- Ask for a development plan.
- Ask to implement a confirmed plan.
- Report a bug or failing test.
- Ask for code review.
- Prepare a release.

Examples:

```text
我有一个功能想法：用户可以上传训练记录截图，系统帮他整理成结构化训练日志。请按流程先帮我整理产品规格。
```

```text
我想开始实现登录功能。请先不要写代码，按 Dev Planner 给我技术计划、涉及文件、风险和验证方式。
```

```text
计划确认，开始实现。严格按刚才的 Dev Plan 执行，超过 5 个文件先停下来拆分。
```

```text
现在 pnpm test 失败，错误是 [...]. 请按 Bug Fixer 先收集证据和定位根因，不要直接猜。
```

## What To Copy Into A New Project

If you are not using the initializer, copy these:

- `CLAUDE.md`
- `skills/`
- `templates/`
- `memory/`

Optional:

- `AI_PM_DEV_AGENT_PLAN.md` if you want to keep the method roadmap in the project.
- `README.md` if this folder itself is the product being maintained.

## Current Version

v0.3 is intentionally simple: files, Skills, templates, memory logs, one initializer, and one task prompt starter.

## Lessons From FitMind

This workflow was seeded from a real project workflow:

- Read local project rules before touching code.
- Use `Plan -> Confirm -> Execute -> Verify -> Document` for meaningful changes.
- Split work when one task becomes too large to review.
- Treat core logic as something the user must be able to explain.
- Record important decisions and debugging lessons so the next task starts smarter.

## When To Update The Workflow

Update this workflow when:

- You repeat the same correction 3 times.
- A Skill causes the AI to skip an important step.
- A validation step catches a bug that should become part of the process.
- A project like FitMind reveals a reusable development rule.

Do not promote one-off preferences into permanent rules immediately. Record them in `memory/feedback-log.md` first.
