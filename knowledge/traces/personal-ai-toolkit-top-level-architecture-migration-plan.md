# 个人AI工具库顶层架构对齐迁移计划

> 前置审计：`个人AI工具库顶层架构对齐审计报告.md`
> 生成日期：2026-07-04
> 状态：待用户确认后执行

---

## 一、迁移目标

将当前仓库从"脚本 + 模板 + 散落提示词"状态，对齐到已确认的顶层结构：

```
个人AI工具库/
├── AGENTS.md                    ← 根级保留，唯一规则入口（不创建副本）
├── README.md                    ← 迁移后重写
├── package.json                 ← 根级保留
├── .gitignore                   ← 根级保留
├── config/                      ← 全局配置（空目录，后续使用）
├── data/                        ← 运行数据（空目录，后续使用）
├── knowledge/
│   ├── flows/                   ← 流程/SOP/操作指南
│   └── traces/                  ← 项目/功能/工具设计/背景分析
└── tools/
    ├── init-project-memory/     ← 项目记忆初始化工具 + 模板
    └── sync-codex-home/         ← Codex 家目录同步工具 + 配置
```

---

## 二、当前事实与已确认边界

### 已确认规则

1. 根级 `AGENTS.md` 保留为唯一正式规则入口。**不在 `knowledge/flows/` 创建副本。**
2. 最终顶层结构必须收敛为 `config/` `knowledge/` `data/` `tools/`。
3. `scripts/` 下两个 PowerShell 工具迁入 `tools/`。必须修正脚本内相对路径，必须实际执行验证。
4. 根目录散落的知识、流程、提示词和工具设计文档迁入：
   - 流程/SOP/操作指南 → `knowledge/flows/`
   - 项目、功能、工具设计、背景分析资料 → `knowledge/traces/`
5. 所有文档中旧的 `runs/` 引用统一更新为 `data/`。只修改已确认属于个人AI工具库顶层结构的引用。
6. `config/` 与 `data/`：若当前无真实内容，仅创建空目录，不添加占位文件。
7. 不开发"多项目 AI Coding 工作台"。
8. 分阶段提交，每阶段验证后再进入下一阶段。

### 当前仓库事实（`E:\program\ai-ui-agentic`）

**根级文件（6个）：**
- `AGENTS.md` — 52行，Codex 全局规则
- `README.md` — 仓库说明
- `package.json` — 空 Node 配置
- `.gitignore` — Git 忽略规则
- `generate-complete-project-background.md` — 167行，项目背景生成提示词
- `git-branch-create-ai-prompt-3.md` — 53行，Git 建分支提示词
- `market-localchange-task-guide.md` — 398行，市场 Localchange 任务指南
- `multi-session-collaboration-implementation.md` — 358行，多 Session 协同实施提示词 V1
- `multi-session-collaboration-implementation-v2.md` — 432行，多 Session 协同实施提示词 V2
- `mvp1-step-ui.md` — 19行，MVP1 页面 UI 补全提示词

**`scripts/` 目录（2个脚本）：**
- `scripts/init-project-memory.ps1` — 87行
- `scripts/sync-codex-home.ps1` — 91行

**`templates/` 目录（6个模板文件）：**
- `templates/codex-home/config.toml` — 10行
- `templates/project-memory/business-context.md`
- `templates/project-memory/current-state.md`
- `templates/project-memory/decisions.md`
- `templates/project-memory/defect-patterns.md`
- `templates/project-memory/handoff-template.md`

### 已有审计文件

- `个人AI工具库顶层架构对齐审计报告.md` — 根级，392行

---

## 三、阶段一：知识文档归位与 runs → data 文案修正

### 3.1 创建目标目录

```powershell
New-Item -ItemType Directory -Path config/ -Force
New-Item -ItemType Directory -Path knowledge/ -Force
New-Item -ItemType Directory -Path knowledge/flows/ -Force
New-Item -ItemType Directory -Path knowledge/traces/ -Force  # 注：已因计划文件需要而创建
New-Item -ItemType Directory -Path data/ -Force
New-Item -ItemType Directory -Path tools/ -Force
```

> `config/` 首个真实用途：后续存放多工具共用的 OpenCode 路径、环境变量、默认设置。
> `data/` 首个真实用途：后续存放项目档案、任务记录、运行日志。
> 当前无真实内容，仅创建空目录，不添加占位文件。

### 3.2 迁移知识文档

