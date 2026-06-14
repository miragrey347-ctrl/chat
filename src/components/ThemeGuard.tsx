"use client";

import { useEffect } from "react";
import { THEME_BAR, THEME_SCHEME, resolveTheme, applyChrome } from "@/lib/themeColors";

// The boot script in layout.tsx sets data-theme before first paint, but on
// iOS a post-hydration pass was observed wiping it (content fell back to the
// :root dark variables while the meta color survived). This re-asserts the
// stored theme once the React tree is mounted — by then nothing else will
// touch the root element. Renders nothing.
export default function ThemeGuard() {
  useEffect(() => {
    try {
      let t = localStorage.getItem("color-mode") || "dark";
      // Migrate removed custom themes back to dark
      if (t !== "system" && t !== "dark" && t !== "light") {
        t = "dark";
        localStorage.setItem("color-mode", "dark");
      }
      document.documentElement.setAttribute("data-theme", t);
      const r = resolveTheme(t, window.matchMedia("(prefers-color-scheme: dark)").matches);
      applyChrome(THEME_BAR[r] || THEME_BAR.dark, THEME_SCHEME[r] || "dark");
    } catch {
      /* never break the app over theming */
    }
  }, []);
  return null;
}
