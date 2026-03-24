import { useEffect, useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { PalmScanner } from "@/components/PalmScanner";
import { ReportViewer } from "@/components/ReportViewer";
import { MarketingHomepage } from "@/components/home/MarketingHomepage";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";
import { useLanguage } from "@/contexts/LanguageContext";

type ReportRow = Tables<"reports">;

const Index = () => {
  const { t } = useLanguage();
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

  const scrollToSection = (targetId: string) => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
  };

  const startPalmFlow = () => {
    scrollToSection(session ? "scan-section" : "auth-section");
  };

  if (loadingSession) {
    return <main className="container py-16">{t("common.loading.oracle")}</main>;
  }

  return (
    <>
      <MarketingHomepage
        conversionSection={
          <div className="container space-y-8">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("common.actions.startReading")}</p>
              <h2 className="text-3xl font-semibold md:text-4xl">{t("homepage.quickLine")}</h2>
              <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                {t("homepage.subtitle")}
              </p>
            </div>

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

                {report && <ReportViewer report={report} />}
              </div>
            )}
          </div>
        }
        isAdmin={isAdmin}
        onSignOut={signOut}
        onStartPalm={startPalmFlow}
        session={session}
      />
    </>
  );
};

export default Index;
