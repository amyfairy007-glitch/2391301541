# 多项目 AI Coding 桌面控制台 — 核心模型与执行边界设计

> 生成日期：2026-07-04
> 阶段：只读设计
> 前置基础：个人AI工具库顶层架构已完成、现有能力已接管、`config/global.json` 与 `data/projects-manifest.json` 已初始化
> 后续阶段：技术路线与最小实现方案设计

---

## 一、产品定位与范围

### 1.1 定位

"多项目 AI Coding 桌面控制台"是一个**本地桌面控制台**，不是单纯的 Web 看板或项目面板。它的核心定位是：

> 用户在本地桌面打开控制台 → 查看所有已接入项目 → 向项目下发 AI Coding 任务 → Agent 在本地执行 → 控制台收集结果、更新状态、展示产物。

### 1.2 与现有个人AI工具库的关系

| 个人AI工具库 | 控制台 |
|---|---|
| 规则、流程、知识、工具的**存储和版本管理** | 基于工具库的**执行和交互入口** |
| `AGENTS.md` 是全局规则源 | 控制台读取 AGENTS.md 并同步给 Agent |
| `config/` 存放全局配置 | 控制台读取并可按项目覆盖 |
| `data/` 持久化项目状态和任务历史 | 控制台是 data/ 的主要写入者 |
| `tools/` 提供可复用脚本 | 控制台调用工具脚本完成任务 |

### 1.3 核心原则

1. **UI 只是入口**：桌面 UI 是用户交互的一层壳，核心逻辑必须在领域层实现，未来 CLI、AI 对话入口都能调用同一套能力。
2. **Agent 可替换**：不绑定特定 Agent（OpenCode / Codex / 未来其他），通过适配器模式接入。
3. **人必须在关键决策回路中**：plan → build 必须经过人工审批；Agent 不得自主修改全局规则。
4. **增量接入**：在现有个人AI工具库结构上叠加新能力，不推翻重建。

---

## 二、系统分层

```
┌──────────────────────────────────────┐
│         桌面 UI 层                    │  ← Electron / Tauri / Web（技术栈未定）
│  项目列表 · 任务面板 · 审批入口 · 日志 │
├──────────────────────────────────────┤
│         桌面入口 CLI 层               │  ← CLI / AI 对话入口共享
│  project list | task create | approve │
├──────────────────────────────────────┤
│         核心领域层                    │  ← 平台无关纯逻辑
│  ProjectService · TaskService         │
│  ApprovalService · AgentOrchestrator │
├──────────────────────────────────────┤
│         本地执行与任务编排层           │
│  TaskScheduler · RunManager           │
│  PromptBuilder · ContextCollector     │
├──────────────────────────────────────┤
│         Agent Adapter 层              │
│  OpenCodeAdapter · CodexAdapter       │
│  统一抽象接口                          │
├──────────────────────────────────────┤
│   文件 · Git · 测试 · 日志 · 产物层   │
│  FileScanner · GitReader              │
│  ArtifactCollector · LogWriter        │
├──────────────────────────────────────┤
│         持久化数据层                   │
│  config/  data/  knowledge/           │
│  项目自身仓库中的 .ai/ 和 AGENTS.md    │
└──────────────────────────────────────┘
```

| 层 | 职责 | 不能做的事 |
|---|---|---|
| 桌面 UI 层 | 用户交互、状态展示、审批入口 | 不包含业务逻辑；不直接读写 Agent 输出 |
| 核心领域层 | 项目/Task/审批的状态机、调度规则、Prompt 组装 | 不绑定特定 UI 技术；不直接调用 Agent CLI |
| 执行与编排层 | 将 Task 转换为 Run、组装上下文 Prompt、管理 Run 生命周期 | 不关心 Agent 具体如何执行 |
| Agent Adapter 层 | 将统一的 Run 请求翻译为特定 Agent 的 CLI 调用或 API 调用 | 不修改 Run 的语义；不绕过审批 |
| 文件/Git/产物层 | 读取项目文件结构、Git 状态、收集产物、写入日志 | 不修改项目代码 |
| 持久化数据层 | 读写 config/ data/ knowledge/ | 不包含业务逻辑 |

---

## 三、入口边界

### 3.1 三个入口

