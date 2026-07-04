# 多项目 AI Coding 桌面控制台

当前阶段：阶段 A（脚手架与数据域），已完成顶层目录和数据归属初始化。

阶段 B（项目登记与状态读取）、阶段 C（CLI Task 流）、阶段 D（Agent Adapter）尚未实施。

## 目录结构

```
tools/ai-coding-console/
├── README.md                     ← 本文件
├── config/
│   └── console-config.json       ← 控制台专属配置
└── cli/
    └── console.ps1                ← CLI 入口（当前仅 help/version）

data/ai-coding-console/
├── projects-manifest.json        ← 已接入项目清单
├── tasks/                        ← 后续按需创建
├── board/                        ← 后续按需创建
└── reports/                      ← 后续按需创建
```

## 启动

```powershell
powershell -ExecutionPolicy Bypass -File tools\ai-coding-console\cli\console.ps1 help
```
