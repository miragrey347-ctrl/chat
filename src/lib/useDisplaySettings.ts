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

  useEffect(() => {
    setSettings(loadSettings());

    // Listen for changes from settings page (same tab)
    const handleStorage = () => {
      setSettings(loadSettings());
    };

    // Custom event for same-tab updates
    window.addEventListener("display-settings-changed", handleStorage);
    // storage event for cross-tab
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) handleStorage();
    });

    return () => {
      window.removeEventListener("display-settings-changed", handleStorage);
    };
  }, []);

  return settings;
}

// Call this after saving settings to notify other components in the same tab
export function notifyDisplaySettingsChanged() {
  window.dispatchEvent(new Event("display-settings-changed"));
}
