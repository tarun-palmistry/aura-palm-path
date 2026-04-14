import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn("flex h-9 w-[5.5rem] items-center justify-center", className)}
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Sun
        className={cn("h-4 w-4 shrink-0", isDark ? "text-muted-foreground" : "text-primary")}
        aria-hidden
      />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label={t("common.theme.toggle")}
        title={isDark ? t("common.theme.dark") : t("common.theme.light")}
      />
      <Moon
        className={cn("h-4 w-4 shrink-0", isDark ? "text-primary" : "text-muted-foreground")}
        aria-hidden
      />
    </div>
  );
}
