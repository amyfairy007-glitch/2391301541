// AI Coding Console - Three-column Workbench (Phase C.5+)
const API = "";

const state = {
  projects: [],
  activeProjectId: "",
  activeTaskId: "",
  activeTab: "workbench",
  projectRailCollapsed: false,
  taskRailCollapsed: false,
  projectDrawerOpen: false,
  capabilityOpen: false,
  promptEditorOpen: false,
  promptFullscreen: false,
  banner: null,
  loadingProjects: false,
  loadingContext: false,
  loadingTaskDetail: false,
  projectDetail: null,
  taskList: [],
  taskDetail: null,
  taskFilter: "all",
  projectSearch: "",
  createTaskOpen: false,
  createTaskDesc: "",
  promptDraft: "",
  finalPromptPreview: "",
  sourceFoldoutOpen: false,
  error: ""
};

function $(sel) {
  return document.querySelector(sel);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) return "暂无";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("zh-CN", { hour12: false });
}

function shortText(value, max = 42) {
  const text = String(value ?? "");
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function normalizeTask(task) {
  const status = String(task?.status || task?.state || "unknown");
  return {
    raw: task,
    taskId: task?.taskId || task?.taskid || task?.id || "",
    title: task?.title || task?.Title || task?.name || task?.summary || task?.desc || task?.description || "未命名任务",
    description: task?.description || task?.desc || task?.summary || task?.notes || "",
    status,
    updatedAt: task?.updatedAt || task?.updatedat || task?.modifiedAt || task?.modifiedat || task?.createdAt || task?.createdat || "",
    createdAt: task?.createdAt || task?.createdat || "",
    currentAgent: task?.currentAgent || task?.agent || task?.assignedAgent || task?.executor || "",
    currentSopStep: task?.currentSopStep || task?.sopStep || task?.currentStep || task?.step || "",
    nextStep: task?.nextStep || task?.nextAction || task?.next || ""
  };
}

function parseProjectStatus(statusOutput, projectRecord) {
  const summary = {
    gitBranch: null,
    gitDirty: null,
    gitRemote: projectRecord?.gitRemote || projectRecord?.gitremote || null,
    agentsMd: Boolean(projectRecord?.hasAgentsMd || projectRecord?.hasagentsmd),
    aiMemory: Boolean(projectRecord?.hasAiMemory || projectRecord?.hasaimemory),
    projectState: projectRecord?.takeoverStatus || projectRecord?.takeoverstatus || "unknown"
  };

  const lines = String(statusOutput || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const branchMatch = line.match(/(?:git\s*)?branch\s*[:=]\s*(.+)$/i);
    if (branchMatch && !summary.gitBranch) summary.gitBranch = branchMatch[1].trim();

    const remoteMatch = line.match(/(?:git\s*)?remote\s*[:=]\s*(.+)$/i);
    if (remoteMatch && !summary.gitRemote) summary.gitRemote = remoteMatch[1].trim();

    const dirtyMatch = line.match(/(?:git\s*)?(?:dirty|status)\s*[:=]\s*(.+)$/i);
    if (dirtyMatch && summary.gitDirty === null) {
      const value = dirtyMatch[1].trim().toLowerCase();
      summary.gitDirty = value.includes("dirty") || value.includes("modified") || value === "true" || value === "yes";
    }

    if (/dirty/i.test(line) && summary.gitDirty === null) {
      summary.gitDirty = true;
    }

    const agentsMatch = line.match(/AGENTS\.md.*?(present|missing|yes|no)/i);
    if (agentsMatch) summary.agentsMd = /present|yes/i.test(agentsMatch[1]);

    const memoryMatch = line.match(/\.ai\/?.*?(present|missing|yes|no)/i);
    if (memoryMatch) summary.aiMemory = /present|yes/i.test(memoryMatch[1]);

    const stateMatch = line.match(/(?:project\s*)?state\s*[:=]\s*(.+)$/i);
    if (stateMatch && summary.projectState === "unknown") summary.projectState = stateMatch[1].trim();
  }

  return summary;
}

async function apiGet(path) {
  const response = await fetch(API + path);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || response.statusText);
  }
  return response.json();
}

async function apiPost(path, body) {
  const response = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.output || response.statusText);
  return data;
}

function setBanner(type, text) {
  state.banner = text ? { type, text } : null;
}

function setError(text) {
  state.error = text || "";
}

function isTaskStatus(task, keyword) {
  return String(task?.status || "").toLowerCase().includes(keyword);
}

function classifyTask(task) {
  const status = String(task?.status || "").toLowerCase();
  if (status.includes("complete") || status.includes("done")) return "completed";
  if (status.includes("wait") || status.includes("review") || status.includes("approval") || status.includes("approve")) return "waiting";
  if (status.includes("run") || status.includes("active") || status.includes("progress") || status.includes("start") || status.includes("processing")) return "progress";
  return "progress";
}

function taskFilterMatches(task) {
  const bucket = classifyTask(task);
  if (state.taskFilter === "all") return true;
  if (state.taskFilter === "progress") return bucket === "progress";
  if (state.taskFilter === "waiting") return bucket === "waiting";
  if (state.taskFilter === "completed") return bucket === "completed";
  return true;
}

function getProjectById(projectId) {
  return state.projects.find((project) => project.id === projectId) || null;
}

