# 个人AI工具库顶层架构对齐审计报告

> 审计日期：2026-07-04
> 审计方式：只读分析，未修改任何文件
> 当前模式：build（报告已落地为文件，可继续执行迁移）

---

## 一、当前真实目录结构

```
E:\program\ai-ui-agentic/          ← Git 仓库根目录（关联 remote: amyfairy007-glitch/agents）
├── .git/                          ← Git 内部数据
├── .gitignore                     ← Git 忽略规则
├── AGENTS.md                      ← Codex 全局规则（52行）
├── README.md                      ← 仓库说明文档（纯 Codex 配置仓库说明）
├── package.json                   ← 空 Node 配置（无 scripts，无依赖）
│
├── scripts/                       ← 目录（2 个 PowerShell 工具脚本）
│   ├── init-project-memory.ps1    ← 为外部项目初始化 .ai/ 目录（87行）
│   └── sync-codex-home.ps1        ← 同步 AGENTS.md/config.toml 到 Codex 家目录（91行）
│
├── templates/                     ← 目录（Codex 配置模板 + 项目记忆模板）
│   ├── codex-home/
│   │   └── config.toml            ← Codex 家目录安全配置模板（10行）
│   └── project-memory/
│       ├── business-context.md    ← 项目记忆模板（占位符 26行）
│       ├── current-state.md       ← 项目记忆模板（占位符 14行）
│       ├── decisions.md           ← 项目记忆模板（占位符 9行）
│       ├── defect-patterns.md     ← 项目记忆模板（占位符 38行）
│       └── handoff-template.md    ← 项目记忆模板（占位符 18行）
│
├── generate-complete-project-background.md   ← 项目背景生成提示词（167行）
├── git-branch-create-ai-prompt-3.md           ← Git 建分支提示词（53行）
├── market-localchange-task-guide.md           ← 市场 Localchange 任务指南（398行）
├── multi-session-collaboration-implementation.md     ← 多 Session 协同实施提示词 V1（358行）
├── multi-session-collaboration-implementation-v2.md  ← 多 Session 协同实施提示词 V2（432行）
└── mvp1-step-ui.md                 ← MVP1 页面 UI 补全提示词（19行）
```

---

## 二、当前项目已有能力与入口

| 能力 | 当前载体 | 入口方式 |
|---|---|---|
| **Codex 全局规则** | `AGENTS.md` | OpenCode 自动读取 |
| **Codex 家目录配置同步** | `scripts/sync-codex-home.ps1` | PowerShell 手动执行 |
| **项目记忆初始化** | `scripts/init-project-memory.ps1` | PowerShell 手动执行 |
| **Codex 配置模板** | `templates/codex-home/config.toml` | 被 sync 脚本引用 |
| **项目记忆模板** | `templates/project-memory/*.md` | 被 init 脚本引用 |
| **AI 提示词模板**（6个 .md） | 根目录散落 | 手动提供给 AI |

当前无任何可执行 `npm scripts`，无 `config/`、`knowledge/`、`data/`、`tools/` 目录。
**仓库处于"规则 + 模板 + 散落提示词"状态，尚未对齐目标顶层结构。**

---

## 三、与目标顶层设计的差异

### 目标顶层结构（已确认不可改变）

```
个人AI工具库/
├─ config/        ← 多工具共用的全局配置
├─ knowledge/     ← AI 可读规则、SOP、流程、分析资料
│  ├─ flows/      ← 流程、SOP、操作方法
│  └─ traces/     ← 项目/功能/代码/仓库分析与追踪资料
├─ data/          ← 持续保存的项目数据和运行数据
└─ tools/         ← 实际可执行、可复用的工具能力
```

### 差异总表

| 目标目录 | 当前状态 | 差距 |
|---|---|---|
| `config/` | ❌ 不存在 | 需创建空目录 |
| `knowledge/` | ❌ 不存在 | 需创建。根目录有 6 个 .md 文件待迁入 |
| `knowledge/flows/` | ❌ 不存在 | 需创建 |
| `knowledge/traces/` | ❌ 不存在 | 需创建 |
| `data/` | ❌ 不存在 | 需创建空目录 |
| `tools/` | ❌ 不存在 | 需创建。`scripts/` 和 `templates/` 待迁入 |

### 每个现有文件/目录的在位检查