| 入口 | 做什么 | 不做什么 |
|---|---|---|
| **桌面 UI** | 展示项目列表、任务状态、审批提示、产物预览、启动/停止任务 | 不直接执行 Agent 命令；不直接修改文件 |
| **CLI** | 提供与桌面 UI 等价的命令行操作 | 不提供图形交互 |
| **AI 对话入口** | 用户在 OpenCode 中描述需求 → 控制台创建 Task → 收集结果 → 展示给用户 | 不替代控制台的审批和状态管理 |

### 3.2 统一原则

- 三个入口调用同一套核心领域层（ProjectService / TaskService / ApprovalService）；
- 入口仅负责 I/O（用户输入 → 领域层调用 → 结果展示）；
- 入口不做状态判断、不跳过审批、不自发修改 `data/`。

---

## 四、核心模型

### 4.1 Project（项目）

| 维度 | 内容 |
|---|---|
| **目的** | 表示控制台管理的单个项目仓库 |
| **最小字段类别** | `name`、`rootPath`、`gitRemote`、`currentBranch`、`takeoverStatus`、`lastScanAt`、`addedAt` |
| **生命周期** | 发现（扫描 workspaceRoots）→ 注册（写入 projects-manifest.json）→ 活跃（持续管理）→ 归档（不再管理但不删除记录） |
| **关系** | 1 个 Project 有 N 个 Task |
| **不能现在锁死的字段** | 项目类型标签（frontend/backend/...）、技术栈检测结果、`agentsMdHash`（AGENTS.md 版本追踪）— 这些依赖扫描实现 |

### 4.2 Task（任务）

| 维度 | 内容 |
|---|---|
| **目的** | 表示一次 AI Coding 工作单元 |
| **最小字段类别** | `taskId`、`type`（audit/plan/build/verify/review）、`title`、`description`、`projectPath`、`status`、`createdAt`、`approvedAt`（可为 null）、`completedAt`（可为 null） |
| **生命周期** | created → plan_approved → build_approved → executing → completed / failed |
| **关系** | 1 个 Task 有 N 个 Run；Task 属于 1 个 Project |
| **不能现在锁死的字段** | `priority`、`assignee`、`tags`、`jiraRef`、`estimatedDuration` — 这些取决于实际使用场景 |

### 4.3 Run（执行）

| 维度 | 内容 |
|---|---|
| **目的** | 表示一个 Task 的一次具体执行实例。Task 可被多次 Run（失败后重试、plan→build 各一次） |
| **最小字段类别** | `runId`、`taskId`、`agentType`（opencode/codex/...）、`mode`（plan/build）、`status`、`prompt`（完整 Prompt 文本）、`startedAt`、`endedAt`、`sessionId`（Agent 返回的 session ID，可为 null） |
| **生命周期** | created → dispatched → running → completed / failed |
| **关系** | 1 个 Run 绑定 1 个 Agent Adapter；1 个 Run 产生 0..N 个 Artifact |
| **不能现在锁死的字段** | `executionLog`（日志位置因 Agent 而异）、`resourceUsage`（CPU/内存/Tokens） |

### 4.4 Artifact（产物）

| 维度 | 内容 |
|---|---|
| **目的** | 表示 Run 产生的可持久化输出 |
| **最小字段类别** | `artifactId`、`runId`、`type`（plan_md / code_diff / screenshot / log / test_result / summary）、`path`（文件路径）、`mimeType`、`createdAt` |
| **生命周期** | 随 Run 创建 → 持久化存储 |
| **关系** | 属于 1 个 Run |
| **不能现在锁死的字段** | `size`、`hash` — 文件系统自带，无需冗余存储 |

### 4.5 Approval（审批）

| 维度 | 内容 |
|---|---|
| **目的** | 表示一次人工审批决策 |
| **最小字段类别** | `approvalId`、`taskId`、`type`（plan_approval / build_approval）、`status`（pending / approved / rejected）、`requestedAt`、`decidedAt`（可为 null）、`comment` |
| **生命周期** | requested → approved / rejected |
| **关系** | 1 个 Task 至少有 1 个 plan Approval；如有 build 阶段则还有 1 个 build Approval |

### 4.6 Agent Adapter（Agent 适配器）

