# AI Coding Desktop Console CLI
# Phase B - Project Registration & Status

param(
  [string]$Command = "help",
  [string]$Subcommand = "",
  [string]$Path = "",
  [string]$Project = ""
)

$VERSION = "0.1.0-b"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$REPO_ROOT = Resolve-Path (Join-Path $SCRIPT_DIR "..\..\..")
$CONSOLE_DIR = Join-Path $REPO_ROOT "tools\ai-coding-console"
$DATA_DIR = Join-Path $REPO_ROOT "data\ai-coding-console"
$MANIFEST_PATH = Join-Path $DATA_DIR "projects-manifest.json"
$INIT_SCRIPT = Join-Path $REPO_ROOT "tools\init-project-memory\init-project-memory.ps1"

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

function Write-Help {
  Write-Host "AI Coding Desktop Console - MVP (Phase B)" -ForegroundColor Cyan
  Write-Host "Version: $VERSION" -ForegroundColor Cyan
  Write-Host "Phase: B - Project Registration & Status" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Implemented:" -ForegroundColor Green
  Write-Host "  help                                     Show this help" -ForegroundColor Green
  Write-Host "  version                                  Show version and phase" -ForegroundColor Green
  Write-Host "  project add      --path <path>           Register a new project" -ForegroundColor Green
  Write-Host "  project list                              List all registered projects" -ForegroundColor Green
  Write-Host "  project status   --project <name-or-id>   Show project status" -ForegroundColor Green
  Write-Host "  project prompt   --project <name-or-id>   Generate AI context prompt" -ForegroundColor Green
  Write-Host ""
  Write-Host "Planned (not yet implemented):" -ForegroundColor DarkGray
  Write-Host "  Phase C (Task):    task create / list / status / approve / review / close" -ForegroundColor DarkGray
  Write-Host "  Phase C (Board):   board show" -ForegroundColor DarkGray
  Write-Host "  Phase D (Agent):   task dispatch" -ForegroundColor DarkGray
}

function Write-Version {
  Write-Host "AI Coding Desktop Console" -ForegroundColor Cyan
  Write-Host "Version: $VERSION" -ForegroundColor Cyan
  Write-Host "Phase: B - Project Registration & Status" -ForegroundColor Yellow
}

# --- Project Commands ---

function Invoke-ProjectAdd {
  $rawPath = $Path
  if (-not $rawPath) {
    Write-Host "Missing --path parameter. Usage: project add --path <path>" -ForegroundColor Red
    exit 1
  }
  $resolvedPath = Resolve-ProjectPath $rawPath
  if (-not $resolvedPath) {
    Write-Host "Path does not exist: $rawPath" -ForegroundColor Red
    exit 1
  }
  $dirName = Split-Path -Leaf $resolvedPath
  $projectId = Sanitize-Id $dirName
  if (-not $projectId) {
    Write-Host "Cannot generate project ID from: $dirName" -ForegroundColor Red
    exit 1
  }
  $manifest = Read-Manifest
  $projects = @{}
  if ($manifest.projects) { $manifest.projects.PSObject.Properties | ForEach-Object { $projects[$_.Name] = $_.Value } }
  foreach ($existingId in $projects.Keys) {
    $existing = $projects[$existingId]
    $existingPath = if ($existing.rootPath) { $existing.rootPath } else { $existing.rootpath }
    if ($existingPath -and ($existingPath -replace '\\$','') -eq ($resolvedPath -replace '\\$','')) {
      Write-Host "Project already registered (ID: $existingId)" -ForegroundColor Yellow
      exit 0
    }
  }
  $hasGit = Test-Path -LiteralPath (Join-Path $resolvedPath ".git")
  if (-not $hasGit) {
    Write-Host "Warning: Path does not contain .git/ directory. Some features will be unavailable." -ForegroundColor Yellow
  }
  $gitInfo = if ($hasGit) { Get-GitInfo $resolvedPath } else { @{ remote = $null; available = $false } }
  $hasAi = Test-Path -LiteralPath (Join-Path $resolvedPath ".ai")
  if (-not $hasAi) {
    $answer = Read-Host "Project has no AI memory (.ai/). Initialize? (y/n)"
    if ($answer -eq "y" -or $answer -eq "Y") {
      if (-not (Test-Path -LiteralPath $INIT_SCRIPT)) {
        Write-Host "init-project-memory script not found at: $INIT_SCRIPT" -ForegroundColor Red
        Write-Host "Project registration skipped." -ForegroundColor Red
        exit 1
      }
      try {
        $env:ErrorActionPreference = "Stop"
        & powershell -ExecutionPolicy Bypass -File $INIT_SCRIPT -ProjectPath $resolvedPath
        $hasAi = $true
        Write-Host "AI memory initialized." -ForegroundColor Green
      }
      catch {
        Write-Host "Failed to initialize AI memory: $_" -ForegroundColor Red
        Write-Host "Project registration skipped." -ForegroundColor Red
        exit 1
      }
    }
    else {
      Write-Host "Skipping AI memory initialization."
    }
  }
  else {
    Write-Host "Project already has AI memory, skipping initialization."
  }
  $hasAgentsMd = Test-Path -LiteralPath (Join-Path $resolvedPath "AGENTS.md")
  $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  $projectEntry = @{
    id = $projectId
    rootPath = $resolvedPath
    displayName = $dirName
    addedAt = $now
    lastActivityAt = $now
    gitRemote = if ($gitInfo.available) { $gitInfo.remote } else { $null }
    hasAiMemory = $hasAi
    hasAgentsMd = $hasAgentsMd
    takeoverStatus = "registered"
  }
  $projects[$projectId] = $projectEntry
  $newManifest = [PSCustomObject]@{
    '$schema' = "个人AI工具库项目清单 v1"
    lastUpdated = $now
    projects = $null
  }
  $projectPSCustom = [PSCustomObject]@{}
  foreach ($key in $projects.Keys) {
    Add-Member -InputObject $projectPSCustom -MemberType NoteProperty -Name $key -Value $projects[$key]
  }
  $newManifest.projects = $projectPSCustom
  $json = $newManifest | ConvertTo-Json -Depth 10
  Set-Content -LiteralPath $MANIFEST_PATH -Value $json -Encoding UTF8
  Write-Host "Project registered: $projectId ($resolvedPath)" -ForegroundColor Green
}

