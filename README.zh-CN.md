# AI PM Dev Agent

[English README](README.md)

AI PM Dev Agent 是一个本地 CLI workflow agent，用来辅助 AI 产品开发。它把一个粗糙的产品想法，经过交互式 PM 访谈，沉淀为结构化 AI-PRD、原型 brief，以及面向 Codex、v0、Figma、Claude Code 等下游 AI 工具的 handoff prompt。

它不是单次 prompt 生成器。v1.0 的核心是：先追问、澄清、收敛，再保存对话和结构化答案，最后生成可复用的产品开发资产。

## 安装

```bash
npm install -g github:Andrew-JX/ai-pm-dev
```

发布到 npm 后：

```bash
npm install -g ai-pm-dev
```

## 推荐使用流程

进入任意产品项目目录，并初始化一次工作流：

```bash
cd <your-product-project>
ai-pm-dev init .
ai-pm-dev doctor
```

启动交互式 PRD 访谈：

```bash
ai-pm-dev prd
```

CLI 会依次追问用户、痛点、核心流程、MVP 范围、数据模型、确定性规则、AI 边界、可信机制、风险和验收标准。

完成后会生成：

```text
.ai-pm-dev/prd-sessions/<timestamp-slug>/
  conversation.md
  answers.json
  ai-prd.md
  prototype-brief.md
  handoff-codex.md
  handoff-v0.md
  handoff-figma.md
  risks.md
  acceptance-tests.md
memory/current-ai-prd.md
memory/current-task-prompt.md
.ai-pm-dev/state.json
```

把结果交给下游工具：

```bash
ai-pm-dev prd handoff --to codex
ai-pm-dev prd handoff --to v0
ai-pm-dev prd handoff --to figma
```

## 命令

```bash
ai-pm-dev init <target-project>
ai-pm-dev prd [--target <target-project>] [--lang <zh|en>] [--type <ai-tool|saas|consumer|internal-tool>]
ai-pm-dev prd status [--target <target-project>]
ai-pm-dev prd check [--target <target-project>]
ai-pm-dev prd handoff --to <codex|v0|figma> [--target <target-project>]
ai-pm-dev start "<task>" --target <target-project> --save
ai-pm-dev status --target <target-project>
ai-pm-dev doctor --target <target-project>
ai-pm-dev config set target <target-project>
ai-pm-dev config get
ai-pm-dev config clear
ai-pm-dev onboarding
ai-pm-dev release-check
```

## 传统 AI Coding 任务路由

`start` 仍然用于把开发任务路由到对应 Skill，并生成 task prompt：

```bash
ai-pm-dev start "提交页面返回 500" --type bug --save
ai-pm-dev start "准备发布这个版本" --type release --save
```

支持的 `start --type`：

```text
spec
brief
design
plan
build
bug
review
release
```

## init 会安装什么

```text
your-project/
  CLAUDE.md
  skills/
  templates/
  memory/
```

如果目标项目已有 `CLAUDE.md`，会备份为 `CLAUDE.ai-pm-dev-backup.md`。已有 memory 文件会保留。

## 当前边界

v1.0 是本地 workflow kernel。它不直接调用 LLM API，不自动控制 Axure，不运行 Dify，也不自己执行多 Agent。它负责生成结构化产品资产和下游 handoff prompt，让 Codex、v0、Figma 等工具拿到更清晰、可追踪、可验证的上下文。
