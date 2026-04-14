import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { RouteFallback } from "@/components/RouteFallback";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { LanguageSwitchFX } from "@/components/LanguageSwitchFX";
import { CosmicBackgroundFX } from "@/components/CosmicBackgroundFX";
import { ThemeColorMeta } from "@/components/ThemeColorMeta";

const Index = lazy(() => import("./pages/Index.tsx"));
const PalmReading = lazy(() => import("./pages/PalmReading.tsx"));
const Kundali = lazy(() => import("./pages/Kundali.tsx"));
const Horoscope = lazy(() => import("./pages/Horoscope.tsx"));
const KundaliMatching = lazy(() => import("./pages/KundaliMatching.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.tsx"));
const TermsOfService = lazy(() => import("./pages/TermsOfService.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const GuidanceDisclaimer = lazy(() => import("./pages/GuidanceDisclaimer.tsx"));
const DevAstroLab = lazy(() => import("./pages/DevAstroLab.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <HelmetProvider>
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ThemeColorMeta />
            <CosmicBackgroundFX />
            <LanguageSwitcher />
            <LanguageSwitchFX />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route element={<SiteLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/palm" element={<PalmReading />} />
                  <Route path="/kundali" element={<Kundali />} />
                  <Route path="/horoscope" element={<Horoscope />} />
                  <Route path="/kundali-matching" element={<KundaliMatching />} />
                  <Route path="/astrology" element={<Navigate to="/kundali" replace />} />
                  <Route path="/kundali-match" element={<Navigate to="/kundali-matching" replace />} />
                  <Route path="/kundali-milan" element={<Navigate to="/kundali-matching" replace />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/guidance-disclaimer" element={<GuidanceDisclaimer />} />
                  {import.meta.env.DEV && <Route path="/dev/astro-lab" element={<DevAstroLab />} />}
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </LanguageProvider>
  </HelmetProvider>
);

export default App;
