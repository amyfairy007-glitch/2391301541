# 多项目 AI Coding 桌面控制台 MVP — 阶段 A 实施结果

> 执行日期：2026-07-04
> 前置计划：`knowledge/traces/ai-coding-desktop-console-mvp-stage-a-plan.md`
> 后续阶段：阶段 B — 项目登记与状态读取

---

## 一、实际新增、迁移、修改文件

| 操作 | 文件 | 说明 |
|---|---|---|
| git mv | `data/projects-manifest.json` → `data/ai-coding-console/` | 项目索引迁移至控制台数据域 |
| 新增 | `tools/ai-coding-console/README.md` | 控制台工具使用说明 |
| 新增 | `tools/ai-coding-console/config/console-config.json` | 控制台专属配置（2 字段） |
| 新增 | `tools/ai-coding-console/cli/console.ps1` | CLI 入口（help/version） |
| 修改 | `README.md:17` | manifest 路径同步 |
| 修改 | `knowledge/traces/ai-coding-desktop-console-technical-route-and-mvp-plan.md` | 全部数据路径同步 |

---

## 二、console.ps1 已实现行为

| 命令 | 行为 |
|---|---|
| `help` | 输出控制台标题、版本、阶段；已实现命令（2 个）+ 后续计划命令（按阶段 B/C/D 分组，标注"not yet implemented"） |
| `version` | 输出版本号 + 阶段标识 |
| 其他 | `Unknown command: xxx` + exit code 1 |

**未实现**：project 子命令、task 子命令、board、Agent dispatch、任何文件读写、任何外部进程调用。

---

## 三、验证结果

| 验证项 | 结果 |
|---|---|
| `tools/ai-coding-console/README.md` 存在 | ✅ |
| `tools/ai-coding-console/config/console-config.json` 存在且为合法 JSON | ✅ dataDir=data/ai-coding-console |
| `tools/ai-coding-console/cli/console.ps1` 存在 | ✅ |
| `data/ai-coding-console/projects-manifest.json` 存在且为合法 JSON | ✅ projects=0 |
| 旧 `data/projects-manifest.json` 不存在 | ✅ False |
| `data/ai-coding-console/tasks/` 不存在 | ✅ False（延迟创建） |
| `data/ai-coding-console/board/` 不存在 | ✅ False |
| `data/ai-coding-console/reports/` 不存在 | ✅ False |
| `console.ps1 help` 可执行 | ✅ 输出已实现/未实现命令 |
| `console.ps1 version` 可执行 | ✅ 输出版本 |
| `console.ps1 xxx` 报错 | ✅ "Unknown command" + exit 1 |
| `git diff --check` | ✅ 通过 |
| 现有 tools/ 未修改 | ✅ 无 diff |
| AGENTS.md 未修改 | ✅ 无 diff |
| `config/global.json` 未修改 | ✅ 无 diff |

---

## 四、commit

```
git commit -m "feat: 控制台阶段 A — 脚手架与数据域"
```

---

## 五、是否具备进入阶段 B 条件

✅ 具备。阶段 A 11 项完成标准全部达成，可以进入阶段 B（项目登记与状态读取）。
