# AI PM Dev Agent

[English README](README.md)

AI PM Dev Agent 是一个本地 AI 产品开发流程 Agent，用来把工作流规则安装到目标项目里，自动路由任务，并记录当前任务状态。

v0.4 的重点是本地 CLI Agent：它可以安装规则、生成任务 prompt、选择对应 Skill，并保存当前任务状态。

## 它现在到底是什么

它不是网页服务，也不是后台常驻进程。

它现在是：

```text
规则文件 + Skill 文件 + 模板 + memory + 本地 CLI
```

也就是说，它自己不会替 Codex 或 Claude Code 写代码；它负责把“该按什么流程工作”准备好，然后你把生成的 prompt 交给 Codex / Claude Code 执行。

## 正确使用方式

### 方式 A：全局命令，推荐

先在 `ai-pm-dev` 仓库目录里执行一次：

```powershell
cd E:\studyspace\ai-pm-dev
npm link
```

之后你就可以在任意目录使用：

```powershell
ai-pm-dev init "C:\Users\15942\Desktop\11"
ai-pm-dev start "我想开始实现登录功能，请先给技术计划" --target "C:\Users\15942\Desktop\11" --save
ai-pm-dev status --target "C:\Users\15942\Desktop\11"
```

### 方式 B：绝对路径，不做全局链接

在任意目录都可以这样运行：

```powershell
node E:\studyspace\ai-pm-dev\bin\ai-pm-dev.mjs init "C:\Users\15942\Desktop\11"
```

### 方式 C：仓库内相对路径，开发时使用

只有你先进入 `ai-pm-dev` 仓库目录时，这种写法才有效：

```powershell
cd E:\studyspace\ai-pm-dev
node bin\ai-pm-dev.mjs init "C:\Users\15942\Desktop\11"
```

你刚才在 `C:\Users\15942\Desktop\11` 里运行：

```powershell
node bin\ai-pm-dev.mjs init "C:\Users\15942\Desktop\11"
```

会失败，是因为 `Desktop\11` 下面没有 `bin\ai-pm-dev.mjs`。这个路径只有在 `ai-pm-dev` 仓库里才存在。

## 常用命令

```powershell
ai-pm-dev init <目标项目路径>
ai-pm-dev start "<任务描述>" --target <目标项目路径> --save
ai-pm-dev status --target <目标项目路径>
```

`init` 会把这些文件复制到目标项目：

```text
your-project/
  CLAUDE.md
  skills/
  templates/
  memory/
```

如果目标项目已经有 `CLAUDE.md`，会先备份成：

```text
CLAUDE.ai-pm-dev-backup.md
```

`skills/` 和 `templates/` 会合并更新，已有的 `memory/*.md` 不会被覆盖。

`start --save` 会生成：

```text
memory/current-task-prompt.md
.ai-pm-dev/state.json
```

然后你在目标项目根目录打开 Codex / Claude Code，把生成的 prompt 粘进去即可。

## 示例

初始化一个项目：

```powershell
ai-pm-dev init "C:\Users\15942\Desktop\11"
```

开始一个开发计划任务：

```powershell
ai-pm-dev start "我想开始实现登录功能，请先给技术计划" --target "C:\Users\15942\Desktop\11" --save
```

强制按 bug 修复流程：

```powershell
ai-pm-dev start "页面提交后报 500" --type bug --target "C:\Users\15942\Desktop\11" --save
```

查看当前任务状态：

```powershell
ai-pm-dev status --target "C:\Users\15942\Desktop\11"
```

## 底层脚本

`ai-pm-dev` 命令底层调用的是：

- `scripts/init-ai-pm-dev.mjs`
- `scripts/start-task.mjs`

Windows PowerShell 包装脚本也保留着：

```powershell
.\scripts\init-ai-pm-dev.ps1 -Target "E:\path\to\your-project"
.\scripts\start-task.ps1 -Task "我想开始实现登录功能，请先给技术计划"
```

这些脚本适合在 `ai-pm-dev` 仓库目录里开发和调试时使用。日常使用建议走 `ai-pm-dev` 全局命令。

## 测试

```powershell
npm test
```

## 当前版本

v0.4 仍然是轻量本地版本：文件规则、Skills、模板、memory、初始化器、任务启动器、本地 CLI 和任务状态文件。
