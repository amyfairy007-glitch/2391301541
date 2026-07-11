# Handoff

## Task

- Unify the AI context entry for this repository so Codex, Claude Code, and OpenCode can converge on the same shared context file: `.ai/AI_CONTEXT.md`.

## What Changed

- Refined `.ai/AI_CONTEXT.md` into a shared AI context entry focused on repository定位、阅读顺序、边界和按需加载原则。
- Updated `AGENTS.md` so agents read `.ai/AI_CONTEXT.md` first, then load additional directories only when relevant and present.
- Added root `CLAUDE.md` as a lightweight Claude Code redirect entry that does not duplicate project knowledge.
- Confirmed `.claude/launch.json` and `.claude/settings.local.json` are local Claude-side files, not the shared project knowledge source.
- Did not create a guessed OpenCode-only entry file. Current confirmed project-level shared entry for that path remains `AGENTS.md`.

## Confirmed Facts

- `ai-ui-agentic` should be described as a personal shared AI engineering capability library, not as AI Coding Console itself.
- `tools/ai-coding-console` is only one tool module under `tools/`.
- The repository root currently does not contain independent `skills/`, `sops/`, or `guides/` directories.
- `CLAUDE.md` did not previously exist.

## Needs Confirmation

- Whether OpenCode has a stronger project-local auto-load mechanism beyond the already documented `AGENTS.md` entry path.
- Whether independent root `skills/`, `sops/`, and `guides/` directories will exist in the future, or whether the current `knowledge/` plus `tools/` layout is the intended long-term shape.

## Verification

- Review updated files to confirm `.ai/AI_CONTEXT.md` remains the only shared project context source.
- Run `npm run check` to satisfy repository-level verification after documentation changes.
- Inspect `git diff` and confirm only task-related documentation files changed from this task.

## Next Suggested Step

- If OpenCode needs fully explicit project-local auto-loading beyond `AGENTS.md`, confirm the exact supported mechanism first, then extend the redirect chain without duplicating project knowledge.
