# AI Coding Console C.6-B-1 Task Capability Binding Backend Result

## Scope

- Implemented the task-scoped capability binding backend for C.6-B preparation.
- No GUI layout, style, tab structure, prompt builder, agent logic, or capability browsing UI was changed.
- Session A UI work remained untouched.

## Modified Files

- `tools/ai-coding-console/gui/server.js`
- `tools/ai-coding-console/lib/task-capability-binding.js`
- `tools/ai-coding-console/README.md`
- `knowledge/traces/ai-coding-console-c6b-binding-backend-result.md`

## Data Shape

- Binding file path: `data/ai-coding-console/tasks/<task-id>/capabilities.json`
- Binding format:
  - `taskId`
  - `updatedAt`
  - `capabilityIds`
- Binding data is task-scoped only and does not write back to the global capability registry.

## API Surface

- `GET /api/capabilities`
- `GET /api/capabilities/:id`
- `GET /api/tasks/:projectId/:taskId/capabilities`
- `POST /api/tasks/:projectId/:taskId/capabilities`

## Validation Rules

- `capabilityIds` are deduplicated on write.
- Every capability ID must exist in `data/ai-coding-console/capability-registry.json`.
- Request bodies must be JSON objects with an array `capabilityIds`.
- Invalid capability IDs return `invalid_capability_ids` with `invalidIds`.
- Missing bindings return an empty binding instead of an error.
- Missing tasks return a structured 404.
- Directory traversal is blocked by task/project id validation.

## Actual Verification

- `node --check tools/ai-coding-console/lib/task-capability-binding.js`: passed.
- `node --check tools/ai-coding-console/gui/server.js`: passed.
- `GET /api/capabilities`: returned the full registry.
- `GET /api/tasks/ai-ui-agentic/T-20260705-001/capabilities`: returned an empty binding for an existing task with no binding file.
- `GET /api/tasks/ai-ui-agentic/../bad/capabilities`: returned a structured 404 task error.
- `POST` with invalid capability IDs returned `invalid_capability_ids`.
- `POST` with invalid JSON returned `invalid_request_body`.

## Write Verification

- No persistent Task data was modified during verification.
- The existing task `T-20260705-001` was used only for read-only binding checks.
- Save / refresh / unbind persistence was not exercised because the task-data directory is protected from implementation-side side effects in this turn.

## Parallel Boundary

- Session A remained responsible for Web UI visual alignment and was not touched.
- This task stayed within backend binding APIs and helper logic only.

## Unimplemented Scope

- Capability browsing UI.
- Task binding UI.
- Prompt Builder.
- Task SOP generation.
- Agent execution.

## Conclusion

- The backend and data-layer shape for task capability binding are ready for the next UI phase.
- This is sufficient for starting C.6-B UI wiring, but not for claiming the full binding user experience is complete.

## Commit Hash

- Pending final commit for this backend slice.

