import { useTimerStore } from "@/store/useTimerStore";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";

export default function Controls() {
  const isRunning = useTimerStore((s) => s.isRunning);
  const start = useTimerStore((s) => s.start);
  const pause = useTimerStore((s) => s.pause);
  const reset = useTimerStore((s) => s.reset);
  const skip = useTimerStore((s) => s.skip);

  return (
    <div className="flex items-center justify-center gap-5">
      {/* Reset */}
      <button
        onClick={reset}
        className="control-btn"
        title="重置"
        aria-label="重置"
      >
        <RotateCcw size={18} strokeWidth={2} />
      </button>

      {/* Play / Pause */}
      <button
        onClick={isRunning ? pause : start}
        className={`control-btn-primary ${
          isRunning
            ? "bg-tomato-600/80 hover:bg-tomato-500 shadow-tomato-600/25"
            : "bg-tomato-500 hover:bg-tomato-400 shadow-tomato-500/30"
        }`}
        title={isRunning ? "暂停" : "开始"}
        aria-label={isRunning ? "暂停" : "开始"}
      >
        {isRunning ? (
          <Pause size={24} strokeWidth={2.5} />
        ) : (
          <Play size={24} strokeWidth={2.5} className="ml-0.5" />
        )}
      </button>

      {/* Skip */}
      <button
        onClick={skip}
        className="control-btn"
        title="跳过当前阶段"
        aria-label="跳过当前阶段"
      >
        <SkipForward size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
