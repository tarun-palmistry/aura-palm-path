import { useMemo, useState } from "react";
import * as Astronomy from "astronomy-engine";
import { toDate } from "date-fns-tz";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

const normLon = (deg: number) => {
  const x = deg % 360;
  return x < 0 ? x + 360 : x;
};

const tropicalFromLongitude = (elon: number) => {
  const lon = normLon(elon);
  const idx = Math.min(11, Math.floor(lon / 30));
  return { sign: SIGNS[idx], degreeInSign: lon - idx * 30, longitude: lon };
};

const tropicalAscendantLongitude = (utc: Date, latitudeDeg: number, longitudeEastDeg: number): number => {
  const t = Astronomy.MakeTime(utc);
  const gst = Astronomy.SiderealTime(t);
  const ramc = ((gst * 15 + longitudeEastDeg) % 360 + 360) % 360;
  const theta = ramc * Astronomy.DEG2RAD;
  const phi = latitudeDeg * Astronomy.DEG2RAD;
  const eps = Astronomy.e_tilt(t).tobl * Astronomy.DEG2RAD;
  const y = Math.cos(theta);
  const x = -(Math.sin(eps) * Math.tan(phi) + Math.cos(eps) * Math.sin(theta));
  let lambda = Math.atan2(y, x) * Astronomy.RAD2DEG;
  return normLon(lambda);
};

const GEO_BODIES: Array<{ name: string; body: Astronomy.Body }> = [
  { name: "Mercury", body: Astronomy.Body.Mercury },
  { name: "Venus", body: Astronomy.Body.Venus },
  { name: "Mars", body: Astronomy.Body.Mars },
  { name: "Jupiter", body: Astronomy.Body.Jupiter },
  { name: "Saturn", body: Astronomy.Body.Saturn },
];

const DevAstroLab = () => {
  const [dateOfBirth, setDateOfBirth] = useState("2000-01-01");
  const [timeOfBirth, setTimeOfBirth] = useState("12:00");
  const [timeZone, setTimeZone] = useState("Asia/Kolkata");
  const [lat, setLat] = useState("28.6139");
  const [lng, setLng] = useState("77.2090");

  const result = useMemo(() => {
    const pad = timeOfBirth.length === 5 ? `${timeOfBirth}:00` : timeOfBirth;
    const iso = `${dateOfBirth}T${pad}`;
    const utc = toDate(iso, { timeZone });
    if (Number.isNaN(utc.getTime())) {
      return { ok: false as const, message: "Invalid date/time or timezone." };
    }
    const latitudeDeg = Number(lat);
    const longitudeEastDeg = Number(lng);
    if (!Number.isFinite(latitudeDeg) || !Number.isFinite(longitudeEastDeg)) {
      return { ok: false as const, message: "Enter valid observer latitude / longitude (east)." };
    }

    const t = Astronomy.MakeTime(utc);
    const sun = Astronomy.SunPosition(t);
    const moonEcl = Astronomy.Ecliptic(Astronomy.GeoMoon(t));
    const ascLon = tropicalAscendantLongitude(utc, latitudeDeg, longitudeEastDeg);
    const planets = GEO_BODIES.map(({ name, body }) => {
      const v = Astronomy.GeoVector(body, t, true);
      const e = Astronomy.Ecliptic(v);
      return { name, placement: tropicalFromLongitude(e.elon) };
    });

    return {
      ok: true as const,
      utcIso: utc.toISOString(),
      sun: tropicalFromLongitude(sun.elon),
      moon: tropicalFromLongitude(moonEcl.elon),
      ascendant: tropicalFromLongitude(ascLon),
      planets,
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
          <p>Sun: {result.sun.sign} +{result.sun.degreeInSign.toFixed(2)}°</p>
          <p>Moon: {result.moon.sign} +{result.moon.degreeInSign.toFixed(2)}°</p>
          <p>Asc: {result.ascendant.sign} +{result.ascendant.degreeInSign.toFixed(2)}°</p>
          <ul className="space-y-1 border-t border-border pt-2">
            {result.planets.map((p) => (
              <li key={p.name}>
                {p.name}: {p.placement.sign} +{p.placement.degreeInSign.toFixed(2)}°
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
};

export default DevAstroLab;