| 维度 | 内容 |
|---|---|
| **目的** | 抽象不同 Agent 的接入差异。控制台不直接调用 OpenCode CLI 或 Codex CLI，而是通过适配器统一接口 |
| **最小字段类别** | `adapterType`（opencode/codex）、`isAvailable`（当前环境是否可用）、`version` |
| **生命周期** | 控制台启动时检测可用 Agent → 注册 → 长驻服务 |
| **关系** | 1 个 Run 绑定 1 个 Agent Adapter |
| **不能现在锁死的字段** | 具体 CLI 路径、启动参数、环境变量 — 由各 Adapter 自己决定 |

**统一抽象接口**：

```
adapter.dispatch(run: Run) → sessionId
adapter.getStatus(sessionId) → RunStatus
adapter.getOutput(sessionId) → Artifact[]
adapter.cancel(sessionId) → void
adapter.resume(sessionId, resumeFrom: step) → void
```

---

## 五、任务类型与状态机

### 5.1 任务类型

| 类型 | 说明 | Agent 模式 |
|---|---|---|
| `audit` | 只读分析：代码审计、影响范围评估、风险识别 | plan（严格只读） |
| `plan` | 分析 + 输出实施方案 | plan |
| `build` | 按已确认计划执行代码修改 | build（须先 plan 确认） |
| `verify` | 验证 build 结果：运行测试、检查产物 | plan 或受限 build |
| `review` | 人工复核验证结果，决定是否关闭 Task | 不调用 Agent |

### 5.2 状态机

```
                    ┌─────────────┐
                    │   created   │
                    └──────┬──────┘
                           │ 用户触发
                           ▼
              ┌────────────────────────┐
              │     plan_requested      │
              └───────────┬────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
     ┌──────────────┐        ┌──────────────┐
     │ plan_approved │        │  plan_rejected │ ← 回到 created
     └──────┬───────┘        └──────────────┘
            │ Agent 执行 plan Run
            ▼
     ┌──────────────┐
     │ plan_completed│
     └──────┬───────┘
            │ 用户审查 plan 产物后选择
            │ "approve build" 或 "close"
            │
     ┌──────┴──────────────────┐
     ▼                         ▼
┌──────────────┐        ┌──────────────┐
│build_requested│        │   completed  │ ← 仅 plan 就满足需求时
└──────┬───────┘        └──────────────┘
       │
┌──────┴───────┐
▼              ▼
┌─────────┐ ┌──────────┐
│build_ok │ │build_rej │ ← 回到 plan_completed
└────┬────┘ └──────────┘
     │ Agent 执行 build Run
     ▼
┌──────────────┐
│build_completed│
└──────┬───────┘
       │ 用户选择
┌──────┴───────┐
▼              ▼
┌─────────┐ ┌──────────┐
│verified │ │  verify   │ ← 触发 verify Run
└────┬────┘ │_requested │
     │      └─────┬─────┘
     │            │
     └────────────┤
                  ▼
           ┌──────────────┐
           │   completed  │
           └──────────────┘
```

**关键约束**：

1. `build` 必须先经过 `plan_approved`；
2. `plan` 完成后必须等待人工审批才能进入 `build`；
3. `verify` 是 Agent 执行的验证 Run，`review` 是人工判断——它们不是同一个概念；
4. 一个 Task 可以有多个 Run（plan Run → build Run → verify Run），每个 Run 独立记录；
5. 一个 Run 必须绑定一个 Agent Adapter。

---

## 六、Agent 接入边界

### 6.1 统一抽象（不假设具体 Agent 实现）

控制台不应包含 `openCodeCli.execute("path", "prompt")` 这样的硬编码调用。统一抽象：

```
AgentAdapter {
  type: "opencode" | "codex" | (future)
  
  dispatch(context: {
    workDir: string,          // 项目路径
    mode: "plan" | "build",   // Agent 模式
    prompt: string,           // 完整 Prompt
    taskId: string,
    runId: string
  }) → DispatchResult {
    sessionId: string,
    status: "dispatched" | "unavailable" | "error"
  }

  poll(sessionId) → SessionStatus {
    state: "starting" | "running" | "waiting" | "done" | "failed",
    summary: string,          // 最近输出摘要
    error: string | null
  }

  collectArtifacts(sessionId, destDir) → Artifact[]

  cancel(sessionId) → void
}
```

### 6.2 OpenCode 接入原则（未来实施）

