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

const CHROME_PROBE_IDS = {
  top: "__aethera_chrome_probe_top",
  bottom: "__aethera_chrome_probe_bottom",
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

function upsertChromeProbe(edge: "top" | "bottom", barColor: string) {
  const id = CHROME_PROBE_IDS[edge];
  let probe = document.getElementById(id);

  if (!probe) {
    probe = document.createElement("div");
    probe.id = id;
    probe.setAttribute("aria-hidden", "true");
    document.body?.appendChild(probe);
  }

  const insetName = edge === "top" ? "safe-area-inset-top" : "safe-area-inset-bottom";
  Object.assign(probe.style, {
    position: "fixed",
    left: "0",
    right: "0",
    top: edge === "top" ? "0" : "",
    bottom: edge === "bottom" ? "0" : "",
    height: `max(env(${insetName}, 0px), 1px)`,
    backgroundColor: barColor,
    pointerEvents: "none",
    zIndex: "2147483647",
    opacity: "1",
    transform: "translateZ(0)",
    willChange: "background-color, opacity, transform",
    contain: "paint",
  });

  return probe;
}

function refreshChromeProbes(barColor: string) {
  if (!document.body) return;

  const probes = [
    upsertChromeProbe("top", barColor),
    upsertChromeProbe("bottom", barColor),
  ];

  // iOS Safari sometimes keeps the browser toolbar tinted from the previous
  // composited edge pixels. Toggling a fixed edge pixel nudges WebKit to
  // resample without visibly covering the app.
  const tick = Date.now().toString(36);
  document.body.dataset.aetheraChromeTick = tick;

  for (const probe of probes) {
    probe.style.backgroundColor = barColor;
    probe.style.opacity = "0.999";
    probe.style.transform = `translateZ(0) scaleY(${tick.endsWith("0") ? "1.001" : "1"})`;
  }

  requestAnimationFrame(() => {
    for (const probe of probes) {
      probe.style.opacity = "1";
      probe.style.transform = "translateZ(0)";
    }
  });
}

function writeChrome(theme: ThemeKey) {
  const resolved = resolveTheme(theme);
  const barColor = THEME_BAR[resolved];
  const scheme = THEME_SCHEME[resolved];
  const root = document.documentElement;

  root.setAttribute("data-theme", theme);
  root.style.setProperty("--browser-chrome-bg", barColor);
  root.style.backgroundColor = barColor;
  root.style.colorScheme = scheme;

  if (document.body) {
    document.body.style.setProperty("--browser-chrome-bg", barColor);
    document.body.style.backgroundColor = barColor;
    document.body.style.colorScheme = scheme;
  }

  setSingleMeta("theme-color", barColor);
  setSingleMeta("color-scheme", scheme);
  setSingleMeta("supported-color-schemes", "dark light");
  setSingleMeta("apple-mobile-web-app-status-bar-style", resolved === "dark" ? "black" : "default");
  refreshChromeProbes(barColor);
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
