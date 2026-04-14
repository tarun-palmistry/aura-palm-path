import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { CalendarDays, Stars } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CosmicLoader } from "@/components/loaders/CosmicLoader";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRazorpayPayment } from "@/hooks/useRazorpayPayment";
import { AuthPanel } from "@/components/AuthPanel";

type DailyHoroscopeRow = {
  id: string;
  zodiac_sign: string;
  horoscope_date: string;
  today_prediction: string;
  lucky_number: string;
  lucky_color: string;
  advice: string;
  period?: "today" | "weekly" | "monthly" | "yearly";
};

type WhatsAppSub = {
  id: string;
  phone_e164: string;
  zodiac_sign: string;
  period: "today" | "weekly" | "monthly" | "yearly";
  time_zone: string;
  send_hour_local: number;
  weekly_day: number;
  monthly_day: number;
  yearly_month: number;
  yearly_day: number;
  active: boolean;
};

const Horoscope = () => {
  const { language, t, tm } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isDailyLoading, setIsDailyLoading] = useState(false);
  const [dailyHistory, setDailyHistory] = useState<DailyHoroscopeRow[]>([]);
  const [dailyResult, setDailyResult] = useState<DailyHoroscopeRow | null>(null);
  const [dailySign, setDailySign] = useState("Aries");
  const [period, setPeriod] = useState<"today" | "weekly" | "monthly" | "yearly">("today");

  const [waLoading, setWaLoading] = useState(false);
  const [waSub, setWaSub] = useState<WhatsAppSub | null>(null);
  const [waPhone, setWaPhone] = useState("");
  const [waTz, setWaTz] = useState("Asia/Kolkata");
  const [waHour, setWaHour] = useState(9);
  const [waWeeklyDay, setWaWeeklyDay] = useState(1);
  const [waMonthlyDay, setWaMonthlyDay] = useState(1);
  const [waYearlyMonth, setWaYearlyMonth] = useState(1);
  const [waYearlyDay, setWaYearlyDay] = useState(1);
  const [waEntLoading, setWaEntLoading] = useState(false);
  const [waActiveUntil, setWaActiveUntil] = useState<string | null>(null);

  const zodiacSigns = tm<Array<{ value: string; label: string }>>("astrology.zodiacOptions");
  const { startPayment, isProcessing: payProcessing } = useRazorpayPayment();

  const loadHistory = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from("daily_horoscopes").select("*").eq("user_id", userId).order("horoscope_date", { ascending: false }).limit(10);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDailyHistory((data ?? []) as DailyHoroscopeRow[]);
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
    // If a stale token is stored (common after Supabase project migrations),
    // Supabase will return "Invalid JWT". Force sign-out so the user can re-login.
    if (!session?.access_token) return;
    void (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error?.message?.toLowerCase().includes("invalid jwt") || !data.user) {
          await supabase.auth.signOut();
          setSession(null);
          toast.error("Session expired. Please sign in again.");
        }
      } catch {
        // ignore
      }
    })();
  }, [session?.access_token]);

  const loadWhatsAppSub = useCallback(
    async (userId: string, p: "today" | "weekly" | "monthly" | "yearly") => {
      const { data, error } = await supabase
        .from("whatsapp_horoscope_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("period", p)
        .maybeSingle();
      if (error) {
        toast.error(error.message);
        return;
      }
      const row = (data as WhatsAppSub | null) ?? null;
      setWaSub(row);
      if (row) {
        setWaPhone(row.phone_e164);
        setWaTz(row.time_zone);
        setWaHour(row.send_hour_local);
        setWaWeeklyDay(row.weekly_day);
        setWaMonthlyDay(row.monthly_day);
        setWaYearlyMonth(row.yearly_month);
        setWaYearlyDay(row.yearly_day);
      }
    },
    [],
  );

  useEffect(() => {
    if (!session?.user.id) return;
    void loadWhatsAppSub(session.user.id, period);
  }, [session?.user.id, period, loadWhatsAppSub]);

  const refreshWhatsAppEntitlement = useCallback(async (userId: string) => {
    setWaEntLoading(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_entitlements")
        .select("active, expires_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      const expiresAt = data?.expires_at ? String(data.expires_at) : null;
      const active = Boolean(data?.active) && !!expiresAt && new Date(expiresAt).getTime() > Date.now();
      setWaActiveUntil(active ? expiresAt : null);
    } catch {
      setWaActiveUntil(null);
    } finally {
      setWaEntLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session?.user.id) return;
    void refreshWhatsAppEntitlement(session.user.id);
  }, [session?.user.id, refreshWhatsAppEntitlement]);

  const getDailyHoroscope = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDailyLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-daily-horoscope", {
        body: { zodiacSign: dailySign, period, language },
      });

      if (error) {
        let serverError = "";
        if (import.meta.env.DEV) {
          try {
            const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-daily-horoscope`;
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            const res = await fetch(fnUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ""),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ zodiacSign: dailySign, period, language }),
            });
            serverError = await res.text();
          } catch {
            // ignore debug fetch failure
          }
        }
        throw new Error(serverError || error.message);
      }
      if (data?.error) throw new Error(data.error);

      const result = data?.horoscope as DailyHoroscopeRow | undefined;
      if (!result) throw new Error(t("astrology.toasts.noHoroscope"));

      setDailyResult(result);
      if (session?.user.id) await loadHistory(session.user.id);
      toast.success(t("astrology.toasts.dailyReady"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("astrology.toasts.dailyFailed");
      toast.error(message);
    } finally {
      setIsDailyLoading(false);
    }
  };

  const saveWhatsAppSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user.id) {
      toast.error("Sign in required.");
      return;
    }
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error?.message?.toLowerCase().includes("invalid jwt") || !data.user) {
        await supabase.auth.signOut();
        toast.error("Session expired. Please sign in again.");
        return;
      }
    } catch {
      // ignore
    }
    if (!waActiveUntil) {
      toast.error("Please subscribe (₹99/month) to enable WhatsApp delivery.");
      return;
    }
    const phone = waPhone.trim();
    if (!phone.startsWith("+") || phone.length < 8) {
      toast.error("Enter phone in E.164 format, e.g. +919999999999");
      return;
    }

    setWaLoading(true);
    try {
      const payload = {
        user_id: session.user.id,
        phone_e164: phone,
        zodiac_sign: dailySign,
        period,
        time_zone: waTz,
        send_hour_local: waHour,
        weekly_day: waWeeklyDay,
        monthly_day: waMonthlyDay,
        yearly_month: waYearlyMonth,
        yearly_day: waYearlyDay,
        active: true,
        consented_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("whatsapp_horoscope_subscriptions")
        .upsert(payload, { onConflict: "user_id,period" })
        .select("*")
        .single();
      if (error) throw error;
      setWaSub(data as WhatsAppSub);
      toast.success("WhatsApp subscription saved.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save subscription.";
      toast.error(msg);
    } finally {
      setWaLoading(false);
    }
  };

  const toggleWhatsAppActive = async () => {
    if (!session?.user.id || !waSub?.id) return;
    if (!waActiveUntil) {
      toast.error("Your subscription expired. Renew to continue WhatsApp delivery.");
      return;
    }
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error?.message?.toLowerCase().includes("invalid jwt") || !data.user) {
        await supabase.auth.signOut();
        toast.error("Session expired. Please sign in again.");
        return;
      }
    } catch {
      // ignore
    }
    setWaLoading(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_horoscope_subscriptions")
        .update({ active: !waSub.active })
        .eq("id", waSub.id)
        .select("*")
        .single();
      if (error) throw error;
      setWaSub(data as WhatsAppSub);
      toast.success(!waSub.active ? "WhatsApp subscription enabled." : "WhatsApp subscription paused.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed.";
      toast.error(msg);
    } finally {
      setWaLoading(false);
    }
  };

  const buyWhatsAppMonthly = async () => {
    if (!session?.user.id) {
      toast.error("Sign in required.");
      return;
    }
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error?.message?.toLowerCase().includes("invalid jwt") || !data.user) {
        await supabase.auth.signOut();
        toast.error("Session expired. Please sign in again.");
        return;
      }
    } catch {
      // ignore
    }
    try {
      const res = await startPayment({ planType: "whatsapp_monthly" });
      if (res.ok) {
        toast.success("Subscription activated.");
        await refreshWhatsAppEntitlement(session.user.id);
      } else if (res.cancelled) {
        toast.error("Payment cancelled.");
      } else {
        toast.error(res.error ?? "Payment failed.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed.");
    }
  };

  const latestHistory = useMemo(() => dailyHistory.slice(0, 6), [dailyHistory]);

  if (loadingSession) {
    return (
      <main className="container min-w-0 py-16">
        <CosmicLoader variant="fullPage" size="large" label={t("common.loading.astrology")} />
      </main>
    );
  }

  return (
    <>
      <Helmet>
        <title>Daily Horoscope Online | AstraPalm</title>
        <meta
          name="description"
          content="Get your daily horoscope online with lucky number, lucky colour and practical advice for your zodiac sign."
        />
        <meta property="og:title" content="Daily Horoscope Online | AstraPalm" />
        <meta
          property="og:description"
          content="Choose your zodiac sign to receive today's horoscope, lucky details and short spiritual guidance."
        />
        <meta property="og:url" content="https://astrapalm.com/horoscope" />
      </Helmet>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col pb-[max(4rem,env(safe-area-inset-bottom,0px))]">
        <section className="starlight-field border-b border-border/70">
          <div className="container py-8 sm:py-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
              <div className="min-w-0 space-y-3">
                <p className="inline-flex rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs uppercase tracking-[0.24em] text-primary">
                  {t("astrology.badge")}
                </p>
                <h1 className="text-3xl font-semibold leading-[1.08] sm:text-4xl md:text-5xl md:leading-[1.05] lg:text-6xl">
                  {t("astrology.dailyTitle")}
                </h1>
                <p className="max-w-2xl text-base text-muted-foreground md:text-lg">{t("homepage.whatsapp.description")}</p>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                <Button asChild variant="mystic" className="w-full sm:w-auto">
                  <Link to="/kundali">{t("common.actions.createBirthChart")}</Link>
                </Button>
                <Button asChild variant="mystic" className="w-full sm:w-auto">
                  <Link to="/kundali-matching">{t("common.actions.matchKundali")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="container min-w-0 space-y-8 py-8 sm:py-10">
          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="mystic-glass space-y-4 rounded-xl p-6">
              <div className="flex items-center gap-2 text-primary">
                <Stars className="h-5 w-5" aria-hidden="true" />
                <h2 className="text-2xl font-semibold">{t("astrology.dailyTitle")}</h2>
              </div>

              <form onSubmit={getDailyHoroscope} className="space-y-3">
                <Label htmlFor="daily-sign">{t("astrology.zodiacSign")}</Label>
                <select
                  id="daily-sign"
                  className="focus-mystic flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={dailySign}
                  onChange={(e) => setDailySign(e.target.value)}
                >
                  {zodiacSigns.map((sign) => (
                    <option key={sign.value} value={sign.value}>
                      {sign.label}
                    </option>
                  ))}
                </select>

                <Label htmlFor="horoscope-period">Horoscope period</Label>
                <select
                  id="horoscope-period"
                  className="focus-mystic flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={period}
                  onChange={(e) =>
                    setPeriod(e.target.value as "today" | "weekly" | "monthly" | "yearly")
                  }
                >
                  <option value="today">Today</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>

                <Button type="submit" variant="hero" className="w-full gap-2" disabled={isDailyLoading}>
                  {isDailyLoading ? (
                    <>
                      <CosmicLoader size="small" variant="button" className="scale-[0.62]" />
                      {t("astrology.todaysGuidance")}
                    </>
                  ) : (
                    t("common.actions.viewDailyHoroscope")
                  )}
                </Button>
              </form>

              {dailyResult && (
                <article className="space-y-3 rounded-lg border border-border/70 bg-background/30 p-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">{dailyResult.today_prediction}</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <p>
                      <span className="text-muted-foreground">{t("astrology.luckyNumber")}: </span>
                      <span className="font-semibold">{dailyResult.lucky_number}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">{t("astrology.luckyColor")}: </span>
                      <span className="font-semibold">{dailyResult.lucky_color}</span>
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("astrology.advice")}: {dailyResult.advice}
                  </p>
                </article>
              )}

              <section className="space-y-3 rounded-lg border border-border/70 bg-background/20 p-4">
                <h3 className="text-base font-semibold">WhatsApp delivery</h3>
                <p className="text-xs text-muted-foreground">
                  Get your horoscope on WhatsApp automatically (daily/weekly/monthly/yearly).
                </p>

                {!session?.user.id ? (
                  <div className="space-y-3">
                    <div className="rounded-md border border-border/60 bg-background/30 p-3">
                      <p className="text-sm font-semibold">Plan: ₹99 / month</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Sign in to subscribe and add your WhatsApp number.
                      </p>
                    </div>
                    <AuthPanel onAuthenticated={() => undefined} />
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Requires Twilio WhatsApp (Sandbox or approved sender). We’ll send at your selected local time.
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-background/30 p-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold">Plan: ₹99 / month</p>
                        <p className="text-xs text-muted-foreground">
                          {waEntLoading
                            ? "Checking subscription…"
                            : waActiveUntil
                              ? `Active until: ${new Date(waActiveUntil).toLocaleString()}`
                              : "Not active"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant={waActiveUntil ? "outline" : "mystic"}
                        disabled={payProcessing}
                        onClick={buyWhatsAppMonthly}
                      >
                        {waActiveUntil ? "Renew" : "Subscribe ₹99/month"}
                      </Button>
                    </div>

                    <form onSubmit={saveWhatsAppSub} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="wa-phone">WhatsApp number (E.164)</Label>
                      <Input
                        id="wa-phone"
                        value={waPhone}
                        onChange={(e) => setWaPhone(e.target.value)}
                        placeholder="+919999999999"
                        inputMode="tel"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="wa-tz">Timezone</Label>
                        <Input id="wa-tz" value={waTz} onChange={(e) => setWaTz(e.target.value)} placeholder="Asia/Kolkata" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="wa-hour">Send hour (0-23)</Label>
                        <Input
                          id="wa-hour"
                          type="number"
                          min={0}
                          max={23}
                          value={waHour}
                          onChange={(e) => setWaHour(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    {period === "weekly" && (
                      <div className="space-y-2">
                        <Label htmlFor="wa-weekday">Weekly day (0=Sun..6=Sat)</Label>
                        <Input
                          id="wa-weekday"
                          type="number"
                          min={0}
                          max={6}
                          value={waWeeklyDay}
                          onChange={(e) => setWaWeeklyDay(Number(e.target.value))}
                        />
                      </div>
                    )}

                    {period === "monthly" && (
                      <div className="space-y-2">
                        <Label htmlFor="wa-monthday">Monthly day (1-28)</Label>
                        <Input
                          id="wa-monthday"
                          type="number"
                          min={1}
                          max={28}
                          value={waMonthlyDay}
                          onChange={(e) => setWaMonthlyDay(Number(e.target.value))}
                        />
                      </div>
                    )}

                    {period === "yearly" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="wa-year-month">Yearly month (1-12)</Label>
                          <Input
                            id="wa-year-month"
                            type="number"
                            min={1}
                            max={12}
                            value={waYearlyMonth}
                            onChange={(e) => setWaYearlyMonth(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="wa-year-day">Yearly day (1-28)</Label>
                          <Input
                            id="wa-year-day"
                            type="number"
                            min={1}
                            max={28}
                            value={waYearlyDay}
                            onChange={(e) => setWaYearlyDay(Number(e.target.value))}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" variant="mystic" disabled={waLoading}>
                        {waLoading ? "Saving..." : waSub ? "Update subscription" : "Subscribe"}
                      </Button>
                      {waSub && (
                        <Button type="button" variant="outline" disabled={waLoading} onClick={toggleWhatsAppActive}>
                          {waSub.active ? "Pause" : "Enable"}
                        </Button>
                      )}
                    </div>
                    </form>
                  </>
                )}
              </section>
            </section>

            <section className="mystic-glass space-y-4 rounded-xl p-6">
              <div className="flex items-center gap-2 text-primary">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
                <h2 className="text-2xl font-semibold">{t("astrology.recentDaily")}</h2>
              </div>

              {!session?.user.id ? (
                <p className="text-sm text-muted-foreground">Sign in to see your saved daily snapshots.</p>
              ) : latestHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("astrology.noDaily")}</p>
              ) : (
                <div className="space-y-3">
                  {latestHistory.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border/70 bg-background/30 p-3 text-xs">
                      <p className="font-semibold">
                        {item.zodiac_sign} • {item.horoscope_date}
                      </p>
                      <p className="text-muted-foreground">{item.advice}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
      </main>
    </>
  );
};

export default Horoscope;

