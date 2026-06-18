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

## How it assists development

It does not write the code for you. It encodes a **division of labor** between you and the
AI coding tools you already use (Codex, Claude Code, v0), and keeps both sides honest so the
collaboration stays traceable and resistant to drift and hallucination.

**You own the judgment.** Requirement boundaries, what to cut, priorities, data and
permission decisions, risk limits. The tool *forces* these instead of letting them stay
vague: the PM interview caps must-haves at 3, requires a non-goal and a single metric, and
writes a `scope.md`; `prd check --strict` fails until the cutting is done.

**The AI does the execution.** Scaffolding, CRUD, wiring, drafts, tests. It works from the
project's `AGENTS.md` + `docs/`, so you don't re-explain context every session — the thing
that usually makes AI pair-programming feel like starting over each time.

**The tool keeps it traceable and hallucination-resistant:**

| Risk in AI-assisted dev | What this tool does |
| --- | --- |
| Context rebuilt every chat | Operating layer (`AGENTS.md` + `docs/`) is a single source of truth the AI reads on open |
| AI jumps straight to code | PM-challenge protocol forces rank → cut → one thing → non-goal → metric first |
| Scope / priorities never pinned | `scope.md` + `prd check --strict` gate (exit non-zero, gateable in CI/commit) |
| "Why did we decide X?" lost in chat | One-line `decide` / `pitfall` / `note` append to `decision-log.md` / `troubleshooting.md` |
| AI builds something off-spec | `code-review` does an **intent-vs-implementation reconciliation**: did the code actually deliver `acceptance-tests.md` and `scope.md`, or sneak in a non-goal |
| Docs drift from reality | `doctor` flags docs that are still empty stubs |

**The loop:** idea → forced PRD (cut scope, set the metric) → install operating layer → the
downstream AI builds by reading `AGENTS.md` → you log decisions/pitfalls as you go → review
checks the code against the PRD. It is a *soft workflow* around one capable model, not a
multi-agent system — the value is a stable, verifiable process, not agent count.

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
ai-pm-dev prd --from-note idea.md       # seed the idea from a note/chat log, skip retyping it
ai-pm-dev prd --quick                   # capture only who/what/why; let your AI run the interrogation
```

`--quick` asks just the idea, users, and pain, then hands off: open the project in your AI
tool and it runs the PM challenge (rank → cut to 3 → the one thing → a non-goal → one metric).
The unanswered items are recorded in `docs/open-questions.md`.

With `--from-note`, the first line of the file becomes the idea, the rest is saved as
`source-note.md` in the session, and the remaining questions are still asked.

`prd check` reports `PASS/WARN/FAIL`. For a product with no AI, AI-specific gaps are **WARN
("mark not-applicable")**, not FAIL.

### It forces the hard PM calls

The interview is built around cutting and prioritizing (the prompts ask for it; the form
does not nag — rigor lives in the gate below and in the downstream AI's PM-challenge protocol):

- **Must-haves are capped at 3.** Anything over the line is recorded as deferred in `scope.md`.
- **Non-goals** — name something you are deliberately *not* doing.
- **The one thing** — the single feature that proves the idea if you could ship one.
- **A single measurable success metric.**

Each session writes a `scope.md` (must-haves / the one thing / non-goals / cut list / metric).
And `prd check --strict` **exits non-zero** when these are missing, so you can gate a commit
or CI run on it:

```bash
ai-pm-dev prd check --strict   # exit 1 if scope/prioritization is not done
```

## Keep docs current (one line each)

Updating a doc should not mean opening a file. As you build, log decisions and pitfalls
inline — these append to `docs/` and `doctor` stops flagging them as empty:

```bash
ai-pm-dev decide "Ship web-only for v1" --why "fastest path to a usable demo"
ai-pm-dev pitfall "Animation pauses when the tab is hidden" --fix "resume on visibilitychange"
ai-pm-dev note "finished the end-to-end happy path"
```

`ai-pm-dev doctor` lists any core docs that are still empty stubs, so drift is visible.

For a hard gate (opt-in), install a git pre-commit hook that **blocks a commit when code
changed but `docs/` was not updated** — so the recording cannot be skipped, not even by the AI:

```bash
ai-pm-dev install-hook       # block code-only commits; record into docs/ first
ai-pm-dev uninstall-hook     # remove it
# bypass a single commit on purpose: git commit --no-verify
```

If you are building to learn, two more append into `docs/keywords.md` and
`docs/learning-log.md` (created on demand, so they don't clutter a normal project):

```bash
ai-pm-dev keyword "AOP" --explain "insert logic around methods without touching business code"
ai-pm-dev learned "login: controller validates -> service issues token -> client stores it"
```

The shipped `AGENTS.md` also tells downstream tools to explain the main request chain and to
never delete your own comments/notes — so the goal is a feature you can actually explain.

## Commands

```bash
ai-pm-dev init <target>
ai-pm-dev prd [--target <target>] [--lang <zh|en>] [--type <...>] [--from-note <file>]
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
