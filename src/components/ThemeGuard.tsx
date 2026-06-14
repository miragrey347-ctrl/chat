"use client";

import { useEffect } from "react";

// Re-assert the stored theme after React hydration — iOS has been observed
// wiping data-theme during hydration, falling back to :root dark variables.
// CSS handles background-color and color-scheme via var(--bg-primary) and
// the color-scheme property in each theme block, so no meta or inline style
// manipulation needed.
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
    } catch {
      /* never break the app over theming */
    }
  }, []);
  return null;
}
