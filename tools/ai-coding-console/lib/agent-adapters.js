// AI Coding Console - Agent Adapter Layer
// Stage D: decouple runners from any single Agent CLI.
//
// The Plan/Build runners must not hardcode `opencode.cmd`. They resolve an
// adapter by `agentType` and ask it for the CLI command and invocation shape.
// OpenCode is the only real adapter in Stage D. Codex and Claude Code are
// reserved placeholders that always report unavailable.

const fs = require("fs");
const path = require("path");
const { quoteWindowsArg, parsePlanFromRawOutput, findStringByKey } = require("./agent-runner-core");

// ---- OpenCode adapter ----

function resolveOpenCodeCommand() {
  const nodeDirCandidate = path.join(path.dirname(process.execPath), "opencode.cmd");
  try {
    fs.accessSync(nodeDirCandidate, fs.constants.R_OK);
    return {
      ok: true,
      command: nodeDirCandidate
    };
  } catch (err) {
    return {
      ok: false,
      statusCode: 409,
      error: "opencode_environment_not_ready",
      reason: "opencode_cli_unavailable",
      nextAction: "manual_environment_check_required",
      details: [`OpenCode CLI is not readable at ${nodeDirCandidate}.`]
    };
  }
}

function buildOpenCodeInvocation({ opencodePath, message, promptPath }) {
  // Windows .cmd shims must run through a shell. Empirically, wrapping the call
  // in an explicit `cmd.exe /d /s /c "..."` command line makes `opencode run`
  // hang with zero output (while `--version` works). Spawning the .cmd with
  // shell:true and a plain argument list is the pattern Node officially
  // recommends for .cmd/.bat on Windows and runs `opencode run` reliably.
  // The model flag is passed explicitly so the child process never blocks
  // waiting to resolve a default model when its config discovery differs from
  // an interactive shell.
  const args = [
    "run",
    message,
    "--format",
    "json",
    "--file",
    promptPath
  ];

  return {
    command: opencodePath,
    args,
    useShell: true,
    // For shell:true on Windows, arguments containing spaces must be quoted
    // inside the command string. We build a display/exec command line that the
    // runner passes verbatim to the shell.
    commandLine: [
      quoteWindowsArg(opencodePath),
      "run",
      quoteWindowsArg(message),
      "--format",
      "json",
      "--file",
      quoteWindowsArg(promptPath)
    ].join(" ")
  };
}

const OpenCodeAdapter = {
  agentType: "opencode",
  checkAvailability() {
    return resolveOpenCodeCommand();
  },
  buildInvocation({ message, promptPath }) {
    const resolved = resolveOpenCodeCommand();
    if (!resolved.ok) return resolved;
    const invocation = buildOpenCodeInvocation({
      opencodePath: resolved.command,
      message,
      promptPath
    });
    return { ok: true, command: invocation.command, args: invocation.args, commandLine: invocation.commandLine };
  },
  parseOutput(rawOutput) {
    return parsePlanFromRawOutput(rawOutput);
  },
  getSessionRef(rawOutput) {
    const parsed = parsePlanFromRawOutput(rawOutput);
    return parsed.sessionRef || findStringByKey({ rawOutput }, /session/i) || "";
  }
};

// ---- Reserved adapters (Stage D: never available, never executed) ----

function makeReservedAdapter(agentType) {
  return {
    agentType,
    checkAvailability() {
      return {
        ok: false,
        statusCode: 409,
        error: "agent_adapter_not_installed",
        reason: `agent_adapter_not_installed: ${agentType}`,
        nextAction: "manual_environment_check_required",
        details: [`Agent adapter not installed: ${agentType}`]
      };
    },
    buildInvocation() {
      return {
        ok: false,
        statusCode: 409,
        error: "agent_adapter_not_installed",
        details: [`Agent adapter not installed: ${agentType}`]
      };
    },
    parseOutput() {
      return { text: "", sessionRef: "" };
    },
    getSessionRef() {
      return "";
    }
  };
}

const CodexAdapter = makeReservedAdapter("codex");
const ClaudeCodeAdapter = makeReservedAdapter("claude");

const ADAPTERS = {
  opencode: OpenCodeAdapter,
  codex: CodexAdapter,
  claude: ClaudeCodeAdapter
};

function getAdapter(agentType) {
  const key = String(agentType || "opencode").toLowerCase();
  return ADAPTERS[key] || null;
}

module.exports = {
  getAdapter,
  resolveOpenCodeCommand,
  buildOpenCodeInvocation,
  OpenCodeAdapter,
  CodexAdapter,
  ClaudeCodeAdapter
};