function getSelectedProject() {
  return state.projectDetail || getProjectById(state.activeProjectId);
}

function getSelectedTask() {
  return state.taskList.find((task) => task.taskId === state.activeTaskId) || null;
}

function getTaskDetailTask() {
  return state.taskDetail?.task ? normalizeTask(state.taskDetail.task) : getSelectedTask();
}

function taskActionModel(task) {
  if (!task) {
    return {
      title: "当前项目暂无 Task",
      description: "请先在中栏创建一个任务，右栏才会进入任务工作流。",
      currentStep: "尚未选择 Task",
      nextStep: "点击 [新建任务] 进入任务创建流程",
      buttonLabel: "新建任务",
      action: "create-task"
    };
  }

  const status = String(task.status || "").toLowerCase();
  if (status.includes("complete") || status.includes("done")) {
    return {
      title: task.title,
      description: task.description || "",
      currentStep: task.currentSopStep || "已完成",
      nextStep: "查看结果并验收",
      buttonLabel: "查看结果并验收",
      action: "artifact"
    };
  }

  if (status.includes("wait") || status.includes("review") || status.includes("approval") || status.includes("approve")) {
    return {
      title: task.title,
      description: task.description || "",
      currentStep: task.currentSopStep || "等待审批",
      nextStep: "查看计划并批准",
      buttonLabel: "查看计划并批准",
      action: "approvals"
    };
  }

  if (status.includes("run") || status.includes("active") || status.includes("progress") || status.includes("start") || status.includes("processing")) {
    return {
      title: task.title,
      description: task.description || "",
      currentStep: task.currentSopStep || "执行中",
      nextStep: "查看执行输出",
      buttonLabel: "查看执行输出",
      action: "agent"
    };
  }

  return {
    title: task.title,
    description: task.description || "",
    currentStep: task.currentSopStep || "待开始",
    nextStep: "生成 Prompt 与 SOP",
    buttonLabel: "生成 Prompt 与 SOP",
    action: "prompt"
  };
}

