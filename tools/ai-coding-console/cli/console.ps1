# AI Coding Desktop Console CLI
# Phase C - Task Lifecycle

param(
  [string]$Command = "help",
  [string]$Subcommand = "",
  [string]$Path = "",
  [string]$Project = "",
  [string]$Desc = "",
  [string]$Task = "",
  [switch]$Reject
)

$VERSION = "0.1.0-c"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$REPO_ROOT = Resolve-Path (Join-Path $SCRIPT_DIR "..\..\..")
$DATA_DIR = Join-Path $REPO_ROOT "data\ai-coding-console"
$MANIFEST_PATH = Join-Path $DATA_DIR "projects-manifest.json"
$INIT_SCRIPT = Join-Path $REPO_ROOT "tools\init-project-memory\init-project-memory.ps1"
$TASKS_DIR = Join-Path $DATA_DIR "tasks"
$BOARD_DIR = Join-Path $DATA_DIR "board"
$REPORTS_DIR = Join-Path $DATA_DIR "reports"

function Read-Manifest {
  if (-not (Test-Path -LiteralPath $MANIFEST_PATH)) {
    return @{ projects = @{}; lastUpdated = $null }
  }
  $json = Get-Content -LiteralPath $MANIFEST_PATH -Raw -Encoding UTF8
  return $json | ConvertFrom-Json
}

function Write-Manifest($manifest) {
  $parent = Split-Path -Parent $MANIFEST_PATH
  if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
  $json = $manifest | ConvertTo-Json -Depth 10
  Set-Content -LiteralPath $MANIFEST_PATH -Value $json -Encoding UTF8
}

function Ensure-Dir($dirPath) {
  if (-not (Test-Path -LiteralPath $dirPath)) {
    New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
  }
}

function Sanitize-Id($name) {
  return ($name -replace '\s+', '-') -replace '[^a-zA-Z0-9_-]', ''
}

function Resolve-ProjectPath($rawPath) {
  if (-not $rawPath) { return $null }
  try { return (Resolve-Path -LiteralPath $rawPath).Path }
  catch { return $null }
}

function Get-GitInfo($projectPath) {
  $result = @{ branch = $null; remote = $null; dirty = $null; available = $false }
  try {
    Push-Location -LiteralPath $projectPath
    $result.branch = (git rev-parse --abbrev-ref HEAD 2>$null) -replace '\s+', ''
    $result.remote = (git remote get-url origin 2>$null) -replace '\s+', ''
    $dirtyOut = git status --porcelain 2>$null
    $result.dirty = ($null -ne $dirtyOut -and $dirtyOut.Length -gt 0)
    $result.available = $true
    Pop-Location
  }
  catch { Pop-Location -ErrorAction SilentlyContinue }
  return $result
}

function New-TaskId {
  $today = (Get-Date).ToString("yyyyMMdd")
  Ensure-Dir $TASKS_DIR
  $existing = Get-ChildItem -LiteralPath $TASKS_DIR -Directory -Name | Where-Object { $_ -match "^T-$today-\d{3}$" }
  $max = 0
  foreach ($d in $existing) {
    $num = [int]($d -replace "T-$today-", "")
    if ($num -gt $max) { $max = $num }
  }
  return "T-$today-" + ($max + 1).ToString("000")
}

function Find-Project($projName) {
  $manifest = Read-Manifest
  $projects = @{}
  if ($manifest.projects) { $manifest.projects.PSObject.Properties | ForEach-Object { $projects[$_.Name] = $_.Value } }
  $entry = $projects[$projName]
  if (-not $entry) {
    foreach ($key in $projects.Keys) {
      $e = $projects[$key]
      $dp = ""
      if ($e.displayName) { $dp = $e.displayName } elseif ($e.displayname) { $dp = $e.displayname }
      if ($dp -eq $projName) { $entry = $e; break }
    }
  }
  return $entry
}

function Get-Prop($obj, $names) {
  foreach ($n in $names) { if ($obj.$n) { return $obj.$n } }
  return ""
}

