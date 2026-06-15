# AI PM Dev Agent

[Chinese README](README.zh-CN.md)

AI PM Dev Agent is a local CLI workflow agent for AI-assisted product development. It helps turn a rough product idea into a structured AI-PRD, prototype brief, and downstream prompts for Codex, v0, Figma, Claude Code, or similar AI tools.

It is not just a one-shot prompt generator. v1.0 adds an interactive PM interview workflow that asks the missing product questions first, saves the conversation, and turns the answers into reusable project assets.

## Install

```bash
npm install -g github:Andrew-JX/ai-pm-dev
```

After npm publishing:

```bash
npm install -g ai-pm-dev
```

## Recommended Workflow

Open any product project and initialize the workflow once:

```bash
cd <your-product-project>
ai-pm-dev init .
ai-pm-dev doctor
```

Run an interactive PRD session:

```bash
ai-pm-dev prd
```

The CLI asks structured PM interview questions about users, pain, workflow, MVP scope, data, deterministic rules, AI boundaries, trust, risks, and acceptance criteria.

It then writes:

```text
.ai-pm-dev/prd-sessions/<timestamp-slug>/
  conversation.md
  answers.json
  ai-prd.md
  prototype-brief.md
  handoff-codex.md
  handoff-v0.md
  handoff-figma.md
  risks.md
  acceptance-tests.md
memory/current-ai-prd.md
memory/current-task-prompt.md
.ai-pm-dev/state.json
```

Send a handoff prompt to a downstream tool:

```bash
ai-pm-dev prd handoff --to codex
ai-pm-dev prd handoff --to v0
ai-pm-dev prd handoff --to figma
```

## Commands

```bash
ai-pm-dev init <target-project>
ai-pm-dev prd [--target <target-project>] [--lang <zh|en>] [--type <ai-tool|saas|consumer|internal-tool>]
ai-pm-dev prd status [--target <target-project>]
ai-pm-dev prd check [--target <target-project>]
ai-pm-dev prd handoff --to <codex|v0|figma> [--target <target-project>]
ai-pm-dev start "<task>" --target <target-project> --save
ai-pm-dev status --target <target-project>
ai-pm-dev doctor --target <target-project>
ai-pm-dev config set target <target-project>
ai-pm-dev config get
ai-pm-dev config clear
ai-pm-dev onboarding
ai-pm-dev release-check
```

## Classic AI Coding Task Routing

`start` still routes implementation work to a Skill and generates a task prompt:

```bash
ai-pm-dev start "The submit page returns 500" --type bug --save
ai-pm-dev start "Prepare this release" --type release --save
```

Supported `start --type` values:

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

If `CLAUDE.md` already exists, it is backed up as `CLAUDE.ai-pm-dev-backup.md`. Existing memory files are preserved.

## Current Boundary

v1.0 is a local workflow kernel. It does not call an LLM API, automate Axure, run Dify, or execute multiple agents by itself. It creates structured PM assets and handoff prompts that make downstream AI tools work with clearer context and quality gates.
