import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type CosmicLoaderSize = "small" | "medium" | "large";
type CosmicLoaderVariant = "fullPage" | "section" | "button" | "inline";

type CosmicLoaderProps = {
  size?: CosmicLoaderSize;
  variant?: CosmicLoaderVariant;
  label?: string;
  sublabel?: string;
  overlay?: boolean;
  className?: string;
};

const sizeMap: Record<CosmicLoaderSize, number> = {
  small: 34,
  medium: 56,
  large: 92,
};

const variantClassMap: Record<CosmicLoaderVariant, string> = {
  fullPage: "flex min-h-[52vh] w-full items-center justify-center py-10",
  section: "flex w-full items-center justify-center py-8",
  button: "inline-flex items-center justify-center",
  inline: "inline-flex items-center",
};

const textWrapClassMap: Record<CosmicLoaderVariant, string> = {
  fullPage: "mt-4 space-y-1 text-center",
  section: "mt-3 space-y-1 text-center",
  button: "ml-2 text-left",
  inline: "ml-3 text-left",
};

const orbitDurations = ["5.6s", "4.8s", "6.4s", "7.2s", "5.1s", "6.9s", "8.1s", "4.4s", "7.7s"];
const orbitDelays = ["0s", "-0.7s", "-1.4s", "-2.2s", "-2.8s", "-3.3s", "-4s", "-4.4s", "-5.1s"];

export const CosmicLoader = ({
  size = "medium",
  variant = "section",
  label,
  sublabel,
  overlay = false,
  className,
}: CosmicLoaderProps) => {
  const loaderSize = sizeMap[size];

  return (
    <div className={cn("relative", variantClassMap[variant], className)} role="status" aria-live="polite" aria-label={label ?? "Loading"}>
      {overlay && <div className="absolute inset-0 rounded-xl bg-background/65 backdrop-blur-sm" aria-hidden="true" />}

      <div className="relative z-10 flex flex-col items-center justify-center">
        <div
          className={cn("cosmic-loader-scene", variant === "button" && "scale-[0.88]")}
          style={{ "--loader-size": `${loaderSize}px` } as CSSProperties}
          aria-hidden="true"
        >
          <span className="cosmic-loader-ring cosmic-loader-ring-outer" />
          <span className="cosmic-loader-ring cosmic-loader-ring-inner" />
          <span className="cosmic-loader-core" />
          {orbitDurations.map((duration, index) => (
            <span
              key={duration}
              className="cosmic-loader-orbit"
              style={{ animationDuration: duration, animationDelay: orbitDelays[index] } as CSSProperties}
            >
              <span className={cn("cosmic-loader-planet", `cosmic-loader-planet-${index + 1}`)} />
            </span>
          ))}
        </div>

        {(label || sublabel) && (
          <div className={textWrapClassMap[variant]}>
            {label && <p className="text-sm font-medium text-foreground">{label}</p>}
            {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
          </div>
        )}
      </div>

      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
};
