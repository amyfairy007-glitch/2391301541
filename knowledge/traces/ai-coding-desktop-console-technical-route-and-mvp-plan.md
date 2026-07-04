# 多项目 AI Coding 桌面控制台 — 技术路线与 MVP 实施方案

> 生成日期：2026-07-04
> 前置设计：`knowledge/traces/ai-coding-desktop-console-core-model-design.md`
> 前置收口：`knowledge/traces/ai-coding-desktop-console-core-model-closeout-plan.md`
> 已确认决策：CLI 先行（路线 A）、控制台属 tools/、manifest 只存索引、审批在产物后、Scope 为阶段冻结
> 后续阶段：按本计划五阶段逐阶段实施

---

## 一、MVP 产品边界

### 做什么

| 能力 | 说明 |
|---|---|
| 手动登记项目 | 用户提供路径 → 控制台注册到 `projects-manifest.json` → 调用 `init-project-memory` 初始化 `.ai/` |
| 读取项目状态 | 读取 `.ai/business-context.md`、`.ai/current-state.md`、Git 分支、`PROJECT_MAP.md` 等 |
| 生成项目上下文 Prompt | 将项目背景 + 当前状态 + Task 目标 + AGENTS.md 规则摘要组装为完整 Prompt |
| 创建 audit / plan / build / verify Task | 5 种任务类型，用户选择类型、填写标题和描述 |
| 审批 plan → build | plan Run 完成后，用户审查 plan 产物（Agent 输出的分析结果），批准或拒绝进入 build |
| 单 Agent 执行单个 Run | 将 Prompt 分发给配置的 Agent（OpenCode），收集状态和产物 |
| Markdown board | 所有项目/Task/Run 的当前状态汇总为一个可读 Markdown 文件 |
| 产物持久化 | plan_md、build 日志、验证结果保存到 `data/`，可 Git 追溯 |
| 失败重试 | Run 失败后创建新 Run，旧 Run 保留为历史 |

### 不做什么

| 不做 | 原因 |
|---|---|
| 自动扫描发现项目 | V1 手动登记，workspaceRoots 配置在后续迭代中启用 |
| 自动拆解复杂任务为子任务 | 单 Task 模型 |
| 多 Agent 并行 | 单 Agent 单 Run |
| 多 Session 自动编排 | 后续扩展（multi-session 设计已就绪） |
| 自动批准 build | 人必须在决策回路中 |
| 桌面 GUI（Electron / Tauri / React） | CLI 先行验证核心模型 |
| 修改全局 AGENTS.md | 用户手动操作 |
| 远程执行 | 仅本地 |
| 多人协作 | 单用户 |

---

## 二、控制台工具归属与目录方案

### 目录名：`tools/ai-coding-console/`

**选择理由**：
- `ai-coding-console` 直接描述能力："AI Coding 控制台"
- 与现有 `tools/init-project-memory/`、`tools/sync-codex-home/` 命名风格一致（kebab-case，动词-名词）
- 不与可能的未来面板命名冲突
- 英文名方便 CLI 命令使用和后续国际化

### 内部结构（仅 MVP 必需）

```
tools/ai-coding-console/
├── README.md                     ← 使用说明
├── config/
│   └── console-config.json       ← 控制台专属配置（默认 Agent、data 路径）
└── cli/
    ├── console.ps1                ← PowerShell CLI 入口（MVP 用 PowerShell）
    └── agent-adapter.ps1          ← Agent 适配器（OpenCode 封装）
```

> `cli/` 下未来可扩展 Node.js CLI（`cli/console.js`），但 MVP 用 PowerShell 直接复用已有脚本经验（`init-project-memory.ps1` 87行、`sync-codex-home.ps1` 91行）。

### 为什么不是其他名称

| 备选 | 驳回理由 |
|---|---|
| `tools/console/` | 太泛，不知道是什么的控制台 |
| `tools/workbench/` | 暗示 GUI 工具台，不符合 CLI 先行策略 |
| `tools/coding-desk/` | 与"桌面控制台"定位用词不一致 |

