import { Languages, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackEvent } from "@/lib/analytics";

export const LanguageSwitcher = () => {
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = (nextLanguage: "en" | "hi") => {
    if (nextLanguage === language) return;

    void trackEvent({
      eventName: "language_toggle",
      metadata: {
        from: language,
        to: nextLanguage,
      },
    });

    setLanguage(nextLanguage);
  };

  return (
    <div className="fixed bottom-5 right-4 z-50 md:bottom-auto md:right-6 md:top-20">
      <div className="mystic-glass group relative flex items-center gap-1 rounded-full border border-primary/50 p-1 shadow-mystic">
        <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 opacity-60" />
        <span className="sr-only">Toggle language</span>

        <button
          type="button"
          onClick={() => handleLanguageChange("en")}
          className="relative z-10 inline-flex h-8 min-w-16 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors"
        >
          {language === "en" && <span className="absolute inset-0 rounded-full bg-primary/20 ring-1 ring-primary/50" />}
          <span className="relative">{t("common.language.english")}</span>
        </button>

        <button
          type="button"
          onClick={() => handleLanguageChange("hi")}
          className="relative z-10 inline-flex h-8 min-w-16 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors"
        >
          {language === "hi" && <span className="absolute inset-0 rounded-full bg-primary/20 ring-1 ring-primary/50" />}
          <span className="relative">{t("common.language.hindi")}</span>
        </button>

        <div className="relative z-10 mr-1 hidden items-center gap-1 rounded-full border border-border/70 bg-background/40 px-2 py-1 text-[10px] text-muted-foreground sm:inline-flex">
          <Languages className="h-3 w-3 text-primary" aria-hidden="true" />
          <Sparkles className="h-3 w-3 text-primary animate-nebula-drift" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};
