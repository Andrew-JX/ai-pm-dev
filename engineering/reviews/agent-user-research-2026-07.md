# Agent User Research — FitMind Field Interviews (2026-07-11)

Under the agent-native thesis (ADR-005), this CLI's target users are host
agents. On 2026-07-11 the two agents actively developing FitMind — a real
167-commit project with a hand-built operating layer that predates and
inspired ai-pm-dev — were interviewed as literal target users: Claude Code
(reviewer role there) and Codex (planner/executor role there). Prompts were
read-only interludes with explicit anti-sycophancy framing ("kill/keep
decision; negative answers are more valuable").

Credibility check: both answers anchored every judgment to specific FitMind
batch IDs (AR-0b, AR-1a/1b, D49, hardening-1 T0–T3), and both freely killed
half the command surface — this is calibrated data, not flattery.

## Kill/keep verdict (command level)

| Command | Reviewer | Executor | Verdict |
| --- | --- | --- | --- |
| `review-packet` | keep (#1 pain) | keep | **Core, both votes** |
| `ship check --strict` | keep | keep IF it auto-reads gate results (not hand-filled) | **Core, both votes** — the condition = the gate-execute roadmap item, now field-validated |
| `plan check --strict` | keep | big features only; heavy for small slices | Keep, scale-dependent |
| `decide` / `decision-record` | wants the structure | genuinely used (D49) | Keep |
| `prd` family | never (past PRD phase) | stubs low value | Freeze — genesis-window only |
| `design` family | never (UI frozen) | — | Freeze |
| `dashboard` / `brief` / `onboarding` / `keyword` / `learned` | narrative layer, irrelevant to review | — | Dead |
| `note` / `pitfall` | — | duplicates progress / recurrent faults only | Dead / marginal |
| **`materialize` half of every stage** | — | "duplicates the approved plan"; "manual-fill burden" | **Dead — agents want gates, not scaffolding** |
| `init` stub seeding | — | empty stubs low value; domain docs (api-contract/db-schema/ai-decisions) win | Superseded |

Consequence: the planned `--minimal` profile (v1.8.0) is **permanently
shelved** — neither variant matters when users reject stub-seeding itself.

## The convergence: both agents independently spec'd the same missing product

- Reviewer asked for **diff-attest** (claimed changed-file list vs actual
  git diff at a pinned SHA; non-zero on mismatch) and **claim-verify**
  (reported test counts vs actually-rerun results — kills "nominal
  coverage" false greens).
- Executor asked for a **slice auditor** (baseline SHA reachable, code
  files ≤5, no out-of-scope files, full raw gate evidence).

Same product, two views: **deterministic attestation that an AI executor's
report matches git/test reality** — i.e., the automation of the pinned-SHA
review ritual used to build ai-pm-dev itself for nine audited batches.

Positioning boundary (reviewer's words, kept honest): gates verify
structure, not semantics — a real logic bug (e.g., FitMind's isAbortError /
DOMException.name) passes every structural gate. The pitch is *reduce
reviewer toil*, never *replace review*.

Why conventions alone are insufficient (three documented failures of
AGENTS.md-only discipline in FitMind): good-faith scope overrun (AR-0b
added fields beyond the approved marker set); report≠reality
(nominal-coverage test titles, self-admitted); documentation lag
(progress.md maintained by voluntarism at 4,853 lines).

## Strategic consequence

"Personal-assistant mode" and "next product" merge: keep the four-command
validated core in daily use; the next experiment is the attestation tool
(working name **slice-auditor**), reusing ai-pm-dev's DNA — deterministic,
zero-LLM, zero-network, exit codes, evidence-first — minus the PM ceremony.
It is the layer whose value *rises* as models strengthen: stronger agents
maintain docs voluntarily, but a self-reported green is untrustworthy at
any capability level.

Author's north star for the complete version (recorded verbatim in intent):
it should help whenever he builds anything with AI collaboration — from a
spur-of-the-moment toy to an enterprise AI-workflow project — whether one
agent, two, or many are doing the work.

Old roadmap (--minimal → stage-registry → MCP-for-full-surface) is
superseded by this record.