function parseHash() {
  const hash = location.hash.replace(/^#/, "");
  const match = hash.match(/^\/projects\/([^/]+)(?:\/tasks\/([^/]+))?$/);
  if (!match) return { projectId: "", taskId: "" };
  return {
    projectId: decodeURIComponent(match[1]),
    taskId: match[2] ? decodeURIComponent(match[2]) : ""
  };
}

function setHash(projectId, taskId = "") {
  if (!projectId) return;
  const target = taskId ? `#/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}` : `#/projects/${encodeURIComponent(projectId)}`;
  if (location.hash !== target) location.hash = target;
}

function setTab(tab) {
  state.activeTab = tab;
  render();
}

function toggleProjectRail() {
  state.projectRailCollapsed = !state.projectRailCollapsed;
  render();
}

function toggleTaskRail() {
  state.taskRailCollapsed = !state.taskRailCollapsed;
  render();
}

function toggleProjectDrawer() {
  state.projectDrawerOpen = !state.projectDrawerOpen;
  render();
}

function toggleCapabilityPanel() {
  state.capabilityOpen = !state.capabilityOpen;
  render();
}

function togglePromptEditor() {
  state.promptEditorOpen = !state.promptEditorOpen;
  render();
}

function togglePromptFullscreen() {
  state.promptFullscreen = !state.promptFullscreen;
  render();
}

function setTaskFilter(filter) {
  state.taskFilter = filter;
  render();
}

function setProjectSearch(value) {
  state.projectSearch = value;
  render();
}

function setCreateTaskDesc(value) {
  state.createTaskDesc = value;
}

function setPromptDraft(value) {
  state.promptDraft = value;
}

function openCreateTaskModal() {
  state.createTaskOpen = true;
  state.createTaskDesc = "";
  setBanner(null, "");
  render();
}

function closeModal() {
  state.createTaskOpen = false;
  render();
}

function showStageNotice() {
  setBanner("warn", "阶段 C.6 能力尚未接入，当前仅保留工作台布局与占位交互。");
  render();
}

function executePrimaryAction() {
  const task = getTaskDetailTask() || getSelectedTask();
  const model = taskActionModel(task);

  if (model.action === "create-task") {
    openCreateTaskModal();
    return;
  }

  if (model.action === "prompt") {
    state.activeTab = "prompt";
    showStageNotice();
    return;
  }

  if (model.action === "approvals") {
    state.activeTab = "approvals";
    render();
    return;
  }

  if (model.action === "agent") {
    state.activeTab = "agent";
    render();
    return;
  }

  if (model.action === "artifact") {
    state.activeTab = "artifact";
    render();
  }
}

function previewFinalPrompt() {
  const task = getTaskDetailTask() || getSelectedTask();
  state.finalPromptPreview = [
    "阶段 C.6 能力尚未接入，无法生成真实最终 Agent Prompt。",
    `当前任务：${task ? task.title : "暂无 Task"}`,
    "后续会在这里组合：用户补充要求 + Capability / SOP + Source 引用。"
  ].join("\n");
  setBanner("info", "已刷新最终 Prompt 预览占位。");
  render();
}

async function submitCreateTask() {
  const projectId = state.activeProjectId;
  const desc = state.createTaskDesc.trim();
  if (!projectId) {
    setBanner("error", "请先选择一个项目。");
    render();
    return;
  }
  if (!desc) {
    setBanner("error", "任务描述不能为空。");
    render();
    return;
  }

  setBanner("info", "正在创建任务...");
  render();

  try {
    const result = await apiPost("/api/tasks/create", { projectId, desc });
    closeModal();
    setBanner("success", "任务已创建，正在刷新工作台。");
    render();
    const nextTaskId = result.taskId || "";
    await selectContext(projectId, nextTaskId);
    if (nextTaskId) setHash(projectId, nextTaskId);
  } catch (error) {
    setBanner("error", `创建任务失败：${error.message}`);
    render();
  }
}

async function approveTask() {
  const task = getTaskDetailTask();
  if (!task?.taskId) return;
  if (!confirm(`Approve plan for ${task.taskId}?`)) return;
  try {
    const result = await apiPost(`/api/tasks/${encodeURIComponent(task.taskId)}/approve`, {});
    setBanner(result.ok ? "success" : "error", result.output || "审批已提交。");
    await refreshActiveTask();
  } catch (error) {
    setBanner("error", `审批失败：${error.message}`);
    render();
  }
}

async function reviewTask() {
  const task = getTaskDetailTask();
  if (!task?.taskId) return;
  if (!confirm(`Review ${task.taskId}?`)) return;
  try {
    const result = await apiPost(`/api/tasks/${encodeURIComponent(task.taskId)}/review`, {});
    setBanner(result.ok ? "success" : "error", result.output || "验收已提交。");
    await refreshActiveTask();
  } catch (error) {
    setBanner("error", `验收失败：${error.message}`);
    render();
  }
}

async function closeTask() {
  const task = getTaskDetailTask();
  if (!task?.taskId) return;
  if (!confirm(`Close ${task.taskId}?`)) return;
  try {
    const result = await apiPost(`/api/tasks/${encodeURIComponent(task.taskId)}/close`, {});
    setBanner(result.ok ? "success" : "error", result.output || "关闭已提交。");
    await refreshActiveTask();
  } catch (error) {
    setBanner("error", `关闭失败：${error.message}`);
    render();
  }
}

async function loadProjects() {
  state.loadingProjects = true;
  render();
  try {
    const projects = await apiGet("/api/projects");
    state.projects = Array.isArray(projects) ? projects : [];
    setError("");
  } catch (error) {
    setError(error.message);
    state.projects = [];
  } finally {
    state.loadingProjects = false;
    render();
  }
}

async function selectContext(projectId, taskId = "") {
  if (!projectId) {
    state.activeProjectId = "";
    state.activeTaskId = "";
    state.projectDetail = null;
    state.taskList = [];
    state.taskDetail = null;
    render();
    return;
  }

  state.activeProjectId = projectId;
  state.activeTaskId = taskId || "";
  state.projectDetail = null;
  state.taskList = [];
  state.taskDetail = null;
  state.loadingContext = true;
  state.loadingTaskDetail = false;
  setError("");
  render();

  try {
    const [projectDetail, taskListRaw] = await Promise.all([
      apiGet(`/api/projects/${encodeURIComponent(projectId)}`),
      apiGet(`/api/tasks/${encodeURIComponent(projectId)}`)
    ]);

    const normalizedProject = projectDetail || {};
    const normalizedSummary = normalizedProject.statusSummary || parseProjectStatus(normalizedProject.statusOutput, normalizedProject);
    state.projectDetail = { ...normalizedProject, statusSummary: normalizedSummary };
    state.taskList = Array.isArray(taskListRaw) ? taskListRaw.map(normalizeTask) : [];

    const preferredTaskId = taskId || state.activeTaskId;
    const preferredTask = state.taskList.find((item) => item.taskId === preferredTaskId) || state.taskList[0] || null;
    state.activeTaskId = preferredTask ? preferredTask.taskId : "";
    state.loadingContext = false;
    render();

    if (state.activeTaskId) {
      await refreshActiveTask();
    } else {
      state.taskDetail = null;
      render();
    }
  } catch (error) {
    state.loadingContext = false;
    setError(error.message);
    render();
  }
}

async function refreshActiveTask() {
  if (!state.activeProjectId || !state.activeTaskId) {
    state.taskDetail = null;
    render();
    return;
  }

  state.loadingTaskDetail = true;
  render();
  try {
    const detail = await apiGet(`/api/tasks/${encodeURIComponent(state.activeProjectId)}/${encodeURIComponent(state.activeTaskId)}`);
    if (state.activeTaskId) {
      state.taskDetail = detail;
    }
  } catch (error) {
    setBanner("error", `任务详情加载失败：${error.message}`);
    state.taskDetail = null;
  } finally {
    state.loadingTaskDetail = false;
    render();
  }
}

async function handleRoute() {
  const route = parseHash();
  const projectId = route.projectId || state.activeProjectId || state.projects[0]?.id || "";
  const taskId = route.taskId || "";
  await selectContext(projectId, taskId);
}

function renderProjectRail() {
  const project = getSelectedProject();
  const railClass = state.projectRailCollapsed ? "rail collapsed" : "rail";
  const visibleProjects = state.projects.filter((item) => {
    const query = state.projectSearch.trim().toLowerCase();
    if (!query) return true;
    return [item.displayName, item.id, item.rootPath]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(query));
  });
  const items = visibleProjects.length
    ? visibleProjects.map((item) => {
        const active = item.id === state.activeProjectId ? "active" : "";
        const status = item.statusSummary?.projectState || item.takeoverStatus || "unknown";
        return `
          <button class="project-item ${active}" onclick="window.consoleWorkbench.navigateProject(${escapeHTML(JSON.stringify(item.id))})">
            <span class="project-dot"></span>
            <span class="project-meta">
              <strong>${escapeHTML(item.displayName || item.id)}</strong>
              <small>${escapeHTML(status)}</small>
            </span>
          </button>
        `;
      }).join("")
    : `<div class="empty-state compact">${state.loadingProjects ? "项目加载中..." : "暂无已登记项目"}<span>请通过 CLI 先登记项目。</span></div>`;

  return `
    <aside class="${railClass}">
      <div class="rail-header">
        <div>
          <span class="rail-kicker">Project</span>
          <h2>项目</h2>
        </div>
        <button class="icon-btn" onclick="window.consoleWorkbench.toggleProjectRail()" title="${state.projectRailCollapsed ? "展开项目栏" : "折叠项目栏"}" aria-label="${state.projectRailCollapsed ? "展开项目栏" : "折叠项目栏"}">${state.projectRailCollapsed ? "»" : "«"}</button>
      </div>
      <div class="rail-body">
        ${state.projectRailCollapsed ? `
          <button class="rail-expand-button" onclick="window.consoleWorkbench.toggleProjectRail()" title="展开项目栏" aria-label="展开项目栏">
            <span class="rail-expand-icon">»</span>
            <span class="rail-expand-label">展开项目栏</span>
          </button>
        ` : `
        <div class="rail-toolbar project-toolbar">
          <input class="project-search" type="search" placeholder="搜索项目" value="${escapeHTML(state.projectSearch)}" oninput="window.consoleWorkbench.setProjectSearch(this.value)">
          <span class="rail-hint">上下文边界始终可见</span>
        </div>
        <div class="rail-list">${items}</div>
        ${!visibleProjects.length ? `<div class="empty-state compact">未找到匹配项目<span>试试搜索别的名称或路径。</span></div>` : ""}
        <div class="rail-footer">
          <button class="ghost-btn project-detail-rail" onclick="window.consoleWorkbench.toggleProjectDrawer()">项目详情</button>
          <span class="rail-hint">Git / AGENTS / .ai 收纳在抽屉里</span>
        </div>
        `}
        ${state.projectRailCollapsed ? "" : `
          <div class="rail-footer">
            <div class="mini-summary">
              <span>当前项目</span>
              <strong>${project ? escapeHTML(project.displayName || project.id) : "未选择"}</strong>
            </div>
          </div>
        `}
      </div>
    </aside>
  `;
}