```powershell
git mv generate-complete-project-background.md knowledge/traces/
git mv mvp1-step-ui.md knowledge/traces/
git mv multi-session-collaboration-implementation.md knowledge/traces/
git mv multi-session-collaboration-implementation-v2.md knowledge/traces/
git mv market-localchange-task-guide.md knowledge/flows/
git mv git-branch-create-ai-prompt-3.md knowledge/flows/
```

### 3.3 runs → data 文案修正

需修改两个文件中的 `runs/` 共 12 处。

**`knowledge/traces/multi-session-collaboration-implementation.md`（5 处）：**

| 行号 | 当前内容 | 改为 |
|---|---|---|
| `54` | `├─ runs/` | `├─ data/` |
| `70` | `runs/` | `data/` |
| `141` | `每个协同任务在 \`runs/\` 下建立独立目录。` | `每个协同任务在 \`data/\` 下建立独立目录。` |
| `146` | `runs/` | `data/` |
| `347` | `所有记录均写入 \`runs/TEST-MULTI-001/\`。` | `所有记录均写入 \`data/TEST-MULTI-001/\`。` |

**`knowledge/traces/multi-session-collaboration-implementation-v2.md`（7 处）：**

| 行号 | 当前内容 | 改为 |
|---|---|---|
| `39` | `├─ runs/` | `├─ data/` |
| `56` | `runs/` | `data/` |
| `93` | `runs/` | `data/` |
| `223` | `记录位置：runs/JIRA-123/sessions/C0.md` | `记录位置：data/JIRA-123/sessions/C0.md` |
| `236` | `记录位置：runs/JIRA-123/sessions/C1.md` | `记录位置：data/JIRA-123/sessions/C1.md` |
| `318` | `runs/` | `data/` |
| `409` | `8. C0、C1 的结果与交接写入 \`runs/TEST-MULTI-001/\`。` | `8. C0、C1 的结果与交接写入 \`data/TEST-MULTI-001/\`。` |

### 3.4 验证

```powershell
# 目录检查
dir config/ knowledge/ knowledge/flows/ knowledge/traces/ data/ tools/

# 文件可读性
Get-Content knowledge/flows/market-localchange-task-guide.md -Head 3
Get-Content knowledge/traces/generate-complete-project-background.md -Head 3

# 确认 runs 无遗留（应无输出，或仅剩 data/ 内部引用）
Select-String -Path knowledge/traces/multi-session-collaboration-implementation.md -Pattern 'runs/'
Select-String -Path knowledge/traces/multi-session-collaboration-implementation-v2.md -Pattern 'runs/'
```

### 3.5 提交

```
git commit -m "refactor: 知识文档归位 knowledge/，runs 引用统一为 data/"
```

---

## 四、阶段二：脚本与模板迁入 tools、路径修复和验证

### 4.1 创建工具目录并迁移文件

```powershell
New-Item -ItemType Directory -Path tools/init-project-memory/templates/ -Force
New-Item -ItemType Directory -Path tools/sync-codex-home/config/ -Force

git mv scripts/init-project-memory.ps1 tools/init-project-memory/
git mv scripts/sync-codex-home.ps1 tools/sync-codex-home/
git mv templates/codex-home/config.toml tools/sync-codex-home/config/
git mv templates/project-memory/business-context.md tools/init-project-memory/templates/
git mv templates/project-memory/current-state.md tools/init-project-memory/templates/
git mv templates/project-memory/decisions.md tools/init-project-memory/templates/
git mv templates/project-memory/defect-patterns.md tools/init-project-memory/templates/
git mv templates/project-memory/handoff-template.md tools/init-project-memory/templates/
```

### 4.2 修复脚本内部路径

**`tools/sync-codex-home/sync-codex-home.ps1`（2 处修改）：**

| 行号 | 当前代码 | 改为 |
|---|---|---|
| `57` | `$repoRoot = Resolve-AbsolutePath (Join-Path $scriptRoot '..')` | `$repoRoot = Resolve-AbsolutePath (Join-Path $scriptRoot '..\..')` |
| `73` | `Source = Join-Path $repoRoot 'templates\codex-home\config.toml'` | `Source = Join-Path $scriptRoot 'config\config.toml'` |

