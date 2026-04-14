import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

type Star = { top: number; left: number; size: number; delay: number };

function createStars(count: number) {
  const stars: Star[] = [];
  for (let i = 0; i < count; i += 1) {
    stars.push({
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: 1 + Math.random() * 2.2,
      delay: Math.random() * 180,
    });
  }
  return stars;
}

export function LanguageSwitchFX() {
  const { isSwitchingLanguage } = useLanguage();
  const [render, setRender] = useState(false);
  const stars = useMemo(() => createStars(22), []);

  useEffect(() => {
    if (!isSwitchingLanguage) return;
    setRender(true);
  }, [isSwitchingLanguage]);

  if (!render) return null;

  return (
    <div
      aria-hidden="true"
      onAnimationEnd={() => setRender(false)}
      className={cn(
        "pointer-events-none fixed inset-0 z-[60] overflow-hidden",
        "animate-languageveil",
      )}
    >
      <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px] [will-change:opacity,transform]" />

      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[120vmax] w-[120vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.32)_0%,transparent_56%)] animate-languagepulse" />
        <div className="absolute left-1/2 top-1/2 h-[120vmax] w-[120vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,hsl(var(--accent)/0.22)_0%,transparent_62%)] animate-languagepulse2" />
      </div>

      <div className="absolute inset-0 opacity-80">
        {stars.map((s) => (
          <span
            key={`${s.top}-${s.left}-${s.delay}-${s.size}`}
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: `${s.delay}ms`,
            }}
            className="absolute rounded-full bg-foreground/80 shadow-[0_0_12px_hsl(var(--primary)/0.35)] animate-languageglint"
          />
        ))}
      </div>
    </div>
  );
}

