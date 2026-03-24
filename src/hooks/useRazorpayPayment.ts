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

type PaymentResult = {
  ok: boolean;
  cancelled?: boolean;
  unlocks?: {
    palmistry: boolean;
    horoscope: boolean;
    combo: boolean;
  };
  error?: string;
};

type RazorpaySuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export const useRazorpayPayment = () => {
  const [activePlan, setActivePlan] = useState<PlanType | null>(null);
  const [stage, setStage] = useState<PaymentStage>("idle");

  const normalizePaymentError = (message: string) => {
    if (message === "payment_cancelled") return "payment_cancelled";
    if (message === "payment_failed") return "payment_failed";
    if (message === "payment_busy") return "payment_busy";
    if (message.includes("signature")) return "verification_failed";
    if (message.includes("Unauthorized") || message.includes("authorization token")) return "auth_required";
    if (message.includes("not found for this user") || message.includes("mismatch")) return "ownership_error";
    return "payment_failed";
  };

  const startPayment = async ({ planType, readingId, horoscopeRequestId, prefill }: StartPaymentArgs): Promise<PaymentResult> => {
    if (stage !== "idle") {
      return { ok: false, error: "payment_busy" };
    }

    setActivePlan(planType);
    setStage("creating");

    try {
      const scriptLoaded = await loadRazorpayScript();
      const RazorpayCtor = (window as Window & { Razorpay?: any }).Razorpay;

      if (!scriptLoaded || !RazorpayCtor) {
        throw new Error("razorpay_unavailable");
      }

      const { data: orderData, error: orderError } = await supabase.functions.invoke("create-razorpay-order", {
        body: {
          planType,
          readingId,
          horoscopeRequestId,
        },
      });

      if (orderError) throw new Error(orderError.message);
      if (orderData?.error) throw new Error(orderData.error);

      if (orderData?.alreadyUnlocked) {
        setStage("idle");
        setActivePlan(null);
        return {
          ok: true,
          unlocks: {
            palmistry: true,
            horoscope: true,
            combo: true,
          },
        };
      }

      setStage("checkout");

      const paymentPayload = await new Promise<RazorpaySuccessPayload>((resolve, reject) => {
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
            ondismiss: () => reject(new Error("payment_cancelled")),
          },
          handler: (response: RazorpaySuccessPayload) => resolve(response),
        });

        checkout.on("payment.failed", () => reject(new Error("payment_failed")));
        checkout.open();
      });

      setStage("verifying");

      const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
        body: {
          planType,
          readingId,
          horoscopeRequestId,
          orderId: paymentPayload.razorpay_order_id,
          paymentId: paymentPayload.razorpay_payment_id,
          signature: paymentPayload.razorpay_signature,
        },
      });

      if (verifyError) throw new Error(verifyError.message);
      if (verifyData?.error) throw new Error(verifyData.error);

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
