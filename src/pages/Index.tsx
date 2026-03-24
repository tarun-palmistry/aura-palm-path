import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ShieldCheck, Stars, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthPanel } from "@/components/AuthPanel";
import { PalmScanner } from "@/components/PalmScanner";
import { ReportViewer } from "@/components/ReportViewer";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

type ReportRow = Tables<"reports">;

const highlights = [
  {
    title: "Structured first",
    detail: "Palm features are extracted into structured data before interpretation.",
    icon: ScanLine,
  },
  {
    title: "Personalized reading",
    detail: "Love, career, strengths, and future guidance generated from your actual scan.",
    icon: Sparkles,
  },
  {
    title: "Private by default",
    detail: "Your palm images and reports are secured behind your account.",
    icon: ShieldCheck,
  },
];

const scanChecklist = [
  "Use bright, even lighting (no harsh shadows).",
  "Keep the full palm centered in frame.",
  "Avoid blur and motion while capturing.",
  "Choose your hand metadata correctly for better results.",
];

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [report, setReport] = useState<ReportRow | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
    const fetchAdminStatus = async () => {
      if (!session?.user.id) {
        setIsAdmin(false);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(Boolean(data));
    };

    fetchAdminStatus();
  }, [session?.user.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setReport(null);
  };

  if (loadingSession) {
    return <main className="container py-16">Loading oracle chamber...</main>;
  }

  return (
    <main className="min-h-screen pb-16">
      <section className="starlight-field border-b border-border/70">
        <div className="container py-14">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div className="space-y-5">
              <p className="inline-flex rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs uppercase tracking-[0.24em] text-primary">
                AI Palmistry Platform
              </p>
              <h1 className="max-w-2xl text-5xl font-semibold leading-[1.05] md:text-6xl">Decode your destiny with a full AI palm reading</h1>
              <p className="max-w-xl text-base text-muted-foreground md:text-lg">
                Structured palm feature extraction first, mystical interpretation second—capture your palm and get your complete reading in minutes.
              </p>
              <div className="flex flex-wrap gap-3">
                {!session ? (
                  <Button variant="hero" size="lg" onClick={() => document.getElementById("auth-section")?.scrollIntoView({ behavior: "smooth" })}>
                    Scan My Palm
                  </Button>
                ) : (
                  <Button variant="hero" size="lg" onClick={() => document.getElementById("scan-section")?.scrollIntoView({ behavior: "smooth" })}>
                    Start New Scan
                  </Button>
                )}
                {session && (
                  <Button variant="mystic" onClick={signOut}>
                    Sign out
                  </Button>
                )}
                {isAdmin && (
                  <Button asChild variant="mystic">
                    <Link to="/admin">Admin Panel</Link>
                  </Button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {highlights.map((item) => (
                  <article key={item.title} className="mystic-glass space-y-2 rounded-xl p-4">
                    <item.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h2 className="text-lg font-semibold">{item.title}</h2>
                    <p className="text-sm text-muted-foreground">{item.detail}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mystic-glass animate-nebula-drift space-y-5 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-primary">
                <Stars className="h-5 w-5" aria-hidden="true" />
                <h2 className="text-2xl font-semibold">Before you scan</h2>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {scanChecklist.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="rounded-xl border border-border/70 bg-background/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Instant flow</p>
                <p className="mt-2 text-sm text-muted-foreground">Scan → Analyze → Read your full report for free.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container space-y-8 py-10" id="auth-section">
        {!session && (
          <section className="grid gap-4 md:grid-cols-3">
            <article className="mystic-glass rounded-xl p-5">
              <h2 className="text-2xl font-semibold">Love & relationships</h2>
              <p className="mt-2 text-sm text-muted-foreground">Understand emotional patterns and relationship dynamics from line analysis.</p>
            </article>
            <article className="mystic-glass rounded-xl p-5">
              <h2 className="text-2xl font-semibold">Career signals</h2>
              <p className="mt-2 text-sm text-muted-foreground">Get directional insights around strengths, work style, and growth potential.</p>
            </article>
            <article className="mystic-glass rounded-xl p-5">
              <h2 className="text-2xl font-semibold">Future guidance</h2>
              <p className="mt-2 text-sm text-muted-foreground">Receive practical next-step guidance generated from your extracted palm features.</p>
            </article>
          </section>
        )}

        {!session ? (
          <AuthPanel onAuthenticated={() => undefined} />
        ) : (
          <div className="space-y-8" id="scan-section">
            <PalmScanner
              userId={session.user.id}
              onReportReady={(_nextReadingId, nextReport) => {
                setReport(nextReport);
              }}
            />

            {report && (
              <ReportViewer
                report={report}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default Index;