| 路径 | 标记 | 说明 |
|---|---|---|
| `.git/` | ✅ 不应移动 | Git 内部数据 |
| `.gitignore` | ✅ 不应移动 | 根级 Git 配置 |
| `package.json` | ✅ 位置合理 | 根级 Node 配置 |
| `README.md` | ✅ 位置合理 | 根级仓库说明 |
| `AGENTS.md` | ⚠️ 待确认 | 既是 OpenCode 自动读取入口（需根级），也属于规则知识。建议根级保留，`knowledge/flows/` 放副本 |
| `scripts/` | ❌ 位置不合理 | PowerShell 工具脚本，应归 `tools/` |
| `templates/` | ❌ 位置不合理 | Codex 模板 + 项目记忆模板，应归对应工具的目录下 |
| 根目录 6 个 .md 文件 | ❌ 位置不合理 | 全部分析流程/知识类，应归 `knowledge/` |

---

## 四、每个差异的处理建议

### 4.1 根级散落 .md → `knowledge/`

| 当前路径 | 目标路径 | 类型 | 内部是否有过时引用 |
|---|---|---|---|
| `generate-complete-project-background.md` | `knowledge/traces/` | 项目背景分析 | ❌ 无 |
| `market-localchange-task-guide.md` | `knowledge/flows/` | 流程/SOP | ❌ 无 |
| `git-branch-create-ai-prompt-3.md` | `knowledge/flows/` | 操作方法流程 | ❌ 无 |
| `multi-session-collaboration-implementation.md` | `knowledge/traces/` | 工具设计文档 | ⚠️ 引用旧结构 `runs/`（应改为 `data/`） |
| `multi-session-collaboration-implementation-v2.md` | `knowledge/traces/` | 工具设计文档 V2 | ⚠️ 引用旧结构 `runs/`（应改为 `data/`） |
| `mvp1-step-ui.md` | `knowledge/traces/` | 功能分析资料 | ❌ 无 |

### 4.2 `scripts/` → `tools/`

| 当前路径 | 目标路径 | 需修改脚本 |
|---|---|---|
| `scripts/init-project-memory.ps1` | `tools/init-project-memory/init-project-memory.ps1` | ✅ 路径计算 |
| `scripts/sync-codex-home.ps1` | `tools/sync-codex-home/sync-codex-home.ps1` | ✅ 路径计算 |

### 4.3 `templates/` → 拆分到 `tools/` 各工具目录

| 当前路径 | 目标路径 |
|---|---|
| `templates/codex-home/config.toml` | `tools/sync-codex-home/config/config.toml` |
| `templates/project-memory/business-context.md` | `tools/init-project-memory/templates/business-context.md` |
| `templates/project-memory/current-state.md` | `tools/init-project-memory/templates/current-state.md` |
| `templates/project-memory/decisions.md` | `tools/init-project-memory/templates/decisions.md` |
| `templates/project-memory/defect-patterns.md` | `tools/init-project-memory/templates/defect-patterns.md` |
| `templates/project-memory/handoff-template.md` | `tools/init-project-memory/templates/handoff-template.md` |

### 4.4 `AGENTS.md` — 特殊处理

`AGENTS.md` 既是 OpenCode 自动读取入口（需要位于根级），也属于规则知识。

**建议**：
- 根级 `AGENTS.md` 保留不动
- `knowledge/flows/AGENTS.md` 放一份副本（知识库完整性）

### 4.5 `config/` + `data/` — 创建空目录

当前无内容，创建空目录即可。

---

## 五、建议保留、移动、合并、暂不处理的文件清单

### ✅ 保留不动（5项）

| 路径 | 理由 |
|---|---|
| `.git/` | Git 内部数据 |
| `.gitignore` | Git 忽略规则 |
| `package.json` | Node 根配置 |
| `README.md` | 仓库根说明 |
| `AGENTS.md`（根级） | OpenCode 自动读取入口 |

### 🔄 移动到新位置（13项）

