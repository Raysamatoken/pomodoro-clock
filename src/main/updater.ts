import { BrowserWindow, ipcMain } from "electron";
import { autoUpdater, type UpdateInfo } from "electron-updater";
import { is } from "@electron-toolkit/utils";

/**
 * Initialise the auto-updater.
 *
 * Flow:
 *   1. App starts → check after 10 s delay
 *   2. Update found → silently download
 *   3. Download complete → notify renderer (banner + IPC)
 *   4. User clicks "restart" → quit and install
 *
 * In development mode the updater is disabled to avoid accidental updates
 * against production release channels.
 */
export function initUpdater(mainWindow: BrowserWindow): void {
  // Disable in dev — no release channel to hit
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // ---- Forward events to renderer ----
  autoUpdater.on("update-available", (info: UpdateInfo) => {
    mainWindow.webContents.send("update:available", info.version);
    // Start downloading automatically
    autoUpdater.downloadUpdate();
  });

  autoUpdater.on("download-progress", (progress) => {
    mainWindow.webContents.send("update:progress", Math.round(progress.percent));
  });

  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    mainWindow.webContents.send("update:downloaded", info.version);
  });

  autoUpdater.on("error", (err) => {
    console.error("[updater]", err.message);
  });

  // ---- IPC: renderer asks to install now ----
  ipcMain.removeHandler("update:install"); // guard against double-register
  ipcMain.handle("update:install", () => {
    autoUpdater.quitAndInstall(false, true);
  });

  // ---- Check schedule ----
  if (!is.dev) {
    // First check: 10 s after launch (let the UI settle)
    const firstCheck = setTimeout(
      () => autoUpdater.checkForUpdates().catch(() => {}),
      10_000
    );

    // Periodic check: every 4 hours
    const interval = setInterval(
      () => autoUpdater.checkForUpdates().catch(() => {}),
      4 * 60 * 60 * 1000
    );

    // Cleanup on quit
    const { app } = require("electron");
    app.on("before-quit", () => {
      clearTimeout(firstCheck);
      clearInterval(interval);
    });
  }
}
