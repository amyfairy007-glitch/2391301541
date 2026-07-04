# 多 Session 协同工具：实施提示词

你现在要在“个人AI工具库”中实现一个可复用的【多 Session 协同工具】。

────────────────
一、核心使用方式
────────────────

当前由用户手动打开、正在运行的 OpenCode session，默认就是【总控 session】。

不得额外创建总控 session。

只有需要并行处理独立任务时，当前总控才创建 C0、C1 等 task session。

最终使用方式：

```text
当前 OpenCode = 总控
├─ C0：独立任务 session
└─ C1：独立任务 session
```

用户会通过 OpenCode Web 或 OpenCode 原生 session tree 查看 C0、C1 的真实过程、输出、报错和最终结果。

不要实现自定义 board。
不要实现自定义 Web 页面。
不要复制 OpenCode 已有的 session 查看能力。

────────────────
二、固定目录约束
────────────────

当前个人AI工具库顶层目录固定为：

```text
个人AI工具库/
├─ config/
├─ knowledge/
├─ runs/
└─ tools/
```

不得新增、删除、改名顶层目录。

目录职责必须严格区分：

```text
config/
= 全局配置
= 所有工具都可能共享使用的配置
= 例如电脑环境、OpenCode 全局路径、公共默认设置

knowledge/
= SOP、规则、流程、经验、项目分析资料

runs/
= 每次真实任务运行产生的记录、结果、交接

tools/
= 工具代码、脚本、命令、模板、工具自身配置
```

本工具必须放在：

```text
tools/
└─ multi-session-collaboration/
```

本工具自己的配置必须放在：

```text
tools/
└─ multi-session-collaboration/
   └─ config/
```

不得把工具专属配置塞进根目录 `config/`。

例如以下内容属于工具自身配置：

- 默认子任务数量限制
- C0 / C1 命名规则
- 默认子任务启动参数
- task session 创建策略
- 任务模板映射
- runs 记录模板映射
- task session 默认权限策略

运行记录必须写入：

```text
runs/
```

不得把真实任务记录、session 输出、最终结果写入 `tools/`。

不得修改业务项目代码。
不得修改无关工具。
不得提前创建大量暂时没有实际用途的目录或框架。

────────────────
三、Playwright 规则
────────────────

用户已经有自己的 Playwright SOP。

Playwright 不需要在本工具中重新设计新的流程、配置体系或采集规则。

如果某个 task session 涉及 Playwright：

- 自动读取现有 Playwright SOP。
- 严格按现有 SOP 执行。
- 本工具只负责创建和协调该 session。
- 不重新定义字段、截图、接口、校验、采集步骤。
- 不重复建立 Playwright 专属工具体系。

Playwright SOP 所在位置应从 `knowledge/flows/` 或现有知识路径中读取。

────────────────
四、先审计现状
────────────────

实施前先检查当前仓库和本机 OpenCode 的真实能力：

1. 当前 OpenCode 版本和 CLI 能力。
2. 当前 OpenCode 是否支持创建 child session / task session。
3. 是否能获取 task session 的真实 session id。
4. 是否支持 OpenCode Web、session tree、attach、server 或 API。
5. 当前已有 `/spawn` 或类似命令在哪里实现。
6. 当前 C0 创建成功后，为什么总控会被阻塞。
7. S013“桌面可见性验证”来自哪里。
8. 是否能让“创建 task session”和“等待 task session 执行”解耦。
9. 是否支持同一个 task session 从 plan 切换到 build。
10. 当前总控是否可以继续接收命令，而不等待 C0 完成。

先输出简短审计结论，再开始实施。

不得凭空假设 OpenCode API、命令或行为。

────────────────
五、第一版功能范围
────────────────

第一版只实现最小可用能力：

1. 当前 OpenCode 作为总控。
2. 总控可以创建一个协同任务。
3. 一个协同任务可以涉及多个项目目录。
4. 总控可以创建多个 task session。
5. 第一版默认只验证：
   - C0
   - C1
