// AI Coding Desktop Console - GUI Server
// Phase C.5 - Local HTTP server, zero dependencies

const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const {
  getCapabilityRegistryEntry,
  loadCapabilityRegistry
} = require("../lib/capability-registry");
const {
  isSafeTaskId,
  loadTaskCapabilityBinding,
  saveTaskCapabilityBinding
} = require("../lib/task-capability-binding");

const PORT = 3456;
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const GUI_DIR = __dirname;
const DATA_DIR = path.join(REPO_ROOT, "data", "ai-coding-console");
const CONSOLE_PS1 = path.join(REPO_ROOT, "tools", "ai-coding-console", "cli", "console.ps1");
const MANIFEST_PATH = path.join(DATA_DIR, "projects-manifest.json");
const CAPABILITY_REGISTRY_PATH = path.join(DATA_DIR, "capability-registry.json");

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function execPS1(args) {
  return new Promise((resolve, reject) => {
    const child = execFile("powershell", [
      "-ExecutionPolicy", "Bypass",
      "-WindowStyle", "Hidden",
      "-File", CONSOLE_PS1,
      ...args
    ], { cwd: REPO_ROOT, timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        resolve({ ok: false, output: stdout + "\n" + (stderr || err.message) });
        return;
      }
      resolve({ ok: true, output: stdout });
    });
  });
}

function serveStatic(res, filePath, contentType) {
  if (!fs.existsSync(filePath)) { res.writeHead(404); res.end("Not found"); return; }
  res.writeHead(200, { "Content-Type": contentType });
  res.end(fs.readFileSync(filePath, "utf8"));
}

function sendJSON(res, data, status) {
  res.writeHead(status || 200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

function sendError(res, msg, status) {
  sendJSON(res, { error: msg }, status || 500);
}

function isSafeProjectId(value) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value) && !value.includes("..");
}

function getProjectTasks(projectId) {
  const tasksDir = path.join(DATA_DIR, "tasks");
  if (!fs.existsSync(tasksDir)) return [];
  const entries = fs.readdirSync(tasksDir, { withFileTypes: true });
  const tasks = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const taskPath = path.join(tasksDir, e.name, "task.json");
    const task = readJSON(taskPath);
    if (!task) continue;
    if (task.projectId !== projectId && task.projectid !== projectId) continue;
    tasks.push(task);
  }
  tasks.sort((a, b) => {
    const ca = a.createdAt || a.createdat || "";
    const cb = b.createdAt || b.createdat || "";
    return cb.localeCompare(ca);
  });
  return tasks;
}

function getTaskDetail(taskId) {
  const taskDir = path.join(DATA_DIR, "tasks", taskId);
  const task = readJSON(path.join(taskDir, "task.json"));
  if (!task) return null;

  const runs = [];
  const runsDir = path.join(taskDir, "runs");
  if (fs.existsSync(runsDir)) {
    for (const rd of fs.readdirSync(runsDir, { withFileTypes: true })) {
      if (!rd.isDirectory()) continue;
      const artifacts = fs.readdirSync(path.join(runsDir, rd.name)).filter(f => f.endsWith(".md") || f.endsWith(".log"));
      runs.push({ runId: rd.name, artifacts });
    }
  }

  const approvals = [];
  const appDir = path.join(taskDir, "approvals");
  if (fs.existsSync(appDir)) {
    for (const af of fs.readdirSync(appDir)) {
      if (!af.endsWith(".json")) continue;
      const ad = readJSON(path.join(appDir, af));
      if (ad) approvals.push(ad);
    }
  }

  return { task, runs, approvals };
}

function getProjectInfo(projectId) {
  const manifest = readJSON(MANIFEST_PATH);
  if (!manifest || !manifest.projects) return null;
  return manifest.projects[projectId] || null;
}

