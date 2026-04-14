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
  language: z.enum(["en", "hi"]).optional(),
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

const hashString = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const approxAgeFromDob = (dob: string): number | null => {
  const d = new Date(`${dob}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const years = (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const age = Math.floor(years);
  return age >= 0 && age < 120 ? age : null;
};

const firstNameFromFull = (full: string) => {
  const t = full.trim();
  if (!t) return "";
  return t.split(/\s+/)[0] ?? t;
};

const chartInterpretationVoice = (seed: string) => {
  const frames = [
    "personality_analysis: start with a specific social habit or emotional pattern, not a sign stereotype. love_life_insights: include one tension (e.g. craving honesty vs fear of vulnerability) and soften it with warmth.",
    "career_path: describe a plausible 'good fit' role tone and a common derailment pattern. financial_outlook: be concrete (cash flow rhythm, impulsive vs saver) without promising wealth.",
    "health_guidance: everyday body-and-nervous-system language, not medical claims. yearly_prediction: two time horizons (next ~8 weeks vs rest of year) with different emotional stakes.",
    "Across sections, vary openings: question, short declaration, or a brief scene. Do not begin more than one section with the person's first name.",
    "Include one place where the chart seems to 'argue with itself' (e.g. bold Mars flavor vs careful Moon need) and show how both can be true.",
  ] as const;
  return frames[hashString(seed) % frames.length];
};

const astroAntiClicheEn =
  "Avoid: generic sign memes ('as a Leo you always…'), vague destiny language, 'the universe is aligning', toxic positivity, or repeating the same adjectives in every section.";

const astroAntiClicheHi =
  "बचें: राशि के स्टीरियोटाइप दोहराने, खोखले 'भाग्य/ब्रह्मांड' वाक्यों, या हर अनुभाग में एक जैसे विशेषणों से।";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const pick = <T>(arr: readonly T[], seed: string, salt: string) => {
  const idx = hashString(`${seed}|${salt}`) % arr.length;
  return arr[idx] as T;
};

const fallbackStructuredAstrology = (params: {
  fullName: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: string;
  gender?: string;
}) => {
  const zodiac_sign = getSunSignFromDate(params.dateOfBirth);
  const seed = `${params.fullName}|${params.dateOfBirth}|${params.timeOfBirth}|${params.placeOfBirth}`;
  // We don't compute real Moon/Rising without an ephemeris here; return "Unknown" but keep shape stable.
  // The UI already has a browser-side ephemeris card for comparisons.
  const moon_sign = pick(SIGNS, seed, "moon_sign_hint");
  const rising_sign = pick(SIGNS, seed, "rising_sign_hint");

  const planets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"] as const;
  const planetary_positions: Record<string, { sign: string; house: string }> = {};
  for (const p of planets) {
    planetary_positions[p] = {
      sign: p === "Sun" ? zodiac_sign : pick(SIGNS, seed, `planet_${p}`),
      house: String((hashString(`${seed}|house|${p}`) % 12) + 1),
    };
  }

  const raw_astrology_data = {
    relational_style: pick(
      [
        "You bond through honesty and small daily check-ins.",
        "You need both closeness and clear boundaries to feel safe.",
        "You value loyalty, but you also need breathing room to reset.",
      ] as const,
      seed,
      "relational_style",
    ),
    stress_response: pick(
      [
        "Under stress, you overthink, then suddenly simplify.",
        "You become productive first, emotional later.",
        "You withdraw to recalibrate, then return with clarity.",
      ] as const,
      seed,
      "stress_response",
    ),
    ambition_flavor: pick(
      [
        "Quietly competitive: you want mastery more than applause.",
        "Bold when inspired, cautious when stakes are personal.",
        "Steady builder: you prefer consistent progress over spikes.",
      ] as const,
      seed,
      "ambition_flavor",
    ),
    rest_needs: pick(
      [
        "Rest comes when you reduce noise and keep one promise to yourself.",
        "You reset best through movement and sunlight, not scrolling.",
        "You need fewer commitments, not more motivation.",
      ] as const,
      seed,
      "rest_needs",
    ),
  } as Record<string, unknown>;

  return {
    zodiac_sign,
    moon_sign,
    rising_sign,
    planetary_positions,
    raw_astrology_data,
    confidence_notes:
      "This is a lightweight fallback profile (no ephemeris). For higher accuracy, connect an astrology engine/API.",
  };
};

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

const fallbackInterpretation = (params: {
  language: "en" | "hi";
  firstName: string;
  zodiacSign: string;
  seed: string;
}) => {
  const call = params.firstName ? `${params.firstName}, ` : "";
  const warmth = pick(
    [
      "You’re learning how to trust your own pace.",
      "You’re more sensitive than you look.",
      "You have a strong instinct for what feels true.",
    ] as const,
    params.seed,
    "warmth",
  );

  const tension = pick(
    [
      "You want clarity, but you also fear the consequences of being fully seen.",
      "You crave stability, yet a part of you gets restless when life becomes predictable.",
      "You can be brave in public and cautious in private — both are real.",
    ] as const,
    params.seed,
    "tension",
  );

  if (params.language === "hi") {
    return {
      personality_analysis: `${call}${warmth} आपकी ऊर्जा में ${params.zodiacSign} की झलक है—पर आपकी पहचान सिर्फ “राशि” नहीं है। आप चीज़ों को गहराई से समझने की कोशिश करते हैं, और कभी-कभी यही गहराई आपको निर्णय लेने में देर करा देती है।\n\nमुख्य पैटर्न: अपने लिए ऊँचा मानक, दूसरों के लिए नरमी।`,
      love_life_insights: `रिश्तों में आप “सुरक्षा + स्पेस” दोनों चाहते हैं। ${tension}\n\nआपके लिए सबसे काम की चीज़: साफ़ बातचीत + छोटे-छोटे भरोसे के सबूत (actions > words)।`,
      career_path: `करियर में आप तब चमकते हैं जब काम में सीखने की गुंजाइश हो और निर्णय लेने की आज़ादी मिले। आपके लिए अच्छे रोल: research/analysis, product-thinking, design/strategy, या client-facing work जहाँ empathy जरूरी हो।\n\nDerailment: सबको खुश करने की कोशिश।`,
      financial_outlook: `पैसे में आपका स्वभाव “संतुलन” की तरफ है—कभी disciplined, कभी impulsive. सबसे अच्छा सिस्टम: auto-savings + fixed fun budget. इससे guilt भी कम होगा और growth भी।`,
      health_guidance: `ऊर्जा का उतार-चढ़ाव ज्यादा हो तो routine को “छोटा लेकिन रोज़” रखें: 15 मिनट walk, 7–8 घंटे sleep, और रात को screen time कम। कोई medical claim नहीं—बस nervous system की care।`,
      yearly_prediction: `आने वाले 6–8 हफ्तों में फोकस: clarity और priorities। साल के बाकी हिस्से में growth steady रहेगी अगर आप एक skill/goal को consistent रखें।`,
    };
  }

  return {
    personality_analysis: `${call}${warmth} There’s a ${params.zodiacSign} flavor in your style, but you’re not a stereotype. You notice patterns, you read rooms quickly, and you often carry more responsibility than you admit.\n\nCore pattern: high standards for yourself, gentleness for others.`,
    love_life_insights: `In relationships, you need both safety and space. ${tension}\n\nWhat works best for you: direct conversations + consistent actions (not grand promises).`,
    career_path: `You do best where you can learn continuously and own decisions. Strong fits: research/analysis, product-thinking, design/strategy, or client-facing work that rewards empathy.\n\nDerailment pattern: trying to please everyone at once.`,
    financial_outlook: `Money-wise you’re a balance type—disciplined in phases, impulsive in phases. The best setup is auto-savings + a fixed “fun” budget so you don’t swing between guilt and splurge.`,
    health_guidance: `If your energy swings, keep routines small-but-daily: a 15-minute walk, consistent sleep, and less late-night screen time. Wellness habits only—no medical claims.`,
    yearly_prediction: `Next 6–8 weeks: clarity and priority-setting. The rest of the year: steady growth if you keep one skill/goal consistent instead of restarting.`,
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const OPENAI_COMPAT_API_URL = Deno.env.get("OPENAI_COMPAT_API_URL");
  const OPENAI_COMPAT_API_KEY = Deno.env.get("OPENAI_COMPAT_API_KEY");
  const useAiChat = Boolean(OPENAI_COMPAT_API_URL && OPENAI_COMPAT_API_KEY);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_PUBLISHABLE_KEY) {
    return new Response(JSON.stringify({ error: "Supabase environment variables are missing." }), {
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

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid request body." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const zodiacSign = getSunSignFromDate(parsed.data.dateOfBirth);
    const responseLanguage = parsed.data.language === "hi" ? "Hindi" : "English";
    const voiceSeed = `${parsed.data.fullName}|${parsed.data.dateOfBirth}|${parsed.data.timeOfBirth}`;
    const interpretationVoice = chartInterpretationVoice(voiceSeed);
    const approxAge = approxAgeFromDob(parsed.data.dateOfBirth);
    const callName = firstNameFromFull(parsed.data.fullName);

    const astrologyData = useAiChat
      ? await (async () => {
          const structuredResponse = await fetch(OPENAI_COMPAT_API_URL!, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_COMPAT_API_KEY!}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              temperature: 0.28,
              messages: [
                {
                  role: "system",
                  content:
                    "Return ONLY strict JSON. Build a structured astrology profile object with keys: zodiac_sign, moon_sign, rising_sign, planetary_positions(object of planet-> {sign,house}), raw_astrology_data(object), confidence_notes. " +
                    "IMPORTANT: Keep zodiac_sign, moon_sign and rising_sign in English zodiac naming only. " +
                    "raw_astrology_data must include idiosyncratic keys (e.g. relational_style, stress_response, ambition_flavor, rest_needs) with short string values—quirks a human reader could recognize, internally consistent with planetary_positions. " +
                    "confidence_notes: one sentence on what is inferred vs conventional in this chart sketch.",
                },
                {
                  role: "user",
                  content: `Create structured astrology data from: ${JSON.stringify({
                    full_name: parsed.data.fullName,
                    first_name_for_tone: callName || null,
                    approximate_age_years: approxAge,
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
            throw new Error(`Astrology structuring failed [${structuredResponse.status}]: ${text}`);
          }

          const structuredPayload = await structuredResponse.json();
          const structuredText = structuredPayload?.choices?.[0]?.message?.content as string | undefined;
          if (!structuredText) {
            throw new Error("Astrology structuring returned empty content.");
          }

          return parseJsonResponse<{
            zodiac_sign: string;
            moon_sign: string;
            rising_sign: string;
            planetary_positions: Record<string, { sign: string; house: string }>;
            raw_astrology_data: Record<string, unknown>;
            confidence_notes?: string;
          }>(structuredText);
        })()
      : fallbackStructuredAstrology({
          fullName: parsed.data.fullName,
          dateOfBirth: parsed.data.dateOfBirth,
          timeOfBirth: parsed.data.timeOfBirth,
          placeOfBirth: parsed.data.placeOfBirth,
          gender: parsed.data.gender,
        });

    const interpretationSystem =
      `You are a thoughtful astrologer writing for one real person. Output language: ${responseLanguage} only.\n` +
      `Return ONLY JSON with string values: personality_analysis, love_life_insights, career_path, financial_outlook, health_guidance, yearly_prediction.\n` +
      `Use ONLY the provided structured chart JSON—including raw_astrology_data and planetary_positions. Do not add new signs or planets.\n` +
      `Tone: warm, specific, emotionally believable; sound like a careful human, not a template.\n` +
      `${interpretationVoice}\n` +
      `Each section 130-240 words (English) or comparable in Hindi; vary sentence length and openings between sections.\n` +
      `Address the reader with "you" where natural; use their first name at most once in the entire JSON if provided in birth context.\n` +
      `Include at least one nuanced contradiction between two sections (e.g. drive vs rest, closeness vs freedom) that you partially reconcile.\n` +
      `${parsed.data.language === "hi" ? astroAntiClicheHi : astroAntiClicheEn}\n` +
      `health_guidance: wellness and nervous-system habits only—never diagnose or claim medical outcomes.`;

    const interpretationUserPayload = {
      structured_chart: astrologyData,
      birth_context: {
        full_name: parsed.data.fullName,
        first_name: callName || null,
        approximate_age_years: approxAge,
        place_of_birth: parsed.data.placeOfBirth,
        time_of_birth: parsed.data.timeOfBirth,
        gender_if_shared: parsed.data.gender ?? null,
      },
      style_instruction: interpretationVoice,
    };

    const interpretation = useAiChat
      ? await (async () => {
          const interpretationResponse = await fetch(OPENAI_COMPAT_API_URL!, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_COMPAT_API_KEY!}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              temperature: 0.68,
              messages: [
                {
                  role: "system",
                  content: interpretationSystem,
                },
                {
                  role: "user",
                  content: JSON.stringify(interpretationUserPayload),
                },
              ],
            }),
          });

          if (!interpretationResponse.ok) {
            const text = await interpretationResponse.text();
            throw new Error(`Astrology interpretation failed [${interpretationResponse.status}]: ${text}`);
          }

          const interpretationPayload = await interpretationResponse.json();
          const interpretationText = interpretationPayload?.choices?.[0]?.message?.content as string | undefined;
          if (!interpretationText) {
            throw new Error("Astrology interpretation returned empty content.");
          }

          return parseJsonResponse<{
            personality_analysis: string;
            love_life_insights: string;
            career_path: string;
            financial_outlook: string;
            health_guidance: string;
            yearly_prediction: string;
          }>(interpretationText);
        })()
      : fallbackInterpretation({
          language: parsed.data.language === "hi" ? "hi" : "en",
          firstName: callName || "",
          zodiacSign: astrologyData.zodiac_sign || zodiacSign,
          seed: voiceSeed,
        });

    const headings =
      parsed.data.language === "hi"
        ? {
            personality: "व्यक्तित्व विश्लेषण",
            love: "प्रेम जीवन अंतर्दृष्टि",
            career: "करियर मार्ग",
            finance: "वित्तीय दृष्टिकोण",
            health: "स्वास्थ्य मार्गदर्शन",
            yearly: "वार्षिक भविष्यफल",
          }
        : {
            personality: "Personality Analysis",
            love: "Love Life Insights",
            career: "Career Path",
            finance: "Financial Outlook",
            health: "Health Guidance",
            yearly: "Yearly Prediction",
          };

    const fullReport = [
      `${headings.personality}\n${interpretation.personality_analysis}`,
      `${headings.love}\n${interpretation.love_life_insights}`,
      `${headings.career}\n${interpretation.career_path}`,
      `${headings.finance}\n${interpretation.financial_outlook}`,
      `${headings.health}\n${interpretation.health_guidance}`,
      `${headings.yearly}\n${interpretation.yearly_prediction}`,
    ].join("\n\n");

    const freeSummary = fullReport.slice(0, Math.max(220, Math.floor(fullReport.length * 0.2)));

    const reportPayload = {
      id: authData.user?.id ? undefined : `guest_${crypto.randomUUID()}`,
      user_id: authData.user?.id ?? null,
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
      created_at: new Date().toISOString(),
    };

    if (authData.user?.id) {
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
    }

    return new Response(JSON.stringify({ success: true, report: reportPayload, guest: true }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders });
  }
});