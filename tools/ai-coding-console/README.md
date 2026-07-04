# AI Coding Desktop Console

Phase: C - Task Lifecycle

## Directory Structure

```
tools/ai-coding-console/
├── README.md                     ← This file
├── config/
│   └── console-config.json       ← Console-specific config
└── cli/
    └── console.ps1                ← CLI entry (help/version + project + task + board)

data/ai-coding-console/
├── projects-manifest.json        ← Registered project index
├── tasks/                        ← Created on demand (Phase C)
│   └── <task-id>/
│       ├── task.json
│       ├── prompt.md
│       ├── runs/                  ← Phase D
│       └── approvals/
├── board/                        ← Created on demand (Phase C)
└── reports/                      ← Created on demand (Phase C)
```

## Commands

```powershell
# Project
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 project add --path <path>
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 project list
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 project status --project <name>
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 project prompt --project <name>

# Task
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 task create --project <id> --desc "..."
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 task list --project <id>
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 task status --task <task-id>
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 task approve --task <id> [--reject]
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 task review --task <id> [--reject]
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 task close --task <id>

# Board
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 board show --project <id>
```
