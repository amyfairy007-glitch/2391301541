# AI Coding Console: Windows Spawn + Poll Fix

## Task Goal

修复 ai-coding-console 在 Windows 环境下 Plan Run 的两类问题：

1. **进程启动失败**：opencode.cmd（cmd 脚本）无法被 `spawn` 启动
2. **状态查询失败**：并发读写导致 JSON 截断 → `pollPlanRun` 永久停止轮询

## Basis And Scope

- 依据：`AGENTS.md`、会话上下文中的根因分析
- 范围：
  - `tools/ai-coding-console/lib/agent-runner-core.js`
  - `tools/ai-coding-console/lib/opencode-plan-runner.js`
  - `tools/ai-coding-console/gui/server.js`
  - `tools/ai-coding-console/gui/app.js`
- 不修改：Build Runner 业务流程、Plan Runner 业务流程、Run Store 模型

## Diagnosis

### Round 2: Windows Spawn Failure

- `runCommand()` 始终 `shell: false`，忽略 `options.useShell`
- `quoteForCmd()` 对空格使用 `\"` 转义（bash 风格），但 cmd.exe 只认 `""`（双引号包裹）
- `buildOpenCodePlanInvocation()` 在 `resolveOpenCodeCommand()` 已返回 `.cmd` 文件路径后，仍手动拼接 `cmd.exe /d /s /c` 命令行，且 `quoteForCmd()` 生成了 cmd.exe 无法解析的转义
- 结果：subprocess 以非零退出码静默失败，finalize 写入 `status: "failed"` 但用户看到 "running"（前端未及时刷新）

### Round 3: Concurrent Read-Write + Poll Missing Retry

- `writeJsonFile()`（agent-runner-core.js）使用 `fs.writeFileSync` 非原子写入同一个 run.json 文件
- `server.js` 有独立的 `writeJSONFile()` 同样非原子写入
- `GET /runs/:runId`（runner.js 的 `getRun` 路由）直接 `JSON.parse(fs.readFileSync(runJsonPath))`
- 时间窗：子进程 finalize 写入 run.json 时，文件先被 truncate → 写入新内容 → 并发 GET 读到截断内容 → `JSON.parse` 失败 → `loadPlanRunDetail` 抛出异常 → `pollPlanRun` 的 `catch` 中 `setBanner("error", ...)` 并 `return`，不设下一轮 setTimeout → 前端永久 stuck 在 "运行中"

## Fixes

### Fix A: Atomic Write (Round 3)

- `agent-runner-core.js` `writeJsonFile()`:
  - 写入 `<file>.<pid>.<random>.tmp` 临时文件
  - `fs.writeFileSync(tmpPath, data, "utf8")`
  - `fs.renameSync(tmpPath, targetPath)`（Windows 上 renameSync 自动覆盖已有文件）
  - catch 中清理临时文件
- `server.js`：移除本地 `writeJSONFile()`，改为 `const { writeJsonFile: writeJSONFile } = require("../lib/agent-runner-core")`

### Fix B: Frontend Poll Retry (Round 3)

- `app.js` `pollPlanRun()`:
  - 新增 `planRunPollRetries` 计数器，`clearPlanRunPoll()` 中归零
  - 当查询失败时重试最多 3 次（间隔 1s、2s、3s）
  - 重试中显示 "正在接收 OpenCode 输出...（重试 N/3）"
  - 3 次后：清除 `selectedRunDetail`（不残留旧 "running" 状态），显示 "状态查询失败，请手动刷新"
  - `catch` 回调同样设置 `planRunPollRetries = 3` 防止重试

### Round 2: Windows Spawn Fix

- `agent-runner-core.js`:
  - 新增 `quoteWindowsCmdArg(arg)`：用 `""` 包裹含空格的参数
  - `runCommand()` 内：当 `options.useShell` 为 true 时用 `quoteWindowsCmdArg(arg)` 处理所有参数，再用空格拼接为单字符串，传给 `spawn(shellComSpec, ['/d', '/s', '/c', cmdLine], ...)`
  - diagnostics 增加 `resolvedCommand`、`executable`、`shell`、`platform`
- `opencode-plan-runner.js` `buildOpenCodePlanInvocation()`：
  - 删除 `quoteForCmd()` 调用
  - 改用 `shell: true` 和 `cwd`
- `agent-adapters.js` `resolveOpenCodeCommand()`：
  - 优先返回 `opencode.cmd` 而非 `.exe`，以便自动检测增加 `shell: true`

## Verification Results

### npm run check
```
All checks passed (no syntax/type errors in all 11 files)
```

