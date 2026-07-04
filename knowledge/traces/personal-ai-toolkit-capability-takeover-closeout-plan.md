# 个人AI工具库能力接管收口计划

> 生成日期：2026-07-04
> 阶段：只读分析 + 最小修复计划
> 范围：TASK-SOP.md 缺失引用 + 遗留空目录清理

---

## 一、问题事实与依据

经只读核查，当前仓库存在以下与顶层对齐迁移相关的收口问题：

### 问题 1：`AGENTS.md` 包含两个陈旧引用

**引用 A**（`AGENTS.md:42`）：
> Use the templates in `templates/project-memory/` as the starting point.

- 来源：Project Memory Discipline 章末尾
- 事实：`templates/project-memory/` 目录在阶段二迁移后已空（所有文件已 git mv 到 `tools/init-project-memory/templates/`）
- 正确路径：`tools/init-project-memory/templates/`

**引用 B**（`AGENTS.md:44`）：
> For the full workflow, see `TASK-SOP.md` in this repository. `AGENTS.md` is the active enforcement layer; `TASK-SOP.md` is the detailed operating guide.

- 来源：Project Memory Discipline 章末尾（AGENTS-SOP 关系说明句）
- 事实：`TASK-SOP.md` **不存在于磁盘**，也**从未进入 Git 历史**（`git log --all --full-history --oneline -- TASK-SOP.md` 无输出）
- 该文件在早期迁移清理时被删除（并非有意，是附带删除）

### 问题 2：遗留空目录

| 目录 | 内容 | Git 跟踪 |
|---|---|---|
| `scripts/` | 0 个文件，完全空 | `git ls-files scripts/` 无输出 |
| `templates/` | 2 个空子目录（`codex-home/`、`project-memory/`），无任何文件 | `git ls-files templates/` 无输出 |

引用检查结论：
- 现有代码文件（`.ps1`、`package.json`、`.gitignore`）：**无引用** `scripts/` 或 `templates/`
- 当前 README.md：**无引用**（已更新为 `tools/` 路径）
- 历史审计/迁移文档（`knowledge/traces/` 下多个 .md）：包含大量 `scripts/`、`templates/` 引用，但这些是**历史记录**，应当保留不修改
- AGENTS.md:42：含陈旧引用 `templates/project-memory/`（见问题 1）

**结论**：`scripts/` 和 `templates/` 不再被任何活跃文件引用，可以安全删除。历史文档中的引用作为迁移轨迹保留。

---

## 二、TASK-SOP.md 缺失引用分析

### 2.1 原本职责

TASK-SOP.md 原为 238 行的详细操作指南，内容覆盖：

| 主题 | 内容 |
|---|---|
| New Project SOP | 新项目接管流程：检查 .ai/ → 生成 PROJECT_MAP.md |
| Start SOP | 任务启动流程：检查项目记忆 → 初始化 → 读取当前上下文 |
| Long-Term Project Intelligence | `.ai/business-context.md` 的长期上下文分类 |
| Execution Expectations | 执行约束：保持范围、遵循状态、避免大改 |
| End SOP | 任务结束流程：更新状态、记录决策、留交接 |
| Small Task Path | 小任务简化流程 |
| Complex Task Path | 复杂任务完整流程 |
| Expected Outputs Per Task | 每个任务必须的产物清单 |

### 2.2 现有规则已覆盖哪些

| TASK-SOP 内容 | 当前 AGENTS.md 覆盖章节 | 覆盖程度 |
|---|---|---|
| New Project SOP | Task SOP（:12-23）— 检查 .ai/、生成 PROJECT_MAP | 完整 ✅ |
| Start SOP | Task SOP（:12-23）— 检查记忆、初始化、读取上下文 | 完整 ✅ |
| Long-Term Intelligence | Task SOP（:22）— `.ai/business-context.md` 职责说明 | 简化但足够 ✅ |
| Execution Expectations | Working Rules（:5-10）— 保持范围、小修改优先 | 完整 ✅ |
| End SOP | Project Memory Discipline（:25-42）— 更新状态/决策/交接 | 完整 ✅ |
| Small/Complex Task Path | Working Rules → "analyze first, then change files" | 隐含 ✅ |
| Expected Outputs | 文档化与正式产物要求（:46-55）— 正式产物清单 | 完整 ✅ |

**结论**：TASK-SOP.md 的 7 个核心职责已全部被 `AGENTS.md` 的 5 个现有章节覆盖。不需要重建。

### 2.3 额外覆盖：`knowledge/flows/` 中的流程补充

- `market-localchange-task-guide.md`：覆盖特定业务场景（市场 Localchange）的详细分析流程
- `git-branch-create-ai-prompt-3.md`：覆盖 Git 分支创建的标准化操作

---

## 三、推荐处理方案与理由

### 3.1 TASK-SOP 缺失引用（`AGENTS.md:42-44`）

**推荐方案**：修改 `AGENTS.md:42-44`，替换陈旧引用，删除不存在文件的引用。

**理由**：
- 不凭空重建重复 SOP（已有规则已覆盖全部职责）
- 不引入新文件增加维护负担
- 将旧 `templates/project-memory/` 引用更新为真实路径

**旧内容**（:42-44）：
```
Use the templates in `templates/project-memory/` as the starting point.

For the full workflow, see `TASK-SOP.md` in this repository. `AGENTS.md` is the active enforcement layer; `TASK-SOP.md` is the detailed operating guide.
```

