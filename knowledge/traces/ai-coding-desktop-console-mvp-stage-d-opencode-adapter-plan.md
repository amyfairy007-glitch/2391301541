# 多项目 AI Coding 桌面控制台 MVP — 阶段 D OpenCode Adapter 计划

> 生成日期：2026-07-05（修订 v2：真实协议探测完成）
> 前置：阶段 A/B/C/C收口/C.5 全部完成
> 本机 OpenCode: **v1.17.13**，CLI 完全可用（`opencode.cmd`）
> 协议探测：已完成，JSONL event 结构已确认
> 修订：新增协议探测结果 + Plan 权限多层防线 + Git 基线越权检测

---

## 一、阶段 D 范围与非范围

### 实现

| 能力 | 说明 |
|---|---|
| `task dispatch` | 创建 Run 基础设施，调用 `opencode.cmd run` 执行 plan 分析 |
| `task collect` | 解析 Run 的 JSON 输出，保存产物，更新状态 |
| `task cancel` | 终止正在执行的 Run |
| Run 状态机 | ready → running → completed/failed/cancelled |
| Session 追踪 | run.json 保存 OpenCode sessionId，支持 `--session --continue` 断点续传 |
| build 门禁 | plan_approved 后才允许 `--mode build` dispatch |
| GUI dispatch/collect/cancel | 三个操作按钮 + Run 列表 + 指令预览 |

### 不实现

| 不做 | 原因 |
|---|---|
| Codex Adapter | 阶段 D 单 Agent，Codex 预留扩展位 |
| 多 Session 并行 | V1 单 Task 单 Run |
| 自动 build | 人工审批门禁 |
| 自动 Git 提交 | 安全边界 |
| `opencode.cmd serve` 管理 | MVP 用直接 run，serve 是未来优化 |

---

## 二、本机 OpenCode 环境核查结果（已更新）

| 检查项 | 结果 |
|---|---|
| `opencode.cmd --version` | **1.17.13** |
| `where.exe opencode.cmd` | `C:\nvm4w\nodejs\opencode.cmd` |
| `opencode.cmd run --help` | 完全可用：`--command`, `--file`, `--session`, `--continue`, `--format json`, `--dir`, `--attach` |
| `opencode.cmd serve --help` | 可用：`--port`, `--hostname 127.0.0.1` |
| 关键能力 | `--dir <project>`（指定项目目录）、`--format json`（结构化事件流）、`--session`（断点续传） |

**结论**：OpenCode CLI 能力远超预期。`opencode.cmd run` 可以直接创建真实 Agent Run，无需手动分发。

---

## 三、方案 A vs 方案 B 对比

### 方案 A：`opencode.cmd run` 直接调用

```
console.ps1 task dispatch
  → execFile("opencode.cmd", ["run", "--dir", projectPath, "--command", prompt, "--format", "json"])
  → 子进程 stdout 输出 JSON 事件流
  → 实时写入 runs/<run-id>/plan.md
  → 进程退出后更新 run.json (completed/failed)
```

### 方案 B：`opencode.cmd serve` 管理 + `--attach` API

```
console.ps1 serve start --port <port>
  → opencode.cmd serve --port <port> --hostname 127.0.0.1 (后台守护进程)

console.ps1 task dispatch
  → opencode.cmd run --attach http://127.0.0.1:<port> --dir <dir> --command ...
  → 通过 opencode HTTP API 查询 session 状态
  → 通过 opencode HTTP API 收集输出
```

### 对比

| 维度 | 方案 A (direct run) | 方案 B (serve + attach) |
|---|---|---|
| 复杂度 | 低：一个子进程 | 高：需管理 serve 生命周期 |
| 输出 | stdout 流，实时可读 | HTTP API，需轮询 |
| Session 复用 | `--session` + `--continue` | serve 自动管理 session |
| 并发 | 独立进程天然隔离 | 共享 serve 进程 |
| 取消 | `child.kill()` | 需 HTTP API 取消 |
| serve 故障 | 无影响 | 单点故障 |
| MVP 适用 | ✅ 极简 | ❌ 过度设计 |

### 推荐：方案 A — `opencode.cmd run` 直接调用

**理由**：
1. **零额外进程管理**：不需要启动/停止/监控 serve 守护进程
2. **标准化输出**：`--format json` 提供结构化 JSON 事件流，精确到每个工具调用
3. **Session 复用已内建**：`--session <id> --continue` 支持断点续传（plan → approve → build）
4. **取消简单**：`child_process.kill()` 直接杀掉子进程
5. **与现有 server.js 架构一致**：已用 `execFile` 调用 PowerShell，同样模式调用 `opencode.cmd`
6. **未来可平滑升级到方案 B**：当需要并发多 Run 时，加入 serve 管理即可

