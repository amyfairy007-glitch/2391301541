# 个人AI工具库顶层架构对齐迁移 — 阶段二实施结果

> 执行日期：2026-07-04
> 前置预检查：`knowledge/traces/personal-ai-toolkit-top-level-architecture-stage-2-precheck.md`
> 上一阶段：阶段一收尾（commit: e9406be）

---

## 一、实施内容

### 1.1 创建工具目录

| 目录 | 用途 |
|---|---|
| `tools/init-project-memory/` | 项目记忆初始化工具根目录 |
| `tools/init-project-memory/templates/` | 工具专属模板 |
| `tools/sync-codex-home/` | Codex 家目录同步工具根目录 |
| `tools/sync-codex-home/config/` | 工具专属配置 |

### 1.2 迁移文件

| 来源 | 目标 | 类型 |
|---|---|---|
| `scripts/init-project-memory.ps1` | `tools/init-project-memory/init-project-memory.ps1` | 脚本 |
| `scripts/sync-codex-home.ps1` | `tools/sync-codex-home/sync-codex-home.ps1` | 脚本 |
| `templates/codex-home/config.toml` | `tools/sync-codex-home/config/config.toml` | 配置 |
| `templates/project-memory/business-context.md` | `tools/init-project-memory/templates/` | 模板 |
| `templates/project-memory/current-state.md` | `tools/init-project-memory/templates/` | 模板 |
| `templates/project-memory/decisions.md` | `tools/init-project-memory/templates/` | 模板 |
| `templates/project-memory/defect-patterns.md` | `tools/init-project-memory/templates/` | 模板 |
| `templates/project-memory/handoff-template.md` | `tools/init-project-memory/templates/` | 模板 |

### 1.3 路径修复（4 处）

**`tools/init-project-memory/init-project-memory.ps1`：**

| 行号 | 修改 |
|---|---|
| `39` | `Join-Path $scriptRoot '..'` → `Join-Path $scriptRoot '..\..'` |
| `40` | `Join-Path $repoRoot 'templates\project-memory'` → `Join-Path $scriptRoot 'templates'` |

**`tools/sync-codex-home/sync-codex-home.ps1`：**

| 行号 | 修改 |
|---|---|
| `57` | `Join-Path $scriptRoot '..'` → `Join-Path $scriptRoot '..\..'` |
| `73` | `Join-Path $repoRoot 'templates\codex-home\config.toml'` → `Join-Path $scriptRoot 'config\config.toml'` |

---

## 二、实际验证结果

### 2.1 sync-codex-home 验证

```powershell
powershell -ExecutionPolicy Bypass -File tools\sync-codex-home\sync-codex-home.ps1
```

| 验证项 | 结果 |
|---|---|
| 脚本可执行 | ✅ |
| 目标路径正确（`%USERPROFILE%\.codex\AGENTS.md`） | ✅ |
| 同步后内容一致性（`$source -eq $dest`，忽略 CRLF） | ✅ True |

### 2.2 init-project-memory 验证

```powershell
powershell -ExecutionPolicy Bypass -File tools\init-project-memory\init-project-memory.ps1 -ProjectPath $tp
```

| 验证项 | 结果 |
|---|---|
| `.ai/` 目录创建 | ✅ |
| `business-context.md` 存在且有内容 | ✅ |
| `current-state.md` 存在且有内容 | ✅ |
| `decisions.md` 存在且有内容 | ✅ |
| `defect-patterns.md` 存在且有内容 | ✅ |
| `.ai/handoffs/handoff-template.md` 存在且有内容 | ✅ |
| 临时测试目录已清理 | ✅ |

---

## 三、修改文件清单

| 操作 | 文件 | 状态 |
|---|---|---|
| git mv | `scripts/init-project-memory.ps1` → `tools/init-project-memory/` | ✅ |
| git mv | `scripts/sync-codex-home.ps1` → `tools/sync-codex-home/` | ✅ |
| git mv | `templates/codex-home/config.toml` → `tools/sync-codex-home/config/` | ✅ |
| git mv | `templates/project-memory/*.md` × 5 → `tools/init-project-memory/templates/` | ✅ |
| 路径修复 | `tools/init-project-memory/init-project-memory.ps1` :39, :40 | ✅ |
| 路径修复 | `tools/sync-codex-home/sync-codex-home.ps1` :57, :73 | ✅ |

---

## 四、新调用方式

| 工具 | 新命令 |
|---|---|
| 项目记忆初始化 | `tools\init-project-memory\init-project-memory.ps1 -ProjectPath <path>` |
| Codex 家目录同步 | `tools\sync-codex-home\sync-codex-home.ps1` |
| Codex 家目录同步（含配置） | `tools\sync-codex-home\sync-codex-home.ps1 -IncludeConfig` |

---

## 五、commit

```
9aef222 — refactor: 工具脚本迁入 tools/，模板归位，修复路径
```

---

## 六、遗留项

| 事项 | 状态 |
|---|---|
| README 更新 | 阶段三 |
| 多项目 AI Coding 工作台 | 暂不开发 |

---

## 七、是否具备进入阶段三条件

✅ 具备。阶段二全部内容（脚本迁移 + 模板归位 + 路径修复 + 实测验证）已完成并提交。
