import { useEffect, useRef } from "react";
import { useTimerStore, type TimerMode } from "@/store/useTimerStore";
import { useTick } from "@/hooks/useTick";
import CycleFlow from "./CycleFlow";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODE_LABELS: Record<TimerMode, string> = {
  focus: "专注",
  shortBreak: "短休息",
  longBreak: "长休息",
};

const MODE_ACCENT: Record<TimerMode, { ring: string; fill: string; glow: string; bg: string }> = {
  focus: {
    ring: "stroke-tomato-500",
    fill: "fill-tomato-500",
    glow: "drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]",
    bg: "from-tomato-50 dark:from-tomato-600/10 to-transparent",
  },
  shortBreak: {
    ring: "stroke-emerald-500 dark:stroke-emerald-400",
    fill: "fill-emerald-500 dark:fill-emerald-400",
    glow: "drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]",
    bg: "from-emerald-50 dark:from-emerald-600/10 to-transparent",
  },
  longBreak: {
    ring: "stroke-sky-500 dark:stroke-sky-400",
    fill: "fill-sky-500 dark:fill-sky-400",
    glow: "drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]",
    bg: "from-sky-50 dark:from-sky-600/10 to-transparent",
  },
};

const RING_R = 90;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(totalSeconds: number): string {
  const clamped = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Timer() {
  const mode = useTimerStore((s) => s.mode);
  const isRunning = useTimerStore((s) => s.isRunning);
  const focusCount = useTimerStore((s) => s.focusCount);
  const todayCount = useTimerStore((s) => s.todayCount);
  const completionEvent = useTimerStore((s) => s.completionEvent);
  const clearCompletionEvent = useTimerStore((s) => s.clearCompletionEvent);
  const switchMode = useTimerStore((s) => s.switchMode);

  const timeLeft = useTick();

  const totalDuration = useTimerStore.getState().getTotalDuration();
  const progress = totalDuration > 0 ? timeLeft / totalDuration : 0;

  // ---- Record completed pomodoro ----
  const lastRecordedCount = useRef(0);
  useEffect(() => {
    if (focusCount > lastRecordedCount.current) {
      lastRecordedCount.current = focusCount;
      window.api.recordPomodoro().then((newCount) => {
        useTimerStore.getState().setTodayCount(newCount);
      });
    }
  }, [focusCount]);

  // ---- IPC sync ----
  const lastSyncedSecond = useRef(-1);
  useEffect(() => {
    const second = Math.ceil(timeLeft);
    if (second !== lastSyncedSecond.current) {
      lastSyncedSecond.current = second;
      window.api.updateProgress(isRunning ? progress : -1);
    }
  }, [timeLeft, isRunning, progress]);

  useEffect(() => {
    window.api.trayStateChanged(isRunning, mode);
  }, [isRunning, mode]);

  useEffect(() => {
    if (completionEvent) {
      window.api.notifySessionComplete(
        completionEvent.completedMode,
        completionEvent.nextMode,
        completionEvent.focusCount
      );
      clearCompletionEvent();
    }
  }, [completionEvent, clearCompletionEvent]);

  useEffect(() => {
    document.title = isRunning
      ? `${formatTime(timeLeft)} — 番茄时钟`
      : "番茄时钟";
  }, [timeLeft, isRunning]);

  const accent = MODE_ACCENT[mode];
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

  // Arrow tip at the end of the progress arc (SVG coordinates, before CSS rotation)
  const arrowAngle = progress * 2 * Math.PI;
  const arrowX = 100 + RING_R * Math.cos(arrowAngle);
  const arrowY = 100 + RING_R * Math.sin(arrowAngle);
  const arrowRotation = progress * 360 + 90;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-6 bg-gradient-to-b ${accent.bg} rounded-3xl px-8 py-8 mx-4 transition-colors duration-300`}
    >
      {/* Mode tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl p-1 transition-colors duration-300">
        {(["focus", "shortBreak", "longBreak"] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              mode === m
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm dark:shadow"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Circular progress + time + arrow tip */}
      <div className="relative flex items-center justify-center">
        <svg
          className={`w-56 h-56 -rotate-90 ${accent.glow}`}
          viewBox="0 0 200 200"
        >
          {/* Track */}
          <circle
            cx="100"
            cy="100"
            r={RING_R}
            fill="none"
            strokeWidth="6"
            className="stroke-gray-200 dark:stroke-gray-800"
          />
          {/* Progress arc */}
          <circle
            cx="100"
            cy="100"
            r={RING_R}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className={`${accent.ring} transition-[stroke] duration-500`}
            style={{
              strokeDasharray: RING_CIRCUMFERENCE,
              strokeDashoffset: dashOffset,
              transition: "stroke 0.5s ease",
            }}
          />
          {/* Arrow tip at the end of the progress arc */}
          {progress > 0.02 && (
            <g transform={`translate(${arrowX}, ${arrowY}) rotate(${arrowRotation})`}>
              {/* Shadow glow */}
              <polygon
                points="-5,-4 6,0 -5,4"
                className={accent.fill}
                opacity="0.3"
                style={{ filter: "blur(3px)" }}
              />
              {/* Solid arrow */}
              <polygon
                points="-4,-3.5 5,0 -4,3.5"
                className={`${accent.fill} transition-[fill] duration-500`}
              />
            </g>
          )}
          {/* Small dot at the start (top center) to mark origin */}
          <circle
            cx={100 + RING_R}
            cy="100"
            r="3"
            className="fill-gray-300 dark:fill-gray-700"
          />
        </svg>

        {/* Time readout */}
        <div className="absolute flex flex-col items-center gap-1">
          <span className="text-6xl font-light tracking-wider text-gray-900 dark:text-white tabular-nums font-mono transition-colors duration-300">
            {formatTime(timeLeft)}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 tracking-wide transition-colors duration-300">
            {MODE_LABELS[mode]}
          </span>
        </div>
      </div>

      {/* Status strip */}
      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">
        <span
          className={`inline-block w-2 h-2 rounded-full transition-colors ${
            isRunning ? "bg-green-500 dark:bg-green-400 animate-pulse" : "bg-gray-300 dark:bg-gray-600"
          }`}
        />
        <span>{isRunning ? "进行中" : "已暂停"}</span>
        <span className="text-gray-200 dark:text-gray-700">|</span>
        <span>今日 {todayCount} 个番茄</span>
      </div>

      {/* Cycle flow indicator */}
      <CycleFlow />
    </div>
  );
}
