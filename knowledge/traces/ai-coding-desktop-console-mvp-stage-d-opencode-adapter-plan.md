# 多项目 AI Coding 桌面控制台 MVP — 阶段 D OpenCode Adapter 计划

> 生成日期：2026-07-05
> 前置：阶段 A/B/C/C收口/C.5 全部完成
> 本机 OpenCode: v0.137.0（CLI 二进制不可用）
> 当前：只出计划，不实施

---

## 一、阶段 D 范围与非范围

### 实现

| 能力 | 说明 |
|---|---|
| `task dispatch` | 创建 Run 基础设施（run.json + prompt.md），输出手动执行指令 |
| `task collect` | 读取 runs/ 目录产物，更新 Run 状态 |
| `task cancel` | 标记 Run 为 cancelled |
| Run 状态机 | ready → dispatched → running → completed/failed/cancelled |
| build 门禁 | `task dispatch --mode build` 仅在 plan_approved 后可用 |
| GUI dispatch/collect/cancel | 三个操作按钮 + Run 列表 |

### 不实现

| 不做 | 原因 |
|---|---|
| 自动调用 OpenCode 进程 | OpenCode CLI 二进制不存在 |
| 实时日志流 | 无 Agent API |
| 自动 Run 完成检测 | 无 Agent API，需手动 collect |
| Codex Adapter | 单 Agent 策略 |
| 多 Session 并行 | V1 范围外 |
| 自动 build | 需人工审批 |

---

## 二、本机 OpenCode 环境核查结果

| 检查项 | 结果 |
|---|---|
| `opencode --version` | 命令不存在 |
| `where.exe opencode` | 无匹配 |
| `npx opencode` | npm 404 |
| 安装版本 | v0.137.0 (`%USERPROFILE%\.codex\version.json`) |
| auth 状态 | 已认证 |
| session 索引 | `session_index.jsonl` 存在 |
| `/spawn` 命令 | 不存在 |

**结论**：OpenCode v0.137.0 不提供独立 CLI 或 session 创建命令。阶段 D 采用"预置 Run → 手动分发 → 结果收割"方案。

---

## 三、CLI / serve 两种接入方案对比

| 维度 | 方案 A: CLI 子进程 | 方案 B: HTTP serve |
|---|---|---|
| 前提 | `opencode` CLI 可用 | `opencode serve` 可用 |
| 本机 | **不可用** | **不可用** |
| 异步 | 子进程完成退出 | HTTP 长连接 |
| 结果 | stdout | HTTP body |

**两种方案当前均不可用。采用方案 C。**

---

## 四、推荐技术路线（方案 C）：预置 Run → 手动分发 → 结果收割

### 架构

```
控制台 (CLI/GUI)
  │
  ├── task dispatch → 创建 Run + Prompt + 指令
  │     ├── runs/<run-id>/run.json (status: ready)
  │     └── runs/<run-id>/prompt.md (完整上下文)
  │
  ├── [用户手动]: 在新 OpenCode session 打开项目，粘贴 prompt.md
  │
  └── task collect → 读取产物 → 更新状态 → completed

  未来 OpenCode 支持 CLI 时:
    task dispatch → execFile("opencode", ["run", "--workdir", ...])
    无需改 Run 数据模型
```

### 选择理由

1. **诚实面对现状**：No CLI = no auto，但 Run 数据模型可完全就绪
2. **未来零破坏**：当 OpenCode 提供 CLI，只改 dispatch 实现，不改数据
3. **GUI/CLI 共用**：server.js 和 console.ps1 输出相同 Run 基础设施
4. **手动分发可工作**：用户已有 OpenCode，只是不能程序化调用

---

## 五、Adapter 架构与调用链

```
console.ps1 task dispatch --task T-001
  │
  ├── 读取 task.json (projectId, title, description, status)
  ├── 读取项目 AGENTS.md, .ai/business-context.md, .ai/current-state.md
  ├── 生成 Run ID: R-YYYYMMDD-NNN-seq
  ├── 确保 runs/<run-id>/ 目录存在
  ├── 写入 run.json:
  │     { runId, taskId, mode: "plan", agentType: "opencode",
  │       status: "ready", createdAt, dispatchedAt: null,
  │       completedAt: null, error: null }
  ├── 写入 prompt.md (完整上下文 + 只读要求)
  └── 输出:

  "Run R-001 created. Status: ready.
   To execute manually:
   1. Open OpenCode in: <project-path>
   2. Paste: data/ai-coding-console/tasks/T-001/runs/R-001/prompt.md
   3. After completion, save output to: .../runs/R-001/plan.md
   4. Run: task collect --task T-001 --run R-001"
```

### server.js dispatch API

```javascript
// POST /api/tasks/:id/dispatch
execPS1(["task", "dispatch", "--task", tid]);
// Returns { runId, instructions }
```

---

## 六、Run 数据模型与目录归属

```
data/ai-coding-console/tasks/<task-id>/
├── task.json
├── prompt.md
├── runs/
│   └── <run-id>/              ← R-YYYYMMDD-NNN-seq
│       ├── run.json           ← { runId, taskId, mode, agentType, status, ... }
│       ├── prompt.md          ← 完整上下文 Prompt
│       ├── plan.md            ← plan 产物（用户手动保存/collect 收集）
│       ├── build.log          ← build 产物
│       └── verify-result.md   ← verify 产物
└── approvals/
```

