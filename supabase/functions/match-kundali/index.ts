import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const personSchema = z.object({
  name: z.string().trim().min(2).max(100),
  dateOfBirth: z.string().min(1),
  timeOfBirth: z.string().min(1),
  placeOfBirth: z.string().trim().min(2).max(150),
});

const requestSchema = z.object({
  person1: personSchema,
  person2: personSchema,
  language: z.enum(["en", "hi"]).optional(),
});

const parseJsonResponse = <T>(value: string): T => {
  const cleaned = value.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned) as T;
};

const kootaResultSchema = z.object({
  name: z.string(),
  score: z.number(),
  max_score: z.number(),
  status: z.enum(["favorable", "neutral", "unfavorable"]),
  description: z.string(),
});

const matchReportSchema = z.object({
  total_score: z.number(),
  compatibility_level: z.enum(["low", "average", "good", "excellent"]),
  koota_breakdown: z.array(kootaResultSchema).length(8),
  relationship_summary: z.object({
    overall_compatibility: z.string(),
    emotional_connection: z.string(),
    communication: z.string(),
    long_term_potential: z.string(),
  }),
  strengths: z.array(z.string()),
  challenges: z.array(z.string()),
  advice: z.array(z.string()),
  final_verdict: z.string(),
});

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

    const lang = parsed.data.language === "hi" ? "hi" : "en";
    const responseLanguage = lang === "hi" ? "Hindi" : "English";

    const inputBlock = `Person 1:
- Name: ${parsed.data.person1.name}
- Date of Birth: ${parsed.data.person1.dateOfBirth}
- Time of Birth: ${parsed.data.person1.timeOfBirth}
- Place of Birth: ${parsed.data.person1.placeOfBirth}

Person 2:
- Name: ${parsed.data.person2.name}
- Date of Birth: ${parsed.data.person2.dateOfBirth}
- Time of Birth: ${parsed.data.person2.timeOfBirth}
- Place of Birth: ${parsed.data.person2.placeOfBirth}`;

    const systemPrompt =
      `You are an expert Vedic astrologer specializing in Kundali matching (Guna Milan) using the traditional Ashta Koota system.\n` +
      `Output language for ALL string values: ${responseLanguage} only.\n\n` +
      `TASK:\n` +
      `1. From the birth details, derive logical Moon signs / nakshatra-style considerations as needed for classical Ashta Koota logic, then compute the 8 Kootas and scores.\n` +
      `2. Kootas MUST appear in this exact order in koota_breakdown array, with these exact English "name" values and max_score:\n` +
      `   Varna (max 1), Vashya (max 2), Tara (max 3), Yoni (max 4), Graha Maitri (max 5), Gana (max 6), Bhakoot (max 7), Nadi (max 8).\n` +
      `3. For each koota: score (integer 0..max_score), status: favorable | neutral | unfavorable, description (concise, specific to these two people—no generic filler).\n` +
      `4. total_score = sum of all koota scores (must equal sum of individual scores, max 36).\n` +
      `5. compatibility_level from total_score: below 18 → low; 18–24 → average; 24–30 → good; above 30 → excellent.\n` +
      `6. relationship_summary: four fields—realistic, personalized, not repetitive.\n` +
      `7. strengths: 3–5 strings; challenges: 2–4 strings; advice: 3–4 strings.\n` +
      `8. final_verdict: 2–3 clear lines.\n\n` +
      `Return ONLY valid JSON matching this shape (no markdown):\n` +
      `{"total_score":number,"compatibility_level":"low"|"average"|"good"|"excellent","koota_breakdown":[{"name":"Varna","score":number,"max_score":1,"status":"favorable"|"neutral"|"unfavorable","description":"..."},...8 items...],"relationship_summary":{"overall_compatibility":"...","emotional_connection":"...","communication":"...","long_term_potential":"..."},"strengths":["..."],"challenges":["..."],"advice":["..."],"final_verdict":"..."}\n\n` +
      `Be specific to the two names and birth data. Avoid vague astrology clichés.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0.35,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: inputBlock },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      return new Response(JSON.stringify({ error: `Kundali matching failed [${aiResponse.status}]: ${text}` }), {
        status: aiResponse.status,
        headers: jsonHeaders,
      });
    }

    const payload = await aiResponse.json();
    const content = payload?.choices?.[0]?.message?.content as string | undefined;
    if (!content) {
      throw new Error("AI returned empty content.");
    }

    const raw = parseJsonResponse<unknown>(content);
    const validated = matchReportSchema.safeParse(raw);
    if (!validated.success) {
      return new Response(
        JSON.stringify({
          error: "Report format validation failed.",
          details: validated.error.flatten(),
        }),
        { status: 502, headers: jsonHeaders },
      );
    }

    const expectedNames = ["Varna", "Vashya", "Tara", "Yoni", "Graha Maitri", "Gana", "Bhakoot", "Nadi"];
    const names = validated.data.koota_breakdown.map((k) => k.name);
    const orderOk = expectedNames.every((n, i) => names[i] === n);
    if (!orderOk) {
      return new Response(JSON.stringify({ error: "Koota order or names did not match Ashta Koota specification." }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    const sum = validated.data.koota_breakdown.reduce((a, k) => a + k.score, 0);
    if (sum !== validated.data.total_score) {
      return new Response(JSON.stringify({ error: "total_score does not match sum of koota scores." }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify({ success: true, report: validated.data }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders });
  }
});
