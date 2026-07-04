# 多项目 AI Coding 桌面控制台 MVP — 阶段 C.5 第一版图形界面计划

> 生成日期：2026-07-04
> 前置：阶段 A/B/C 已完成、C 收口已清理测试数据
> 当前：只出计划，不实施

---

## 一、阶段 C.5 范围与非范围

### 实现

| 页面 | 功能 |
|---|---|
| 项目列表 | 查看所有已登记项目（名称、路径、Git 状态、AI 记忆状态） |
| 项目详情 | 项目完整状态（Git 分支/remote/dirty、AGENTS.md、.ai/ 记忆文件） |
| Task 列表 | 该项目下所有 Task（ID、标题、状态、创建时间） |
| Task 详情 | Task 详情（状态、Runs、Approvals、planApprovalId/finalReviewId） |
| 创建 Task | 填写描述 → 确认创建 |
| approve / review / close | 带确认弹窗的操作入口 |
| board 查看 | 项目 Markdown board 渲染 |

### 不实现

- Agent dispatch（阶段 D）
- Run 创建
- 多 Session
- 实时日志流
- Git 自动提交
- 外部项目修改
- 数据编辑/删除（仅走审批流程）

---

## 二、技术路线选择与理由

### 推荐：Node.js 本地 HTTP 服务 + 纯 HTML/CSS/JS

| 维度 | 说明 |
|---|---|
| 服务端 | `tools/ai-coding-console/gui/server.js` — Node.js 内置 `http` + `fs` 模块，零 npm 依赖 |
| 前端 | `tools/ai-coding-console/gui/index.html` + `app.js` — 纯 HTML/CSS/JS，无框架 |
| 启动 | `node tools/ai-coding-console/gui/server.js` → 浏览器打开 `http://localhost:3456` |
| 包管理 | `package.json` 新增 `"scripts": {"gui": "node tools/ai-coding-console/gui/server.js"}` |

### 排除的路线

| 路线 | 排除理由 |
|---|---|
| Electron | 需数百 MB node_modules + 打包工具链，远超 MVP 需求 |
| Tauri | 需 Rust 工具链，学习曲线高 |
| React/Vue SPA | 需构建工具链（webpack/vite），MVP 只需简单页面 |
| PowerShell WinForms | UI 体验极差，且不与 Node 生态兼容 |
| File:// 直开 HTML | 浏览器安全策略禁止 file:// 下的 fetch/JSON 读取 |

### 选择理由总结

- **零外部依赖**：Node.js 内置 `http`、`fs`、`path`、`child_process` 足够
- **UI 可迭代**：纯 HTML/CSS/JS 改样式和布局无需重编译
- **复用 CLI**：写操作通过 `child_process.execFile` 调用 `console.ps1`，读操作直接读 JSON
- **轻量启动**：一行 `node server.js`，比 Electron start 快 50 倍

---

## 三、GUI 与 CLI / 数据域的关系

```
┌──────────────┐     ┌──────────────┐
│  Browser UI  │     │  CLI 入口     │
│  (HTML/JS)   │     │ (console.ps1) │
└──────┬───────┘     └──────┬───────┘
       │ fetch REST          │ PowerShell
       ▼                     ▼
┌──────────────────────────────────────┐
│         server.js (Node.js)          │
│  ├── 读 JSON 文件 (fs.readFileSync)  │
│  ├── 写操作 (child_process → ps1)    │
│  └── 静态文件 serve                  │
└──────────────┬───────────────────────┘
               │ 读写同一份
               ▼
┌──────────────────────────────────────┐
│     data/ai-coding-console/          │
│  ├── projects-manifest.json          │
│  ├── tasks/ (按需)                   │
│  ├── board/ (按需)                   │
│  └── reports/ (按需)                 │
└──────────────────────────────────────┘
```