function renderTaskFilters() {
  const filters = [
    { key: "all", label: "全部" },
    { key: "progress", label: "进行中" },
    { key: "waiting", label: "等待我处理" },
    { key: "completed", label: "已完成" }
  ];
  return filters.map((filter) => `
    <button class="filter-chip ${state.taskFilter === filter.key ? "active" : ""}" onclick="window.consoleWorkbench.setTaskFilter(${escapeHTML(JSON.stringify(filter.key))})">
      ${escapeHTML(filter.label)}
    </button>
  `).join("");
}

function renderTaskRail() {
  const railClass = state.taskRailCollapsed ? "rail task-rail collapsed" : "rail task-rail";
  const visibleTasks = state.taskList.filter(taskFilterMatches);
  const selectedTask = getSelectedTask();
  const taskItems = visibleTasks.length
    ? visibleTasks.map((task) => {
        const active = task.taskId === state.activeTaskId ? "active" : "";
        const updatedAt = task.updatedAt ? formatDate(task.updatedAt) : "暂无更新时间";
        const status = task.status || "unknown";
        return `
          <button class="task-card ${active}" onclick="window.consoleWorkbench.navigateTask(${escapeHTML(JSON.stringify(task.taskId))})">
            <div class="task-card-head">
              <strong>${escapeHTML(shortText(task.title, state.taskRailCollapsed ? 16 : 28))}</strong>
              <span class="status-tag">${escapeHTML(status)}</span>
            </div>
            ${state.taskRailCollapsed ? "" : `
              <div class="task-card-body">
                <span>${escapeHTML(updatedAt)}</span>
                <span>当前 Agent：${task.currentAgent ? escapeHTML(shortText(task.currentAgent, 18)) : "暂无"}</span>
                <span>当前 SOP：${task.currentSopStep ? escapeHTML(shortText(task.currentSopStep, 18)) : "暂无"}</span>
              </div>
            `}
          </button>
        `;
      }).join("")
    : `<div class="empty-state">${state.loadingContext ? "Task 加载中..." : "当前项目暂无 Task"}<span>点击 [+ 新建任务] 开始工作。</span></div>`;

  return `
    <aside class="${railClass}">
      <div class="rail-header">
        <div>
          <span class="rail-kicker">Task</span>
          <h2>当前项目 Task</h2>
        </div>
        <button class="icon-btn" onclick="window.consoleWorkbench.toggleTaskRail()" title="收窄 / 展开">${state.taskRailCollapsed ? "»" : "«"}</button>
      </div>
      <div class="rail-body">
        <div class="task-rail-top">
          <button class="primary-btn" onclick="window.consoleWorkbench.openCreateTaskModal()">+ 新建任务</button>
          <div class="filter-row">
            ${renderTaskFilters()}
          </div>
        </div>
        <div class="rail-list">${taskItems}</div>
        ${state.taskRailCollapsed ? "" : `
          <div class="rail-footer">
            <div class="mini-summary">
              <span>当前选中</span>
              <strong>${selectedTask ? escapeHTML(selectedTask.title) : "暂无 Task"}</strong>
            </div>
          </div>
        `}
      </div>
    </aside>
  `;
}

