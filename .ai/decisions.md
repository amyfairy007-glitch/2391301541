# Decisions

## Decision Log

- Date: 2026-07-12
  - Decision: Do not execute the real OpenCode Plan Run on `ai-ui-agentic` itself; require a separate clean test project and a dedicated test task before the first true end-to-end validation.
  - Why: The current task explicitly forbids using the main repository as the Plan Run target, and the current manifest exposes no alternate registered project.
  - Impact: The current validation stops at environment and call-chain confirmation. The next concrete step is data/setup, not code refactor.

- Date: 2026-07-12
  - Decision: Keep one repository-wide Chinese output rule in root `AGENTS.md`, and only add a short reminder in `.ai/AI_CONTEXT.md` instead of copying the rule into multiple agent entry files.
  - Why: The repository needs consistent language behavior across Codex, OpenCode, and Claude Code without creating duplicate rule sources or translating code-facing identifiers.
  - Impact: Future agent replies and generated project artifacts should default to Chinese, while code, commands, paths, config keys, API names, and other required English terms remain unchanged.

- Date: 2026-07-12
  - Decision: Keep the root `AGENTS.md` handoff rule minimal and strict: no default bulk reads of `.ai/handoffs/`; only keyword-based reads when the task needs historical design, migration, unfinished work, implementation rationale, or conflict tracing.
  - Why: New sessions were pulling in unnecessary historical context and risked treating recent handoffs as current requirements.
  - Impact: The entry rule is now stronger without duplicating `.ai/AI_CONTEXT.md`, and agents must treat handoffs as historical evidence that yields to `.ai/current-state.md` and `.ai/decisions.md` when conflicts appear.

- Date: 2026-07-11
  - Decision: Standardize `.ai/AI_CONTEXT.md` as the single shared project context entry for Codex, Claude Code, OpenCode, and similar agents. Agent-specific entry files should only redirect to it and must not duplicate project knowledge.
  - Why: The repository now needs one authoritative AI context source so different agents can enter through their own lightweight adapters while still reading the same project facts, boundaries, and navigation guidance.
  - Impact: `AGENTS.md` now instructs agents to read `.ai/AI_CONTEXT.md` first, `CLAUDE.md` is a lightweight redirect entry, and OpenCode currently relies on the already documented `AGENTS.md` path until a stronger project-local auto-load mechanism is explicitly confirmed.

- Date: 2026-07-10
  - Decision: Implement Web `+ 新建项目` as a non-interactive registration flow backed by `POST /api/projects/check` and `POST /api/projects/create`.
  - Why: The existing CLI project add flow can block on `Read-Host` when `.ai/` is missing, so Web needs explicit request fields and non-interactive persistence to keep the UI reliable.
  - Impact: Web project creation now writes directly to `data/ai-coding-console/projects-manifest.json`, can optionally initialize `.ai/`, and should later be extracted into shared `lib/project-registry.js` if CLI/Web logic is unified.

- Date: 2026-07-09
  - Decision: Define Web `+ 新建项目` V1 as registering an existing local project directory, not creating a new source project from scratch.
  - Why: The current CLI and data model already use `project add --path` and `projects-manifest.json`; aligning Web with that model avoids a second storage path and keeps CLI/Web compatible.
  - Impact: Implementation should add non-interactive Web APIs for project check/create and write to `data/ai-coding-console/projects-manifest.json`; true directory creation can be a later V2.

- Date: 2026-07-09
  - Decision: Temporarily simplify the Web UI action surface so only `+ 新建项目` and `+ 新建任务` remain visible as primary operation entries.
  - Why: The user wants the web port's operation area hidden for now, reducing visible workflow/action clutter while keeping the two creation paths available.
  - Impact: Prompt/SOP, Agent, Artifact, approval, filtering, project detail, rail collapse, and more-menu entry points are hidden at the rendering layer rather than deleted; future work can restore or redesign them deliberately.