---

## 三、CLI 入口设计

### 入口形式

```powershell
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 <command> [args]
```

### 命令集

| 命令 | 参数 | 功能 | 写入 | 读取 |
|---|---|---|---|---|
| `project list` | — | 列出所有已接入项目及摘要状态 | — | `projects-manifest.json` |
| `project add` | `--path <路径>` | 注册项目 + 调用 init-project-memory | manifest.json, .ai/ | — |
| `project status` | `--project <名称>` | 项目当前状态：.ai/ 内容、Git 分支、文件数 | — | .ai/, AGENTS.md, git |
| `project prompt` | `--project <名称>` | 生成"让 AI 重新理解本项目"的完整 Prompt | `data/tasks/<id>/prompt.md` | .ai/, AGENTS.md, knowledge/ |
| `task create` | `--project <名称> --type <类型> --desc "..."` | 创建 Task + Prompt | task.json, prompt.md | .ai/, AGENTS.md |
| `task list` | `--project <名称>` | 列出项目下所有 Task 及状态 | — | data/tasks/ |
| `task status` | `--task <task-id>` | 查看 Task 详情：状态、最新 Run、审批 | — | task.json, run.json, approval.json |
| `task dispatch` | `--task <task-id>` | 将 Prompt 分发给 Agent（OpenCode）执行 | run.json, plan.md/build.log | prompt.md, task.json |
| `task approve` | `--task <task-id> [--reject]` | 审批 plan/build，写审批记录 | approval.json, task.json | plan.md / build.log |
| `task close` | `--task <task-id>` | 关闭 Task，写总结报告 | summary.md, task.json, manifest.json | 全部产物 |
| `board show` | `--project <名称>` | 生成当前项目 Markdown board | `data/board/<name>-board.md` | manifest.json, tasks/, runs/ |

### 不假设具体 CLI 框架

第一版用**纯 PowerShell 函数 + 参数解析**（与现有 `init-project-memory.ps1` `sync-codex-home.ps1` 的 `param()` + `$args` 解析风格一致）。不引入 Commander.js、Clap、argparse 等框架。

---

## 四、MVP 数据落盘方案

### 4.1 存储原则

| 原则 | 说明 |
|---|---|
| 人机双读 | 关键状态用 JSON（机器可读），产物/总结用 Markdown（人可读） |
| 独立存储 | 每个实体独立文件，不互嵌（Task 不嵌入 Manifest，Run 不嵌入 Task） |
| Git 可追溯 | 所有 `data/` 下文件正常 `git add` 提交 |
| 只增不改 | 历史记录追加，不覆盖已完成的 Task/Run/Approval |
| 引用不嵌入 | Manifest 中 Task ID 是字符串引用，不把 Task JSON 嵌套进去 |

### 4.2 完整存储布局

```
data/
├── projects-manifest.json                   ← 项目索引 + 摘要（现有，不膨胀）
│
├── tasks/
│   └── <task-id>/                           ← Task ID 格式：T-YYYYMMDD-NNN
│       ├── task.json                        ← Task 元数据
│       ├── prompt.md                        ← 完整 Prompt（发往 Agent 的原文）
│       │
│       ├── runs/
│       │   └── <run-id>/                    ← Run ID 格式：R-YYYYMMDD-NNN-seq
│       │       ├── run.json                 ← Run 元数据
│       │       ├── plan.md                  ← plan 输出的分析/计划
│       │       ├── build.log                ← build 输出日志
│       │       └── verify-result.md         ← verify 输出
│       │
│       └── approvals/
│           └── <approval-id>.json           ← 审批记录（ID: A-<task-id>-NN）
│
├── board/
│   └── <project-name>-board.md              ← 项目当前状态汇总 Markdown
│
└── reports/
    └── <task-id>-summary.md                 ← Task 关闭时的总结报告
```

### 4.3 各文件最小 schema

