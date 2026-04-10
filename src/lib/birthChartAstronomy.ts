import * as Astronomy from "astronomy-engine";
import { toDate } from "date-fns-tz";

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

export type TropicalSign = (typeof SIGNS)[number];

export type TropicalPlacement = {
  sign: TropicalSign;
  degreeInSign: number;
  longitude: number;
  latitude?: number;
};

const normLon = (deg: number) => {
  const x = deg % 360;
  return x < 0 ? x + 360 : x;
};

export const tropicalFromLongitude = (elon: number, elat?: number): TropicalPlacement => {
  const lon = normLon(elon);
  const idx = Math.min(11, Math.floor(lon / 30));
  return {
    sign: SIGNS[idx],
    degreeInSign: lon - idx * 30,
    longitude: lon,
    latitude: elat,
  };
};

/** Interpret birth wall clock in an IANA timezone → exact UTC instant. */
export const birthWallTimeToUtc = (dateOfBirth: string, timeOfBirth: string, timeZone: string): Date | null => {
  if (!dateOfBirth?.trim() || !timeOfBirth?.trim() || !timeZone?.trim()) return null;
  const pad = timeOfBirth.length === 5 ? `${timeOfBirth}:00` : timeOfBirth;
  const iso = `${dateOfBirth}T${pad}`;
  const d = toDate(iso, { timeZone });
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

/** Tropical ascendant (ecliptic longitude of eastern horizon). */
export const tropicalAscendantLongitude = (utc: Date, latitudeDeg: number, longitudeEastDeg: number): number => {
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

export type ClientBirthSnapshot = {
  utcIso: string;
  sun: TropicalPlacement;
  moon: TropicalPlacement;
  ascendant: TropicalPlacement | null;
  planets: Array<{ name: string; placement: TropicalPlacement }>;
};

const GEO_BODIES: Array<{ name: string; body: Astronomy.Body }> = [
  { name: "Mercury", body: Astronomy.Body.Mercury },
  { name: "Venus", body: Astronomy.Body.Venus },
  { name: "Mars", body: Astronomy.Body.Mars },
  { name: "Jupiter", body: Astronomy.Body.Jupiter },
  { name: "Saturn", body: Astronomy.Body.Saturn },
];

export const computeClientBirthSnapshot = (
  utc: Date,
  latitudeDeg: number | null,
  longitudeEastDeg: number | null,
): ClientBirthSnapshot => {
  const t = Astronomy.MakeTime(utc);
  const sun = Astronomy.SunPosition(t);
  const moonEcl = Astronomy.Ecliptic(Astronomy.GeoMoon(t));

  let ascLon: number | null = null;
  if (latitudeDeg != null && longitudeEastDeg != null && Number.isFinite(latitudeDeg) && Number.isFinite(longitudeEastDeg)) {
    ascLon = tropicalAscendantLongitude(utc, latitudeDeg, longitudeEastDeg);
  }

  const planets = GEO_BODIES.map(({ name, body }) => {
    const v = Astronomy.GeoVector(body, t, true);
    const e = Astronomy.Ecliptic(v);
    return { name, placement: tropicalFromLongitude(e.elon, e.elat) };
  });

  return {
    utcIso: utc.toISOString(),
    sun: tropicalFromLongitude(sun.elon, sun.elat),
    moon: tropicalFromLongitude(moonEcl.elon, moonEcl.elat),
    ascendant: ascLon != null ? tropicalFromLongitude(ascLon) : null,
    planets,
  };
};

export type GeocodeHit = { name: string; lat: number; lng: number };

/** Free geocoding (no API key). Best-effort for birth place → lat/lng. */
export const geocodePlaceOpenMeteo = async (query: string): Promise<GeocodeHit | null> => {
  const q = query.trim();
  if (q.length < 2) return null;
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: Array<{ name: string; latitude: number; longitude: number; admin1?: string; country?: string }>;
  };
  const hit = data.results?.[0];
  if (!hit) return null;
  const label = [hit.name, hit.admin1, hit.country].filter(Boolean).join(", ");
  return { name: label, lat: hit.latitude, lng: hit.longitude };
};

export const formatPlacement = (p: TropicalPlacement) => `${p.sign} +${p.degreeInSign.toFixed(2)}°`;

export const BIRTH_CHART_TIMEZONES = [
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Dubai", label: "Gulf (GST)" },
  { value: "Asia/Kathmandu", label: "Nepal (NPT)" },
  { value: "Asia/Dhaka", label: "Bangladesh (BST)" },
  { value: "Asia/Karachi", label: "Pakistan (PKT)" },
  { value: "Europe/London", label: "UK (GMT/BST)" },
  { value: "America/New_York", label: "US Eastern" },
  { value: "America/Los_Angeles", label: "US Pacific" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Tokyo", label: "Japan" },
  { value: "Australia/Sydney", label: "Australia (Sydney)" },
  { value: "UTC", label: "UTC" },
] as const;

