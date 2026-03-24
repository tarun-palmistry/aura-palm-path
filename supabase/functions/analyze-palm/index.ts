import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const parseJsonResponse = <T>(value: string): T => {
  const cleaned = value.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned) as T;
};

const buildPreview = (text: string) => {
  const limit = Math.max(180, Math.floor(text.length * 0.2));
  return text.slice(0, limit);
};

const normalizeLanguage = (value: unknown): "en" | "hi" => {
  return value === "hi" ? "hi" : "en";
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

    const payload = await req.json();
    const readingId = payload?.readingId as string | undefined;
    const language = normalizeLanguage(payload?.language);
    if (!readingId || typeof readingId !== "string") {
      return new Response(JSON.stringify({ error: "readingId is required." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const responseLanguage = language === "hi" ? "Hindi" : "English";

    const { data: reading, error: readingError } = await supabaseAdmin
      .from("palm_readings")
      .select("id, user_id")
      .eq("id", readingId)
      .single();

    if (readingError || !reading || reading.user_id !== authData.user.id) {
      return new Response(JSON.stringify({ error: "Reading not found for this user." }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const { data: image, error: imageError } = await supabaseAdmin
      .from("images")
      .select("storage_path")
      .eq("reading_id", readingId)
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (imageError || !image) {
      return new Response(JSON.stringify({ error: "Image not found for this reading." }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from("palm-images")
      .createSignedUrl(image.storage_path, 60 * 10);

    if (signedError || !signedData?.signedUrl) {
      return new Response(JSON.stringify({ error: "Could not generate a signed URL for palm image." }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const extractionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a palm image analyzer. Return only JSON with keys: is_palm_detected(boolean), image_quality(one of: good|poor), palm_shape, life_line_clarity, heart_line, head_line, major_mounts(array), confidence(0-1), notes. If unclear, set is_palm_detected false.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this palm image and extract palmistry features as strict JSON." },
              { type: "image_url", image_url: { url: signedData.signedUrl } },
            ],
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!extractionResponse.ok) {
      const text = await extractionResponse.text();
      return new Response(JSON.stringify({ error: `AI extraction failed: ${extractionResponse.status} ${text}` }), {
        status: extractionResponse.status,
        headers: jsonHeaders,
      });
    }

    const extractionPayload = await extractionResponse.json();
    const extractionText = extractionPayload?.choices?.[0]?.message?.content as string | undefined;
    if (!extractionText) {
      throw new Error("AI extraction did not return structured content.");
    }

    const features = parseJsonResponse<{
      is_palm_detected: boolean;
      image_quality: "good" | "poor";
      palm_shape: string;
      life_line_clarity: string;
      heart_line: string;
      head_line: string;
      major_mounts: string[];
      confidence: number;
      notes?: string;
    }>(extractionText);

    if (!features.is_palm_detected || features.image_quality === "poor") {
      await supabaseAdmin.from("palm_readings").update({ analysis_status: "failed" }).eq("id", readingId);
      return new Response(
        JSON.stringify({ error: "Bad image quality. Please retake with clear lighting and full palm in frame." }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const reportResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              `You are an AI palmistry interpreter. Use ONLY provided extracted features. Return strict JSON: personality_traits, love_relationships, career_insights, strengths_weaknesses, future_guidance. Write all values in ${responseLanguage}.`,
          },
          {
            role: "user",
            content: `Generate reading text from this extracted data only: ${JSON.stringify(features)}`,
          },
        ],
        temperature: 0.5,
      }),
    });

    if (!reportResponse.ok) {
      const text = await reportResponse.text();
      return new Response(JSON.stringify({ error: `AI report generation failed: ${reportResponse.status} ${text}` }), {
        status: reportResponse.status,
        headers: jsonHeaders,
      });
    }

    const reportPayload = await reportResponse.json();
    const reportText = reportPayload?.choices?.[0]?.message?.content as string | undefined;
    if (!reportText) {
      throw new Error("AI report generation returned empty content.");
    }

    const reportJson = parseJsonResponse<{
      personality_traits: string;
      love_relationships: string;
      career_insights: string;
      strengths_weaknesses: string;
      future_guidance: string;
    }>(reportText);

    const headings =
      language === "hi"
        ? {
            personality: "व्यक्तित्व गुण",
            love: "प्रेम और रिश्ते",
            career: "करियर अंतर्दृष्टि",
            strengths: "ताकत और कमजोरियाँ",
            future: "भविष्य मार्गदर्शन",
          }
        : {
            personality: "Personality Traits",
            love: "Love & Relationships",
            career: "Career Insights",
            strengths: "Strengths & Weaknesses",
            future: "Future Guidance",
          };

    const fullReport = [
      `${headings.personality}\n${reportJson.personality_traits}`,
      `${headings.love}\n${reportJson.love_relationships}`,
      `${headings.career}\n${reportJson.career_insights}`,
      `${headings.strengths}\n${reportJson.strengths_weaknesses}`,
      `${headings.future}\n${reportJson.future_guidance}`,
    ].join("\n\n");

    const freePreview = buildPreview(fullReport);

    const { error: featuresError } = await supabaseAdmin.from("palm_features").upsert({
      reading_id: readingId,
      palm_shape: features.palm_shape,
      life_line_clarity: features.life_line_clarity,
      heart_line: features.heart_line,
      head_line: features.head_line,
      major_mounts: features.major_mounts,
      extracted_features: features,
    });

    if (featuresError) throw featuresError;

    const { error: reportUpsertError } = await supabaseAdmin.from("reports").upsert({
      reading_id: readingId,
      free_preview: freePreview,
      full_report: fullReport,
      generated_from_features: features,
      is_unlocked: false,
    });

    if (reportUpsertError) throw reportUpsertError;

    await supabaseAdmin.from("palm_readings").update({ analysis_status: "completed" }).eq("id", readingId);

    return new Response(JSON.stringify({ success: true, readingId }), { status: 200, headers: jsonHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders });
  }
});
