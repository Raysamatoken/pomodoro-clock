# AGENTS.md — Pomodoro Clock

## Project Overview

A desktop Pomodoro Timer built with Electron + React + TypeScript. Features include precise countdown timer, system tray integration, always-on-top, dark/light theme, auto-update, and persistent settings.

- Repository: https://github.com/Raysamatoken/pomodoro-clock
- Current version: 1.0.0
- Platform: Windows (NSIS installer + portable zip), macOS (DMG)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Build | electron-vite 3 + electron-builder 25 |
| Frontend | React 19 + TypeScript 5 |
| Styling | TailwindCSS 3 (darkMode: class) |
| State | Zustand 5 |
| Persistence | electron-store 8 (CJS only) |
| Auto-update | electron-updater |
| Icons | lucide-react |

## Directory Structure

    src/
    ├── shared/
    │   └── types.ts                # AppSettings, DailyStats, DEFAULT_SETTINGS
    ├── main/
    │   ├── index.ts                # Main process: window, tray, notifications, IPC
    │   ├── store.ts                # electron-store data layer
    │   └── updater.ts              # electron-updater integration
    ├── preload/
    │   ├── index.ts                # contextBridge API (18 methods)
    │   └── index.d.ts              # PomodoroAPI type declaration
    └── renderer/
        ├── index.html              # Entry HTML with dark-mode FOUC prevention
        └── src/
            ├── main.tsx            # React entry
            ├── App.tsx             # Root component (update banner, toolbar, layout)
            ├── index.css           # Tailwind layers + custom component styles
            ├── hooks/
            │   ├── useTick.ts      # Precise rAF timer hook
            │   ├── useTheme.ts     # Light/dark theme with system detection
            │   └── useVisibility.ts# document.visibilitychange tracker
            ├── store/
            │   └── useTimerStore.ts# Zustand timer state
            └── components/
                ├── Timer.tsx       # SVG ring progress + time display
                ├── Controls.tsx    # Play/Pause/Reset/Skip buttons
                └── Settings.tsx    # Settings overlay with stepper controls
    resources/
    ├── icon.ico                    # Windows icon (>= 256x256)
    └── icon.png                    # macOS icon
    electron-builder.yml            # Build config
    electron.vite.config.ts         # Vite config for main/preload/renderer
    tailwind.config.js              # Custom tomato color palette
    postcss.config.js               # PostCSS with tailwindcss + autoprefixer
    tsconfig.json                   # Root TS config with project references
    tsconfig.node.json              # Main + preload TS config
    tsconfig.web.json               # Renderer TS config with path aliases

## Architecture

### Security Model

- nodeIntegration: false, contextIsolation: true — enforced at all times
- No remote module usage
- All IPC goes through contextBridge in preload/index.ts
- CSP in index.html: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'

### IPC Channels

**Renderer to Main** (via ipcRenderer.invoke):

| Channel | Payload | Purpose |
|---------|---------|---------|
| ping | — | Health check |
| get-app-version | — | Returns app version |
| window:toggle-always-on-top | — | Toggle, returns boolean |
| window:is-always-on-top | — | Query current state |
| timer:update-progress | { progress: number } | Taskbar progress bar (-1 to clear) |
| timer:notify-complete | { completedMode, nextMode, focusCount } | System notification |
| tray:state-changed | { isRunning, mode } | Sync tray menu state |
| store:get-settings | — | Returns AppSettings |
| store:save-settings | AppSettings | Persist settings |
| store:get-today-count | — | Returns today count |
| store:record-pomodoro | — | Increment and return count |
| update:install | — | quitAndInstall |

**Main to Renderer** (via webContents.send):

| Channel | Payload | Purpose |
|---------|---------|---------|
| tray:action | string (start/pause/reset) | Tray menu actions |
| window:always-on-top-changed | boolean | State synced from tray |
| window:visibility-changed | boolean | Window show/hide |
| update:available | string (version) | New version found |
| update:progress | number (percent) | Download progress |
| update:downloaded | string (version) | Ready to install |

### Timer Algorithm

The timer uses absolute timestamps instead of setInterval decrement to prevent drift:

- startTimestamp: set to Date.now() on start/resume
- elapsedAtPause: accumulated seconds from previous pause segments
- timeLeft = totalDuration - (elapsedAtPause + (Date.now() - startTimestamp) / 1000)
- Render loop uses requestAnimationFrame, paused when window is hidden (via usePageVisibility)
- Completion detected when timeLeft <= 0

### Data Persistence

electron-store (v8, CJS) stores settings (focusDuration, shortBreakDuration, longBreakDuration, sessionsBeforeLongBreak) and dailyStats (Record<string YYYY-MM-DD, number>).

### Theme System

- useTheme hook manages light/dark state via localStorage key "pomodoro-theme"
- Syncs dark class on html element for TailwindCSS darkMode: class
- Auto-detects system prefers-color-scheme on first load
- Follows system changes when no manual override exists
- FOUC prevention script in index.html applies dark class before first paint

## Commands

    npm install            # Install dependencies
    npm run dev            # Start dev server (electron-vite dev)
    npm run build          # Build main/preload/renderer (electron-vite build)
    npm run preview        # Preview built app
    npm run build:win      # Build + package for Windows (NSIS + portable)
    npm run build:mac      # Build + package for macOS (DMG)
    npm run build:all      # Build + package for both platforms

## Critical Implementation Notes

1. electron-store must be v8.x (CJS). Versions 9+ are ESM-only and break with electron-vite externalizeDepsPlugin, causing "Store is not a constructor".

2. NSIS requires .ico files, not .png. The productName in electron-builder.yml must be ASCII to avoid NSIS unicode path corruption. The Chinese title is set separately via mainWindow.setTitle().

3. TailwindCSS path aliases: The renderer uses @ -> src/renderer/src/ and @shared -> src/shared/ — defined in both tsconfig.web.json and electron.vite.config.ts.

4. Window close hides to tray instead of quitting. The isQuitting flag must be set to true before app.quit() to allow actual exit.

5. Taskbar progress: Pass -1 to setProgressBar() to clear; pass 0..1 for progress fill.

## Environment Notes

- Machine is in China — GitHub access requires HTTP proxy (http://127.0.0.1:7890)
- Set proxy for git: git config http.proxy http://127.0.0.1:7890
- Set proxy for gh CLI: $env:HTTPS_PROXY = "http://127.0.0.1:7890"
- Always clean up proxy config after operations: git config --unset http.proxy