---

## 四、Adapter 架构与调用链

### CLI dispatch

```
console.ps1 task dispatch --task T-001
  │
  ├── 1. 读取 task.json + 项目 AGENTS.md + .ai/ 记忆
  ├── 2. 生成 Run ID (R-YYYYMMDD-NNN-seq)
  ├── 3. 确保 runs/<run-id>/ 目录存在
  ├── 4. 写入 run.json { runId, taskId, mode:"plan", agentType:"opencode", status:"ready", ... }
  ├── 5. 组装 prompt.md（项目上下文 + task 描述 + 只读声明）
  ├── 6. 更新 task.json (currentRunId, status: "planning")
  ├── 7. 调用 opencode.cmd:
  │     opencode.cmd run
  │       --dir <projectPath>
  │       --command "Run in plan mode. Do not modify files. Analyze per prompt."
  │       --file runs/<run-id>/prompt.md
  │       --format json
  │       --title "T-001 plan"
  │
  ├── 8. 捕获 stdout JSON 事件流:
  │     → 解析 event.type (assistant/text/tool_call/tool_result)
  │     → 提取 event.content → 追加写入 plan.md
  │     → 提取 tool_call → 追加写入 plan.md
  │
  ├── 9. 捕获 stderr → 写入 run log
  │
  └──10. 进程退出:
        if exitCode 0 → status: completed, task: awaiting_plan_approval
        if exitCode != 0 → status: failed, error: stderr summary
        run.json: sessionId = <OpenCode session id>, completedAt = now
```

### server.js dispatch API

```javascript
// POST /api/tasks/:id/dispatch
const child = spawn("opencode.cmd", [
  "run", "--dir", projectPath,
  "--command", "Run in plan mode. Do not modify files...",
  "--file", promptFile,
  "--format", "json",
  "--title", taskId + " plan"
], { cwd: REPO_ROOT });

child.stdout.on("data", (chunk) => {
  // Parse JSON lines, save to plan.md
  // Emit SSE events to GUI for live updates
});

child.on("close", (code) => {
  // Update run.json status
});
```

---

## 四-A、Agent Adapter 抽象层

### 设计原则

控制台的 CLI、GUI、Task 状态机、Run 管理器**不得直接调用 `opencode.cmd`**，不得包含任何 OpenCode 专属判断逻辑。所有 Agent 接入通过统一的 Adapter 接口完成。

`run.json` 中 `agentType` 字段驱动 Adapter 选择：

```
task dispatch
  → 读取 run.json.agentType ("opencode" | "codex" | (future))
  → 获取对应 Adapter 实例
  → adapter.dispatch(run) / adapter.cancel(run) / adapter.parseOutput(stdout)
```

### Adapter 接口

```javascript
// AgentAdapter 抽象接口（server.js 实现为 class）

interface AgentAdapter {
  name: string;           // "opencode" | "codex" | (future)
  isAvailable(): boolean; // 检查 CLI 二进制是否可用

  // 启��� Run — 返回子进程句柄
  dispatch(run, context): ChildProcess;
  // run: { runId, taskId, mode, agentType, workDir, promptFile }
  // context: { task, project }
  // 返回: Node.js ChildProcess (spawn 结果)

  // 解析 stdout JSONL 流 → 提取文本输出
  parseEvent(event: JSON): string | null;
  // event: 从 --format json stdout 解析的单个 JSON object
  // 返回: 文本内容或 null

  // 从事件中提取 sessionId
  extractSessionId(event: JSON): string | null;

  // 取消 Run
  cancel(proc: ChildProcess): void;
}
```

### 当前实现：OpenCodeAdapter

| 方法 | 实现 |
|---|---|
| `name` | `"opencode"` |
| `isAvailable()` | `which opencode.cmd` → Boolean |
| `dispatch()` | `spawn("opencode.cmd", ["run", "--dir", workDir, "--format", "json", "--title", title, ...])` |
| `parseEvent()` | 检查 `event.type === "text"`，提取 `event.part.text` |
| `extractSessionId()` | 返回 `event.sessionID` |
| `cancel()` | `proc.kill('SIGTERM')` |

### 预留接口：CodexAdapter

| 维度 | 内容 |
|---|---|
| 实现状态 | **仅接口定义，不实现，不安装，不调用，不验证** |
| `name` | `"codex"` |
| `isAvailable()` | 返回 `false`（阶段 D） |
| 扩展点 | 当 Codex CLI 可用时，实现上述 5 个方法并注册到 AdapterRegistry |

