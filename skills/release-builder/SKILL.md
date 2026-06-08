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
3. 运行或列出构建验证、测试验证、类型检查、lint、smoke 和手动检查。
4. 检查配置、环境变量、端口、数据迁移、回滚和监控。
5. 检查关键决策、踩坑和用户可见变更是否已经记录。
6. 输出 release checklist 和发布说明。
7. 标注是否 ready，以及阻塞项。

## 禁止事项

- 不在 checklist 未完成时宣称 ready。
- 不忽略回滚和配置检查。
- 不把未验证的构建当成可发布。
- 不自动部署，除非用户明确要求。
- 不把单元测试通过等同于发布就绪；发布前必须覆盖环境和用户路径。

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