| 方面 | 原则 |
|---|---|
| 如何传入项目路径 | 通过 `--workdir` 或等效参数指定工作目录 |
| 如何传入任务上下文 | 控制台组装完整 Prompt：项目背景 + 任务目标 + 允许/禁止范围 + 产物要求 |
| 如何传入 Prompt | Agent 接受 Prompt 字符串或文件路径。控制台将 Prompt 写入临时文件供 Agent 读取 |
| 状态收集 | 通过 Agent 的 session API 或 CLI 输出轮询获取状态和最新输出 |
| 产物收集 | Agent 完成后，控制台从指定目录读取产物文件 |
| 失败处理 | Run 标记为 failed，记录错误；用户可发起 retry（创建一个新 Run） |
| 停止/重试 | 调用 Agent 的 cancel / session 关闭能力 |
| 人工接管 | 控制台提供 "打开 Agent Session"入口，用户可在 Agent 原生界面继续操作 |

### 6.3 Agent 不得突破的边界

- Agent **不得**自动批准 plan → build 切换（必须人工审批）；
- Agent **不得**在 plan 模式下修改任何文件；
- Agent **不得**修改全局 `AGENTS.md` 或 `.gitignore`，除非 Task 明确允许；
- Agent **不得**绕过控制台直接写入 `data/`；
- Agent **不得**读取或修改其他项目（Task 指定的 workDir 之外的目录）。

---

## 七、现有能力复用

| 现有能力 | 复用方式 | 具体场景 |
|---|---|---|
| `tools/init-project-memory/` | 控制台注册新项目时调用，为其创建 `.ai/` 结构 | 项目接管 |
| `tools/sync-codex-home/` | 控制台修改全局 `AGENTS.md` 后调用，同步规则 | 全局规则更新 |
| `AGENTS.md` | 控制台读取并作为上下文注入 Agent Prompt | 每个 Task 的 Prompt 都包含 AGENTS.md 规则摘要 |
| `.ai/`（项目记忆） | 控制台读取项目 `.ai/` 获取项目上下文 | Task Prompt 中包含项目 business-context、current-state |
| `knowledge/flows/` | 控制台根据 Task 类型读取匹配的操作流程 | audit 任务读取 market-localchange-task-guide 的分析流程 |
| `knowledge/traces/` | 控制台的项目分析结果作为后续 Task 的上下文 | 项目背景文档生成后存入此目录 |
| `config/global.json` | 控制台读取 `workspaceRoots` 扫描项目 | 启动时扫描 |
| `data/projects-manifest.json` | 控制台的项目注册、状态更新、任务历史都写入此处 | 核心数据源 |

---

## 八、数据归属原则

| 数据类别 | 归属目录 | 示例 | 归属理由 |
|---|---|---|---|
| 全局配置（跨工具共享） | `config/` | workspaceRoots、扫描策略 | 多工具共用 |
| 项目清单、任务历史、运行记录、审批记录 | `data/` | projects-manifest.json, tasks/, runs/, approvals/ | 持续数据，需版本跟踪 |
| 流程、SOP、设计文档 | `knowledge/` | flows/ (SOP), traces/ (设计) | 知识资产，不参与运行时写入 |
| 工具脚本、模板、工具专属配置 | `tools/` | workbench/ (未来), init-project-memory/ | 可执行工具代码 |
| 项目自身的 AI 记忆 | 项目仓库 `.ai/` | business-context.md, decisions.md | 属于项目，不属于控制台 |
| 项目自身的 AGENTS.md | 项目仓库根目录 | AGENTS.md | 项目级规则，随项目版本管理 |

**原则**：
- `data/` 是控制台的运行时数据，只增不改历史记录；
- `knowledge/` 是只读参考资料，控制台不写入执行结果；
- 项目自身仓库中的文件，控制台可读但权限受 Task 约束（Agent 只能修改 Task 明确允许的范围）。

---

## 九、多 Session 协同未来接入方式

`knowledge/traces/multi-session-collaboration-implementation-v2.md` 描述的多 Session 协同能力**不作为独立产品开发**，而是作为控制台的**可选内部调度能力**。

| 多 Session 协同的规划能力 | 控制台中的对应位置 |
|---|---|
| 任务拆分 | `TaskService.createSubTasks(taskId)` |
| 异步创建 Agent Session | `AgentAdapter.dispatch()` 本身已异步 |
| 状态轮询 | `RunManager.pollRunStatus(runId)` |
| 结果汇总 | `TaskService.summarizeRuns(taskId)` |
| CLI 命令 | 作为控制台 CLI 入口的子命令：`console task spawn --project <id>` |