- Date: 2026-07-09
  - Decision: Keep transient GUI runtime logs out of the repository root and store the current root `gui-*.log` files under `data/ai-coding-console/logs/`. Delete the mistakenly generated empty `programai-ui-agentic/` root directory.
  - Why: The documented repository boundaries prohibit generated runtime logs in the root, while `data/` is the correct durable location for execution and runtime records. The `programai-ui-agentic/` directory was an empty path-concatenation artifact and not part of the architecture.
  - Impact: Future GUI logging should target `data/ai-coding-console/logs/` or a run-scoped data directory, and new top-level directories should only be introduced as intentional architecture changes.

- Date: 2026-07-05
  - Decision: Standardize the next Web UI as a three-column task workbench with persistent project context on the left and the current Task as the right-side primary working object.
  - Why: The current page structure makes project, task, board, and status feel fragmented; the new layout keeps the workflow visible and reduces navigation churn.
  - Impact: Future UI work should center on left project selection, middle task selection, and right task workspace tabs instead of page-based project/task/board views.

- Date: 2026-07-05
  - Decision: Keep Git, AGENTS.md, `.ai`, capability browsing, SOP reference, prompt sources, and artifact filters in drawers or collapsible regions rather than the default homepage surface.
  - Why: These elements are useful context but should not crowd out the working surface or turn the console into a management dashboard.
  - Impact: The implementation should preserve a lightweight main canvas and push secondary information into drawers and folded panels.

- Date: 2026-07-05
  - Decision: Bind capabilities at the Task level through an inline browser in the Prompt 与 SOP tab, using the registry as a read-only source and task-scoped `capabilities.json` as the only write target.
  - Why: This keeps selection, filtering, and persistence close to the Task that will consume the abilities, while avoiding any write-back into the global registry.
  - Impact: Future C.6-C work can consume task capability bindings directly without redefining the selection surface or changing registry semantics.

- Date: 2026-07-05
  - Decision: Generate Task SOP and final Prompt from local templates plus rule-based composition, and keep user additions inside a fixed `## 用户补充说明` block in `prompt-draft.md`.
  - Why: The C.6-C stage must stay deterministic, offline, and non-executing while still producing durable artifacts that can be reviewed and resumed.
  - Impact: The backend can regenerate SOP and prompt drafts without calling a model, and the final prompt can be rebuilt from the saved SOP, draft, and supplement without inventing new runtime state.

- Date: 2026-07-08
  - Decision: Implement full Stage D (Plan → Approve → Build → Review → Close) rather than stopping at D-1. Build Run is allowed to modify real project files.
  - Why: The Plan-only loop is not a usable delivery on its own; the team decided the console should carry a task through real implementation and human closeout.
  - Impact: A Build Run now writes to the project worktree. All downstream safety depends on the gate + Git baseline described below, not on any read-only guarantee.

- Date: 2026-07-08
  - Decision: Gate Build behind a hard precondition (`task.status === "plan_approved"`) checked server-side in `loadBuildContext`, and rely on three layers for Build safety: L1 prompt scope, L2 status gate, L3 post-run Git diff captured to `build-diff.txt`. Never auto-commit, never auto-revert.
  - Why: OpenCode's `run` command has no `--readonly`/`--deny-edit` flag, so writes cannot be technically blocked once Build starts. The gate ensures a human approved the plan first, and the Git baseline makes every change auditable and reversible by a human.
  - Impact: A dirty worktree after Build is normal (not "unsafe"), unlike Plan. Build success is driven by exit code + human review, and any unexpected change is left for manual handling.

- Date: 2026-07-08
  - Decision: Introduce an Agent adapter layer (`agent-adapters.js`) and a shared runner core (`agent-runner-core.js`); runners resolve a CLI by `agentType` instead of hardcoding `opencode.cmd`. Codex and Claude are reserved adapters that always report unavailable.
  - Why: Keep the Plan/Build runners and server routes free of OpenCode-specific branching so a second Agent can be added without rewriting the run pipeline, and avoid duplicating the process/Git/JSONL logic across plan and build runners.
  - Impact: `opencode-plan-runner.js` keeps its public exports but now delegates to the core and adapter; adding an Agent means implementing one adapter, not touching the runners or server routes.
