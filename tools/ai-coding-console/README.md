# AI Coding Desktop Console

Phase: C.5 - First GUI

## Quick Start

```
npm run gui
# Then open http://localhost:3456
```

## Directory Structure

```
tools/ai-coding-console/
├── README.md                     ← This file
├── config/
│   └── console-config.json       ← Console-specific config
├── cli/
│   └── console.ps1                ← CLI entry (all commands)
├── gui/                           ← Phase C.5
│   ├── server.js                 ← Node.js HTTP server (0 deps)
│   ├── index.html                ← Main page
│   └── app.js                    ← Frontend logic

data/ai-coding-console/
├── projects-manifest.json        ← Registered project index
├── tasks/                        ← Created on demand
├── board/                        ← Created on demand
└── reports/                      ← Created on demand
```

## CLI Commands

```powershell
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 help
```