### 预留接口：ClaudeAdapter

| 维度 | 内容 |
|---|---|
| 实现状态 | **仅接口定义** |
| 扩展点 | 同上 |

### Adapter 注册表

```javascript
// server.js 启动时注册
const adapters = {
  opencode: new OpenCodeAdapter(),
  codex: null,     // 预留
  claude: null     // 预留
};

function getAdapter(agentType) {
  const a = adapters[agentType];
  if (!a || !a.isAvailable()) throw new Error(`Adapter not available: ${agentType}`);
  return a;
}
```

### GUI 与 Task 状态机的隔离

| 禁止 | 正确做法 |
|---|---|
| GUI 中硬编码 "opencode" 按钮 | 按钮文本从 `run.agentType` 生成：`"Dispatch (${agentType})"` |
| Task 状态机判断 `agentType === 'opencode'` | 状态机只判断 `run.status`、`task.status`、`mode`，不看 agentType |
| CLI 中硬编码 `opencode.cmd` 路径 | CLI 调用 `getAdapter(agentType).dispatch()` |
| board 中显示 "OpenCode session" | 显示 `"Session (${agentType}): ${sessionId}"` |

```
data/ai-coding-console/tasks/<task-id>/
├── task.json
├── prompt.md
├── runs/
│   └── <run-id>/              ← R-YYYYMMDD-NNN-seq
│       ├── run.json           ← { runId, taskId, mode, agentType, status, sessionId, ... }
│       ├── prompt.md          ← 该 Run 的完整 Prompt
│       ├── plan.md            ← opencode stdout JSON 事件流解析后的文本输出
│       ├── plan-raw.jsonl     ← opencode 原始 JSON 事件（每行一个 event）
│       ├── build.log          ← build 模式输出
│       └── verify-result.md   ← verify 输出
└── approvals/
```

### run.json schema

```json
{
  "runId": "R-20260705-001-01",
  "taskId": "T-20260705-001",
  "mode": "plan",
  "agentType": "opencode",
  "status": "completed",
  "sessionId": "abc123-def456",
  "exitCode": 0,
  "createdAt": "...",
  "startedAt": "...",
  "completedAt": "...",
  "error": null,
  "baseline": {
    "commit": "abc1234",
    "status": "",
    "changedFiles": []
  }
}
```

---

## 六、Run 状态机

```
ready → running → completed
       ↘ failed
       ↘ cancelled (kill signal)
```

| 状态 | 谁设置 | 触发条件 |
|---|---|---|
| `ready` | `task dispatch` | Run 已创建，尚未启动子进程 |
| `running` | opencode 子进程启动后 | stdout 第一行 JSON 到达 |
| `completed` | 子进程 exit(0) | 正常结束 |
| `failed` | 子进程 exit(!=0) 或异常 | 崩溃、超时、权限错误 |
| `cancelled` | `task cancel` / user kill | 用户取消或超时 |

---

## 七、plan Run 只读保证

| 层级 | 保证方式 |
|---|---|
| OpenCode 层 | `--command "Run in plan mode"` 告诉 Agent 当前是 plan 模式 |
| Prompt 层 | prompt.md 第一行：`## Mode: PLAN (Read-Only). Do NOT modify any files.` |
| 项目规则层 | 项目 AGENTS.md 中的 Working Rules 已要求 "analyze first, then change files" |
| 事后检查层（可选） | Run 结束后检查 `git status --porcelain`，有变更则 run.json.error 记录 |
| 审批门禁层 | plan Run 的结果必须人工 approve 后才能 dispatch build |

---

## 八、CLI 命令设计

| 命令 | 参数 | 功能 |
|---|---|---|
| `task dispatch` | `--task <id>` | 创建 plan Run → 调用 opencode.cmd run |
| `task dispatch` | `--task <id> --mode build` | task.status === "plan_approved" 时可用 |
| `task cancel` | `--task <id> --run <run-id>` | kill opencode 子进程，标记 cancelled |
| `task status` | `--task <id>` | 显示所有 Run（新增 sessionId / exitCode） |
| `task collect` | `--task <id> --run <run-id>` | 如果子进程已死但状态未更新，手动收集并修复 |

---

## 九、GUI 交互增量

| 组件 | 行为 |
|---|---|
| **[Dispatch]** 按钮 | 确认弹窗 → spawn opencode → 实时显示输出流 |
| 输出面板 | plan.md 内容实时追加显示 |
| **[Cancel]** 按钮 | 确认弹窗 → kill 子进程 |
| Run 列表 | ID / mode / agentType / status / sessionId / 产物 |