function renderContextStrip() {
  const project = getSelectedProject();
  const task = getTaskDetailTask() || getSelectedTask();
  const summary = project?.statusSummary || parseProjectStatus(project?.statusOutput, project || {});
  const gitDirty = summary?.gitDirty === null ? "未知" : summary.gitDirty ? "dirty" : "clean";
  return `
    <div class="context-strip">
      <div class="context-title">
        <div>
          <span class="rail-kicker">Workspace</span>
          <h2>${project ? escapeHTML(project.displayName || project.id) : "未选择项目"}</h2>
        </div>
        <div class="context-actions">
          <button class="ghost-btn" onclick="window.consoleWorkbench.refreshCurrentContext()">刷新</button>
          <button class="ghost-btn" onclick="window.consoleWorkbench.toggleProjectDrawer()">项目详情</button>
          <button class="ghost-btn" onclick="window.consoleWorkbench.showBannerNotice()">C.6 提示</button>
        </div>
      </div>
      <div class="context-grid">
        <div class="context-item"><span>项目路径</span><strong>${project?.rootPath ? escapeHTML(project.rootPath) : "暂无"}</strong></div>
        <div class="context-item"><span>当前 Task</span><strong>${task ? escapeHTML(task.title) : "暂无 Task"}</strong></div>
        <div class="context-item"><span>Task 状态</span><strong>${task?.status ? escapeHTML(task.status) : "暂无"}</strong></div>
        <div class="context-item"><span>当前 Agent</span><strong>${task?.currentAgent ? escapeHTML(task.currentAgent) : "暂无"}</strong></div>
        <div class="context-item"><span>当前 Capability / SOP</span><strong>${task?.currentSopStep ? escapeHTML(task.currentSopStep) : "暂无"}</strong></div>
        <div class="context-item"><span>Git</span><strong>${summary?.gitBranch ? `branch: ${escapeHTML(summary.gitBranch)} · ${escapeHTML(gitDirty)}` : escapeHTML(gitDirty)}</strong></div>
      </div>
    </div>
  `;
}

