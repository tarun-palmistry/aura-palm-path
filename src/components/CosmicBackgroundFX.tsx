import { useMemo } from "react";
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

export function CosmicBackgroundFX() {
  // Memoized so we don't re-randomize on re-renders.
  const dots = useMemo(() => createDots(16), []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden [contain:paint]">
      {/* slow drifting aurora */}
      <div className="absolute inset-0 opacity-70">
        <div className="absolute -left-[20%] -top-[25%] h-[70vmax] w-[70vmax] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.18)_0%,transparent_58%)] animate-aurora-drift" />
        <div className="absolute -right-[25%] -bottom-[30%] h-[78vmax] w-[78vmax] rounded-full bg-[radial-gradient(circle,hsl(var(--accent)/0.16)_0%,transparent_60%)] animate-aurora-drift2" />
      </div>

      {/* orbit rings */}
      <div className="absolute left-1/2 top-[44%] h-[92vmax] w-[92vmax] -translate-x-1/2 -translate-y-1/2 opacity-45">
        <div className="absolute inset-0 rounded-full border border-border/35 shadow-[0_0_40px_hsl(var(--primary)/0.08)_inset] animate-orbit-rotate" />
        <div className="absolute inset-[10%] rounded-full border border-border/25 shadow-[0_0_48px_hsl(var(--accent)/0.08)_inset] animate-orbit-rotate-rev" />
        <div className="absolute inset-[22%] rounded-full border border-border/20 shadow-[0_0_38px_hsl(var(--primary)/0.06)_inset] animate-orbit-rotate-slow" />

        {/* moving “planets” */}
        <span className={cn("cosmic-planet cosmic-planet-gold animate-planet-orbit")} />
        <span className={cn("cosmic-planet cosmic-planet-violet animate-planet-orbit2")} />
        <span className={cn("cosmic-planet cosmic-planet-ice animate-planet-orbit3")} />
      </div>

      {/* small drifting lights */}
      <div className="absolute inset-0 opacity-70">
        {dots.map((d, idx) => (
          <span
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            style={{
              top: `${d.top}%`,
              left: `${d.left}%`,
              width: `${d.size}px`,
              height: `${d.size}px`,
              opacity: d.opacity,
              animationDelay: `${d.delayMs}ms`,
            }}
            className="absolute rounded-full bg-foreground/80 shadow-[0_0_14px_hsl(var(--primary)/0.25)] animate-starlight-float"
          />
        ))}
      </div>
    </div>
  );
}

