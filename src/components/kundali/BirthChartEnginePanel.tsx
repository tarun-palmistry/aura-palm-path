import { useEffect, useMemo, useRef, useState } from "react";
import { Orbit } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  BIRTH_CHART_TIMEZONES,
  type ClientBirthSnapshot,
  type GeocodeHit,
  birthWallTimeToUtc,
  computeClientBirthSnapshot,
  formatPlacement,
  geocodePlaceOpenMeteo,
} from "@/lib/birthChartAstronomy";

type ReportSigns = {
  zodiac_sign: string;
  moon_sign: string;
  rising_sign: string;
};

type BirthChartEnginePanelProps = {
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: string;
  timeZone: string;
  onTimeZoneChange: (tz: string) => void;
  report: ReportSigns | null;
};

const norm = (s: string) => s.trim().toLowerCase();
const signMatch = (api: string, computed: string) => norm(api) === norm(computed);

export const BirthChartEnginePanel = ({
  dateOfBirth,
  timeOfBirth,
  placeOfBirth,
  timeZone,
  onTimeZoneChange,
  report,
}: BirthChartEnginePanelProps) => {
  const { t } = useLanguage();
  const [geo, setGeo] = useState<GeocodeHit | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "loading" | "miss">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const utc = useMemo(() => birthWallTimeToUtc(dateOfBirth, timeOfBirth, timeZone), [dateOfBirth, timeOfBirth, timeZone]);

  useEffect(() => {
    const q = placeOfBirth.trim();
    if (q.length < 2) {
      setGeo(null);
      setGeoState("idle");
      return;
    }

    setGeoState("loading");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const hit = await geocodePlaceOpenMeteo(q);
          setGeo(hit);
          setGeoState(hit ? "idle" : "miss");
        } catch {
          setGeo(null);
          setGeoState("miss");
        }
      })();
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [placeOfBirth]);

  const snapshot: ClientBirthSnapshot | null = useMemo(() => {
    if (!utc) return null;
    return computeClientBirthSnapshot(utc, geo?.lat ?? null, geo?.lng ?? null);
  }, [utc, geo?.lat, geo?.lng]);

  const formReady = Boolean(dateOfBirth && timeOfBirth && timeZone);

  return (
    <section className="mystic-glass space-y-4 rounded-xl border border-border/70 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Orbit className="h-5 w-5 shrink-0" aria-hidden="true" />
            <h2 className="text-xl font-semibold">{t("astrology.clientEphemeris.title")}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{t("astrology.clientEphemeris.subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="birth-tz">{t("astrology.clientEphemeris.timezone")}</Label>
          <Select value={timeZone} onValueChange={onTimeZoneChange}>
            <SelectTrigger id="birth-tz" className="focus-mystic">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BIRTH_CHART_TIMEZONES.map((z) => (
                <SelectItem key={z.value} value={z.value}>
                  {z.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground sm:flex sm:flex-col sm:justify-end sm:pb-2">
          <p>{t("astrology.clientEphemeris.geocodeHint")}</p>
          {geoState === "loading" && <p className="text-primary">{t("astrology.clientEphemeris.geoLoading")}</p>}
          {geoState === "miss" && placeOfBirth.trim().length >= 2 && (
            <p className="text-amber-600/90 dark:text-amber-400/90">{t("astrology.clientEphemeris.geoMiss")}</p>
          )}
          {geo && <p className="font-mono text-[11px] text-foreground/80">{geo.name}</p>}
        </div>
      </div>

      {!formReady ? (
        <p className="text-sm text-muted-foreground">{t("astrology.clientEphemeris.needDobTob")}</p>
      ) : !snapshot ? (
        <p className="text-sm text-muted-foreground">{t("astrology.clientEphemeris.invalidInstant")}</p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs font-mono text-muted-foreground">UTC: {snapshot.utcIso}</p>

          <div className="grid gap-3 sm:grid-cols-3">
            <PlacementCard label={t("astrology.zodiac")} placement={snapshot.sun} apiSign={report?.zodiac_sign} />
            <PlacementCard label={t("astrology.moon")} placement={snapshot.moon} apiSign={report?.moon_sign} />
            <PlacementCard
              label={t("astrology.rising")}
              placement={snapshot.ascendant}
              apiSign={report?.rising_sign}
              emptyNote={t("astrology.clientEphemeris.ascNeedsPlace")}
            />
          </div>

          <div className="rounded-lg border border-border/60 bg-background/25 p-4">
            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("astrology.clientEphemeris.planets")}</p>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {snapshot.planets.map((row) => (
                <li key={row.name} className="flex justify-between gap-2 border-b border-border/40 pb-1 last:border-0">
                  <span className="text-muted-foreground">{row.name}</span>
                  <span className="font-mono text-xs text-foreground/90">{formatPlacement(row.placement)}</span>
                </li>
              ))}
            </ul>
          </div>

          {report && <p className="text-xs text-muted-foreground">{t("astrology.clientEphemeris.compareNote")}</p>}
        </div>
      )}
    </section>
  );
};

const PlacementCard = ({
  label,
  placement,
  apiSign,
  emptyNote,
}: {
  label: string;
  placement: ClientBirthSnapshot["sun"] | null;
  apiSign?: string;
  emptyNote?: string;
}) => {
  const { t } = useLanguage();
  if (!placement) {
    return (
      <article className="rounded-lg border border-border/60 bg-background/20 p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <p className="mt-2 text-sm text-muted-foreground">{emptyNote ?? "—"}</p>
      </article>
    );
  }

  const match = apiSign ? signMatch(apiSign, placement.sign) : null;

  return (
    <article className="rounded-lg border border-border/60 bg-background/30 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-base font-semibold">{formatPlacement(placement)}</p>
      {apiSign && (
        <p className="mt-1 text-xs text-muted-foreground">
          {t("astrology.clientEphemeris.savedReport")}: {apiSign}
          {match === true && <span className="ml-2 text-emerald-600 dark:text-emerald-400">✓</span>}
          {match === false && <span className="ml-2 text-amber-600 dark:text-amber-400">≠</span>}
        </p>
      )}
    </article>
  );
};