function Invoke-ProjectList {
  $manifest = Read-Manifest
  if (-not $manifest.projects) {
    Write-Host "No registered projects."
    return
  }
  $entries = @()
  $manifest.projects.PSObject.Properties | ForEach-Object { $entries += $_.Value }
  if ($entries.Count -eq 0) {
    Write-Host "No registered projects."
    return
  }
  $entries = $entries | Sort-Object { if ($_.lastActivityAt) { $_.lastActivityAt } elseif ($_.lastactivityat) { $_.lastactivityat } else { "" } } -Descending
  Write-Host ("{0,-18} {1,-20} {2,-35} {3,-28} {4,-8} {5,-12}" -f "ID", "Name", "Path", "Git Remote", "AI Mem", "Registered")
  Write-Host ("{0,-18} {1,-20} {2,-35} {3,-28} {4,-8} {5,-12}" -f "--", "----", "----", "---------", "------", "----------")
  foreach ($e in $entries) {
    $id = if ($e.id) { $e.id } else { "" }
    $name = if ($e.displayName) { $e.displayName } elseif ($e.displayname) { $e.displayname } else { "" }
    $rp = if ($e.rootPath) { $e.rootPath } elseif ($e.rootpath) { $e.rootpath } else { "" }
    $remote = if ($e.gitRemote) { $e.gitRemote } elseif ($e.gitremote) { $e.gitremote } else { "N/A" }
    if ($remote.Length -gt 26) { $remote = $remote.Substring(0, 26) + ".." }
    $ai = if ($e.hasAiMemory -or $e.hasaimemory) { "yes" } else { "no" }
    $added = if ($e.addedAt) { $e.addedAt.Substring(0, 10) } elseif ($e.addedat) { $e.addedat.Substring(0, 10) } else { "N/A" }
    Write-Host ("{0,-18} {1,-20} {2,-35} {3,-28} {4,-8} {5,-12}" -f $id, $name, $rp, $remote, $ai, $added)
  }
  Write-Host "Total: $($entries.Count) project(s)"
}

