# 多项目 AI Coding 桌面控制台 MVP — 阶段 C 实施计划

> 生成日期：2026-07-04
> 前置：阶段 B 已完成（commit: `e641a7e`）
> 后续：阶段 D — Agent Adapter
> 当前：只出计划，不实施

---

## 一、阶段 C 范围

| 命令 | 功能 | 是否涉及 Agent |
|---|---|---|
| `task create --project <id> --desc "..."` | 创建 Task，生成 task.json + prompt.md；自动创建 tasks/ 目录 | 否 |
| `task list --project <id>` | 列出项目下所有 Task 及状态 | 否 |
| `task status --task <task-id>` | 查看 Task 详情：状态、审批记录、产物列表 | 否 |
| `task approve --task <task-id> [--reject]` | plan 审批（检查 plan 产物是否存在，存在则审批，不存在则明确拒绝） | 否 |
| `task review --task <task-id> [--reject]` | final review（检查 build + verify 产物是否存在，存在则审批，不存在则明确拒绝） | 否 |
| `task close --task <task-id>` | 关闭 Task，写 summary.md 到 reports/；自动创建 reports/ 目录 | 否 |
| `board show --project <id>` | 生成项目 Markdown board；自动创建 board/ 目录 | 否 |

---

## 二、Task、Approval、Board、Report 的数据归属

### 完整结构（阶段 C 实际创建部分）

```
data/ai-coding-console/
├── projects-manifest.json           ← 现有，阶段 C 更新 lastActiveTaskId
├── tasks/                           ← 首次 task create 时按需创建
│   └── <task-id>/                   ← T-YYYYMMDD-NNN
│       ├── task.json                ← Task 元数据
│       ├── prompt.md                ← 创建时写入的 Prompt
│       ├── runs/                    ← 阶段 D 首次 task dispatch 时按需创建
│       │   └── <run-id>/
│       │       ├── run.json
│       │       ├── plan.md          ← 阶段 D Agent 写入
│       │       ├── build.log        ← 阶段 D Agent 写入
│       │       └── verify-result.md ← 阶段 D Agent 写入
│       └── approvals/               ← 首次 task approve 时按需创建
│           └── <approval-id>.json   ← A-<task-id>-NN
├── board/                           ← 首次 board show 时按需创建
│   └── <project-id>-board.md
└── reports/                         ← 首次 task close 时按需创建
    └── <task-id>-summary.md
```

### 不在哪里

| 不在这里 | 正确归属 |
|---|---|
| `data/ai-coding-console/approvals/`（根级） | ❌ 不创建。Approval 只在 tasks/<id>/approvals/ |
| `data/ai-coding-console/tasks/approvals/` | ❌ 不创建。Approval 归属 Task |

---

## 三、首次创建时按需创建 data 目录

| 触发命令 | 创建的目录 |
|---|---|
| 首次 `task create` | `data/ai-coding-console/tasks/` |
| 首次 `task approve` 或 `task review` | `data/ai-coding-console/tasks/<id>/approvals/` |
| 首次 `board show` | `data/ai-coding-console/board/` |
| 首次 `task close` | `data/ai-coding-console/reports/` |

**原则**：每次写文件前，`Test-Path` 检查父目录；不存在则 `New-Item -ItemType Directory -Force`。不单独预先创建空目录。

---

## 四、task create 设计

### 输入

```
task create --project ai-ui-agentic --desc "分析项目结构并给出改进建议"
```

### 流程

```
1. 根据 --project 查找 manifest 中的项目
   → 找不到: 报错 exit 1
2. 生成 Task ID: T-YYYYMMDD-NNN（按当天已有 Task 递增 NNN）
3. 确保 data/ai-coding-console/tasks/ 目录存在（不存在则创建）
4. 创建 data/ai-coding-console/tasks/<task-id>/ 目录
5. 写入 task.json:
   {
     "taskId": "T-20260705-001",
     "projectId": "ai-ui-agentic",
     "projectPath": "E:\\program\\ai-ui-agentic",
     "title": "分析项目结构并给出改进建议",
     "description": "...",
     "status": "created",
     "createdAt": "2026-07-05T12:00:00Z",
     "updatedAt": "2026-07-05T12:00:00Z",
     "closedAt": null
   }
6. 写入 prompt.md（复用 project prompt 的内容拼接逻辑）
7. 更新 manifest: lastActiveTaskId = taskId, lastActivityAt = now
8. 输出: "Task created: T-20260705-001"
```

