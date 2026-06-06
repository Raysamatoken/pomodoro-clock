// Shared type definitions used by both main process and renderer.

export interface AppSettings {
  /** Focus session duration in seconds */
  focusDuration: number;
  /** Short break duration in seconds */
  shortBreakDuration: number;
  /** Long break duration in seconds */
  longBreakDuration: number;
  /** Number of focus sessions before a long break */
  sessionsBeforeLongBreak: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  focusDuration: 25 * 60,
  shortBreakDuration: 5 * 60,
  longBreakDuration: 15 * 60,
  sessionsBeforeLongBreak: 4,
};

/** Shape of the persisted daily statistics.  Keys are YYYY-MM-DD strings. */
export type DailyStats = Record<string, number>;