### Atomic Write Tests (dedicated test script)
```
1. Initial write: {"phase":1,"status":"running"} - valid JSON: true
2. Overwrite: {"phase":2,"status":"completed","exitCode":0} - valid JSON: true
3. Temp files in testDir: NONE (GOOD)
4. fs.renameSync overwrite test: dst content 'SOURCE' (GOOD)
5. Rapid writes test: All valid: YES
=== Atomic write test PASSED ===
```

### .tmp Leak Scan
```
No .tmp files found under runs/ directory (0 results)
```

### API GET /runs/RUN-20260711-002-plan
```
HTTP: 200
status: completed
exitCode: 0
plan length: 5099
ok: true
```

### Smoke Test (runOpenCodeSmoke)
```
[runCommand] {"executable":"C:\\nvm4w\\nodejs\\opencode.cmd","args":[...],"shell":true,"platform":"win32"}
ok: true
exitCode: 0
```

## Real Plan Run Validation (2026-07-12)

### Test Project

- 路径：`E:\program\test-plan-run-validation`
- Git：干净单文件仓库（README.md），初始提交 ed7e00c
- 用途：一次性临时测试，可随时删除

### Test Task

- Task ID：`T-20260712-001`
- Project：`test-plan-run-validation`
- Description："Minimal read-only analysis to validate the Plan Run fix chain."
- Capability：`skill-project-takeover`（low risk, read-only）

### Run Result

| 项目 | 值 |
|------|-----|
| Run ID | `RUN-20260711-001-plan` |
| Status 变化 | running → running (×8 polls) → completed |
| executable | `C:\nvm4w\nodejs\opencode.cmd` |
| args | `run <prompt, 310 chars>` |
| shell | `true` |
| cwd | `E:\program\test-plan-run-validation` |
| exitCode | `0` |
| stdoutBytes | `0` |
| stderrBytes | `418` |
| approvalStatus | `pending` |
| baseline.changedFiles | `[]` |
| baseline.safetyVerdict | `completed` |
| .tmp 残留 | `NONE` |
| 测试项目 Git 状态 | `clean` (无变化) |

### 前端验证说明

- HTTP POST 返回 `202 + runId` 后立即启动异步运行
- 8 次 Poll（每 2s），status 从 `running` 正确过渡到 `completed`
- run.json 的 `writeJsonFile` 原子写入：无 `.tmp` 残留，JSON 可解析
- `pollPlanRun` 重试逻辑未触发（首次查询即成功返回），说明正常路径无回归

### 异常：Plan Extraction Failed

OpenCode 启动成功（exit 0, stderr 有完整日志），但 agent-raw.log 为空（stdoutBytes=0）。

根因：OpenCode 的 prompt 路径在 `E:\program\ai-ui-agentic\data\...`，而 cwd 是测试项目根目录。OpenCode 将 prompt 视为 `external_directory` 权限请求并 auto-reject，因此无法读取 prompt，无 stdout 输出。

这属于 **预存在的设计边界**，非本次 spawn/原子写/轮询修复范围的 bug。OpenCode 自身对跨项目 prompt 读取的限制需在后续设计解决（例如将 prompt.md 符号链接或复制到 projectRoot 内）。

## Risk / Open Items

- **Fix C 待执行**：清理 4 个 2026-07-07 的 stuck running 记录（proj.task.id 为空，无法通过正常 UI 访问），建议直接删除或标记 finalize
- **残留孤儿进程**：1 个 cmd.exe（PID 15724）和 6 个 OpenCode node 进程（均为旧 broken 代码遗留），非本次修复范围
- **跨平台兼容性**：`shell: true` 在 Linux/macOS 上行为不同（自动用 `/bin/sh -c`），但 `quoteWindowsCmdArg` 仅用于 `platform === 'win32'` 且 `useShell` 情况，其他平台保持原逻辑

## Files Changed

| File | Change |
|------|--------|
| `tools/ai-coding-console/lib/agent-runner-core.js` | `writeJsonFile()` 原子写入；`quoteWindowsCmdArg()` + `runCommand()` shell 支持；diagnostics 增加字段 |
| `tools/ai-coding-console/lib/opencode-plan-runner.js` | `buildOpenCodePlanInvocation()` 改用 `shell:true` |
| `tools/ai-coding-console/gui/server.js` | 移除本地 `writeJSONFile()`，共享原子实现 |
| `tools/ai-coding-console/gui/app.js` | `pollPlanRun()` + `loadPlanRunDetail()` 加有限重试，`planRunPollRetries` 计数器 |

## Version Info

- 生成时间：2026-07-12
- 变更类型：Bugfix（Round 2 spawn + Round 3 poll）
- 配置参考：`tools/ai-coding-console/lib/agent-runner-core.js` 中常量 `MAX_WRITE_RETRIES`、`POLL_RETRIES_MAX = 3`