**`projects-manifest.json`（仅索引 + 摘要）**：

```json
{
  "$schema": "个人AI工具库项目清单 v1",
  "lastUpdated": "2026-07-05T...",
  "projects": {
    "E:\\Program\\my-project": {
      "name": "my-project",
      "rootPath": "E:\\Program\\my-project",
      "addedAt": "2026-07-05T...",
      "lastActiveTaskId": "T-20260705-001",
      "activeTaskCount": 1,
      "lastActivityAt": "2026-07-05T..."
    }
  }
}
```

> 不在此 JSON 中嵌入 Task 详情、Run 列表、审批历史。`lastActiveTaskId` 是指向 `data/tasks/` 下某个 Task 目录的引用。

**`task.json`**：

```json
{
  "taskId": "T-20260705-001",
  "project": "E:\\Program\\my-project",
  "type": "plan",
  "title": "分析项目结构",
  "description": "...",
  "status": "planning",
  "currentRunId": "R-20260705-001-01",
  "createdAt": "2026-07-05T...",
  "updatedAt": "2026-07-05T...",
  "closedAt": null
}
```

**`run.json`**：

```json
{
  "runId": "R-20260705-001-01",
  "taskId": "T-20260705-001",
  "mode": "plan",
  "agentType": "opencode",
  "status": "running",
  "sessionId": "abc123",
  "createdAt": "...",
  "dispatchedAt": "...",
  "completedAt": null,
  "error": null
}
```

**`approval.json`**：

```json
{
  "approvalId": "A-T-20260705-001-01",
  "taskId": "T-20260705-001",
  "type": "plan_approval",
  "status": "approved",
  "requestedAt": "...",
  "decidedAt": "...",
  "comment": "计划合理，允许进入 build"
}
```

---

## 五、MVP 完整执行流

### 主流程

```
用户
 │
 ├─ 1. project add --path "E:\..."        写入 manifest.json + 调用 init-project-memory
 │
 ├─ 2. project status --project xxx        读取 .ai/ + git
 │
 ├─ 3. project prompt --project xxx        写入 data/tasks/T-001/prompt.md
 │
 ├─ 4. task create --project xxx          写入 task.json + prompt.md
 │     --type plan --desc "..."
 │
 ├─ 5. task dispatch --task T-001         写入 run.json → Agent 执行 → 写入 plan.md
 │
 ├─ 6. [用户阅读 plan.md]
 │
 ├─ 7. task approve --task T-001          写入 approval.json → task.json status → plan_approved
 │
 ├─ 8. task create --type build           写入 task.json (status: building)
 │     --desc "按计划修改..."
 │
 ├─ 9. task dispatch --task T-002         Agent 执行 → 修改项目文件 → 写入 build.log
 │
 ├─10. task approve --task T-002          写入 approval.json → status → build_approved
 │
 ├─11. task create --type verify
 │    task dispatch → Agent 跑测试 → verify-result.md
 │
 └─12. task close --task T-NNN            写入 summary.md → status → completed
```

### 每步权限

| 步骤 | 读什么 | 写什么 | 可改项目文件 |
|---|---|---|---|
| 项目登记 | — | manifest.json, .ai/ | 否 |
| 状态读取 | .ai/, AGENTS.md, git | — | 否 |
| Prompt 生成 | .ai/, AGENTS.md, knowledge/ | prompt.md | 否 |
| plan Run | prompt.md | plan.md, run.json | **否**（plan 模式严格只读） |
| plan 审批 | plan.md | approval.json, task.json | 否 |
| build Run | prompt.md, plan.md | build.log, run.json, 项目文件 | **是**（经审批后） |
| verify Run | build.log | verify-result.md, run.json | 否 |
| review / close | 全部产物 | summary.md, task.json, manifest.json | 否 |

### 失败与重试

```
Run 失败 → 不修改 task.json status → 旧 R-001 run.json status: failed
    ↓
用户发起重试 → task dispatch → 创建新 Run R-002 → 重新执行
    ↓
成功 → 旧 R-001 保留为历史 → R-002 status: completed
```

