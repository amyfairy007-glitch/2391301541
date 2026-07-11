# Web 新建项目功能设计

日期：2026-07-09

## 1. 目标

在 AI Coding Console Web 端实现可用的“新建项目”入口，让用户无需回到 PowerShell CLI，也可以从页面上登记一个本地项目，使其出现在项目列表中，并成为后续创建 Task、查看项目状态、绑定能力和运行任务的上下文边界。

本设计中的“新建项目”在 V1 中定义为“登记/接入一个已经存在的本地项目目录”，不是创建一个全新的源码目录。原因是当前仓库已有的 `project add --path <path>` 语义就是登记项目，数据也已经以 `projects-manifest.json` 为中心组织。真正从零创建目录、初始化 Git、写入模板文件，可以作为后续 V2。

## 2. 当前现状

当前 Web 端项目栏顶部已经有 `+ 新建项目` 按钮，但它只是调用 `showBannerNotice()`，不会打开表单，也不会写入数据。

现有 CLI 已经支持项目登记，入口是 `tools/ai-coding-console/cli/console.ps1` 中的 `project add --path <path>`。该命令会读取项目路径、生成项目 ID、检测是否存在 `.git/` 和 `.ai/`、可选初始化 `.ai/` 项目记忆，并把项目记录写入 `data/ai-coding-console/projects-manifest.json`。

当前 Web 服务端 `tools/ai-coding-console/gui/server.js` 只有项目读取接口，包括 `GET /api/projects` 和 `GET /api/projects/:id`，没有项目创建接口。

当前项目数据落盘位置是 `data/ai-coding-console/projects-manifest.json`。已有记录结构包含 `id`、`rootPath`、`displayName`、`addedAt`、`lastActivityAt`、`gitRemote`、`hasAiMemory`、`hasAgentsMd`、`takeoverStatus`、`lastActiveTaskId` 等字段。

## 3. 设计原则

新建项目功能应保持 Web 与 CLI 的数据模型一致，不引入第二套项目存储。Web 端写入后，CLI 的 `project list`、`project status` 和 `task create` 必须能继续读取同一份 manifest。

Web 端不能使用会阻塞的交互式 CLI 流程。当前 CLI 在没有 `.ai/` 时会 `Read-Host` 询问是否初始化，这不适合 HTTP 请求。因此后端需要使用非交互式逻辑：要么在 Node 服务端直接实现登记逻辑，要么为 CLI 增加明确参数，例如 `--init-ai-memory` 与 `--skip-init-ai-memory`，再由 Web 调用。

项目登记只允许写入本仓库的 `data/ai-coding-console/projects-manifest.json`，以及在用户明确选择初始化时写入目标项目目录下的 `.ai/` 记忆文件。除此之外，不应修改目标项目源码，不应自动提交 Git，不应创建真实 Task 或 Run。

## 4. 用户流程

用户点击项目栏顶部的 `+ 新建项目`，页面打开“新建项目”弹窗。弹窗中至少包含项目路径输入框、显示名称输入框、是否初始化 `.ai/` 项目记忆的选项，以及检测结果区域。

用户输入本地项目路径后，可以点击“检测项目”。系统返回路径是否存在、是否是目录、是否已经登记、是否包含 `.git/`、是否包含 `AGENTS.md`、是否包含 `.ai/`、推断出的项目 ID、Git remote 和当前分支。检测不会写入任何文件。

用户确认后点击“创建项目”。系统将项目登记到 `projects-manifest.json`。如果用户勾选初始化 `.ai/` 且目标目录当前没有 `.ai/`，系统会执行现有初始化逻辑，为目标项目创建 `.ai/` 记忆结构。创建成功后弹窗关闭，项目列表刷新，并自动选中新项目。

如果路径已登记，系统不重复创建记录，而是提示“项目已存在”，并提供“切换到该项目”。如果项目 ID 冲突但路径不同，系统提示冲突，并建议用户修改显示名称或手动指定 ID。V1 可以先不开放自定义 ID，只显示明确错误。

