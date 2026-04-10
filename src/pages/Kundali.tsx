import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarDays, Download, Sparkles, Sun } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CosmicLoader } from "@/components/loaders/CosmicLoader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UnlockPlansCard } from "@/components/UnlockPlansCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRazorpayPayment } from "@/hooks/useRazorpayPayment";
import { useReportUnlocks } from "@/hooks/useReportUnlocks";
import type { PlanType } from "@/lib/paymentPlans";
import { trackEvent } from "@/lib/analytics";
import { BirthChartEnginePanel } from "@/components/kundali/BirthChartEnginePanel";

type KundaliReportRow = {
  id: string;
  full_name: string;
  zodiac_sign: string;
  moon_sign: string;
  rising_sign: string;
  free_summary: string;
  full_report: string;
  interpretation: Record<string, string>;
  created_at: string;
  is_unlocked: boolean;
};

const Kundali = () => {
  const { language, t } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [report, setReport] = useState<KundaliReportRow | null>(null);
  const [history, setHistory] = useState<KundaliReportRow[]>([]);

  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [timeOfBirth, setTimeOfBirth] = useState("");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [birthTimeZone, setBirthTimeZone] = useState("Asia/Kolkata");

  const trackedReportIdRef = useRef<string | null>(null);
  const { unlocks, refreshUnlocks } = useReportUnlocks(session?.user.id);
  const { activePlan, stage, startPayment } = useRazorpayPayment();

  const birthChartSchema = useMemo(
    () =>
      z.object({
        fullName: z.string().trim().min(2, t("astrology.validation.fullNameRequired")).max(100, t("astrology.validation.nameLong")),
        dateOfBirth: z.string().min(1, t("astrology.validation.dobRequired")),
        timeOfBirth: z.string().min(1, t("astrology.validation.tobRequired")),
        placeOfBirth: z
          .string()
          .trim()
          .min(2, t("astrology.validation.placeRequired"))
          .max(150, t("astrology.validation.placeLong")),
        gender: z.string().trim().max(40, t("astrology.validation.genderShort")).optional(),
      }),
    [t],
  );

  const interpretationCards = useMemo(() => {
    if (!report?.interpretation) return [];
    const value = report.interpretation;
    return [
      { title: t("astrology.sections.personality"), body: value.personality_analysis },
      { title: t("astrology.sections.love"), body: value.love_life_insights },
      { title: t("astrology.sections.career"), body: value.career_path },
      { title: t("astrology.sections.finance"), body: value.financial_outlook },
      { title: t("astrology.sections.health"), body: value.health_guidance },
      { title: t("astrology.sections.yearly"), body: value.yearly_prediction },
    ].filter((item) => item.body);
  }, [report, t]);

  const lockedSections = useMemo(
    () => [
      t("payments.lockedHoroscopeSections.love"),
      t("payments.lockedHoroscopeSections.career"),
      t("payments.lockedHoroscopeSections.yearly"),
      t("payments.lockedHoroscopeSections.deep"),
    ],
    [t],
  );

  const isCurrentReportUnlocked = Boolean(report && (report.is_unlocked || unlocks.horoscopeUnlocked));

  const resolvePaymentErrorMessage = (code?: string) => {
    if (!code) return t("payments.messages.failed");
    if (code.startsWith("raw::")) return code.replace(/^raw::/, "").trim() || t("payments.messages.failed");
    if (code === "verification_failed") return t("payments.messages.verificationFailed");
    if (code === "auth_required") return t("payments.messages.authRequired");
    if (code === "ownership_error") return t("payments.messages.ownershipError");
    if (code === "payment_busy") return t("payments.messages.inProgress");
    if (code === "payment_order_exhausted") return t("payments.messages.orderExhausted");
    if (code === "verification_conflict") return t("payments.messages.verificationConflict");
    if (code === "combo_requires_both") return t("payments.messages.comboNeedsBoth");
    return t("payments.messages.failed");
  };

  const loadHistory = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from("horoscope_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(8);
    if (error) {
      toast.error(error.message);
      return;
    }
    setHistory((data ?? []) as KundaliReportRow[]);
  }, []);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user.id) void loadHistory(nextSession.user.id);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user.id) void loadHistory(data.session.user.id);
      setLoadingSession(false);
    });

    return () => listener.subscription.unsubscribe();
  }, [loadHistory]);

  useEffect(() => {
    if (!report?.id || trackedReportIdRef.current === report.id) return;
    trackedReportIdRef.current = report.id;

    void trackEvent({
      eventName: "horoscope_report_view",
      userId: session?.user.id,
      metadata: { reportId: report.id, unlocked: Boolean(report.is_unlocked || unlocks.horoscopeUnlocked) },
    });
  }, [report?.id, report?.is_unlocked, session?.user.id, unlocks.horoscopeUnlocked]);

  const submitBirthChart = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = birthChartSchema.safeParse({ fullName, dateOfBirth, timeOfBirth, placeOfBirth, gender });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("astrology.validation.checkForm"));
      return;
    }

    void trackEvent({
      eventName: "horoscope_submit_click",
      userId: session?.user.id,
      metadata: { hasGender: Boolean(parsed.data.gender) },
    });

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-astrology-report", {
        body: { ...parsed.data, language },
      });

      if (error) {
        let serverError = "";
        if (import.meta.env.DEV) {
          try {
            const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-astrology-report`;
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            const res = await fetch(fnUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ""),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ ...parsed.data, language }),
            });
            serverError = await res.text();
          } catch {
            // ignore debug fetch failure
          }
        }
        throw new Error(serverError || error.message);
      }
      if (data?.error) throw new Error(data.error);

      const nextReport = data?.report as KundaliReportRow | undefined;
      if (!nextReport) throw new Error(t("astrology.toasts.noReport"));

      setReport(nextReport);
      if (session?.user.id) await loadHistory(session.user.id);
      toast.success(t("astrology.toasts.saved"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("astrology.toasts.failedReport");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlock = async (planType: PlanType) => {
    if (!report) {
      toast.error(t("payments.messages.selectReportFirst"));
      return;
    }

    if (!session?.user.id) {
      toast.error(t("payments.messages.authRequired"));
      return;
    }

    let readingId: string | undefined;
    if (planType === "combo") {
      const { data: latestPalm } = await supabase
        .from("palm_readings")
        .select("id")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestPalm?.id) {
        toast.error(t("payments.messages.comboNeedsBoth"));
        return;
      }
      readingId = latestPalm.id;
    }

    const result = await startPayment({
      planType,
      readingId,
      horoscopeRequestId: report.id,
      prefill: { name: report.full_name, email: session.user.email },
    });

    if (result.ok) {
      await refreshUnlocks();
      const horoscopeUnlocked = Boolean(result.unlocks?.horoscope || result.unlocks?.combo);
      if (horoscopeUnlocked) {
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
  };

  const handleDownloadPdf = useCallback(() => {
    if (!report) return;
    if (!session?.user.id) {
      toast.error(t("payments.messages.authRequired"));
      return;
    }
    void (async () => {
      const { downloadReportPdf } = await import("@/lib/pdf");
      const pdfSections = [
        { heading: t("astrology.summary"), body: report.free_summary },
        ...interpretationCards.map((card) => ({ heading: card.title, body: card.body ?? "" })),
        { heading: t("astrology.fullReport"), body: report.full_report },
      ];
      downloadReportPdf({
        title: t("astrology.title"),
        subtitle: `${report.full_name} • ${report.zodiac_sign} / ${report.moon_sign} / ${report.rising_sign}`,
        fileName: `kundali-report-${report.full_name}-${report.id.slice(0, 8)}`,
        sections: pdfSections,
      });
    })();
  }, [interpretationCards, report, t]);

  if (loadingSession) {
    return (
      <main className="container py-16">
        <CosmicLoader variant="fullPage" size="large" label={t("common.loading.astrology")} />
      </main>
    );
  }

  return (
    <>
      <Helmet>
        <title>Birth Chart Astrology & Horoscope Report | AstraPalm</title>
        <meta
          name="description"
          content="Enter your birth details to generate a full astrology birth chart with zodiac, moon and rising signs plus premium horoscope interpretation."
        />
        <meta property="og:title" content="Birth Chart Astrology & Horoscope Report | AstraPalm" />
        <meta
          property="og:description"
          content="Create and save your personal birth chart, then unlock deeper horoscope insights for love, career, finances and yearly outlook."
        />
        <meta property="og:url" content="https://astrapalm.com/kundali" />
      </Helmet>

      <main className="min-h-screen pb-16">
        <section className="starlight-field border-b border-border/70">
          <div className="container py-12">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-3">
                <p className="inline-flex rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs uppercase tracking-[0.24em] text-primary">
                  {t("astrology.badge")}
                </p>
                <h1 className="text-5xl font-semibold leading-[1.05] md:text-6xl">{t("astrology.title")}</h1>
                <p className="max-w-2xl text-base text-muted-foreground md:text-lg">{t("astrology.subtitle")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="mystic">
                  <Link to="/horoscope">{t("common.actions.viewDailyHoroscope")}</Link>
                </Button>
                <Button asChild variant="mystic">
                  <Link to="/palm">{t("common.actions.backToPalmReading")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="container space-y-8 py-10">
          <>
            <section className="mystic-glass space-y-5 rounded-xl p-6">
              <div className="space-y-2">
                <p className="inline-flex rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
                  {t("astrology.birthBadge")}
                </p>
                <h2 className="text-3xl font-semibold">{t("astrology.birthTitle")}</h2>
              </div>

              <form onSubmit={submitBirthChart} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full-name">{t("astrology.fullName")}</Label>
                    <Input id="full-name" className="focus-mystic" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("astrology.fullNamePlaceholder")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="place-of-birth">{t("astrology.placeOfBirth")}</Label>
                    <Input id="place-of-birth" className="focus-mystic" value={placeOfBirth} onChange={(e) => setPlaceOfBirth(e.target.value)} placeholder={t("astrology.placeOfBirthPlaceholder")} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="dob">{t("astrology.dateOfBirth")}</Label>
                    <Input id="dob" type="date" className="focus-mystic" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tob">{t("astrology.timeOfBirth")}</Label>
                    <Input id="tob" type="time" className="focus-mystic" value={timeOfBirth} onChange={(e) => setTimeOfBirth(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">{t("astrology.gender")}</Label>
                    <Input id="gender" className="focus-mystic" value={gender} onChange={(e) => setGender(e.target.value)} placeholder={t("astrology.genderPlaceholder")} />
                  </div>
                </div>

                <Button type="submit" variant="hero" className="w-full gap-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <CosmicLoader size="small" variant="button" className="scale-[0.62]" />
                      {t("common.loading.generatingReport")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      {t("common.actions.createBirthChart")}
                    </>
                  )}
                </Button>
              </form>
            </section>

            <BirthChartEnginePanel
              dateOfBirth={dateOfBirth}
              timeOfBirth={timeOfBirth}
              placeOfBirth={placeOfBirth}
              timeZone={birthTimeZone}
              onTimeZoneChange={setBirthTimeZone}
              report={
                report
                  ? {
                      zodiac_sign: report.zodiac_sign,
                      moon_sign: report.moon_sign,
                      rising_sign: report.rising_sign,
                    }
                  : null
              }
            />

            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="mystic-glass space-y-4 rounded-xl p-6">
                <div className="flex items-center gap-2 text-primary">
                  <Sun className="h-5 w-5" aria-hidden="true" />
                  <h2 className="text-2xl font-semibold">{t("astrology.latestChart")}</h2>
                </div>

                {report ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-3">
                      <article className="rounded-lg border border-border/70 bg-background/30 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("astrology.zodiac")}</p>
                        <p className="text-lg font-semibold">{report.zodiac_sign}</p>
                      </article>
                      <article className="rounded-lg border border-border/70 bg-background/30 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("astrology.moon")}</p>
                        <p className="text-lg font-semibold">{report.moon_sign}</p>
                      </article>
                      <article className="rounded-lg border border-border/70 bg-background/30 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("astrology.rising")}</p>
                        <p className="text-lg font-semibold">{report.rising_sign}</p>
                      </article>
                    </div>

                    <article className="space-y-2 rounded-lg border border-border/70 bg-background/30 p-4">
                      <h3 className="text-xl font-semibold">{t("astrology.summary")}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{report.free_summary}</p>
                    </article>

                    {isCurrentReportUnlocked || !session?.user.id ? (
                      <>
                        <div className="flex justify-end">
                          <Button type="button" variant="mystic" size="sm" className="gap-2" onClick={handleDownloadPdf}>
                            <Download className="h-4 w-4" aria-hidden="true" />
                            {t("common.actions.downloadPdf")}
                          </Button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          {interpretationCards.map((card) => (
                            <article key={card.title} className="space-y-2 rounded-lg border border-border/70 bg-background/30 p-4">
                              <h3 className="text-lg font-semibold">{card.title}</h3>
                              <p className="text-sm leading-relaxed text-muted-foreground">{card.body}</p>
                            </article>
                          ))}
                        </div>
                        <article className="space-y-2 rounded-lg border border-border/70 bg-background/30 p-4">
                          <h3 className="text-lg font-semibold">{t("astrology.fullReport")}</h3>
                          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{report.full_report}</p>
                        </article>
                        {!session?.user.id && (
                          <p className="text-xs text-muted-foreground">
                            Sign in to save this report to your account and download as PDF.
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <UnlockPlansCard context="horoscope" activePlan={activePlan} stage={stage} onPay={handleUnlock} />
                        <div className="grid gap-3 md:grid-cols-2">
                          {lockedSections.map((section) => (
                            <article key={section} className="relative overflow-hidden rounded-lg border border-border/70 bg-background/20 p-4">
                              <div className="pointer-events-none absolute inset-0 bg-background/60 backdrop-blur-sm" />
                              <div className="relative space-y-2">
                                <h3 className="text-base font-semibold text-foreground/80">{section}</h3>
                                <p className="text-sm text-muted-foreground">{t("payments.lockedNote")}</p>
                              </div>
                            </article>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("astrology.empty")}</p>
                )}
              </div>

              <section className="mystic-glass space-y-4 rounded-xl p-6">
                <div className="flex items-center gap-2 text-primary">
                  <CalendarDays className="h-5 w-5" aria-hidden="true" />
                  <h2 className="text-2xl font-semibold">{t("astrology.savedReports")}</h2>
                </div>
                <div className="space-y-3">
                  {!session?.user.id ? (
                    <p className="text-sm text-muted-foreground">Sign in to see your saved reports.</p>
                  ) : history.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("astrology.noSaved")}</p>
                  ) : (
                    history.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full rounded-lg border border-border/70 bg-background/30 p-3 text-left"
                        onClick={() => setReport(item)}
                      >
                        <p className="text-sm font-semibold">
                          {item.zodiac_sign} • {item.moon_sign} • {item.rising_sign}
                        </p>
                        <p className="text-xs text-primary">{item.is_unlocked || unlocks.horoscopeUnlocked ? t("payments.unlocked") : t("payments.locked")}</p>
                        <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                      </button>
                    ))
                  )}
                </div>
              </section>
            </section>
          </>
        </div>
      </main>
    </>
  );
};

export default Kundali;

