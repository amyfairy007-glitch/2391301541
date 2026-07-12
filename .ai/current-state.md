# Current State

## What We Are Working On

- C.6-B-2 Task Capability 浏览、选择与绑定 UI 已落地到 AI Coding Console Web.
- The workbench now exposes real capability browsing, filtering, multi-select binding, and refresh-backed task-scoped persistence.
- A formal working Task was created for the C.6 workflow: `T-20260705-002`.

## Last Updated

- 2026-07-11

## Next Step (archived — superseded by the Stage D section below)

- Continue with C.6-C only when Prompt Builder and SOP generation are intentionally started.
- Keep the capability binding UI as the current completion point for C.6-B-2.

## C.6-C Status Update

- Task `T-20260705-002` now has formal Task-scoped generation artifacts: `sop.json`, `prompt-draft.md`, and `final-prompt.md`.
- The C.6-C generation path uses local templates plus rule-based composition only; it does not call an AI model or execute an Agent.
- The prompt draft stores user additions in the fixed `## 用户补充说明` block, and the final prompt composes the saved SOP, draft, and supplement into the persisted `final-prompt.md`.
- The next forward step is Stage D only, after the team chooses to wire a real Agent executor.

## Stage D Status Update (2026-07-08)

- Stage D is now code-complete end to end: Plan Run (D-1, read-only) → Approve Plan → Build Run (D-2, allowed to write project files) → Review → Close.
- New lib modules: `agent-runner-core.js` (shared process/Git/JSONL core extracted from the plan runner), `agent-adapters.js` (OpenCode adapter + reserved Codex/Claude placeholders), `opencode-build-runner.js` (Build Run with the plan_approved gate).
- `run-store.js` now accepts `-build` run ids and surfaces `changedFiles` in run summaries. `server.js` exposes `POST /api/tasks/:projectId/:taskId/runs/build` (202 + async, plan_approved gate).
- Build safety: L1 prompt authorizes writes but binds them to the SOP/final-prompt scope; L2 hard gate rejects build unless `task.status === "plan_approved"`; L3 Git baseline records the expected diff into `build-diff.txt`. The runner never auto-commits and never auto-reverts.
- GUI: Prompt tab shows a Build launcher after plan approval; Approvals tab now drives the real approve/reject → review/reject → close closeout; Agent tab lists plan and build runs together.
- NOT YET VALIDATED: real OpenCode `opencode.cmd` execution for Plan/Build. The Codex sandbox cannot represent the user's real permission context. Manual validation from a real terminal (`npm run gui`) is required — see `knowledge/traces/ai-coding-console-stage-d-full-result.md`.
- Self-test passed in sandbox: `node --check` on all changed files, module load + exports, adapter availability (opencode true / codex false), build/plan run-id validation, and the build gate correctly rejecting a non-approved task with `build_gate_not_open`.

## Root Directory Cleanup (2026-07-09)

- Root-level GUI logs were moved to `data/ai-coding-console/logs/`: `gui-c6b.log`, `gui-start.log`, `gui-out.log`, and `gui-err.log`.
- The mistakenly generated empty root directory `programai-ui-agentic/` was deleted after confirming it contained no files.
- Formal cleanup record: `knowledge/traces/root-directory-cleanup-2026-07-09.md`.

## Web Operation Area Simplification (2026-07-09)

- The Web UI operation surface was simplified in `tools/ai-coding-console/gui/app.js` so only `+ 新建项目` and `+ 新建任务` remain visible as primary action entries.
- Hidden visible operation areas include disabled app rail entries, Task status filter, project detail inline action, rail collapse buttons, context `更多操作`, workspace primary action buttons, and the tab strip for Prompt/SOP, Agent, Artifact, and Approval panels.
- Formal result record: `knowledge/traces/web-operation-area-minimal-actions-2026-07-09.md`.
- `npm run check` passed after the change.

## Web 新建项目设计文档 (2026-07-09)

- Created the full front-end/back-end design for Web `+ 新建项目` at `docs/new-project-web-design-2026-07-09.md`.
- V1 scope is defined as registering an existing local project directory from Web, not creating a new source directory from scratch.
- The design covers UI flow, proposed `POST /api/projects/check` and `POST /api/projects/create`, manifest persistence, validation, safety boundaries, error handling, implementation steps, and verification.

## Web 新建项目实现 (2026-07-10)

