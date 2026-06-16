"use client";

import { useEffect } from "react";
import { applyChrome, normalizeTheme } from "@/lib/themeColors";

// Re-assert the stored theme after hydration and when Safari resumes the page.
export default function ThemeGuard() {
  useEffect(() => {
    const readTheme = () => {
      try {
        const theme = normalizeTheme(localStorage.getItem("color-mode"));
        localStorage.setItem("color-mode", theme);
        return theme;
      } catch {
        return "dark";
      }
    };

    const reapply = () => applyChrome(readTheme());
    const reapplyIfSystem = () => {
      if (readTheme() === "system") reapply();
    };
    const reapplyWhenVisible = () => {
      if (document.visibilityState === "visible") reapply();
    };

    reapply();
    window.__aetheraApplyChrome = applyChrome;

    const media = window.matchMedia("(prefers-color-scheme: light)");
    if (media.addEventListener) {
      media.addEventListener("change", reapplyIfSystem);
    } else {
      media.addListener(reapplyIfSystem);
    }
    window.addEventListener("pageshow", reapply);
    window.addEventListener("focus", reapply);
    window.addEventListener("storage", reapply);
    document.addEventListener("visibilitychange", reapplyWhenVisible);

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", reapplyIfSystem);
      } else {
        media.removeListener(reapplyIfSystem);
      }
      window.removeEventListener("pageshow", reapply);
      window.removeEventListener("focus", reapply);
      window.removeEventListener("storage", reapply);
      document.removeEventListener("visibilitychange", reapplyWhenVisible);
    };
  }, []);

  return null;
}
