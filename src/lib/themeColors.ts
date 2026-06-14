// Status-bar / root background color per theme (= each theme's --bg-primary)
// and the accent swatch shown in the theme picker. The inline boot script in
// layout.tsx carries its own embedded copy (it runs before any module loads).
export const THEME_BAR: Record<string, string> = {
  dark: "#2b2520",
  light: "#f5f0eb",
};

export const THEME_SWATCH: Record<string, string> = {
  dark: "#c4956a",
  light: "#d4b896",
};

// Light/dark family of each theme, used for the color-scheme meta —
// Safari weighs it when deciding whether to adopt a dark theme-color
// for its chrome on a light-appearance system.
export const THEME_SCHEME: Record<string, string> = {
  dark: "dark",
  light: "light",
};

export function resolveTheme(theme: string, prefersDark: boolean): string {
  return theme === "system" ? (prefersDark ? "dark" : "light") : theme;
}

// Sync the color-scheme meta and root background. Safari derives its
// chrome tints from the page's actual background-color — no meta
// theme-color needed (removing it fixed top/bottom bar mismatches).
export function applyChrome(themeColor: string, scheme: string) {
  if (typeof document === "undefined") return;
  const s = document.querySelector('meta[name="color-scheme"]');
  if (s) s.setAttribute("content", scheme);
  document.documentElement.style.backgroundColor = themeColor;
}
