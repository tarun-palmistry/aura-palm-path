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

const hexToBytes = (hex: string): Uint8Array | null => {
  const h = hex.trim().toLowerCase().replace(/^0x/, "");
  if (h.length % 2 !== 0 || !/^[0-9a-f]+$/.test(h)) return null;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

const timingSafeEqualHex = (a: string, b: string): boolean => {
  const ba = hexToBytes(a);
  const bb = hexToBytes(b);
  if (!ba || !bb || ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i += 1) {
    diff |= ba[i] ^ bb[i];
  }
  return diff === 0;
};

const planSchema = z.enum(["palmistry", "horoscope", "combo", "whatsapp_monthly"]);

const requestSchema = z.object({
  planType: planSchema,
  readingId: z.string().uuid().optional(),
  horoscopeRequestId: z.string().uuid().optional(),
  orderId: z.string().min(5).transform((s) => s.trim()),
  paymentId: z.string().min(5).transform((s) => s.trim()),
  signature: z.string().min(10).transform((s) => s.trim()),
});

type AdminClient = ReturnType<typeof createClient>;

const fetchUnlockSnapshot = async (supabaseAdmin: AdminClient, userId: string) => {
  const { data: existingUnlockRow } = await supabaseAdmin
    .from("report_unlocks")
    .select("palmistry_unlocked, horoscope_unlocked, unlocked_via_combo")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    palmistry: Boolean(existingUnlockRow?.palmistry_unlocked),
    horoscope: Boolean(existingUnlockRow?.horoscope_unlocked),
    combo: Boolean(existingUnlockRow?.unlocked_via_combo),
  };
};

