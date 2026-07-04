# 多项目 AI Coding 桌面控制台 MVP — 阶段 A 实施计划

> 生成日期：2026-07-04
> 前置：技术路线与 MVP 方案（`ai-coding-desktop-console-technical-route-and-mvp-plan.md`）
> 后续：进入阶段 B — 项目登记与状态读取
> 当前：只做计划，不执行

---

## 一、当前事实与迁移前检查

### 1.1 现有文件状态

| 路径 | 状态 | 内容 |
|---|---|---|
| `data/projects-manifest.json` | 已存在，已提交 | 5 行，`projects: {}`, `lastUpdated: null` |
| `tools/` | 2 个子目录 | `init-project-memory/`, `sync-codex-home/` |
| `config/global.json` | 已存在，已提交 | 4 字段（workspaceRoots, projectScan） |
| `AGENTS.md` | 61 行 | Scope 含 "No agents" |
| `README.md` | 110 行 | `:17` 引用 `data/projects-manifest.json` |
| Git status | 干净 | 无未提交变更 |

### 1.2 迁移范围确认

| 操作 | 原因 |
|---|---|
| `git mv data/projects-manifest.json data/ai-coding-console/projects-manifest.json` | 控制台数据统一归属 `data/ai-coding-console/` |
| 不复制、不保留两份 | 避免数据分叉 |
| `data/` 根目录变为空 | 旧 `data/` 目录下将无任何文件（只有 `ai-coding-console/` 子目录） |

---

## 二、阶段 A 最终目录结构

```
个人AI工具库/
├── config/
│   └── global.json
├── data/
│   └── ai-coding-console/
│       ├── projects-manifest.json      ← 从 data/ 根迁移
│       ├── tasks/                      ← 新增（空目录）
│       ├── board/                      ← 新增（空目录）
│       └── reports/                    ← 新增（空目录）
├── knowledge/
│   ├── flows/
│   └── traces/
└── tools/
    ├── ai-coding-console/              ← 新增
    │   ├── README.md
    │   ├── config/
    │   │   └── console-config.json
    │   └── cli/
    │       └── console.ps1
    ├── init-project-memory/
    └── sync-codex-home/
```

---

## 三、数据归属修正说明

### 为什么 `data/ai-coding-console/` 而非散落 `data/` 根

| 对比 | 散落方案（旧） | 集中方案（新） |
|---|---|---|
| 项目索引 | `data/projects-manifest.json` | `data/ai-coding-console/projects-manifest.json` |
| Task 历史 | `data/tasks/` | `data/ai-coding-console/tasks/` |
| Board | `data/board/` | `data/ai-coding-console/board/` |
| Reports | `data/reports/` | `data/ai-coding-console/reports/` |

**选择集中的理由**：
- `data/` 是顶层目录，未来可能有非控制台的运行数据（如多 Session 协同的 session 记录、Playwright 采集记录等）
- 控制台的数据彼此关联（Task 引用的项目在 manifest 中，board 汇总 tasks 的状态），放在同一前缀下便于原子备份和迁移
- 符合"工具专属数据"原则：控制台的数据像 `tools/ai-coding-console/` 是工具代码一样，`data/ai-coding-console/` 是工具专属数据

### 什么不应该放在这里

| 不该放 | 原因 |
|---|---|
| Approval 独立目录 | Approval 属于 Task 内部子记录，存于 `data/ai-coding-console/tasks/<id>/approvals/` |
| Run 独立目录 | Run 属于 Task 内部子记录，存于 `data/ai-coding-console/tasks/<id>/runs/` |
| Agent 日志 | 属于 Run 内部 Artifact |
| `config/` 下的全局配置 | 全局配置仍放在 `config/global.json`，控制台专属配置放在 `tools/ai-coding-console/config/` |

---

## 四、projects-manifest.json 迁移方案

### 迁移命令

```powershell
git mv data/projects-manifest.json data/ai-coding-console/projects-manifest.json
```

### 影响文件

| 文件 | 影响 | 处理 |
|---|---|---|
| `README.md:17` | 引用路径从 `data/projects-manifest.json` 变为 `data/ai-coding-console/projects-manifest.json` | 更新描述行 |
| `knowledge/traces/ai-coding-desktop-console-technical-route-and-mvp-plan.md` | 多处引用旧路径 | 更新为 `data/ai-coding-console/projects-manifest.json` |
| `knowledge/traces/` 下其他历史文件 | 含旧路径引用 | **不修改**。历史审计/设计记录保留原始引用，作为迁移轨迹 |

### 迁移后项目索引位置

```
data/
└── ai-coding-console/
    └── projects-manifest.json          ← 项目索引唯一位置
```

> `data/` 根目录不再有任何文件，仅 `ai-coding-console/` 子目录。

---

## 五、每个新增目录和文件的真实职责

### 5.1 `tools/ai-coding-console/README.md`

