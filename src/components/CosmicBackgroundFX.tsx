import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type OrbitDot = { top: number; left: number; size: number; opacity: number; delayMs: number };

function createDots(count: number): OrbitDot[] {
  const dots: OrbitDot[] = [];
  for (let i = 0; i < count; i += 1) {
    dots.push({
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: 1 + Math.random() * 2.4,
      opacity: 0.35 + Math.random() * 0.55,
      delayMs: Math.round(Math.random() * 6000),
    });
  }
  return dots;
}

function readDomIsLight() {
  if (typeof document === "undefined") return false;
  return !document.documentElement.classList.contains("dark");
}

export function CosmicBackgroundFX() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const dots = useMemo(() => createDots(18), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = mounted ? resolvedTheme === "light" : readDomIsLight();
  const cosmic = isLight ? "light" : "dark";

  return (
    <div
      aria-hidden
      data-cosmic={cosmic}
      className={cn(
        "cosmic-fx-root pointer-events-none fixed inset-0 -z-10 overflow-hidden [contain:paint]",
        isLight && "cosmic-fx-light",
      )}
    >
      {/* Twilight / nebula wash — stronger navy & violet in light mode for “solar system” depth */}
      <div className="cosmic-sky-aurora absolute inset-0 cosmic-aurora-opacity">
        <div className="cosmic-blob-1 absolute -left-[20%] -top-[25%] h-[70vmax] w-[70vmax] rounded-full animate-aurora-drift" />
        <div className="cosmic-blob-2 absolute -right-[25%] -bottom-[30%] h-[78vmax] w-[78vmax] rounded-full animate-aurora-drift2" />
      </div>

      {/* Orbital rings + planets */}
      <div className="cosmic-orbit-stage absolute left-1/2 top-[44%] h-[92vmax] w-[92vmax] -translate-x-1/2 -translate-y-1/2">
        <div className="cosmic-orbit-ring absolute inset-0 rounded-full border animate-orbit-rotate" />
        <div className="cosmic-orbit-ring cosmic-orbit-ring-mid absolute inset-[10%] rounded-full border animate-orbit-rotate-rev" />
        <div className="cosmic-orbit-ring cosmic-orbit-ring-inner absolute inset-[22%] rounded-full border animate-orbit-rotate-slow" />

        <span className={cn("cosmic-planet cosmic-planet-gold animate-planet-orbit")} />
        <span className={cn("cosmic-planet cosmic-planet-violet animate-planet-orbit2")} />
        <span className={cn("cosmic-planet cosmic-planet-ice animate-planet-orbit3")} />
      </div>

      {/* Star glints */}
      <div className="cosmic-starfield absolute inset-0">
        {dots.map((d) => (
          <span
            key={`${d.top}-${d.left}-${d.delayMs}-${d.size}`}
            style={{
              top: `${d.top}%`,
              left: `${d.left}%`,
              width: `${d.size}px`,
              height: `${d.size}px`,
              opacity: d.opacity,
              animationDelay: `${d.delayMs}ms`,
            }}
            className="cosmic-star-dot absolute rounded-full animate-starlight-float"
          />
        ))}
      </div>
    </div>
  );
}
