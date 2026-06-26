# ADR-002: Tags, Not Long-Lived Version Branches

Status: Accepted

## Context

The project needs durable release snapshots while still moving quickly through short
AI-assisted implementation and review loops.

## Decision

Use annotated Git tags for immutable version snapshots:

- `v1.0.0` marks the console CLI before the Web workbench.
- `v1.1.0` marks the Phase 1 product workbench.
- `v1.1.1` marks the workflow-core internal refactor.

Keep `master` as the release line, and use short-lived `codex/*` branches for reviewable
work. Do not maintain long-lived version branches unless a future support policy requires
them.

## Consequences

- Release history remains linear and easy to audit.
- Feature branches stay disposable after review and landing.
- Historical versions are recoverable from tags without splitting active development
  across multiple branch lines.
