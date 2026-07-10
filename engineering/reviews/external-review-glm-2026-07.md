# External Review Response — GLM-5.2 (2026-07-09)

An unsolicited external model review (GLM-5.2) assessed the whole project. This
record keeps the verdicts and the roadmap decisions they produced, so future
rounds do not re-litigate the same points.

Reviewed against source at `5bb5d30` (post v1.7.0 A1/A2 batches).

## Accepted findings → roadmap changes

| Finding | Verdict | Action |
| --- | --- | --- |
| `bin/ai-pm-dev.mjs` is a ~3,240-line god-file; command routing, doc builders, gate orchestration and templates are mixed | Correct — matched our own 2026-07-05 audit | Already scheduled: stage-registry refactor (kill the 4 copy-pasted stdin readers and the 5 parallel per-stage function families) before any 7th stage |
| Default flow is too heavy for solo/small projects; forced-PM ritual may push away the stated core user | Correct — independently rediscovered our own 2026-06-16 dogfood finding ("suggestion, not constraint"; over-engineered for small projects) | User-confirmed 2026-07-09: build a `--minimal` profile (fewer interview questions, fewer doc seeds, gate keeps the core trio: must-haves ≤3 + non-goal + oneThing). Scheduled after the v1.7.1 security batch |
| Install layer only covers Claude Code / Codex; ecosystem coverage gap (incl. domestic tools) | Partially correct — the premise errors (Cursor does read AGENTS.md; web-chat users were deliberately cut in ADR-005), but the coverage gap is real | User-confirmed: **MCP-first, no bespoke per-tool adapters.** A thin MCP server over `workflow-core` covers Cursor + domestic MCP-capable tools generically and replaces the deferred cross-agent install layer |
| No coverage metric; test script is a serial `&&` chain | The half that is correct | Ride-along item on the refactor: migrate to the built-in `node:test` runner (zero new deps, parallelism + coverage) |
| Untyped codebase at a size that wants types | Right direction, wrong dose | User-confirmed: JSDoc + `// @ts-check` + `tsc --noEmit` in CI, plus publishing formal JSON Schemas for `dev-plan/design/ship-check/iterate` JSON (the schemas double as MCP tool definitions). Full TS migration rejected: the real input boundary is host-agent JSON on stdin, where runtime validators — not compile-time types — are the contract, and `bin` keeps its zero-build property |

## Rejected findings — grounds

- **"No assertion library / weak test base."** All 16 suites use
  `node:assert/strict` uniformly; zero-dependency is deliberate and consistent
  with the CLI's zero-dependency ethos; `workflow-core` has unit-level
  characterization coverage (not E2E-only as claimed); the suite has caught
  real regressions at review time at least three times (mojibake, a silently
  dropped WARN fallback, CHANGELOG double-counting).
- **"Too much meta-work; cut the process docs."** `engineering/` is not shipped
  in the npm package, is the dogfooding evidence, and carries portfolio value.
  The real fix for "process over product" is finding real users (roadmap ⑥),
  not deleting records.
- **"The tool should run `prd check --strict` on its own code structure."**
  Category confusion: PRD gates gate product artifacts, not code architecture.
  The honest version of this critique — dogfood your own chain — was already
  done for v1.4.0 (`dogfood-v1.4.0-review-packet-chain.md`), and the code-debt
  half is the scheduled refactor.

Minor factual slips in the review, for the record: 10 skills, not 9; tests are
not E2E-only.

## Resulting sequence

v1.7.0 (CLI-only) → v1.7.1 security (bundle-scan test + web `/api` CSRF) →
`--minimal` profile → stage-registry refactor (+ `node:test`) → MCP server +
JSON Schemas + JSDoc/ts-check + gate-execute → real users.
