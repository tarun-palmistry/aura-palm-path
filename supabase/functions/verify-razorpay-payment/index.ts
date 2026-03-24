import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const toHex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_PUBLISHABLE_KEY) {
    return new Response(JSON.stringify({ error: "Supabase environment variables are missing." }), {
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
    const { data: authData } = await supabaseAuth.auth.getUser();
    if (!authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const { readingId, orderId, paymentId, signature } = await req.json();
    if (!readingId || !orderId || !paymentId || !signature) {
      return new Response(JSON.stringify({ error: "readingId, orderId, paymentId and signature are required." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const { data: paymentRow } = await supabaseAdmin
      .from("payments")
      .select("id, user_id")
      .eq("reading_id", readingId)
      .eq("provider_order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!paymentRow || paymentRow.user_id !== authData.user.id) {
      return new Response(JSON.stringify({ error: "Payment row not found for this user." }), {
        status: 404,
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
        })
        .eq("id", paymentRow.id);

      return new Response(JSON.stringify({ error: "Payment signature verification failed." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    await supabaseAdmin
      .from("payments")
      .update({
        provider_payment_id: paymentId,
        provider_signature: signature,
        status: "successful",
        paid_at: new Date().toISOString(),
      })
      .eq("id", paymentRow.id);

    await supabaseAdmin.from("reports").update({ is_unlocked: true }).eq("reading_id", readingId);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders });
  }
});
