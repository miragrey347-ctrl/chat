export type ThemeKey = "system" | "dark" | "light";
export type ResolvedThemeKey = Exclude<ThemeKey, "system">;

export const DEFAULT_THEME: ThemeKey = "dark";

export const THEME_BAR: Record<ResolvedThemeKey, string> = {
  dark: "#2b2520",
  light: "#f5f0eb",
};

// Accent swatch shown in the theme picker.
export const THEME_SWATCH: Record<ResolvedThemeKey, string> = {
  dark: "#c4956a",
  light: "#d4b896",
};

export const THEME_SCHEME: Record<ResolvedThemeKey, "dark" | "light"> = {
  dark: "dark",
  light: "light",
};

const VALID_THEME_KEYS: Record<string, true> = {
  system: true,
  dark: true,
  light: true,
};

declare global {
  interface Window {
    __aetheraApplyChrome?: (theme?: string) => void;
  }
}

export function normalizeTheme(value: string | null | undefined): ThemeKey {
  return value && VALID_THEME_KEYS[value] ? (value as ThemeKey) : DEFAULT_THEME;
}

export function resolveTheme(theme: string | null | undefined): ResolvedThemeKey {
  const normalized = normalizeTheme(theme);
  if (
    normalized === "system" &&
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  ) {
    return "light";
  }
  return normalized === "light" ? "light" : "dark";
}

function setSingleMeta(name: string, content: string) {
  const existing = Array.from(document.querySelectorAll<HTMLMetaElement>(`meta[name="${name}"]`));
  let meta = existing[0];

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", name);
    document.head.prepend(meta);
  }

  for (const duplicate of existing.slice(1)) {
    duplicate.remove();
  }

  meta.setAttribute("content", content);
  meta.removeAttribute("media");
  meta.setAttribute("data-aethera-chrome", "true");
  return meta;
}

function writeChrome(theme: ThemeKey) {
  const resolved = resolveTheme(theme);
  const barColor = THEME_BAR[resolved];
  const scheme = THEME_SCHEME[resolved];
  const root = document.documentElement;

  root.setAttribute("data-theme", theme);
  root.style.backgroundColor = barColor;
  root.style.colorScheme = scheme;

  if (document.body) {
    document.body.style.backgroundColor = barColor;
    document.body.style.colorScheme = scheme;
  }

  setSingleMeta("theme-color", barColor);
  setSingleMeta("color-scheme", scheme);
  setSingleMeta("supported-color-schemes", "dark light");
  setSingleMeta("apple-mobile-web-app-status-bar-style", resolved === "dark" ? "black" : "default");
}

export function applyChrome(theme?: string | null) {
  if (typeof document === "undefined") return;

  let nextTheme = normalizeTheme(theme);

  if (theme == null) {
    try {
      nextTheme = normalizeTheme(localStorage.getItem("color-mode"));
    } catch {
      nextTheme = DEFAULT_THEME;
    }
  }

  writeChrome(nextTheme);

  const repeat = () => writeChrome(nextTheme);
  requestAnimationFrame(() => {
    repeat();
    requestAnimationFrame(repeat);
  });
  window.setTimeout(repeat, 80);
  window.setTimeout(repeat, 250);
  window.setTimeout(repeat, 700);
}
