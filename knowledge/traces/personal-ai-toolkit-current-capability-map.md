# 个人AI工具库现有能力地图

> 生成日期：2026-07-04
> 阶段：只读分析，接管当前已有能力
> 后续目标：为"多项目 AI Coding 工作台"增量接入做事实基础

---

## 一、当前项目定位

**个人AI工具库**（`E:\program\ai-ui-agentic`）是一个 Git 托管的 AI 开发基础设施仓库，用于：

1. 提供 OpenCode 全局规则文件（`AGENTS.md`）
2. 沉淀 AI 可读的流程、SOP、操作方法和经验（`knowledge/flows/`）
3. 保存项目分析、工具设计、审计、迁移等追踪资料（`knowledge/traces/`）
4. 提供可复用的工具脚本和模板（`tools/`）
5. 为外部项目初始化 AI 项目记忆结构（`.ai/`）
6. 后续承载"多项目 AI Coding 工作台"的项目管理和任务状态数据（`data/`）

**仓库性质**：纯 Git 仓库，无数据库，无 Web 服务，无运行时依赖。当前 `package.json` 无任何依赖或 scripts（`package.json:1-5`）。

---

## 二、顶层结构与职责

```
E:\program\ai-ui-agentic/
├── AGENTS.md              ← OpenCode 全局规则（唯一入口，63行）
├── README.md              ← 仓库使用说明
├── package.json           ← Node 根配置（空）
├── .gitignore             ← Git 忽略规则
├── tools/                 ← 可执行工具能力
│   ├── init-project-memory/    ← 项目记忆初始化
│   └── sync-codex-home/        ← Codex 家目录同步
├── knowledge/
│   ├── flows/             ← 流程、SOP、操作方法
│   └── traces/            ← 分析、审计、设计、追踪资料
├── config/                ← （当前无真实内容，不强制创建）
└── data/                  ← （当前无真实内容，不强制创建）
```

> 注：`scripts/` 和 `templates/` 为迁移后遗留的空目录，Git 已不再跟踪其内文件。可在适当时机手动删除。

---

## 三、已有工具能力地图

### 3.1 `tools/init-project-memory/`

| 维度 | 详情 |
|---|---|
| **目标** | 为指定项目目录初始化 `.ai/` 项目记忆结构，从内置模板复制初始 Markdown 文件。 |
| **脚本** | `tools/init-project-memory/init-project-memory.ps1`（87 行） |
| **输入** | `-ProjectPath <路径>` — 目标项目根目录 |
| **输出** | 在目标项目下创建 `.ai/` 目录，含 5 个记忆文件和 1 个 handoffs 子目录 |
| **调用方式** | `powershell -ExecutionPolicy Bypass -File tools\init-project-memory\init-project-memory.ps1 -ProjectPath "E:\Path\To\Project"` |
| **模板依赖** | `tools/init-project-memory/templates/` 下 5 个 Markdown 模板 |
| **外部依赖** | 无。纯 PowerShell，不依赖 Node、npm 或第三方模块 |
| **修改边界** | 仅可在目标项目 `.ai/` 内创建文件；不会覆盖已存在文件（`Copy-IfMissing` 逻辑，:17-36） |
| **风险** | 路径计算依赖 `$MyInvocation.MyCommand.Path` 自定位；若脚本移动需更新 `:39` 的 `..` 层级（当前已修正为 `..\..`） |
| **验证方式** | 以临时目录执行，检查 `.ai/` 下所有文件存在且有内容 |

### 3.2 `tools/sync-codex-home/`

