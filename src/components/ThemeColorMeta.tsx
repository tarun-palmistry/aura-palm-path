import { useEffect } from "react";
import { useTheme } from "next-themes";

const THEME_COLOR_DARK = "#0d071a";
const THEME_COLOR_LIGHT = "#f4f0e8";

/** Keeps <meta name="theme-color"> in sync with resolved light/dark (browser UI / PWA). */
export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const isDark =
      resolvedTheme === "dark" ||
      (resolvedTheme == null && document.documentElement.classList.contains("dark"));
    meta.setAttribute("content", isDark ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
  }, [resolvedTheme]);

  return null;
}
