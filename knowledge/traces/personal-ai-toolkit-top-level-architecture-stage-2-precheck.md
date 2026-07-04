# 个人AI工具库顶层架构对齐 — 阶段二预检查

> 执行日期：2026-07-04
> 前置：阶段一收尾（commit: e9406be）
> 状态：预检查完成，待确认后进入实施

---

## 一、当前脚本真实内容与依赖路径

### 1.1 `scripts/init-project-memory.ps1`（87 行）

**功能**：在目标项目目录创建 `.ai/` 项目记忆结构，从模板复制初始文件。

**路径计算链**：

```powershell
:38  $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
     # 当前: scripts/

:39  $repoRoot = Resolve-AbsolutePath (Join-Path $scriptRoot '..')
     # 当前: 仓库根 ✅

:40  $templatesRoot = Join-Path $repoRoot 'templates\project-memory'
     # 当前: 仓库根/templates/project-memory
```

**依赖的模板文件**（:54-73）：

| 源路径 | 用途 |
|---|---|
| `templates/project-memory/business-context.md` | 复制到 `{ProjectPath}\.ai\` |
| `templates/project-memory/defect-patterns.md` | 同上 |
| `templates/project-memory/current-state.md` | 同上 |
| `templates/project-memory/decisions.md` | 同上 |
| `templates/project-memory/handoff-template.md` | 复制到 `{ProjectPath}\.ai\handoffs\` |

**无外部路径引用。** 脚本仅依赖 `$templatesRoot` 变量（:40）中的相对路径。

### 1.2 `scripts/sync-codex-home.ps1`（91 行）

**功能**：将仓库中的 `AGENTS.md`（和可选的 `config.toml`）同步到 `%USERPROFILE%\.codex`。

**路径计算链**：

```powershell
:56  $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
     # 当前: scripts/

:57  $repoRoot = Resolve-AbsolutePath (Join-Path $scriptRoot '..')
     # 当前: 仓库根 ✅

:65  Source = Join-Path $repoRoot 'AGENTS.md'
     # 当前: 仓库根/AGENTS.md — 不受迁移影响

:73  Source = Join-Path $repoRoot 'templates\codex-home\config.toml'
     # 当前: 仓库根/templates/codex-home/config.toml
     # ⚠️ 依赖 templates/ 下文件
```

**依赖根级文件**：`AGENTS.md`（:65）— 不受迁移影响。
**依赖模板文件**：`templates/codex-home/config.toml`（:73）— 仅当 `-IncludeConfig` 时使用。

**无外部路径引用。**

---

## 二、模板与脚本的真实引用关系

| 脚本 | 引用方式 | 引用文件 | 引用代码行 |
|---|---|---|---|
| `init-project-memory.ps1` | 间接引用 | `templates/project-memory/`下 5 个 .md | `:40`（`$templatesRoot`）→ `:54-73`（逐个 Join-Path） |
| `sync-codex-home.ps1` | 直接引用 | `templates/codex-home/config.toml` | `:73`（仅在 `-IncludeConfig` 时） |

**不存在间接引用**：两个脚本都只通过自身路径变量找到模板，不依赖环境变量、注册表、外部配置文件或其他脚本。

---

## 三、迁移后目标结构与路径修正

### 3.1 目标目录

```
tools/
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

### 3.2 路径修改明细

**`tools/init-project-memory/init-project-memory.ps1`（2 处）：**

| 行号 | 当前代码 | 改为 | 原因 |
|---|---|---|---|
| `39` | `Join-Path $scriptRoot '..'` | `Join-Path $scriptRoot '..\..'` | `$scriptRoot` 从 `scripts/` 变为 `tools/init-project-memory/`，需多上一级到仓库根 |
| `40` | `Join-Path $repoRoot 'templates\project-memory'` | `Join-Path $scriptRoot 'templates'` | 模板已随工具移动到 `tools/init-project-memory/templates/`，直接用 `$scriptRoot` 更稳健 |

