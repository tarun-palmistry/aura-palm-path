import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const planSchema = z.enum(["palmistry", "horoscope", "combo"]);

const requestSchema = z.object({
  planType: planSchema,
  readingId: z.string().uuid().optional(),
  horoscopeRequestId: z.string().uuid().optional(),
  orderId: z.string().min(5),
  paymentId: z.string().min(5),
  signature: z.string().min(10),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_PUBLISHABLE_KEY) {
    return new Response(JSON.stringify({ error: "Backend environment variables are missing." }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  if (!RAZORPAY_KEY_SECRET) {
    return new Response(JSON.stringify({ error: "RAZORPAY_KEY_SECRET is missing." }), {
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

    const { planType, readingId, horoscopeRequestId, orderId, paymentId, signature } = parsed.data;

    const { data: paymentRow } = await supabaseAdmin
      .from("payments")
      .select("id, user_id, reading_id, horoscope_request_id, plan_type, status")
      .eq("provider_order_id", orderId)
      .maybeSingle();

    if (!paymentRow || paymentRow.user_id !== authData.user.id) {
      return new Response(JSON.stringify({ error: "Payment record not found for this user." }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    if (paymentRow.status === "successful") {
      const { data: existingUnlockRow } = await supabaseAdmin
        .from("report_unlocks")
        .select("palmistry_unlocked, horoscope_unlocked, unlocked_via_combo")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          success: true,
          unlocks: {
            palmistry: Boolean(existingUnlockRow?.palmistry_unlocked),
            horoscope: Boolean(existingUnlockRow?.horoscope_unlocked),
            combo: Boolean(existingUnlockRow?.unlocked_via_combo),
          },
        }),
        { status: 200, headers: jsonHeaders },
      );
    }

    if (paymentRow.plan_type !== planType) {
      return new Response(JSON.stringify({ error: "Plan mismatch for this payment order." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    if (readingId && paymentRow.reading_id && readingId !== paymentRow.reading_id) {
      return new Response(JSON.stringify({ error: "Reading mismatch for this order." }), {
        status: 403,
        headers: jsonHeaders,
      });
    }

    if (horoscopeRequestId && paymentRow.horoscope_request_id && horoscopeRequestId !== paymentRow.horoscope_request_id) {
      return new Response(JSON.stringify({ error: "Horoscope request mismatch for this order." }), {
        status: 403,
        headers: jsonHeaders,
      });
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(RAZORPAY_KEY_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${orderId}|${paymentId}`));
    const expectedSignature = toHex(digest);

    if (expectedSignature !== signature) {
      await supabaseAdmin
        .from("payments")
        .update({
          provider_payment_id: paymentId,
          provider_signature: signature,
          status: "failed",
          failure_reason: "signature_verification_failed",
          raw_response: {
            verification: {
              expectedSignature,
              receivedSignature: signature,
              orderId,
              paymentId,
              attemptedAt: new Date().toISOString(),
            },
          },
        })
        .eq("id", paymentRow.id)
        .neq("status", "successful");

      return new Response(JSON.stringify({ error: "Payment signature verification failed." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const targetReadingId = readingId ?? paymentRow.reading_id;
    const targetHoroscopeRequestId = horoscopeRequestId ?? paymentRow.horoscope_request_id;

    if (targetReadingId) {
      const { data: reading } = await supabaseAdmin
        .from("palm_readings")
        .select("id, user_id")
        .eq("id", targetReadingId)
        .single();

      if (!reading || reading.user_id !== authData.user.id) {
        return new Response(JSON.stringify({ error: "Palm reading not found for this user." }), {
          status: 404,
          headers: jsonHeaders,
        });
      }
    }

    if (targetHoroscopeRequestId) {
      const { data: horoscopeRequest } = await supabaseAdmin
        .from("horoscope_requests")
        .select("id, user_id")
        .eq("id", targetHoroscopeRequestId)
        .single();

      if (!horoscopeRequest || horoscopeRequest.user_id !== authData.user.id) {
        return new Response(JSON.stringify({ error: "Horoscope request not found for this user." }), {
          status: 404,
          headers: jsonHeaders,
        });
      }
    }

    await supabaseAdmin
      .from("payments")
      .update({
        provider_payment_id: paymentId,
        provider_signature: signature,
        status: "successful",
        paid_at: new Date().toISOString(),
        raw_response: {
          verification: {
            expectedSignature,
            receivedSignature: signature,
            orderId,
            paymentId,
            verifiedAt: new Date().toISOString(),
          },
        },
      })
      .eq("id", paymentRow.id)
      .neq("status", "successful");

    const { data: unlockRow } = await supabaseAdmin
      .from("report_unlocks")
      .select("palmistry_unlocked, horoscope_unlocked, unlocked_via_combo")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    const nextPalmUnlocked = Boolean(unlockRow?.palmistry_unlocked) || planType === "palmistry" || planType === "combo";
    const nextHoroscopeUnlocked = Boolean(unlockRow?.horoscope_unlocked) || planType === "horoscope" || planType === "combo";
    const nextComboFlag = Boolean(unlockRow?.unlocked_via_combo) || planType === "combo";

    await supabaseAdmin.from("report_unlocks").upsert(
      {
        user_id: authData.user.id,
        palmistry_unlocked: nextPalmUnlocked,
        horoscope_unlocked: nextHoroscopeUnlocked,
        unlocked_via_combo: nextComboFlag,
        last_payment_id: paymentRow.id,
      },
      { onConflict: "user_id" },
    );

    if ((planType === "palmistry" || planType === "combo") && targetReadingId) {
      await supabaseAdmin.from("reports").update({ is_unlocked: true }).eq("reading_id", targetReadingId);
    }

    if ((planType === "horoscope" || planType === "combo") && targetHoroscopeRequestId) {
      await supabaseAdmin.from("horoscope_requests").update({ is_unlocked: true }).eq("id", targetHoroscopeRequestId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        unlocks: {
          palmistry: nextPalmUnlocked,
          horoscope: nextHoroscopeUnlocked,
          combo: nextComboFlag,
        },
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders });
  }
});