## 5. 前端设计

前端状态建议新增以下字段：`createProjectOpen`、`createProjectPath`、`createProjectDisplayName`、`createProjectInitAiMemory`、`createProjectChecking`、`createProjectSubmitting`、`createProjectCheckResult`、`createProjectError`。

项目栏中的 `+ 新建项目` 从当前的 `showBannerNotice()` 改为 `openCreateProjectModal()`。弹窗复用现有 modal 样式，但标题为“新建项目”。表单字段包括“项目路径”、“显示名称（可选）”和“如果没有 .ai/，初始化项目记忆”。按钮包括“检测项目”、“取消”和“创建项目”。

检测结果区需要以结构化方式展示：项目 ID、路径状态、Git 状态、AI 记忆状态、AGENTS.md 状态、是否已登记。错误不要只显示原始异常，应转成人可操作的说明，例如“路径不存在，请检查盘符和目录名”、“该路径已经登记为 ai-ui-agentic”、“项目 ID 与已有项目冲突”。

创建成功后，前端调用 `loadProjects()` 刷新项目列表，并通过 `selectContext(projectId)` 或 `setHash(projectId)` 切换到新项目。弹窗状态应清空，banner 显示“项目已创建”。

## 6. 后端 API 设计

建议新增两个接口。

`POST /api/projects/check` 用于只读检测项目路径。请求体为 `{ "rootPath": "E:\\path\\to\\project", "displayName": "optional" }`。响应体为 `{ ok, normalizedPath, projectId, displayName, exists, isDirectory, alreadyRegistered, registeredProjectId, hasGit, hasAiMemory, hasAgentsMd, gitRemote, gitBranch, gitDirty, warnings, errors }`。该接口不写入任何文件。

`POST /api/projects/create` 用于登记项目。请求体为 `{ "rootPath": "E:\\path\\to\\project", "displayName": "optional", "initializeAiMemory": true }`。响应体为 `{ ok, project }`，其中 `project` 使用 `GET /api/projects` 返回的同一结构。失败时返回 `{ error, details, nextAction }`。

V1 不建议直接复用 `project add` 的交互式 CLI 命令，因为它可能在 HTTP 请求中等待输入。更稳妥的方案是在 `server.js` 中抽出一组纯函数实现项目检测与 manifest 写入，并在未来再把 CLI 与 Web 共同依赖的逻辑下沉到 `tools/ai-coding-console/lib/project-registry.js`。

## 7. 数据模型与落盘

项目登记仍然写入 `data/ai-coding-console/projects-manifest.json`。新增项目记录建议保持当前字段，并补充可选字段时保持向后兼容。

推荐项目记录结构如下：

```json
{
  "id": "my-project",
  "rootPath": "E:\\program\\my-project",
  "displayName": "my-project",
  "addedAt": "2026-07-09T00:00:00Z",
  "lastActivityAt": "2026-07-09T00:00:00Z",
  "gitRemote": "https://example.com/repo.git",
  "hasAiMemory": true,
  "hasAgentsMd": true,
  "takeoverStatus": "registered"
}
```

Manifest 顶层结构继续保持：

```json
{
  "$schema": "个人AI工具库项目清单v1",
  "lastUpdated": "2026-07-09T00:00:00Z",
  "projects": {
    "my-project": { }
  }
}
```

如果用户选择初始化 `.ai/`，则目标项目目录会出现或更新 `.ai/` 结构。这是唯一允许写入仓库外项目目录的行为，并且必须在 UI 中明确说明。

## 8. 校验与安全边界

后端必须校验 `rootPath` 存在且是目录。不能接受空路径、相对路径逃逸、包含通配符的路径或非目录路径。路径应使用 `path.resolve()` 或 Windows 等价规范化，并在比较重复项目时去掉末尾斜杠、统一大小写。

项目 ID 仍使用当前 CLI 的 `Sanitize-Id` 规则或等价规则，由目录名生成。只允许字母、数字、点、下划线和短横线，并且必须以字母或数字开头。若生成结果为空，返回 `invalid_project_id`。

