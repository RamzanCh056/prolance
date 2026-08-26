import { useEffect } from "react";

const KEY = "ft-theme";

/** App is dark-only. Call once at the root so localStorage / OS preference cannot switch it. */
export function useLockedDarkTheme() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.style.colorScheme = "dark";
    localStorage.setItem(KEY, "dark");
  }, []);
}