| 维度 | 详情 |
|---|---|
| **目标** | 将仓库 `AGENTS.md`（和可选 `config.toml`）同步到 OpenCode 家目录 `%USERPROFILE%\.codex` |
| **脚本** | `tools/sync-codex-home/sync-codex-home.ps1`（91 行） |
| **输入** | `-CodexHome <路径>`（可选，默认 `%USERPROFILE%\.codex`）；`-IncludeConfig`（可选开关） |
| **输出** | 在 `%USERPROFILE%\.codex\` 下写入/更新 `AGENTS.md`，可选写入 `config.toml` |
| **调用方式** | `powershell -ExecutionPolicy Bypass -File tools\sync-codex-home\sync-codex-home.ps1 [-IncludeConfig]` |
| **配置依赖** | `AGENTS.md`（根级，:65）；`tools/sync-codex-home/config/config.toml`（仅 `-IncludeConfig` 时，:71-76） |
| **外部依赖** | 无 |
| **修改边界** | 仅写入 `%USERPROFILE%\.codex\` 下的 AGENTS.md 和 config.toml；修改前备份旧文件（`Backup-AndCopy` 函数，:28-54） |
| **风险** | 若 `%USERPROFILE%\.codex\` 存在同名文件，会创建 `.bak.<timestamp>` 备份；路径计算同 init 脚本需保持正确 |
| **验证方式** | 执行同步后，用 `diff` 对比源文件与目标文件内容一致性 |

---

## 四、现有规则与知识资产

### 4.1 长期规则（`AGENTS.md`）

| 章节 | 行号 | 性质 | 内容摘要 |
|---|---|---|---|
| Working Rules | 5-10 | 强制 | 复杂任务先分析、小修改、禁存密钥、保持 Git 友好 |
| Task SOP | 12-23 | 强制 | 启动前检查 .ai/、生成 PROJECT_MAP.md、分析先于修改 |
| Project Memory Discipline | 25-42 | 强制 | 任务结束后更新 .ai/ 状态、决策、交接 |
| 文档化与正式产物要求 | 46-55 | 强制 | 关键结论必须落盘、产物归属遵循顶层架构、不得仅留聊天中 |
| Scope | 57-63 | 强制 | V1 only、No agents、No skills、No worktree、No multi-session |

### 4.2 流程与 SOP（`knowledge/flows/`）

| 文件 | 性质 | 内容 |
|---|---|---|
| `market-localchange-task-guide.md`（398 行） | 流程指南 | 市场 Localchange task 的处理方式、分析边界、AI 辅助原则。不是强制 SOP，每个 task 可调整 |
| `git-branch-create-ai-prompt-3.md`（53 行） | 操作方法 | Git 建分支 AI 提示词模板。从 Jira 提取编号和 Journey，生成分支名，确认后执行 |

### 4.3 设计与分析资料（`knowledge/traces/`）

| 文件 | 性质 | 内容 |
|---|---|---|
| `generate-complete-project-background.md`（167 行） | 背景生成提示词 | 指导 AI 生成微前端业务体系完整背景说明，含 workspace、项目A~G、市场、Jira 流程等 |
| `multi-session-collaboration-implementation.md`（358 行） | 工具设计文档 V1 | 多 Session 协同工具的完整实施提示词。定义总控/C0/C1 模式、CLI 命令体系、运行记录设计 |
| `multi-session-collaboration-implementation-v2.md`（432 行） | 工具设计文档 V2 | V1 的精化版。增加异步要求、固定目录约束、Playwright 规则、验收场景 |
| `mvp1-step-ui.md`（19 行） | 功能实现提示词 | MVP1 的 Step1/Step2 页面 UI 补全提示词，引用旧系统截图 |
| `个人AI工具库顶层架构对齐审计报告.md`（392 行） | 审计报告 | 迁移前对仓库的只读审计 |
| `personal-ai-toolkit-top-level-architecture-migration-plan.md` | 迁移计划 | 三阶段迁移计划 |
| `personal-ai-toolkit-top-level-architecture-migration-stage-1-result.md` | 实施记录 | 阶段一实施结果 |
| `personal-ai-toolkit-top-level-architecture-migration-stage-2-result.md` | 实施记录 | 阶段二实施结果 |
| `personal-ai-toolkit-top-level-architecture-stage-1-closeout-result.md` | 实施记录 | 阶段一收尾 |
| `personal-ai-toolkit-top-level-architecture-stage-2-precheck.md` | 实施记录 | 阶段二预检查 |

---

## 五、工具、模板、规则之间的调用与依赖关系

```
AGENTS.md（根级规则）
  │
  ├──[同步]──→ tools/sync-codex-home/sync-codex-home.ps1
  │               │
  │               └──[依赖]──→ AGENTS.md（根级）
  │               └──[依赖]──→ tools/sync-codex-home/config/config.toml（可选）
  │               └──[输出]──→ %USERPROFILE%\.codex\AGENTS.md
  │               └──[输出]──→ %USERPROFILE%\.codex\config.toml（可选）
  │
  ├──[模板来源]──→ tools/init-project-memory/templates/
  │               ├── business-context.md
  │               ├── current-state.md
  │               ├── decisions.md
  │               ├── defect-patterns.md
  │               └── handoff-template.md
  │
  └──[规则引用]──→ knowledge/flows/
                   ├── market-localchange-task-guide.md   — 流程指南
                   └── git-branch-create-ai-prompt-3.md   — 操作提示词

knowledge/traces/
  ├── multi-session-collaboration-implementation*.md  — 工具设计（未实现）
  ├── generate-complete-project-background.md         — 背景生成（提示词，待执行）
  └── mvp1-step-ui.md                                 — UI 补全（提示词，待执行）