function Read-TaskJson($taskDir) {
  $taskPath = Join-Path $taskDir "task.json"
  if (-not (Test-Path -LiteralPath $taskPath)) { return $null }
  return Get-Content -LiteralPath $taskPath -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Write-TaskJson($taskDir, $data) {
  $taskPath = Join-Path $taskDir "task.json"
  $json = $data | ConvertTo-Json -Depth 10
  Set-Content -LiteralPath $taskPath -Value $json -Encoding UTF8
}

function Format-Ts($ts) {
  if (-not $ts) { return "N/A" }
  try { return ([DateTime]$ts).ToString("yyyy-MM-dd HH:mm") }
  catch { return "N/A" }
}

function Write-Help {
  Write-Host "AI Coding Desktop Console - MVP (Phase C)" -ForegroundColor Cyan
  Write-Host "Version: $VERSION" -ForegroundColor Cyan
  Write-Host "Phase: C - Task Lifecycle" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Implemented:" -ForegroundColor Green
  Write-Host "  help                                     Show this help"
  Write-Host "  version                                  Show version and phase"
  Write-Host "  project add      --path <path>           Register a new project"
  Write-Host "  project list                              List all registered projects"
  Write-Host "  project status   --project <name-or-id>   Show project status"
  Write-Host "  project prompt   --project <name-or-id>   Generate AI context prompt"
  Write-Host "  task create      --project <id> --desc D  Create a task"
  Write-Host "  task list        --project <id>            List tasks for a project"
  Write-Host "  task status      --task <task-id>          Show task details"
  Write-Host "  task approve     --task <id> [--reject]    Approve/reject plan"
  Write-Host "  task review      --task <id> [--reject]    Final review"
  Write-Host "  task close       --task <id>               Close completed task"
  Write-Host "  board show       --project <id>            Generate project board"
  Write-Host ""
  Write-Host "Planned (not yet implemented):" -ForegroundColor DarkGray
  Write-Host "  Phase D (Agent):   task dispatch" -ForegroundColor DarkGray
}

function Write-Version {
  Write-Host "AI Coding Desktop Console" -ForegroundColor Cyan
  Write-Host "Version: $VERSION" -ForegroundColor Cyan
  Write-Host "Phase: C - Task Lifecycle" -ForegroundColor Yellow
}

# --- Project Commands (Phase B) ---

function Invoke-ProjectAdd {
  $rawPath = $Path
  if (-not $rawPath) { Write-Host "Missing --path parameter." -ForegroundColor Red; exit 1 }
  $resolvedPath = Resolve-ProjectPath $rawPath
  if (-not $resolvedPath) { Write-Host "Path does not exist: $rawPath" -ForegroundColor Red; exit 1 }
  $dirName = Split-Path -Leaf $resolvedPath
  $projectId = Sanitize-Id $dirName
  if (-not $projectId) { Write-Host "Cannot generate project ID from: $dirName" -ForegroundColor Red; exit 1 }
  $manifest = Read-Manifest
  $projects = @{}
  if ($manifest.projects) { $manifest.projects.PSObject.Properties | ForEach-Object { $projects[$_.Name] = $_.Value } }
  foreach ($eid in $projects.Keys) {
    $ex = $projects[$eid]
    $exp = Get-Prop $ex @("rootPath","rootpath")
    if ($exp -and ($exp -replace '\\$','') -eq ($resolvedPath -replace '\\$','')) {
      Write-Host "Project already registered (ID: $eid)" -ForegroundColor Yellow; exit 0
    }
  }
  $hasGit = Test-Path -LiteralPath (Join-Path $resolvedPath ".git")
  if (-not $hasGit) { Write-Host "Warning: Path does not contain .git/" -ForegroundColor Yellow }
  $hasAi = Test-Path -LiteralPath (Join-Path $resolvedPath ".ai")
  if (-not $hasAi) {
    $answer = Read-Host "Project has no AI memory (.ai/). Initialize? (y/n)"
    if ($answer -eq "y" -or $answer -eq "Y") {
      if (-not (Test-Path -LiteralPath $INIT_SCRIPT)) {
        Write-Host "init-project-memory not found: $INIT_SCRIPT" -ForegroundColor Red; exit 1
      }
      try { & powershell -ExecutionPolicy Bypass -File $INIT_SCRIPT -ProjectPath $resolvedPath; $hasAi = $true }
      catch { Write-Host "Failed: $_" -ForegroundColor Red; exit 1 }
    }
  }
  $gitInfo = if ($hasGit) { Get-GitInfo $resolvedPath } else { @{ remote = $null } }
  $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  $entry = @{
    id = $projectId; rootPath = $resolvedPath; displayName = $dirName
    addedAt = $now; lastActivityAt = $now
    gitRemote = if ($gitInfo.available) { $gitInfo.remote } else { $null }
    hasAiMemory = $hasAi; hasAgentsMd = (Test-Path (Join-Path $resolvedPath "AGENTS.md"))
    takeoverStatus = "registered"
  }
  $projects[$projectId] = $entry
  $out = [PSCustomObject]@{ '$schema' = "个人AI工具库项目清�?v1"; lastUpdated = $now; projects = $null }
  $ops = [PSCustomObject]@{}
  foreach ($k in $projects.Keys) { Add-Member -InputObject $ops -MemberType NoteProperty -Name $k -Value $projects[$k] }
  $out.projects = $ops
  $out | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $MANIFEST_PATH -Encoding UTF8
  Write-Host "Registered: $projectId ($resolvedPath)" -ForegroundColor Green
}

function Invoke-ProjectList {
  $m = Read-Manifest
  if (-not $m.projects) { Write-Host "No projects."; return }
  $entries = @(); $m.projects.PSObject.Properties | ForEach-Object { $entries += $_.Value }
  if ($entries.Count -eq 0) { Write-Host "No projects."; return }
  $entries = $entries | Sort-Object { Get-Prop $_ @("lastActivityAt","lastactivityat") } -Descending
  Write-Host ("{0,-18} {1,-20} {2,-35} {3,-28} {4,-8} {5,-12}" -f "ID","Name","Path","Git Remote","AI Mem","Registered")
  Write-Host ("-" * 121)
  foreach ($e in $entries) {
    $id = Get-Prop $e @("id","ID")
    $nm = Get-Prop $e @("displayName","displayname")
    $rp = Get-Prop $e @("rootPath","rootpath")
    $rm = Get-Prop $e @("gitRemote","gitremote"); if (-not $rm) { $rm = "N/A" }
    if ($rm.Length -gt 26) { $rm = $rm.Substring(0,26) + ".." }
    $ai = if ((Get-Prop $e @("hasAiMemory","hasaimemory")) -eq $true) { "yes" } else { "no" }
    $ad = Get-Prop $e @("addedAt","addedat"); if ($ad.Length -gt 10) { $ad = $ad.Substring(0,10) }
    Write-Host ("{0,-18} {1,-20} {2,-35} {3,-28} {4,-8} {5,-12}" -f $id,$nm,$rp,$rm,$ai,$ad)
  }
  Write-Host "Total: $($entries.Count) project(s)"
}

function Invoke-ProjectStatus {
  $projName = $Project
  if (-not $projName) { Write-Host "Missing --project." -ForegroundColor Red; exit 1 }
  $entry = Find-Project $projName
  if (-not $entry) { Write-Host "Project not found: $projName" -ForegroundColor Red; exit 1 }
  $id = Get-Prop $entry @("id","ID")
  $rp = Get-Prop $entry @("rootPath","rootpath")
  $nm = Get-Prop $entry @("displayName","displayname")
  $ad = Get-Prop $entry @("addedAt","addedat")
  $st = Get-Prop $entry @("takeoverStatus","takeoverstatus")
  Write-Host "Project Status: $id" -ForegroundColor Cyan
  Write-Host ("-" * 40)
  Write-Host "Name:        $nm"
  Write-Host "Path:        $rp"
  Write-Host "Registered:  $ad"
  Write-Host "Status:      $st"
  Write-Host ""
  $gi = Get-GitInfo $rp
  Write-Host "Git:" -ForegroundColor Yellow
  if ($gi.available) {
    Write-Host "  Branch:    $($gi.branch)"; Write-Host "  Remote:    $($gi.remote)"
    $dl = if ($gi.dirty) { "Uncommitted changes" } else { "Clean" }
    Write-Host "  Status:    $dl"
  } else { Write-Host "  Unavailable" }
  Write-Host ""
  Write-Host "AGENTS.md:" -ForegroundColor Yellow
  $amPath = Join-Path $rp "AGENTS.md"
  if (Test-Path $amPath) { $sz = [math]::Round((Get-Item $amPath).Length/1024,1); Write-Host "  Present ($sz KB)" }
  else { Write-Host "  Not present" }
  Write-Host ""
  $aiPath = Join-Path $rp ".ai"
  Write-Host "AI Memory:" -ForegroundColor Yellow
  if (Test-Path $aiPath) {
    Write-Host "  Initialized"
    foreach ($fn in @("business-context.md","current-state.md","decisions.md")) {
      $lp = if (Test-Path (Join-Path $aiPath $fn)) { "present" } else { "missing" }
      Write-Host "    $fn : $lp"
    }
  } else { Write-Host "  Not initialized" }
}

function Invoke-ProjectPrompt {
  $projName = $Project
  if (-not $projName) { Write-Host "Missing --project." -ForegroundColor Red; exit 1 }
  $entry = Find-Project $projName
  if (-not $entry) { Write-Host "Project not found: $projName" -ForegroundColor Red; exit 1 }
  $id = Get-Prop $entry @("id","ID")
  $rp = Get-Prop $entry @("rootPath","rootpath")
  $nm = Get-Prop $entry @("displayName","displayname")
  $ad = Get-Prop $entry @("addedAt","addedat")
  $st = Get-Prop $entry @("takeoverStatus","takeoverstatus")
  $gi = Get-GitInfo $rp
  Write-Host ""
  Write-Host "Project: $nm (ID: $id)" -ForegroundColor Cyan
  Write-Host "Path: $rp" -ForegroundColor White
  if ($gi.available) { Write-Host "Branch: $($gi.branch) Remote: $($gi.remote)" -ForegroundColor White }
  Write-Host ""
  $amPath = Join-Path $rp "AGENTS.md"
  if (Test-Path $amPath) {
    Write-Host "--- AGENTS.md ---" -ForegroundColor DarkGray
    Get-Content $amPath -Encoding UTF8 | Write-Host; Write-Host ""
  }
  $aiPath = Join-Path $rp ".ai"
  if (Test-Path $aiPath) {
    Write-Host "--- AI Memory ---" -ForegroundColor DarkGray
    foreach ($fn in @("business-context.md","current-state.md")) {
      $fp = Join-Path $aiPath $fn
      if (Test-Path $fp) { Write-Host "[$fn]" -ForegroundColor Yellow; Get-Content $fp -Encoding UTF8 | Write-Host; Write-Host "" }
    }
  }
  Write-Host "--- Registration ---" -ForegroundColor DarkGray
  Write-Host "Registered: $ad Takeover: $st" -ForegroundColor White
  Write-Host ""
  Write-Host "--- Root ---" -ForegroundColor DarkGray
  Get-ChildItem $rp -Name | ForEach-Object { Write-Host "  $_" }
  Write-Host ""
  Write-Host "Task: Analyze in plan mode. Output: goal, phase, structure, entry, risks, next steps. Mark uncertain as 'Unconfirmed'."
}

# --- Task Commands (Phase C) ---

function Invoke-TaskCreate {
  $projName = $Project
  $desc = $Desc
  if (-not $projName) { Write-Host "Missing --project." -ForegroundColor Red; exit 1 }
  if (-not $desc) { Write-Host "Missing --desc." -ForegroundColor Red; exit 1 }
  $entry = Find-Project $projName
  if (-not $entry) { Write-Host "Project not found: $projName" -ForegroundColor Red; exit 1 }
  $taskId = New-TaskId
  $taskDir = Join-Path $TASKS_DIR $taskId
  Ensure-Dir $taskDir
  $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  $taskData = [PSCustomObject]@{
    taskId = $taskId
    projectId = Get-Prop $entry @("id","ID")
    projectPath = Get-Prop $entry @("rootPath","rootpath")
    title = $desc
    description = $desc
    status = "created"
    createdAt = $now
    updatedAt = $now
    closedAt = $null
    planApprovalId = $null
    finalReviewId = $null
  }
  Write-TaskJson $taskDir $taskData
  $promptPath = Join-Path $taskDir "prompt.md"
  $rp = Get-Prop $entry @("rootPath","rootpath")
  $prompt = "Task: $desc`n`nProject: $rp`n`nExecute in plan mode. Do not modify files. Output analysis and plan."
  Set-Content -LiteralPath $promptPath -Value $prompt -Encoding UTF8
  $manifest = Read-Manifest
  $newProjects = [PSCustomObject]@{}
  if ($manifest.projects) {
    $manifest.projects.PSObject.Properties | ForEach-Object {
      $pid2 = Get-Prop $_.Value @("id","ID"); $val = $_.Value
      if ($pid2 -eq (Get-Prop $entry @("id","ID"))) {
        $val | Add-Member -MemberType NoteProperty -Name "lastActiveTaskId" -Value $taskId -Force
        $val | Add-Member -MemberType NoteProperty -Name "lastActivityAt" -Value $now -Force
      }
      Add-Member -InputObject $newProjects -MemberType NoteProperty -Name $_.Name -Value $val
    }
  }
  $newManifest = [PSCustomObject]@{
    '$schema' = "个人AI工具库项目清�?v1"; lastUpdated = $now; projects = $newProjects
  }
  Write-Manifest $newManifest
  Write-Host "Task created: $taskId" -ForegroundColor Green
}

function Invoke-TaskList {
  $projName = $Project
  if (-not $projName) { Write-Host "Missing --project." -ForegroundColor Red; exit 1 }
  $entry = Find-Project $projName
  if (-not $entry) { Write-Host "Project not found: $projName" -ForegroundColor Red; exit 1 }
  $prjId = Get-Prop $entry @("id","ID")
  if (-not (Test-Path -LiteralPath $TASKS_DIR)) { Write-Host "No tasks."; return }
  $allDirs = Get-ChildItem -LiteralPath $TASKS_DIR -Directory
  $tasks = @()
  foreach ($d in $allDirs) {
    $tj = Read-TaskJson $d.FullName
    if ($tj -and (Get-Prop $tj @("projectId","projectid")) -eq $prjId) { $tasks += $tj }
  }
  if ($tasks.Count -eq 0) { Write-Host "No tasks."; return }
  $tasks = $tasks | Sort-Object { Get-Prop $_ @("createdAt","createdat") } -Descending
  Write-Host "Tasks for: $prjId"
  Write-Host ("{0,-20} {1,-18} {2,-40} {3,-20} {4,-20}" -f "ID","Status","Title","Created","Updated")
  Write-Host ("-" * 118)
  foreach ($t in $tasks) {
    $tid = Get-Prop $t @("taskId","taskid")
    $st = Get-Prop $t @("status","Status")
    $tl = Get-Prop $t @("title","Title"); if ($tl.Length -gt 38) { $tl = $tl.Substring(0,38) + ".." }
    $cr = Format-Ts (Get-Prop $t @("createdAt","createdat"))
    $up = Format-Ts (Get-Prop $t @("updatedAt","updatedat"))
    Write-Host ("{0,-20} {1,-18} {2,-40} {3,-20} {4,-20}" -f $tid,$st,$tl,$cr,$up)
  }
  Write-Host "Total: $($tasks.Count) task(s)"
}

function Invoke-TaskStatus {
  $taskId = $Task
  if (-not $taskId) { Write-Host "Missing --task." -ForegroundColor Red; exit 1 }
  $taskDir = Join-Path $TASKS_DIR $taskId
  $tj = Read-TaskJson $taskDir
  if (-not $tj) { Write-Host "Task not found: $taskId" -ForegroundColor Red; exit 1 }
  $tid = Get-Prop $tj @("taskId","taskid")
  $prjId = Get-Prop $tj @("projectId","projectid")
  $rp = Get-Prop $tj @("projectPath","projectpath")
  $tl = Get-Prop $tj @("title","Title")
  $st = Get-Prop $tj @("status","Status")
  $cr = Get-Prop $tj @("createdAt","createdat")
  $up = Get-Prop $tj @("updatedAt","updatedat")
  $cl = Get-Prop $tj @("closedAt","closedat")
  $pa = Get-Prop $tj @("planApprovalId","planapprovalid")
  $fr = Get-Prop $tj @("finalReviewId","finalreviewid")
  Write-Host "Task: $tid" -ForegroundColor Cyan
  Write-Host ("-" * 50)
  Write-Host "Project:    $prjId ($rp)"
  Write-Host "Title:      $tl"
  Write-Host "Status:     $st"
  Write-Host "Created:    $cr"
  Write-Host "Updated:    $up"
  if ($cl) { Write-Host "Closed:     $cl" }
  Write-Host ""
  $runsDir = Join-Path $taskDir "runs"
  Write-Host "Runs:" -ForegroundColor Yellow
  if (Test-Path $runsDir) {
    $runDirs = Get-ChildItem -LiteralPath $runsDir -Directory
    if ($runDirs.Count -eq 0) { Write-Host "  none" }
    else {
      foreach ($rd in $runDirs) { Write-Host "  - $($rd.Name)" }
    }
  } else { Write-Host "  none" }
  Write-Host ""
  Write-Host "Approvals:" -ForegroundColor Yellow
  $approvalsDir = Join-Path $taskDir "approvals"
  if (Test-Path $approvalsDir) {
    $appFiles = Get-ChildItem -LiteralPath $approvalsDir -File -Filter "*.json"
    if ($appFiles.Count -eq 0) { Write-Host "  none" }
    else {
      foreach ($af in $appFiles) {
        $ad = Get-Content $af.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
        $at = Get-Prop $ad @("type","Type")
        $as = Get-Prop $ad @("status","Status")
        $dc = Get-Prop $ad @("decidedAt","decidedat")
        Write-Host "  - $($af.BaseName): $at / $as ($dc)"
      }
    }
  } else { Write-Host "  none" }
  if ($pa) { Write-Host "  planApprovalId: $pa" }
  if ($fr) { Write-Host "  finalReviewId: $fr" }
}

function Invoke-TaskApprove {
  $taskId = $Task
  if (-not $taskId) { Write-Host "Missing --task." -ForegroundColor Red; exit 1 }
  $taskDir = Join-Path $TASKS_DIR $taskId
  $tj = Read-TaskJson $taskDir
  if (-not $tj) { Write-Host "Task not found: $taskId" -ForegroundColor Red; exit 1 }
  $pa = Get-Prop $tj @("planApprovalId","planapprovalid")
  if ($pa) { Write-Host "Plan already approved/rejected. Use task review for final review." -ForegroundColor Yellow; exit 0 }
  $st = Get-Prop $tj @("status","Status")
  $runsDir = Join-Path $taskDir "runs"
  $planFound = $false
  if (Test-Path $runsDir) {
    $runDirs = Get-ChildItem -LiteralPath $runsDir -Directory
    foreach ($rd in $runDirs) {
      if (Test-Path (Join-Path $rd.FullName "plan.md")) { $planFound = $true; break }
    }
  }
  if (-not $planFound) {
    Write-Host "No plan artifacts found. Dispatch plan run first (Phase D: task dispatch)." -ForegroundColor Red
    exit 1
  }
  $approvalsDir = Join-Path $taskDir "approvals"
  Ensure-Dir $approvalsDir
  $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  $aid = "A-$taskId-" + (Get-Date).ToString("HHmmss")
  $ast = if ($Reject) { "rejected" } else { "approved" }
  $approval = [PSCustomObject]@{
    approvalId = $aid; taskId = $taskId; type = "plan_approval"
    status = $ast; requestedAt = $now; decidedAt = $now; comment = ""
  }
  $approval | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $approvalsDir "$aid.json") -Encoding UTF8
  $newStatus = if ($Reject) { "plan_rejected" } else { "plan_approved" }
  Add-Member -InputObject $tj -MemberType NoteProperty -Name "planApprovalId" -Value $aid -Force
  $tj | Add-Member -MemberType NoteProperty -Name "updatedAt" -Value $now -Force
  $tj.status = $newStatus
  Write-TaskJson $taskDir $tj
  Write-Host "Plan $ast. Task status: $newStatus" -ForegroundColor $(if ($Reject) { "Yellow" } else { "Green" })
}

