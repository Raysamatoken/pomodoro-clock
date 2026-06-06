# 番茄时钟

一款极简风格的番茄工作法桌面计时器，基于 Electron + React + TypeScript + TailwindCSS 构建。

![Electron](https://img.shields.io/badge/Electron-35-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8)
![License](https://img.shields.io/badge/License-MIT-green)

## 功能特性

- 精确倒计时 — 基于绝对时间戳计算，无累积漂移
- 三种模式 — 专注（25 分钟）、短休息（5 分钟）、长休息（15 分钟）
- 圆环进度条 — SVG 动画平滑过渡
- 系统托盘 — 右键菜单控制开始/暂停/重置，最小化时隐藏到托盘
- 窗口置顶 — 一键切换始终置顶
- 系统通知 — 阶段完成时弹出原生通知
- 任务栏进度条 — Windows 任务栏图标实时显示倒计时进度
- 深色/浅色模式 — 自动适配系统主题，支持手动切换
- 自定义设置 — 可调整专注/休息时长和长休息间隔
- 数据持久化 — 设置和每日番茄统计通过 electron-store 本地保存
- 静默自动更新 — 基于 electron-updater + GitHub Releases

## 技术栈

| 层级 | 技术 |
|---|---|
| 构建工具 | electron-vite |
| 主进程 | Electron 35 + TypeScript |
| 渲染进程 | React 19 + TypeScript |
| 样式 | TailwindCSS 3 |
| 状态管理 | Zustand 5 |
| 数据持久化 | electron-store 8 |
| 自动更新 | electron-updater |
| 图标库 | lucide-react |

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- npm >= 9

### 安装依赖

```bash
git clone https://github.com/Raysamatoken/pomodoro-clock.git
cd pomodoro-clock
npm install
```

### 开发模式

```bash
npm run dev
```

启动 Electron 应用，渲染进程支持热更新。

### 生产打包

```bash
# 仅构建 Vite 产物
npm run build

# 打包 Windows 安装包（NSIS）
npm run build:win

# 打包 macOS 安装包（DMG）
npm run build:mac
```

打包产物输出到 `dist/` 目录。

## 项目结构

```
pomodoro-clock/
├── electron.vite.config.ts        # electron-vite 构建配置
├── electron-builder.yml           # 打包配置（NSIS / DMG）
├── tailwind.config.js
├── package.json
│
├── resources/
│   ├── icon.png                   # 256x256 应用图标
│   └── icon.ico                   # Windows 图标
│
├── src/
│   ├── shared/
│   │   └── types.ts               # 跨进程共享类型定义
│   │
│   ├── main/
│   │   ├── index.ts               # Electron 主进程入口
│   │   ├── store.ts               # electron-store 数据层
│   │   └── updater.ts             # 自动更新逻辑
│   │
│   ├── preload/
│   │   ├── index.ts               # contextBridge API 桥接
│   │   └── index.d.ts             # 类型声明
│   │
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.tsx           # React 入口
│           ├── App.tsx            # 根组件
│           ├── index.css          # Tailwind + 自定义样式
│           ├── hooks/
│           │   ├── useTick.ts     # 精确计时（rAF + 时间戳）
│           │   ├── useTheme.ts    # 深色/浅色主题管理
│           │   └── useVisibility.ts
│           ├── store/
│           │   └── useTimerStore.ts
│           └── components/
│               ├── Timer.tsx      # 圆环进度 + 倒计时显示
│               ├── Controls.tsx   # 开始/暂停/重置/跳过按钮
│               └── Settings.tsx   # 时长与间隔设置面板
└── tsconfig.json
    tsconfig.node.json
    tsconfig.web.json
```

## 架构说明

### IPC 通信通道

```
渲染进程 → 主进程（invoke / handle）
──────────────────────────────────
store:get-settings          读取设置
store:save-settings         保存设置
store:get-today-count       获取今日番茄数
store:record-pomodoro       记录完成一个番茄
timer:update-progress       更新任务栏进度条
timer:notify-complete       触发系统通知
tray:state-changed          同步计时状态到托盘菜单
window:toggle-always-on-top 切换窗口置顶
update:install              重启并安装更新

主进程 → 渲染进程（send / on）
────────────────────────────
tray:action                 托盘操作（开始/暂停/重置）
window:always-on-top-changed 置顶状态变化
window:visibility-changed   窗口可见性变化
update:available            发现新版本
update:progress             下载进度
update:downloaded           下载完成
```

### 计时算法

计时器 **不使用** `setInterval` 递减，而是基于绝对时间戳计算：

```
剩余时间 = 总时长 - (暂停前累计 + (Date.now() - 起始时间戳) / 1000)
```

每次渲染都从系统时钟推算，彻底消除事件循环延迟和标签页节流导致的漂移。

## 自动更新

已配置 GitHub Releases 作为更新源。启用步骤：

1. 修改 `electron-builder.yml` 中 `publish` 部分的 GitHub 用户名和仓库名
2. 打包后在 GitHub 创建 Release，上传安装包和 `latest.yml`
3. 应用启动 10 秒后首次检查更新，之后每 4 小时检查一次

## 开源协议

MIT