### task.json schema

| 字段 | 类型 | 说明 |
|---|---|---|
| `taskId` | string | T-YYYYMMDD-NNN |
| `projectId` | string | 所属项目 ID |
| `projectPath` | string | 项目根路径（冗余，方便脱离 manifest 独立读取） |
| `title` | string | 同 --desc 参数 |
| `description` | string | 同 --desc |
| `status` | string | 见状态机章节 |
| `createdAt` | string | ISO 时间 |
| `updatedAt` | string | ISO 时间 |
| `closedAt` | string\|null | 关闭时间 |
| `planApprovalId` | string\|null | 第一阶段审批 ID（task approve 后写入） |
| `finalReviewId` | string\|null | 最终审批 ID（task review 后写入） |

**不写入**：Run 列表（从 runs/ 目录下发现）、Artifact 列表（同 runs/）

---

## 五、task list 与 task status 设计

### task list 输出

```
Task for project: ai-ui-agentic
  ID              Status      Title                          Created      Updated
  --              ------      -----                          -------      -------
  T-20260705-001  created     分析项目结构并给出改进建议       2026-07-05   2026-07-05
  T-20260705-002  plan_approved 实现用户登录                  2026-07-05   2026-07-05
```

排序：createdAt 降序。

### task status 输出

```
Task: T-20260705-001
Project: ai-ui-agentic (E:\program\ai-ui-agentic)
Title: 分析项目结构并给出改进建议
Status: created
Created: 2026-07-05 12:00

Runs: none
Approvals: none
```

---

## 六、task approve 与 task review 的边界

### 核心原则

**阶段 C 不接 Agent，不创建 Run，不伪造产物。** `task approve` 和 `task review` 的完整逻辑已实现，但会自然因产物缺失而拒绝——这不是假流程，是真实的门禁。

### task approve 设计

```
task approve --task T-20260705-001 [--reject]

1. 读取 task.json
2. 检查 task.json 中是否已有 planApprovalId
   → 已存在: "Already approved/rejected. Use task review for final review."
3. 检查 runs/ 目录下是否存在 plan.md
   → 不存在: "No plan artifacts found. Dispatch plan run first (Phase D: task dispatch)."
   → 存在: 继续
4. 用户选择了 --reject ?
   → reject: 写 approval (status: rejected), task status → created
   → 未选: 写 approval (status: approved), task status → plan_approved
5. 更新 task.json (planApprovalId, updatedAt, status)
```

### task review 设计

```
task review --task T-20260705-001 [--reject]

1. 读取 task.json
2. 检查 task.status 是否为 plan_approved
   → 不是: "Task not ready for review. Complete plan approval first."
3. 检查 runs/ 目录下是否存在 build.log 或 verify-result.md
   → 不存在: "No build/verify artifacts found. Dispatch build/verify runs first (Phase D: task dispatch)."
   → 存在: 继续
4. 用户选择了 --reject ?
   → reject: 写 approval (status: rejected), task status → plan_approved (回退)
   → 未选: 写 approval (status: approved), task status → completed
5. 更新 task.json (finalReviewId, updatedAt, status)
```

### approval.json schema

```json
{
  "approvalId": "A-T-20260705-001-01",
  "taskId": "T-20260705-001",
  "type": "plan_approval",
  "status": "approved",
  "requestedAt": "...",
  "decidedAt": "...",
  "comment": ""
}
```

---

## 七、task close 设计

