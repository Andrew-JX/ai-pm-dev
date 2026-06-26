# ADR-001: Web Workbench as CLI Wrapper

Status: Accepted

## Context

Phase 1 needed a productized Web workbench without replacing the existing CLI workflow
kernel. The CLI already owned PRD generation, quality checks, checkpointing, and project
state conventions.

## Decision

`apps/web` is a local product workbench around the CLI. It reads project state, renders
the phase lifeline and artifacts, and calls the existing CLI for quick PRD generation,
`prd check`, checkpoint, note, and decision actions.

Phase 1 intentionally does not introduce a new LLM path, node editor, agent runtime, or
demo-code generator.

## Consequences

- The Web surface can improve product ergonomics while the CLI remains the workflow
  source of truth.
- Runtime behavior stays easier to test because Web actions route through existing CLI
  commands.
- Deeper orchestration, visual graph editing, and agent execution remain separate
  Phase 2/3 decisions.
