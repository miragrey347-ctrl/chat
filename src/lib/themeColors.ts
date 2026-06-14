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

// Apply the chrome colors (status-bar meta, color-scheme meta, root
// background). WebKit applies dynamic theme-color changes to its top and
// bottom tints lazily — and sometimes drops one of them — so the values are
// re-asserted on the next frames and once more shortly after.
export function applyChrome(themeColor: string, scheme: string) {
  if (typeof document === "undefined") return;
  const set = () => {
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", themeColor);
    const s = document.querySelector('meta[name="color-scheme"]');
    if (s) s.setAttribute("content", scheme);
    document.documentElement.style.backgroundColor = themeColor;
  };
  set();
  requestAnimationFrame(() => requestAnimationFrame(set));
  setTimeout(set, 250);
}
