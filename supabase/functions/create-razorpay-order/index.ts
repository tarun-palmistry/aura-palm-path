import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
  const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_PUBLISHABLE_KEY) {
    return new Response(JSON.stringify({ error: "Supabase environment variables are missing." }), {
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
    const { data: authData } = await supabaseAuth.auth.getUser();
    if (!authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const { readingId } = await req.json();
    if (!readingId || typeof readingId !== "string") {
      return new Response(JSON.stringify({ error: "readingId is required." }), { status: 400, headers: jsonHeaders });
    }

    const { data: reading } = await supabaseAdmin
      .from("palm_readings")
      .select("id, user_id")
      .eq("id", readingId)
      .single();

    if (!reading || reading.user_id !== authData.user.id) {
      return new Response(JSON.stringify({ error: "Reading not found." }), { status: 404, headers: jsonHeaders });
    }

    const amountInr = 299;
    const receipt = `reading_${readingId.slice(0, 10)}_${Date.now()}`;

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
      return new Response(JSON.stringify({ error: `Razorpay order creation failed: ${JSON.stringify(orderData)}` }), {
        status: razorpayResponse.status,
        headers: jsonHeaders,
      });
    }

    const { error: insertError } = await supabaseAdmin.from("payments").insert({
      user_id: authData.user.id,
      reading_id: readingId,
      provider: "razorpay",
      provider_order_id: orderData.id,
      amount_inr: amountInr,
      status: "pending",
      currency: "INR",
    });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        keyId: RAZORPAY_KEY_ID,
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders });
  }
});
