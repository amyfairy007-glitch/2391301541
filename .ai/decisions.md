# Decisions

## Decision Log

- Date: 2026-07-05
  - Decision: Standardize the next Web UI as a three-column task workbench with persistent project context on the left and the current Task as the right-side primary working object.
  - Why: The current page structure makes project, task, board, and status feel fragmented; the new layout keeps the workflow visible and reduces navigation churn.
  - Impact: Future UI work should center on left project selection, middle task selection, and right task workspace tabs instead of page-based project/task/board views.

- Date: 2026-07-05
  - Decision: Keep Git, AGENTS.md, `.ai`, capability browsing, SOP reference, prompt sources, and artifact filters in drawers or collapsible regions rather than the default homepage surface.
  - Why: These elements are useful context but should not crowd out the working surface or turn the console into a management dashboard.
  - Impact: The implementation should preserve a lightweight main canvas and push secondary information into drawers and folded panels.
