---
name: release-builder
description: Use when the user is preparing a build, deployment, handoff, delivery, changelog, release checklist, or final verification before shipping.
---

# Release Builder

## 适用场景

- 准备构建、部署、上线、交付或发版。
- 需要 release checklist、变更说明、验证记录。
- 发布前需要确认风险和回滚方式。

## 输入要求

- 发布范围、目标环境、版本或变更列表。
- 构建、测试、部署命令。
- 已知风险、迁移、配置或回滚要求。

## 执行流程

1. 确认发布范围和目标环境。
2. 汇总变更、用户影响和风险。
3. **真实性检查**：对照 `docs/acceptance-tests.md` 和 `docs/PROJECT_BRIEF.md`，确认它真的解决了用户的问题、验收点都过了，而不只是一个能跑起来的 demo。
4. 运行或列出构建验证、测试验证、类型检查、lint，以及**覆盖真实用户路径的 smoke**（不是只跑单测）。
5. 检查配置、环境变量、密钥（不入库）、端口、数据迁移，并**演练一次回滚**；确认监控到位。
6. 检查关键决策、踩坑和用户可见变更是否已记进 `docs/`。
7. 输出 release checklist 和发布说明。
8. 标注是否 ready，以及阻塞项。

## 禁止事项

- 不在 checklist 未完成时宣称 ready。
- 不把"能跑的 demo"当成"解决了用户的真实问题"。
- 不忽略回滚和配置检查，也不把密钥写进代码或仓库。
- 不把未验证的构建当成可发布。
- 不自动部署，除非用户明确要求。
- 不把单元测试通过等同于发布就绪；发布前必须覆盖环境和真实用户路径。

## 输出格式

```markdown
# Release

## 发布范围
## 变更摘要
## Checklist
## 验证记录
## 文档记录
## 风险与回滚
## 发布说明
## Ready 状态
```

## 验证标准

- checklist 覆盖构建、测试、配置、回滚。
- ready 状态基于证据。
- 阻塞项明确。

## 停止条件

- 发布材料完成并给出 ready 状态。
- 存在阻塞项，需要用户或外部系统处理。

## 维护文档 (Maintains)

负责维护项目操作层文档（位于 `docs/`）。这些为按需创建：

- `local-run-guide.md` — 本地运行步骤。
- `release-checklist.md` — 发布前检查项。
- `demo-script.md` — 演示走查脚本。

## AI Collaboration Hardening

Before saying "ready":

1. Collect evidence, not vibes: exact build/test commands, smoke flow, environment, and artifact/version.
2. Run or consult `ai-pm-dev review-route --paths "<release files>"` so the release context includes routed docs and checks.
3. Run `ai-pm-dev prd check --strict` and consult `ai-pm-dev dashboard`.
4. Verify PR template fields: release note, docs note, must-have mapping, non-goal boundary, test evidence.
5. Confirm rollback path before deploy/release; if rollback is unknown, mark blocked.
6. Check secrets/config/env/migrations are handled outside source and documented.
7. Write/update `release-checklist.md`, `local-run-guide.md`, or `demo-script.md` when release knowledge would otherwise live only in chat.
