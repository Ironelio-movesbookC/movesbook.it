export type ThemeMode = "light" | "dark";

export async function setDefaultThemeBySystem(): Promise<ThemeMode> {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}