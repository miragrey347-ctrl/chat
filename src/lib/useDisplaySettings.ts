"use client";

import { useState, useEffect, useCallback } from "react";

export interface DisplaySettings {
  showAvatars: boolean;
  showNames: boolean;
  showTimestamps: boolean;
  showTokenStats: boolean;
  showCostEstimate: boolean;
  showCacheStatus: boolean;
  thinkingMarkdown: boolean;
  userMarkdown: boolean;
  assistantMarkdown: boolean;
  latexRendering: boolean;
  autoCollapseThinking: boolean;
  showSidebar: boolean;
  enterToNewline: boolean;
}

export const DISPLAY_DEFAULTS: DisplaySettings = {
  showAvatars: false,
  showNames: false,
  showTimestamps: true,
  showTokenStats: true,
  showCostEstimate: false,
  showCacheStatus: false,
  thinkingMarkdown: false,
  userMarkdown: false,
  assistantMarkdown: true,
  latexRendering: true,
  autoCollapseThinking: true,
  showSidebar: true,
  enterToNewline: true,
};

const STORAGE_KEY = "display-settings";

function loadSettings(): DisplaySettings {
  if (typeof window === "undefined") return DISPLAY_DEFAULTS;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...DISPLAY_DEFAULTS, ...saved };
  } catch {
    return DISPLAY_DEFAULTS;
  }
}

export function useDisplaySettings() {
  const [settings, setSettings] = useState<DisplaySettings>(DISPLAY_DEFAULTS);

  const refresh = useCallback(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    // Read on mount
    refresh();

    // Re-read when page becomes visible (handles Next.js router cache)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    // Re-read on window focus (handles tab switching & navigation back)
    const handleFocus = () => refresh();

    // Custom event for same-page updates
    const handleCustom = () => refresh();

    // Storage event for cross-tab updates
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("display-settings-changed", handleCustom);
    window.addEventListener("storage", handleStorage);

    // Also poll on a short interval as ultimate fallback for route changes
    const poll = setInterval(refresh, 2000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("display-settings-changed", handleCustom);
      window.removeEventListener("storage", handleStorage);
      clearInterval(poll);
    };
  }, [refresh]);

  return settings;
}

export function notifyDisplaySettingsChanged() {
  window.dispatchEvent(new Event("display-settings-changed"));
}
