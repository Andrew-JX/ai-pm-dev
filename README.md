# AI PM Dev Agent

[中文 README](README.zh-CN.md)

Turn a rough product idea into a structured PRD **and a project that downstream AI coding
tools (Claude Code, Codex, v0, Figma) already know how to work in** — without writing a
prompt by hand.

`ai-pm-dev` is a local CLI. It does two things:

1. **Interviews you** about a product idea and generates an AI-PRD, prototype brief, and
   tool-specific handoffs.
2. **Installs a project operating layer** — an `AGENTS.md` entry file plus a `docs/` set
   (project brief, UI spec, acceptance tests, decision log, open questions, …) that any AI
   tool reads when it opens the folder, so it knows the before/after-task protocol, the MVP
   boundary, and which docs to update.

It does **not** call an LLM API, run Dify, or execute agents itself. It prepares the context
and quality gates that make the tools you already use produce better, more consistent work.

## See it work

[`examples/quick-date/`](examples/quick-date/) is a full end-to-end run on one real idea:
idea → interview → AI-PRD → project docs → Codex/v0 handoffs → quality report → a
[retrospective](examples/quick-date/retrospective.md) of what the workflow caught.

## Requirements

- Node.js 18 or newer (`node -v`)

## Install

```bash
npm install -g github:Andrew-JX/ai-pm-dev
```

Try it without installing globally:

```bash
npx github:Andrew-JX/ai-pm-dev --help
```

## Quickstart (60 seconds)

```bash
mkdir my-product && cd my-product
ai-pm-dev init .          # install the operating layer into this folder
ai-pm-dev prd             # answer the PM interview (use --lang zh for Chinese)
ai-pm-dev prd check       # score the PRD; writes quality-report.md
ai-pm-dev doctor          # confirm everything is in place
```

## Then hand it to a coding tool — two ways

**A. Open the folder (recommended).** Open `my-product` in Claude Code or Codex. They read
`AGENTS.md` automatically, which points them to `docs/PROJECT_BRIEF.md` and the rest. You can
just say:

> Continue with this project's AI PM Dev workflow.

**B. Paste a handoff prompt.** If your tool does not auto-read project files, copy a
tool-specific prompt:

```bash
ai-pm-dev prd handoff --to codex
ai-pm-dev prd handoff --to v0
ai-pm-dev prd handoff --to figma
```

## What `init` installs

```text
my-product/
  AGENTS.md          # entry file: before/after-task protocol, docs manifest, routing
  CLAUDE.md          # thin pointer to AGENTS.md
  docs/
    PROJECT_BRIEF.md  UI_SPEC.md  acceptance-tests.md
    decision-log.md   open-questions.md  progress.md  troubleshooting.md
  skills/            # 9 role skills (spec, design, plan, build, bug-fix, review, release, prd)
  templates/         # reusable artifact templates
  memory/            # feedback log, rule candidates, skill-improvement log
```

`prd` then fills `PROJECT_BRIEF.md`, `UI_SPEC.md`, and `acceptance-tests.md`, appends to
`decision-log.md`, and records any blank answers in `open-questions.md`. Existing files you
have edited are preserved — only unfilled stubs are seeded. If `CLAUDE.md`/`AGENTS.md`
already exist they are backed up as `*.ai-pm-dev-backup.md`.

## PRD options

```bash
ai-pm-dev prd --lang zh                 # interview in Chinese (default: en, or asks)
ai-pm-dev prd --type consumer           # skip AI-only questions for a non-AI product
ai-pm-dev prd --type ai-tool|saas|consumer|internal-tool
```

`prd check` reports `PASS/WARN/FAIL`. For a product with no AI, AI-specific gaps are **WARN
("mark not-applicable")**, not FAIL.

## Keep docs current (one line each)

Updating a doc should not mean opening a file. As you build, log decisions and pitfalls
inline — these append to `docs/` and `doctor` stops flagging them as empty:

```bash
ai-pm-dev decide "Ship web-only for v1" --why "fastest path to a usable demo"
ai-pm-dev pitfall "Animation pauses when the tab is hidden" --fix "resume on visibilitychange"
ai-pm-dev note "finished the end-to-end happy path"
```

`ai-pm-dev doctor` lists any core docs that are still empty stubs, so drift is visible.

## Commands

```bash
ai-pm-dev init <target>
ai-pm-dev prd [--target <target>] [--lang <zh|en>] [--type <ai-tool|saas|consumer|internal-tool>]
ai-pm-dev prd status [--target <target>]
ai-pm-dev prd check [--target <target>]
ai-pm-dev prd handoff --to <codex|v0|figma> [--target <target>]
ai-pm-dev start "<task>" --type <type> --target <target> --save
ai-pm-dev decide "<decision>" [--why <reason>] [--target <target>]
ai-pm-dev note "<progress note>" [--target <target>]
ai-pm-dev pitfall "<symptom>" [--cause <c>] [--fix <f>] [--target <target>]
ai-pm-dev status  [--target <target>]
ai-pm-dev doctor  [--target <target>]
ai-pm-dev config  set target <target> | get | clear
ai-pm-dev onboarding
ai-pm-dev release-check
```

## Routing a coding task (without a full PRD)

`start` routes an implementation task to a Skill and generates a prompt:

```bash
ai-pm-dev start "The submit page returns 500" --type bug --save
```

Supported `--type`: `spec`, `brief`, `design`, `plan`, `build`, `bug`, `review`, `release`.

## Windows / PowerShell

The CLI files are UTF-8. If Chinese output looks garbled in the terminal, switch the console
to UTF-8 (`chcp 65001`, or `$OutputEncoding = [Text.Encoding]::UTF8`). The files themselves
are fine — it is only a console display setting.

## Current boundary

A local workflow kernel: no LLM API calls, no Axure/Dify automation, no self-running
multi-agent execution. It produces structured PM assets, a project operating layer, and
quality gates so downstream AI tools work with clearer context.