**新内容**：
```
Use the templates in `tools/init-project-memory/templates/` as the starting point. The `init-project-memory` tool copies these templates when initializing a project's `.ai/` directory.
```

**修改原理**：
1. `templates/project-memory/` → `tools/init-project-memory/templates/`（路径更新）
2. 删除 `TASK-SOP.md` 引用（文件不存在，且其职责已被 AGENTS.md 覆盖）
3. 补充一句说明 "tool copies these templates when initializing" 提供上下文

### 3.2 遗留空目录

**推荐方案**：删除 `scripts/` 和 `templates/` 两个空目录。

**命令**：
```powershell
Remove-Item -Recurse -Force scripts/
Remove-Item -Recurse -Force templates/
```

**理由**：
- 两个目录下均无任何文件（已验证）
- `git ls-files` 无输出（Git 不跟踪空目录，删除不影响 Git 历史）
- 当前 README.md 和活跃脚本均不引用这两个路径
- 历史文档中的引用为迁移记录，不宜修改，空目录的物理删除不影响这些文档的可读性

---

## 四、空目录与引用检查结果

### 4.1 目录状态

| 目录 | 子目录 | 文件数 | Git 跟踪 |
|---|---|---|---|
| `scripts/` | 无 | 0 | ❌ `git ls-files scripts/` 无输出 |
| `templates/codex-home/` | 无 | 0 | ❌ `git ls-files templates/` 无输出 |
| `templates/project-memory/` | 无 | 0 | ❌ 同上 |

### 4.2 引用检查

| 检查范围 | 引用 `scripts/` 或 `templates/`（旧路径） | 处理 |
|---|---|---|
| `AGENTS.md` | ✅ 1 处（:42 `templates/project-memory/`） | 本次修复 |
| `README.md` | ❌ 无（已更新为 `tools/` 路径） | 无需处理 |
| `tools/*.ps1` | ❌ 无（已修复为 `tools/` 路径） | 无需处理 |
| `knowledge/flows/` | ❌ 无 | 无需处理 |
| `knowledge/traces/` 审计/迁移文件 | ✅ 大量（历史记录） | **不修改**，保留为迁移轨迹 |
| `knowledge/traces/personal-ai-toolkit-current-capability-map.md` | ✅ 2 处（:42, :259） | 已正确记录为"遗留空目录"，不需修改 |
| `package.json` | ❌ 无 | 无需处理 |

---

## 五、实际修改文件清单

| 操作 | 文件 | 行号 | 说明 |
|---|---|---|---|
| 修改（2 处） | `AGENTS.md` | `42-44` | 更新模板路径 + 删除 TASK-SOP.md 引用 |
| 删除（2 个） | `scripts/`（空目录） | — | 物理删除 |
| 删除（1 个） | `templates/`（含 2 个空子目录） | — | 物理删除 |

**不修改**：`README.md`、`tools/` 下任何文件、`knowledge/` 下任何文件、`package.json`、`.gitignore`

---

## 六、验证命令

### 6.1 AGENTS.md 修改后验证

```powershell
# AGENTS.md 可读
Get-Content AGENTS.md | Select-Object -First 5
# 预期：正常输出标题和规则

# 确认无 TASK-SOP 引用
Select-String -Path AGENTS.md -Pattern 'TASK-SOP'
# 预期：无输出

# 确认模板引用路径正确
Select-String -Path AGENTS.md -Pattern 'tools/init-project-memory/templates'
# 预期：命中 1 处（:42）
Test-Path tools/init-project-memory/templates/
# 预期：True

# 确认旧路径引用已清除
Select-String -Path AGENTS.md -Pattern 'templates/project-memory|TASK-SOP\.md'
# 预期：无输出
```

### 6.2 空目录删除后验证

```powershell
# 确认目录不存在
Test-Path scripts/     # 预期：False
Test-Path templates/   # 预期：False

# git status 检查
git status --short
# 预期：无输出（干净状态，已提交）
```

### 6.3 最终完整性验证

```powershell
# 根目录结构检查
Get-ChildItem -Directory
# 预期：knowledge/ tools/ .git/ 仅此三个目录（不含 scripts/ templates/）

# git diff --check
# 预期：通过
```

---

## 七、回滚方式

单次 commit 提交本次所有修改，回滚方式：

```powershell
# 回滚本次收口修改
git revert --no-edit HEAD

# 如需恢复空目录（git revert 不会恢复空目录，需手动）
New-Item -ItemType Directory -Path scripts/
New-Item -ItemType Directory -Path templates/codex-home/
New-Item -ItemType Directory -Path templates/project-memory/
```

---

## 八、风险与待确认项

### 风险

| 风险 | 级别 | 说明 | 缓解措施 |
|---|---|---|---|
| AGENTS.md 修改破坏既有规则含义 | 🟢 低 | 仅修改 `:42-44` 的 3 行，不涉及其他 5 个章节 | 修改前后 diff 对比确认 |
| 空目录被其他进程引用 | 🟢 低 | `scripts/` 和 `templates/` 为完全空目录，不会被外部引用 | 已验证无活跃文件引用 |

### 待确认项

| 序号 | 事项 | 影响 |
|---|---|---|
| 1 | AGENTS.md:42 模板路径替换为中文还是英文？当前 AGENTS.md 使用英文撰写，但新增的"文档化与正式产物要求"章节使用中文。建议保持与上下文一致的英文 | 风格一致性 |

---

## 九、是否可以进入实施

✅ 可以进入实施。共修改 1 个文件（AGENTS.md）+ 删除 2 个空目录。范围小、风险低、回滚简单。