```
task close --task T-20260705-001

1. 读取 task.json
2. 检查 task.status 是否为 completed
   → 不是: "Task not completed. Current status: <status>. Complete final review first."
3. 确保 data/ai-coding-console/reports/ 目录存在
4. 写入 data/ai-coding-console/reports/T-20260705-001-summary.md
   内容: task 基本信息 + 所有 approval 记录摘要 + 所有 run 记录摘要
5. 更新 task.json (closedAt = now)
6. 更新 manifest (activeTaskCount -1, lastActivityAt = now)
```

---

## 八、board show 设计

```
board show --project ai-ui-agentic

1. 根据 --project 查找 manifest 中的项目
2. 确保 data/ai-coding-console/board/ 目录存在
3. 从 tasks/ 目录下读取所有该项目的 task.json
4. 聚合信息生成 Markdown board:
   - 项目摘要（名称、路径、Git 状态）
   - 当前活跃 Task 列表
   - 每个 Task 的状态、创建时间、最近审批状态
5. 写入 data/ai-coding-console/board/ai-ui-agentic-board.md
6. 输出: "Board saved: data/ai-coding-console/board/ai-ui-agentic-board.md"
```

### board.md 内容模板

```markdown
# Project Board: ai-ui-agentic

Path: E:\program\ai-ui-agentic
Updated: 2026-07-05

## Active Tasks (2)

| Task | Title | Status | Created |
|------|-------|--------|---------|
| T-001 | 分析项目结构 | plan_approved | 2026-07-05 |
| T-002 | 实现用户登录 | created | 2026-07-05 |
```

---

## 九、Task 状态机

### 状态值

| 状态 | 含义 | 谁触发 |
|---|---|---|
| `created` | Task 已创建，尚未执行 plan | task create |
| `planning` | ⏸️ 后端状态，阶段 D Agent 写入。阶段 C 不设置此状态 | Agent |
| `awaiting_plan_approval` | ⏸️ 后端状态，plan Run 完成后 Agent 设置。阶段 C 不设置此状态 | Agent |
| `plan_approved` | plan 审批通过 | task approve |
| `plan_rejected` | plan 审批拒绝 | task approve --reject |
| `building` | ⏸️ 后端状态，阶段 D Agent 写入 | Agent |
| `build_completed` | ⏸️ Agent 写入 | Agent |
| `verifying` | ⏸️ Agent 写入 | Agent |
| `awaiting_final_review` | ⏸️ Agent 写入 | Agent |
| `completed` | final review 通过 | task review |
| `failed` | 任一阶段失败 | task close 前的任一步骤 reject（可覆盖） |

### 阶段 C 实际可操作的状态转换

```
task create          → created
task approve         → plan_approved (仅当 plan.md 存在)
task approve --reject → plan_rejected (仅当 plan.md 存在)
task review          → completed (仅当 build.log/verify 产物存在)
task review --reject → plan_approved (退回，仅当产物存在)
task close           → (仅当 status = completed)
```

⏸️ 标记的状态在阶段 D 由 Agent 自动设置。阶段 C 不预设这些状态的写入逻辑。

---

## 十、没有 Agent / Run 时如何处理审批与状态

| 场景 | 用户操作 | 实际结果 | 原因 |
|---|---|---|---|
| 无 plan 产物时执行 `task approve` | `task approve --task T-001` | "No plan artifacts found. Dispatch plan run first." | `Test-Path runs/.../plan.md` = False |
| 无 build 产物时执行 `task review` | `task review --task T-001` | "No build/verify artifacts found. Dispatch plan/build/verify runs first." | `Test-Path runs/.../build.log` = False |
| status 不是 completed 时执行 `task close` | `task close --task T-001` | "Task not completed. Current status: created." | status !== "completed" |

**这不是假流程**。`task approve` 的真实门禁是产物是否存在。阶段 C 实现了完整的门禁逻辑，只是产物由阶段 D 的 Agent 提供。门禁本身不是在阶段 D 才写——现在就能写对。

---

## 十一、CLI 参数、错误处理与幂等性