function Invoke-TaskReview {
  $taskId = $Task
  if (-not $taskId) { Write-Host "Missing --task." -ForegroundColor Red; exit 1 }
  $taskDir = Join-Path $TASKS_DIR $taskId
  $tj = Read-TaskJson $taskDir
  if (-not $tj) { Write-Host "Task not found: $taskId" -ForegroundColor Red; exit 1 }
  $fr = Get-Prop $tj @("finalReviewId","finalreviewid")
  if ($fr) { Write-Host "Final review already completed." -ForegroundColor Yellow; exit 0 }
  $st = Get-Prop $tj @("status","Status")
  if ($st -ne "plan_approved" -and $st -ne "plan_rejected") {
    Write-Host "Task not ready for review. Status: $st. Complete plan approval first." -ForegroundColor Red; exit 1
  }
  $runsDir = Join-Path $taskDir "runs"
  $artifactFound = $false
  if (Test-Path $runsDir) {
    $runDirs = Get-ChildItem -LiteralPath $runsDir -Directory
    foreach ($rd in $runDirs) {
      if ((Test-Path (Join-Path $rd.FullName "build.log")) -or (Test-Path (Join-Path $rd.FullName "verify-result.md"))) {
        $artifactFound = $true; break
      }
    }
  }
  if (-not $artifactFound) {
    Write-Host "No build/verify artifacts found. Dispatch build/verify runs first (Phase D: task dispatch)." -ForegroundColor Red
    exit 1
  }
  $approvalsDir = Join-Path $taskDir "approvals"
  Ensure-Dir $approvalsDir
  $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  $aid = "A-$taskId-" + (Get-Date).ToString("HHmmss")
  $ast = if ($Reject) { "rejected" } else { "approved" }
  $approval = [PSCustomObject]@{
    approvalId = $aid; taskId = $taskId; type = "final_review"
    status = $ast; requestedAt = $now; decidedAt = $now; comment = ""
  }
  $approval | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $approvalsDir "$aid.json") -Encoding UTF8
  $newStatus = if ($Reject) { "plan_approved" } else { "completed" }
  Add-Member -InputObject $tj -MemberType NoteProperty -Name "finalReviewId" -Value $aid -Force
  $tj | Add-Member -MemberType NoteProperty -Name "updatedAt" -Value $now -Force
  $tj.status = $newStatus
  Write-TaskJson $taskDir $tj
  Write-Host "Final review $ast. Task status: $newStatus" -ForegroundColor $(if ($Reject) { "Yellow" } else { "Green" })
}

