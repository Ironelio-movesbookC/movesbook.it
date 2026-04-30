export async function setDefaultThemeBySystem() {
  const theme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  return theme;  
}