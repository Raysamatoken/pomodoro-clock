import { ElectronAPI } from "@electron-toolkit/preload";
import type { AppSettings } from "../shared/types";

export interface PomodoroAPI {
  // Existing
  ping: () => Promise<string>;
  getAppVersion: () => Promise<string>;

  // Window
  toggleAlwaysOnTop: () => Promise<boolean>;
  isAlwaysOnTop: () => Promise<boolean>;

  // Timer -> Main
  updateProgress: (progress: number) => Promise<void>;
  notifySessionComplete: (
    completedMode: string,
    nextMode: string,
    focusCount: number
  ) => Promise<void>;
  trayStateChanged: (isRunning: boolean, mode: string) => Promise<void>;

  // Store
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  getTodayCount: () => Promise<number>;
  recordPomodoro: () => Promise<number>;

  // Auto-update
  installUpdate: () => Promise<void>;

  // Main -> Renderer (returns unsubscribe function)
  onTrayAction: (callback: (action: string) => void) => () => void;
  onAlwaysOnTopChanged: (callback: (value: boolean) => void) => () => void;
  onUpdateAvailable: (callback: (version: string) => void) => () => void;
  onUpdateProgress: (callback: (percent: number) => void) => () => void;
  onUpdateDownloaded: (callback: (version: string) => void) => () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    api: PomodoroAPI;
  }
}
