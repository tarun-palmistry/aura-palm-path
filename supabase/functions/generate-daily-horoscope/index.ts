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
  language: z.enum(["en", "hi"]).optional(),
});

const parseJsonResponse = <T>(value: string): T => {
  const cleaned = value.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned) as T;
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
      const { data: latestChart } = await supabaseAdmin
        .from("horoscope_requests")
        .select("zodiac_sign")
        .eq("user_id", authData.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      zodiacSign = latestChart?.zodiac_sign;
    }

    if (!zodiacSign) {
      return new Response(JSON.stringify({ error: "Provide a zodiac sign or create a birth chart first." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const responseLanguage = parsed.data.language === "hi" ? "Hindi" : "English";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0.6,
        messages: [
          {
            role: "system",
            content:
              `Return ONLY strict JSON with keys: today_prediction, lucky_number, lucky_color, advice, focus_areas(array), energy_level(1-10). Write all text fields in ${responseLanguage}.`,
          },
          {
            role: "user",
            content: `Generate today's horoscope for zodiac sign ${zodiacSign} on ${today}.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      return new Response(JSON.stringify({ error: `Daily horoscope generation failed [${aiResponse.status}]: ${text}` }), {
        status: aiResponse.status,
        headers: jsonHeaders,
      });
    }

    const payload = await aiResponse.json();
    const outputText = payload?.choices?.[0]?.message?.content as string | undefined;
    if (!outputText) {
      throw new Error("Daily horoscope generation returned empty content.");
    }

    const horoscope = parseJsonResponse<{
      today_prediction: string;
      lucky_number: string;
      lucky_color: string;
      advice: string;
      focus_areas?: string[];
      energy_level?: number;
    }>(outputText);

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
          raw_data: horoscope,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders });
  }
});