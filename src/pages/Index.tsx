import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { MarketingHomepage } from "@/components/home/MarketingHomepage";
import { CosmicLoader } from "@/components/loaders/CosmicLoader";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { t } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
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

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const conversionSection = useMemo(
    () => (
      <div className="container min-w-0 space-y-8">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("common.actions.startReading")}</p>
          <h2 className="text-3xl font-semibold md:text-4xl">{t("homepage.quickLine")}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground md:text-base">{t("homepage.subtitle")}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button asChild variant="hero" size="lg" className="w-full sm:w-auto">
            <Link to="/palm">{t("common.actions.scanPalm")}</Link>
          </Button>
          <Button asChild variant="mystic" size="lg" className="w-full sm:w-auto">
            <Link to="/kundali">{t("common.actions.createBirthChart")}</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full border-primary/40 text-primary hover:bg-primary/10 sm:w-auto"
          >
            <Link to="/kundali-matching">{t("common.actions.tryKundaliMatching")}</Link>
          </Button>
        </div>
      </div>
    ),
    [t],
  );

  if (loadingSession) {
    return (
      <main className="container min-w-0 py-16">
        <CosmicLoader variant="fullPage" size="large" label={t("common.loading.oracle")} />
      </main>
    );
  }

  return (
    <>
      <Helmet>
        <title>AstraPalm | AI Palm Reading, Astrology & Kundali Matching</title>
        <meta
          name="description"
          content="Scan your palm, generate your birth chart, run 36 guna Kundali matching and get daily horoscope — one AI-powered platform for practical, private guidance."
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "AstraPalm",
            url: "https://astrapalm.com",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://astrapalm.com/?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          })}
        </script>
      </Helmet>

      <MarketingHomepage
        conversionSection={conversionSection}
        isAdmin={isAdmin}
        onSignOut={signOut}
        onStartPalm={() => undefined}
        session={session}
      />
    </>
  );
};

export default Index;
