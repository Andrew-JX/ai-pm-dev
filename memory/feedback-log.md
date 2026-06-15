# Feedback Log

Record user corrections, preferences, dissatisfaction, and repeated friction here.

Do not promote feedback into rules automatically.

## Entries

| Date | Context | Feedback | Action |
| --- | --- | --- | --- |
| 2026-06-15 | First real `ai-pm-dev prd --target .` use in `E:\studyspace\quickDate` for a playful mobile dating mini-app idea | The interview felt too long and somewhat hard to answer. The user wants an upfront Chinese/English language choice. The challenge is to keep the question count low while still capturing the whole product idea. Several later AI-related questions were left blank because the product does not need AI behavior. | Keep for v1.1 PRD interview redesign: add language selection, shorter adaptive question flow, project-type-aware questions, and skip/mark-not-applicable handling. |
| 2026-06-15 | Trying to hand off the generated `quickDate` package to Claude Code | If the user still needs to ask what to say to Claude Code or Codex after generating the package, AI PM Dev is adding friction instead of removing it. The project should install durable, project-local instructions and constraints so downstream tools automatically know how to read PRD assets, ask clarifying questions, update boundaries, produce structured outputs, and keep documentation records. | Treat this as a product-positioning correction: AI PM Dev should not only generate one-time prompts; it should create a reusable project operating layer for downstream AI coding tools. |
| 2026-06-15 | Comparing AI PM Dev with the FitMind project structure | FitMind works because the project contains durable AI-readable constraints: `AGENTS.md`, `docs/PROJECT_BRIEF.md`, architecture/API/UI/state/progress/troubleshooting docs, and ongoing documentation updates. AI PM Dev should use its Skills to create and maintain a similar docs-and-rules layer in every target project. | Add a v1.1 project operating layer: generate `AGENTS.md`, structured `docs/`, memory files, and skill-to-doc update rules during `init` and `prd` workflows. |
