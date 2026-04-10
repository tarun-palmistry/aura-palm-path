import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const buildPreview = (text: string) => {
  const limit = Math.max(180, Math.floor(text.length * 0.2));
  return text.slice(0, limit);
};

const normalizeLanguage = (value: unknown): "en" | "hi" => {
  return value === "hi" ? "hi" : "en";
};

const asText = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const pickFirstString = (obj: unknown, keys: string[]) => {
  if (!obj || typeof obj !== "object") return "";
  const record = obj as Record<string, unknown>;
  for (const key of keys) {
    const v = record[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
};

const pickStringArray = (obj: unknown, keys: string[]) => {
  if (!obj || typeof obj !== "object") return [];
  const record = obj as Record<string, unknown>;
  for (const key of keys) {
    const v = record[key];
    if (Array.isArray(v)) {
      const items = v
        .filter((x) => typeof x === "string")
        .map((x) => (x as string).trim())
        .filter(Boolean);
      if (items.length) return items;
    }
  }
  return [];
};

const extractApiError = (rapid: unknown) => {
  if (!rapid || typeof rapid !== "object") return "";
  const root = rapid as Record<string, unknown>;
  const data = (root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : null) ?? root;

  // Only treat explicit error signals as failures.
  const explicitError = pickFirstString(data, ["error"]) || pickFirstString(root, ["error"]);
  if (explicitError) return explicitError;

  const status = (data as any)?.status ?? (root as any)?.status;
  const ok = (data as any)?.ok ?? (root as any)?.ok;
  const success = (data as any)?.success ?? (root as any)?.success;

  const statusString = typeof status === "string" ? status.toLowerCase() : "";
  const isErrorStatus =
    statusString === "error" ||
    statusString === "failed" ||
    statusString === "failure" ||
    statusString === "false";

  const isNotOk = ok === false || success === false;

  if (isErrorStatus || isNotOk) {
    // If the API marks failure, use message if present.
    const msg = pickFirstString(data, ["message"]) || pickFirstString(root, ["message"]);
    return msg || "Palm reading API returned an error status.";
  }

  return "";
};

const buildSectionedReport = (language: "en" | "hi", rapid: unknown) => {
  // Try best-effort mapping from any reasonable RapidAPI payload.
  const root = rapid && typeof rapid === "object" ? (rapid as Record<string, unknown>) : {};
  const data = (root.data && typeof root.data === "object" ? root.data : null) ?? root;

  const apiError = extractApiError(rapid);

  if (apiError) {
    return language === "hi"
      ? `त्रुटि\n${apiError}`
      : `Error\n${apiError}`;
  }

  // Some APIs only return a success message; keep it as content if no sections are found.
  const successMessage = pickFirstString(data, ["message"]) || pickFirstString(root, ["message"]);

  // Handle payloads shaped like:
  // { message: "...", palmReadingResult: { message: [ "..." , "..." ] } }
  const palmReadingResult =
    (data as any)?.palmReadingResult && typeof (data as any).palmReadingResult === "object"
      ? ((data as any).palmReadingResult as Record<string, unknown>)
      : null;
  const palmMessages = palmReadingResult ? pickStringArray(palmReadingResult, ["message", "messages", "insights"]) : [];

  const personality = pickFirstString(data, [
    "personality_overview",
    "personality",
    "personalityTraits",
    "personality_traits",
    "overview",
    "reading",
    "result",
    "prediction",
  ]);
  const love = pickFirstString(data, ["love_relationships", "love", "relationships", "relationship", "loveLife", "love_life"]);
  const career = pickFirstString(data, ["career_strengths", "career", "careerInsights", "career_insights", "profession"]);
  const future = pickFirstString(data, ["future_guidance", "future", "futurePrediction", "future_prediction", "guidance"]);
  const advice = pickFirstString(data, ["key_advice", "advice", "tips", "recommendations"]);

  const headings =
    language === "hi"
      ? {
          personality: "व्यक्तित्व अवलोकन",
          love: "प्रेम और रिश्ते",
          career: "करियर और ताकत",
          future: "भविष्य मार्गदर्शन",
          advice: "मुख्य सलाह",
        }
      : {
          personality: "Personality Overview",
          love: "Love & Relationships",
          career: "Career & Strengths",
          future: "Future Guidance",
          advice: "Key Advice",
        };

  const blocks: Array<{ h: string; b: string }> = [];
  if (personality) blocks.push({ h: headings.personality, b: personality });
  if (love) blocks.push({ h: headings.love, b: love });
  if (career) blocks.push({ h: headings.career, b: career });
  if (future) blocks.push({ h: headings.future, b: future });
  if (advice) blocks.push({ h: headings.advice, b: advice });

  if (blocks.length === 0 && successMessage) {
    blocks.push({ h: language === "hi" ? "स्थिति" : "Status", b: successMessage });
  }

  if (palmMessages.length) {
    blocks.push({
      h: language === "hi" ? "मुख्य इनसाइट्स" : "Key Insights",
      b: palmMessages.map((m) => `- ${m}`).join("\n"),
    });
  }

  if (blocks.length === 0) {
    // Fallback: store the full payload as text so the UI still shows something.
    blocks.push({ h: language === "hi" ? "रीडिंग" : "Reading", b: asText(rapid) });
  }

  return blocks.map((b) => `${b.h}\n${b.b}`).join("\n\n");
};

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const RAPIDAPI_PALM_KEY = Deno.env.get("PALM_RAPIDAPI_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_PUBLISHABLE_KEY) {
    return new Response(JSON.stringify({ error: "Supabase environment variables are missing." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  if (!RAPIDAPI_PALM_KEY) {
    return new Response(JSON.stringify({ error: "PALM_RAPIDAPI_KEY is not configured." }), {
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

    const payload = await req.json();
    const readingId = payload?.readingId as string | undefined;
    const language = normalizeLanguage(payload?.language);
    const guestToken = payload?.guestToken as string | null | undefined;
    if (!readingId || typeof readingId !== "string") {
      return new Response(JSON.stringify({ error: "readingId is required." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const responseLanguage = language === "hi" ? "Hindi" : "English";

    const { data: reading, error: readingError } = await supabaseAdmin
      .from("palm_readings")
      .select("id, user_id, guest_token, age, gender, hand_side, dominant_hand, created_at")
      .eq("id", readingId)
      .single();

    const authedUserId = (authData as any)?.user?.id as string | undefined;
    const isAuthedOwner = Boolean(authedUserId && reading?.user_id && reading.user_id === authedUserId);
    const isGuestOwner = Boolean(!authedUserId && guestToken && reading?.guest_token && String(reading.guest_token) === String(guestToken));

    if (readingError || !reading || (!isAuthedOwner && !isGuestOwner)) {
      return new Response(JSON.stringify({ error: "Reading not found for this user." }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const { data: image, error: imageError } = await supabaseAdmin
      .from("images")
      .select("storage_path")
      .eq("reading_id", readingId)
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

    const imageResp = await fetch(signedData.signedUrl);
    if (!imageResp.ok) {
      return new Response(JSON.stringify({ error: `Could not fetch palm image bytes: ${imageResp.status}` }), {
        status: 502,
        headers: jsonHeaders,
      });
    }

    const contentType = imageResp.headers.get("content-type") || "image/jpeg";
    const imageBytes = new Uint8Array(await imageResp.arrayBuffer());

    const rapidUrl = "https://ai-astrologer.p.rapidapi.com/palmreading";
    const rapidHeaders = {
      "x-rapidapi-host": "ai-astrologer.p.rapidapi.com",
      "x-rapidapi-key": RAPIDAPI_PALM_KEY,
    };

    const imageBase64WithPrefix = `data:${contentType};base64,${toBase64(imageBytes)}`;
    const imageBase64Raw = imageBase64WithPrefix.split("base64,")[1] ?? imageBase64WithPrefix;

    const tryRapid = async (
      label: string,
      init: RequestInit,
    ): Promise<{ ok: true; rapidPalm: unknown } | { ok: false; status: number; body: unknown; label: string }> => {
      const resp = await fetch(rapidUrl, { ...init, headers: { ...rapidHeaders, ...(init.headers ?? {}) } });
      const text = await resp.text();
      let body: unknown = null;
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
      if (resp.ok) return { ok: true, rapidPalm: body };
      return { ok: false, status: resp.status, body, label };
    };

    const attempts: Array<() => Promise<any>> = [
      // 1) Multipart with only `image` file.
      async () => {
        const form = new FormData();
        form.append("image", new Blob([imageBytes], { type: contentType }), "palm.jpg");
        return await tryRapid("multipart:image", { method: "POST", body: form });
      },
      // 2) Multipart with only `file` file.
      async () => {
        const form = new FormData();
        form.append("file", new Blob([imageBytes], { type: contentType }), "palm.jpg");
        return await tryRapid("multipart:file", { method: "POST", body: form });
      },
      // 3) URL encoded base64 with data: prefix.
      async () => {
        const body = new URLSearchParams({ image: imageBase64WithPrefix }).toString();
        return await tryRapid("urlencoded:image_with_prefix", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });
      },
      // 4) URL encoded raw base64 (no prefix).
      async () => {
        const body = new URLSearchParams({ image: imageBase64Raw }).toString();
        return await tryRapid("urlencoded:image_raw_base64", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });
      },
    ];

    let lastFailure: { status: number; body: unknown; label: string } | null = null;
    let rapidPalm: unknown = null;
    for (const attempt of attempts) {
      const res = await attempt();
      if (res.ok) {
        rapidPalm = res.rapidPalm;
        lastFailure = null;
        break;
      }
      lastFailure = { status: res.status, body: res.body, label: res.label };
    }

    if (lastFailure) {
      await supabaseAdmin.from("palm_readings").update({ analysis_status: "failed" }).eq("id", readingId);
      return new Response(
        JSON.stringify({
          error: `RapidAPI palmreading failed: ${lastFailure.status} ${asText(lastFailure.body)}`,
          attempt: lastFailure.label,
        }),
        { status: 502, headers: jsonHeaders },
      );
    }

    const apiError = extractApiError(rapidPalm);
    if (apiError) {
      await supabaseAdmin.from("palm_readings").update({ analysis_status: "failed" }).eq("id", readingId);
      return new Response(JSON.stringify({ error: apiError }), { status: 400, headers: jsonHeaders });
    }

    const fullReport = buildSectionedReport(language, rapidPalm);
    const freePreview = buildPreview(fullReport);

    const { error: featuresError } = await supabaseAdmin.from("palm_features").upsert({
      reading_id: readingId,
      palm_shape: pickFirstString(rapidPalm, ["palm_shape", "palmShape", "handShape", "hand_shape"]) || null,
      life_line_clarity: pickFirstString(rapidPalm, ["life_line_clarity", "lifeLine", "life_line"]) || null,
      heart_line: pickFirstString(rapidPalm, ["heart_line", "heartLine"]) || null,
      head_line: pickFirstString(rapidPalm, ["head_line", "headLine"]) || null,
      major_mounts: null,
      extracted_features: { rapid_palm: rapidPalm },
    });

    if (featuresError) throw featuresError;

    const { error: reportUpsertError } = await supabaseAdmin.from("reports").upsert({
      reading_id: readingId,
      free_preview: freePreview,
      full_report: fullReport,
      generated_from_features: { rapid_palm: rapidPalm },
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