**修改后路径解析：**
- `$scriptRoot` = `tools\sync-codex-home\`
- `Join-Path $scriptRoot '..\..'` = 仓库根（与旧行为一致）
- `Join-Path $scriptRoot 'config\config.toml'` = `tools\sync-codex-home\config\config.toml`（工具专属配置）

**`tools/init-project-memory/init-project-memory.ps1`（2 处修改）：**

| 行号 | 当前代码 | 改为 |
|---|---|---|
| `39` | `$repoRoot = Resolve-AbsolutePath (Join-Path $scriptRoot '..')` | `$repoRoot = Resolve-AbsolutePath (Join-Path $scriptRoot '..\..')` |
| `40` | `$templatesRoot = Join-Path $repoRoot 'templates\project-memory'` | `$templatesRoot = Join-Path $scriptRoot 'templates'` |

**修改后路径解析：**
- `$scriptRoot` = `tools\init-project-memory\`
- `Join-Path $scriptRoot '..\..'` = 仓库根（与旧行为一致）
- `Join-Path $scriptRoot 'templates'` = `tools\init-project-memory\templates`（工具专属模板）

### 4.3 实际执行验证

**① 验证 `sync-codex-home`：**

```powershell
# 不传 -IncludeConfig，仅同步 AGENTS.md
tools\sync-codex-home\sync-codex-home.ps1

# 验证目标文件存在且内容匹配（可能仅有 CRLF 差异）
$source = Get-Content AGENTS.md -Raw
$dest = Get-Content "$env:USERPROFILE\.codex\AGENTS.md" -Raw
$source.Replace("`r`n", "`n") -eq $dest.Replace("`r`n", "`n")
# 输出应为 True
```

**② 验证 `init-project-memory`：**

```powershell
$testPath = "$env:TEMP\ai-tool-test-" + (Get-Date -Format 'yyyyMMddHHmmss')
tools\init-project-memory\init-project-memory.ps1 -ProjectPath $testPath

# 验证输出目录和文件
dir $testPath\.ai\
Get-Content $testPath\.ai\business-context.md -Head 3
Get-Content $testPath\.ai\handoffs\handoff-template.md -Head 3

