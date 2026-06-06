import { useState, useEffect } from "react";

/**
 * Tracks `document.visibilityState` so other hooks can pause expensive work
 * (e.g. the rAF render loop) when the window is hidden / minimised.
 */
export function usePageVisibility(): boolean {
  const [visible, setVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const handler = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  return visible;
}