**修改后路径解析**：
- `$scriptRoot` = `tools\init-project-memory\`
- `Join-Path $scriptRoot '..\..'` = 仓库根 ✅
- `Join-Path $scriptRoot 'templates'` = `tools\init-project-memory\templates` ✅（与旧行为功能等价）

**`tools/sync-codex-home/sync-codex-home.ps1`（2 处）：**

| 行号 | 当前代码 | 改为 | 原因 |
|---|---|---|---|
| `57` | `Join-Path $scriptRoot '..'` | `Join-Path $scriptRoot '..\..'` | 同 init 脚本，需多上一级 |
| `73` | `Join-Path $repoRoot 'templates\codex-home\config.toml'` | `Join-Path $scriptRoot 'config\config.toml'` | config.toml 已随工具移动到 `tools/sync-codex-home/config/` |

**修改后路径解析**：
- `$scriptRoot` = `tools\sync-codex-home\`
- `Join-Path $scriptRoot '..\..'` = 仓库根 ✅
- `Join-Path $scriptRoot 'config\config.toml'` = `tools\sync-codex-home\config\config.toml` ✅
- `Join-Path $repoRoot 'AGENTS.md'`（:65）— 不受影响，`$repoRoot` 仍为仓库根

### 3.3 新调用命令

| 工具 | 旧命令 | 新命令 |
|---|---|---|
| 项目记忆初始化 | `scripts\init-project-memory.ps1 -ProjectPath <path>` | `tools\init-project-memory\init-project-memory.ps1 -ProjectPath <path>` |
| Codex 家目录同步 | `scripts\sync-codex-home.ps1` | `tools\sync-codex-home\sync-codex-home.ps1` |
| Codex 家目录同步（含配置） | `scripts\sync-codex-home.ps1 -IncludeConfig` | `tools\sync-codex-home\sync-codex-home.ps1 -IncludeConfig` |

---

## 四、阶段二修改文件清单

| 操作 | 文件 | 数量 |
|---|---|---|
| 创建目录 | `tools/init-project-memory/` | 1 |
| 创建目录 | `tools/init-project-memory/templates/` | 1 |
| 创建目录 | `tools/sync-codex-home/` | 1 |
| 创建目录 | `tools/sync-codex-home/config/` | 1 |
| git mv | `scripts/init-project-memory.ps1` → `tools/init-project-memory/` | 1 |
| git mv | `scripts/sync-codex-home.ps1` → `tools/sync-codex-home/` | 1 |
| git mv | `templates/codex-home/config.toml` → `tools/sync-codex-home/config/` | 1 |
| git mv | `templates/project-memory/*.md` × 5 → `tools/init-project-memory/templates/` | 5 |
| 路径修复 | `tools/init-project-memory/init-project-memory.ps1`（:39, :40） | 1 |
| 路径修复 | `tools/sync-codex-home/sync-codex-home.ps1`（:57, :73） | 1 |

**总计**：4 个新目录 + 7 个 git mv + 2 个内容修改

---

## 五、验证命令与预期结果

### 5.1 迁移后结构验证

```powershell
# 确认新路径存在
Test-Path tools/init-project-memory/init-project-memory.ps1   # 预期: True
Test-Path tools/sync-codex-home/sync-codex-home.ps1           # 预期: True
Test-Path tools/init-project-memory/templates/business-context.md  # 预期: True
Test-Path tools/sync-codex-home/config/config.toml            # 预期: True

# 确认旧路径不存在
Test-Path scripts/init-project-memory.ps1   # 预期: False
Test-Path templates/codex-home/             # 预期: False（空目录不跟踪）
```

### 5.2 sync-codex-home 功能验证

```powershell
# 执行同步
tools\sync-codex-home\sync-codex-home.ps1

# 验证 AGENTS.md 内容一致性
$source = Get-Content AGENTS.md -Raw
$dest = Get-Content "$env:USERPROFILE\.codex\AGENTS.md" -Raw
$source.Replace("`r`n", "`n") -eq $dest.Replace("`r`n", "`n")
# 预期: True
```

### 5.3 init-project-memory 功能验证

```powershell
# 在临时目录测试
$tp = "$env:TEMP\ai-test-" + (Get-Date -Format 'yyyyMMddHHmmss')
tools\init-project-memory\init-project-memory.ps1 -ProjectPath $tp

# 验证产物
Test-Path "$tp\.ai\business-context.md"     # 预期: True
Test-Path "$tp\.ai\handoffs\handoff-template.md"  # 预期: True
Get-Content "$tp\.ai\business-context.md" -Head 2  # 预期: 有内容

# 清理
Remove-Item -Recurse -Force $tp
```

### 5.4 git status 验证

```powershell
git status --short
# 预期: 无输出（干净状态，已提交）
```

---

## 六、阻塞项检查

| 检查项 | 状态 |
|---|---|
| 未提交变更 | ✅ 无（`git status --short` 为空） |
| 外部路径引用 | ✅ 无（两个脚本仅使用 `$MyInvocation.MyCommand.Path` 自定位） |
| 环境变量依赖 | ✅ 无（sync-codex-home 使用 `$env:USERPROFILE` 默认值，不受迁移影响） |
| 其他脚本依赖 | ✅ 无（两个脚本独立运行，不相互调用） |
| Git 冲突风险 | ✅ 无（`scripts/` 和 `templates/` 下文件与 `tools/` 不重叠） |

---

## 七、失败回滚方式

阶段二一个独立 commit，回滚命令：

```powershell
git revert --no-edit HEAD
```

如需恢复旧调用路径（临时措施）：
```powershell
# 将脚本复制回旧路径
Copy-Item tools/init-project-memory/init-project-memory.ps1 scripts/
Copy-Item tools/sync-codex-home/sync-codex-home.ps1 scripts/
```

---

## 八、结论

✅ 具备进入阶段二实施条件。所有路径依赖已梳理清楚，修改点精确定位到行号，无阻塞项。