```

**关键发现**：
1. `AGENTS.md` 是唯一被两个工具直接引用的文件（sync 脚本同步它，init 脚本通过模板实现其 Project Memory Discipline 规则）
2. `knowledge/flows/` 中的文件是 AI 运行时读取的参考资料，不被任何机器脚本直接解析
3. `tools/init-project-memory/templates/` 中的模板与 `AGENTS.md:25-42` 的 Project Memory Discipline 直接对应
4. `knowledge/traces/` 中既有历史审计/迁移记录，也有未实现的工具设计文档

---

## 六、当前未实现但已有规划的能力

### 6.1 多 Session 协同工具

| 维度 | 详情 |
|---|---|
| 设计文档 | `knowledge/traces/multi-session-collaboration-implementation.md`（V1）和 `-v2.md`（V2） |
| 目标 | 在当前 OpenCode 作为总控的前提下，支持创建 C0、C1 等异步 task session，总控不被阻塞 |
| 核心能力（规划） | task 创建、session spawn、board 查看、状态查询、失败 retry、结果汇总 |
| 命令体系（规划） | `session-task create/spawn/inspect/board/retry/summarize` |
| 运行记录（规划） | `data/<task-id>/` 下的 task.md/json + sessions/C0-C1.md/json |
| 状态 | ⚠️ 仅设计，未实现。V2 已对齐新顶层架构（`data/` 替代 `runs/`） |

### 6.2 项目背景生成

| 维度 | 详情 |
|---|---|
| 提示词 | `knowledge/traces/generate-complete-project-background.md` |
| 目标 | 为 AI 生成微前端业务体系的完整背景说明 |
| 状态 | ⚠️ 提示词已就绪，但尚未执行生成。文档内提到"先读取当前仓库已有资料"，且要求"文档草稿供确认" |

### 6.3 MVP1 页面 UI 补全

| 维度 | 详情 |
|---|---|
| 提示词 | `knowledge/traces/mvp1-step-ui.md` |
| 目标 | 按截图补 Step1/Step2 页面 UI |
| 状态 | ⚠️ 仅提示词，未执行 |

### 6.4 `AGENTS.md` 中引用的 `TASK-SOP.md`

| 维度 | 详情 |
|---|---|
| 引用位置 | `AGENTS.md:44` — `For the full workflow, see TASK-SOP.md` |
| 状态 | ⚠️ `TASK-SOP.md` 文件当前不存在于仓库中。在早期迁移阶段已被删除。`AGENTS.md:44` 引用指向一个已不存在的文件 |

---

## 七、可复用能力

| 能力 | 来源 | 工作台可复用场景 |
|---|---|---|
| **`.ai/` 项目记忆初始化** | `tools/init-project-memory/` | 工作台接管新项目时，为其创建项目记忆结构 |
| **Codex 规则同步** | `tools/sync-codex-home/` | 工作台管理的项目需要统一规则时，同步 AGENTS.md |
| **配置驱动设计** | `tools/sync-codex-home/config/config.toml` | 工作台自身工具配置可复用分层配置模式（工具专属 > 全局共享） |
| **Markdown 模板体系** | `tools/init-project-memory/templates/` | 工作台生成项目状态、任务记录、交接文件时可参考模板结构 |
| **Git 分支创建流程** | `knowledge/flows/git-branch-create-ai-prompt-3.md` | 工作台创建开发分支时直接复用该提示词 |
| **市场 Localchange 开发流程** | `knowledge/flows/market-localchange-task-guide.md` | 工作台处理 Localchange 类任务时的参考流程 |
| **多 Session 协同设计** | `knowledge/traces/multi-session-collaboration-*.md` | 工作台的多项目管理如果需要并行 session，可直接参考 V2 设计 |
| **分层目录设计** | `tools/` 下的 `config/` 和 `templates/` 子目录模式 | 工作台内每个工具模块同样需要工具专属配置和模板 |
| **幂等操作** | `init-project-memory.ps1` 的 `Copy-IfMissing` | 工作台操作应同样幂等：不覆盖已有文件 |
| **备份机制** | `sync-codex-home.ps1` 的 `Backup-AndCopy` | 工作台写入数据时需要类似的备份保护 |

---

## 八、不可重复或不可随意修改的区域

| 区域 | 约束来源 | 说明 |
|---|---|---|
| `AGENTS.md` | 根级唯一规则入口 | 工作台不得创建替代规则文件，不得修改其既有规则含义 |
| `knowledge/flows/` 职责 | `AGENTS.md:51` | 工作台的操作流程应继续归入此目录，不得另建流程目录 |
| `knowledge/traces/` 职责 | `AGENTS.md:51` | 工作台的项目分析、设计文档应归入此目录 |
| `tools/` 结构模式 | 迁移后约定 | 每个工具独立目录，内含脚本 + 专属 templates/ 或 config/ |
| `data/` 职责 | `AGENTS.md:51` + 设计文档 | 工作台的运行数据、项目状态、任务记录必须归入 `data/`，不得写入 `tools/` |
| `config/` 职责 | `AGENTS.md:51` | 全局配置归入 `config/`，工具专属配置归入各自 `tools/<name>/config/` |
| Git workflow | `AGENTS.md` + 用户要求 | 所有操作可追溯，关键结论落盘，不做 bulk commit |
| Scope 约束 | `AGENTS.md:57-63` | V1 only，当前不引入 Agent/Skill/worktree 自动化 |

---

## 九、对"多项目 AI Coding 工作台"的接入约束

### 9.1 必须遵守的约束

1. **顶层目录不变**：只能在 `config/` `knowledge/` `data/` `tools/` 下新增内容，不得新增顶层目录。
2. **不重复已有能力**：项目记忆初始化、规则同步、Git 分支创建等已有能力应直接复用，不在工作台中重新实现。
3. **产物归位**：工作台的项目档案、任务状态、进度记录必须写入 `data/`；流程和设计写入 `knowledge/`；工具代码写入 `tools/`。
4. **增量接入**：工作台不是重建新项目，而是在当前仓库结构上增加工作台子功能。
5. **不修改现有工具**：`init-project-memory` 和 `sync-codex-home` 保持现有接口不变。
6. **不覆盖既有规则**：`AGENTS.md` 的规则层级不因工作台而改变。

### 9.2 可以扩展的方向（供设计参考，非预设）

- `data/` 下建立项目档案和任务记录结构
- `tools/` 下新增工作台入口脚本或工具模块
- `config/` 下建立工作台全局配置
- `knowledge/flows/` 下新增工作台操作流程
- 复用 `tools/init-project-memory/` 初始化托管项目的 `.ai/` 结构

### 9.3 不可做的设计预设

- 不能预设工作台采用 Web 页面、CLI 工具或特定技术栈 — 需根据实际需求后续决定
- 不能预设工作台的目录名（如 `tools/workbench/` 或 `tools/coding-workbench/`）— 待设计阶段确认
- 不能预设工作台的数据模型（如 project.json、task.json 的完整 schema）— 需基于实际场景设计

---

## 十、风险、未确认项与后续建议

### 10.1 风险

| 风险 | 级别 | 说明 |
|---|---|---|
| `TASK-SOP.md` 文件缺失 | 🟡 中 | `AGENTS.md:44` 引用了不存在的 `TASK-SOP.md`。需确认是删除该引用还是恢复文件 |
| 设计文档与实现能力差距 | 🟡 中 | 多 Session 协同工具有 2 个详细设计文档（共 790 行），但无任何实现代码 |
| 项目背景未生成 | 🟢 低 | `generate-complete-project-background.md` 是提示词而非产出，尚未执行 |
| 遗留空目录 | 🟢 低 | `scripts/` 和 `templates/` 为空目录，git 不再跟踪，但物理存在可能导致混淆 |

### 10.2 未确认项

| 序号 | 事项 |
|---|---|
| 1 | `TASK-SOP.md` 是否应该恢复？还是删除 `AGENTS.md:44` 中的引用？ |
| 2 | 多 Session 协同工具是否计划在短期内实现？还是仅作为设计参考保留？ |
| 3 | `generate-complete-project-background.md` 是否需要立即执行生成？ |
| 4 | `知识/traces/` 中存有 7 个迁移相关的审计/计划/结果文件，这些是否需要保留为永久历史记录？ |
| 5 | 遗留的 `scripts/` 和 `templates/` 空目录是否可以删除？ |

### 10.3 后续建议

1. **优先处理缺失引用**：解决 `TASK-SOP.md` 缺失问题（恢复或删除引用）
2. **清理遗留空目录**：删除 `scripts/` 和 `templates/`（`Remove-Item -Recurse -Force scripts/ templates/`）
3. **执行项目背景生成**：运行 `generate-complete-project-background.md` 提示词，产出正式项目背景文档
4. **确认多 Session 协同优先级**：如短期不实现，在设计工作台时不应假设该能力可用
5. **进入工作台设计阶段**：基于本能力地图，设计工作台的增量功能范围和接入方案
