import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AuthPanel } from "@/components/AuthPanel";
import { PalmScanner } from "@/components/PalmScanner";
import { ReportViewer } from "@/components/ReportViewer";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

type ReportRow = Tables<"reports">;

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
    <main className="min-h-screen">
      <section className="starlight-field border-b border-border/70">
        <div className="container py-12">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div className="space-y-5">
              <p className="inline-flex rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs uppercase tracking-[0.24em] text-primary">
                AI Palmistry Platform
              </p>
              <h1 className="max-w-2xl text-5xl font-semibold leading-[1.05] md:text-6xl">Decode your destiny through AI-powered palm reading</h1>
              <p className="max-w-xl text-base text-muted-foreground md:text-lg">
                Structured palm feature extraction first, mystical interpretation second. Upload or scan your palm and unlock your full reading.
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
            </div>

            <div className="mystic-glass animate-nebula-drift rounded-2xl p-6">
              <h2 className="text-2xl font-semibold">How it works</h2>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li>1) Capture or upload a clear palm image.</li>
                <li>2) AI extracts palm shape, lines, and mounts into JSON.</li>
                <li>3) Report is generated from extracted features only.</li>
                <li>4) Get both preview and full reading instantly for free.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="container space-y-8 py-10" id="auth-section">
        {!session ? (
          <AuthPanel onAuthenticated={() => undefined} />
        ) : (
          <div className="space-y-8" id="scan-section">
            <PalmScanner
              userId={session.user.id}
              onReportReady={(nextReadingId, nextReport) => {
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