6. C0、C1 可以属于不同项目目录。
7. C0、C1 可以承担不同职责。
8. task session 启动慢、执行慢时，总控必须保持可继续交互。
9. 用户通过 OpenCode Web / 原生 session tree 查看真实子任务过程。
10. 子任务最终结果与交接写入 runs。
11. 不做自定义任务板。
12. 不做自定义 Web 页面。
13. 不做 Git worktree 自动隔离。
14. 不做复杂自动调度。
15. 不重新实现 Playwright SOP。

────────────────
六、总控职责
────────────────

当前 OpenCode 总控只负责：

- 理解当前 Jira 或开发目标。
- 判断涉及哪些项目。
- 判断是否需要调用 Playwright SOP。
- 拆分可并行子任务。
- 创建 C0、C1 等 task session。
- 为每个 task session 分配职责和工作目录。
- 查询已完成 task session 的结果。
- 汇总结论。
- 决定是否继续创建后续开发、验证或分析任务。

总控不得：

- 额外创建总控 session。
- 同步等待 C0、C1 初始化完成。
- 同步等待 C0、C1 执行完成。
- 因子任务启动慢而无法继续接收用户命令。
- 因 S013 或无法验证前台可见性而把创建判定为失败。
- 重复创建已经成功创建的 C0、C1。
- 编造子任务状态、输出或结论。
- 把“session 创建成功”误认为“任务完成”。

────────────────
七、子任务启动信息
────────────────

每个 task session 创建时，必须自动带入：

- 当前 task id。
- 当前 Jira 或开发目标。
- 子任务名称，例如 C0 / C1。
- 子任务职责。
- 当前工作目录。
- 涉及项目。
- 不涉及项目。
- 是否允许改代码。
- 允许修改范围。
- 禁止修改范围。
- 初始 agent 模式：plan 或 build。
- 当前运行记录目录。
- 完成后的交接要求。
- 是否需要读取某个现有 SOP。

例如：

```text
task id：JIRA-123
session：C0
workdir：<项目A路径>
agent：plan
允许修改：否
职责：分析美国市场某功能影响范围
输出：涉及文件、风险、建议下一步
记录位置：runs/JIRA-123/sessions/C0.md
```

如涉及 Playwright：

```text
task id：JIRA-123
session：C1
workdir：<Playwright任务目录>
agent：plan 或受限 build
允许修改：仅限 Playwright 脚本范围
职责：按现有 Playwright SOP 执行采集或验证
SOP：<现有 Playwright SOP 路径>
记录位置：runs/JIRA-123/sessions/C1.md
```

────────────────
八、plan 与 build 规则
────────────────

默认规则：

- 分析类任务默认使用 plan。
- Playwright 任务默认使用 plan 或受限 build。
- 开发类任务默认从 plan 开始。
- 同一个 task session 可以从 plan 切换到 build。
- 禁止自动静默切换。
- 只有总控明确批准、且修改范围已确认后才允许切 build。

切换 build 前必须记录：

- 为什么要切换。
- 哪些项目允许修改。
- 哪些目录或文件允许修改。
- 当前已有分析结论。

────────────────
九、异步与性能要求
────────────────

当前最大问题是创建 OpenCode 子任务很慢，并且会阻塞总控。

必须做到：

1. 创建 C0 后，总控立即恢复可交互状态。
2. 创建 C1 后，总控立即恢复可交互状态。
3. 总控不等待：
   - 子 session 初始化完成。
   - 模型开始回复。
   - 子任务执行完成。
   - 前台窗口验证。
   - 最终结果。
4. S013 只能记录为：
   “无法自动验证前台可见性”
   不能作为创建失败原因。
5. C0 创建后，总控必须仍能继续创建 C1。
6. 创建 C1 时不得重建 C0。
7. 已创建成功的 session 必须保存并复用 session id。
8. 优先复用 OpenCode 当前已有 server/session 能力。
9. 不为每个子任务重复启动不必要的完整 OpenCode 进程。
10. 第一版默认最多创建 2 个 task session。
11. 单个任务失败时，只记录并允许重试该任务，不影响其他 task session。
12. 无法可靠判断状态时，必须标记 unknown，不允许伪造 running 或 done。

