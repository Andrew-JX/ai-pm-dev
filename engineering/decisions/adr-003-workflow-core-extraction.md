# ADR-003: Shared Workflow Core

Status: Accepted

## Context

Before v1.1.1, the CLI and Web API duplicated workflow rules. The Web side also parsed
human-readable quality report markdown to recover gate status, which made shared rules
and structured state fragile.

## Decision

Move shared questions, item parsing, document constants, PRD gate rules, quality report
builders, installer templates, and ownership routing helpers into root `workflow-core/`.
Both `bin/ai-pm-dev.mjs` and `apps/web/server/*` import those definitions.

`prd check` continues to write the same markdown and stdout, and additionally writes
`quality-report.json`. The Web workbench reads that JSON snapshot. If it is absent, the
gate is `UNKNOWN` and the user should run `prd check`; Web does not live-recalculate old
markdown reports.

## Consequences

- CLI and Web use one rule source.
- Human markdown remains stable for users.
- Web state no longer depends on regex parsing prose.
- Behavior-preserving refactors need characterization tests around paths, ordering, and
  generated output.
