export const THEME_STORAGE_KEY = "fittrack-theme-preference";

const THEMES = new Set(["light", "dark", "system"]);

export function normalizeThemePreference(value) {
  const theme = `${value || ""}`.toLowerCase();
  return THEMES.has(theme) ? theme : "system";
}

export function getStoredThemePreference() {
  if (typeof window === "undefined") return "system";
  return normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
}

export function resolveThemePreference(preference) {
  const theme = normalizeThemePreference(preference);
  if (theme === "dark") return true;
  if (theme === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyThemePreference(preference) {
  const theme = normalizeThemePreference(preference);
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", resolveThemePreference(theme));
    document.documentElement.dataset.theme = theme;
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
  return theme;
}

export function applyStoredThemePreference() {
  return applyThemePreference(getStoredThemePreference());
}
