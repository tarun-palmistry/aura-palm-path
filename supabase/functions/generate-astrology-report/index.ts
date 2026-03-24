import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const requestSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  dateOfBirth: z.string().min(1),
  timeOfBirth: z.string().min(1),
  placeOfBirth: z.string().trim().min(2).max(150),
  gender: z.string().trim().max(40).optional(),
});

const parseJsonResponse = <T>(value: string): T => {
  const cleaned = value.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned) as T;
};

const getSunSignFromDate = (dateOfBirth: string) => {
  const date = new Date(`${dateOfBirth}T00:00:00Z`);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Taurus";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Gemini";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Scorpio";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagittarius";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Capricorn";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Aquarius";
  return "Pisces";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_PUBLISHABLE_KEY) {
    return new Response(JSON.stringify({ error: "Supabase environment variables are missing." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing authorization token." }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const token = authHeader.replace("Bearer ", "");

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized request." }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid request body." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const zodiacSign = getSunSignFromDate(parsed.data.dateOfBirth);

    const structuredResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "Return ONLY strict JSON. Build a structured astrology profile object with keys: zodiac_sign, moon_sign, rising_sign, planetary_positions(object of planet-> {sign,house}), raw_astrology_data(object), confidence_notes.",
          },
          {
            role: "user",
            content: `Create structured astrology data from: ${JSON.stringify({
              full_name: parsed.data.fullName,
              date_of_birth: parsed.data.dateOfBirth,
              time_of_birth: parsed.data.timeOfBirth,
              place_of_birth: parsed.data.placeOfBirth,
              gender: parsed.data.gender ?? null,
              zodiac_sign: zodiacSign,
            })}`,
          },
        ],
      }),
    });

    if (!structuredResponse.ok) {
      const text = await structuredResponse.text();
      return new Response(JSON.stringify({ error: `Astrology structuring failed [${structuredResponse.status}]: ${text}` }), {
        status: structuredResponse.status,
        headers: jsonHeaders,
      });
    }

    const structuredPayload = await structuredResponse.json();
    const structuredText = structuredPayload?.choices?.[0]?.message?.content as string | undefined;
    if (!structuredText) {
      throw new Error("Astrology structuring returned empty content.");
    }

    const astrologyData = parseJsonResponse<{
      zodiac_sign: string;
      moon_sign: string;
      rising_sign: string;
      planetary_positions: Record<string, { sign: string; house: string }>;
      raw_astrology_data: Record<string, unknown>;
      confidence_notes?: string;
    }>(structuredText);

    const interpretationResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0.5,
        messages: [
          {
            role: "system",
            content:
              "You are an astrologer assistant. Use ONLY provided structured astrology data. Return ONLY JSON with keys: personality_analysis, love_life_insights, career_path, financial_outlook, health_guidance, yearly_prediction.",
          },
          {
            role: "user",
            content: `Generate interpretation from this data only: ${JSON.stringify(astrologyData)}`,
          },
        ],
      }),
    });

    if (!interpretationResponse.ok) {
      const text = await interpretationResponse.text();
      return new Response(JSON.stringify({ error: `Astrology interpretation failed [${interpretationResponse.status}]: ${text}` }), {
        status: interpretationResponse.status,
        headers: jsonHeaders,
      });
    }

    const interpretationPayload = await interpretationResponse.json();
    const interpretationText = interpretationPayload?.choices?.[0]?.message?.content as string | undefined;
    if (!interpretationText) {
      throw new Error("Astrology interpretation returned empty content.");
    }

    const interpretation = parseJsonResponse<{
      personality_analysis: string;
      love_life_insights: string;
      career_path: string;
      financial_outlook: string;
      health_guidance: string;
      yearly_prediction: string;
    }>(interpretationText);

    const fullReport = [
      `Personality Analysis\n${interpretation.personality_analysis}`,
      `Love Life Insights\n${interpretation.love_life_insights}`,
      `Career Path\n${interpretation.career_path}`,
      `Financial Outlook\n${interpretation.financial_outlook}`,
      `Health Guidance\n${interpretation.health_guidance}`,
      `Yearly Prediction\n${interpretation.yearly_prediction}`,
    ].join("\n\n");

    const freeSummary = fullReport.slice(0, Math.max(220, Math.floor(fullReport.length * 0.2)));

    const { data: savedReport, error: saveError } = await supabaseAdmin
      .from("horoscope_requests")
      .insert({
        user_id: authData.user.id,
        full_name: parsed.data.fullName,
        date_of_birth: parsed.data.dateOfBirth,
        time_of_birth: parsed.data.timeOfBirth,
        place_of_birth: parsed.data.placeOfBirth,
        gender: parsed.data.gender ?? null,
        zodiac_sign: astrologyData.zodiac_sign || zodiacSign,
        moon_sign: astrologyData.moon_sign,
        rising_sign: astrologyData.rising_sign,
        planetary_positions: astrologyData.planetary_positions,
        astrology_data: astrologyData.raw_astrology_data ?? astrologyData,
        interpretation,
        free_summary: freeSummary,
        full_report: fullReport,
        is_unlocked: false,
      })
      .select("*")
      .single();

    if (saveError) throw saveError;

    return new Response(JSON.stringify({ success: true, report: savedReport }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders });
  }
});