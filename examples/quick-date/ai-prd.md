# AI-PRD: 一个搞怪好玩的约会计划小程序：从"愿意和我约会吗"开始，依次选择日期时间、吃什么、想做的活动，最后生成一份约会计划

## Target Users

想约会的年轻男生女生，朋友之间也可以

## Pain Points

快速得到双方都满意的约会计划，同时搞怪好玩、增进感情

## Current Workaround

在微信等社交软件里来回聊，或者线下临时商量

## Core User Workflow

从首页进入，依次确认是否约会、日期时间、吃什么、做什么，平滑过渡到最终计划

## MVP Scope and Non-Goals

MVP 必须完成整个选择流程并生成计划；UI 精细打磨暂不做，多人协作暂不做

## Data Model

不需要后端账号；生成的约会计划可绑定手机日历或做本地提醒

## Deterministic Rules

Not specified.

## AI Usage Boundaries

Not specified.

## Trust and Evidence Mechanism

Not specified.

## Risks and Guardrails

保持轻松搞怪，避免让任何一方有压力或被冒犯；不收集敏感个人数据

## Acceptance Criteria

双方能在 3 分钟内完成全流程并拿到一份满意的约会计划

## PM Notes

- Prefer deterministic calculation for product state, metrics, permissions, and completion checks.
- Use AI for summarization, explanation, recommendation drafts, and ambiguity handling only when the AI output can be inspected.
- Downstream implementation work should preserve this PRD as the source of truth.