function renderWorkspaceTab() {
  const task = getTaskDetailTask() || getSelectedTask();
  const model = taskActionModel(task);
  const description = task?.description || task?.raw?.description || task?.raw?.desc || "";
  const currentStep = task?.currentSopStep || "暂无";
  const nextStep = task?.nextStep || model.nextStep;
  const status = task?.status || "暂无";
  const empty = !task;

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <span class="panel-kicker">工作区</span>
          <h3>${empty ? "请选择一个 Task" : escapeHTML(task.title)}</h3>
        </div>
        <button class="primary-btn" onclick="window.consoleWorkbench.executePrimaryAction()">${escapeHTML(model.buttonLabel)}</button>
      </div>
      <div class="panel-body">
        ${empty ? `
          <div class="empty-state roomy">
            <strong>当前项目还没有选中的 Task。</strong>
            <span>请从中栏选择一个 Task，或者先创建一个新任务。</span>
          </div>
        ` : `
          <div class="work-summary-grid">
            <div class="summary-card">
              <span>Task 描述</span>
              <p>${description ? escapeHTML(description) : "暂无结构化任务说明"}</p>
            </div>
            <div class="summary-card">
              <span>当前状态</span>
              <p>${escapeHTML(status)}</p>
            </div>
            <div class="summary-card">
              <span>当前步骤</span>
              <p>${escapeHTML(currentStep)}</p>
            </div>
            <div class="summary-card">
              <span>下一步引导</span>
              <p>${escapeHTML(nextStep)}</p>
            </div>
          </div>
          <div class="callout ${task ? "" : "empty"}">
            <strong>${escapeHTML(model.title)}</strong>
            <span>${escapeHTML(model.description)}</span>
          </div>
        `}
      </div>
    </section>
  `;
}

function renderPromptTab() {
  const task = getTaskDetailTask() || getSelectedTask();
  const promptPreview = state.finalPromptPreview || [
    "阶段 C.6 能力尚未接入，当前无法生成真实最终 Prompt。",
    `当前任务：${task ? task.title : "暂无 Task"}`,
    "这里将预留：用户补充要求 + Capability / SOP + Source 引用 + 最终 Prompt 预览。"
  ].join("\n");

  return `
    <section class="panel tab-panel ${state.promptFullscreen ? "fullscreen" : ""}">
      <div class="panel-head">
        <div>
          <span class="panel-kicker">Prompt 与 SOP</span>
          <h3>Prompt Builder 预留区</h3>
        </div>
        <div class="panel-actions">
          <button class="ghost-btn" onclick="window.consoleWorkbench.toggleCapabilityPanel()">选择能力</button>
          <button class="ghost-btn" onclick="window.consoleWorkbench.togglePromptEditor()">${state.promptEditorOpen ? "收起大编辑器" : "展开大编辑器"}</button>
          <button class="ghost-btn" onclick="window.consoleWorkbench.togglePromptFullscreen()">${state.promptFullscreen ? "退出全屏" : "全屏"}</button>
        </div>
      </div>
      <div class="panel-body prompt-body">
        <div class="stacked ${state.capabilityOpen ? "open" : ""}">
          <button class="stacked-toggle" onclick="window.consoleWorkbench.toggleCapabilityPanel()">
            <span>能力区</span>
            <strong>Capability Registry 尚未初始化</strong>
          </button>
          ${state.capabilityOpen ? `
            <div class="stacked-content">
              <p>后续可浏览：Skill / SOP / Script / Prompt Template / Capability Pack。</p>
              <p>当前阶段只保留布局、入口和筛选位置，不写死能力清单。</p>
            </div>
          ` : ""}
        </div>

        <div class="stacked ${state.promptEditorOpen ? "open" : ""}">
          <button class="stacked-toggle" onclick="window.consoleWorkbench.togglePromptEditor()">
            <span>大 Prompt 编辑器</span>
            <strong>${state.promptEditorOpen ? "已展开" : "默认折叠"}</strong>
          </button>
          ${state.promptEditorOpen ? `
            <div class="prompt-editor-layout">
              <div class="editor-column">
                <label>用户补充要求</label>
                <textarea class="prompt-textarea" oninput="window.consoleWorkbench.setPromptDraft(this.value)" placeholder="在这里补充本次任务需要强调的要求、边界、偏好和约束。">${escapeHTML(state.promptDraft)}</textarea>
                <div class="helper-text">这里仅保留当前页面会话草稿，不会写入真实 Prompt 数据。</div>
              </div>
              <div class="editor-column">
                <label>最终 Agent Prompt 预览</label>
                <pre class="prompt-preview">${escapeHTML(promptPreview)}</pre>
                <div class="helper-text">用户补充要求 ≠ 最终 Agent Prompt。后者将在 C.6 接入后由系统组合。</div>
              </div>
            </div>
            <div class="source-foldout">
              <button class="stacked-toggle secondary" onclick="window.consoleWorkbench.toggleSourceFoldout()">
                <span>Source 引用</span>
                <strong>折叠区预留</strong>
              </button>
              ${state.sourceFoldoutOpen ? `
                <div class="stacked-content grid-two">
                  <div>
                    <strong>未来来源</strong>
                    <ul>
                      <li>原始想法输入</li>
                      <li>结构化任务说明</li>
                      <li>Capability / SOP 选择</li>
                      <li>用户补充要求</li>
                      <li>最终 Prompt 预览</li>
                    </ul>
                  </div>
                  <div>
                    <strong>当前阶段</strong>
                    <ul>
                      <li>不生成真实 Prompt</li>
                      <li>不保存真实 Prompt</li>
                      <li>不读取未来 registry 文件</li>
                    </ul>
                  </div>
                </div>
              ` : ""}
            </div>
            <div class="button-row">
              <button class="primary-btn" onclick="window.consoleWorkbench.savePromptDraft()">保存草稿</button>
              <button class="ghost-btn" onclick="window.consoleWorkbench.previewFinalPrompt()">预览最终 Prompt</button>
              <button class="ghost-btn" onclick="window.consoleWorkbench.showBannerNotice()">执行当前步骤</button>
            </div>
          ` : `
            <div class="stacked-content roomy">
              <strong>大 Prompt 编辑器默认折叠。</strong>
              <p>展开后会占据右栏主区域，支持长文本编辑与近似全屏模式。</p>
            </div>
          `}
        </div>
      </div>
    </section>
  `;
}

function renderAgentTab() {
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <span class="panel-kicker">Agent 输出</span>
          <h3>尚未执行</h3>
        </div>
        <button class="ghost-btn" onclick="window.consoleWorkbench.showBannerNotice()">预留输出面板</button>
      </div>
      <div class="panel-body">
        <div class="empty-state roomy">
          <strong>当前阶段尚未接入真实 Agent。</strong>
          <span>这里会预留计划输出、实时日志、最终回复、Run 状态、错误信息和停止 / 重试入口，但不会生成假日志。</span>
        </div>
        <div class="future-stack">
          <div class="future-card">计划输出</div>
          <div class="future-card">实时日志</div>
          <div class="future-card">最终回复</div>
          <div class="future-card">Run 状态</div>
          <div class="future-card">错误信息</div>
          <div class="future-card">停止 / 重试</div>
        </div>
      </div>
    </section>
  `;
}

