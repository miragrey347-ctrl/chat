"use client";

import { useEffect } from "react";
import { THEME_BAR, resolveTheme } from "@/lib/themeColors";

// The boot script in layout.tsx sets data-theme before first paint, but on
// iOS a post-hydration pass was observed wiping it (content fell back to the
// :root dark variables while the meta color survived). This re-asserts the
// stored theme once the React tree is mounted — by then nothing else will
// touch the root element. Renders nothing.
export default function ThemeGuard() {
  useEffect(() => {
    try {
      const t = localStorage.getItem("color-mode") || "dark";
      document.documentElement.setAttribute("data-theme", t);
      const c =
        THEME_BAR[
          resolveTheme(t, window.matchMedia("(prefers-color-scheme: dark)").matches)
        ] || THEME_BAR.dark;
      document.documentElement.style.backgroundColor = c;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", c);
    } catch {
      /* never break the app over theming */
    }
  }, []);
  return null;
}