function Invoke-TaskClose {
  $taskId = $Task
  if (-not $taskId) { Write-Host "Missing --task." -ForegroundColor Red; exit 1 }
  $taskDir = Join-Path $TASKS_DIR $taskId
  $tj = Read-TaskJson $taskDir
  if (-not $tj) { Write-Host "Task not found: $taskId" -ForegroundColor Red; exit 1 }
  $cl = Get-Prop $tj @("closedAt","closedat")
  if ($cl) { Write-Host "Task already closed." -ForegroundColor Yellow; exit 0 }
  $st = Get-Prop $tj @("status","Status")
  if ($st -ne "completed") { Write-Host "Task not completed. Status: $st. Complete final review first." -ForegroundColor Red; exit 1 }
  Ensure-Dir $REPORTS_DIR
  $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  $tid = Get-Prop $tj @("taskId","taskid")
  $prjId = Get-Prop $tj @("projectId","projectid")
  $tl = Get-Prop $tj @("title","Title")
  $cr = Get-Prop $tj @("createdAt","createdat")
  $summary = @"
# Task Summary: $tid

Project: $prjId
Title: $tl
Created: $cr
Closed: $now

Status history: created -> plan_approved -> completed
"@
  $summaryPath = Join-Path $REPORTS_DIR "$taskId-summary.md"
  Set-Content -LiteralPath $summaryPath -Value $summary -Encoding UTF8
  $tj | Add-Member -MemberType NoteProperty -Name "closedAt" -Value $now -Force
  $tj.updatedAt = $now
  Write-TaskJson $taskDir $tj
  $manifest = Read-Manifest
  $newProjects = [PSCustomObject]@{}
  if ($manifest.projects) {
    $manifest.projects.PSObject.Properties | ForEach-Object {
      $pid2 = Get-Prop $_.Value @("id","ID"); $val = $_.Value
      if ($pid2 -eq $prjId) {
        $val | Add-Member -MemberType NoteProperty -Name "lastActivityAt" -Value $now -Force
      }
      Add-Member -InputObject $newProjects -MemberType NoteProperty -Name $_.Name -Value $val
    }
  }
  $newManifest = [PSCustomObject]@{ '$schema' = "个人AI工具库项目清�?v1"; lastUpdated = $now; projects = $newProjects }
  Write-Manifest $newManifest
  Write-Host "Task closed: $taskId" -ForegroundColor Green
  Write-Host "Report: $REPORTS_DIR\$taskId-summary.md"
}

