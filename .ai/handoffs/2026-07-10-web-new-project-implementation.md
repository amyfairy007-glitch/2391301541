# Handoff

## Summary

- Implemented the Web `+ 新建项目` flow on 2026-07-10.
- V1 registers an existing local project directory from the Web UI; it does not create a new source project from scratch.

## Completed

- Updated `tools/ai-coding-console/gui/server.js` with non-interactive project path detection and project creation.
- Added `POST /api/projects/check` and `POST /api/projects/create`.
- Added manifest persistence to `data/ai-coding-console/projects-manifest.json`.
- Added path normalization, generated project IDs, duplicate path checks, project ID conflict checks, Git summary detection, `.ai/` detection, and `AGENTS.md` detection.
- Added optional `.ai/` initialization via the existing `tools/init-project-memory/init-project-memory.ps1` script.
- Updated `tools/ai-coding-console/gui/app.js` so `+ 新建项目` opens a real modal with path, display name, `.ai/` initialization option, detection, creation, list refresh, and auto-selection.
- Preserved the simplified Web action surface so only `+ 新建项目` and `+ 新建任务` remain visible as primary action entries.
- Ran `npm run check`; it passed.
- Ran API-level validation for create/check/missing path/duplicate path; it passed and restored the manifest backup afterward.
- Created implementation record at `knowledge/traces/web-new-project-implementation-2026-07-10.md`.

## Open Items

- Browser/manual validation is still recommended: run `npm run gui`, click `+ 新建项目`, and register an independent test project directory.
- After registering a project through the UI, validate `+ 新建任务` under that new project.
- Consider extracting the project registry logic into `tools/ai-coding-console/lib/project-registry.js` later so CLI and Web share the same implementation.

## Notes for the Next Person

- Do not revert to the interactive CLI `project add --path` path for Web; it can block on `.ai/` initialization prompts.
- Current V1 uses the target directory basename to generate `projectId`; custom project IDs are not implemented.
- The test script created a temporary project directory under the session outputs area and restored `projects-manifest.json` after validation.