---

## 十、超时、取消、失败与重试

| 场景 | 行为 |
|---|---|
| 超时 | `spawn` 设置 `timeout: 600000`（10 分钟），超时自动 kill |
| 取消 | `task cancel` → `child.kill('SIGTERM')` → status: cancelled |
| 失败 | 子进程 exitCode !== 0 → status: failed, error 记录 stderr |
| 重试 | `task dispatch` 对同一 Task 创建新 Run (R-002) |
| 断点续传 | 失败后 `task dispatch --session <prev-session-id> --continue` 恢复 Agent 上下文 |

---

## 十一、Token 与上下文控制

| 策略 | 说明 |
|---|---|
| 不会重复发送历史 | 每次 dispatch 创建新 prompt.md，不携带旧的 plan 产物（除非 build 模式引用 plan.md） |
| Session 复用有限 | `--continue` 使用 OpenCode 的 session 机制复用上下文，不会把完整历史重新发送 |
| 历史查看零消耗 | task status / board show 只读本地文件 |
| raw JSON 保留 | `plan-raw.jsonl` 保存原始事件，供审计不消耗 token |

---

## 十二、安全边界与审批门禁

| 边界 | 实现 |
|---|---|
| build 门禁 | `task dispatch --mode build` 仅在 `task.status === "plan_approved"` 时执行 |
| plan 只读 | prompt.md 声明 + `--command` 声明 + 项目 AGENTS.md 规则 |
| 审批流程 | CLI approve → approvals/A-*.json → task.json status: plan_approved → 方可 build dispatch |
| 子进程隔离 | 每个 Run 独立进程，不共享状态 |

---

## 十三、废弃的原计划内容

| 废弃项 | 原因 |
|---|---|
| "方案 C: 预置 Run → 手动分发 → 结果收割" | OpenCode CLI 已完全可用 |
| "task collect 手动收集产物" | opencode stdout 直接流式写入 |
| "用户手动复制粘贴 prompt.md" | `--file` 参数自动传递 |
| "未来 OpenCode 支持 CLI 时升级" | 已是现状 |

---

## 十四、实施拆分

| 步骤 | 内容 |
|---|---|
| 1 | CLI `task dispatch` + run 创建 + opencode.cmd spawn |
| 2 | stdout JSON 解析 + plan.md 实时写入 |
| 3 | `task cancel` + 超时处理 |
| 4 | server.js `/api/tasks/:id/dispatch` + SSE 实时输出 |
| 5 | GUI dispatch/cancel 按钮 + 输出面板 |
| 6 | 端到端测试 + 清理 |

---

## 十五、完成标准

| # | 条件 |
|---|---|
| 1 | `task dispatch` 创建 Run + 调用 opencode.cmd run + sessionId 回写 |
| 2 | stdout JSON 事件流实时写入 plan.md |
| 3 | Run 结束后 task status → awaiting_plan_approval |
| 4 | `task cancel` 可用 kill 子进程 |
| 5 | build dispatch 仅 plan_approved 可用 |
| 6 | GUI dispatch/cancel + 实时输出面板可用 |
| 7 | 所有数据在 tasks/<id>/runs/ |

---

## 十六、实施前协议探测（2026-07-05 已完成）

### 探测环境

