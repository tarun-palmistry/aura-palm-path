import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Stars, Sun, Sparkles, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthPanel } from "@/components/AuthPanel";

const zodiacSigns = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

const birthChartSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(100, "Name is too long"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  timeOfBirth: z.string().min(1, "Time of birth is required"),
  placeOfBirth: z.string().trim().min(2, "Place of birth is required").max(150, "Place is too long"),
  gender: z.string().trim().max(40, "Gender should be shorter").optional(),
});

type HoroscopeRequestRow = {
  id: string;
  zodiac_sign: string;
  moon_sign: string;
  rising_sign: string;
  free_summary: string;
  full_report: string;
  interpretation: Record<string, string>;
  created_at: string;
};

type DailyHoroscopeRow = {
  id: string;
  zodiac_sign: string;
  horoscope_date: string;
  today_prediction: string;
  lucky_number: string;
  lucky_color: string;
  advice: string;
};

const Astrology = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDailyLoading, setIsDailyLoading] = useState(false);
  const [report, setReport] = useState<HoroscopeRequestRow | null>(null);
  const [history, setHistory] = useState<HoroscopeRequestRow[]>([]);
  const [dailyHistory, setDailyHistory] = useState<DailyHoroscopeRow[]>([]);
  const [dailyResult, setDailyResult] = useState<DailyHoroscopeRow | null>(null);

  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [timeOfBirth, setTimeOfBirth] = useState("");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [dailySign, setDailySign] = useState("Aries");

  const db = supabase as any;

  const interpretationCards = useMemo(() => {
    if (!report?.interpretation) return [];
    const value = report.interpretation;
    return [
      { title: "Personality", body: value.personality_analysis },
      { title: "Love life", body: value.love_life_insights },
      { title: "Career path", body: value.career_path },
      { title: "Financial outlook", body: value.financial_outlook },
      { title: "Health guidance", body: value.health_guidance },
      { title: "Yearly prediction", body: value.yearly_prediction },
    ].filter((item) => item.body);
  }, [report]);

  const loadHistory = async (userId: string) => {
    const [reportsResp, dailyResp] = await Promise.all([
      db.from("horoscope_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(6),
      db.from("daily_horoscopes").select("*").eq("user_id", userId).order("horoscope_date", { ascending: false }).limit(6),
    ]);

    if (reportsResp.error) {
      toast.error(reportsResp.error.message);
    } else {
      setHistory((reportsResp.data ?? []) as HoroscopeRequestRow[]);
    }

    if (dailyResp.error) {
      toast.error(dailyResp.error.message);
    } else {
      setDailyHistory((dailyResp.data ?? []) as DailyHoroscopeRow[]);
    }
  };

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user.id) {
        void loadHistory(nextSession.user.id);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user.id) {
        void loadHistory(data.session.user.id);
      }
      setLoadingSession(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const submitBirthChart = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = birthChartSchema.safeParse({ fullName, dateOfBirth, timeOfBirth, placeOfBirth, gender });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your form details.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-astrology-report", {
        body: parsed.data,
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const nextReport = data?.report as HoroscopeRequestRow | undefined;
      if (!nextReport) throw new Error("No report returned.");

      setReport(nextReport);
      setDailySign(nextReport.zodiac_sign || "Aries");

      if (session?.user.id) {
        await loadHistory(session.user.id);
      }

      toast.success("Birth chart generated and saved to your account.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not generate astrology report.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDailyHoroscope = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDailyLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-daily-horoscope", {
        body: { zodiacSign: dailySign },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const result = data?.horoscope as DailyHoroscopeRow | undefined;
      if (!result) throw new Error("No horoscope returned.");

      setDailyResult(result);
      if (session?.user.id) {
        await loadHistory(session.user.id);
      }
      toast.success("Daily horoscope ready.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not fetch daily horoscope.";
      toast.error(message);
    } finally {
      setIsDailyLoading(false);
    }
  };

  if (loadingSession) {
    return <main className="container py-16">Opening astrology chamber...</main>;
  }

  return (
    <main className="min-h-screen pb-16">
      <section className="starlight-field border-b border-border/70">
        <div className="container py-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-3">
              <p className="inline-flex rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs uppercase tracking-[0.24em] text-primary">
                Horoscope & Astrology
              </p>
              <h1 className="text-5xl font-semibold leading-[1.05] md:text-6xl">Birth Chart & Daily Guidance</h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                Structured astrology signals first, interpretation second. Every report is saved securely to your account.
              </p>
            </div>
            <Button asChild variant="mystic">
              <Link to="/">← Back to Palm Reading</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="container space-y-8 py-10">
        {!session ? (
          <AuthPanel onAuthenticated={() => undefined} />
        ) : (
          <>
            <section className="mystic-glass space-y-5 rounded-xl p-6">
              <div className="space-y-2">
                <p className="inline-flex rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
                  Birth chart generator
                </p>
                <h2 className="text-3xl font-semibold">Create your astrology profile</h2>
              </div>

              <form onSubmit={submitBirthChart} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full Name</Label>
                    <Input id="full-name" className="focus-mystic" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="place-of-birth">Place of Birth</Label>
                    <Input id="place-of-birth" className="focus-mystic" value={placeOfBirth} onChange={(e) => setPlaceOfBirth(e.target.value)} placeholder="City, Country" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input id="dob" type="date" className="focus-mystic" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tob">Time of Birth</Label>
                    <Input id="tob" type="time" className="focus-mystic" value={timeOfBirth} onChange={(e) => setTimeOfBirth(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender (optional)</Label>
                    <Input id="gender" className="focus-mystic" value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Optional" />
                  </div>
                </div>

                <Button type="submit" variant="hero" className="w-full gap-2" disabled={isSubmitting}>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  {isSubmitting ? "Generating astrology report..." : "Generate Birth Chart"}
                </Button>
              </form>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="mystic-glass space-y-4 rounded-xl p-6">
                <div className="flex items-center gap-2 text-primary">
                  <Sun className="h-5 w-5" aria-hidden="true" />
                  <h2 className="text-2xl font-semibold">Latest Birth Chart</h2>
                </div>

                {report ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-3">
                      <article className="rounded-lg border border-border/70 bg-background/30 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Zodiac</p>
                        <p className="text-lg font-semibold">{report.zodiac_sign}</p>
                      </article>
                      <article className="rounded-lg border border-border/70 bg-background/30 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Moon</p>
                        <p className="text-lg font-semibold">{report.moon_sign}</p>
                      </article>
                      <article className="rounded-lg border border-border/70 bg-background/30 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Rising</p>
                        <p className="text-lg font-semibold">{report.rising_sign}</p>
                      </article>
                    </div>

                    <article className="space-y-2 rounded-lg border border-border/70 bg-background/30 p-4">
                      <h3 className="text-xl font-semibold">Summary</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{report.free_summary}</p>
                    </article>

                    <div className="grid gap-3 md:grid-cols-2">
                      {interpretationCards.map((card) => (
                        <article key={card.title} className="space-y-2 rounded-lg border border-border/70 bg-background/30 p-4">
                          <h3 className="text-lg font-semibold">{card.title}</h3>
                          <p className="text-sm leading-relaxed text-muted-foreground">{card.body}</p>
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Generate a birth chart to view your astrology interpretation.</p>
                )}
              </div>

              <div className="space-y-6">
                <section className="mystic-glass space-y-4 rounded-xl p-6">
                  <div className="flex items-center gap-2 text-primary">
                    <Stars className="h-5 w-5" aria-hidden="true" />
                    <h2 className="text-2xl font-semibold">Daily Horoscope</h2>
                  </div>

                  <form onSubmit={getDailyHoroscope} className="space-y-3">
                    <Label htmlFor="daily-sign">Zodiac sign</Label>
                    <select
                      id="daily-sign"
                      className="focus-mystic flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={dailySign}
                      onChange={(e) => setDailySign(e.target.value)}
                    >
                      {zodiacSigns.map((sign) => (
                        <option key={sign} value={sign}>
                          {sign}
                        </option>
                      ))}
                    </select>

                    <Button type="submit" variant="hero" className="w-full" disabled={isDailyLoading}>
                      {isDailyLoading ? "Fetching today's guidance..." : "Get Daily Horoscope"}
                    </Button>
                  </form>

                  {dailyResult && (
                    <article className="space-y-3 rounded-lg border border-border/70 bg-background/30 p-4">
                      <p className="text-sm leading-relaxed text-muted-foreground">{dailyResult.today_prediction}</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <p>
                          <span className="text-muted-foreground">Lucky number: </span>
                          <span className="font-semibold">{dailyResult.lucky_number}</span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Lucky color: </span>
                          <span className="font-semibold">{dailyResult.lucky_color}</span>
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">Advice: {dailyResult.advice}</p>
                    </article>
                  )}
                </section>

                <section className="mystic-glass space-y-4 rounded-xl p-6">
                  <div className="flex items-center gap-2 text-primary">
                    <CalendarDays className="h-5 w-5" aria-hidden="true" />
                    <h2 className="text-2xl font-semibold">Saved Reports</h2>
                  </div>
                  <div className="space-y-3">
                    {history.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No saved birth chart reports yet.</p>
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
                          <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Recent daily horoscopes</h3>
                    {dailyHistory.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No daily snapshots yet.</p>
                    ) : (
                      dailyHistory.map((item) => (
                        <div key={item.id} className="rounded-lg border border-border/70 bg-background/30 p-3 text-xs">
                          <p className="font-semibold">{item.zodiac_sign} • {item.horoscope_date}</p>
                          <p className="text-muted-foreground">{item.advice}</p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
};

export default Astrology;