第一版不实现多 Session 并行；控制台的 Task → Run → Agent 单线模型已足够。未来需要并行时，在调度层扩展即可。

---

## 十、第一版最小能力边界

### 10.1 必须实现

| 能力 | 说明 |
|---|---|
| 项目登记 | 手动添加项目路径 + 自动调用 `init-project-memory` 初始化 `.ai/` |
| 项目状态读取 | 读取项目 `.ai/`、AGENTS.md、Git 状态、分支信息 |
| 项目背景 Prompt 生成 | 基于项目状态生成 "让 AI 重新理解本项目" 的 Prompt |
| 创建 Task | 选择项目 → 选择任务类型 → 填写描述 → 生成完整 Prompt |
| Task 审批 | Task 创建后 plan→build 各阶段需人工确认 |
| 单 Task 调用单 Agent | 通过 Agent Adapter 将 Prompt 分发给一个 Agent 执行 |
| 收集 Run 产物 | Agent 完成后收集 plan/build 产物到 `data/` |
| 更新项目状态 | Task 完成后更新 `projects-manifest.json` 中项目状态 |

### 10.2 第一版的结构位置

```
tools/                            ← 新增
└── ai-coding-console/
    ├── README.md                 ← 控制台使用说明
    ├── config/
    │   └── console-config.json   ← 控制台专属配置（全局 config/ 只在多工具共享时才用）
    └── scripts/                  ← 未来 CLI/PowerShell 入口脚本
```

> `tools/ai-coding-console/` 为初步命名，最终名称待技术路线设计时确认。不得在 V1 就创建庞大的目录树。

---

## 十一、明确不做的能力

| 能力 | 原因 |
|---|---|
| 自动拆解复杂任务为子任务 | V1 仅支持用户手动创建单个 Task |
| 自动多 Agent 并行 | Agent 调度是未来扩展，不在 V1 |
| 自动批准 build | 人必须在决策回路中 |
| 自动修改全局 AGENTS.md | 修改全局规则需用户显式操作 |
| 远程执行 | 控制台仅本地运行 |
| 多人协作 / 权限系统 | 单用户场景 |
| 技术栈选型（Electron / Tauri / React） | 核心模型设计阶段不预设 UI 技术 |
| UI 页面详细设计 | 本阶段仅定义交互入口边界，不设计具体 UI |
| 自动 Git 提交 / Push / PR | Agent 的输出由用户审查后手动提交 |
| 实时 Agent 日志流 | V1 使用轮询获取状态即可 |

---

## 十二、进入技术路线设计前必须确认的问题

| 序号 | 问题 | 当前状态 |
|---|---|---|
| 1 | 控制台是否需要一个独立进程（Electron/Tauri），还是完全在 CLI + Markdown 中运行？ | 未确认。产品定位是"桌面控制台"，但第一版可以先用 CLI + Markdown 验证核心模型，再决定是否需要 GUI |
| 2 | Agent Adapter 第一版是否只接入 OpenCode？是否预留 Codex 接口？ | 未确认。建议设计层面预留统一抽象，第一版只实现 OpenCode 适配器 |
| 3 | `data/` 下任务历史的存储格式是 JSON 还是 Markdown？ | 未确认。AGENTS.md 要求产物为 Markdown，但机器可读的 JSON 更适合状态管理和查询。建议关键状态用 JSON，产物/总结用 Markdown |
| 4 | Prompt 生成是否由控制台本地模板引擎完成，还是由 Agent 自己生成？ | 未确认。建议控制台提供上下文组装（项目背景 + 任务目标 + 规则），Prompt 最终由控制台拼接 |
| 5 | 第一版是否提供桌面 UI（Electron/Tauri），还是先用 CLI 交互 + OpenCode Web 查看 Agent 输出？ | 未确认。建议第一版用 CLI + Markdown board 验证核心模型 |
| 6 | `tools/ai-coding-console/` 作为控制台入口目录的命名是否确认？ | 未确认。备选：`tools/console/`、`tools/workbench/`、`tools/coding-desk/` |
| 7 | 当前 `AGENTS.md Scope` 中有 "No agents, No multi-session tooling"——这是指本仓库不开发 Agent，还是控制台也不调用 Agent？ | 未确认。需明确 Scope 是否随控制台开发而更新 |