function parseProjectStatus(statusOutput, projectRecord) {
  const summary = {
    gitBranch: null,
    gitDirty: null,
    gitRemote: projectRecord?.gitRemote || projectRecord?.gitremote || null,
    agentsMd: projectRecord?.hasAgentsMd || projectRecord?.hasagentsmd || false,
    aiMemory: projectRecord?.hasAiMemory || projectRecord?.hasaimemory || false,
    projectState: projectRecord?.takeoverStatus || projectRecord?.takeoverstatus || "unknown"
  };

  const lines = String(statusOutput || "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const branchMatch = line.match(/(?:git\s*)?branch\s*[:=]\s*(.+)$/i);
    if (branchMatch && !summary.gitBranch) {
      summary.gitBranch = branchMatch[1].trim();
    }

    const remoteMatch = line.match(/(?:git\s*)?remote\s*[:=]\s*(.+)$/i);
    if (remoteMatch && !summary.gitRemote) {
      summary.gitRemote = remoteMatch[1].trim();
    }

    const dirtyMatch = line.match(/(?:git\s*)?(?:dirty|status)\s*[:=]\s*(.+)$/i);
    if (dirtyMatch && summary.gitDirty === null) {
      const value = dirtyMatch[1].trim().toLowerCase();
      summary.gitDirty = value.includes("dirty") || value.includes("modified") || value === "true" || value === "yes";
    }

    if (/dirty/i.test(line) && summary.gitDirty === null) {
      summary.gitDirty = true;
    }

    const agentsMatch = line.match(/AGENTS\.md.*?(present|missing|yes|no)/i);
    if (agentsMatch) {
      summary.agentsMd = /present|yes/i.test(agentsMatch[1]);
    }

    const memoryMatch = line.match(/\.ai\/?.*?(present|missing|yes|no)/i);
    if (memoryMatch) {
      summary.aiMemory = /present|yes/i.test(memoryMatch[1]);
    }

    const stateMatch = line.match(/(?:project\s*)?state\s*[:=]\s*(.+)$/i);
    if (stateMatch && summary.projectState === "unknown") {
      summary.projectState = stateMatch[1].trim();
    }
  }

  return summary;
}