| 维度 | 内容 |
|---|---|
| 职责 | 控制台工具使用说明。阶段 A 写入 MVP 定位、目录说明、当前阶段状态 |
| 为什么不是占位 | 阶段 A 的 CLI help 骨架和目录结构已经提供了真实的可探索入口，README 是这些入口的书面说明 |
| 包含内容 | 工具定位、命令概览（标注已实现/未实现）、调用方式、阶段状态 |

### 5.2 `tools/ai-coding-console/config/console-config.json`

| 维度 | 内容 |
|---|---|
| 职责 | 控制台专属运行时配置。阶段 A 提供最小字段，阶段 D 追加 Agent 配置 |
| 为什么不是占位 | 阶段 A 的 CLI 骨架需要知道配置在哪读取（即使当前尚未实际读取），定义了控制台工具配置的权威位置 |
| 最小字段 | 见第六节 |

### 5.3 `tools/ai-coding-console/cli/console.ps1`

| 维度 | 内容 |
|---|---|
| 职责 | CLI 入口脚本。阶段 A：help 输出 + 命令路由骨架（项目命令组、task 命令组占位） |
| 为什么不是占位 | `console.ps1 help` 输出各命令的规划说明，为阶段 B/C/D 的开发提供清晰的目标清单。即使当前不执行业务逻辑，help 输出本身就是可用的参考 |

### 5.4 `data/ai-coding-console/tasks/`

| 维度 | 内容 |
|---|---|
| 职责 | 所有已创建 Task 的持久化存储。每个 Task 一个子目录 |
| 为什么不是占位 | 阶段 B 开始后 `task create` 立即写入此目录。空目录表示"暂无 Task"，与 `projects: {}` 同理 — 是合法初始状态 |

### 5.5 `data/ai-coding-console/board/`

| 维度 | 内容 |
|---|---|
| 职责 | 每个项目的 Markdown board 文件 |
| 为什么不是占位 | 阶段 C `board show` 命令的输出目的地。board 是控制台的"仪表盘"，不是无意义的目录 |

### 5.6 `data/ai-coding-console/reports/`

| 维度 | 内容 |
|---|---|
| 职责 | Task 关闭时的总结报告（Markdown） |
| 为什么不是占位 | 阶段 C `task close` 的输出目的地。与 tasks/ 不同：tasks/ 存运行中/历史数据，reports/ 存已完成任务的正式结论 |

---

## 六、console-config.json 最小字段

```json
{
  "$schema": "控制台专属配置 v1",
  "agentType": "opencode",
  "dataDir": "data/ai-coding-console"
}
```

| 字段 | 职责 | 为什么现在就需要 |
|---|---|---|
| `$schema` | 版本标识 | 供读取方判断格式 |
| `agentType` | 默认 Agent 适配器类型。当前仅 `"opencode"` | 阶段 A 不接 Agent，但 CLI 骨架需要知道"未来会用哪个 Agent"来输出正确的 help 文本。此字段在阶段 D 成为 dispatch 的默认值 |
| `dataDir` | 控制台数据根目录的相对路径 | console.ps1 需要知道 tasks/board/reports/ 在哪。绝对路径不便于跨机器同步 |

### 不放入的字段及理由

| 不放入 | 理由 |
|---|---|
| `opencodePath` / `codexPath` | OpenCode CLI 路径由环境变量 PATH 或 Agent Adapter 自行检测，无需配置 |
| `sessionTimeout` | 阶段 D 才需要超时策略 |
| `autoScan` | 不属于控制台专属配置（全局扫描配置在 `config/global.json`） |
| `projectRoots` | 同上 |
| `gui` 相关 | GUI 后置 |

---

## 七、console.ps1 最小行为

### help 输出

```text
多项目 AI Coding 桌面控制台 — MVP (阶段 A)
用法: console.ps1 <command> [args]

可用命令:
  help                          显示本帮助
  version                       显示版本与当前阶段

项目命令（阶段 B 实现）:
  project list                  列出所有已接入项目
  project add      --path <路径> 注册新项目
  project status   --project <名称> 查看项目状态
  project prompt   --project <名称> 生成项目上下文 Prompt

任务命令（阶段 C/D 实现）:
  task create      --project <名称> --desc "..."  创建任务
  task list        --project <名称>               列出任务
  task status      --task <id>                    查看任务详情
  task dispatch    --task <id>                    执行任务（Agent）
  task approve     --task <id> [--reject]         plan 审批
  task review      --task <id> [--reject]         final review
  task close       --task <id>                    关闭任务

看板命令（阶段 C 实现）:
  board show       --project <名称>               生成项目看板

当前阶段: A — 脚手架与数据层。仅 help/version 可用。
```

### 未知命令

```text
未知命令: xxx。输入 console.ps1 help 查看可用命令。
```

### 不实现

- 任何文件读写
- 任何参数解析（除 `help`、`version` 外）
- 任何外部进程调用

---

## 八、README 是否需要更新

### 需要更新

| 位置 | 旧内容 | 新内容 |
|---|---|---|
| `README.md:17` | `data/projects-manifest.json` | `data/ai-coding-console/projects-manifest.json` |

