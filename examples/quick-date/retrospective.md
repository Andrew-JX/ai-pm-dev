# Retrospective: what the workflow caught

This is the point of the example — not that it generated documents, but that it removed
specific ways the idea could have gone wrong before any code was written.

## 1. It separated "must work" from "polish later"

The idea description was mostly UI choreography (bubbles, jelly transitions, a goblin that
cheers). The MVP-scope question forced an explicit split: the whole selection flow must
work; fine UI polish and multi-user collaboration are out of scope. That keeps a downstream
AI from spending its first slice on animations instead of the core flow.

## 2. It did not fabricate AI requirements

quickDate uses no AI. With `--type consumer`, the three AI-specific questions
(deterministic rules, AI boundary, trust/evidence) were skipped instead of forced. In the
old flow these were answered blank and produced hollow PRD sections. Now `prd check` reports
them as **WARN — mark not-applicable**, not FAIL. See [quality-report.md](quality-report.md):
`Overall: WARN (required 6/6, recommended 4/6)`.

## 3. It surfaced the real open questions

The skipped items landed in [docs/open-questions.md](docs/open-questions.md) as tracked
gaps rather than disappearing — so if the product later adds AI (e.g. suggesting date
plans), the unanswered boundary questions are already written down.

## 4. It produced a clean, resumable session

The earlier version named the session folder from a slugified long sentence and produced
junk like `yes-no-no-next`. This run produced a clean `<timestamp>-session` and filled
`docs/PROJECT_BRIEF.md` so the next tool to open the project has a real source of truth.

## What still needs a human

- `acceptance-tests.md` passed the "looks verifiable" heuristic (it has "3 minutes"), but a
  person should still confirm the flow steps match the intended UX.
- The handoffs assume no backend; if calendar reminders need server state, that becomes a
  new open question.