# --- Board ---

function Invoke-BoardShow {
  $projName = $Project
  if (-not $projName) { Write-Host "Missing --project." -ForegroundColor Red; exit 1 }
  $entry = Find-Project $projName
  if (-not $entry) { Write-Host "Project not found: $projName" -ForegroundColor Red; exit 1 }
  $prjId = Get-Prop $entry @("id","ID")
  $rp = Get-Prop $entry @("rootPath","rootpath")
  $nm = Get-Prop $entry @("displayName","displayname")
  Ensure-Dir $BOARD_DIR
  $now = (Get-Date).ToString("yyyy-MM-dd HH:mm")
  $body = "# Project Board: $nm`n`nPath: $rp`nUpdated: $now`n`n## Tasks`n`n"
  if (Test-Path $TASKS_DIR) {
    $allDirs = Get-ChildItem -LiteralPath $TASKS_DIR -Directory
    $ptasks = @()
    foreach ($d in $allDirs) {
      $tj = Read-TaskJson $d.FullName
      if ($tj -and (Get-Prop $tj @("projectId","projectid")) -eq $prjId) { $ptasks += $tj }
    }
    if ($ptasks.Count -eq 0) { $body += "No tasks.`n" }
    else {
      $body += "| Task ID | Title | Status | Created |`n|---------|-------|--------|---------|`n"
      foreach ($t in $ptasks) {
        $tid = Get-Prop $t @("taskId","taskid")
        $tl = Get-Prop $t @("title","Title")
        $st = Get-Prop $t @("status","Status")
        $cr = Format-Ts (Get-Prop $t @("createdAt","createdat"))
        $body += "| $tid | $tl | $st | $cr |`n"
      }
    }
  } else { $body += "No tasks.`n" }
  $boardPath = Join-Path $BOARD_DIR "$prjId-board.md"
  Set-Content -LiteralPath $boardPath -Value $body -Encoding UTF8
  Write-Host "Board saved: $boardPath" -ForegroundColor Green
}