# 清理测试产物
Remove-Item -Recurse -Force $testPath
```

### 4.4 提交

```
git commit -m "refactor: 工具脚本迁入 tools/，模板归位，修复路径"
```

---

## 五、阶段三：README 更新

### 5.1 重写 README

更新内容：
- 顶层结构说明（`config/` `knowledge/` `data/` `tools/`）
- 每个工具的新入口路径和调用方式
- `knowledge/flows/` 和 `knowledge/traces/` 的职责说明
- 旧 `scripts/` 路径已废弃的说明

### 5.2 验证

```powershell
Get-Content README.md -Head 30
```

### 5.3 提交

```
git commit -m "docs: README 更新为迁移后顶层结构"
```

---

## 六、每阶段修改文件清单

### 阶段一

| 操作 | 文件 | 数量 |
|---|---|---|
| 新增目录 | `config/` `knowledge/` `knowledge/flows/` `data/` `tools/` | 5 |
| 移动文件 | 6 个根级 .md → `knowledge/` | 6 |
| 修改文件 | `knowledge/traces/multi-session-collaboration-implementation.md` | 1 |
| 修改文件 | `knowledge/traces/multi-session-collaboration-implementation-v2.md` | 1 |

### 阶段二

| 操作 | 文件 | 数量 |
|---|---|---|
| 新增目录 | `tools/init-project-memory/` `tools/init-project-memory/templates/` `tools/sync-codex-home/` `tools/sync-codex-home/config/` | 4 |
| 移动文件 | `scripts/init-project-memory.ps1` → `tools/init-project-memory/` | 1 |
| 移动文件 | `scripts/sync-codex-home.ps1` → `tools/sync-codex-home/` | 1 |
| 移动文件 | `templates/codex-home/config.toml` → `tools/sync-codex-home/config/` | 1 |
| 移动文件 | `templates/project-memory/*.md` × 5 → `tools/init-project-memory/templates/` | 5 |
| 修改文件 | `tools/init-project-memory/init-project-memory.ps1`（:39, :40） | 1 |
| 修改文件 | `tools/sync-codex-home/sync-codex-home.ps1`（:57, :73） | 1 |

### 阶段三

| 操作 | 文件 | 数量 |
|---|---|---|
| 修改文件 | `README.md` | 1 |

---

## 七、每阶段验证命令

### 阶段一验证

```
验证项 1：所有目标目录存在
验证项 2：6 个 .md 可从新路径正常读取
验证项 3：2 个文件中 runs/ 引用已全部替换

命令：
dir config/ knowledge/flows/ knowledge/traces/ data/ tools/
Get-Content knowledge/flows/market-localchange-task-guide.md -Head 3
Select-String -Path knowledge/traces/multi-session-collaboration-implementation.md -Pattern 'runs/'
Select-String -Path knowledge/traces/multi-session-collaboration-implementation-v2.md -Pattern 'runs/'
```

### 阶段二验证

```
验证项 1：sync-codex-home.ps1 可成功执行（同步 AGENTS.md 到 Codex 家目录）
验证项 2：同步后文件内容与源文件一致
验证项 3：init-project-memory.ps1 可成功在临时目录初始化 .ai/
验证项 4：初始化产物结构完整
验证项 5：旧 scripts/ 和 templates/ 目录已空或不存在

命令：
tools\sync-codex-home\sync-codex-home.ps1
$source = Get-Content AGENTS.md -Raw; $dest = Get-Content "$env:USERPROFILE\.codex\AGENTS.md" -Raw; $source.Replace("`r`n", "`n") -eq $dest.Replace("`r`n", "`n")

$tp = "$env:TEMP\ai-test-" + (Get-Date -Format 'yyyyMMddHHmmss'); tools\init-project-memory\init-project-memory.ps1 -ProjectPath $tp; dir $tp\.ai\; Remove-Item -Recurse -Force $tp
```

### 阶段三验证

```
验证项 1：README.md 中顶层结构描述与实际一致
验证项 2：README.md 中工具入口路径正确

命令：
Get-Content README.md
```

---

## 八、每阶段回滚方式

每个阶段一个独立 commit，可逐阶段回滚：

```powershell
# 回滚最新阶段
git revert --no-edit HEAD

# 回滚到阶段一之前
git reset --hard <阶段一之前的commit>

# 回滚到阶段二之前（保留阶段一）
git revert --no-edit <阶段三的commit>
git revert --no-edit <阶段二的commit>
```

---

## 九、脚本迁移后的新调用方式

| 工具 | 旧调用 | 新调用 |
|---|---|---|
| 项目记忆初始化 | `scripts\init-project-memory.ps1 -ProjectPath <path>` | `tools\init-project-memory\init-project-memory.ps1 -ProjectPath <path>` |
| Codex 家目录同步 | `scripts\sync-codex-home.ps1` | `tools\sync-codex-home\sync-codex-home.ps1` |
| Codex 家目录同步（含配置） | `scripts\sync-codex-home.ps1 -IncludeConfig` | `tools\sync-codex-home\sync-codex-home.ps1 -IncludeConfig` |

---

## 十、风险与注意事项

| 风险 | 级别 | 说明 | 缓解措施 |
|---|---|---|---|
| 脚本路径断裂 | 🔴 高 | 两 ps1 需要更新 `..` 层数和模板路径 | 阶段二中先 git mv 再修改路径，然后实际执行验证 |
| 外部文档引用断裂 | 🟡 中 | 用户可能有外部笔记引用 `scripts/` 或 `templates/` | 阶段三 README 中明确说明路径变更 |
| runs 引用遗漏 | 🟢 低 | 仅有 2 个文件共 12 处引用 | grep 精确匹配，逐行修改 |
| 空目录被 .gitignore 忽略 | 🟢 低 | Git 不跟踪空目录 | 不影响使用，有真实内容添加后自动进入跟踪 |

**注意事项：**
1. `knowledge/traces/` 目录已因存放本计划文件而创建，阶段一中只需确认存在，勿重复创建。
2. 所有 `runs/` → `data/` 替换使用精确行级编辑（`edit` 工具），不全局替换，避免误改 non-structure 内容。
3. 如果 `scripts/` 和 `templates/` 目录在迁移后变空，Git 不会保留空目录——这符合预期。
4. 阶段二验证需运行 PowerShell 脚本，如果 `$env:USERPROFILE\.codex\` 下有旧备份或权限问题，需逐项处理。

---

## 十一、待确认事项

| 序号 | 事项 | 状态 |
|---|---|---|
| 1 | 阶段一的 `runs/` → `data/` 替换范围：除上述 2 个文件 12 处外，是否还有其他文件需要修改？ | ⏳ 请确认 |

---

> **下一步：用户确认后，按阶段一 → 二 → 三顺序执行迁移。每阶段完成后输出验证结果，再进入下一阶段。**
