# ADR-004: Engineering Records Outside Project Docs

Status: Accepted

## Context

`ai-pm-dev` creates and maintains `docs/` inside target projects as part of the operating
layer. In this repository, `/docs/` is not the right place for maintainer-only release
review notes and development process memory.

## Decision

Keep maintainer development records under `engineering/`:

- `engineering/README.md` routes future readers to the right record.
- `engineering/iterations.md` holds version history and hypothesis learning.
- `engineering/reviews/` holds review records.
- `engineering/decisions/` holds ADRs.

Do not add `engineering/` to `package.json.files`; these records are not shipped in the
npm package.

## Consequences

- Runtime package contents stay focused on the CLI, Web app, skills, templates, and
  workflow core.
- Future AI-assisted work has a clear memory layer without confusing it with generated
  target-project docs.
- The old root `AI_PM_DEV_AGENT_PLAN.md` can be folded into `engineering/iterations.md`
  and removed from package metadata.
