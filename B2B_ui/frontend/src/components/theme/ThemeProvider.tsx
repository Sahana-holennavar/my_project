"use client";

import { ThemeContext, useThemeManager } from "@/hooks/useTheme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeManager = useThemeManager();

  return (
    <ThemeContext.Provider value={themeManager}>
      {children}
    </ThemeContext.Provider>
  );
}
