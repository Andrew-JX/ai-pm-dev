---
name: dev-planner
description: Use when the user wants to start development but the technical approach, implementation sequence, dependencies, risks, or verification plan are not yet confirmed.
---

# Dev Planner

## 适用场景

- 用户准备开发，但还没有明确技术步骤。
- 需要拆任务、选方案、识别风险、定义验证。
- 需求或设计已基本确认。

## 输入要求

- Product Spec、Design Proposal、bug context, or user request.
- 当前代码库结构和已有约定。
- 目标范围、非目标和验收标准。

## 执行流程

1. 读取项目本地规则和相关文档，例如 `AGENTS.md`、`CLAUDE.md`、`README.md`、架构文档、接口约定、数据库文档或 UI 规范。
2. 读取相关代码和项目配置，先理解现有模式。
3. 用不超过 5 条要点总结本任务必须遵守的项目约束。
4. 确认实现范围和不做事项。
5. 拆成**纵向最小闭环**：每个任务是一条能端到端跑通、能单独验证的小切片（而不是横向按层堆代码），并对齐 `docs/scope.md` 的必做项；不在 scope 内的先停下确认。预计改动超过 5 个文件，先给拆分方案。
6. **每个切片先定验证、再写代码**：标注技术方案、数据流、接口、文件范围、风险，以及"这一步做完怎么算对"。
7. **标出人主导 vs AI 执行的边界**：数据结构、权限与安全边界、破坏性/不可逆变更由人确认；脚手架、CRUD、对接这类可交给 AI 执行。
8. 定义测试、构建、lint、type-check、smoke 或手动验证方式。
9. 标注做完后要更新哪些 `docs/`（决策、踩坑、进度）。
10. 输出开发计划，等用户确认后再进入 Dev Builder，除非用户已明确要求直接执行。

## 禁止事项

- 不在没看代码库的情况下编造技术方案。
- 不把大范围重构伪装成必要实现。
- 不省略验证计划，也不在没定"怎么算对"之前就排进实现。
- 不把人主导的决策（数据结构、权限/安全边界、破坏性变更）当成可由 AI 默默决定的执行项。
- 不把未确认的破坏性变更放进计划。
- 不忽略项目已有的分层、命名、文档和验证约定。

## 输出格式

```markdown
# Dev Plan

## 目标
## 范围
## 项目约束
## 现状观察
## 技术方案
## 任务拆解（纵向最小闭环）
## 分工（人主导 / AI 执行）
## 文件影响
## 风险
## 验证计划（每个切片的"算对"标准）
## 文档更新
## 待确认问题
```

## 验证标准

- 每个任务都有明确完成标准。
- 文件影响和风险清楚。
- 验证计划能覆盖主要行为。
- 超过 5 个文件的任务已经拆分，或已明确说明为什么不能拆。

## 停止条件

- 用户确认计划并要求实现。
- 技术或产品关键决策未确认。

## 维护文档 (Maintains)

负责维护项目操作层文档（位于 `docs/`）。这些为按需创建：

- `architecture.md` — 系统结构与数据流。
- `roadmap.md` — 阶段与排序。
- `acceptance-tests.md` — 把验收标准拆成可验证切片。

## AI Collaboration Hardening

Use these guardrails before handing a plan to an AI coding tool:

1. Build a context pack first: `docs/scope.md`, `docs/acceptance-tests.md`, `docs/open-questions.md`, latest PRD session, and any existing architecture/API docs.
2. Run `ai-pm-dev review-route --paths "<planned files>"` when planned files are known; include the routed docs and checks in the plan.
3. Keep each slice small enough to review. If the plan touches more than 5 files, split it or write why it cannot be split.
4. Define the human-owned decisions separately from AI-executable work: data model, permissions, destructive changes, security boundaries, migrations, external costs, and release/rollback choices need human confirmation.
5. State the verification command or manual flow before implementation starts. A slice without a verification path is not ready.
6. For larger or risky changes, require `ai-pm-dev decision-record "<title>"` before build work begins, including docs update, verification, and rollback notes.
