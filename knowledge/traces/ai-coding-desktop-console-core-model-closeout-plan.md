# 多项目 AI Coding 桌面控制台 — 核心模型设计收口计划

> 生成日期：2026-07-04
> 阶段：只读分析 + 收口计划
> 前置设计：`knowledge/traces/ai-coding-desktop-console-core-model-design.md`
> 后续阶段：技术路线与 MVP 实施方案（已完成：`ai-coding-desktop-console-technical-route-and-mvp-plan.md`）

---

## 一、发现的设计冲突

| # | 冲突 | 设计文件位置 |
|---|---|---|
| 1 | **目录归属自相矛盾**：前文说"不预设目录名"，后文写了 `tools/ai-coding-console/` 完整结构 | `:371-378 vs :379-380` |
| 2 | **data/projects-manifest.json 职责过载**：要承担项目索引 + 任务历史 + 状态更新（巨型单 JSON 风险） | `:316, :325` |
| 3 | **审批顺序错误**：plan_requested → 审批 → 执行。正确应为：**先执行产生产物 → 再审批** | `:185-237` |
| 4 | **Task/Run/Approval 状态混在一张图**：三种不同生命周期混用同一个状态图 | `:185-237` |
| 5 | **AGENTS.md Scope 冲突**："No agents" vs 控制台计划接入 Agent | `AGENTS.md:57-61` |
| 6 | **第一版入口未决策**：标题"桌面控制台"但建议 CLI 先验证 | `section 3 vs :409` |

---

## 二、收口结论（均已被技术路线方案采纳）

| 冲突 | 处理方式 | 落实情况 |
|---|---|---|
| 目录归属 | 当前阶段确定 `tools/ai-coding-console/`，仅 MVP 必需目录 | 技术路线方案第二节 |
| manifest 职责过载 | 仅承担索引 + 摘要，Task/Run/Approval/Artifact 独立存储 | 技术路线方案第四节 |
| 审批顺序 | 修正为：plan 先执行 → 产物先产生 → 人工审批 | 技术路线方案第五节 |
| 状态混用 | Task/Run/Approval 三种状态机分离定义 | 技术路线方案第五节 |
| Scope 冲突 | 阶段冻结边界，阶段 D 完后修订 | 技术路线方案第七节 |
| 入口路线 | 路线 A（CLI 先行） | 技术路线方案第三节 |

---

## 三、已确认的 6 项决策

| # | 决策 | 结论 |
|---|---|---|
| D1 | 入口路线：A（CLI 先行） | ✅ A |
| D2 | 控制台目录名在技术路线阶段确定 | ✅ `tools/ai-coding-console/` |
| D3 | manifest.json 只承担索引，Task/Run 独立存储 | ✅ 是 |
| D4 | 审批时序：先执行、后审批 | ✅ 是 |
| D5 | Scope 解读为阶段冻结边界 | ✅ 是 |
| D6 | verify（Agent 检查）与 review（人工判断）分离 | ✅ 是 |

---

## 四、收口完成状态

✅ 6 处冲突已全部处理。技术路线与 MVP 实施方案已基于收口结论生成。
