# AI Coding Console C.6-B-1 Task Capability Binding Backend Result

> 生成日期：2026-07-05
> 范围：只做 Task Capability Binding 后端与 API，未进入 C.6-B-2 UI 接入，不做 Prompt Builder，不做 SOP 生成，不做 Agent 执行。

## 一、修改文件

- `tools/ai-coding-console/lib/task-capability-binding.js`
- `tools/ai-coding-console/README.md`
- `knowledge/traces/ai-coding-console-c6b-binding-backend-result.md`

## 二、数据路径与结构

- 绑定文件路径：`data/ai-coding-console/tasks/<task-id>/capabilities.json`
- 绑定内容结构：
  - `taskId`
  - `updatedAt`
  - `capabilityIds`

## 三、API 行为

- `GET /api/capabilities`
- `GET /api/capabilities/:id`
- `GET /api/tasks/:projectId/:taskId/capabilities`
- `POST /api/tasks/:projectId/:taskId/capabilities`

### GET 行为

- `GET /api/capabilities` 返回完整 Registry。
- `GET /api/tasks/:projectId/:taskId/capabilities`
  - Task 存在且未绑定时返回空绑定，不预创建 `capabilities.json`
  - Task 不存在时返回结构化 `404`
  - 绑定文件含失效 ID 时返回结构化错误，不静默忽略

### POST 行为

- 请求体必须是 JSON 对象，且 `capabilityIds` 必须是数组。
- `capabilityIds` 自动去重。
- 每个 ID 都必须存在于 `data/ai-coding-console/capability-registry.json`。
- 非法 ID 返回：

```json
{
  "error": "invalid_capability_ids",
  "invalidIds": ["unknown-id"]
}
```

- 空数组表示解绑全部能力。
- 绑定只写当前 Task 对应目录，不修改全局 Registry，也不修改 `task.json`。

## 四、校验规则

- 复用 `tools/ai-coding-console/lib/capability-registry.js`
- `projectId` 和 `taskId` 都做安全校验，防止 `../` 路径穿越
- `saveTaskCapabilityBinding()` 先校验请求体和 capabilityId 合法性，再写入 Task 绑定文件
- 不会自动创建 Task 目录
- 不会把 Capability 元数据从客户端写回绑定文件

## 五、实际验证范围

- `GET /api/capabilities` 返回正常
- `GET /api/tasks/ai-ui-agentic/T-NO-SUCH/capabilities` 返回结构化 `404`
- `POST` 非法 body 返回 `invalid_request_body`
- `POST` 非法 capabilityId 返回 `invalid_capability_ids`
- `node --check tools/ai-coding-console/lib/task-capability-binding.js` 通过
- `git diff --check` 通过
- `npm run gui` 可启动本地 GUI 服务

## 六、是否修改真实 Task 数据

- 未修改任何真实 Task 数据
- 本轮没有可安全复用的真实 Task，因此没有做持久化写入 / 解绑写入验证
- 没有为了测试新建假的 Task / Run / Artifact

## 七、未实现范围

- C.6-B-2 UI 接入
- Prompt Builder
- Task SOP 生成
- Agent 执行
- 产物写入
- 审批逻辑

## 八、与 UI 的边界

- 本轮只提供后续 UI 可调用的数据能力
- 不修改任何 GUI 页面文件
- 不修改布局、Tab、按钮文案或前端交互

## 九、结果结论

- Task Capability Binding 的后端存取路径与 API 行为已经具备
- 绑定文件是 task-scoped 的，可以独立保存与读取
- 非法 capabilityId 的错误码和结构已明确
- 当前可进入 C.6-B-2 的 UI 接入阶段

## 十、commit hash

- `3094ee5`