- Implemented Web `+ 新建项目` in `tools/ai-coding-console/gui/app.js` and `tools/ai-coding-console/gui/server.js`.
- Added non-interactive `POST /api/projects/check` and `POST /api/projects/create` flows for registering existing local project directories.
- The Web modal now supports path input, optional display name, optional `.ai/` initialization, project detection, create submission, project list refresh, and auto-selecting the new project.
- Formal implementation record: `knowledge/traces/web-new-project-implementation-2026-07-10.md`.
- `npm run check` passed, and interface-level tests passed for check/create/missing-path/duplicate-path scenarios.

## Next Step

- Verify how OpenCode actually auto-loads project-level instructions beyond the already documented `AGENTS.md` path, if a stronger project-local mechanism is needed later.
- Keep `.ai/AI_CONTEXT.md` as the single shared AI context entry and avoid copying the same project knowledge into agent-specific files.
- Run `npm run gui` and manually validate the `+ 新建项目` button in the browser with an independent test project directory.
- After UI validation, verify `+ 新建任务` under the newly registered project creates the expected Task data.
- User to run the manual end-to-end validation on a clean, separate test project (not this repo) and report whether Plan/Build reach `completed` and whether Build truly modifies files.

## Unified AI Context Entry (2026-07-11)

- Added `.ai/AI_CONTEXT.md` as the shared project context entry intended for Codex, Claude Code, OpenCode, and similar agents.
- Updated root `AGENTS.md` so agents read `.ai/AI_CONTEXT.md` first, then load `skills/`, `sops/`, `guides/`, `knowledge/`, and `tools/` only on demand and only when those directories actually exist.
- Added root `CLAUDE.md` as a lightweight Claude Code entry file that points to `.ai/AI_CONTEXT.md` without duplicating project knowledge.
- Confirmed `.claude/launch.json` and `.claude/settings.local.json` are local Claude-side files, not the shared project knowledge entry.
- Did not add a guessed OpenCode-specific file. Current confirmed project-level shared entry remains `AGENTS.md`; any stronger OpenCode auto-load mechanism still needs confirmation.

## Handoff Loading Rule Tightening (2026-07-12)

- Root `AGENTS.md` now explicitly forbids default bulk reads of `.ai/handoffs/`.
- Handoffs must now be read only by task-relevant keyword when the work needs historical design background, migration context, unfinished work, implementation rationale, or conflict tracing.
- The root rule now explicitly says handoffs are historical evidence, not current requirements, and any conflict with `.ai/current-state.md` or `.ai/decisions.md` must be reported first.
- No code or handoff files were changed for this rule tightening.

## Chinese Output Governance (2026-07-12)

- Root `AGENTS.md` now defines one shared Chinese-first output rule for Codex, OpenCode, Claude Code, and similar agents.
- The default output language is Chinese for replies and for generated documents, plans, reports, SOPs, guides, handoffs, code review results, and validation results.
- Code, commands, paths, filenames, config fields, identifiers, API names, product names, protocol names, and required English terms remain in their original form.
- `.ai/AI_CONTEXT.md` now contains only a short language note, and `CLAUDE.md` remains a lightweight redirect entry without duplicating the full rule set.

## OpenCode Plan Run Real Validation (2026-07-12)

- Reviewed the real Plan Run chain without modifying code.
- Confirmed `npm run check` passes and the runtime can resolve OpenCode to `C:\nvm4w\nodejs\node_modules\opencode-ai\bin\opencode.exe`.
- Confirmed the currently registered project manifest contains only `ai-ui-agentic`, so there is no separate clean test project available for the required real validation.
- Confirmed the existing task `T-20260705-002` has local artifacts, but it belongs to `ai-ui-agentic` and therefore is not a valid validation target for this task.
- The next minimal step is to register a clean separate test project and create a dedicated test task before attempting the real Plan Run.

## Plan Run Detail: Execution Summary + ANSI Cleanup (2026-07-12)

- Added `stripAnsi()` to remove ANSI control sequences from displayed logs (SGR codes, OSC sequences, cursor controls).
- Added `buildRunSummary()` that scans cleaned stdout+stderr for permission rejection, error, and failure events, and produces a structured summary with severity, label, reasons, impact, and suggestion.
- Restructured `renderRunDetailView()`: execution summary card at top (with color-coded severity), metadata/safety grid below, and all raw items collapsible under "技术详情".
- `renderCollapsibleSection()` now applies `stripAnsi()` so displayed logs are readable.
- Detection confirmed: permission-requested + auto-rejecting case correctly produces "已完成，但存在警告" with the specific permission path in the reason message.
- `npm run check` passed.
