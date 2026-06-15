# AI PM Dev Agent

[English README](README.md)

把一个粗糙的产品想法，变成一份结构化 PRD，**以及一个下游 AI 编码工具（Claude Code、Codex、v0、
Figma）一打开就知道怎么干活的项目** —— 你不需要手写一长段 prompt。

`ai-pm-dev` 是一个本地 CLI，做两件事：

1. **访谈你的想法**，生成 AI-PRD、原型 brief，以及面向各工具的 handoff。
2. **安装一套项目操作层** —— 一个 `AGENTS.md` 入口文件，加上一组 `docs/`（项目简介、UI 规格、
   验收标准、决策日志、待确认问题……）。任何 AI 工具打开这个文件夹时都会读它，从而知道任务前/后的
   协议、MVP 边界、以及该更新哪些文档。

它**不会**调用 LLM API、运行 Dify、或自己执行多 Agent。它准备好上下文和质量门禁，让你已经在用的
工具产出更稳定、更高质量的结果。

## 看它实际跑一遍

[`examples/quick-date/`](examples/quick-date/) 是用一个真实想法跑出来的完整案例：
想法 → 访谈 → AI-PRD → 项目文档 → Codex/v0 handoff → 质量报告 →
一份[复盘](examples/quick-date/retrospective.md)，说明这套流程帮你避免了什么。

## 环境要求

- Node.js 18 或更高版本（`node -v`）

## 安装

```bash
npm install -g github:Andrew-JX/ai-pm-dev
```

不全局安装、直接试用：

```bash
npx github:Andrew-JX/ai-pm-dev --help
```

## 快速上手（60 秒）

```bash
mkdir my-product && cd my-product
ai-pm-dev init .          # 把操作层安装进当前文件夹
ai-pm-dev prd --lang zh   # 进行 PM 访谈（中文）
ai-pm-dev prd check       # 给 PRD 打分，生成 quality-report.md
ai-pm-dev doctor          # 确认一切就绪
```

## 然后交给编码工具 —— 两种方式

**A. 直接打开文件夹（推荐）。** 在 Claude Code 或 Codex 里打开 `my-product`，它们会自动读取
`AGENTS.md`，从而被指向 `docs/PROJECT_BRIEF.md` 等文档。你只需要说：

> 请按当前项目的 AI PM Dev workflow 继续。

**B. 粘贴 handoff prompt。** 如果你的工具不会自动读取项目文件，就复制一份工具专用 prompt：

```bash
ai-pm-dev prd handoff --to codex
ai-pm-dev prd handoff --to v0
ai-pm-dev prd handoff --to figma
```

## `init` 会安装什么

```text
my-product/
  AGENTS.md          # 入口文件：任务前/后协议、文档清单、路由
  CLAUDE.md          # 指向 AGENTS.md 的轻量指针
  docs/
    PROJECT_BRIEF.md  UI_SPEC.md  acceptance-tests.md
    decision-log.md   open-questions.md  progress.md  troubleshooting.md
  skills/            # 9 个角色技能（spec、design、plan、build、bug-fix、review、release、prd）
  templates/         # 可复用的产物模板
  memory/            # 反馈日志、规则候选、技能改进日志
```

随后 `prd` 会填充 `PROJECT_BRIEF.md`、`UI_SPEC.md`、`acceptance-tests.md`，向
`decision-log.md` 追加记录，并把空答案记入 `open-questions.md`。你已经手动编辑过的文件会被保留
——只有未填写的占位文档会被写入。如果 `CLAUDE.md`/`AGENTS.md` 已存在，会备份为
`*.ai-pm-dev-backup.md`。

## PRD 选项

```bash
ai-pm-dev prd --lang zh                 # 中文访谈（默认 en，未指定时会询问）
ai-pm-dev prd --type consumer           # 无 AI 的产品，跳过 AI 专属问题
ai-pm-dev prd --type ai-tool|saas|consumer|internal-tool
```

`prd check` 输出 `PASS/WARN/FAIL`。对于不含 AI 的产品，AI 相关缺口是 **WARN（提示“标记为不适用”）**，
而不是 FAIL。

## 让文档保持更新（每条一行命令）

更新文档不该意味着"打开文件写"。开发过程中随手记决策和坑，这些会直接追加进 `docs/`，
`doctor` 也不再把它们当空模板：

```bash
ai-pm-dev decide "用 H5 不做小程序" --why "审核快、跨端、无需账号"
ai-pm-dev pitfall "预览页隐藏标签导致 rAF 冻结" --fix "用 visibilitychange 兜底"
ai-pm-dev note "完成自定义输入与地点回传闭环"
```

`ai-pm-dev doctor` 会列出仍是空模板的核心文档，让文档漂移可见。

## 命令

```bash
ai-pm-dev init <target>
ai-pm-dev prd [--target <target>] [--lang <zh|en>] [--type <ai-tool|saas|consumer|internal-tool>]
ai-pm-dev prd status [--target <target>]
ai-pm-dev prd check [--target <target>]
ai-pm-dev prd handoff --to <codex|v0|figma> [--target <target>]
ai-pm-dev start "<task>" --type <type> --target <target> --save
ai-pm-dev decide "<decision>" [--why <reason>] [--target <target>]
ai-pm-dev note "<progress note>" [--target <target>]
ai-pm-dev pitfall "<symptom>" [--cause <c>] [--fix <f>] [--target <target>]
ai-pm-dev status  [--target <target>]
ai-pm-dev doctor  [--target <target>]
ai-pm-dev config  set target <target> | get | clear
ai-pm-dev onboarding
ai-pm-dev release-check
```

## 路由一个开发任务（不走完整 PRD）

`start` 把实现任务路由到对应 Skill 并生成 prompt：

```bash
ai-pm-dev start "提交页面返回 500" --type bug --save
```

支持的 `--type`：`spec`、`brief`、`design`、`plan`、`build`、`bug`、`review`、`release`。

## Windows / PowerShell

CLI 文件都是 UTF-8。如果终端里中文显示为乱码，把控制台切到 UTF-8（`chcp 65001`，或
`$OutputEncoding = [Text.Encoding]::UTF8`）。文件本身没有问题——只是控制台的显示设置。

## 当前边界

本地 workflow kernel：不调用 LLM API，不自动控制 Axure/Dify，不自己运行多 Agent。它产出结构化产品
资产、项目操作层和质量门禁，让下游 AI 工具拿到更清晰的上下文。