# --- Entry Point ---

if ($Command -eq "help") { Write-Help; exit 0 }
if ($Command -eq "version") { Write-Version; exit 0 }

if ($Command -eq "project") {
  switch ($Subcommand.ToLower()) {
    "add"     { Invoke-ProjectAdd; exit 0 }
    "list"    { Invoke-ProjectList; exit 0 }
    "status"  { Invoke-ProjectStatus; exit 0 }
    "prompt"  { Invoke-ProjectPrompt; exit 0 }
    default   { Write-Host "Unknown: project $Subcommand" -ForegroundColor Red; Write-Host "Run: console.ps1 help" -ForegroundColor Yellow; exit 1 }
  }
}

if ($Command -eq "task") {
  switch ($Subcommand.ToLower()) {
    "create"  { Invoke-TaskCreate; exit 0 }
    "list"    { Invoke-TaskList; exit 0 }
    "status"  { Invoke-TaskStatus; exit 0 }
    "approve" { Invoke-TaskApprove; exit 0 }
    "review"  { Invoke-TaskReview; exit 0 }
    "close"   { Invoke-TaskClose; exit 0 }
    default   { Write-Host "Unknown: task $Subcommand" -ForegroundColor Red; Write-Host "Run: console.ps1 help" -ForegroundColor Yellow; exit 1 }
  }
}

if ($Command -eq "board") {
  switch ($Subcommand.ToLower()) {
    "show"    { Invoke-BoardShow; exit 0 }
    default   { Write-Host "Unknown: board $Subcommand" -ForegroundColor Red; Write-Host "Run: console.ps1 help" -ForegroundColor Yellow; exit 1 }
  }
}

Write-Host "Unknown command: $Command" -ForegroundColor Red
Write-Host "Run: console.ps1 help" -ForegroundColor Yellow
exit 1
