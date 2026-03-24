import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { loadRazorpayScript } from "@/lib/loadRazorpay";

type ReportRow = Tables<"reports">;

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type ReportViewerProps = {
  report: ReportRow;
  readingId: string;
  onUnlocked: (next: ReportRow) => void;
};

export const ReportViewer = ({ report, readingId, onUnlocked }: ReportViewerProps) => {
  const [unlocking, setUnlocking] = useState(false);

  const unlockFullReading = async () => {
    setUnlocking(true);

    try {
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady || !window.Razorpay) {
        throw new Error("Payment SDK failed to load.");
      }

      const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
        body: { readingId },
      });

      if (error) throw new Error(error.message);

      const razorpay = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Palm Oracle",
        description: "Unlock full palm reading",
        order_id: data.orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const { error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
            body: {
              readingId,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            },
          });

          if (verifyError) {
            toast.error(verifyError.message || "Payment verification failed.");
            return;
          }

          const { data: refreshed } = await supabase
            .from("reports")
            .select("*")
            .eq("reading_id", readingId)
            .single();

          if (refreshed) {
            onUnlocked(refreshed);
            toast.success("Full report unlocked.");
          }
        },
        theme: {
          color: "#c6a74f",
        },
      });

      razorpay.open();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start payment.";
      toast.error(message);
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <section className="mystic-glass space-y-4 rounded-xl p-6">
      <h2 className="text-3xl font-semibold">Your Palm Reading</h2>

      <article className="space-y-4 rounded-lg border border-border/80 bg-background/30 p-4">
        <h3 className="text-xl font-semibold">Free Preview</h3>
        <p className="leading-relaxed text-muted-foreground">{report.free_preview}</p>
      </article>

      {report.is_unlocked ? (
        <article className="space-y-4 rounded-lg border border-border/80 bg-background/30 p-4">
          <h3 className="text-xl font-semibold">Full Reading</h3>
          <p className="whitespace-pre-line leading-relaxed text-foreground/95">{report.full_report}</p>
        </article>
      ) : (
        <article className="space-y-4 rounded-lg border border-border/80 bg-background/30 p-4">
          <h3 className="text-xl font-semibold">Unlock Full Reading</h3>
          <p className="text-muted-foreground">Get love, career, strength/weakness insights, and future guidance.</p>
          <Button variant="hero" onClick={unlockFullReading} disabled={unlocking}>
            {unlocking ? "Preparing checkout..." : "Unlock Full Reading"}
          </Button>
        </article>
      )}
    </section>
  );
};
