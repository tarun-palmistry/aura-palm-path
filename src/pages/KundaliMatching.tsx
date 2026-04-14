import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Calendar, Clock, Heart, MapPin, ScrollText, Shield, Sparkles, Star, Sun, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { CosmicLoader } from "@/components/loaders/CosmicLoader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthPanel } from "@/components/AuthPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type KootaRow = {
  name: string;
  score: number;
  max_score: number;
  status: "favorable" | "neutral" | "unfavorable";
  description: string;
};

type KundaliReport = {
  total_score: number;
  compatibility_level: "low" | "average" | "good" | "excellent";
  koota_breakdown: KootaRow[];
  relationship_summary: {
    overall_compatibility: string;
    emotional_connection: string;
    communication: string;
    long_term_potential: string;
  };
  strengths: string[];
  challenges: string[];
  advice: string[];
  final_verdict: string;
};

const KundaliMatching = () => {
  const { language, t } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [report, setReport] = useState<KundaliReport | null>(null);

  const [p1Name, setP1Name] = useState("");
  const [p1Dob, setP1Dob] = useState("");
  const [p1Time, setP1Time] = useState("");
  const [p1Place, setP1Place] = useState("");
  const [p2Name, setP2Name] = useState("");
  const [p2Dob, setP2Dob] = useState("");
  const [p2Time, setP2Time] = useState("");
  const [p2Place, setP2Place] = useState("");

  const personSchema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2).max(100),
        dateOfBirth: z.string().min(1),
        timeOfBirth: z.string().min(1),
        placeOfBirth: z.string().trim().min(2).max(150),
      }),
    [],
  );

  const formSchema = useMemo(
    () =>
      z.object({
        person1: personSchema,
        person2: personSchema,
      }),
    [personSchema],
  );

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_e, next) => {
      setSession(next);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const levelLabel = (level: KundaliReport["compatibility_level"]) => {
    const key = `kundaliMatching.levels.${level}` as const;
    return t(key);
  };

  const statusLabel = (s: KootaRow["status"]) => {
    if (s === "favorable") return t("kundaliMatching.statusFavorable");
    if (s === "unfavorable") return t("kundaliMatching.statusUnfavorable");
    return t("kundaliMatching.statusNeutral");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      toast.error(t("kundaliMatching.authRequired"));
      return;
    }

    const parsed = formSchema.safeParse({
      person1: {
        name: p1Name,
        dateOfBirth: p1Dob,
        timeOfBirth: p1Time,
        placeOfBirth: p1Place,
      },
      person2: {
        name: p2Name,
        dateOfBirth: p2Dob,
        timeOfBirth: p2Time,
        placeOfBirth: p2Place,
      },
    });

    if (!parsed.success) {
      toast.error(t("kundaliMatching.validation"));
      return;
    }

    setSubmitting(true);
    setReport(null);

    try {
      const { data, error } = await supabase.functions.invoke("match-kundali", {
        body: {
          person1: {
            name: parsed.data.person1.name,
            dateOfBirth: parsed.data.person1.dateOfBirth,
            timeOfBirth: parsed.data.person1.timeOfBirth,
            placeOfBirth: parsed.data.person1.placeOfBirth,
          },
          person2: {
            name: parsed.data.person2.name,
            dateOfBirth: parsed.data.person2.dateOfBirth,
            timeOfBirth: parsed.data.person2.timeOfBirth,
            placeOfBirth: parsed.data.person2.placeOfBirth,
          },
          language,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const next = data?.report as KundaliReport | undefined;
      if (!next) throw new Error("No report");

      setReport(next);
      toast.success(t("kundaliMatching.toastSuccess"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("kundaliMatching.toastFail");
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSession) {
    return (
      <main className="container min-w-0 py-16">
        <CosmicLoader variant="fullPage" size="large" label={t("common.loading.kundali")} />
      </main>
    );
  }

  const PersonFields = ({
    prefix,
    name,
    setName,
    dob,
    setDob,
    time,
    setTime,
    place,
    setPlace,
    title,
    icon: Icon,
  }: {
    prefix: string;
    name: string;
    setName: (v: string) => void;
    dob: string;
    setDob: (v: string) => void;
    time: string;
    setTime: (v: string) => void;
    place: string;
    setPlace: (v: string) => void;
    title: string;
    icon: typeof Sun;
  }) => (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/40 p-5 shadow-mystic/20 backdrop-blur-sm md:p-6">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
        aria-hidden
      />
      <div className="relative space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Icon className="h-6 w-6" aria-hidden />
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground md:text-2xl">{title}</h2>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-name`} className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5" aria-hidden />
            {t("kundaliMatching.fullName")}
          </Label>
          <Input
            id={`${prefix}-name`}
            className="focus-mystic"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("kundaliMatching.namePlaceholder")}
            autoComplete="name"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-dob`} className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {t("kundaliMatching.dateOfBirth")}
            </Label>
            <Input id={`${prefix}-dob`} type="date" className="focus-mystic" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-time`} className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {t("kundaliMatching.timeOfBirth")}
            </Label>
            <Input id={`${prefix}-time`} type="time" className="focus-mystic" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-place`} className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {t("kundaliMatching.placeOfBirth")}
          </Label>
          <Input
            id={`${prefix}-place`}
            className="focus-mystic"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder={t("kundaliMatching.placePlaceholder")}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Kundali Matching (36 Guna Ashta Koota) | AstraPalm</title>
        <meta
          name="description"
          content="Run Vedic Kundali matching with full 36 guna Ashta Koota analysis, koota breakdown and relationship summary for two birth charts."
        />
        <meta property="og:title" content="Kundali Matching (36 Guna Ashta Koota) | AstraPalm" />
        <meta
          property="og:description"
          content="Enter two sets of birth details to generate a detailed Ashta Koota Kundali match score with strengths, challenges and practical advice."
        />
        <meta property="og:url" content="https://astrapalm.com/kundali-matching" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Kundali Matching (Ashta Koota 36 Guna)",
            provider: {
              "@type": "Organization",
              name: "AstraPalm",
              url: "https://astrapalm.com",
            },
            url: "https://astrapalm.com/kundali-matching",
            description:
              "Vedic Kundali matching using the traditional Ashta Koota framework with 36 guna score and detailed compatibility summary.",
          })}
        </script>
      </Helmet>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col pb-[max(4rem,env(safe-area-inset-bottom,0px))]">
        <section className="starlight-field border-b border-border/70">
          <div className="container py-8 sm:py-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
              <div className="min-w-0 space-y-3">
                <p className="inline-flex rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs uppercase tracking-[0.24em] text-primary">
                  {t("kundaliMatching.badge")}
                </p>
                <h1 className="font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
                  {t("kundaliMatching.title")}
                </h1>
                <p className="max-w-2xl text-base text-muted-foreground md:text-lg">{t("kundaliMatching.subtitle")}</p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                <Button asChild variant="mystic" className="w-full sm:w-auto">
                  <Link to="/kundali">{t("common.actions.backToAstrology")}</Link>
                </Button>
                <Button asChild variant="ghost" className="w-full sm:w-auto">
                  <Link to="/">{t("common.actions.backToHome")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="container min-w-0 space-y-10 py-8 sm:py-10">
          {!session ? (
            <AuthPanel onAuthenticated={() => undefined} />
          ) : (
            <form onSubmit={onSubmit} className="space-y-10">
              <div className="grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
                <PersonFields
                  prefix="p1"
                  name={p1Name}
                  setName={setP1Name}
                  dob={p1Dob}
                  setDob={setP1Dob}
                  time={p1Time}
                  setTime={setP1Time}
                  place={p1Place}
                  setPlace={setP1Place}
                  title={t("kundaliMatching.person1")}
                  icon={Sun}
                />

                <div className="flex flex-row items-center justify-center gap-2 lg:flex-col lg:py-8">
                  <div className="hidden h-12 w-px bg-gradient-to-b from-transparent via-primary/50 to-transparent lg:block" aria-hidden />
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-primary shadow-mystic">
                    <Heart className="h-5 w-5 fill-primary/30" aria-hidden />
                  </span>
                  <div className="hidden h-12 w-px bg-gradient-to-b from-transparent via-primary/50 to-transparent lg:block" aria-hidden />
                </div>

                <PersonFields
                  prefix="p2"
                  name={p2Name}
                  setName={setP2Name}
                  dob={p2Dob}
                  setDob={setP2Dob}
                  time={p2Time}
                  setTime={setP2Time}
                  place={p2Place}
                  setPlace={setP2Place}
                  title={t("kundaliMatching.person2")}
                  icon={Star}
                />
              </div>

              <div className="flex flex-col items-center gap-3">
                <Button type="submit" variant="hero" size="lg" className="min-w-[220px] gap-2 px-8" disabled={submitting}>
                  {submitting ? (
                    <>
                      <CosmicLoader size="small" variant="button" className="scale-[0.62]" />
                      {t("kundaliMatching.matching")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" aria-hidden />
                      {t("common.actions.matchKundali")}
                    </>
                  )}
                </Button>
                <p className="max-w-md text-center text-xs text-muted-foreground">{t("kundaliMatching.disclaimer")}</p>
              </div>
            </form>
          )}

          <section className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Star,
                title: t("kundaliMatching.featureAshtaTitle"),
                body: t("kundaliMatching.featureAshtaBody"),
              },
              {
                icon: Shield,
                title: t("kundaliMatching.featureManglikTitle"),
                body: t("kundaliMatching.featureManglikBody"),
              },
              {
                icon: ScrollText,
                title: t("kundaliMatching.featureKarmaTitle"),
                body: t("kundaliMatching.featureKarmaBody"),
              },
            ].map((card) => (
              <article key={card.title} className="mystic-glass rounded-xl border border-border/60 p-5">
                <card.icon className="mb-3 h-8 w-8 text-primary" aria-hidden />
                <h3 className="font-display text-lg font-semibold text-foreground">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
              </article>
            ))}
          </section>

          {report && (
            <section className="mystic-glass space-y-8 rounded-2xl border border-primary/25 p-6 md:p-8">
            <div className="flex flex-col gap-6 border-b border-border/60 pb-8 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("kundaliMatching.resultsTitle")}</p>
                <p className="mt-2 font-display text-4xl font-bold text-foreground md:text-5xl">
                  {report.total_score}
                  <span className="text-lg font-medium text-muted-foreground"> / 36</span>
                </p>
                <p className="text-sm text-muted-foreground">{t("kundaliMatching.gunaTotal")}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("kundaliMatching.level")}</p>
                <p
                  className={cn(
                    "mt-1 font-semibold capitalize",
                    report.compatibility_level === "excellent" && "text-primary",
                    report.compatibility_level === "good" && "text-primary/90",
                    report.compatibility_level === "average" && "text-muted-foreground",
                    report.compatibility_level === "low" && "text-destructive/90",
                  )}
                >
                  {levelLabel(report.compatibility_level)}
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-4 font-display text-xl font-semibold">{t("kundaliMatching.kootaTable")}</h3>
              <div className="space-y-3">
                {report.koota_breakdown.map((k) => (
                  <div
                    key={k.name}
                    className="rounded-lg border border-border/50 bg-background/25 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{k.name}</span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">
                          {k.score}/{k.max_score}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            k.status === "favorable" && "bg-primary/20 text-primary",
                            k.status === "neutral" && "bg-muted text-muted-foreground",
                            k.status === "unfavorable" && "bg-destructive/15 text-destructive",
                          )}
                        >
                          {statusLabel(k.status)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{k.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 font-display text-xl font-semibold">{t("kundaliMatching.summaryTitle")}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { label: t("kundaliMatching.overall"), text: report.relationship_summary.overall_compatibility },
                  { label: t("kundaliMatching.emotional"), text: report.relationship_summary.emotional_connection },
                  { label: t("kundaliMatching.communication"), text: report.relationship_summary.communication },
                  { label: t("kundaliMatching.longTerm"), text: report.relationship_summary.long_term_potential },
                ].map((row) => (
                  <article key={row.label} className="rounded-lg border border-border/50 bg-background/20 p-4">
                    <p className="text-xs uppercase tracking-wider text-primary">{row.label}</p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/95">{row.text}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <h4 className="mb-2 font-semibold text-primary">{t("kundaliMatching.strengths")}</h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {report.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-2 font-semibold text-destructive/90">{t("kundaliMatching.challenges")}</h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {report.challenges.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-2 font-semibold text-foreground">{t("kundaliMatching.advice")}</h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {report.advice.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>

            <article className="rounded-xl border border-primary/30 bg-primary/5 p-5">
              <h4 className="font-display text-lg font-semibold text-primary">{t("kundaliMatching.verdict")}</h4>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/95">{report.final_verdict}</p>
            </article>
            </section>
          )}
        </div>
      </main>
    </>
  );
};

export default KundaliMatching;
