// AI Coding Desktop Console - GUI Server
// Phase C.5 - Local HTTP server, zero dependencies

const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const PORT = 3456;
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const GUI_DIR = __dirname;
const DATA_DIR = path.join(REPO_ROOT, "data", "ai-coding-console");
const CONSOLE_PS1 = path.join(REPO_ROOT, "tools", "ai-coding-console", "cli", "console.ps1");
const MANIFEST_PATH = path.join(DATA_DIR, "projects-manifest.json");

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

function getProjectTasks(projectId) {
  const tasksDir = path.join(DATA_DIR, "tasks");
  if (!fs.existsSync(tasksDir)) return [];
  const entries = fs.readdirSync(tasksDir, { withFileTypes: true });
  const tasks = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const taskPath = path.join(tasksDir, e.name, "task.json");
    if (!fs.existsSync(taskPath)) continue;
    const task = JSON.parse(fs.readFileSync(taskPath, "utf8"));
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
  const taskPath = path.join(taskDir, "task.json");
  if (!fs.existsSync(taskPath)) return null;
  const task = JSON.parse(fs.readFileSync(taskPath, "utf8"));

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
      approvals.push(JSON.parse(fs.readFileSync(path.join(appDir, af), "utf8")));
    }
  }

  return { task, runs, approvals };
}

function getProjectInfo(projectId) {
  const manifest = readJSON(MANIFEST_PATH);
  if (!manifest || !manifest.projects) return null;
  return manifest.projects[projectId] || null;
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
      projects.push({
        id: prj.id || key,
        displayName: prj.displayName || prj.displayname || key,
        rootPath: prj.rootPath || prj.rootpath || "",
        hasAiMemory: prj.hasAiMemory || prj.hasaimemory || false,
        hasAgentsMd: prj.hasAgentsMd || prj.hasagentsmd || false,
        gitRemote: prj.gitRemote || prj.gitremote || null,
        addedAt: prj.addedAt || prj.addedat || "",
        takeoverStatus: prj.takeoverStatus || prj.takeoverstatus || "unknown"
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
      sendJSON(res, {
        id: prj.id || pid,
        displayName: prj.displayName || prj.displayname || pid,
        rootPath: prj.rootPath || prj.rootpath || "",
        hasAiMemory: prj.hasAiMemory || prj.hasaimemory || false,
        hasAgentsMd: prj.hasAgentsMd || prj.hasagentsmd || false,
        gitRemote: prj.gitRemote || prj.gitremote || null,
        addedAt: prj.addedAt || prj.addedat || "",
        takeoverStatus: prj.takeoverStatus || prj.takeoverstatus || "unknown",
        statusOutput: result.output
      });
    });
    return;
  }

  // GET /api/tasks/:projectId
  const tasksListMatch = p.match(/^\/api\/tasks\/([^/]+)$/);
  if (tasksListMatch && m === "GET") {
    const pid = decodeURIComponent(tasksListMatch[1]);
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

  // GET /api/board/:projectId
  const boardMatch = p.match(/^\/api\/board\/(.+)$/);
  if (boardMatch && m === "GET") {
    const pid = decodeURIComponent(boardMatch[1]);
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
