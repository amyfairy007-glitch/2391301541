# Chinese Output Governance

## Task Goal

- Add one shared Chinese-first output rule for repository agents without introducing duplicate language rule files.

## Basis And Scope

- Basis:
  - `AGENTS.md`
  - `.ai/AI_CONTEXT.md`
  - `CLAUDE.md`
  - `.ai/current-state.md`
  - `.ai/decisions.md`
- Scope:
  - Documentation and project memory only
  - No business code changes
  - No bulk translation of historical files

## Result

- `AGENTS.md` now contains the only full repository-level language rule:
  - default Chinese replies
  - default Chinese generated documents, plans, reports, SOPs, guides, handoffs, code review results, and validation results
  - code, commands, paths, filenames, config fields, identifiers, API names, product names, protocol names, and required proper terms remain unchanged
  - when English must be kept, prefer `中文说明（English Name）`
  - use English only when the task explicitly requires English
- `.ai/AI_CONTEXT.md` now contains only a short reminder that the repository defaults to Chinese output while preserving required original English terms.
- `CLAUDE.md` remains a lightweight entry and does not duplicate the rule set.
- No additional OpenCode-specific entry file was created because no stronger repository-local OpenCode entry evidence was found.

## Risks And Unconfirmed Items

- The repository can define the rule, but host tools still depend on each agent actually honoring the shared entry chain.
- No repository-local OpenCode entry file more specific than `AGENTS.md` was confirmed during this task.

## Next Recommendation

- Use future tasks to verify that generated reports, handoffs, and review outputs consistently default to Chinese.
- If a later agent-specific exception is needed, keep it as a narrow override and do not fork the shared language policy.

## Version Info

- Generated: 2026-07-12
- Change Type: repository governance update