**原则**：
- **读数据**：server.js 直接 `fs.readFileSync` 读 JSON — 零转换，零缓存，始终反映磁盘真实状态
- **写操作**：server.js `child_process.execFile("powershell", ["-File", "console.ps1", "task", "create", ...])` — 完全复用 CLI 的状态机和验证逻辑，GUI 不重复实现
- **不做双写**：GUI 和 CLI 读写同一份 `data/ai-coding-console/` 文件

---

## 四、第一版页面结构

```
┌─────────────────────────────────────┐
│  AI Coding Console — Projects       │  ← 顶部导航
│  [Projects] [Tasks] [Board]         │
├─────────────────────────────────────┤
│                                     │
│   第一版只有 Project List →         │  ← 左侧项目列表
│   点击项目 → Project Detail         │
│   点击 Tasks Tab → Task List        │
│   点击 Task → Task Detail           │
│                                     │
├─────────────────────────────────────┤
│  Phase: C.5 | v0.1.0-c5            │  ← 底部状态
└─────────────────────────────────────┘
```

页面路由（前端 hash 路由）：

| URL hash | 页面 | 数据源 |
|---|---|---|
| `#/` | 项目列表 | `GET /api/projects` |
| `#/projects/:id` | 项目详情 | `GET /api/projects/:id` |
| `#/projects/:id/tasks` | Task 列表 | `GET /api/tasks/:projectId` |
| `#/projects/:id/tasks/:taskId` | Task 详情 | `GET /api/tasks/:projectId/:taskId` |
| `#/projects/:id/board` | Board 查看 | `GET /api/board/:projectId` |

---

## 五、项目列表页设计

### API

```
GET /api/projects
→ 读 projects-manifest.json
→ 返回: { projects: [...] }
```

### 页面

```
┌────────────────────────────────────────────────┐
│ Projects                        [+ Add]        │
├────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐ │
│ │ ai-ui-agentic                              │ │
│ │ E:\program\ai-ui-agentic                   │ │
│ │ main · github.com/amyfairy007-glitch/agents│ │
│ │ AI Memory ✓  ·  AGENTS.md ✓                │ │
│ │ [View Details]  [Tasks]  [Board]           │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│ No more projects. Use CLI: project add --path  │
└────────────────────────────────────────────────┘
```

### 空状态

```
┌────────────────────────────────────────────────┐
│ No registered projects.                        │
│ Use CLI: project add --path <project-dir>      │
└────────────────────────────────────────────────┘
```

---

## 六、项目详情页设计

### API

```
GET /api/projects/:id
→ execute: console.ps1 project status --project :id
→ 解析输出返回结构化数据

或直接读 manifest + run git commands
```

### 页面

```
┌────────────────────────────────────────────────┐
│ ← Back                                          │
│ ai-ui-agentic                    [Prompt]       │
│ E:\program\ai-ui-agentic                        │
├────────────────────────────────────────────────┤
│ Git: main · Clean                              │
│ Remote: github.com/amyfairy007-glitch/agents    │
│ AGENTS.md: Present (4.3 KB)                     │
│ AI Memory: Initialized                          │
│   ✓ business-context.md                         │
│   ✓ current-state.md                            │
│   ✓ decisions.md                                │
├────────────────────────────────────────────────┤
│ [Tasks (0)]  [Board]                            │
└────────────────────────────────────────────────┘
```

---

## 七、Task 列表与 Task 详情设计

### API

```
GET /api/tasks/:projectId
→ 读 data/ai-coding-console/tasks/ 下所有 task.json
→ 返回: { tasks: [...] }

GET /api/tasks/:projectId/:taskId
→ 读对应的 task.json + 检查 runs/ + approvals/
→ 返回: { task: {...}, runs: [...], approvals: [...] }
```

### Task 列表

```
┌────────────────────────────────────────────────┐
│ Tasks — ai-ui-agentic         [+ New Task]      │
├────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐ │
│ │ T-001  created                              │ │
│ │ 分析项目结构                                 │ │
│ │ 2026-07-04 · No runs · No approvals         │ │
│ │ [View]                                     │ │
│ └────────────────────────────────────────────┘ │
│                                                │
│ Empty state: No tasks yet. Create one.          │
└────────────────────────────────────────────────┘
```