// ===== Server =====

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost:" + PORT);
  const p = url.pathname;
  const m = req.method;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (m === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // === Static ===
  if (p === "/" || p === "/index.html") {
    serveStatic(res, path.join(GUI_DIR, "index.html"), "text/html; charset=utf-8"); return;
  }
  if (p === "/app.js") {
    serveStatic(res, path.join(GUI_DIR, "app.js"), "application/javascript; charset=utf-8"); return;
  }

  // === API ===

  // GET /api/projects
  if (p === "/api/projects" && m === "GET") {
    const manifest = readJSON(MANIFEST_PATH);
    if (!manifest || !manifest.projects) { sendJSON(res, []); return; }
    const projects = [];
    for (const key of Object.keys(manifest.projects)) {
      const prj = manifest.projects[key];
      const summary = parseProjectStatus("", prj);
      projects.push({
        id: prj.id || key,
        displayName: prj.displayName || prj.displayname || key,
        rootPath: prj.rootPath || prj.rootpath || "",
        hasAiMemory: prj.hasAiMemory || prj.hasaimemory || false,
        hasAgentsMd: prj.hasAgentsMd || prj.hasagentsmd || false,
        gitRemote: prj.gitRemote || prj.gitremote || null,
        addedAt: prj.addedAt || prj.addedat || "",
        takeoverStatus: prj.takeoverStatus || prj.takeoverstatus || "unknown",
        statusSummary: summary
      });
    }
    sendJSON(res, projects);
    return;
  }

  // GET /api/projects/:id
  const projMatch = p.match(/^\/api\/projects\/(.+)$/);
  if (projMatch && m === "GET") {
    const pid = decodeURIComponent(projMatch[1]);
    const prj = getProjectInfo(pid);
    if (!prj) { sendError(res, "Project not found", 404); return; }
    execPS1(["project", "status", "--project", pid]).then(result => {
      const statusSummary = parseProjectStatus(result.output, prj);
      sendJSON(res, {
        id: prj.id || pid,
        displayName: prj.displayName || prj.displayname || pid,
        rootPath: prj.rootPath || prj.rootpath || "",
        hasAiMemory: prj.hasAiMemory || prj.hasaimemory || false,
        hasAgentsMd: prj.hasAgentsMd || prj.hasagentsmd || false,
        gitRemote: prj.gitRemote || prj.gitremote || null,
        addedAt: prj.addedAt || prj.addedat || "",
        takeoverStatus: prj.takeoverStatus || prj.takeoverstatus || "unknown",
        statusOutput: result.output,
        statusSummary
      });
    });
    return;
  }

  // GET /api/capabilities
  if (p === "/api/capabilities" && m === "GET") {
    const loaded = loadCapabilityRegistry(CAPABILITY_REGISTRY_PATH, REPO_ROOT);
    if (!loaded.ok) {
      sendJSON(res, {
        error: loaded.error,
        details: loaded.details || []
      }, loaded.statusCode || 500);
      return;
    }
    sendJSON(res, loaded.registry);
    return;
  }

  // GET /api/capabilities/:id
  const capabilityMatch = p.match(/^\/api\/capabilities\/([^/]+)$/);
  if (capabilityMatch && m === "GET") {
    const capabilityId = decodeURIComponent(capabilityMatch[1]);
    const loaded = getCapabilityRegistryEntry(CAPABILITY_REGISTRY_PATH, REPO_ROOT, capabilityId);
    if (!loaded.ok) {
      sendJSON(res, {
        error: loaded.error,
        details: loaded.details || []
      }, loaded.statusCode || 500);
      return;
    }
    sendJSON(res, loaded.entry);
    return;
  }

  // GET /api/tasks/:projectId
  const tasksListMatch = p.match(/^\/api\/tasks\/([^/]+)$/);
  if (tasksListMatch && m === "GET") {
    const pid = decodeURIComponent(tasksListMatch[1]);
    if (!isSafeProjectId(pid)) { sendError(res, "Invalid project id", 400); return; }
    const prj = getProjectInfo(pid);
    if (!prj) { sendJSON(res, []); return; }
    sendJSON(res, getProjectTasks(pid));
    return;
  }

  // GET /api/tasks/:projectId/:taskId
  const taskMatch = p.match(/^\/api\/tasks\/([^/]+)\/([^/]+)$/);
  if (taskMatch && m === "GET") {
    const detail = getTaskDetail(decodeURIComponent(taskMatch[2]));
    if (!detail) { sendError(res, "Task not found", 404); return; }
    sendJSON(res, detail);
    return;
  }

  // GET/POST /api/tasks/:projectId/:taskId/capabilities
  const taskCapabilitiesMatch = p.match(/^\/api\/tasks\/([^/]+)\/([^/]+)\/capabilities$/);
  if (taskCapabilitiesMatch) {
    const projectId = decodeURIComponent(taskCapabilitiesMatch[1]);
    const taskId = decodeURIComponent(taskCapabilitiesMatch[2]);
    if (!isSafeProjectId(projectId) || !isSafeTaskId(taskId)) {
      sendJSON(res, { error: "invalid_task_route" }, 400);
      return;
    }
    if (m === "GET") {
      const loaded = loadTaskCapabilityBinding(REPO_ROOT, projectId, taskId, CAPABILITY_REGISTRY_PATH);
      if (!loaded.ok) {
        sendJSON(res, {
          error: loaded.error,
          details: loaded.details || [],
          invalidIds: loaded.invalidIds || []
        }, loaded.statusCode || 500);
        return;
      }
      sendJSON(res, loaded);
      return;
    }
    if (m === "POST") {
      let body = "";
      req.on("data", d => body += d);
      req.on("end", () => {
        try {
          const parsed = JSON.parse(body || "{}");
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            sendJSON(res, { error: "invalid_request_body" }, 400);
            return;
          }
          const result = saveTaskCapabilityBinding(
            REPO_ROOT,
            projectId,
            taskId,
            parsed.capabilityIds,
            CAPABILITY_REGISTRY_PATH
          );
          if (!result.ok) {
            sendJSON(res, {
              error: result.error,
              details: result.details || [],
              invalidIds: result.invalidIds || []
            }, result.statusCode || 500);
            return;
          }
          sendJSON(res, result);
        } catch (err) {
          sendJSON(res, { error: "invalid_request_body", details: [err.message] }, 400);
        }
      });
      return;
    }
  }

  // GET /api/board/:projectId
  const boardMatch = p.match(/^\/api\/board\/(.+)$/);
  if (boardMatch && m === "GET") {
    const pid = decodeURIComponent(boardMatch[1]);
    if (!isSafeProjectId(pid)) { sendError(res, "Invalid project id", 400); return; }
    execPS1(["board", "show", "--project", pid]).then(() => {
      const boardDir = path.join(DATA_DIR, "board");
      const boardFile = path.join(boardDir, pid + "-board.md");
      if (fs.existsSync(boardFile)) {
        sendJSON(res, { content: fs.readFileSync(boardFile, "utf8") });
      } else {
        sendJSON(res, { content: "# No board generated yet." });
      }
    });
    return;
  }

  // POST /api/tasks/create
  if (p === "/api/tasks/create" && m === "POST") {
    let body = "";
    req.on("data", d => body += d);
    req.on("end", async () => {
      try {
        const { projectId, desc } = JSON.parse(body);
        if (!projectId || !desc) { sendError(res, "Missing projectId or desc", 400); return; }
        if (!isSafeProjectId(projectId)) { sendError(res, "Invalid project id", 400); return; }
        const result = await execPS1(["task", "create", "--project", projectId, "--desc", desc]);
        if (result.ok) {
          const tid = result.output.match(/T-\d{8}-\d{3}/)?.[0] || "";
          sendJSON(res, { ok: true, taskId: tid, output: result.output });
        } else {
          sendJSON(res, { ok: false, output: result.output }, 400);
        }
      } catch (e) { sendError(res, e.message); }
    });
    return;
  }

  // POST /api/tasks/:id/approve
  const approveMatch = p.match(/^\/api\/tasks\/([^/]+)\/approve$/);
  if (approveMatch && m === "POST") {
    const tid = decodeURIComponent(approveMatch[1]);
    if (!isSafeTaskId(tid)) { sendError(res, "Invalid task id", 400); return; }
    let body = "";
    req.on("data", d => body += d);
    req.on("end", async () => {
      try {
        const { reject } = JSON.parse(body || "{}");
        const args = ["task", "approve", "--task", tid];
        if (reject) args.push("--reject");
        const result = await execPS1(args);
        sendJSON(res, { ok: result.ok, output: result.output });
      } catch (e) { sendError(res, e.message); }
    });
    return;
  }

  // POST /api/tasks/:id/review
  const reviewMatch = p.match(/^\/api\/tasks\/([^/]+)\/review$/);
  if (reviewMatch && m === "POST") {
    const tid = decodeURIComponent(reviewMatch[1]);
    if (!isSafeTaskId(tid)) { sendError(res, "Invalid task id", 400); return; }
    let body = "";
    req.on("data", d => body += d);
    req.on("end", async () => {
      try {
        const { reject } = JSON.parse(body || "{}");
        const args = ["task", "review", "--task", tid];
        if (reject) args.push("--reject");
        const result = await execPS1(args);
        sendJSON(res, { ok: result.ok, output: result.output });
      } catch (e) { sendError(res, e.message); }
    });
    return;
  }

  // POST /api/tasks/:id/close
  const closeMatch = p.match(/^\/api\/tasks\/([^/]+)\/close$/);
  if (closeMatch && m === "POST") {
    const tid = decodeURIComponent(closeMatch[1]);
    if (!isSafeTaskId(tid)) { sendError(res, "Invalid task id", 400); return; }
    execPS1(["task", "close", "--task", tid]).then(result => {
      sendJSON(res, { ok: result.ok, output: result.output });
    });
    return;
  }

  // 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("AI Coding Console GUI: http://localhost:" + PORT);
  console.log("Press Ctrl+C to stop.");
});
