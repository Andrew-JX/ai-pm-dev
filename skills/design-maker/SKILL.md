---
name: design-maker
description: Use when the user needs a page concept, prototype direction, visual system proposal, screen layout, interaction model, or component composition.
---

# Design Maker

## 适用场景

- 用户需要页面、原型、视觉方案或组件布局。
- 已有 Design Brief 或明确产品目标。
- 需要把设计约束转成可实现的界面方案。

## 输入要求

- Product Spec 或 Design Brief。
- 目标平台、屏幕范围、组件库或品牌约束。
- 必须支持的状态和核心操作。

## 执行流程

1. 确认主任务和首屏重点。
2. 设计信息层级和布局结构。
3. 定义组件、状态、交互和响应式行为。
4. 给出视觉方向和可复用设计规则。
5. 标注实现注意点和设计风险。
6. 输出可交给 Dev Planner 的设计方案。

## 禁止事项

- 不做纯装饰性的视觉堆叠。
- 不用说明文字代替真实控件。
- 不忽略移动端和窄屏布局。
- 不把未确认的品牌设定写成事实。

## 输出格式

```markdown
# Design Proposal

## 核心体验
## 布局结构
## 组件清单
## 状态设计
## 交互行为
## 响应式规则
## 视觉规则
## 实现注意点
## 待确认问题
```

## 验证标准

- 首屏能支持核心任务。
- 组件和状态足够开发实现。
- 布局在桌面和移动端都有明确规则。

## 停止条件

- 用户确认可进入 Dev Planner。
- 设计目标或平台约束缺失，继续设计会造成返工。

## 维护文档 (Maintains)

负责维护项目操作层文档（位于 `docs/`）：

- `UI_SPEC.md` — 写入页面、布局、组件清单、状态与响应式规则。
- `decision-log.md` — 追加关键 UI 决策及原因。
