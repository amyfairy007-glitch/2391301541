# Handoff: Plan Run Detail Execution Summary + ANSI Cleanup

**Date**: 2026-07-12
**Task**: Clean up ANSI control characters from stdout/stderr display, add execution summary card to Plan Run detail view
**Files changed**:
- `tools/ai-coding-console/gui/app.js` — added `stripAnsi()`, `buildRunSummary()`, restructured `renderRunDetailView()`, updated `renderCollapsibleSection()` to strip ANSI
- `tools/ai-coding-console/gui/index.html` — added CSS for `.exec-summary` (success/warn/error variants), `.exec-reason`, `.exec-impact`, `.exec-suggestion`
- `.ai/current-state.md` — added new section
- `.ai/decisions.md` — added decision entry

## What was done

1. **`stripAnsi(text)`** — strips `\u001b[...m` SGR codes, `\u001b]...\u0007` OSC sequences, and normalizes `\r\n`/`\r` to `\n`.

2. **`buildRunSummary(run, runRecord)`** — scans cleaned stdout+stderr for:
   - `permission requested` + `auto-rejecting` → permission rejection warning
   - `user rejected permission` → user rejection warning
   - `failed` / `error` (non-permission) → error
   - Empty/missing plan → "no valid plan" warning
   - Dirty worktree → workspace modification warning
   - Non-empty stderr with no other findings → minor note

   Returns `{ severity: "success"|"warning"|"error", label, reasons: string[], impact, suggestion }`.

3. **`renderRunDetailView()`** — restructured to:
   1. **Execution summary** (top, color-coded card): label + reasons + impact + suggestion
   2. **Metadata + safety grid** (side by side)
   3. **技术详情** (collapsible `details`): contains the four `renderCollapsibleSection` calls for Plan/prompt/stdout/stderr

4. **`renderCollapsibleSection()`** — now applies `stripAnsi()` to content before display, so logs are readable.

## Verified behavior

Test run `RUN-20260711-007-plan` (permission rejection case):
- `stripAnsi` correctly strips `\u001b[0m`, `\u001b[93m`, `\u001b[1m`, `\u001b[?25h`
- `buildRunSummary` correctly detects `permission requested` + `auto-rejecting`
- Produces: severity=warning, label="已完成，但存在警告", reason mentions the exact external_directory path, impact="Agent 可能没有完整读取输入", suggestion="检查 OpenCode 外部目录权限或调整 prompt.md 的读取方式"
- `hasPlan=false` correctly (plan content starts with `# Plan extraction failed`)
- `npm run check` passes

## Remaining notes

- The permission detection regex `/user rejected permission|rejected permission/i` matched on our test run because "auto-rejecting" triggered a separate test. In practice, `rejected permission` might also match `permission requested; auto-rejecting`. Confirm real-world pattern if needed.
- No CSS `.banner.success` changes were needed (already existed in index.html).
- The status banner at the bottom of the detail view now uses `sevClass` (derived from summary) instead of hardcoded "warn" for completed status.
