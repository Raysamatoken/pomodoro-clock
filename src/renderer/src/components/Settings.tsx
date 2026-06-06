import { useEffect, useState, useCallback } from "react";
import { useTimerStore } from "@/store/useTimerStore";
import type { AppSettings } from "@shared/types";
import { X } from "lucide-react";

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}

function Stepper({ label, value, min, max, step, unit, onChange }: StepperProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
          className="stepper-btn"
        >
          -
        </button>
        <span className="w-10 text-center text-gray-900 dark:text-white font-mono text-sm tabular-nums transition-colors duration-300">
          {value}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
          className="stepper-btn"
        >
          +
        </button>
        <span className="text-[11px] text-gray-400 dark:text-gray-500 w-6 transition-colors duration-300">
          {unit}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings panel
// ---------------------------------------------------------------------------

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const [focusMin, setFocusMin] = useState(25);
  const [shortMin, setShortMin] = useState(5);
  const [longMin, setLongMin] = useState(15);
  const [sessions, setSessions] = useState(4);
  const [todayCount, setTodayCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([window.api.getSettings(), window.api.getTodayCount()]).then(
      ([s, count]) => {
        setFocusMin(s.focusDuration / 60);
        setShortMin(s.shortBreakDuration / 60);
        setLongMin(s.longBreakDuration / 60);
        setSessions(s.sessionsBeforeLongBreak);
        setTodayCount(count);
        setLoaded(true);
      }
    );
  }, []);

  const persist = useCallback(
    (
      overrides: Partial<{
        focusMin: number;
        shortMin: number;
        longMin: number;
        sessions: number;
      }>
    ) => {
      const settings: AppSettings = {
        focusDuration: (overrides.focusMin ?? focusMin) * 60,
        shortBreakDuration: (overrides.shortMin ?? shortMin) * 60,
        longBreakDuration: (overrides.longMin ?? longMin) * 60,
        sessionsBeforeLongBreak: overrides.sessions ?? sessions,
      };
      window.api.saveSettings(settings);
      useTimerStore.getState().applySettings(settings);
    },
    [focusMin, shortMin, longMin, sessions]
  );

  const updateFocus = (v: number) => {
    setFocusMin(v);
    persist({ focusMin: v });
  };
  const updateShort = (v: number) => {
    setShortMin(v);
    persist({ shortMin: v });
  };
  const updateLong = (v: number) => {
    setLongMin(v);
    persist({ longMin: v });
  };
  const updateSessions = (v: number) => {
    setSessions(v);
    persist({ sessions: v });
  };

  if (!loaded) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-medium text-gray-800 dark:text-gray-200 transition-colors duration-300">
            设置
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Duration settings */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700/50 transition-colors duration-300">
          <Stepper label="专注时长" value={focusMin} min={1} max={120} step={5} unit="分" onChange={updateFocus} />
          <Stepper label="短休息时长" value={shortMin} min={1} max={30} step={1} unit="分" onChange={updateShort} />
          <Stepper label="长休息时长" value={longMin} min={1} max={60} step={5} unit="分" onChange={updateLong} />
          <Stepper label="长休息间隔" value={sessions} min={2} max={10} step={1} unit="个" onChange={updateSessions} />
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700/50 my-5 transition-colors duration-300" />

        {/* Today stats */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">
            今日已完成
          </span>
          <span className="text-sm text-gray-900 dark:text-white font-medium transition-colors duration-300">
            {todayCount} 个番茄
          </span>
        </div>
      </div>
    </div>
  );
}
