# AI Coding Console D-1 OpenCode Runner Adjustment

Date: 2026-07-07

## Goal

Correct the D-1 runner so Codex sandbox limitations do not become a hard blocker for the user's real OpenCode environment.

This update does not create a Run, does not call `opencode.cmd run`, and does not change GUI behavior.

## Files Updated

- `tools/ai-coding-console/lib/opencode-plan-runner.js`
- `knowledge/traces/ai-coding-console-d1-opencode-plan-run-result.md`

## Reliable D-1 Fixes Kept

The runner still keeps the parts that are valid regardless of Codex sandbox context:

- `opencode.cmd` resolution from the active runtime installation directory
- clean Git worktree pre-check
- timeout handling
- continuous stdout/stderr capture to disk
- `taskkill /t /f` process-tree cleanup on timeout
- post-run Git status comparison
- normal failed / timed_out / unsafe_modified status handling

## Sandbox Misjudgment Removed

The previous draft introduced a hard guard that inspected a derived OpenCode config directory and rejected runs when Codex could not access it.

That behavior was removed because:

- Codex is running under the sandbox account `othyreinspmxpbw\\codexsandboxoffline`
- that sandbox account cannot reliably inspect the user's real OpenCode config area
- the user already confirmed that `opencode.cmd run ... --format json` succeeds in a real cmd session

So:

- the runner no longer blocks on `.config` readability
- the runner no longer treats `EPERM` / `Access denied` from the Codex sandbox as evidence that the user's real OpenCode environment is broken
- the runner no longer hardcodes or derives a fixed `C:\\Users\\Administrator\\.config\\opencode` access check as a precondition

## Runtime Environment Change

The runner now uses:

- `env: { ...process.env }`

and does not overwrite:

- `HOME`
- `USERPROFILE`
- `APPDATA`
- `LOCALAPPDATA`
- `XDG_CONFIG_HOME`

This keeps D-1 aligned with the real terminal environment that actually succeeds for the user.

## Still Not Claimed

This change does not prove that D-1 is already fully working end to end.

It only removes a false negative introduced by the Codex sandbox.

The next real validation must happen from the user's real GUI launch terminal, not from the Codex sandbox, because the sandbox still cannot represent the user's true OpenCode permission context.

## Next Recommended Validation

Run the GUI from the same real user terminal context that can already execute:

```text
opencode.cmd run "Reply with exactly: OK" --format json
```

Then perform the next D-1 real run validation there.

## Unchanged Scope

- no `RUN-004`
- no OpenCode execution from Codex sandbox
- no Task data changes
- no GUI changes
- no config directory mutation
- no commit