### Task 详情

```
┌────────────────────────────────────────────────┐
│ ← Back                                          │
│ T-001 — 分析项目结构                            │
│ Status: created · Created: 2026-07-04           │
├────────────────────────────────────────────────┤
│ Runs: none                                      │
│ Approvals: none                                 │
│                                                 │
│ [Approve Plan] [Review] [Close]                 │
│ (buttons disabled if conditions not met)         │
└────────────────────────────────────────────────┘
```

---

## 八、创建 Task 与审批 / review / close 操作设计

### 创建 Task

```
┌─ New Task ──────────────────────────────┐
│                                          │
│ Description:                             │
│ ┌──────────────────────────────────────┐ │
│ │ 分析项目结构并给出改进建议            │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [Cancel]  [Create Task]                  │
└──────────────────────────────────────────┘
```

POST `/api/tasks` → server.js executes:
```powershell
powershell -ExecutionPolicy Bypass -File console.ps1 task create --project <id> --desc "..."
```

### 操作按钮状态

| 操作 | 启用条件 | 未启用时显示 |
|---|---|---|
| Approve Plan | Task status == any (plan.md exists = approveable) | "No plan artifacts" |
| Review | Task status == plan_approved AND build/verify artifacts exist | "No artifacts / not approved" |
| Close | Task status == completed | "Not completed" |

### 确认弹窗

```
┌─ Confirm ───────────────────────────────┐
│ Approve plan for T-001?                 │
│ This will allow building.                │
│ [Cancel]  [Approve]                      │
└──────────────────────────────────────────┘
```

---

## 九、board 查看与生成设计

### API

```
GET /api/board/:projectId
→ execute: console.ps1 board show --project :id
→ read the generated board.md file
→ return: { content: "..." }
```

### 页面 — Markdown 渲染

```
┌──────────────────────────────────────────────┐
│ Board — ai-ui-agentic        [Refresh]       │
├──────────────────────────────────────────────┤
│ # Project Board: ai-ui-agentic               │
│ Path: E:\program\ai-ui-agentic               │
│                                              │
│ ## Tasks                                     │
│ | Task ID | Title | Status | Created |       │
│ |---------|-------|--------|---------|       │
│ ... (rendered as table)                      │
└──────────────────────────────────────────────┘
```

前端用简单的 Markdown→HTML 转换（不引入 marked.js，手写 50 行正则即可）。

---

## 十、状态刷新与错误展示设计

### 刷新

- 每个页面顶部有 [Refresh] 按钮，重新调用 API 并渲染
- 不自动轮询（无 Agent 运行时不需要实时刷新）

### 错误展示

```
┌─ Error ────────────────────────────────┐
│ Failed to load projects.               │
│ Server may not be running.             │
│ Start with: npm run gui                │
│ [Retry]                                │
└────────────────────────────────────────┘
```

### 空状态统一模式

```
┌────────────────────────────────────────┐
│ No tasks yet.                          │
│ Create one via CLI or GUI.             │
└────────────────────────────────────────┘
```

---

## 十一、确认弹窗与危险操作边界

| 操作 | 需要确认 | 确认文案 |
|---|---|---|
| approve（有产物） | 是 | "Approve plan for T-XXX? This will allow building." |
| review（approve） | 是 | "Approve final review for T-XXX? Task will be completed." |
| review（reject） | 是 | "Reject final review for T-XXX?" |
| close | 是 | "Close task T-XXX? A summary report will be generated." |
| 创建 Task | 否 | 非危险操作，form submit 即可 |

---

## 十二、文件与目录归属

```
tools/ai-coding-console/
├── cli/
│   └── console.ps1            ← 现有，不改
├── config/
│   └── console-config.json    ← 现有，不改
├── gui/                        ← 新增
│   ├── server.js              ← Node.js HTTP server（~150 行）
│   ├── index.html             ← 主页面（~100 行）
│   └── app.js                 ← 前端逻辑（~300 行）
└── README.md                   ← 更新
```

