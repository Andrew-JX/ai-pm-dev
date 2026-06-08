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
5. 拆分任务，保持每步可验证；如果预计改动超过 5 个文件，先给拆分方案。
6. 标注技术方案、数据流、接口、文件范围和风险。
7. 定义测试、构建、lint、type-check、smoke 或手动验证方式。
8. 标注是否需要更新决策记录或踩坑记录。
9. 输出开发计划，等待用户确认后再进入 Dev Builder，除非用户已明确要求直接执行。

## 禁止事项

- 不在没看代码库的情况下编造技术方案。
- 不把大范围重构伪装成必要实现。
- 不省略验证计划。
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
## 任务拆解
## 文件影响
## 风险
## 验证计划
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