function renderArtifactTab() {
  const taskDetail = state.taskDetail || {};
  const task = getTaskDetailTask() || getSelectedTask();
  const runs = Array.isArray(taskDetail.runs) ? taskDetail.runs : [];

  const runGroups = runs.length
    ? runs.map((run) => {
        const artifacts = Array.isArray(run.artifacts) ? run.artifacts : [];
        return `
          <article class="artifact-group">
            <div class="artifact-group-head">
              <strong>${escapeHTML(run.runId || "Run")}</strong>
              <span>${artifacts.length ? `${artifacts.length} 个产物` : "暂无产物"}</span>
            </div>
            <div class="artifact-list">
              ${artifacts.length ? artifacts.map((artifact) => `<div class="artifact-row">${escapeHTML(artifact)}</div>`).join("") : `<div class="artifact-row muted">Run 目录已预留，当前无 Artifact。</div>`}
            </div>
          </article>
        `;
      }).join("")
    : "";

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <span class="panel-kicker">产物</span>
          <h3>Task → SOP 步骤 → Run → Artifact</h3>
        </div>
        <button class="ghost-btn" onclick="window.consoleWorkbench.showBannerNotice()">产物筛选预留</button>
      </div>
      <div class="panel-body">
        ${task ? `
          <div class="callout">
            <strong>当前 Task：${escapeHTML(task.title)}</strong>
            <span>未来会按 SOP 步骤分组查看报告、日志、图片、Markdown、JSON。当前只展示结构骨架和已有真实条目。</span>
          </div>
        ` : `
          <div class="empty-state roomy">
            <strong>当前没有可浏览的产物。</strong>
            <span>先选择一个 Task，再在后续阶段通过 Run 产出 Artifact。</span>
          </div>
        `}

        ${runGroups || `<div class="empty-state roomy"><strong>暂无 Run。</strong><span>当前不会创建任何 artifact-index.json，也不会伪造测试产物。</span></div>`}
      </div>
    </section>
  `;
}

function renderApprovalsTab() {
  const taskDetail = state.taskDetail || {};
  const task = getTaskDetailTask() || getSelectedTask();
  const approvals = Array.isArray(taskDetail.approvals) ? taskDetail.approvals : [];
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <span class="panel-kicker">审批</span>
          <h3>任务状态与已有审批</h3>
        </div>
        <div class="panel-actions">
          <button class="ghost-btn" onclick="window.consoleWorkbench.approveTask()">Approve</button>
          <button class="ghost-btn" onclick="window.consoleWorkbench.reviewTask()">Review</button>
          <button class="ghost-btn" onclick="window.consoleWorkbench.closeTask()">Close</button>
        </div>
      </div>
      <div class="panel-body">
        ${task ? `
          <div class="summary-card wide">
            <span>当前 Task 状态</span>
            <p>${escapeHTML(task.status || "暂无")}</p>
          </div>
        ` : `<div class="empty-state roomy"><strong>尚未选中 Task。</strong><span>没有可展示的审批信息。</span></div>`}

        ${approvals.length ? approvals.map((item) => `
          <article class="approval-card">
            <strong>${escapeHTML(item.approvalId || item.id || "审批记录")}</strong>
            <div class="approval-meta">
              <span>类型：${escapeHTML(item.type || "unknown")}</span>
              <span>状态：${escapeHTML(item.status || "unknown")}</span>
              <span>时间：${escapeHTML(formatDate(item.decidedAt || item.createdAt || item.updatedAt || ""))}</span>
            </div>
          </article>
        `).join("") : `<div class="empty-state roomy"><strong>当前没有已有审批。</strong><span>这里不会新增审批逻辑，只保留已有状态与记录的展示位置。</span></div>`}
      </div>
    </section>
  `;
}

function renderTabs() {
  const tabs = [
    ["workbench", "工作区"],
    ["prompt", "Prompt 与 SOP"],
    ["agent", "Agent 输出"],
    ["artifact", "产物"],
    ["approvals", "审批"]
  ];

  const tabButtons = tabs.map(([key, label]) => `
    <button class="tab-btn ${state.activeTab === key ? "active" : ""}" onclick="window.consoleWorkbench.setTab(${escapeHTML(JSON.stringify(key))})">${escapeHTML(label)}</button>
  `).join("");

  let tabContent = renderWorkspaceTab();
  if (state.activeTab === "prompt") tabContent = renderPromptTab();
  if (state.activeTab === "agent") tabContent = renderAgentTab();
  if (state.activeTab === "artifact") tabContent = renderArtifactTab();
  if (state.activeTab === "approvals") tabContent = renderApprovalsTab();

  return `
    <div class="tab-strip">${tabButtons}</div>
    <div class="tab-content">${tabContent}</div>
  `;
}

function renderProjectDrawer() {
  if (!state.projectDrawerOpen) return "";
  const project = getSelectedProject();
  const summary = project?.statusSummary || parseProjectStatus(project?.statusOutput, project || {});
  return `
    <div class="drawer-mask" onclick="window.consoleWorkbench.toggleProjectDrawer()"></div>
    <aside class="drawer-panel">
      <div class="drawer-head">
        <div>
          <span class="rail-kicker">Project Detail</span>
          <h3>${project ? escapeHTML(project.displayName || project.id) : "项目详情"}</h3>
        </div>
        <button class="icon-btn" onclick="window.consoleWorkbench.toggleProjectDrawer()">×</button>
      </div>
      <div class="drawer-body">
        <div class="detail-card">
          <span>项目路径</span>
          <strong>${project?.rootPath ? escapeHTML(project.rootPath) : "暂无"}</strong>
        </div>
        <div class="detail-grid">
          <div class="detail-card"><span>Git 分支</span><strong>${summary?.gitBranch ? escapeHTML(summary.gitBranch) : "暂无"}</strong></div>
          <div class="detail-card"><span>Git dirty</span><strong>${summary?.gitDirty === null ? "暂无" : summary.gitDirty ? "dirty" : "clean"}</strong></div>
          <div class="detail-card"><span>Git remote</span><strong>${summary?.gitRemote ? escapeHTML(summary.gitRemote) : "暂无"}</strong></div>
          <div class="detail-card"><span>AGENTS.md</span><strong>${summary?.agentsMd ? "存在" : "暂无"}</strong></div>
          <div class="detail-card"><span>.ai / AI Memory</span><strong>${summary?.aiMemory ? "存在" : "暂无"}</strong></div>
          <div class="detail-card"><span>项目状态</span><strong>${escapeHTML(summary?.projectState || "unknown")}</strong></div>
        </div>
        <div class="detail-card full">
          <span>注册信息</span>
          <strong>${project?.addedAt ? escapeHTML(formatDate(project.addedAt)) : "暂无"}</strong>
        </div>
        <div class="detail-note">
          Git、AGENTS.md、`.ai` 仅做结构化展示，不在首页铺开，也不重建 CLI 状态逻辑。
        </div>
      </div>
    </aside>
  `;
}

