"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";

export interface DisplaySettings {
  showAvatars: boolean;
  showNames: boolean;
  showTimestamps: boolean;
  showTokenStats: boolean;
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

// Simple event-driven approach - no polling
let cachedSettings: DisplaySettings | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): DisplaySettings {
  if (!cachedSettings) cachedSettings = loadSettings();
  return cachedSettings;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDisplaySettings(): DisplaySettings {
  const [settings, setSettings] = useState<DisplaySettings>(DISPLAY_DEFAULTS);

  useEffect(() => {
    // Load on mount
    setSettings(loadSettings());

    const refresh = () => {
      cachedSettings = loadSettings();
      setSettings(cachedSettings);
    };

    const handleCustom = () => refresh();
    const handleStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) refresh(); };
    const handleFocus = () => refresh();

    window.addEventListener("display-settings-changed", handleCustom);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("display-settings-changed", handleCustom);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return settings;
}

export function notifyDisplaySettingsChanged() {
  cachedSettings = null;
  window.dispatchEvent(new Event("display-settings-changed"));
}