---

## 六、Agent Adapter MVP 策略

### 第一版只接 OpenCode

**选择理由**：
- 用户当前使用 OpenCode 作为 AI 执行入口
- `tools/sync-codex-home/` 已支持 OpenCode 家目录同步
- OpenCode 支持 `--workdir` 参数指定工作目录
- Codex 作为二号 Agent 后续接入（Agent Adapter 抽象已预留扩展位）

### 适配器最小接口

```powershell
# tools/ai-coding-console/cli/agent-adapter.ps1

function Invoke-OpenCodePlan {
  param($WorkDir, $PromptFile, $OutputFile)
  # opencode --workdir $WorkDir < $PromptFile
  # 等待完成 → 收集输出 → 写入 $OutputFile
}

function Invoke-OpenCodeBuild {
  param($WorkDir, $PromptFile, $OutputFile)
  # 同上，build 模式
}

function Get-OpenCodeSessionStatus {
  param($SessionId)
  # 轮询 session 状态
}
```

### Codex 扩展位

`run.json` 中 `agentType` 字段预留 `"opencode" | "codex" | (future)`。新增 Agent 只需：
1. 实现对应的 `Invoke-<AgentType><Mode>` 函数
2. 在 `console-config.json` 中注册 Agent 类型和 CLI 路径
3. `run.json` 中 `agentType` 写入新值后，`task dispatch` 自动调用对应适配器

### 不假设具体命令已可用

第一版实现中，`Invoke-OpenCodePlan` 先检查 `opencode --version` 是否可用；不可用时给出明确错误信息："OpenCode 未安装或不在 PATH 中，请先安装 OpenCode"。

---

## 七、AGENTS.md Scope 修订建议

### 当前内容（:55-61）

```
## Scope
- V1 only.
- No agents.
- No skills.
- No worktree automation.
- No multi-session tooling.
```

### 修订时机

**不在本阶段修改。** 触发条件：
1. 第一个 Agent Adapter 实现完成（阶段 D 结束）
2. 至少跑通一次 plan → approve → build 全流程
3. AGENTS.md Scope 修订方案经用户单独确认

### 建议修订后内容

```
## Scope

- V1 only.
- No skills.
- No worktree automation.

### Agent Execution

- Console may dispatch a single agent per run via the Agent Adapter abstraction.
- Direct agent CLI invocation outside the adapter layer is prohibited.
- Agent must run in plan mode unless the controlling task has an approved build stage.
- Multi-agent parallelism and automatic multi-session orchestration are not permitted.
```

### 修订不破坏的安全边界

| 旧约束 | 新约束 | 保留？ |
|---|---|---|
| No agents | Console-mediated dispatch only | ✅ Agent 不能自由调用 |
| No multi-session tooling | No automatic multi-session orchestration | ✅ 单 Session 合法，自动编排仍禁止 |
| V1 only | V1 only | ✅ |

---

## 八、实施阶段拆分

### 阶段 A：脚手架与数据层

| 维度 | 内容 |
|---|---|
| 目标 | 创建 `tools/ai-coding-console/` 目录、config、CLI 入口骨架；创建 data/ 子目录 |
| 产物 | `tools/ai-coding-console/` 完整目录、`console-config.json`、`console.ps1`（帮助+参数骨架）、`data/tasks/` `data/board/` `data/reports/` `data/approvals/` |
| 可修改 | `tools/ai-coding-console/` 内一切、`data/` 下新增目录 |
| 不可修改 | 现有 `tools/init-project-memory/`、`tools/sync-codex-home/`、`AGENTS.md`、`config/global.json` |
| 验证 | 目录存在、config 合法 JSON、`console.ps1 help` 可运行 |
| 需确认 | 目录名 `ai-coding-console` 和内部结构 |

### 阶段 B：项目登记与状态读取

