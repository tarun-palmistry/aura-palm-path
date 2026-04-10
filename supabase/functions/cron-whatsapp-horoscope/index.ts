import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-cron-secret",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

type Period = "today" | "weekly" | "monthly" | "yearly";

const DEFAULT_TWILIO_CONTENT_SID = "HXb5b62575e6e4ff6129ad7c8efe1f983e";

type SubRow = {
  id: string;
  user_id: string;
  phone_e164: string;
  zodiac_sign: string;
  period: Period;
  time_zone: string;
  send_hour_local: number;
  weekly_day: number;
  monthly_day: number;
  yearly_month: number;
  yearly_day: number;
  active: boolean;
  last_sent_key: string | null;
};

const asText = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const parseWeekdayIndex = (weekdayShort: string) => {
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekdayShort] ?? 0;
};

const tzParts = (date: Date, timeZone: string) => {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour"));
  const weekday = parseWeekdayIndex(get("weekday"));
  return { year, month, day, hour, weekday };
};

const isoWeekKey = (y: number, m: number, d: number) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayNum = (dt.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  dt.setUTCDate(dt.getUTCDate() - dayNum + 3);
  const isoYear = dt.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((dt.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
};

const fetchRapidHoroscope = async (period: Period, zodiacSign: string, rapidApiKey: string) => {
  const z = zodiacSign.toLowerCase();
  const host = "best-daily-astrology-and-horoscope-api.p.rapidapi.com";

  const path =
    period === "weekly"
      ? "/api/Detailed-Horoscope/weekly/"
      : period === "monthly"
        ? "/api/Detailed-Horoscope/monthly/"
        : period === "yearly"
          ? "/api/Detailed-Horoscope/yearly/"
          : "/api/Detailed-Horoscope/";

  const url = `https://${host}${path}?zodiacSign=${encodeURIComponent(z)}`;
  const resp = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-host": host,
      "x-rapidapi-key": rapidApiKey,
    },
  });

  const text = await resp.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!resp.ok) {
    throw new Error(`RapidAPI horoscope failed: ${resp.status} ${asText(body)}`);
  }

  const root = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const data = (root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : null) ?? root;

  const pickFirstString = (obj: Record<string, unknown>, keys: string[]) => {
    for (const k of keys) {
      const v = obj[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };

  const prediction =
    pickFirstString(data, ["today_prediction", "prediction", "horoscope", "description", "text"]) || asText(body) || "—";
  const luckyNumber = pickFirstString(data, ["lucky_number", "luckyNumber", "number"]) || "—";
  const luckyColor =
    pickFirstString(data, ["lucky_color", "luckyColor", "color"]) || pickFirstString(data, ["lucky_colour", "luckyColour"]) || "—";
  const advice = pickFirstString(data, ["advice", "tip", "tips"]) || "—";

  return { prediction, luckyNumber, luckyColor, advice, raw: body };
};

const twilioSendWhatsApp = async ({
  accountSid,
  authToken,
  from,
  toE164,
  body,
  contentSid,
  contentVariables,
}: {
  accountSid: string;
  authToken: string;
  from: string; // e.g. "whatsapp:+14155238886"
  toE164: string; // e.g. "+919999999999"
  body: string;
  contentSid?: string;
  contentVariables?: Record<string, string>;
}) => {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
  const auth = btoa(`${accountSid}:${authToken}`);
  const params = new URLSearchParams();
  params.set("From", from);
  params.set("To", `whatsapp:${toE164}`);
  params.set("Body", body);
  if (contentSid) {
    params.set("ContentSid", contentSid);
    if (contentVariables && Object.keys(contentVariables).length > 0) {
      params.set("ContentVariables", JSON.stringify(contentVariables));
    }
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Twilio send failed: ${res.status} ${text}`);
  }
  return text;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_HOROSCOPE_KEY");

  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM");
  const TWILIO_CONTENT_SID = Deno.env.get("TWILIO_CONTENT_SID") || DEFAULT_TWILIO_CONTENT_SID;
  const CRON_SECRET = Deno.env.get("CRON_SECRET");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_PUBLISHABLE_KEY) {
    return new Response(JSON.stringify({ error: "Supabase environment variables are missing." }), { status: 500, headers: jsonHeaders });
  }
  if (!RAPIDAPI_KEY) {
    return new Response(JSON.stringify({ error: "RAPIDAPI_HOROSCOPE_KEY is not configured." }), { status: 500, headers: jsonHeaders });
  }
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    return new Response(JSON.stringify({ error: "Twilio env is missing (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_WHATSAPP_FROM)." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
  if (!CRON_SECRET) {
    return new Response(JSON.stringify({ error: "CRON_SECRET is not configured." }), { status: 500, headers: jsonHeaders });
  }

  const provided = req.headers.get("x-cron-secret");
  if (provided !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401, headers: jsonHeaders });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const now = new Date();
    const { data: subs, error } = await supabaseAdmin.from("whatsapp_horoscope_subscriptions").select("*").eq("active", true);
    if (error) throw error;
    const rows = (subs ?? []) as SubRow[];

    let scanned = 0;
    let due = 0;
    let sent = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const sub of rows) {
      scanned += 1;
      const tz = sub.time_zone || "UTC";
      const p = tzParts(now, tz);

      if (p.hour !== sub.send_hour_local) continue;

      let key = "";
      let scheduleOk = false;

      if (sub.period === "today") {
        key = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
        scheduleOk = true;
      } else if (sub.period === "weekly") {
        key = isoWeekKey(p.year, p.month, p.day);
        scheduleOk = p.weekday === sub.weekly_day;
      } else if (sub.period === "monthly") {
        key = `${p.year}-${String(p.month).padStart(2, "0")}`;
        scheduleOk = p.day === sub.monthly_day;
      } else if (sub.period === "yearly") {
        key = `${p.year}`;
        scheduleOk = p.month === sub.yearly_month && p.day === sub.yearly_day;
      }

      if (!scheduleOk) continue;
      if (sub.last_sent_key && sub.last_sent_key === key) continue;

      due += 1;
      try {
        const h = await fetchRapidHoroscope(sub.period, sub.zodiac_sign, RAPIDAPI_KEY);
        const title = `${sub.period.toUpperCase()} Horoscope — ${sub.zodiac_sign}`;
        const msg =
          `*${title}*\n\n` +
          `${h.prediction}\n\n` +
          `Lucky number: ${h.luckyNumber}\n` +
          `Lucky color: ${h.luckyColor}\n` +
          `Advice: ${h.advice}\n\n` +
          `AstraPalm`;

        const contentVariables = TWILIO_CONTENT_SID
          ? {
              "1": title,
              "2": `${h.prediction}\n\nAdvice: ${h.advice}\nLucky number: ${h.luckyNumber}\nLucky color: ${h.luckyColor}`,
            }
          : undefined;

        await twilioSendWhatsApp({
          accountSid: TWILIO_ACCOUNT_SID,
          authToken: TWILIO_AUTH_TOKEN,
          from: TWILIO_WHATSAPP_FROM,
          toE164: sub.phone_e164,
          body: msg,
          contentSid: TWILIO_CONTENT_SID ?? undefined,
          contentVariables,
        });

        sent += 1;
        await supabaseAdmin
          .from("whatsapp_horoscope_subscriptions")
          .update({ last_sent_key: key, last_sent_at: new Date().toISOString() })
          .eq("id", sub.id);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        errors.push({ id: sub.id, error: message });
      }
    }

    return new Response(JSON.stringify({ success: true, scanned, due, sent, errors }), { status: 200, headers: jsonHeaders });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders });
  }
});