const applyUnlockSideEffects = async (
  supabaseAdmin: AdminClient,
  params: {
    userId: string;
    paymentRowId: string;
    planType: z.infer<typeof planSchema>;
    targetReadingId: string | null;
    targetHoroscopeRequestId: string | null;
    priorUnlockRow: {
      palmistry_unlocked: boolean | null;
      horoscope_unlocked: boolean | null;
      unlocked_via_combo: boolean | null;
    } | null;
  },
) => {
  const { userId, paymentRowId, planType, targetReadingId, targetHoroscopeRequestId, priorUnlockRow } = params;

  if (planType === "whatsapp_monthly") {
    // Extend from max(existing expiry, now) by 30 days.
    const { data: existing } = await supabaseAdmin
      .from("whatsapp_entitlements")
      .select("expires_at, active")
      .eq("user_id", userId)
      .maybeSingle();

    const base = (() => {
      const now = Date.now();
      const cur = existing?.expires_at ? new Date(String(existing.expires_at)).getTime() : 0;
      return new Date(Math.max(now, cur));
    })();
    const next = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

    await supabaseAdmin.from("whatsapp_entitlements").upsert(
      {
        user_id: userId,
        active: true,
        expires_at: next.toISOString(),
        last_payment_id: paymentRowId,
      },
      { onConflict: "user_id" },
    );

    return {
      palmistry: Boolean(priorUnlockRow?.palmistry_unlocked),
      horoscope: Boolean(priorUnlockRow?.horoscope_unlocked),
      combo: Boolean(priorUnlockRow?.unlocked_via_combo),
    };
  }

  const nextPalmUnlocked = Boolean(priorUnlockRow?.palmistry_unlocked) || planType === "palmistry" || planType === "combo";
  const nextHoroscopeUnlocked = Boolean(priorUnlockRow?.horoscope_unlocked) || planType === "horoscope" || planType === "combo";
  const nextComboFlag = Boolean(priorUnlockRow?.unlocked_via_combo) || planType === "combo";

  await supabaseAdmin.from("report_unlocks").upsert(
    {
      user_id: userId,
      palmistry_unlocked: nextPalmUnlocked,
      horoscope_unlocked: nextHoroscopeUnlocked,
      unlocked_via_combo: nextComboFlag,
      last_payment_id: paymentRowId,
    },
    { onConflict: "user_id" },
  );

  if ((planType === "palmistry" || planType === "combo") && targetReadingId) {
    await supabaseAdmin.from("reports").update({ is_unlocked: true }).eq("reading_id", targetReadingId);
  }

  if ((planType === "horoscope" || planType === "combo") && targetHoroscopeRequestId) {
    await supabaseAdmin.from("horoscope_requests").update({ is_unlocked: true }).eq("id", targetHoroscopeRequestId);
  }

  return {
    palmistry: nextPalmUnlocked,
    horoscope: nextHoroscopeUnlocked,
    combo: nextComboFlag,
  };
};

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

    const { data: paymentRow, error: paymentFetchError } = await supabaseAdmin
      .from("payments")
      .select("id, user_id, reading_id, horoscope_request_id, plan_type, status, provider_payment_id")
      .eq("provider_order_id", orderId)
      .maybeSingle();

    if (paymentFetchError) throw paymentFetchError;

    if (!paymentRow || paymentRow.user_id !== authData.user.id) {
      return new Response(JSON.stringify({ error: "Payment record not found for this user." }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    if (paymentRow.status === "successful") {
      if (paymentRow.provider_payment_id && paymentRow.provider_payment_id !== paymentId) {
        return new Response(JSON.stringify({ error: "Payment id does not match this order." }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      const unlocks = await fetchUnlockSnapshot(supabaseAdmin, authData.user.id);
      return new Response(JSON.stringify({ success: true, unlocks, idempotent: true }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    if (paymentRow.status === "failed") {
      return new Response(
        JSON.stringify({
          error: "This order was already marked failed and cannot be verified. Start a new checkout.",
          code: "payment_order_exhausted",
        }),
        { status: 400, headers: jsonHeaders },
      );
    }

    if (paymentRow.plan_type !== planType) {
      return new Response(JSON.stringify({ error: "Plan mismatch for this payment order." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    if (planType === "whatsapp_monthly") {
      // No linked report targets required.
      const expected = `order_${orderId}|payment_${paymentId}`;

      const sigPayload = new TextEncoder().encode(`${orderId}|${paymentId}`);
      const keyData = new TextEncoder().encode(RAZORPAY_KEY_SECRET);
      const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const signatureBytes = await crypto.subtle.sign("HMAC", cryptoKey, sigPayload);
      const computedSignature = toHex(signatureBytes);

      if (!timingSafeEqualHex(computedSignature, signature)) {
        return new Response(JSON.stringify({ error: "Signature verification failed." }), { status: 400, headers: jsonHeaders });
      }

      const { error: updatePaymentError } = await supabaseAdmin
        .from("payments")
        .update({ status: "successful", provider_payment_id: paymentId })
        .eq("id", paymentRow.id);
      if (updatePaymentError) throw updatePaymentError;

      const unlocks = await fetchUnlockSnapshot(supabaseAdmin, authData.user.id);
      await applyUnlockSideEffects(supabaseAdmin, {
        userId: authData.user.id,
        paymentRowId: paymentRow.id,
        planType,
        targetReadingId: null,
        targetHoroscopeRequestId: null,
        priorUnlockRow: await supabaseAdmin
          .from("report_unlocks")
          .select("palmistry_unlocked, horoscope_unlocked, unlocked_via_combo")
          .eq("user_id", authData.user.id)
          .maybeSingle()
          .then((r: any) => (r?.data ?? null)),
      });

      return new Response(JSON.stringify({ success: true, unlocks, whatsapp: { active: true } }), { status: 200, headers: jsonHeaders });
    }

    if (planType === "combo" && (!paymentRow.reading_id || !paymentRow.horoscope_request_id)) {
      return new Response(
        JSON.stringify({
          error: "This combo order is missing linked reports. Create a new order with both palm and horoscope selected.",
          code: "combo_order_incomplete",
        }),
        { status: 400, headers: jsonHeaders },
      );
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

    const targetReadingId = readingId ?? paymentRow.reading_id;
    const targetHoroscopeRequestId = horoscopeRequestId ?? paymentRow.horoscope_request_id;

    if (planType === "palmistry" && !targetReadingId) {
      return new Response(JSON.stringify({ error: "Palm reading is not linked to this order." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    if (planType === "horoscope" && !targetHoroscopeRequestId) {
      return new Response(JSON.stringify({ error: "Horoscope request is not linked to this order." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    if (planType === "combo" && (!targetReadingId || !targetHoroscopeRequestId)) {
      return new Response(JSON.stringify({ error: "Combo verification requires both palm and horoscope targets." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

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

    if (!timingSafeEqualHex(expectedSignature, signature)) {
      await supabaseAdmin
        .from("payments")
        .update({
          provider_payment_id: paymentId,
          provider_signature: signature,
          status: "failed",
          failure_reason: "signature_verification_failed",
          raw_response: {
            verification: {
              orderId,
              paymentId,
              attemptedAt: new Date().toISOString(),
            },
          },
        })
        .eq("id", paymentRow.id)
        .eq("status", "pending");

      return new Response(JSON.stringify({ error: "Payment signature verification failed." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const paidAt = new Date().toISOString();

    const { data: claimedRows, error: claimError } = await supabaseAdmin
      .from("payments")
      .update({
        provider_payment_id: paymentId,
        provider_signature: signature,
        status: "successful",
        paid_at: paidAt,
        raw_response: {
          verification: {
            orderId,
            paymentId,
            verifiedAt: paidAt,
          },
        },
      })
      .eq("id", paymentRow.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (claimError) throw claimError;

    if (!claimedRows) {
      const { data: fresh } = await supabaseAdmin
        .from("payments")
        .select("status, provider_payment_id")
        .eq("id", paymentRow.id)
        .single();

      if (fresh?.status === "successful" && fresh.provider_payment_id === paymentId) {
        const unlocks = await fetchUnlockSnapshot(supabaseAdmin, authData.user.id);
        return new Response(JSON.stringify({ success: true, unlocks, idempotent: true }), {
          status: 200,
          headers: jsonHeaders,
        });
      }

      return new Response(
        JSON.stringify({
          error: "Payment verification conflict. Check your account or try again.",
          code: "verification_race",
        }),
        { status: 409,
          headers: jsonHeaders },
      );
    }

    const { data: unlockRow } = await supabaseAdmin
      .from("report_unlocks")
      .select("palmistry_unlocked, horoscope_unlocked, unlocked_via_combo")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    const unlocks = await applyUnlockSideEffects(supabaseAdmin, {
      userId: authData.user.id,
      paymentRowId: paymentRow.id,
      planType,
      targetReadingId,
      targetHoroscopeRequestId,
      priorUnlockRow: unlockRow,
    });

    return new Response(JSON.stringify({ success: true, unlocks, idempotent: false }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders });
  }
});
