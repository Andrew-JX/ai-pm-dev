---
name: design-brief-builder
description: Use when a product goal or specification exists and the user needs UI, UX, information architecture, interaction, or visual constraints before making screens.
---

# Design Brief Builder

## 适用场景

- 已有产品目标，需要转成设计说明。
- 需要明确用户体验、信息层级、交互约束、视觉方向。
- 需要为原型、页面设计或组件设计提供边界。

## 输入要求

- 产品目标或 Product Spec。
- 目标用户、使用场景、平台、品牌或技术约束。
- 已有页面、组件库或设计系统信息，如果有。

## 执行流程

1. 提取用户任务和关键路径。
2. 定义信息架构、主要状态和重要空状态。
3. 列出交互原则、响应式要求和可访问性要求。
4. 给出视觉方向：密度、语气、色彩倾向、组件风格。
5. 标注必须保留、必须避免和待确认事项。
6. 输出设计说明。

## 禁止事项

- 不直接生成高保真页面。
- 不引入与产品目标无关的视觉装饰。
- 不忽略错误态、加载态、空状态。
- 不用营销页思路替代工具型产品体验。

## 输出格式

```markdown
# Design Brief

## 设计目标
## 用户与场景
## 信息架构
## 核心流程
## 页面与状态
## 交互约束
## 视觉方向
## 可访问性要求
## 不做事项
## 待确认问题
```

## 验证标准

- 设计目标能追溯到产品目标。
- 页面、状态、交互约束足够支持下一步设计。
- 不做事项清楚。

## 停止条件

- 用户确认可进入 Design Maker。
- 关键设计约束缺失且无法合理假设。
