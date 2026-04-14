import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { birthWallTimeToUtc, computeClientBirthSnapshot, formatPlacement } from "@/lib/birthChartAstronomy";

const DevAstroLab = () => {
  const [dateOfBirth, setDateOfBirth] = useState("2000-01-01");
  const [timeOfBirth, setTimeOfBirth] = useState("12:00");
  const [timeZone, setTimeZone] = useState("Asia/Kolkata");
  const [lat, setLat] = useState("28.6139");
  const [lng, setLng] = useState("77.2090");

  const result = useMemo(() => {
    const utc = birthWallTimeToUtc(dateOfBirth, timeOfBirth, timeZone);
    if (!utc) {
      return { ok: false as const, message: "Invalid date/time or timezone." };
    }
    const latitudeDeg = Number(lat);
    const longitudeEastDeg = Number(lng);
    if (!Number.isFinite(latitudeDeg) || !Number.isFinite(longitudeEastDeg)) {
      return { ok: false as const, message: "Enter valid observer latitude / longitude (east)." };
    }

    const snap = computeClientBirthSnapshot(utc, latitudeDeg, longitudeEastDeg);
    return {
      ok: true as const,
      ...snap,
      observer: { lat: latitudeDeg, lng: longitudeEastDeg },
    };
  }, [dateOfBirth, timeOfBirth, timeZone, lat, lng]);

  return (
    <main className="container max-w-2xl space-y-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Dev: Astro lab</h1>
        <p className="text-sm text-muted-foreground">
          Browser-side tropical placements via astronomy-engine (not Python flatlib). Dev only.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lab-dob">Date</Label>
          <Input id="lab-dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lab-tob">Time</Label>
          <Input id="lab-tob" type="time" value={timeOfBirth} onChange={(e) => setTimeOfBirth(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="lab-tz">IANA timezone</Label>
          <Input id="lab-tz" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} placeholder="Asia/Kolkata" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lab-lat">Latitude °</Label>
          <Input id="lab-lat" value={lat} onChange={(e) => setLat(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lab-lng">Longitude east °</Label>
          <Input id="lab-lng" value={lng} onChange={(e) => setLng(e.target.value)} />
        </div>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={() => window.location.reload()}>
        Reset page
      </Button>

      {!result.ok ? (
        <p className="text-sm text-amber-600 dark:text-amber-400">{result.message}</p>
      ) : (
        <div className="space-y-4 rounded-lg border border-border p-4 font-mono text-sm">
          <p className="text-xs text-muted-foreground">UTC: {result.utcIso}</p>
          <p>
            Observer: lat {result.observer.lat}, lng E {result.observer.lng}
          </p>
          <p>Sun: {formatPlacement(result.sun)}</p>
          <p>Moon: {formatPlacement(result.moon)}</p>
          <p>Asc: {result.ascendant ? formatPlacement(result.ascendant) : "— (needs valid lat/lng)"}</p>
          <ul className="space-y-1 border-t border-border pt-2">
            {result.planets.map((p) => (
              <li key={p.name}>
                {p.name}: {formatPlacement(p.placement)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
};

export default DevAstroLab;
