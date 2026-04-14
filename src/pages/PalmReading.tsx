import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { AuthPanel } from "@/components/AuthPanel";
import { CosmicLoader } from "@/components/loaders/CosmicLoader";
import { PalmScanner } from "@/components/PalmScanner";
import { ReportViewer } from "@/components/ReportViewer";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRazorpayPayment } from "@/hooks/useRazorpayPayment";
import { useReportUnlocks } from "@/hooks/useReportUnlocks";
import type { PlanType } from "@/lib/paymentPlans";

type ReportRow = Tables<"reports">;

const PalmReading = () => {
  const { t } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingSavedPalmReport, setLoadingSavedPalmReport] = useState(false);
  const [report, setReport] = useState<ReportRow | null>(null);
  const { unlocks, refreshUnlocks } = useReportUnlocks(session?.user.id);
  const { activePlan, stage, startPayment } = useRazorpayPayment();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchLatestPalmReport = async () => {
      if (!session?.user.id) {
        setReport(null);
        return;
      }

      setLoadingSavedPalmReport(true);

      const { data: latestReading, error: readingError } = await supabase
        .from("palm_readings")
        .select("id")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (readingError || !latestReading) {
        setLoadingSavedPalmReport(false);
        return;
      }

      const { data: latestReport } = await supabase.from("reports").select("*").eq("reading_id", latestReading.id).maybeSingle();

      if (latestReport) {
        setReport(latestReport);
      }

      setLoadingSavedPalmReport(false);
    };

    void fetchLatestPalmReport();
  }, [session?.user.id]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setReport(null);
  }, []);

  const resolvePaymentErrorMessage = useCallback(
    (code?: string) => {
      if (!code) return t("payments.messages.failed");
      if (code === "verification_failed") return t("payments.messages.verificationFailed");
      if (code === "auth_required") return t("payments.messages.authRequired");
      if (code === "ownership_error") return t("payments.messages.ownershipError");
      if (code === "payment_busy") return t("payments.messages.inProgress");
      if (code === "payment_order_exhausted") return t("payments.messages.orderExhausted");
      if (code === "verification_conflict") return t("payments.messages.verificationConflict");
      if (code === "combo_requires_both") return t("payments.messages.comboNeedsBoth");
      return t("payments.messages.failed");
    },
    [t],
  );

  const handleUnlock = useCallback(
    async (planType: PlanType) => {
      if (!report || !session?.user.id) {
        toast.error(t("payments.messages.selectReportFirst"));
        return;
      }

      let horoscopeRequestId: string | undefined;
      if (planType === "combo") {
        const { data: latestHoroscope } = await supabase
          .from("horoscope_requests")
          .select("id")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!latestHoroscope?.id) {
          toast.error(t("payments.messages.comboNeedsBoth"));
          return;
        }
        horoscopeRequestId = latestHoroscope.id;
      }

      const result = await startPayment({
        planType,
        readingId: report.reading_id,
        horoscopeRequestId,
        prefill: { email: session.user.email },
      });

      if (result.ok) {
        await refreshUnlocks();

        const palmUnlocked = Boolean(result.unlocks?.palmistry || result.unlocks?.combo);
        if (palmUnlocked) {
          setReport((prev) => (prev ? { ...prev, is_unlocked: true } : prev));
          toast.success(t("payments.messages.success"));
        } else {
          toast.success(t("payments.messages.successOtherPlan"));
        }
        return;
      }

      if (result.cancelled) {
        toast.error(t("payments.messages.cancelled"));
        return;
      }

      toast.error(resolvePaymentErrorMessage(result.error));
    },
    [refreshUnlocks, report, resolvePaymentErrorMessage, session, startPayment, t],
  );

  const onReportReady = useCallback((_nextReadingId: string, nextReport: ReportRow) => {
    setReport(nextReport);
  }, []);

  const content = useMemo(() => {
    if (!session) return <AuthPanel onAuthenticated={() => undefined} />;

    return (
      <div className="space-y-8">
        {loadingSavedPalmReport && (
          <div className="mystic-glass rounded-xl p-4">
            <CosmicLoader variant="section" size="medium" label={t("common.loading.fetchingSavedReports")} sublabel={t("common.loading.savedPalmHint")} />
          </div>
        )}

        <PalmScanner userId={session.user.id} onReportReady={onReportReady} />

        {report && (
          <ReportViewer
            report={report}
            isUnlocked={Boolean(report.is_unlocked || unlocks.palmistryUnlocked)}
            activePlan={activePlan}
            paymentStage={stage}
            onUnlock={handleUnlock}
          />
        )}
      </div>
    );
  }, [activePlan, handleUnlock, loadingSavedPalmReport, onReportReady, report, session, stage, t, unlocks.palmistryUnlocked]);

  if (loadingSession) {
    return (
      <main className="container min-w-0 py-16">
        <CosmicLoader variant="fullPage" size="large" label={t("common.loading.oracle")} />
      </main>
    );
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col pb-[max(4rem,env(safe-area-inset-bottom,0px))]">
      <section className="starlight-field border-b border-border/70">
        <div className="container py-8 sm:py-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0 space-y-3">
              <p className="inline-flex rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs uppercase tracking-[0.24em] text-primary">
                {t("palm.badge")}
              </p>
              <h1 className="text-3xl font-semibold leading-[1.08] sm:text-4xl md:text-5xl md:leading-[1.05] lg:text-6xl">{t("palm.title")}</h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">{t("palm.subtitle")}</p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              {session && (
                <Button variant="mystic" className="w-full sm:w-auto" onClick={signOut}>
                  {t("common.actions.signOut")}
                </Button>
              )}
              <Button asChild variant="mystic" className="w-full sm:w-auto">
                <Link to="/kundali">{t("common.actions.createBirthChart")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container min-w-0 space-y-8 py-8 sm:py-10">{content}</div>
    </main>
  );
};

export default PalmReading;

