# Web 新建项目功能实现结果

日期：2026-07-10

## 任务目标

按照 `docs/new-project-web-design-2026-07-09.md` 实现 Web 端 `+ 新建项目` 功能，使用户可以从页面登记一个已经存在的本地项目目录，并让该项目进入 AI Coding Console 的项目列表。

## 实施范围

本次实现覆盖前端弹窗、后端检测/创建 API、manifest 写入和接口级验证。V1 继续遵守设计文档定义：新建项目 = 登记已有本地项目目录，不负责从零创建源码目录、初始化 Git 或生成项目模板。

## 改动文件

- `tools/ai-coding-console/gui/server.js`
- `tools/ai-coding-console/gui/app.js`

## 后端实现

在 `server.js` 中新增非交互式项目登记逻辑：

- 新增 `POST /api/projects/check`：只读检测项目路径，不写入文件。
- 新增 `POST /api/projects/create`：登记项目并写入 `data/ai-coding-console/projects-manifest.json`。
- 新增路径规范化、项目 ID 生成、重复路径检测、项目 ID 冲突检测、Git 信息读取、`.ai/` 与 `AGENTS.md` 检测。
- 新增可选 `.ai/` 初始化：仅当 `initializeAiMemory === true` 且目标项目没有 `.ai/` 时，调用现有 `tools/init-project-memory/init-project-memory.ps1`。
- 避免直接调用原有交互式 `project add --path` 流程，防止 Web 请求被 `Read-Host` 阻塞。

## 前端实现

在 `app.js` 中新增新建项目弹窗与交互状态：

- `+ 新建项目` 现在打开真实弹窗，而不是显示占位提示。
- 弹窗包含项目路径、显示名称、是否初始化 `.ai/` 的选项。
- 用户可以点击“检测项目”，查看项目 ID、登记状态、Git、`.ai/`、`AGENTS.md` 和 Git remote。
- 用户点击“创建项目”后，前端调用后端创建接口，成功后刷新项目列表并自动选中新项目。
- 创建失败时保留弹窗并显示后端返回的错误信息。

## 数据落盘

项目登记数据继续写入：

- `data/ai-coding-console/projects-manifest.json`

若用户选择初始化 `.ai/`，目标项目目录会被写入 `.ai/` 项目记忆结构；未勾选时不会修改目标项目内容。

## 验证结果

已完成以下验证：

- `npm run check` 通过。
- 启动本地 GUI server 后，用接口级测试验证：
  - `POST /api/projects/check` 对可登记项目返回成功。
  - `POST /api/projects/check` 对不存在路径返回 `path_not_found`。
  - `POST /api/projects/create` 对临时测试项目创建成功。
  - 重复创建同一路径返回 `project_already_registered`。
- 接口测试使用临时目录和 manifest 备份，测试结束后已恢复 `projects-manifest.json`。

## 风险与未完成项

- 尚未做浏览器手动点选验证；建议用户运行 `npm run gui` 后点击 `+ 新建项目` 完成一次真实 UI 验收。
- 当前 V1 不支持从零创建源码目录，也不支持自定义项目 ID；项目 ID 仍由目录名生成。
- 当前实现暂时把项目登记逻辑放在 `server.js` 中；后续可抽到 `tools/ai-coding-console/lib/project-registry.js`，让 CLI 和 Web 共享同一套逻辑。

## 下一步建议

启动 Web：

```powershell
npm run gui
```

然后在页面点击 `+ 新建项目`，用一个独立测试项目目录做一次手动验收。确认项目显示在左侧列表后，再在该项目下点击 `+ 新建任务` 验证 Task 创建链路。
