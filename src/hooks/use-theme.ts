import { useState, useEffect, useCallback } from "react";
import { ThemeMode } from "@/types/theme-mode";
import { THEME_CHANGE_EVENT } from "@/helpers/theme_helpers";

const THEME_KEY = "theme";

/**
 * Hook to get the current theme mode.
 * Uses custom events instead of polling for efficient updates.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    return stored || "system";
  });

  const updateTheme = useCallback(() => {
    const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    setThemeState(stored || "system");
  }, []);

  useEffect(() => {
    // Listen for theme changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_KEY) {
        updateTheme();
      }
    };

    // Listen for theme changes from same window (custom event)
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: ThemeMode }>;
      setThemeState(customEvent.detail.theme);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    };
  }, [updateTheme]);

  return { theme };
}
