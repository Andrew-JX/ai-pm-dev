# Dogfood: running the prd → plan → ship chain on a real feature (v1.4.0)

Subject: the proposed `review-packet` command. Driver: reviewer (Claude) acting
as the host agent, using the real CLI against an isolated scratch target. Goal:
find out whether the discipline helps or is ceremony, before extending further.

## What was exercised

- `ai-pm-dev init` + `prd` (type internal-tool, answers via stdin) + `prd check`.
- `plan materialize` (host-authored dev-plan JSON) + `plan check --strict`.
- `ship materialize` (deliberately empty ship-check) + `ship check --strict`.

## Observed results

- PRD: `Overall: WARN (required 15/15, recommended 3/6)`. All required gates
  passed — the flow forced the one thing, <=3 must-haves, a non-goal, and a
  metric. It could not be hand-waved.
- Plan: `Overall: PASS (required 13/13)`. The gate forced every PRD must-have to
  map to a slice, the first slice to prove the one thing, a verification per
  slice, and reviewable slice size. The plan is traceable back to the PRD.
- Ship (empty evidence): `Overall: FAIL (required 6/12)`, `ship check --strict`
  exit code 1. Named failures: one thing not shipped, must-haves not covered,
  no acceptance evidence, no verification evidence, non-goals not held, no
  rollback. The gate blocks a premature "ready" claim and is CI-gateable.

## Verdict

For this feature the discipline helped more than it cost. The gates bite: they
force the PM cut, plan-to-PRD traceability, and an evidence-based ship bar, all
offline/deterministic and usable as a commit/CI gate. The core hypothesis — that
a disciplined idea→ship chain is worth the process — held under real use.

## Friction found (fixable, ergonomic — not conceptual)

1. Non-interactive PRD is line-order fragile. Full `prd` from stdin expects
   answers as ordered lines; only `--quick` accepts JSON by key (3 fields). A
   `prd --json` full-field mode is needed for scripted/agent/CI PRD creation.
2. Project-type filter disagrees with recommended gates. `--type internal-tool`
   skips the AI questions (fields left empty), yet the recommended
   `ai-boundary-declared` / `deterministic-rules-declared` gates still WARN.
   Declaring a non-AI product should not raise AI-related warnings.
3. Human routing is the real cost: hand-authoring the verbose dev-plan/ship-check
   JSON and moving artifacts between executor and reviewer is heavy. This
   re-confirms the need for the `review-packet` command being dogfooded.
4. Ship is only meaningful after a real build; the gate correctly rejects empty
   evidence, reaffirming that ai-pm-dev is a discipline/artifact layer, not a
   builder.

## Follow-ups opened

- Fix friction 1 (`prd --json`) and 2 (type/WARN consistency).
- Build the `review-packet` command through the same chain to close the loop.
