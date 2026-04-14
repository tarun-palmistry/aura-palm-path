import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const planSchema = z.enum(["palmistry", "horoscope", "combo", "whatsapp_monthly"]);

const requestSchema = z.object({
  planType: planSchema,
  readingId: z.string().uuid().optional(),
  horoscopeRequestId: z.string().uuid().optional(),
});

const PLAN_PRICES: Record<z.infer<typeof planSchema>, number> = {
  palmistry: 99,
  horoscope: 99,
  combo: 149,
  whatsapp_monthly: 99,
};

const PLAN_LABELS: Record<z.infer<typeof planSchema>, string> = {
  palmistry: "Palmistry Full Report",
  horoscope: "Horoscope Full Report",
  combo: "Palmistry + Horoscope Combo",
  whatsapp_monthly: "WhatsApp Horoscope Subscription (Monthly)",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
  const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_PUBLISHABLE_KEY) {
    return new Response(JSON.stringify({ error: "Backend environment variables are missing." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return new Response(JSON.stringify({ error: "Razorpay keys are not configured in secrets." }), {
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid request" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const { planType, readingId, horoscopeRequestId } = parsed.data;

    if (planType === "whatsapp_monthly") {
      // Paid entitlement for WhatsApp delivery; no report IDs required.
      const { data: ent } = await supabaseAdmin
        .from("whatsapp_entitlements")
        .select("active, expires_at")
        .eq("user_id", authData.user.id)
        .maybeSingle();
      const active = Boolean(ent?.active) && !!ent?.expires_at && new Date(String(ent.expires_at)).getTime() > Date.now();
      if (active) {
        return new Response(
          JSON.stringify({
            alreadyUnlocked: true,
            message: "WhatsApp delivery is already active.",
            unlocks: { palmistry: false, horoscope: false, combo: false },
            whatsapp: { active: true, expires_at: ent?.expires_at },
          }),
          { status: 200, headers: jsonHeaders },
        );
      }
    }

    if (planType === "palmistry" && !readingId) {
      return new Response(JSON.stringify({ error: "readingId is required for palmistry plan." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    if (planType === "horoscope" && !horoscopeRequestId) {
      return new Response(JSON.stringify({ error: "horoscopeRequestId is required for horoscope plan." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    if (planType === "combo" && (!readingId || !horoscopeRequestId)) {
      return new Response(
        JSON.stringify({
          error:
            "Combo plan requires both readingId (palm) and horoscopeRequestId (birth chart). Save both reports first, then try again.",
          code: "COMBO_REQUIRES_BOTH_TARGETS",
        }),
        { status: 400, headers: jsonHeaders },
      );
    }

    if (readingId) {
      const { data: reading } = await supabaseAdmin
        .from("palm_readings")
        .select("id, user_id")
        .eq("id", readingId)
        .single();

      if (!reading || reading.user_id !== authData.user.id) {
        return new Response(JSON.stringify({ error: "Palm reading not found for this user." }), {
          status: 404,
          headers: jsonHeaders,
        });
      }
    }

    if (horoscopeRequestId) {
      const { data: horoscopeRequest } = await supabaseAdmin
        .from("horoscope_requests")
        .select("id, user_id")
        .eq("id", horoscopeRequestId)
        .single();

      if (!horoscopeRequest || horoscopeRequest.user_id !== authData.user.id) {
        return new Response(JSON.stringify({ error: "Horoscope request not found for this user." }), {
          status: 404,
          headers: jsonHeaders,
        });
      }
    }

    const { data: unlockRow } = await supabaseAdmin
      .from("report_unlocks")
      .select("palmistry_unlocked, horoscope_unlocked, unlocked_via_combo")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    const palmUnlocked = Boolean(unlockRow?.palmistry_unlocked);
    const horoscopeUnlocked = Boolean(unlockRow?.horoscope_unlocked);
    const comboUnlocked = Boolean(unlockRow?.unlocked_via_combo) || (palmUnlocked && horoscopeUnlocked);

    const alreadyUnlocked =
      planType === "palmistry"
        ? palmUnlocked
        : planType === "horoscope"
          ? horoscopeUnlocked
          : palmUnlocked && horoscopeUnlocked;

    if (alreadyUnlocked) {
      return new Response(
        JSON.stringify({
          alreadyUnlocked: true,
          message: "Selected report is already unlocked.",
          unlocks: {
            palmistry: palmUnlocked,
            horoscope: horoscopeUnlocked,
            combo: comboUnlocked,
          },
        }),
        {
          status: 200,
          headers: jsonHeaders,
        },
      );
    }

    const amountInr = PLAN_PRICES[planType];
    const receipt = `${planType}_${Date.now()}`;

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInr * 100,
        currency: "INR",
        receipt,
      }),
    });

    const orderData = await razorpayResponse.json();
    if (!razorpayResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Razorpay order creation failed: ${JSON.stringify(orderData)}` }),
        {
          status: razorpayResponse.status,
          headers: jsonHeaders,
        },
      );
    }

    const { error: insertError } = await supabaseAdmin.from("payments").insert({
      user_id: authData.user.id,
      reading_id: readingId ?? null,
      horoscope_request_id: horoscopeRequestId ?? null,
      plan_type: planType,
      provider: "razorpay",
      provider_order_id: orderData.id,
      amount_inr: amountInr,
      status: "pending",
      currency: "INR",
      raw_response: { order: orderData },
    });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        keyId: RAZORPAY_KEY_ID,
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        planType,
        planLabel: PLAN_LABELS[planType],
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders });
  }
});
