# Pomodoro Clock

A minimalist Pomodoro Timer desktop application built with Electron, React, TypeScript, and TailwindCSS.

![Electron](https://img.shields.io/badge/Electron-35-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- Precise countdown timer using absolute timestamps (no drift)
- Focus (25 min), Short Break (5 min), Long Break (15 min) modes
- Circular progress ring with smooth animation
- System tray with right-click menu control
- Always-on-top window toggle
- System notifications when sessions complete
- Windows taskbar progress bar
- Light / Dark theme with system auto-detection
- Customizable durations and intervals
- Persistent settings and daily statistics (electron-store)
- Silent auto-update via electron-updater + GitHub Releases

## Tech Stack

| Layer | Technology |
|---|---|
| Build tool | electron-vite |
| Main process | Electron 35 + TypeScript |
| Renderer | React 19 + TypeScript |
| Styling | TailwindCSS 3 |
| State management | Zustand 5 |
| Persistence | electron-store 8 |
| Auto-update | electron-updater |
| Icons | lucide-react |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- npm >= 9

### Install

```bash
git clone https://github.com/Raysamatoken/pomodoro-clock.git
cd pomodoro-clock
npm install
```

### Development

```bash
npm run dev
```

This launches the Electron app with hot-reload on the renderer process.

### Build for Production

```bash
# Build the Vite bundles only
npm run build

# Package for Windows (NSIS installer)
npm run build:win

# Package for macOS (DMG)
npm run build:mac
```

The installer output is in the `dist/` directory.

## Project Structure

```
pomodoro-clock/
├── electron.vite.config.ts        # electron-vite build config
├── electron-builder.yml           # packaging config (NSIS / DMG)
├── tailwind.config.js
├── package.json
│
├── resources/
│   ├── icon.png                   # 256x256 app icon
│   └── icon.ico                   # Windows icon
│
├── src/
│   ├── shared/
│   │   └── types.ts               # types shared across processes
│   │
│   ├── main/
│   │   ├── index.ts               # Electron main process entry
│   │   ├── store.ts               # electron-store data layer
│   │   └── updater.ts             # auto-update logic
│   │
│   ├── preload/
│   │   ├── index.ts               # contextBridge API
│   │   └── index.d.ts             # type declarations
│   │
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.tsx           # React entry
│           ├── App.tsx            # root component
│           ├── index.css          # Tailwind + custom styles
│           ├── hooks/
│           │   ├── useTick.ts     # precise timer (rAF + timestamps)
│           │   ├── useTheme.ts    # light/dark theme management
│           │   └── useVisibility.ts
│           ├── store/
│           │   └── useTimerStore.ts
│           └── components/
│               ├── Timer.tsx      # circular ring + countdown
│               ├── Controls.tsx   # play / pause / reset / skip
│               └── Settings.tsx   # duration & interval config
└── tsconfig.json
    tsconfig.node.json
    tsconfig.web.json
```

## Architecture

### IPC Channels

```
Renderer -> Main (invoke / handle)
──────────────────────────────────
store:get-settings          settings read
store:save-settings         settings write
store:get-today-count       daily pomodoro count
store:record-pomodoro       increment count
timer:update-progress       taskbar progress bar
timer:notify-complete       system notification
tray:state-changed          sync state for tray menu
window:toggle-always-on-top
update:install              restart & apply update

Main -> Renderer (send / on)
────────────────────────────
tray:action                 start / pause / reset
window:always-on-top-changed
window:visibility-changed
update:available
update:progress
update:downloaded
```

### Timer Algorithm

The timer does **not** use `setInterval` decrement. Instead:

```
timeLeft = totalDuration - (elapsedAtPause + (Date.now() - startTimestamp) / 1000)
```

Each render computes from absolute wall-clock time, eliminating drift from event-loop latency and browser tab throttling.

## Auto-Update

Configured for GitHub Releases. To enable:

1. Update `publish` section in `electron-builder.yml` with your GitHub username/repo
2. Build and create a GitHub Release with the installer + `latest.yml`
3. The app checks for updates 10s after launch, then every 4 hours

## License

MIT
