import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  Notification,
  MenuItemConstructorOptions,
} from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import type { AppSettings } from "../shared/types";
import {
  getSettings,
  saveSettings,
  getTodayCount,
  recordPomodoro,
} from "./store";
import { initUpdater } from "./updater";

// ---------------------------------------------------------------------------
// Performance: V8 & Chromium flags (before app.ready)
// ---------------------------------------------------------------------------
app.commandLine.appendSwitch("js-flags", "--max-old-space-size=512");
app.commandLine.appendSwitch("disable-features", "TranslateUI,AutofillServerCommunication");

// ---------------------------------------------------------------------------
// Global state
// ---------------------------------------------------------------------------
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

let timerState = {
  isRunning: false,
  mode: "focus" as string,
};

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 420,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    title: "番茄时钟",
    icon: join(__dirname, "../../resources/icon.png"),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      // Performance: V8 code cache is on by default in production.
      // Reduce spell-check memory footprint (we don't need it).
      spellcheck: false,
    },
  });

  mainWindow = win;

  win.on("ready-to-show", () => {
    win.show();
  });

  win.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  // ---- Performance: notify renderer when visibility changes ----
  win.on("hide", () => {
    win.webContents.send("window:visibility-changed", false);
  });
  win.on("show", () => {
    win.webContents.send("window:visibility-changed", true);
  });

  // ---- Performance: crash recovery ----
  win.webContents.on("render-process-gone", (_event, details) => {
    console.error("[main] Renderer crashed:", details.reason);
    if (details.reason !== "clean-exit") {
      setTimeout(() => win.webContents.reload(), 1_000);
    }
  });

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return win;
}

// ---------------------------------------------------------------------------
// System Tray
// ---------------------------------------------------------------------------
function buildTrayMenu(): Menu {
  const showLabel = mainWindow?.isVisible() ? "隐藏窗口" : "显示窗口";

  const template: MenuItemConstructorOptions[] = [
    {
      label: showLabel,
      click: () => {
        if (mainWindow?.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow?.show();
          mainWindow?.focus();
        }
      },
    },
    { type: "separator" },
    {
      label: "开始专注",
      enabled: !timerState.isRunning,
      click: () => mainWindow?.webContents.send("tray:action", "start"),
    },
    {
      label: "暂停",
      enabled: timerState.isRunning,
      click: () => mainWindow?.webContents.send("tray:action", "pause"),
    },
    {
      label: "重置",
      click: () => mainWindow?.webContents.send("tray:action", "reset"),
    },
    { type: "separator" },
    {
      label: "始终置顶",
      type: "checkbox",
      checked: mainWindow?.isAlwaysOnTop() ?? false,
      click: (menuItem) => {
        mainWindow?.setAlwaysOnTop(menuItem.checked);
        mainWindow?.webContents.send(
          "window:always-on-top-changed",
          menuItem.checked
        );
      },
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ];

  return Menu.buildFromTemplate(template);
}

function createTray(): void {
  const iconPath = join(__dirname, "../../resources/icon.png");
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("番茄时钟");
  tray.setContextMenu(buildTrayMenu());

  tray.on("click", () => {
    if (mainWindow?.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });

  tray.on("double-click", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function refreshTrayMenu(): void {
  if (tray) {
    tray.setContextMenu(buildTrayMenu());
  }
}

// ---------------------------------------------------------------------------
// System Notification
// ---------------------------------------------------------------------------
function showSessionCompleteNotification(
  completedMode: string,
  nextMode: string,
  focusCount: number
): void {
  const modeNames: Record<string, string> = {
    focus: "专注",
    shortBreak: "短休息",
    longBreak: "长休息",
  };

  const body =
    completedMode === "focus"
      ? `已完成第 ${focusCount} 个番茄！接下来：${modeNames[nextMode] ?? nextMode}`
      : `${modeNames[completedMode] ?? completedMode} 结束，准备开始专注`;

  const notification = new Notification({
    title: "番茄时钟",
    body,
    icon: join(__dirname, "../../resources/icon.png"),
    silent: false,
  });

  notification.show();
  notification.on("click", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// ---------------------------------------------------------------------------
// IPC Handlers
// ---------------------------------------------------------------------------
function registerIpcHandlers(): void {
  ipcMain.handle("ping", () => "pong");
  ipcMain.handle("get-app-version", () => app.getVersion());

  ipcMain.handle("window:toggle-always-on-top", () => {
    const next = !mainWindow?.isAlwaysOnTop();
    mainWindow?.setAlwaysOnTop(next);
    refreshTrayMenu();
    return next;
  });
  ipcMain.handle("window:is-always-on-top", () => {
    return mainWindow?.isAlwaysOnTop() ?? false;
  });

  ipcMain.handle(
    "timer:update-progress",
    (_event, payload: { progress: number }) => {
      const value = Math.max(-1, Math.min(1, payload.progress));
      mainWindow?.setProgressBar(value);
    }
  );
  ipcMain.handle(
    "timer:notify-complete",
    (
      _event,
      payload: { completedMode: string; nextMode: string; focusCount: number }
    ) => {
      showSessionCompleteNotification(
        payload.completedMode,
        payload.nextMode,
        payload.focusCount
      );
    }
  );
  ipcMain.handle(
    "tray:state-changed",
    (_event, payload: { isRunning: boolean; mode: string }) => {
      timerState = { isRunning: payload.isRunning, mode: payload.mode };
      refreshTrayMenu();
    }
  );

  ipcMain.handle("store:get-settings", (): AppSettings => getSettings());
  ipcMain.handle(
    "store:save-settings",
    (_event, settings: AppSettings): void => saveSettings(settings)
  );
  ipcMain.handle("store:get-today-count", (): number => getTodayCount());
  ipcMain.handle("store:record-pomodoro", (): number => recordPomodoro());
}

// ---------------------------------------------------------------------------
// App Lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(() => {
  electronApp.setAutoLaunch(false);

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  registerIpcHandlers();
  createWindow();
  createTray();

  // Auto-updater (starts checking after a short delay)
  if (mainWindow) initUpdater(mainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on("window-all-closed", () => {
  // Tray keeps the app alive.
});
