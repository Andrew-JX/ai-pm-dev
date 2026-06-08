# AI PM Dev Agent

[English README](README.md)

AI PM Dev Agent 是一个本地 CLI Agent，用来把 AI 产品开发流程安装到任意项目里，并为 Codex / Claude Code 生成正确的任务 prompt。

它不是网页应用，也不是后台服务。它现在做这些事：

1. `init`：把 `CLAUDE.md`、`skills/`、`templates/`、`memory/` 安装到目标项目。
2. `start`：根据你的任务自动选择 Skill，并生成可直接粘贴给 AI 编码工具的 prompt。
3. `status`：查看当前任务阶段、Skill 和下一步。
4. `doctor`：检查安装和目标项目是否准备好。
5. `onboarding`：显示最短新手使用路径。
6. `release-check`：显示发布前检查清单。

## 给普通用户的安装方式

### 方式 A：从 GitHub 安装

适合还没发布到 npm 时使用：

```powershell
npm install -g github:Andrew-JX/ai-pm-dev
```

安装后，任何目录都可以直接运行：

```powershell
ai-pm-dev --help
ai-pm-dev doctor
```

### 方式 B：从 npm 安装

发布到 npm 后使用：

```powershell
npm install -g ai-pm-dev
```

然后：

```powershell
ai-pm-dev --help
```

## 三步使用

假设你的目标项目是：

```text
C:\Users\15942\Desktop\11
```

第一步，初始化目标项目：

```powershell
ai-pm-dev init "C:\Users\15942\Desktop\11"
ai-pm-dev doctor --target "C:\Users\15942\Desktop\11"
```

第二步，开始一个任务：

```powershell
ai-pm-dev start "我想开始实现登录功能，请先给技术计划" --target "C:\Users\15942\Desktop\11" --save
```

第三步，进入目标项目，把生成的 prompt 给 Codex / Claude Code：

```powershell
cd "C:\Users\15942\Desktop\11"
```

打开 `memory/current-task-prompt.md`，复制里面的内容，粘贴给 AI 编码工具。

## 常用命令

```powershell
ai-pm-dev init <目标项目路径>
ai-pm-dev start "<任务描述>" --target <目标项目路径> --save
ai-pm-dev status --target <目标项目路径>
ai-pm-dev doctor --target <目标项目路径>
ai-pm-dev onboarding
ai-pm-dev release-check
```

强制指定任务类型：

```powershell
ai-pm-dev start "页面提交后报 500" --type bug --target "C:\Users\15942\Desktop\11" --save
```

可用类型：

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

## init 会做什么

`init` 会把这些文件安装到目标项目：

```text
your-project/
  CLAUDE.md
  skills/
  templates/
  memory/
```

如果目标项目已有 `CLAUDE.md`，会先备份成：

```text
CLAUDE.ai-pm-dev-backup.md
```

已有的 `memory/*.md` 不会被覆盖。

## start 会做什么

`start --save` 会生成：

```text
memory/current-task-prompt.md
.ai-pm-dev/state.json
```

你把 `memory/current-task-prompt.md` 里的内容粘给 Codex / Claude Code。

## status 会做什么

```powershell
ai-pm-dev status --target "C:\Users\15942\Desktop\11"
```

它会显示：

- 当前任务
- 当前阶段
- 当前 Skill
- Skill 文件路径
- 下一步应该做什么

## doctor 会做什么

```powershell
ai-pm-dev doctor --target "C:\Users\15942\Desktop\11"
```

它会检查当前包的核心文件、目标目录、目标项目初始化状态、8 个核心 Skill、任务 prompt 和任务状态文件。检查失败时会给出修复命令。

## onboarding 会做什么

```powershell
ai-pm-dev onboarding
```

它会输出最短新手路径：初始化项目、开始任务、打开 prompt、交给 Codex / Claude Code。

## release-check 会做什么

```powershell
ai-pm-dev release-check
```

它会输出发布前检查清单，包括 `npm test`、`npm pack --dry-run`、CLI help、doctor、README、CHANGELOG 和 package metadata 检查。

## 给开发者的本地运行方式

只有开发这个工具本身时才需要这样用：

```powershell
cd E:\studyspace\ai-pm-dev
node bin\ai-pm-dev.mjs --help
node bin\ai-pm-dev.mjs init "C:\Users\15942\Desktop\11"
```

不要在目标项目里运行：

```powershell
node bin\ai-pm-dev.mjs init "C:\Users\15942\Desktop\11"
```

除非目标项目本身也有 `bin\ai-pm-dev.mjs`。普通用户不应该用这种方式。

## 当前边界

v0.7 是一个可分发、可自检、有发布检查清单的本地 CLI Agent。

它还不会自己打开 Codex / Claude Code，也不会自动替你执行代码修改。它负责安装规则、路由任务、生成 prompt、保存任务状态。