### run.json schema

```json
{
  "runId": "R-20260705-001-01",
  "taskId": "T-20260705-001",
  "mode": "plan",
  "agentType": "opencode",
  "status": "ready",
  "createdAt": "...",
  "dispatchedAt": null,
  "completedAt": null,
  "error": null
}
```

---

## 七、Run 状态机

```
ready → dispatched → running → completed
                  ↘ failed
                  ↘ cancelled
```

| 状态 | 谁设置 | 说明 |
|---|---|---|
| `ready` | `task dispatch` | Run 已创建，Prompt 就绪 |
| `dispatched` | `task collect` 首次检测 | 用户已开始执行 |
| `running` | `task collect` | 执行中 |
| `completed` | `task collect` 检测到产物 | 执行完成 |
| `failed` | `task collect` / `task cancel` | 失败 |
| `cancelled` | `task cancel` | 取消 |

---

## 八、plan Run 的只读权限边界

| 规则 |
|---|
| prompt.md 第一行: "Run in PLAN MODE. Do NOT modify any files." |
| `task dispatch` 默认 `mode: plan` |
| `task dispatch --mode build` 仅 task.status === "plan_approved" 时可用 |
| `task collect` 后检查项目 Git 是否有意外变更，写入 error 字段 |

---

## 九、CLI 命令设计

| 命令 | 参数 | 功能 |
|---|---|---|
| `task dispatch` | `--task <id>` | 创建 plan Run，输出手动指令 |
| `task dispatch` | `--task <id> --mode build` | 仅 plan_approved 可用 |
| `task collect` | `--task <id> --run <run-id>` | 扫描 runs/ 目录，收集产物更新状态 |
| `task cancel` | `--task <id> --run <run-id>` | 标记 cancelled |
| `task status` | `--task <id>` | 已支持，新增 agentType + mode 显示 |

---

## 十、GUI 交互增量

| 组件 | 行为 |
|---|---|
| **[Dispatch]** 按钮 | 创建 Run → 弹窗显示手动执行指令 |
| Run 列表 | 每个 Run: ID / mode / agentType / status / artifacts |
| **[Collect]** 按钮 | 调用 collect API → 更新 Run 状态 |
| **[Cancel]** 按钮 | 确认弹窗 → 标记 cancelled |

---

## 十一、产物与日志

| 产物 | 文件 | 写入 |
|---|---|---|
| plan 分析 | `runs/<run-id>/plan.md` | 用户手动保存，或 collect 扫描 |
| build 日志 | `runs/<run-id>/build.log` | 同上 |
| verify | `runs/<run-id>/verify-result.md` | 同上 |
| 错误 | `run.json.error` | collect / cancel 写入 |

---

## 十二、超时/取消/失败/重试

| 场景 | 行为 |
|---|---|
| 超时 | 不强制（手动模式无超时判定） |
| 取消 | `task cancel` → status: cancelled |
| 失败 | collect 检测到 error → status: failed |
| 重试 | 新 dispatch → 新 Run ID，旧 Run 保留历史 |

---

## 十三、Token 控制

| 策略 |
|---|
| prompt.md 不反复发送 |
| 项目上下文分三级: AGENTS.md 摘要 + business-context.md 全文 + current-state.md 全文 |
| collect 只读产物，不重新 dispatch |

---

## 十四、安全边界与审批门禁

| 边界 |
|---|
| build dispatch 仅 plan_approved 可用 |
| plan prompt 第一行声明只读 |
| 审批不可绕过 CLI approve → task.json 更新 → 方可 build dispatch |
| 所有数据在 `data/ai-coding-console/tasks/<id>/runs/` |

---

## 十五、实施拆分

| 步骤 | 内容 | 提交 |
|---|---|---|
| 1 | CLI `task dispatch` + run.json + prompt.md | feat: task dispatch |
| 2 | CLI `task collect` + `task cancel` | feat: task collect/cancel |
| 3 | server.js dispatch/collect/cancel API | feat: GUI dispatch API |
| 4 | GUI 按钮 + Run 列表 | feat: GUI Run management |
| 5 | 端到端测试 + 清理 | test: end-to-end |

---

## 十六、完成标准

| # | 条件 |
|---|---|
| 1 | `task dispatch` 创建 Run + prompt.md + 输出指令 |
| 2 | `task status` 显示 Run 列表 |
| 3 | `task collect` 更新状态收集产物 |
| 4 | `task cancel` 标记 cancelled |
| 5 | build dispatch 仅 plan_approved 可用 |
| 6 | GUI dispatch/collect/cancel 可用 |
| 7 | 数据全在 tasks/<id>/runs/ |

---

## 十七、风险

| 风险 | 级别 | 说明 |
|---|---|---|
| OpenCode 无 CLI | 🔴 已知 | 手动分发降级 |
| collect 无法自动读 session | 🟡 | 用户手动保存产物 |
| 手动模式 UX | 🟢 | 指令步骤清晰 |

---

> **本机 OpenCode**: v0.137.0，CLI 不可用。方案 C：预置 Run → 手动分发 → 结果收割。未来 OpenCode 支持 CLI 时自动升级。
