// AI Coding Console - Frontend (Phase C.5)
const API = "";
let activeProjectId = "";
let activeTaskId = "";

async function apiGet(path) {
  const r = await fetch(API + path);
  if (!r.ok) { const err = await r.json().catch(()=>({})); throw new Error(err.error || r.statusText); }
  return r.json();
}
async function apiPost(path, body) {
  const r = await fetch(API + path, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body||{})});
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || data.output || r.statusText);
  return data;
}

function $(sel) { return document.querySelector(sel); }
function html(str) { const d = document.createElement("div"); d.innerHTML = str; return d.firstElementChild; }
function escapeHTML(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

// ========== Navigation ==========

function renderNav(page) {
  const nav = $("#main-nav");
  let links = `<a href="#/" class="${page==="projects"?"active":""}">Projects</a>`;
  if (activeProjectId) {
    links += `<a href="#/projects/${activeProjectId}" class="${page==="project"?"active":""}">Project</a>`;
    links += `<a href="#/projects/${activeProjectId}/tasks" class="${page==="tasks"?"active":""}">Tasks</a>`;
    if (activeTaskId) links += `<a href="#/projects/${activeProjectId}/tasks/${activeTaskId}" class="${page==="task"?"active":""}">Task</a>`;
    links += `<a href="#/projects/${activeProjectId}/board" class="${page==="board"?"active":""}">Board</a>`;
  }
  nav.innerHTML = links;
}

// ========== Pages ==========

async function showProjects() {
  renderNav("projects");
  activeTaskId = "";
  const page = $("#page");
  page.innerHTML = `<div class="empty">Loading projects...</div>`;
  try {
    const projects = await apiGet("/api/projects");
    if (!projects.length) { page.innerHTML = `<div class="empty">No registered projects.<br><br>Use CLI: <code>project add --path &lt;project-dir&gt;</code></div>`; return; }
    let cards = "";
    for (const prj of projects) {
      const rm = prj.gitRemote || "N/A";
      const rmShort = rm.length > 30 ? rm.slice(0,30)+".." : rm;
      cards += `
        <div class="card">
          <div class="card-title">${escapeHTML(prj.displayName)} <span style="font-size:11px;color:#8b949e">(${escapeHTML(prj.id)})</span></div>
          <div class="card-meta">
            <span>${escapeHTML(prj.rootPath)}</span>
            <span>${escapeHTML(rmShort)}</span>
            <span>AI Memory: ${prj.hasAiMemory?"yes":"no"}</span>
            <span>AGENTS.md: ${prj.hasAgentsMd?"yes":"no"}</span>
          </div>
          <div class="card-actions">
            <button class="btn btn-primary" onclick="location.hash='#/projects/${prj.id}'">View</button>
            <button class="btn" onclick="location.hash='#/projects/${prj.id}/tasks'">Tasks</button>
            <button class="btn" onclick="location.hash='#/projects/${prj.id}/board'">Board</button>
          </div>
        </div>`;
    }
    page.innerHTML = cards;
  } catch(e) { page.innerHTML = `<div class="error">Failed to load projects.<br>${escapeHTML(e.message)}<br><br>Make sure server is running: <code>npm run gui</code></div>`; }
}

async function showProject(id) {
  activeProjectId = id;
  activeTaskId = "";
  renderNav("project");
  const page = $("#page");
  page.innerHTML = `<div class="empty">Loading...</div>`;
  try {
    const prj = await apiGet("/api/projects/" + id);
    const status = prj.statusOutput || "";
    page.innerHTML = `
      <div class="card">
        <div class="card-title" style="font-size:18px">${escapeHTML(prj.displayName)} <span style="font-size:12px;color:#8b949e">(${escapeHTML(prj.id)})</span></div>
        <div class="card-meta" style="margin-top:8px"><span>${escapeHTML(prj.rootPath)}</span></div>
        <pre style="margin-top:12px">${escapeHTML(status)}</pre>
        <div class="card-actions" style="margin-top:12px">
          <button class="btn btn-primary" onclick="location.hash='#/projects/${id}/tasks'">Tasks</button>
          <button class="btn" onclick="location.hash='#/projects/${id}/board'">Board</button>
          <button class="btn" onclick="location.hash='#/'">Back</button>
        </div>
      </div>`;
  } catch(e) { page.innerHTML = `<div class="error">${escapeHTML(e.message)}</div>`; }
}

async function showTasks(projectId) {
  activeProjectId = projectId;
  activeTaskId = "";
  renderNav("tasks");
  const page = $("#page");
  page.innerHTML = `
    <div class="flex-row">
      <h2 style="color:#c9d1d9;font-size:16px">Tasks — ${escapeHTML(projectId)}</h2>
      <button class="btn btn-primary" onclick="showCreateTask()">+ New Task</button>
      <button class="btn" onclick="location.reload()">Refresh</button>
    </div>`;
  try {
    const tasks = await apiGet("/api/tasks/" + projectId);
    if (!tasks.length) { page.innerHTML += `<div class="empty">No tasks yet.</div>`; return; }
    let html = "";
    for (const t of tasks) {
      const tid = t.taskId || t.taskid || "";
      const title = (t.title || t.Title || "");
      const st = t.status || "unknown";
      const cls = "status-" + (st === "completed" ? "completed" : st === "plan_approved" ? "plan_approved" : st === "failed" ? "failed" : "created");
      html += `
        <div class="card">
          <div class="card-title">${escapeHTML(tid)} <span class="${cls}">${escapeHTML(st)}</span></div>
          <div class="card-meta">${escapeHTML(title)}</div>
          <div class="card-meta" style="margin-top:4px">Created: ${(t.createdAt||t.createdat||"").slice(0,16)}</div>
          <div class="card-actions">
            <button class="btn btn-primary" onclick="location.hash='#/projects/${projectId}/tasks/${tid}'">View</button>
          </div>
        </div>`;
    }
    page.innerHTML += html;
  } catch(e) { page.innerHTML += `<div class="error">${escapeHTML(e.message)}</div>`; }
}

async function showTask(projectId, taskId) {
  activeProjectId = projectId;
  activeTaskId = taskId;
  renderNav("task");
  const page = $("#page");
  page.innerHTML = `<div class="empty">Loading...</div>`;
  try {
    const d = await apiGet("/api/tasks/" + projectId + "/" + taskId);
    const t = d.task || {};
    const tid = t.taskId || t.taskid || taskId;
    const title = t.title || t.Title || "";
    const st = t.status || "unknown";
    const cr = (t.createdAt || t.createdat || "").slice(0,16);
    const up = (t.updatedAt || t.updatedat || "").slice(0,16);
    const cls = "status-" + (st === "completed"?"completed":st==="plan_approved"?"plan_approved":st==="failed"?"failed":"created");

    let runsHTML = "";
    if (!d.runs.length) runsHTML = "<div>none</div>";
    else for (const r of d.runs) {
      runsHTML += `<div>- ${escapeHTML(r.runId)}: ${r.artifacts.map(a=>escapeHTML(a)).join(", ")}</div>`;
    }

    let appHTML = "";
    if (!d.approvals.length) appHTML = "<div>none</div>";
    else for (const a of d.approvals) {
      appHTML += `<div>- ${a.approvalId}: ${a.type} / ${a.status} (${(a.decidedAt||"").slice(0,16)})</div>`;
    }

    page.innerHTML = `
      <div class="card">
        <div class="card-title" style="font-size:18px">${escapeHTML(tid)} — ${escapeHTML(title)}</div>
        <div class="card-meta" style="margin-top:8px">Status: <span class="${cls}">${escapeHTML(st)}</span> &middot; Created: ${cr} &middot; Updated: ${up}</div>
        <h3 style="margin-top:12px;font-size:13px;color:#8b949e">Runs</h3>${runsHTML}
        <h3 style="margin-top:12px;font-size:13px;color:#8b949e">Approvals</h3>${appHTML}
        <div class="card-actions" style="margin-top:12px">
          <button class="btn btn-primary" onclick="doApprove('${projectId}','${taskId}')" ${st.includes("_approved")||st==="completed"?"disabled":""}>Approve Plan</button>
          <button class="btn" onclick="doReview('${projectId}','${taskId}')" ${st!=="plan_approved"&&st!=="plan_rejected"?"disabled":""}>Review</button>
          <button class="btn btn-danger" onclick="doClose('${projectId}','${taskId}')" ${st!=="completed"?"disabled":""}>Close</button>
          <button class="btn" onclick="location.hash='#/projects/${projectId}/tasks'">Back</button>
        </div>
      </div>`;
  } catch(e) { page.innerHTML = `<div class="error">${escapeHTML(e.message)}</div>`; }
}

async function showBoard(projectId) {
  activeProjectId = projectId;
  activeTaskId = "";
  renderNav("board");
  const page = $("#page");
  page.innerHTML = `<div class="flex-row"><h2 style="color:#c9d1d9;font-size:16px">Board — ${escapeHTML(projectId)}</h2><button class="btn" onclick="location.reload()">Refresh</button></div><div class="empty">Loading...</div>`;
  try {
    const data = await apiGet("/api/board/" + projectId);
    page.innerHTML = `<div class="flex-row"><h2 style="color:#c9d1d9;font-size:16px">Board — ${escapeHTML(projectId)}</h2><button class="btn" onclick="location.reload()">Refresh</button></div><pre>${escapeHTML(data.content)}</pre>`;
  } catch(e) { page.innerHTML += `<div class="error">${escapeHTML(e.message)}</div>`; }
}

// ========== Create Task ==========

let _createProjectId = "";
function showCreateTask() {
  _createProjectId = activeProjectId;
  showModal("New Task", `
    <div class="field"><label>Description</label><textarea id="create-desc" placeholder="Task description..."></textarea></div>
  `, [
    { text:"Cancel", action:hideModal },
    { text:"Create Task", cls:"btn-primary", action:async()=>{
      const desc = $("#create-desc").value.trim();
      if (!desc) { alert("Description is required."); return; }
      try {
        const r = await apiPost("/api/tasks/create", { projectId: _createProjectId, desc });
        hideModal();
        const tid = r.taskId;
        if (tid) { location.hash = "#/projects/" + _createProjectId + "/tasks/" + tid; }
        else { showTasks(_createProjectId); }
      } catch(e) { alert("Failed: " + e.message); }
    }}
  ]);
}

// ========== Modals ==========

let _modalResolve = null;
function showModal(title, bodyHTML, buttons) {
  const existing = $(".modal");
  if (existing) existing.remove();
  let btns = "";
  for (const b of buttons) {
    btns += `<button class="btn ${b.cls||""}" id="modal-btn-${b.text}">${escapeHTML(b.text)}</button>`;
  }
  const div = html(`<div class="modal"><div class="modal-content"><h3>${escapeHTML(title)}</h3>${bodyHTML}<div class="modal-actions">${btns}</div></div></div>`);
  document.body.appendChild(div);
  setTimeout(() => {
    for (const b of buttons) {
      const el = document.getElementById("modal-btn-" + b.text);
      if (el) el.onclick = b.action;
    }
  }, 50);
  return new Promise(r => { _modalResolve = r; });
}
function hideModal() {
  const m = $(".modal");
  if (m) m.remove();
  if (_modalResolve) { _modalResolve(); _modalResolve = null; }
}

async function confirmModal(title, msg) {
  return new Promise(resolve => {
    showModal(title, `<p>${escapeHTML(msg)}</p>`, [
      { text:"Cancel", action:()=>{ hideModal(); resolve(false); }},
      { text:"Confirm", cls:"btn-primary", action:()=>{ hideModal(); resolve(true); }}
    ]);
  });
}

// ========== Operations ==========

async function doApprove(pid, tid) {
  if (!await confirmModal("Approve Plan", "Approve plan for " + tid + "? This will allow building.")) return;
  try {
    const r = await apiPost("/api/tasks/" + tid + "/approve", {});
    alert(r.output);
    showTask(pid, tid);
  } catch(e) { alert("Failed: " + e.message); }
}

async function doReview(pid, tid) {
  if (!await confirmModal("Final Review", "Approve final review for " + tid + "? Task will be completed.")) return;
  try {
    const r = await apiPost("/api/tasks/" + tid + "/review", {});
    alert(r.output);
    showTask(pid, tid);
  } catch(e) { alert("Failed: " + e.message); }
}

async function doClose(pid, tid) {
  if (!await confirmModal("Close Task", "Close task " + tid + "? A summary report will be generated.")) return;
  try {
    const r = await apiPost("/api/tasks/" + tid + "/close", {});
    alert(r.output);
    showTask(pid, tid);
  } catch(e) { alert("Failed: " + e.message); }
}

// ========== Router ==========

function route() {
  const h = location.hash.slice(1) || "/";
  const m1 = h.match(/^\/projects\/([^/]+)\/tasks\/([^/]+)$/);
  if (m1) { showTask(m1[1], m1[2]); return; }
  const m2 = h.match(/^\/projects\/([^/]+)\/tasks$/);
  if (m2) { showTasks(m2[1]); return; }
  const m3 = h.match(/^\/projects\/([^/]+)\/board$/);
  if (m3) { showBoard(m3[1]); return; }
  const m4 = h.match(/^\/projects\/([^/]+)$/);
  if (m4) { showProject(m4[1]); return; }
  showProjects();
}

window.onhashchange = route;
route();
