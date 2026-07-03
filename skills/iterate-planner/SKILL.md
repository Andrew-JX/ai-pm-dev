---
name: iterate-planner
description: Use after ship when product feedback needs to be triaged into the next PRD seed without turning every request into scope.
---

# Iterate Planner

## When To Use

- A shipped or handed-off product has real feedback, usage observations, or requests.
- The next PRD should be seeded from product signals, not from an unstructured wish list.
- Feedback must be separated from bugs, open questions, and progress notes.

## Boundaries

- `feedback` is a next-round product signal: user reaction, usage observation, or request.
- `bug` is a current defect with actual/expected/repro/impact/verify.
- `ask` is an unresolved question.
- `note` is a progress note.
- If feedback reveals a bug, disposition it as `bug`; do not silently copy it into the bug tracker.

## Process

1. Read the latest PRD session: `answers.json`, `scope.md`, and `ship-check.json`.
2. Read `.ai-pm-dev/feedback/product-feedback.json` and consider only entries with `status: "open"`.
3. Triage every open feedback entry exactly once:
   - `candidate`: product signal worth considering for the next PRD.
   - `cut`: real signal, but not worth next-round scope.
   - `bug`: current defect, should be handled through bug workflow.
   - `defer`: keep visible, but not for the immediate next PRD.
4. Propose at most 3 next must-have candidates.
5. Carry every previous non-goal forward unless a triaged feedback item explicitly justifies promoting it.
6. Mark exploratory candidates with `exploration: true` and a rationale so they are visible as assumptions.

## Materialization Contract

The host agent owns triage reasoning. `ai-pm-dev` owns deterministic materialization and gates. Do not call an LLM API from the CLI for this stage.

Produce this JSON for `ai-pm-dev iterate materialize --target <project> < iterate.json`:

```json
{
  "triage": [
    {
      "feedbackId": "fb-0001",
      "disposition": "candidate",
      "reason": "Users repeatedly asked for this after trying the shipped flow."
    }
  ],
  "mustHaveCandidates": [
    {
      "text": "A next-round must-have candidate.",
      "sourceFeedbackId": "fb-0001",
      "rationale": "Why this should be considered now."
    }
  ],
  "carriedNonGoals": ["Exact previous PRD non-goal text."],
  "promotedNonGoals": [],
  "seed": {
    "idea": "Optional next PRD headline override.",
    "targetUsers": "Optional inherited or refined target users.",
    "painPoints": "Optional inherited or refined pain."
  }
}
```

`mvpScope`, `oneThing`, and `nonGoals` are derived by the CLI from `mustHaveCandidates` and `carriedNonGoals`; do not provide them in `seed`.

Then gate and hand the seed to PRD:

```sh
ai-pm-dev iterate check --strict --target <project>
ai-pm-dev iterate seed --target <project> | ai-pm-dev prd --json --target <project>
```

## Stop Conditions

- Every open feedback item is dispositioned and the strict iterate gate passes.
- Or the available feedback is insufficient and the next action is to collect more product feedback.
