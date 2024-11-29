"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function useThemeDetector() {
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(theme === "dark");
  }, [theme]);

  return isDark;
}