| 场景 | 处理 |
|---|---|
| `task create` 缺 --project | "Missing --project." |
| `task create` 缺 --desc | "Missing --desc." |
| `task create` 项目不存在 | "Project not found: xxx." |
| `task list` 缺 --project | "Missing --project." |
| `task status` 缺 --task | "Missing --task." |
| `task status` Task 不存在 | "Task not found: xxx." |
| `task approve` 缺少 --task | 同上 |
| `task approve` 重复执行 | "Already approved/rejected."（planApprovalId 已非空） |
| `task close` 重复执行 | "Task already closed."（closedAt 已非空） |

---

## 十二、验证方案

### 测试步骤

```powershell
# 1. 创建 Task
console.ps1 task create --project ai-ui-agentic --desc "Test task"
# 预期: Task created: T-YYYYMMDD-001
# 验证: data/ai-coding-console/tasks/ 目录存在

# 2. Task list
console.ps1 task list --project ai-ui-agentic
# 预期: 列出刚创建的 Task

# 3. Task status
console.ps1 task status --task T-YYYYMMDD-001
# 预期: status: created, runs: none

# 4. Task approve（无产物）
console.ps1 task approve --task T-YYYYMMDD-001
# 预期: "No plan artifacts found. Dispatch plan run first (Phase D)."

# 5. Task review（无产物）
console.ps1 task review --task T-YYYYMMDD-001
# 预期: "Task not ready for review. Complete plan approval first."

# 6. Task close（未完成）
console.ps1 task close --task T-YYYYMMDD-001
# 预期: "Task not completed. Current status: created."

# 7. 模拟 Agent 产物后 task approve
mkdir data/ai-coding-console/tasks/T-YYYYMMDD-001/runs/R-001
echo "# Plan" > data/ai-coding-console/tasks/T-YYYYMMDD-001/runs/R-001/plan.md
console.ps1 task approve --task T-YYYYMMDD-001
# 预期: "Plan approved. Task status: plan_approved"

# 8. Board show
console.ps1 board show --project ai-ui-agentic
# 预期: Board 文件生成

# 9. JSON 合法性验证
Get-Content data/ai-coding-console/tasks/T-YYYYMMDD-001/task.json -Raw | ConvertFrom-Json

# 10. 外部项目无修改
git diff tools/init-project-memory/ tools/sync-codex-home/ AGENTS.md config/global.json
# 预期: 无输出
```

---

## 十三、提交与回滚

**提交**：单次 commit

```
git commit -m "feat: 控制台阶段 C — CLI Task 生命周期"
```

**回滚**：

```powershell
git revert --no-edit HEAD
```

---

## 十四、阶段 C 完成标准

| # | 条件 |
|---|---|
| 1 | `task create` 可创建 Task，生成 task.json + prompt.md |
| 2 | `task list` 可列出项目所有 Task |
| 3 | `task status` 可显示 Task 详情 |
| 4 | `task approve` 对无产物 Task 正确拒绝（"No plan artifacts found"） |
| 5 | `task approve` 对有产物 Task 正确批准 |
| 6 | `task review` 对无产物 Task 正确拒绝 |
| 7 | `task review` 对有产物 Task 正确批准 |
| 8 | `task close` 对未完成 Task 正确拒绝 |
| 9 | `board show` 可生成 Markdown board |
| 10 | `tasks/` `board/` `reports/` 均为首次使用时按需创建 |
| 11 | Approval 全在 tasks/<id>/approvals/ 下 |
| 12 | 外部项目无修改，现有工具无修改 |
| 13 | 所有错误场景有明确输出 |

---

## 十五、风险与待确认项

| 风险 | 级别 | 说明 |
|---|---|---|
| task.json 读取时字段大小写不一致 | 🟢 低 | 阶段 B 已有处理大小写兼容的经验（`if ($e.lastActivityAt) { ... } elseif ($e.lastactivityat) { ... }`），阶段 C 继承同样模式 |

| 序号 | 待确认项 |
|---|---|
| 1 | 模拟 Agent 产物的测试（步骤7）是否需要作为阶段 C 验证的一部分正式保留，还是仅作为开发期临时测试？ |
| 2 | board.md 的格式是否需要支持更多字段（如审批时间、Run 数量等）？ |

---

> **状态：阶段 C 实施计划完成。待用户确认后进入实施。**