function Invoke-ProjectStatus {
  $projName = $Project
  if (-not $projName) {
    Write-Host "Missing --project parameter. Usage: project status --project <name-or-id>" -ForegroundColor Red
    exit 1
  }
  $manifest = Read-Manifest
  $projects = @{}
  if ($manifest.projects) { $manifest.projects.PSObject.Properties | ForEach-Object { $projects[$_.Name] = $_.Value } }
  $entry = $projects[$projName]
  if (-not $entry) {
    foreach ($key in $projects.Keys) {
      $e = $projects[$key]
      $dp = if ($e.displayName) { $e.displayName } elseif ($e.displayname) { $e.displayname } else { "" }
      $rp = if ($e.rootPath) { $e.rootPath } elseif ($e.rootpath) { $e.rootpath } else { "" }
      if ($dp -eq $projName -or $rp -eq $projName) { $entry = $e; break }
    }
  }
  if (-not $entry) {
    Write-Host "Project not found: $projName" -ForegroundColor Red
    exit 1
  }
  $id = if ($entry.id) { $entry.id } else { "" }
  $rp = if ($entry.rootPath) { $entry.rootPath } elseif ($entry.rootpath) { $entry.rootpath } else { "" }
  $name = if ($entry.displayName) { $entry.displayName } elseif ($entry.displayname) { $entry.displayname } else { $id }
  $added = if ($entry.addedAt) { $entry.addedAt } elseif ($entry.addedat) { $entry.addedat } else { "N/A" }
  $status = if ($entry.takeoverStatus) { $entry.takeoverStatus } elseif ($entry.takeoverstatus) { $entry.takeoverstatus } else { "unknown" }
  Write-Host "Project Status: $id" -ForegroundColor Cyan
  Write-Host ("-" * 40)
  Write-Host "Name:        $name"
  Write-Host "Path:        $rp"
  Write-Host "Registered:  $added"
  Write-Host "Status:      $status"
  Write-Host ""
  $gitInfo = Get-GitInfo $rp
  Write-Host "Git:" -ForegroundColor Yellow
  if ($gitInfo.available) {
    Write-Host "  Branch:    $($gitInfo.branch)"
    Write-Host "  Remote:    $($gitInfo.remote)"
    $dirtyLabel = if ($gitInfo.dirty) { "Uncommitted changes present" } else { "Clean (no uncommitted changes)" }
    Write-Host "  Status:    $dirtyLabel"
  }
  else {
    Write-Host "  Git unavailable" -ForegroundColor DarkGray
  }
  Write-Host ""
  Write-Host "AGENTS.md:" -ForegroundColor Yellow
  $agentsMdPath = Join-Path $rp "AGENTS.md"
  if (Test-Path -LiteralPath $agentsMdPath) {
    $size = (Get-Item -LiteralPath $agentsMdPath).Length
    $sizeKB = [math]::Round($size / 1024, 1)
    Write-Host "  Present ($sizeKB KB)" -ForegroundColor Green
  }
  else {
    Write-Host "  Not present" -ForegroundColor DarkGray
  }
  Write-Host ""
  Write-Host "AI Memory (.ai/):" -ForegroundColor Yellow
  $aiRoot = Join-Path $rp ".ai"
  if (Test-Path -LiteralPath $aiRoot) {
    Write-Host "  Initialized" -ForegroundColor Green
    $checks = @(
      @{ name = "business-context.md"; path = Join-Path $aiRoot "business-context.md" },
      @{ name = "current-state.md"; path = Join-Path $aiRoot "current-state.md" },
      @{ name = "decisions.md"; path = Join-Path $aiRoot "decisions.md" }
    )
    foreach ($c in $checks) {
      if (Test-Path -LiteralPath $c.path) {
        Write-Host "    $($c.name): present" -ForegroundColor Green
      }
      else {
        Write-Host "    $($c.name): missing" -ForegroundColor DarkGray
      }
    }
  }
  else {
    Write-Host "  Not initialized" -ForegroundColor DarkGray
  }
}