────────────────
十、查看子任务过程
────────────────

用户通过 OpenCode Web / 原生 session tree 查看：

- 当前总控。
- C0。
- C1。
- 子任务实时输出。
- 工具调用。
- 报错。
- 是否等待授权。
- 最终结果。

本工具只需要：

- 保存 task id 与真实 OpenCode session id 的对应关系。
- 保存 task session 的职责、工作目录、模式、结果和交接。
- 提供进入真实 session 的必要说明或引用。
- 不要重复造聊天窗口、状态面板或伪实时 UI。

────────────────
十一、运行记录
────────────────

每个协同任务在 runs 下建立独立目录。

建议结构：

```text
runs/
└─ <task-id>/
   ├─ task.md
   ├─ task.json
   └─ sessions/
      ├─ C0.md
      ├─ C0.json
      ├─ C1.md
      └─ C1.json
```

不要机械照抄；可根据现有仓库风格调整。

但必须确保任务、session id、职责、结果、交接能长期回看。

每个 task session 至少记录：

- session 名称。
- OpenCode session id。
- 工作目录。
- agent 模式。
- 职责。
- 是否引用 SOP。
- 允许修改范围。
- 创建时间。
- 当前状态。
- 最近更新时间。
- 当前结论或最近输出摘要。
- 错误信息。
- 最终结果。
- 交接内容。

────────────────
十二、命令能力
────────────────

不强制具体命令名字，但第一版需要提供等价能力：

1. 创建协同任务。
2. 在当前总控中创建指定 task session。
3. 查看当前任务已有的 task session 与 session id。
4. 读取某个 task session 的最终交接结果。
5. 重试单个失败 task session。
6. 汇总已完成 task session 的结果。

例如：

```text
session-task create <task-id>
session-task spawn <task-id> C0
session-task spawn <task-id> C1
session-task inspect <task-id> C0
session-task retry <task-id> C1
session-task summarize <task-id>
```

命令名字可以调整，但必须简单、稳定、可重复使用。

────────────────
十三、验收场景
────────────────

真实验证以下场景：

任务：TEST-MULTI-001

当前打开的 OpenCode 就是总控。

总控创建：

C0：
- 工作目录：测试项目A
- agent：plan
- 职责：分析指定功能影响范围
- 不允许修改代码

C1：
- 工作目录：测试 Playwright 目录
- agent：plan 或受限 build
- 职责：读取现有 Playwright SOP，并执行或准备采集任务
- 不允许修改业务项目代码

验收标准：

1. 当前 OpenCode 被识别为总控，不额外创建总控。
2. 总控创建 C0 后，立即可以继续接收用户命令。
3. 总控可继续创建 C1。
4. C0 启动慢时，不阻塞 C1 创建。
5. C0、C1 都保存对应真实 OpenCode session id。
6. 用户可通过 OpenCode Web 或原生 session tree 查看 C0、C1 的真实执行过程。
7. 不依赖桌面前台可见性验证。
8. C0、C1 的结果与交接写入 `runs/TEST-MULTI-001/`。
9. C1 直接读取并执行现有 Playwright SOP，不重新生成 Playwright 流程。
10. 失败任务只重试自身。
11. 总控能读取 C0、C1 的结果并做汇总。
12. 不创建自定义 board 或复杂前端。

────────────────
十四、完成后输出
────────────────

完成后必须输出：

1. 审计结论。
2. 实施方案。
3. 新增和修改的文件列表。
4. 每个文件的用途。
5. 工具专属配置与全局配置的边界说明。
6. 实际使用方法。
7. 验收结果。
8. 当前已知限制。
9. 后续可扩展项。

不要提前实现后续扩展项。
不要为了看起来完整而增加不必要目录、依赖或复杂架构。
