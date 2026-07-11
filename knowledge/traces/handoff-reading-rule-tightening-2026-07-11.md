# Handoff Reading Rule Tightening

## Task Goal

- Tighten the repository-level rule for `.ai/handoffs/` so new sessions do not default to bulk-reading historical handoff records.

## Basis And Scope

- Basis:
  - `AGENTS.md`
  - `.ai/AI_CONTEXT.md`
  - `.ai/current-state.md`
  - `.ai/decisions.md`
  - `.ai/handoffs/`
- Scope:
  - Repository documentation and project memory only
  - No code changes
  - No handoff deletion, rename, or content rewrite

## Result

- Added a concise mandatory rule to `AGENTS.md`:
  - default bulk reads of `.ai/handoffs/` are forbidden
  - handoffs may be read only by task-relevant keyword when the task needs historical design background, migration context, unfinished work, implementation rationale, or conflict tracing
  - handoffs are historical evidence, not current requirements
  - conflicts with `.ai/current-state.md` or `.ai/decisions.md` must be reported first
- Left `.ai/AI_CONTEXT.md` unchanged in this task to keep the root rule minimal and avoid expanding multiple fact sources unnecessarily.

## Risks And Unconfirmed Items

- The stronger root rule reduces accidental historical overloading, but it does not technically prevent an agent from ignoring the rule.
- OpenCode still has no separately confirmed project-local auto-load mechanism beyond `AGENTS.md`.

## Next Recommendation

- Observe whether future sessions actually stop loading full `.ai/handoffs/` history.
- Only if that remains a problem, add a fuller handoff-reading explanation inside `.ai/AI_CONTEXT.md` while keeping `AGENTS.md` short.

## Version Info

- Generated: 2026-07-12
- Change Type: repository rule tightening