| 维度 | 内容 |
|---|---|
| 目标 | 实现 `project add`、`project list`、`project status`、`project prompt` |
| 产物 | 可运行的 4 个 CLI 命令 |
| 可修改 | `tools/ai-coding-console/cli/console.ps1`、`data/projects-manifest.json` |
| 不可修改 | 项目仓库内的文件 |
| 验证 | 添加测试项目 → list 可见 → status 可读取 .ai/ + git → prompt 可生成 |
| 需确认 | 否 |

### 阶段 C：CLI Task 流

| 维度 | 内容 |
|---|---|
| 目标 | 实现 `task create`、`task list`、`task status`、`task approve`、`task close`、`board show` |
| 产物 | 完整的 Task 生命周期 CLI（不含 Agent 调用） |
| 可修改 | `tools/ai-coding-console/cli/console.ps1`、`data/tasks/`、`data/approvals/`、`data/board/`、`data/reports/` |
| 不可修改 | 项目代码 |
| 验证 | 创建 Task → 查看状态 → 手动模拟 Run JSON 写入 → 审批 → 关闭 |
| 需确认 | board.md 格式 |

### 阶段 D：单 Agent Adapter

| 维度 | 内容 |
|---|---|
| 目标 | 实现 OpenCode 适配器，打通 `task dispatch` → OpenCode 执行 → 产物收集 |
| 产物 | `agent-adapter.ps1`、`task dispatch` 命令完整逻辑 |
| 可修改 | `tools/ai-coding-console/cli/agent-adapter.ps1`、`console.ps1` |
| 不可修改 | OpenCode 本身 |
| 验证 | plan Run 成功执行并输出 `plan.md`；build Run 成功执行并修改项目文件 |
| 需确认 | **是**（首次涉及 Agent 修改项目代码，必须人工确认每个 build Run 的审批） |

### 阶段 E：验证、文档与试运行

| 维度 | 内容 |
|---|---|
| 目标 | 端到端验证、更新 README、补充 `knowledge/flows/` 操作流程 |
| 产物 | 试运行报告、MVP 操作 SOP |
| 可修改 | `README.md`、`knowledge/flows/console-operation-guide.md`、`tools/ai-coding-console/README.md` |
| 不可修改 | `tools/` 下已稳定的脚本逻辑 |
| 验证 | 用真实项目跑通全流程：登记 → plan → approve → build → verify → review → close |
| 需确认 | 是否可以发布 MVP；是否需要修订 AGENTS.md Scope |

---

## 九、风险与待确认项

### 风险

| 风险 | 级别 | 说明 | 缓解 |
|---|---|---|---|
| OpenCode CLI 接口变化 | 🟡 中 | Agent Adapter 依赖 OpenCode 的 `--workdir` 和 session 概念。如果 OpenCode 版本不支持，需适配 | 阶段 D 前先验证 OpenCode CLI 能力 |
| PowerShell 增长到需拆分 | 🟢 低 | `console.ps1` 可能增长到 300+ 行，届时按模块拆分为多个 .ps1 | 项目列表和 Task 流两个模块天然可拆 |
| data/ 文件随时间膨胀 | 🟢 低 | 每个 Task 约 6-10 个文件。长期累积需归档策略 | 后续增加 `data/archive/` 归档已关闭 Task |

### 阻塞项

| 序号 | 问题 | 当前状态 | 阻塞的阶段 |
|---|---|---|---|
| U1 | OpenCode 当前版本是否支持 `--workdir` 和 plan/build 模式参数？ | **未确认** | 阻塞阶段 D |
| U2 | OpenCode 的 session 状态是否可通过 API 或 CLI 轮询获取？ | **未确认** | 阻塞阶段 D |
| U3 | 是否有可用于测试 MVP 的真实项目？ | **未确认** | 阻塞阶段 E（试运行） |

---

> **下一步：用户确认后，从阶段 A 开始逐阶段实施。每阶段完成后提交、验证、确认、再进入下一阶段。**