function renderModal() {
  if (!state.createTaskOpen) return "";
  return `
    <div class="modal-mask" onclick="window.consoleWorkbench.closeModal()"></div>
    <div class="modal-panel" onclick="event.stopPropagation()">
      <div class="modal-head">
        <h3>新建任务</h3>
        <button class="icon-btn" onclick="window.consoleWorkbench.closeModal()">×</button>
      </div>
      <div class="modal-body">
        <label>任务描述</label>
        <textarea class="modal-textarea" oninput="window.consoleWorkbench.setCreateTaskDesc(this.value)" placeholder="输入本次任务的描述...">${escapeHTML(state.createTaskDesc)}</textarea>
        <div class="helper-text">这会调用现有 CLI / API 创建真实 Task，但不会自动创建测试数据以外的内容。</div>
      </div>
      <div class="modal-actions">
        <button class="ghost-btn" onclick="window.consoleWorkbench.closeModal()">取消</button>
        <button class="primary-btn" onclick="window.consoleWorkbench.submitCreateTask()">创建任务</button>
      </div>
    </div>
  `;
}

function renderBanner() {
  if (!state.banner) return "";
  return `<div class="banner ${escapeHTML(state.banner.type)}">${escapeHTML(state.banner.text)}</div>`;
}

function renderMain() {
  const left = renderProjectRail();
  const middle = renderTaskRail();
  const project = getSelectedProject();
  const shellClass = [
    "workbench-shell",
    state.projectRailCollapsed ? "project-collapsed" : "",
    state.taskRailCollapsed ? "task-collapsed" : ""
  ].join(" ");

  return `
    <div class="app-bg"></div>
    <div class="app-shell ${shellClass}">
      <header class="topbar">
        <div>
          <span class="app-kicker">AI Coding Console</span>
          <h1>新版 Web 工作台</h1>
        </div>
        <div class="topbar-actions">
          <span class="topbar-badge">C.5 / Workbench</span>
          <button class="ghost-btn" onclick="window.consoleWorkbench.refreshCurrentContext()">刷新</button>
          <button class="ghost-btn" onclick="window.consoleWorkbench.toggleProjectDrawer()">项目详情</button>
        </div>
      </header>

      <div class="workbench-grid">
        ${left}
        ${middle}
        <main class="workspace">
          ${renderBanner()}
          ${state.error ? `<div class="error-banner">${escapeHTML(state.error)}</div>` : ""}
          ${renderContextStrip()}
          ${renderTabs()}
        </main>
      </div>
      ${renderProjectDrawer()}
      ${renderModal()}
    </div>
  `;
}

function render() {
  const root = $("#app");
  if (!root) return;
  root.innerHTML = renderMain();
}

async function refreshCurrentContext() {
  await handleRoute();
}

function showBannerNotice() {
  showStageNotice();
}

function savePromptDraft() {
  setBanner("success", "草稿仅保留在当前页面会话，不会写入真实 Prompt 数据。");
  render();
}

function toggleSourceFoldout() {
  state.sourceFoldoutOpen = !state.sourceFoldoutOpen;
  render();
}

function navigateProject(projectId) {
  setHash(projectId);
}

function navigateTask(taskId) {
  if (!state.activeProjectId) return;
  setHash(state.activeProjectId, taskId);
}

const consoleWorkbench = {
  navigateProject,
  navigateTask,
  toggleProjectRail,
  toggleTaskRail,
  toggleProjectDrawer,
  toggleCapabilityPanel,
  togglePromptEditor,
  togglePromptFullscreen,
  toggleSourceFoldout,
  setTaskFilter,
  setTab,
  openCreateTaskModal,
  closeModal,
  setCreateTaskDesc,
  setPromptDraft,
  submitCreateTask,
  showBannerNotice,
  executePrimaryAction,
  previewFinalPrompt,
  savePromptDraft,
  approveTask,
  reviewTask,
  closeTask,
  refreshCurrentContext
};

window.consoleWorkbench = consoleWorkbench;
window.addEventListener("hashchange", () => {
  handleRoute().catch((error) => {
    setBanner("error", `路由加载失败：${error.message}`);
    render();
  });
});

window.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadProjects();
    await handleRoute();
  } catch (error) {
    setBanner("error", `初始化失败：${error.message}`);
    render();
  }
});
