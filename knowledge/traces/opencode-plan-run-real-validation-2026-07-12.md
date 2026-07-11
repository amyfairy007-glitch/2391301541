# OpenCode Plan Run Real Validation

## Task Goal

- Validate whether the existing AI Coding Console Plan Run chain can complete one real read-only OpenCode run in the local machine environment.

## Basis And Scope

- Basis:
  - `AGENTS.md`
  - `.ai/AI_CONTEXT.md`
  - `tools/ai-coding-console/README.md`
  - `.ai/current-state.md`
  - `.ai/decisions.md`
  - `package.json`
  - `tools/ai-coding-console/lib/opencode-plan-runner.js`
  - `tools/ai-coding-console/lib/agent-runner-core.js`
  - `tools/ai-coding-console/lib/agent-adapters.js`
  - `tools/ai-coding-console/lib/run-store.js`
  - `tools/ai-coding-console/gui/server.js` plan-run route segment
- Scope:
  - Real-environment readiness check only
  - No architecture refactor
  - No business-code modification
  - No Plan Run on `ai-ui-agentic` itself

## Precheck Result

- `git status --short` confirms the main repository worktree is dirty, so it is not a valid read-only validation target.
- `npm run check` passed.
- OpenCode command resolution in the actual Node runtime succeeded:
  - `process.execPath` = `C:\nvm4w\nodejs\node.exe`
  - resolved executable = `C:\nvm4w\nodejs\node_modules\opencode-ai\bin\opencode.exe`
- Direct PowerShell `opencode --version` did not validate the real runner path because PowerShell attempted to load `opencode.ps1` and was blocked by execution policy. This is separate from the runner's `.exe` resolution path.
- The registered project manifest currently contains only one project:
  - `ai-ui-agentic`
- The available formal task currently visible in the repository data is:
  - `T-20260705-002`
- That task has the required local artifacts:
  - `task.json`
  - `capabilities.json`
  - `sop.json`
  - `final-prompt.md`

## Blocking Findings

- No dedicated clean test project is currently registered in `data/ai-coding-console/projects-manifest.json`.
- The only registered project is `ai-ui-agentic`, but the task requirement explicitly forbids running the real Plan Run on this repository.
- The current project memory already states the required validation target should be a clean, separate test project, not this repository.
- Therefore the real end-to-end Plan Run was not executed in this task.

## Actual Call Chain Reviewed

- GUI/API entry:
  - `POST /api/tasks/:projectId/:taskId/runs/plan` in `tools/ai-coding-console/gui/server.js`
- Run-id and artifact paths:
  - `generateRunId(...)`
  - `getRunJsonPath(...)`
  - `getRunPromptPath(...)`
  - `getRunPlanPath(...)`
  - `getRunBaselinePath(...)`
  - from `tools/ai-coding-console/lib/run-store.js`
- Plan preparation:
  - `prepareOpenCodePlanStart(...)` in `tools/ai-coding-console/lib/opencode-plan-runner.js`
- Command resolution:
  - `resolveOpenCodeCommand()` in `tools/ai-coding-console/lib/agent-adapters.js`
- Process execution and Git snapshot logic:
  - `runCommand(...)`
  - `runGit(...)`
  - `buildGitSnapshot(...)`
  - from `tools/ai-coding-console/lib/agent-runner-core.js`
- Async execution:
  - `runOpenCodePlan(...)` in `tools/ai-coding-console/lib/opencode-plan-runner.js`

## Execution Checklist For The Next Real Validation

- Test Project:
  - must be a separate project, not `ai-ui-agentic`
  - must have a clean Git worktree before the run
- Test Task:
  - must belong to that separate project
  - must contain `task.json`, `capabilities.json`, `sop.json`, and `final-prompt.md`
- GUI startup:
  - `npm run gui`
- Trigger path:
  - GUI action or `POST /api/tasks/:projectId/:taskId/runs/plan`
- Observe:
  - API response payload
  - generated run directory under `data/ai-coding-console/tasks/<task-id>/runs/<run-id>/`
  - `run.json`
  - `prompt.md`
  - `plan.md`
  - `baseline.json`
  - `agent-raw.log`
  - `stderr.log`
- Read-only confirmation:
  - `baseline.json.changedFiles` must be empty
  - target project `git status --short` must remain empty after the run

## Validation Outcome

- Passed: no
- Failure classification: `invalid_task_state`
- Root cause:
  - the repository does not currently expose a dedicated clean test project and task for real Plan Run validation
  - the only registered project is the main repository, which this task explicitly forbids using as the Plan Run target

## Recommended Minimal Next Step

- Register one separate clean local test project in the console manifest.
- Create one dedicated test task for that project with:
  - `task.json`
  - `capabilities.json`
  - `sop.json`
  - `final-prompt.md`
- Then rerun the real Plan Run validation through the existing `POST /api/tasks/:projectId/:taskId/runs/plan` chain without changing architecture or business code.

## Version Info

- Generated: 2026-07-12
- Change Type: validation result record
