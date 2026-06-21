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
4. 做意图-实现对账：把代码实际行为和文档声称的行为对齐——`docs/acceptance-tests.md` 的每条验收是否真有代码兑现、`docs/scope.md` 的必做项是否都落地、是否偷偷做了 `docs/scope.md` 里写明不做的非目标。把每一处偏差作为一类 finding 列出（声称 X，实际 Y，在哪个文件）。
5. 优先找会导致错误、回归、数据问题、安全问题或维护风险的点；重点核对人主导的边界——权限、数据流与一致性、事务、安全——这些 AI 实现时最容易偏。
6. 检查测试、构建、lint、type-check、smoke 或手动验证是否覆盖关键路径。
7. 检查是否遗漏必要的决策记录、踩坑记录或 release 说明。
8. 按严重程度输出发现。
9. 如无问题，明确说明未发现阻塞问题，并列出剩余风险。

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

## Intent vs Implementation
- 声称 X（docs/...），实际 Y（文件:行）——偏差与建议

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

## 维护文档 (Maintains)

对照项目操作层文档审查（位于 `docs/`），而不是凭空判断：

- `acceptance-tests.md` — 验证实现是否满足验收切片。
- `scope.md` — 检查必做项是否落地、是否偷偷做了非目标。
- `architecture.md` — 检查是否违反既定结构与数据流。
- `UI_SPEC.md` — 检查界面是否符合设计约束。

## AI Collaboration Hardening

Review as a gate, not a style pass:

1. Run or consult `ai-pm-dev review-route --paths "<changed files>"`; use routed docs/checks as review scope.
2. Lead with findings ordered by severity; include file/line, impact, and concrete fix.
3. Check intent vs implementation against `docs/scope.md`, `docs/acceptance-tests.md`, PR template, and decision records.
4. Treat AI-generated or agent-assisted changes as requiring evidence: tests, manual flow, or reproducible reasoning.
5. Prioritize data integrity, permissions, auth, secrets, transactions, migrations, unsafe deletes, and rollback risk.
6. Check docs update obligations: decision logs, troubleshooting, ownership, release notes, and acceptance tests should move with the code.
7. If no findings, still state test gaps/residual risk.
