# Web Operation Area Minimal Actions Result

Date: 2026-07-09

## Task Goal

Hide the Web operation/action area so the visible action surface keeps only project creation and Task creation entry points.

## Basis And Scope

The change targets the AI Coding Console Web UI in `tools/ai-coding-console/gui/app.js`. The implementation only changes front-end rendering; it does not change API routes, task data, run data, approval behavior, or backend execution logic.

## Result

The Web UI now keeps the creation entry points visible while hiding the extra action surfaces from the main workbench:

- Kept `+ 新建项目` in the project rail header.
- Kept `+ 新建任务` in the Task rail and empty/onboarding state.
- Hid the left app rail's disabled operation entries, leaving only the project entry.
- Hid the Task status filter from the Task rail toolbar.
- Hid the project detail inline action from project cards.
- Hid project/task rail collapse action buttons from the rail headers.
- Hid the top context strip's `更多操作` menu.
- Hid the onboarding `项目详情` button.
- Hid the workbench primary action buttons that linked into Prompt/SOP, Agent, Artifact, or approval flows.
- Hid the tab strip so the main workspace stays on the basic workbench view instead of exposing Prompt/SOP, Agent output, Artifact, and Approval tabs as visible operation areas.

## Risk And Unconfirmed Items

The hidden panels and their functions remain in the code for later restoration. This is intentionally a rendering-level simplification rather than a deletion of Stage D functionality. `+ 新建项目` remains the existing placeholder behavior (`showBannerNotice`) because this task asked to leave the entry visible, not to implement a new project creation flow.

During verification, trailing null bytes at the end of `app.js` caused `node --check` to fail. They were removed without changing runtime logic.

## Verification

`npm run check` passed after the UI changes and file cleanup.

## Follow-up Recommendation

If the simplified Web surface is meant to become the product direction, replace the hidden rendering branches with a deliberate simplified layout pass and either implement real project creation or rename the `+ 新建项目` action to indicate that it is not yet connected.
