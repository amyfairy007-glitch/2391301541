# Handoff

## Summary

- Created the Web `+ 新建项目` design document on 2026-07-09.
- User requested a front-end/back-end complete design and chose `docs/` as the destination.

## Completed

- Reviewed current Web project list/read behavior in `tools/ai-coding-console/gui/server.js`.
- Reviewed current placeholder `+ 新建项目` button in `tools/ai-coding-console/gui/app.js`.
- Reviewed existing CLI project registration behavior in `tools/ai-coding-console/cli/console.ps1`.
- Reviewed current manifest shape in `data/ai-coding-console/projects-manifest.json`.
- Created `docs/new-project-web-design-2026-07-09.md`.
- Updated `.ai/current-state.md` and `.ai/decisions.md`.

## Open Items

- Implementation has not started.
- The design recommends V1 as “register an existing local project directory” rather than creating a new source directory.
- Proposed APIs: `POST /api/projects/check` and `POST /api/projects/create`.
- Recommended persistence target remains `data/ai-coding-console/projects-manifest.json`.

## Notes for the Next Person

- Do not call the existing `project add --path` CLI interactively from Web as-is; it can block on `Read-Host` when `.ai/` is missing.
- Prefer non-interactive project registration logic in Node first, then later extract shared logic to `tools/ai-coding-console/lib/project-registry.js` so CLI and Web do not drift.
