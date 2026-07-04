# Handoff

## Summary

- Completed a read-only review of the current AI Coding Console Web UI and produced the formal Web workbench plan.
- Confirmed the next UX direction: project context on the left, Task work on the right, and capability / prompt / artifact flows as collapsible secondary surfaces.

## Completed

- Read the current `.ai` memory files and the existing GUI README and implementation files.
- Reviewed the current data domain and the existing plan traces.
- Created the formal plan at `knowledge/traces/ai-coding-console-web-workbench-ui-plan.md`.
- Updated project memory to reflect the new workbench direction.
- Added `PROJECT_MAP.md` for first-contact codebase orientation.

## Open Items

- Decide whether the first implementation pass should keep the Board as an explicit right-side Tab or treat it as a secondary view under Artifacts / task context.
- Decide whether the middle Task list should remain fully flat in v1 or add a light status grouping.

## Notes for the Next Person

- Keep the implementation scoped to the existing GUI runtime and shared data domain.
- Do not create real Task / Run data during the next phase.
- Keep capability registry support layout-ready but data-agnostic until C.6 lands.
