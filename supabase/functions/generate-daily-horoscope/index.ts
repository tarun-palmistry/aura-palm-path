import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const requestSchema = z.object({
  zodiacSign: z.string().trim().min(3).max(20).optional(),
  period: z.enum(["today", "weekly", "monthly", "yearly"]).optional(),
  language: z.enum(["en", "hi"]).optional(),
});

const pickFirstString = (obj: unknown, keys: string[]) => {
  if (!obj || typeof obj !== "object") return "";
  const record = obj as Record<string, unknown>;
  for (const key of keys) {
    const v = record[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
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

const parseJsonResponse = <T>(value: string): T => {
  const cleaned = value.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned) as T;
};

const hashString = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const dailyVoiceFrame = (seed: string) => {
  const frames = [
    "today_prediction: lead with a small relatable scene (work, message, body feeling), then widen. advice may gently disagree with one line of the prediction (e.g. 'still, don't force clarity today').",
    "Use one unexpected concrete detail (weather, food, a conversation tone) as metaphor—keep it grounded, not mystical spam.",
    "Let lucky_color and lucky_number feel playful, not magical guarantees. energy_level should match the emotional arc of today_prediction.",
    "focus_areas: exactly 3 short phrases; avoid repeating words from today_prediction. Vary rhythm: mix a fragment sentence with a full sentence in advice.",
    "Include subtle mixed feelings (hope + impatience, or calm + restlessness) without sounding negative overall.",
  ] as const;
  return frames[hashString(seed) % frames.length];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_HOROSCOPE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_PUBLISHABLE_KEY) {
    return new Response(JSON.stringify({ error: "Supabase environment variables are missing." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  if (!RAPIDAPI_KEY) {
    return new Response(JSON.stringify({ error: "RAPIDAPI_HOROSCOPE_KEY is not configured." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  });
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: authData } = token ? await supabaseAuth.auth.getUser() : { data: { user: null as any } };

    const body = await req.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid request body." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    let zodiacSign = parsed.data.zodiacSign;
    if (!zodiacSign) {
      if (authData.user?.id) {
        const { data: latestChart } = await supabaseAdmin
          .from("horoscope_requests")
          .select("zodiac_sign")
          .eq("user_id", authData.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        zodiacSign = latestChart?.zodiac_sign;
      }
    }

    if (!zodiacSign) {
      return new Response(JSON.stringify({ error: "Provide a zodiac sign or create a birth chart first." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const z = zodiacSign.toLowerCase();
    const period = parsed.data.period ?? "today";

    const tryRapid = async (path: string) => {
      const url = `https://best-daily-astrology-and-horoscope-api.p.rapidapi.com${path}?zodiacSign=${encodeURIComponent(z)}`;
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": "best-daily-astrology-and-horoscope-api.p.rapidapi.com",
          "x-rapidapi-key": RAPIDAPI_KEY,
        },
      });
      const text = await resp.text();
      let body: unknown = null;
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
      return { ok: resp.ok, status: resp.status, body };
    };

    const chooseRapid = async () => {
      if (period === "weekly") return await tryRapid("/api/Detailed-Horoscope/weekly/");
      if (period === "monthly") return await tryRapid("/api/Detailed-Horoscope/monthly/");
      if (period === "yearly") return await tryRapid("/api/Detailed-Horoscope/yearly/");

      // today: Prefer the provider's default endpoint you shared:
      // /api/Detailed-Horoscope/?zodiacSign=leo
      const primary = await tryRapid("/api/Detailed-Horoscope/");
      if (primary.ok) return primary;
      const todayAlt = await tryRapid("/api/Detailed-Horoscope/today/");
      if (todayAlt.ok) return todayAlt;
      const dailyAlt = await tryRapid("/api/Detailed-Horoscope/daily/");
      if (dailyAlt.ok) return dailyAlt;
      return await tryRapid("/api/Detailed-Horoscope/yearly/");
    };

    const rapid = await chooseRapid();

    if (!rapid.ok) {
      return new Response(JSON.stringify({ error: `RapidAPI horoscope failed: ${rapid.status} ${asText(rapid.body)}` }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    const root = rapid.body && typeof rapid.body === "object" ? (rapid.body as Record<string, unknown>) : {};
    const data = (root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : null) ?? root;

    const today_prediction =
      pickFirstString(data, ["today_prediction", "prediction", "horoscope", "description", "text"]) || asText(rapid.body) || "—";
    const lucky_number = pickFirstString(data, ["lucky_number", "luckyNumber", "number"]) || String((hashString(`${z}|${today}`) % 9) + 1);
    const lucky_color = pickFirstString(data, ["lucky_color", "luckyColor", "color"]) || pickFirstString(data, ["lucky_colour", "luckyColour"]) || "Gold";
    const advice = pickFirstString(data, ["advice", "tip", "tips"]) || "Focus on one priority and keep your pace steady today.";

    const horoscope = {
      today_prediction,
      lucky_number,
      lucky_color,
      advice,
      raw_data: rapid.body,
    };

    if (authData.user?.id && period === "today") {
      const { data: savedRow, error: saveError } = await supabaseAdmin
        .from("daily_horoscopes")
        .upsert(
          {
            user_id: authData.user.id,
            zodiac_sign: zodiacSign,
            horoscope_date: today,
            today_prediction: horoscope.today_prediction,
            lucky_number: horoscope.lucky_number,
            lucky_color: horoscope.lucky_color,
            advice: horoscope.advice,
            raw_data: horoscope.raw_data,
          },
          { onConflict: "user_id,zodiac_sign,horoscope_date" },
        )
        .select("*")
        .single();

      if (saveError) throw saveError;

      return new Response(JSON.stringify({ success: true, horoscope: savedRow }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        horoscope: {
          id: `guest_${crypto.randomUUID()}`,
          zodiac_sign: zodiacSign,
          horoscope_date: today,
          today_prediction: horoscope.today_prediction,
          lucky_number: horoscope.lucky_number,
          lucky_color: horoscope.lucky_color,
          advice: horoscope.advice,
          period,
        },
        guest: true,
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders });
  }
});