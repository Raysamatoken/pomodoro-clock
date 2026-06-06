import { useEffect, useRef, useCallback, useState } from "react";
import { useTimerStore } from "@/store/useTimerStore";
import { usePageVisibility } from "./useVisibility";

/**
 * Precise timer hook using absolute timestamps.
 *
 * When the window is hidden the rAF loop is paused entirely — the timer
 * state lives in the Zustand store (startTimestamp + elapsedAtPause) so
 * accuracy is preserved without burning CPU on invisible frames.
 */
export function useTick() {
  const isRunning = useTimerStore((s) => s.isRunning);
  const startTimestamp = useTimerStore((s) => s.startTimestamp);
  const elapsedAtPause = useTimerStore((s) => s.elapsedAtPause);
  const mode = useTimerStore((s) => s.mode);
  const isVisible = usePageVisibility();

  const [timeLeft, setTimeLeft] = useState(() =>
    useTimerStore.getState().getTimeLeft()
  );

  const getTimeLeft = useCallback(
    () => useTimerStore.getState().getTimeLeft(),
    []
  );

  useEffect(() => {
    // When paused OR hidden, just snapshot once (no rAF burn)
    if (!isRunning || !isVisible) {
      setTimeLeft(getTimeLeft());
      return;
    }

    let rafId: number;
    let completed = false;

    const tick = () => {
      if (completed) return;

      const tl = getTimeLeft();
      setTimeLeft(tl);

      if (tl <= 0) {
        completed = true;
        useTimerStore.getState().completeSession();
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      completed = true;
      cancelAnimationFrame(rafId);
    };
  }, [isRunning, startTimestamp, elapsedAtPause, mode, isVisible, getTimeLeft]);

  return timeLeft;
}
