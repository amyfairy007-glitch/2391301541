# AI Coding Desktop Console CLI
# Phase A - Scaffolding & Data Layer

param(
  [string]$Command = "help"
)

$VERSION = "0.1.0-a"

function Write-Help {
  Write-Host "AI Coding Desktop Console - MVP (Phase A)" -ForegroundColor Cyan
  Write-Host "Version: $VERSION" -ForegroundColor Cyan
  Write-Host "Phase: A - Scaffolding & Data Layer" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Implemented:" -ForegroundColor Green
  Write-Host "  help      Show this help" -ForegroundColor Green
  Write-Host "  version   Show version and phase" -ForegroundColor Green
  Write-Host ""
  Write-Host "Planned (not yet implemented):" -ForegroundColor DarkGray
  Write-Host "  Phase B (Project): project add / list / status / prompt" -ForegroundColor DarkGray
  Write-Host "  Phase C (Task):    task create / list / status / approve / review / close" -ForegroundColor DarkGray
  Write-Host "  Phase C (Board):   board show" -ForegroundColor DarkGray
  Write-Host "  Phase D (Agent):   task dispatch" -ForegroundColor DarkGray
}

function Write-Version {
  Write-Host "AI Coding Desktop Console" -ForegroundColor Cyan
  Write-Host "Version: $VERSION" -ForegroundColor Cyan
  Write-Host "Phase: A - Scaffolding & Data Layer" -ForegroundColor Yellow
}

if ($Command -eq "help") {
  Write-Help
  exit 0
}

if ($Command -eq "version") {
  Write-Version
  exit 0
}

Write-Host "Unknown command: $Command" -ForegroundColor Red
Write-Host "Run: console.ps1 help" -ForegroundColor Yellow
exit 1
