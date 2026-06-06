import Store from "electron-store";
import type { AppSettings, DailyStats } from "../shared/types";
import { DEFAULT_SETTINGS } from "../shared/types";

// ---------------------------------------------------------------------------
// Schema & initialization
// ---------------------------------------------------------------------------

interface StoreSchema {
  settings: AppSettings;
  dailyStats: DailyStats;
}

const store = new Store<StoreSchema>({
  name: "pomodoro-data",
  defaults: {
    settings: { ...DEFAULT_SETTINGS },
    dailyStats: {},
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// Public API (called from IPC handlers)
// ---------------------------------------------------------------------------

export function getSettings(): AppSettings {
  return store.get("settings", { ...DEFAULT_SETTINGS });
}

export function saveSettings(settings: AppSettings): void {
  store.set("settings", settings);
}

export function getTodayCount(): number {
  const key = getTodayKey();
  return (store.get(`dailyStats.${key}`) as number) ?? 0;
}

/** Increment today's completed-pomodoro count and return the new value. */
export function recordPomodoro(): number {
  const key = getTodayKey();
  const current = (store.get(`dailyStats.${key}`) as number) ?? 0;
  const next = current + 1;
  store.set(`dailyStats.${key}`, next);
  return next;
}
