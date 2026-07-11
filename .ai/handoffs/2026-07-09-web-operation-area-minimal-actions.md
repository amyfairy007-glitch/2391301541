# Handoff

## Summary

- The AI Coding Console Web UI action surface was simplified on 2026-07-09.
- Only `+ 新建项目` and `+ 新建任务` remain visible as primary operation entries.

## Completed

- Updated `tools/ai-coding-console/gui/app.js`.
- Hid disabled app rail operation entries and left only the project rail entry.
- Hid Task status filter, project detail inline action, rail collapse buttons, context `更多操作`, onboarding `项目详情`, workspace primary action buttons, and the tab strip.
- Kept `+ 新建项目` visible in the project rail header.
- Kept `+ 新建任务` visible in the Task rail and empty/onboarding state.
- Removed trailing null bytes from `app.js` after `node --check` reported an invalid token at EOF.
- Created formal result record at `knowledge/traces/web-operation-area-minimal-actions-2026-07-09.md`.
- Updated `.ai/current-state.md` and `.ai/decisions.md`.
- Ran `npm run check`; it passed.

## Open Items

- `+ 新建项目` is still the existing placeholder action (`showBannerNotice`); it has not been wired to a real project creation flow.
- If this simplified surface becomes permanent, consider replacing hidden rendering branches with a deliberate simplified layout implementation instead of keeping all advanced panels dormant.

## Notes for the Next Person

- The advanced Stage D functionality was not deleted; most panels/functions remain in the file but are no longer surfaced by the main rendering path.
- Restore with care: the current user intent is to avoid exposing Prompt/SOP, Agent, Artifact, Approval, filters, detail drawers, and miscellaneous action menus in the web operation area.