### 不需要更新

- `README.md` 的结构图（:7-18）中 `tools/` 行不需要列出 `ai-coding-console/` — 因为 README 是仓库总览，`tools/` 下的工具随增随加，不需要在 README 中罗列所有工具名
- `README.md` 中已有一个工具说明段（:32-67），可选在阶段 A 之后加一句话"`tools/ai-coding-console/` 正在开发中"

### 在知识文件中需要更新

| 文件 | 操作 |
|---|---|
| `knowledge/traces/ai-coding-desktop-console-technical-route-and-mvp-plan.md` | 更新所有 `data/projects-manifest.json` → `data/ai-coding-console/projects-manifest.json`，`data/tasks/` → `data/ai-coding-console/tasks/` 等 |

---

## 九、实施顺序

```
1. git mv data/projects-manifest.json data/ai-coding-console/projects-manifest.json
2. 创建目录:
   - tools/ai-coding-console/config/
   - tools/ai-coding-console/cli/
   - data/ai-coding-console/tasks/
   - data/ai-coding-console/board/
   - data/ai-coding-console/reports/
3. 写入文件:
   - tools/ai-coding-console/README.md
   - tools/ai-coding-console/config/console-config.json
   - tools/ai-coding-console/cli/console.ps1
4. 更新引用:
   - README.md (:17)
   - knowledge/traces/ai-coding-desktop-console-technical-route-and-mvp-plan.md
5. 验证
6. git add + git commit
```

---

## 十、验证命令

```powershell
# 目录存在性
Test-Path tools/ai-coding-console/
Test-Path tools/ai-coding-console/config/
Test-Path tools/ai-coding-console/cli/
Test-Path data/ai-coding-console/
Test-Path data/ai-coding-console/tasks/
Test-Path data/ai-coding-console/board/
Test-Path data/ai-coding-console/reports/
Test-Path data/ai-coding-console/projects-manifest.json

# 旧路径不存在
Test-Path data/projects-manifest.json
# 预期: False

# JSON 合法性
Get-Content tools/ai-coding-console/config/console-config.json -Raw | ConvertFrom-Json
Get-Content data/ai-coding-console/projects-manifest.json -Raw | ConvertFrom-Json

# console.ps1 help 可执行
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 help
# 预期: 输出命令列表

# console.ps1 未知命令报错
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 xxx
# 预期: "未知命令: xxx。输入 console.ps1 help 查看可用命令。"

# 未修改现有文件
git diff tools/init-project-memory/     # 预期: 无变化
git diff tools/sync-codex-home/         # 预期: 无变化
git diff AGENTS.md                      # 预期: 无变化
git diff config/global.json             # 预期: 无变化

# git diff --check
git diff --check   # 预期: 通过

# git status
git status --short  # 预期: 仅含上述新增和修改文件
```

---

## 十一、提交与回滚方式

**提交**：单次 commit

```
git commit -m "feat: 控制台阶段 A — 脚手架与数据层"
```

**回滚**：

```powershell
git revert --no-edit HEAD
```

---

## 十二、阶段 A 完成标准

| # | 条件 |
|---|---|
| 1 | `data/projects-manifest.json` 已迁移至 `data/ai-coding-console/`，无残留双份 |
| 2 | `tools/ai-coding-console/` 完整目录存在（README + config + cli） |
| 3 | `console-config.json` 为合法 JSON，字段不超出 MVP 范围 |
| 4 | `console.ps1 help` 可执行并输出命令清单 |
| 5 | `console.ps1` 对未知命令返回明确错误 |
| 6 | `data/ai-coding-console/tasks/` `board/` `reports/` 存在 |
| 7 | `README.md:17` 路径已更新 |
| 8 | `技术路线方案` 中路径已同步 |
| 9 | 未修改 `AGENTS.md`、`config/global.json`、现有 tools/ |
| 10 | Git status 干净 |

具备以上 10 项后，可以进入阶段 B（项目登记与状态读取）。

---

## 十三、风险与待确认项

| 风险 | 级别 | 说明 |
|---|---|---|
| `git mv` 后 `data/` 根目录完全为空 | 🟢 低 | 这是预期行为。`data/` 根目录不再直接存放文件，所有数据都在 `ai-coding-console/` 下 |
| 知识文件中大量旧路径引用 | 🟢 低 | 仅更新技术路线方案和 README；其他历史文件保留原始引用作为迁移轨迹 |

| 序号 | 待确认项 |
|---|---|
| 1 | 技术路线方案（`ai-coding-desktop-console-technical-route-and-mvp-plan.md`）中的路径同步是否可以放到阶段 A 后的专门修订中，还是必须在阶段 A 提交内完成？ |
| 2 | README 修改范围：仅改 1 行（:17）还是加一句 `tools/ai-coding-console/` 的开发状态说明？ |

---

> **状态：阶段 A 实施计划完成。待用户确认后进入实施。**
