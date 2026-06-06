import { create } from "zustand";
import type { AppSettings } from "@shared/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TimerMode = "focus" | "shortBreak" | "longBreak";

export interface CompletionEvent {
  completedMode: TimerMode;
  nextMode: TimerMode;
  focusCount: number;
}

export interface TimerState {
  // ---- Core state ----
  mode: TimerMode;
  isRunning: boolean;
  focusCount: number;
  todayCount: number;
  completionEvent: CompletionEvent | null;

  // ---- Precise timing ----
  startTimestamp: number | null;
  elapsedAtPause: number;

  // ---- Config ----
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;

  // ---- Actions ----
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  switchMode: (mode: TimerMode) => void;
  completeSession: () => void;
  clearCompletionEvent: () => void;
  applySettings: (settings: AppSettings) => void;
  loadFromStorage: (settings: AppSettings, todayCount: number) => void;
  setTodayCount: (count: number) => void;

  // ---- Helpers ----
  getTimeLeft: () => number;
  getTotalDuration: () => number;
  getProgress: () => number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function totalForMode(
  mode: TimerMode,
  s: Pick<TimerState, "focusDuration" | "shortBreakDuration" | "longBreakDuration">
): number {
  switch (mode) {
    case "focus":
      return s.focusDuration;
    case "shortBreak":
      return s.shortBreakDuration;
    case "longBreak":
      return s.longBreakDuration;
  }
}

function nextModeAfterFocus(
  focusCount: number,
  sessionsBeforeLongBreak: number
): TimerMode {
  return (focusCount + 1) % sessionsBeforeLongBreak === 0
    ? "longBreak"
    : "shortBreak";
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useTimerStore = create<TimerState>((set, get) => ({
  mode: "focus",
  isRunning: false,
  focusCount: 0,
  todayCount: 0,
  completionEvent: null,

  startTimestamp: null,
  elapsedAtPause: 0,

  focusDuration: 25 * 60,
  shortBreakDuration: 5 * 60,
  longBreakDuration: 15 * 60,
  sessionsBeforeLongBreak: 4,

  // ---- Actions ----

  start: () => {
    if (get().isRunning) return;
    set({ isRunning: true, startTimestamp: Date.now() });
  },

  pause: () => {
    const { isRunning, startTimestamp, elapsedAtPause } = get();
    if (!isRunning || startTimestamp === null) return;
    const additional = (Date.now() - startTimestamp) / 1000;
    set({
      isRunning: false,
      startTimestamp: null,
      elapsedAtPause: elapsedAtPause + additional,
    });
  },

  reset: () => {
    set({
      isRunning: false,
      startTimestamp: null,
      elapsedAtPause: 0,
      completionEvent: null,
    });
  },

  skip: () => {
    const { mode, focusCount, sessionsBeforeLongBreak } = get();
    if (mode === "focus") {
      const newCount = focusCount + 1;
      set({
        isRunning: false,
        startTimestamp: null,
        elapsedAtPause: 0,
        focusCount: newCount,
        mode: nextModeAfterFocus(focusCount, sessionsBeforeLongBreak),
        completionEvent: null,
      });
    } else {
      set({
        isRunning: false,
        startTimestamp: null,
        elapsedAtPause: 0,
        mode: "focus",
        completionEvent: null,
      });
    }
  },

  switchMode: (mode: TimerMode) => {
    set({
      mode,
      isRunning: false,
      startTimestamp: null,
      elapsedAtPause: 0,
      completionEvent: null,
    });
  },

  completeSession: () => {
    const { mode, focusCount, sessionsBeforeLongBreak } = get();

    if (mode === "focus") {
      const newCount = focusCount + 1;
      const next = nextModeAfterFocus(focusCount, sessionsBeforeLongBreak);
      set({
        isRunning: false,
        startTimestamp: null,
        elapsedAtPause: 0,
        focusCount: newCount,
        mode: next,
        completionEvent: {
          completedMode: "focus",
          nextMode: next,
          focusCount: newCount,
        },
      });
    } else {
      set({
        isRunning: false,
        startTimestamp: null,
        elapsedAtPause: 0,
        mode: "focus",
        completionEvent: {
          completedMode: mode,
          nextMode: "focus",
          focusCount,
        },
      });
    }
  },

  clearCompletionEvent: () => set({ completionEvent: null }),

  /** Apply new settings immediately (takes effect on current session). */
  applySettings: (settings: AppSettings) => {
    set({
      focusDuration: settings.focusDuration,
      shortBreakDuration: settings.shortBreakDuration,
      longBreakDuration: settings.longBreakDuration,
      sessionsBeforeLongBreak: settings.sessionsBeforeLongBreak,
    });
  },

  /** Called once on app startup to hydrate from persisted data. */
  loadFromStorage: (settings: AppSettings, todayCount: number) => {
    set({
      focusDuration: settings.focusDuration,
      shortBreakDuration: settings.shortBreakDuration,
      longBreakDuration: settings.longBreakDuration,
      sessionsBeforeLongBreak: settings.sessionsBeforeLongBreak,
      todayCount,
    });
  },

  setTodayCount: (count: number) => set({ todayCount: count }),

  // ---- Helpers ----

  getTimeLeft: () => {
    const { mode, isRunning, startTimestamp, elapsedAtPause } = get();
    const total = totalForMode(mode, get());
    let elapsed = elapsedAtPause;
    if (isRunning && startTimestamp !== null) {
      elapsed += (Date.now() - startTimestamp) / 1000;
    }
    return Math.max(0, total - elapsed);
  },

  getTotalDuration: () => totalForMode(get().mode, get()),

  getProgress: () => {
    const total = totalForMode(get().mode, get());
    if (total <= 0) return 0;
    return get().getTimeLeft() / total;
  },
}));
