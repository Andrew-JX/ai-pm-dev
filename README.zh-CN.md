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

## 它如何辅助开发

它不替你写代码。它把**你和 AI 编码工具(Codex、Claude Code、v0)之间的分工**固化下来,
并让双方都"诚实",使协作保持可追溯、抗漂移、防幻觉。

**判断由你主导。** 需求边界、砍什么、优先级、数据与权限决策、风险边界。工具会**强制**这些,
而不是让它们停在含糊:PM 访谈把必做项砍到 3 个、强制写非目标和单一指标、生成 `scope.md`;
`prd check --strict` 在没砍完之前直接失败。

**执行交给 AI。** 搭脚手架、CRUD、对接、初稿、测试。它读项目里的 `AGENTS.md` + `docs/` 干活,
你不用每次重讲上下文——这正是 AI 结对开发最容易"每次从头来"的地方。

**工具负责让协作可追溯、防幻觉:**

| AI 辅助开发里的风险 | 这个工具怎么治 |
| --- | --- |
| 每次对话都要重建上下文 | 操作层(`AGENTS.md` + `docs/`)是单一事实源,AI 打开就读 |
| AI 直接开始写代码 | PM-challenge 协议强制先排序 → 砍 → 那一个 → 非目标 → 指标 |
| 范围/优先级从不钉死 | `scope.md` + `prd check --strict` 门禁(非零退出,可挂 CI/commit) |
| "当初为什么这么定"散在聊天里 | 一行 `decide` / `pitfall` / `note` 追加到 `decision-log.md` / `troubleshooting.md` |
| AI 做出跑偏规格的东西 | `code-review` 做**意图-实现对账**:代码有没有真兑现 `acceptance-tests.md`、`scope.md`,有没有偷做非目标 |
| 文档和现实脱节 | `doctor` 标出仍是空模板的文档 |

**整个闭环:** 想法 → 被强制砍过的 PRD(砍范围、定指标)→ 安装操作层 → 下游 AI 读 `AGENTS.md` 开干
→ 你边做边记决策/坑 → review 拿代码对账 PRD。它是围绕**一个有能力的模型**的 *soft workflow*,
不是多 Agent 系统——价值在于稳定、可验证的过程,而不是 Agent 数量。

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

想一条命令把上下文喂给新开的会话（交接的"入站"那半边），跑 `ai-pm-dev brief` 把摘要粘过去——
一句话定位、必做项、待确认问题、最近决策、进度、踩过的坑和下一步。

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
ai-pm-dev prd --from-note idea.md       # 从已有的想法/聊天记录导入，不用重打一遍
ai-pm-dev prd --quick                   # 只记 who/what/why，把追问交给你的 AI
```

`--quick` 只问想法、用户、痛点，然后交接：在 AI 工具里打开项目，让它执行 PM challenge
（排序 → 砍到 3 个 → 那一个 → 非目标 → 单一指标）。没答的项会记进 `docs/open-questions.md`。

用 `--from-note` 时，文件第一行作为想法，其余内容存为 session 里的 `source-note.md`，
其它问题照常会问。

`prd check` 输出 `PASS/WARN/FAIL`。对于不含 AI 的产品，AI 相关缺口是 **WARN（提示“标记为不适用”）**，
而不是 FAIL。

### 它会逼你做最难的 PM 决定

访谈围绕砍需求、定优先级来设计（问题措辞会引导你，但表单不会反复纠缠——
真正的严格靠下面的闸门和下游 AI 的拷问协议）：

- **必做项最多 3 个**：超过 3 个的部分会记进 `scope.md` 作为延后。
- **非目标**：说出一件 v1 故意不做的事。
- **那一个**：只能上线一个时，哪个能验证想法。
- **单一可衡量的成功指标**。

每次 session 会生成 `scope.md`（必做项 / 那一个 / 非目标 / 砍掉清单 / 指标）。
而 `prd check --strict` 在这些缺失时**以非零退出码退出**，可以挂到 commit 或 CI 上卡住：

```bash
ai-pm-dev prd check --strict   # 没定优先级/没砍就 exit 1
```

## 让文档保持更新（每条一行命令）

更新文档不该意味着"打开文件写"。开发过程中随手记决策和坑，这些会直接追加进 `docs/`，
`doctor` 也不再把它们当空模板：

```bash
ai-pm-dev decide "v1 先只做网页版" --why "最快做出可用 demo"
ai-pm-dev pitfall "标签页隐藏时动画暂停" --fix "在 visibilitychange 时恢复"
ai-pm-dev note "完成端到端主流程"
```

`ai-pm-dev doctor` 会列出仍是空模板的核心文档，让文档漂移可见。

想要硬门禁(opt-in),装一个 git pre-commit hook:**代码改了但 `docs/` 没更新,就拦下这次提交**——
记录绕不过去,连 AI 都跳不了:

```bash
ai-pm-dev install-hook       # 拦下只改代码、不更新 docs 的提交
ai-pm-dev uninstall-hook     # 移除
# 故意跳过某一次提交: git commit --no-verify
```

如果你是「以做促学」，还有两条追加到 `docs/keywords.md` 和 `docs/learning-log.md`
（按需创建，不会污染普通项目）：

```bash
ai-pm-dev keyword "AOP" --explain "不改业务代码，统一在方法前后插逻辑，比如日志、事务"
ai-pm-dev learned "登录：Controller 校验 -> Service 签发 token -> 前端存下后续带上"
```

安装的 `AGENTS.md` 还会要求下游工具讲清主链、不删你自己的注释和笔记 ——
目标是做出一个你真能讲清楚的功能。

## 命令

```bash
ai-pm-dev init <target>
ai-pm-dev prd [--target <target>] [--lang <zh|en>] [--type <...>] [--from-note <file>]
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
