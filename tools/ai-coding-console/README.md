# AI Coding Desktop Console

Phase: B - Project Registration & Status

## Directory Structure

```
tools/ai-coding-console/
├── README.md                     ← This file
├── config/
│   └── console-config.json       ← Console-specific config
└── cli/
    └── console.ps1                ← CLI entry (implemented: help/version + project add/list/status/prompt)

data/ai-coding-console/
├── projects-manifest.json        ← Registered project index
├── tasks/                        ← Created on demand (Phase C)
├── board/                        ← Created on demand (Phase C)
└── reports/                      ← Created on demand (Phase C)
```

## Commands

```powershell
# Help and version
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 help
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 version

# Project commands
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 project add --path <path>
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 project list
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 project status --project <name-or-id>
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 project prompt --project <name-or-id>
```

## Planned (not yet implemented)

- Phase C: task create/list/status/approve/review/close, board show
- Phase D: task dispatch (Agent Adapter)