| # | 当前路径 | 目标路径 |
|---|---|---|
| 1 | `scripts/init-project-memory.ps1` | `tools/init-project-memory/init-project-memory.ps1` |
| 2 | `scripts/sync-codex-home.ps1` | `tools/sync-codex-home/sync-codex-home.ps1` |
| 3 | `templates/codex-home/config.toml` | `tools/sync-codex-home/config/config.toml` |
| 4 | `templates/project-memory/business-context.md` | `tools/init-project-memory/templates/business-context.md` |
| 5 | `templates/project-memory/current-state.md` | `tools/init-project-memory/templates/current-state.md` |
| 6 | `templates/project-memory/decisions.md` | `tools/init-project-memory/templates/decisions.md` |
| 7 | `templates/project-memory/defect-patterns.md` | `tools/init-project-memory/templates/defect-patterns.md` |
| 8 | `templates/project-memory/handoff-template.md` | `tools/init-project-memory/templates/handoff-template.md` |
| 9 | `generate-complete-project-background.md` | `knowledge/traces/` |
| 10 | `market-localchange-task-guide.md` | `knowledge/flows/` |
| 11 | `git-branch-create-ai-prompt-3.md` | `knowledge/flows/` |
| 12 | `multi-session-collaboration-implementation.md` | `knowledge/traces/` |
| 13 | `multi-session-collaboration-implementation-v2.md` | `knowledge/traces/` |
| 14 | `mvp1-step-ui.md` | `knowledge/traces/` |

### 🏗️ 新增（4项）

| 目标路径 | 说明 |
|---|---|
| `config/` | 全局配置目录（空） |
| `knowledge/` | 知识目录 |
| `knowledge/flows/` | 流程/SOP |
| `knowledge/traces/` | 分析追踪资料 |
| `data/` | 项目数据/运行记录（空） |
| `tools/` | 工具目录 |

### ⏸️ 暂不处理但需注意

- `multi-session-collaboration-implementation*.md` 内部引用了旧顶层结构 `runs/` → 应在移动同时更新为 `data/`
- 两份文件中均提到了目标结构 `config/` `knowledge/` `runs/` `tools/`——其中的 `runs/` 需改为 `data/`

---

## 六、对已有工具和启动方式的影响

### 6.1 `sync-codex-home.ps1` 路径影响

**当前代码**（`scripts/sync-codex-home.ps1:38-39`）：
```powershell
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-AbsolutePath (Join-Path $scriptRoot '..')
```

**当前解析**：
- `$scriptRoot` = `scripts/`
- `Join-Path $scriptRoot '..'` = 仓库根 ✅

**移动后解析**（`tools/sync-codex-home/sync-codex-home.ps1`）：
- `$scriptRoot` = `tools/sync-codex-home/`
- `Join-Path $scriptRoot '..'` = `tools/` ❌

**必须修改**：
```
:39  '..'  →  '..\..'
```

### 6.2 `init-project-memory.ps1` 路径影响

**当前代码**（`scripts/init-project-memory.ps1:38-40`）：
```powershell
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-AbsolutePath (Join-Path $scriptRoot '..')
$templatesRoot = Join-Path $repoRoot 'templates\project-memory'
```

**当前解析**：
- `$scriptRoot` = `scripts/`
- `Join-Path $scriptRoot '..'` = 仓库根 ✅
- `$templatesRoot` = `仓库根/templates/project-memory` ✅

**移动后解析**（`tools/init-project-memory/init-project-memory.ps1`）：
- `Join-Path $scriptRoot '..'` = `tools/` ❌
- 正确应为 `Join-Path $scriptRoot '..\..'` = 仓库根 ✅

**必须修改**：
```
:39  '..'               →  '..\..'
:40  'templates\project-memory'  →  'tools\init-project-memory\templates'
```

### 6.3 影响小结

| 工具 | 影响等级 | 必须修改行 |
|---|---|---|
| `tools/sync-codex-home/sync-codex-home.ps1` | 🔴 高 | `:39` 的 `'..'` → `'..\..'` |
| `tools/init-project-memory/init-project-memory.ps1` | 🔴 高 | `:39` 的 `'..'` → `'..\..'`；`:40` 的模板路径 |
| 6 个 .md 文件 | 🟢 低 | 纯文档移动，无程序引用 |

---

## 七、风险与回滚方式

### 风险清单

| 风险 | 级别 | 说明 | 缓解措施 |
|---|---|---|---|
| 脚本移动后相对路径断裂 | 🔴 高 | 两个 ps1 脚本的 `..` 层级移动后计算错误 | 迁移时立刻修改并验证 |
| 外部引用断裂 | 🟡 中 | 如用户有其他脚本/文档引用 `scripts/` 或 `templates/` | 迁移前检查，迁移后更新 README |
| 并发执行风险 | 🟢 低 | 仓库目前仅一人使用 | 每次迁移后 commit |
| .md 文件引用过时结构 | 🟢 低 | 2 个文件引用 `runs/` 而非 `data/` | 迁移时同步更新文案 |

### 回滚方式

**每阶段一个独立 commit**，任何阶段出问题均可：

