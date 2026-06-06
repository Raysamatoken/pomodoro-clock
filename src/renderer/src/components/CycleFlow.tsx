import { useTimerStore } from "@/store/useTimerStore";
import { ChevronRight, Coffee } from "lucide-react";

/**
 * Pomodoro cycle flow indicator.
 *
 * Renders a horizontal row of dots representing each focus session in the
 * current cycle, connected by arrows.  The last arrow leads to a long-break
 * node.  Completed sessions are filled, the current one pulses, and future
 * ones are dimmed.
 */
export default function CycleFlow() {
  const focusCount = useTimerStore((s) => s.focusCount);
  const mode = useTimerStore((s) => s.mode);
  const sessions = useTimerStore((s) => s.sessionsBeforeLongBreak);

  const done = focusCount % sessions; // completed in current cycle

  return (
    <div className="flex items-center justify-center gap-1">
      {Array.from({ length: sessions }, (_, i) => {
        const completed = i < done;
        const active = i === done && mode === "focus";

        return (
          <div key={i} className="flex items-center gap-1">
            {/* Session node */}
            <div
              className={`cycle-node ${
                completed
                  ? "cycle-node-done"
                  : active
                    ? "cycle-node-active"
                    : "cycle-node-idle"
              }`}
            >
              {completed ? (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2 6l3 3 5-5" />
                </svg>
              ) : (
                <span>{i + 1}</span>
              )}
            </div>

            {/* Arrow to next node */}
            {i < sessions - 1 && (
              <ChevronRight
                size={11}
                strokeWidth={2.5}
                className={completed ? "text-tomato-400 dark:text-tomato-500" : "text-gray-200 dark:text-gray-700"}
              />
            )}
          </div>
        );
      })}

      {/* Arrow → long break */}
      <ChevronRight
        size={11}
        strokeWidth={2.5}
        className={done === sessions ? "text-sky-400 dark:text-sky-500" : "text-gray-200 dark:text-gray-700"}
      />

      {/* Long-break node */}
      <div
        className={`cycle-node ${
          mode === "longBreak"
            ? "bg-sky-400 text-white ring-2 ring-sky-200 dark:ring-sky-800"
            : done === sessions
              ? "bg-sky-100 dark:bg-sky-900/40 text-sky-500 dark:text-sky-400"
              : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600"
        }`}
      >
        <Coffee size={10} />
      </div>
    </div>
  );
}
