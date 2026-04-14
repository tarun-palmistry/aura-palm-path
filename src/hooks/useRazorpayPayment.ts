import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadRazorpayScript } from "@/lib/loadRazorpay";
import type { PaymentStage, PlanType } from "@/lib/paymentPlans";
import { trackEvent } from "@/lib/analytics";

type StartPaymentArgs = {
  planType: PlanType;
  readingId?: string;
  horoscopeRequestId?: string;
  prefill?: {
    name?: string;
    email?: string;
  };
};

type UnlockSnapshot = {
  palmistry: boolean;
  horoscope: boolean;
  combo: boolean;
};

type PaymentResult = {
  ok: boolean;
  cancelled?: boolean;
  unlocks?: UnlockSnapshot;
  error?: string;
};

type RazorpaySuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailureError = {
  code?: string;
  description?: string;
  reason?: string;
};

type RazorpayCheckout = {
  open: () => void;
  on: (event: "payment.failed", handler: (resp: unknown) => void) => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayCheckout;

export const useRazorpayPayment = () => {
  const [activePlan, setActivePlan] = useState<PlanType | null>(null);
  const [stage, setStage] = useState<PaymentStage>("idle");

  const isInvalidJwtMessage = (message: string) => {
    const m = message.toLowerCase();
    return m.includes("invalid jwt") || (m.includes("\"code\":401") && m.includes("jwt"));
  };

  const tokenProjectMismatch = (accessToken: string) => {
    try {
      const parts = accessToken.split(".");
      if (parts.length < 2) return false;
      const base64Url = parts[1];
      const pad = "=".repeat((4 - (base64Url.length % 4)) % 4);
      const base64 = (base64Url + pad).replace(/-/g, "+").replace(/_/g, "/");
      const json = JSON.parse(atob(base64)) as { iss?: string };
      const projectId = String(import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "").trim();
      if (!projectId) return false;
      const iss = String(json.iss ?? "");
      return iss.length > 0 && !iss.includes(projectId);
    } catch {
      return false;
    }
  };

  const ensureFreshSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) return;
    const s = data.session;
    if (!s) return;
    if (s.access_token && tokenProjectMismatch(s.access_token)) {
      await supabase.auth.signOut();
      throw new Error("auth_required");
    }
    const expiresAtMs = (s.expires_at ?? 0) * 1000;
    if (!expiresAtMs) return;
    // Refresh if expiring within ~2 minutes.
    if (expiresAtMs - Date.now() < 2 * 60 * 1000) {
      await supabase.auth.refreshSession();
    }
  };

  const debugEdgeFunctionError = async (name: string, body: unknown) => {
    if (!import.meta.env.DEV) return "";
    try {
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ""),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body ?? {}),
      });
      return await res.text();
    } catch {
      return "";
    }
  };

  const normalizePaymentError = (message: string) => {
    if (message === "payment_cancelled") return "payment_cancelled";
    if (message === "payment_failed") return "payment_failed";
    if (message === "payment_busy") return "payment_busy";
    if (message === "razorpay_unavailable") return "razorpay_unavailable";
    if (message.includes("payment_order_exhausted") || message.includes("already marked failed")) return "payment_order_exhausted";
    if (message.includes("verification_race") || message.includes("verification conflict")) return "verification_conflict";
    if (message.includes("signature")) return "verification_failed";
    if (message.includes("COMBO_REQUIRES_BOTH_TARGETS") || message.includes("Combo plan requires both")) return "combo_requires_both";
    if (message.includes("Unauthorized") || message.includes("authorization token") || isInvalidJwtMessage(message)) return "auth_required";
    if (message.includes("not found for this user") || message.includes("mismatch")) return "ownership_error";

    // Surface the real backend/provider message to UI when we don't recognize it.
    return `raw::${message}`;
  };

  const startPayment = async ({ planType, readingId, horoscopeRequestId, prefill }: StartPaymentArgs): Promise<PaymentResult> => {
    if (stage !== "idle") {
      return { ok: false, error: "payment_busy" };
    }

    setActivePlan(planType);
    setStage("creating");

    try {
      await ensureFreshSession();
      const scriptLoaded = await loadRazorpayScript();
      const RazorpayCtor = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay;

      if (!scriptLoaded || !RazorpayCtor) {
        throw new Error("razorpay_unavailable");
      }

      const invokeCreate = async () =>
        await supabase.functions.invoke("create-razorpay-order", {
          body: {
            planType,
            readingId,
            horoscopeRequestId,
          },
        });

      let { data: orderData, error: orderError } = await invokeCreate();
      if (orderError?.message?.toLowerCase().includes("invalid jwt")) {
        await supabase.auth.refreshSession();
        ({ data: orderData, error: orderError } = await invokeCreate());
      }

      if (orderError) {
        const debug = await debugEdgeFunctionError("create-razorpay-order", { planType, readingId, horoscopeRequestId });
        throw new Error(debug || orderError.message);
      }
      if (orderData?.error) throw new Error(orderData.error);

      if (orderData?.alreadyUnlocked) {
        setStage("idle");
        setActivePlan(null);
        const u = orderData.unlocks as UnlockSnapshot | undefined;
        const legacyUnlocks: UnlockSnapshot =
          planType === "palmistry"
            ? { palmistry: true, horoscope: false, combo: false }
            : planType === "horoscope"
              ? { palmistry: false, horoscope: true, combo: false }
              : planType === "whatsapp_monthly"
                ? { palmistry: false, horoscope: false, combo: false }
                : { palmistry: true, horoscope: true, combo: true };
        return {
          ok: true,
          unlocks: u ?? legacyUnlocks,
        };
      }

      setStage("checkout");

      const paymentPayload = await new Promise<RazorpaySuccessPayload>((resolve, reject) => {
        let settled = false;
        const once = (fn: () => void) => {
          if (settled) return;
          settled = true;
          fn();
        };

        const checkout = new RazorpayCtor({
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "AstraPalm",
          description: orderData.planLabel,
          order_id: orderData.orderId,
          prefill: {
            name: prefill?.name,
            email: prefill?.email,
          },
          theme: {
            color: "hsl(47 67% 55%)",
          },
          modal: {
            ondismiss: () => once(() => reject(new Error("payment_cancelled"))),
          },
          handler: (response: RazorpaySuccessPayload) =>
            once(() => resolve(response)),
        });

        checkout.on("payment.failed", (resp: unknown) => {
          let details = "payment_failed";
          if (resp && typeof resp === "object" && "error" in resp) {
            const err = (resp as { error?: RazorpayFailureError }).error;
            if (err) {
              details = `${err.code ?? "payment_failed"}: ${err.description ?? err.reason ?? "Payment failed"}`;
            }
          }
          once(() => reject(new Error(details)));
        });
        checkout.open();
      });

      setStage("verifying");

      const invokeVerify = async () =>
        await supabase.functions.invoke("verify-razorpay-payment", {
          body: {
            planType,
            readingId,
            horoscopeRequestId,
            orderId: paymentPayload.razorpay_order_id?.trim(),
            paymentId: paymentPayload.razorpay_payment_id?.trim(),
            signature: paymentPayload.razorpay_signature?.trim(),
          },
        });

      let { data: verifyData, error: verifyError } = await invokeVerify();
      if (verifyError?.message?.toLowerCase().includes("invalid jwt")) {
        await supabase.auth.refreshSession();
        ({ data: verifyData, error: verifyError } = await invokeVerify());
      }

      if (verifyError) {
        const debug = await debugEdgeFunctionError("verify-razorpay-payment", {
          planType,
          readingId,
          horoscopeRequestId,
          orderId: paymentPayload.razorpay_order_id?.trim(),
          paymentId: paymentPayload.razorpay_payment_id?.trim(),
          signature: paymentPayload.razorpay_signature?.trim(),
        });
        throw new Error(debug || verifyError.message);
      }
      if (verifyData?.error) {
        const code = verifyData && typeof verifyData === "object" && "code" in verifyData ? String((verifyData as { code?: string }).code ?? "") : "";
        throw new Error(code ? `${verifyData.error} (${code})` : verifyData.error);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      void trackEvent({
        eventName: "payment_success",
        userId: sessionData.session?.user.id,
        metadata: {
          planType,
          readingId: readingId ?? null,
          horoscopeRequestId: horoscopeRequestId ?? null,
          orderId: paymentPayload.razorpay_order_id,
          paymentId: paymentPayload.razorpay_payment_id,
        },
      });

      setStage("idle");
      setActivePlan(null);
      return {
        ok: true,
        unlocks: {
          palmistry: Boolean(verifyData?.unlocks?.palmistry),
          horoscope: Boolean(verifyData?.unlocks?.horoscope),
          combo: Boolean(verifyData?.unlocks?.combo),
        },
      };
    } catch (error) {
      setStage("idle");
      setActivePlan(null);

      const message = error instanceof Error ? error.message : "payment_failed";
      if (isInvalidJwtMessage(message)) {
        await supabase.auth.signOut();
        return { ok: false, error: "auth_required" };
      }

      if (message === "payment_cancelled") {
        return { ok: false, cancelled: true };
      }

      return { ok: false, error: normalizePaymentError(message) };
    }
  };

  return {
    activePlan,
    stage,
    isProcessing: stage !== "idle",
    startPayment,
  };
};