```powershell
# 方式一：回滚单个阶段
git revert <commit-hash> --no-edit

# 方式二：恢复单个文件
git checkout HEAD~1 -- <file-path>
```

---

## 八、分阶段迁移计划

### 阶段一：创建目标目录结构

```
创建以下空目录（零风险，不影响现有文件）：
├─ config/
├─ knowledge/
│  ├─ flows/
│  └─ traces/
├─ data/
└─ tools/
```

验证：`dir config/ knowledge/ data/ tools/` 存在即可。

---

### 阶段二：迁移散落 .md 到 `knowledge/`

```powershell
git mv generate-complete-project-background.md knowledge/traces/
git mv market-localchange-task-guide.md knowledge/flows/
git mv git-branch-create-ai-prompt-3.md knowledge/flows/
git mv multi-session-collaboration-implementation.md knowledge/traces/
git mv multi-session-collaboration-implementation-v2.md knowledge/traces/
git mv mvp1-step-ui.md knowledge/traces/
```

**本阶段额外操作**：修改 `knowledge/traces/multi-session-collaboration-implementation.md` 和 `-v2.md` 中的 `runs/` → `data/`。

验证：文件可读，路径正确。每个文件独立 commit。

---

### 阶段三：迁移 `scripts/` → `tools/`

```powershell
mkdir tools/init-project-memory
mkdir tools/sync-codex-home
git mv scripts/init-project-memory.ps1 tools/init-project-memory/
git mv scripts/sync-codex-home.ps1 tools/sync-codex-home/
```

**必须修改**两个 ps1 的内部相对路径（详见第六节）。

验证：执行两个脚本确认路径正确。

---

### 阶段四：迁移 `templates/` → `tools/`

```powershell
mkdir tools/init-project-memory/templates
mkdir tools/sync-codex-home/config
git mv templates/codex-home/config.toml tools/sync-codex-home/config/
git mv templates/project-memory/*.md tools/init-project-memory/templates/
```

**必须修改** `tools/init-project-memory/init-project-memory.ps1:40` 的模板路径。

验证：执行 `tools/init-project-memory/init-project-memory.ps1` 确认模板复制正常。

---

### 阶段五：补充 `config/` 和 `data/` 初始内容

当前阶段仅保留空目录。后续有实际内容后再填充。

---

### 迁移后最终结构

```
E:\program\ai-ui-agentic/
├── AGENTS.md                                  ← 根级保留（OpenCode 入口）
├── README.md                                  ← 根级保留（后续更新）
├── package.json                               ← 根级保留
├── .gitignore                                 ← 根级保留
├── config/                                    ← 全局配置（空）
├── data/                                      ← 运行数据（空）
├── knowledge/
│   ├── flows/
│   │   ├── market-localchange-task-guide.md
│   │   └── git-branch-create-ai-prompt-3.md
│   │   └── AGENTS.md（可选副本）
│   └── traces/
│       ├── generate-complete-project-background.md
│       ├── multi-session-collaboration-implementation.md
│       ├── multi-session-collaboration-implementation-v2.md
│       └── mvp1-step-ui.md
└── tools/
    ├── init-project-memory/
    │   ├── init-project-memory.ps1
    │   └── templates/
    │       ├── business-context.md
    │       ├── current-state.md
    │       ├── decisions.md
    │       ├── defect-patterns.md
    │       └── handoff-template.md
    └── sync-codex-home/
        ├── sync-codex-home.ps1
        └── config/
            └── config.toml
```

---

## 九、待确认事项

| 序号 | 待确认问题 | 状态 |
|---|---|---|
| 1 | `AGENTS.md` 是否仅在根级保留一份？还是在 `knowledge/flows/AGENTS.md` 放副本？ | ⏳ 待确认 |
| 2 | 两个 PowerShell 脚本是否确认迁移到 `tools/` 下，还是保持 `scripts/` 作为例外？ | ⏳ 待确认 |
| 3 | `multi-session-collaboration-implementation*.md` 内部引用 `runs/` 是否同步更新为 `data/`？ | ⏳ 待确认 |
| 4 | `package.json` 是否保持为空，或后续为工具添加 npm scripts 入口？ | ⏳ 待确认 |
| 5 | 迁移是否分阶段逐个 commit，还是批量一次完成？ | ⏳ 待确认 |
| 6 | `README.md` 是否在迁移完成后更新为描述新顶层结构？ | ⏳ 待确认 |