如果 `rootPath` 与已有项目重复，返回 `project_already_registered`，并带上已有项目 ID。如果项目 ID 已存在但路径不同，返回 `project_id_conflict`。V1 不自动覆盖已有项目。

初始化 `.ai/` 必须是显式选项。默认建议为“如果没有 .ai/，提示但不自动初始化”，或者在 UI 中默认勾选但必须清楚写明会在目标项目目录写入 `.ai/`。不论采用哪种默认值，后端都只在 `initializeAiMemory === true` 且目标项目没有 `.ai/` 时执行初始化。

后端不应保存 secrets、账号状态、token、cookie 或 IDE 缓存。项目登记只保存路径、展示名、Git remote 和基础状态。

## 9. 错误处理

路径不存在时返回 `path_not_found`。路径不是目录时返回 `path_not_directory`。路径已登记时返回 `project_already_registered`。项目 ID 冲突时返回 `project_id_conflict`。manifest 解析失败时返回 `invalid_manifest_json`。写入 manifest 失败时返回 `manifest_write_failed`。初始化 `.ai/` 失败时返回 `ai_memory_init_failed`，此时不应写入半成功项目记录，除非明确设计为“登记成功但初始化失败”的部分成功状态。

前端应该把这些错误显示为具体提示，不要只显示 `500` 或 JavaScript 异常。对于已登记项目，最好的默认动作是提供“切换到该项目”。

## 10. 实施步骤

第一步，在 `server.js` 中新增项目检测逻辑，包括路径规范化、项目 ID 生成、重复检测、Git 信息读取和 `.ai`/`AGENTS.md` 检测。

第二步，新增 `POST /api/projects/check` 和 `POST /api/projects/create`。创建接口写入 `projects-manifest.json`，并在需要时调用现有 `tools/init-project-memory/init-project-memory.ps1` 或抽出的初始化函数。

第三步，在 `app.js` 中新增新建项目弹窗状态、打开/关闭函数、检测函数和提交函数。把项目栏顶部 `+ 新建项目` 按钮改为打开弹窗。

第四步，创建成功后刷新项目列表并选中新项目。失败时保持弹窗打开，展示错误和可操作建议。

第五步，补充最小验证：`npm run check`、手动检测不存在路径、非目录路径、已登记路径、正常登记路径、无 `.ai` 且选择初始化、无 `.ai` 且不初始化、项目 ID 冲突。

## 11. 验证计划

语法验证使用 `npm run check`。

接口验证建议用 curl 或 PowerShell `Invoke-RestMethod` 调用 `POST /api/projects/check` 和 `POST /api/projects/create`，分别覆盖成功和失败路径。成功创建后检查 `data/ai-coding-console/projects-manifest.json` 是否出现新项目，并确认 Web 项目列表刷新后能显示该项目。

初始化 `.ai/` 的验证应使用一个临时测试项目目录，不要在当前仓库里反复测试。验证后确认目标项目下生成 `.ai/business-context.md`、`.ai/current-state.md`、`.ai/decisions.md` 和 `.ai/handoffs/` 等结构。

回归验证需要确认现有 `+ 新建任务` 仍然能在新项目下创建 `data/ai-coding-console/tasks/<TaskId>/task.json`，并且 `task.json` 中的 `projectId` 和 `projectPath` 指向新登记项目。

## 12. 后续扩展

V2 可以支持“从零创建项目目录”，包括选择父目录、填写项目名、创建目录、可选初始化 Git、可选写入 README、可选初始化 `.ai/`。这应与 V1 的“登记已有项目”分开，避免用户误以为登记动作会创建源码工程。

V2 也可以把项目登记逻辑从 `server.js` 和 `console.ps1` 中抽到共享模块，减少 Web 与 CLI 的规则漂移。长期建议形成 `lib/project-registry.js`，让 CLI 和 Web 都调用同一套校验、manifest 写入和状态检测逻辑。
