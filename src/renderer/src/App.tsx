import { useEffect, useState } from "react";
import Timer from "./components/Timer";
import Controls from "./components/Controls";
import Settings from "./components/Settings";
import { useTimerStore } from "./store/useTimerStore";
import { useTheme } from "./hooks/useTheme";
import { Pin, PinOff, Settings as SettingsIcon, Sun, Moon, Download, ChevronDown } from "lucide-react";

export default function App() {
  const [isOnTop, setIsOnTop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // ── Update state ──
  const [updateVersion, setUpdateVersion] = useState("");
  const [downloadPct, setDownloadPct] = useState(0);
  const [updateReady, setUpdateReady] = useState(false);

  // ---- Hydrate from persistent storage ----
  useEffect(() => {
    Promise.all([
      window.api.getSettings(),
      window.api.getTodayCount(),
    ]).then(([settings, todayCount]) => {
      useTimerStore.getState().loadFromStorage(settings, todayCount);
    });
  }, []);

  // ---- Tray actions ----
  useEffect(() => {
    const unsub = window.api.onTrayAction((action) => {
      const store = useTimerStore.getState();
      switch (action) {
        case "start": store.start(); break;
        case "pause": store.pause(); break;
        case "reset": store.reset(); break;
      }
    });
    return unsub;
  }, []);

  // ---- Always-on-top ----
  useEffect(() => {
    const unsub = window.api.onAlwaysOnTopChanged(setIsOnTop);
    return unsub;
  }, []);
  useEffect(() => { window.api.isAlwaysOnTop().then(setIsOnTop); }, []);
  const handleToggleOnTop = async () => setIsOnTop(await window.api.toggleAlwaysOnTop());

  // ---- Auto-update listeners ----
  useEffect(() => {
    const unsubs = [
      window.api.onUpdateAvailable((version) => {
        setUpdateVersion(version);
        setDownloadPct(0);
      }),
      window.api.onUpdateProgress((pct) => setDownloadPct(pct)),
      window.api.onUpdateDownloaded((version) => {
        setUpdateVersion(version);
        setUpdateReady(true);
      }),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-950 overflow-hidden select-none transition-colors duration-300">

      {/* ── Title bar ── */}
      <div className="h-9 app-drag-region relative flex items-center">
        <button
          onClick={() => setShowSettings(true)}
          className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-600 dark:hover:text-gray-300 dark:hover:bg-gray-800/60 transition-colors app-no-drag"
          title="设置"
        >
          <SettingsIcon size={14} />
        </button>

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 app-no-drag">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-600 dark:hover:text-gray-300 dark:hover:bg-gray-800/60 transition-colors"
            title={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          <button
            onClick={handleToggleOnTop}
            className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
              isOnTop
                ? "bg-tomato-100 text-tomato-600 hover:bg-tomato-200 dark:bg-tomato-600/30 dark:text-tomato-400 dark:hover:bg-tomato-600/50"
                : "text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-600 dark:hover:text-gray-300 dark:hover:bg-gray-800/60"
            }`}
            title={isOnTop ? "取消置顶" : "始终置顶"}
          >
            {isOnTop ? <PinOff size={13} /> : <Pin size={13} />}
          </button>
        </div>
      </div>

      {/* ── Update banner (non-intrusive) ── */}
      {updateReady ? (
        <div className="mx-4 mt-2 flex items-center justify-between gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-4 py-2.5 text-sm transition-colors duration-300">
          <span className="text-emerald-700 dark:text-emerald-300">
            v{updateVersion} 已就绪
          </span>
          <button
            onClick={() => window.api.installUpdate()}
            className="shrink-0 rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-xs font-medium text-white transition-colors"
          >
            重启更新
          </button>
        </div>
      ) : downloadPct > 0 ? (
        <div className="mx-4 mt-2 flex items-center gap-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-4 py-2 text-xs text-blue-600 dark:text-blue-400 transition-colors duration-300">
          <Download size={13} className="shrink-0 animate-bounce" />
          <span>正在下载更新… {downloadPct}%</span>
        </div>
      ) : null}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <h1 className="text-lg font-medium text-gray-400 dark:text-gray-500 tracking-widest uppercase">
          番茄时钟
        </h1>

        {/* Connecting arrow: title → timer */}
        <ChevronDown
          size={18}
          strokeWidth={2}
          className="text-gray-200 dark:text-gray-800 -mt-1"
        />

        <Timer />

        {/* Connecting arrow: timer → controls */}
        <ChevronDown
          size={18}
          strokeWidth={2}
          className="text-gray-200 dark:text-gray-800 -mt-1"
        />

        <Controls />
      </div>

      {/* ── Footer ── */}
      <div className="text-center text-[11px] text-gray-300 dark:text-gray-700 pb-3 transition-colors duration-300">
        Pomodoro Timer v1.0
      </div>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}
