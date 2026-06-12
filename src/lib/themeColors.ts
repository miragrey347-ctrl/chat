// Status-bar / root background color per theme (= each theme's --bg-primary)
// and the accent swatch shown in the theme picker. The inline boot script in
// layout.tsx carries its own embedded copy (it runs before any module loads).
export const THEME_BAR: Record<string, string> = {
  dark: "#2b2520",
  light: "#f5f0eb",
  sage: "#eef1e9",
  lavender: "#f0edf5",
  ocean: "#20272f",
  plum: "#2b232c",
};

export const THEME_SWATCH: Record<string, string> = {
  dark: "#c4956a",
  light: "#d4b896",
  sage: "#7d9a68",
  lavender: "#9a82c4",
  ocean: "#7aaccb",
  plum: "#c98aa6",
};

export function resolveTheme(theme: string, prefersDark: boolean): string {
  return theme === "system" ? (prefersDark ? "dark" : "light") : theme;
}