function Invoke-ProjectPrompt {
  $projName = $Project
  if (-not $projName) {
    Write-Host "Missing --project parameter. Usage: project prompt --project <name-or-id>" -ForegroundColor Red
    exit 1
  }
  $manifest = Read-Manifest
  $projects = @{}
  if ($manifest.projects) { $manifest.projects.PSObject.Properties | ForEach-Object { $projects[$_.Name] = $_.Value } }
  $entry = $projects[$projName]
  if (-not $entry) {
    foreach ($key in $projects.Keys) {
      $e = $projects[$key]
      $dp = if ($e.displayName) { $e.displayName } elseif ($e.displayname) { $e.displayname } else { "" }
      if ($dp -eq $projName) { $entry = $e; break }
    }
  }
  if (-not $entry) {
    Write-Host "Project not found: $projName" -ForegroundColor Red
    exit 1
  }
  $id = if ($entry.id) { $entry.id } else { "" }
  $rp = if ($entry.rootPath) { $entry.rootPath } elseif ($entry.rootpath) { $entry.rootpath } else { "" }
  $name = if ($entry.displayName) { $entry.displayName } elseif ($entry.displayname) { $entry.displayname } else { $id }
  $added = if ($entry.addedAt) { $entry.addedAt } elseif ($entry.addedat) { $entry.addedat } else { "N/A" }
  $status = if ($entry.takeoverStatus) { $entry.takeoverStatus } elseif ($entry.takeoverstatus) { $entry.takeoverstatus } else { "unknown" }
  $gitInfo = Get-GitInfo $rp

  Write-Host ""
  Write-Host "You are now working in the following project directory:" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Project name: $name" -ForegroundColor White
  Write-Host "Project ID: $id" -ForegroundColor White
  Write-Host "Project path: $rp" -ForegroundColor White
  if ($gitInfo.available) {
    Write-Host "Current Git branch: $($gitInfo.branch)" -ForegroundColor White
    Write-Host "Remote repository: $($gitInfo.remote)" -ForegroundColor White
  }
  Write-Host ""

  $agentsMdPath = Join-Path $rp "AGENTS.md"
  if (Test-Path -LiteralPath $agentsMdPath) {
    Write-Host "---" -ForegroundColor DarkGray
    Write-Host "Below is the project AGENTS.md:" -ForegroundColor Cyan
    Write-Host "---" -ForegroundColor DarkGray
    Get-Content -LiteralPath $agentsMdPath -Encoding UTF8 | Write-Host
    Write-Host ""
  }

  $aiRoot = Join-Path $rp ".ai"
  if (Test-Path -LiteralPath $aiRoot) {
    $bcPath = Join-Path $aiRoot "business-context.md"
    $csPath = Join-Path $aiRoot "current-state.md"
    Write-Host "---" -ForegroundColor DarkGray
    Write-Host "Below is the project AI memory:" -ForegroundColor Cyan
    Write-Host "---" -ForegroundColor DarkGray
    if (Test-Path -LiteralPath $bcPath) {
      Write-Host "[business-context.md]" -ForegroundColor Yellow
      Get-Content -LiteralPath $bcPath -Encoding UTF8 | Write-Host
      Write-Host ""
    }
    if (Test-Path -LiteralPath $csPath) {
      Write-Host "[current-state.md]" -ForegroundColor Yellow
      Get-Content -LiteralPath $csPath -Encoding UTF8 | Write-Host
      Write-Host ""
    }
  }

  Write-Host "---" -ForegroundColor DarkGray
  Write-Host "Registration info:" -ForegroundColor Cyan
  Write-Host "---" -ForegroundColor DarkGray
  Write-Host "Registered at: $added" -ForegroundColor White
  Write-Host "Takeover status: $status" -ForegroundColor White
  Write-Host ""

  Write-Host "---" -ForegroundColor DarkGray
  Write-Host "Root directory contents:" -ForegroundColor Cyan
  Write-Host "---" -ForegroundColor DarkGray
  Get-ChildItem -LiteralPath $rp -Name | ForEach-Object { Write-Host "  $_" }
  Write-Host ""

  Write-Host "---" -ForegroundColor DarkGray
  Write-Host "Task for AI:" -ForegroundColor Cyan
  Write-Host "---" -ForegroundColor DarkGray
  Write-Host "Analyze the above project in read-only mode (plan mode). Do NOT modify any files."
  Write-Host "Then output:"
  Write-Host "1. Project goal: What this project does (based on AGENTS.md, memory, and directory name)"
  Write-Host "2. Current phase: Current work according to .ai/current-state.md"
  Write-Host "3. Directory structure: Key directories and files at root level"
  Write-Host "4. Entry points: Startup/build entry scripts or commands"
  Write-Host "5. Risks: Missing AGENTS.md or .ai/ memory, uncommitted changes, unclear structure"
  Write-Host "6. Next steps: Recommended priority actions"
  Write-Host ""
  Write-Host "Mark anything uncertain as 'Unconfirmed'. Do not guess."
}

# --- Entry Point ---

if ($Command -eq "help") {
  Write-Help
  exit 0
}

if ($Command -eq "version") {
  Write-Version
  exit 0
}

if ($Command -eq "project") {
  switch ($Subcommand.ToLower()) {
    "add"     { Invoke-ProjectAdd; exit 0 }
    "list"    { Invoke-ProjectList; exit 0 }
    "status"  { Invoke-ProjectStatus; exit 0 }
    "prompt"  { Invoke-ProjectPrompt; exit 0 }
    default   {
      Write-Host "Unknown project command: $Subcommand" -ForegroundColor Red
      Write-Host "Available: project add / list / status / prompt" -ForegroundColor Yellow
      Write-Host "Run: console.ps1 help" -ForegroundColor Yellow
      exit 1
    }
  }
}

Write-Host "Unknown command: $Command" -ForegroundColor Red
Write-Host "Run: console.ps1 help" -ForegroundColor Yellow
exit 1
