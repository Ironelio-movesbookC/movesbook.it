import { setDefaultThemeBySystem } from "@/hooks/useTheme";

export  function getCurrentTheme() {
    const theme =
        typeof window !== "undefined"
            ? localStorage.getItem("theme")
            : null;
    if (theme) {
        return theme =="dark"? "dark" : "light";
    } else {
        const defaultTheme = setDefaultThemeBySystem();
        return defaultTheme;
    }
}