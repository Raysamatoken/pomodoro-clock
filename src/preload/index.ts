import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import type { AppSettings } from "../shared/types";

const api = {
  // ---- Existing ----
  ping: (): Promise<string> => ipcRenderer.invoke("ping"),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke("get-app-version"),

  // ---- Window ----
  toggleAlwaysOnTop: (): Promise<boolean> =>
    ipcRenderer.invoke("window:toggle-always-on-top"),
  isAlwaysOnTop: (): Promise<boolean> =>
    ipcRenderer.invoke("window:is-always-on-top"),

  // ---- Timer -> Main ----
  updateProgress: (progress: number): Promise<void> =>
    ipcRenderer.invoke("timer:update-progress", { progress }),
  notifySessionComplete: (
    completedMode: string,
    nextMode: string,
    focusCount: number
  ): Promise<void> =>
    ipcRenderer.invoke("timer:notify-complete", {
      completedMode,
      nextMode,
      focusCount,
    }),
  trayStateChanged: (isRunning: boolean, mode: string): Promise<void> =>
    ipcRenderer.invoke("tray:state-changed", { isRunning, mode }),

  // ---- Store ----
  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke("store:get-settings"),
  saveSettings: (settings: AppSettings): Promise<void> =>
    ipcRenderer.invoke("store:save-settings", settings),
  getTodayCount: (): Promise<number> =>
    ipcRenderer.invoke("store:get-today-count"),
  recordPomodoro: (): Promise<number> =>
    ipcRenderer.invoke("store:record-pomodoro"),

  // ---- Auto-update ----
  installUpdate: (): Promise<void> =>
    ipcRenderer.invoke("update:install"),

  // ---- Main -> Renderer (events) ----
  onTrayAction: (callback: (action: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) =>
      callback(action);
    ipcRenderer.on("tray:action", handler);
    return () => ipcRenderer.removeListener("tray:action", handler);
  },
  onAlwaysOnTopChanged: (
    callback: (value: boolean) => void
  ): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, value: boolean) =>
      callback(value);
    ipcRenderer.on("window:always-on-top-changed", handler);
    return () =>
      ipcRenderer.removeListener("window:always-on-top-changed", handler);
  },
  onUpdateAvailable: (callback: (version: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, v: string) => callback(v);
    ipcRenderer.on("update:available", handler);
    return () => ipcRenderer.removeListener("update:available", handler);
  },
  onUpdateProgress: (callback: (percent: number) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, p: number) => callback(p);
    ipcRenderer.on("update:progress", handler);
    return () => ipcRenderer.removeListener("update:progress", handler);
  },
  onUpdateDownloaded: (callback: (version: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, v: string) => callback(v);
    ipcRenderer.on("update:downloaded", handler);
    return () => ipcRenderer.removeListener("update:downloaded", handler);
  },
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore
  window.electron = electronAPI;
  // @ts-ignore
  window.api = api;
}
