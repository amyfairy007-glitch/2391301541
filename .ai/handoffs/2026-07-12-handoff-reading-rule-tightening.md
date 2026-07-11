# Handoff

## Summary

- Tightened the root `AGENTS.md` rule for `.ai/handoffs/` so new sessions do not bulk-read historical handoff files by default.

## Completed

- Added a concise mandatory rule in `AGENTS.md` that limits handoff reads to task-relevant keyword lookups for historical design, migration, unfinished work, implementation rationale, or document-conflict tracing.
- Clarified in project memory that handoffs are historical evidence and must not override `.ai/current-state.md` or `.ai/decisions.md`.
- Kept `.ai/AI_CONTEXT.md` unchanged for this task because the user requested the root rule tightening only.

## Open Items

- If future sessions still over-read handoffs despite the root rule, revisit `.ai/AI_CONTEXT.md` to add a fuller handoff-reading policy there without expanding `AGENTS.md`.

## Notes for the Next Person

- Treat this change as a session-entry guardrail, not as a new indexing system.
- Do not rename or summarize old handoffs into a new aggregate file unless the repository later adopts an explicit indexing design.
