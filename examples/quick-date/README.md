# Example: quickDate (end-to-end)

A complete run of the AI PM Dev workflow on one real idea: a playful dating-plan
mini-app. It shows how a single one-line idea becomes a structured PRD, project docs,
downstream handoffs, and a quality report — without writing any prompt by hand.

## The idea (one line)

> 一个搞怪好玩的约会计划小程序：从"愿意和我约会吗"开始，依次选择日期时间、吃什么、想做的活动，最后生成一份约会计划。

A consumer product with no AI, so it was run with `--type consumer --lang zh`.

## Commands used

```bash
mkdir quickDate && cd quickDate
ai-pm-dev init .
ai-pm-dev prd --type consumer --lang zh
ai-pm-dev prd check
```

## View it in the Phase 1 workbench

From this repository root:

```bash
npm install
npm run web --workspace apps/web
```

Then set the target path to `examples/quick-date`. The workbench should show the existing
PRD assets, scope, gate state, open questions, decisions, and next action without generating
new code or running agents.

## What got generated (curated here)

| File | What it is |
| --- | --- |
| [answers.json](answers.json) | The raw interview answers |
| [ai-prd.md](ai-prd.md) | The structured AI-PRD |
| [docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md) | Project operating-layer brief (read by Claude Code / Codex) |
| [docs/acceptance-tests.md](docs/acceptance-tests.md) | Verifiable acceptance scenarios |
| [docs/open-questions.md](docs/open-questions.md) | Gaps the workflow flagged automatically |
| [handoff-codex.md](handoff-codex.md) | Implementation handoff for Codex / Claude Code |
| [handoff-v0.md](handoff-v0.md) | Prototype handoff for v0 |
| [quality-report.md](quality-report.md) | `prd check` output |
| [retrospective.md](retrospective.md) | What this workflow caught |

In a real project, `init` also installs `AGENTS.md`, the rest of `docs/`, `skills/`, and
`memory/` so a downstream tool that opens the folder knows how to work. Those are omitted
here to keep the example readable.