| 新增依赖 | 数量 |
|---|---|
| npm 包 | **0 个**。仅用 Node.js 内置 `http`、`fs`、`path`、`child_process` |
| `package.json` 新增 scripts | 1 行：`"gui": "node tools/ai-coding-console/gui/server.js"` |

**不新增顶层目录，不修改 `config/`、`data/` 结构。**

---

## 十三、实施拆分与提交策略

| 步骤 | 内容 | 单独提交 |
|---|---|---|
| 1 | `server.js`：静态文件 serve + `/api/projects` GET | ✅ |
| 2 | `index.html` + `app.js`：项目列表页 + 项目详情页 | ✅ |
| 3 | Task 列表 + Task 详情 API + 前端页面 | ✅ |
| 4 | 创建 Task + approve/review/close API + 确认弹窗 | ✅ |
| 5 | board 查看 + Markdown 渲染 | ✅ |
| 6 | `package.json` 添加 `gui` script + README 更新 | ✅ |

---

## 十四、验证方案

```powershell
# 1. 启动 GUI
npm run gui

# 2. 浏览器打开 http://localhost:3456
# 预期: 项目列表显示 ai-ui-agentic

# 3. 点击项目 → 查看详情
# 预期: Git、AGENTS.md、.ai/ 状态正确

# 4. 点击 Tasks → 空状态
# 预期: "No tasks yet"

# 5. 创建 Task → 填写描述 → 确认
# 预期: Task 出现在列表中，CLI task list 同步可见

# 6. 通过 CLI 手动创建 plan.md 模拟产物 → GUI approve
# 预期: "Approve plan" 按钮启用，确认后状态变为 plan_approved

# 7. 查看 board
# 预期: Markdown 表格渲染 Task 列表

# 8. JSON 无污染
Get-Content data/ai-coding-console/projects-manifest.json -Raw | ConvertFrom-Json
```

---

## 十五、阶段 C.5 完成标准

| # | 条件 |
|---|---|
| 1 | `npm run gui` 可启动，浏览器可访问 |
| 2 | 项目列表页正确显示所有已登记项目 |
| 3 | 项目详情页显示 Git/AGENTS.md/.ai/ 状态 |
| 4 | Task 列表正确显示（含空状态） |
| 5 | 创建 Task 通过 GUI 可用，CLI 同步可见 |
| 6 | approve/review/close 均有确认弹窗 |
| 7 | board 查看可渲染 Task 列表 |
| 8 | 所有写操作复用 console.ps1（server.js 不自行实现） |
| 9 | 0 个新增 npm 依赖 |
| 10 | 不修改 AGENTS.md、config/global.json、现有 tools/ |

---

## 十六、风险与待确认项

| 风险 | 级别 | 说明 |
|---|---|---|
| PowerShell 控制台窗口闪烁 | 🟢 低 | server.js 调用 console.ps1 时可能弹出 PowerShell 窗口。可通过 `execFile("powershell", ["-WindowStyle", "Hidden", ...])` 抑制 |
| Windows Defender 拦截 localhost 服务 | 🟢 低 | localhost 端口通常不触发防火墙 |
| Markdown 渲染粗糙 | 🟢 低 | 仅需支持标题、表格、列表三种语法，手写正则足够 |

| 序号 | 待确认项 |
|---|---|
| 1 | 端口号：`3456` 可以吗？还是指定其他端口？ |
| 2 | 第一版是否需要支持 project add（登记新项目）的 GUI 操作，还是仅用 CLI 登记？建议仅 CLI 登记，GUI 只读取和 Task 操作 |
| 3 | `package.json` 加入 `"gui"` script 是否允许？ |

---

> **状态：阶段 C.5 GUI 计划完成。待用户确认技术选型和 3 项待确认后进入实施。**
