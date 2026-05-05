import { setDefaultThemeBySystem } from "@/hooks/useTheme";

export function getCurrentTheme(): "light" | "dark" {
    const theme =
        typeof window !== "undefined"
            ? localStorage.getItem("theme")
            : null;

    if (theme) {
        return theme === "dark" ? "dark" : "light";
    }

    return setDefaultThemeBySystem();
}