| 项目 | 内容 |
|---|---|
| 临时目录 | `%TEMP%\oc-probe-2\`（含 test.txt） |
| 命令 | `opencode.cmd run --dir <tmp> --format json --title "probe-x" ...` |
| 探测后 | 临时目录已删除，零残留 |

### 探测结果

| 探测项 | 结果 |
|---|---|
| `--format json` 输出 | JSONL 格式，每行一个 JSON object |
| 事件类型 | `step_start`, `text`, `step_finish`, `error` |
| `sessionID` | 每条事件均含：`ses_<run-id>` 格式 |
| `--file` + 消息共存 | ✅ 文件作为上下文附件，消息作为指令 |
| Token 统计 | `step_finish.part.tokens` = `{input, output, cache}` |
| 退出码（成功） | `0` |
| 只读行为 | ✅ 文件内容被读取，无任何修改 |

### 协议契约确认

| 不可假设项 | 探测确认 | 实施策略 |
|---|---|---|
| `--file` + `--command` 同时使用 | ✅ 可用 | prompt 作为消息，项目上下文通过 `--file` 附件 |
| JSON 事件字段稳定性 | 4 种 event type，字段稳定 | 用 `part.text` 提取文本输出 |
| sessionID 提取 | `event.sessionID` / `event.part.sessionID` | 从第一个 event 提取并保存到 run.json |
| Windows spawn/kill | ✅ `Start-Process -PassThru` + `Stop-Process` | task cancel 用 `Stop-Process` |
| Agent 是否读 AGENTS.md | **未探测**（临时目录无 AGENTS.md） | 控制台在 prompt.md 中显式包含 AGENTS.md 规则摘要 |
| run 成功但 Git 变脏 | **未探测** | 见 Git 安全门禁 |
| **无 `--mode plan` 参数** | **已确认** — CLI 不支持 | plan 只读通过 prompt + Git 基线双保险 |

---

## 十七、Plan 模式与权限强制策略

### CLI 不支持内建 plan mode

`opencode.cmd run --help` 未提供 `--mode plan/build/audit` 参数。只读保证依赖**三层防线**：

| 层 | 机制 | 说明 |
|---|---|---|
| **L1: Prompt 强制** | 消息开头 + prompt.md 首行均声明显式只读 | "Run in PLAN MODE (read-only). Do NOT modify, create, delete, or rename any file." |
| **L2: 项目规则** | 项目 AGENTS.md 已要求 "analyze first, then change files" | 控制台自动将 AGENTS.md 规则摘要注入 prompt.md |
| **L3: 事后检测** | Git 基线对比 | 见下一节 |

### 安全评估

| 评估 | 结论 |
|---|---|
| 是否具备真正可强制拒绝的权限参数？ | ❌ 不具备。`opencode.cmd run` 无 `--deny-edit` 或 `--readonly` 参数 |
| 基于 Prompt 的只读是否足够？ | ⚠️ 不足以保证，但配合 L3（Git 基线检测）可**事后检测**所有越权写入 |
| 是否阻塞阶段 D 实施？ | ❌ 不阻塞。三层防线中 L3 提供硬检测，越权写入可被捕获并标记 failed |

> **实施决定**：继续方案 A。Plan Run 后的 Git 状态变更自动标记为 `failed`，拒绝进入审批。

---

## 十八、Git 基线与越权写入检测

### dispatch 前基线录制

```
git -C <projectPath> rev-parse HEAD              → run.json.baselineCommit
git -C <projectPath> status --porcelain          → run.json.baselineStatus
git -C <projectPath> diff --name-only HEAD       → run.json.baselineFiles
```

### run 完成后检测

```
git -C <projectPath> status --porcelain          → currentStatus
git -C <projectPath> diff --name-only HEAD       → changedFiles
```

### 越权处理

| 条件 | 行为 |
|---|---|
| `currentStatus` 与 `baselineStatus` 一致 | run.status → completed ✅ |
| 有新增未跟踪文件 | 记录到 run.json.warning，不阻塞 |
| **有已修改/删除的已跟踪文件** | run.status → `failed`，run.json.error 记录变更文件清单，task status NOT updated to awaiting_plan_approval |

### 不自动回滚

任何越权变更由人工处理。控制台不执行 `git checkout`、`git reset` 或任何回滚操作。

---

## 十九、CLI 参数和事件格式兼容性边界

### 当前确认可用

| 参数/事件 | 状态 | 说明 |
|---|---|---|
| `--dir <path>` | ✅ 可用 | 未与 `--attach` 联用时为本地工作目录 |
| `--format json` | ✅ 可用 | JSONL 格式，每行一个 event |
| `--file <path>` | ✅ 可用 | 附件作为上下文，不自动保存 |
| `--command <cmd>` | ⚠️ 未独立探测 | 与消息 positionals 合并使用 |
| `--title <title>` | ✅ 可用 | session 标题 |
| `--session <id> --continue` | ⚠️ 未探测 | 假设可用，build Run 时验证 |
| `event.type` | ✅ step_start / text / step_finish / error | |
| `event.sessionID` | ✅ 字符串，格式 `ses_<base64>` | |
| `event.part.text` | ✅ 文本输出内容 | |

### 假设但未验证

| 假设 | 验证计划 |
|---|---|
| `--command` 与 positionals 同时可用 | build Run 前用临时探测验证 |
| `--session --continue` 可恢复上下文 | 实现后首次 build Run 验证 |
| JSON 事件中不包含 `type: "permission_request"` | 若出现则 run.json 记录为需要人工审批 |

---

## 二十、废弃的原计划内容

| 废弃项 | 原因 |
|---|---|
| "方案 C: 手动分发" | OpenCode CLI 已完全可用 |
| "task collect 手动收集" | stdout 流式写入 |
| "未来 OpenCode 支持 CLI 时升级" | 已是现状 |

