---
name: code-review
description: Use when the user asks to review code, inspect quality, find risks, check architecture, identify regressions, or evaluate test coverage.
---

# Code Review

## 适用场景

- 用户要求检查代码、找风险、看有没有问题。
- 合并、发布或交付前需要质量把关。
- 需要评估架构、可维护性、测试缺口或行为回归。

## 输入要求

- 要审查的变更范围、分支、文件或 diff。
- 相关需求、计划或验收标准。
- 可运行的测试信息，如果有。

## 执行流程

1. 确认审查范围。
2. 阅读相关 diff 和上下文文件。
3. 对照项目本地规则、分层约束、接口契约、数据契约和 UI 规范。
4. 优先找会导致错误、回归、数据问题、安全问题或维护风险的点。
5. 检查测试、构建、lint、type-check、smoke 或手动验证是否覆盖关键路径。
6. 检查是否遗漏必要的决策记录、踩坑记录或 release 说明。
7. 按严重程度输出发现。
8. 如无问题，明确说明未发现阻塞问题，并列出剩余风险。

## 禁止事项

- 不泛泛夸奖。
- 不把个人风格偏好当成缺陷。
- 不要求无意义重构。
- 不忽略缺失测试。
- 不只看代码风格，必须检查行为、契约、验证和文档闭环。

## 输出格式

```markdown
# Code Review

## Findings
- [Severity] 文件:行 - 问题、影响、建议

## Open Questions
## Test Gaps
## Documentation Gaps
## Summary
```

## 验证标准

- findings 按严重程度排序。
- 每个问题有具体位置和影响。
- 没有发现问题时也说明测试缺口或残余风险。

## 停止条件

- 审查范围已覆盖并输出结果。
- 缺少 diff 或文件范围，无法判断。
