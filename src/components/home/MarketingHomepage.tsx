import { Link } from "react-router-dom";
import {
  BarChart3,
  Camera,
  CheckCircle2,
  Compass,
  Heart,
  MessageCircle,
  MoonStar,
  ShieldCheck,
  Sparkles,
  Stars,
  Sun,
  TrendingUp,
  Upload,
  UserCheck,
  Zap,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { memo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackEvent } from "@/lib/analytics";

type MarketingHomepageProps = {
  conversionSection: ReactNode;
  isAdmin: boolean;
  onSignOut: () => void;
  onStartPalm: () => void;
  session: Session | null;
};

type NavLinkItem = { label: string; href: string };
type CopyItem = { title: string; detail: string };
type TestimonialItem = { quote: string; name: string; role: string };
type BlogItem = { category: string; title: string; excerpt: string };
type FaqItem = { question: string; answer: string };

function MarketingHomepageComponent({ conversionSection, isAdmin, onSignOut, onStartPalm, session }: MarketingHomepageProps) {
  const { t, tm } = useLanguage();

  const handleHeroCta = (cta: string, callback?: () => void) => {
    void trackEvent({
      eventName: "hero_cta_click",
      userId: session?.user.id,
      metadata: { cta },
    });
    callback?.();
  };

  const handleWhatsappCta = () => {
    void trackEvent({
      eventName: "whatsapp_signup_click",
      userId: session?.user.id,
      metadata: { placement: "homepage_whatsapp" },
    });
  };

  const navLinks = tm<NavLinkItem[]>("homepage.navLinks");
  const trustPoints = tm<CopyItem[]>("homepage.trust.items");
  const testimonials = tm<TestimonialItem[]>("homepage.reviews.items");
  const blogPosts = tm<BlogItem[]>("homepage.blog.posts");
  const faqs = tm<FaqItem[]>("homepage.faq.items");
  const palmChips = tm<string[]>("homepage.heroCards.palm.chips");
  const horoscopeChips = tm<string[]>("homepage.heroCards.horoscope.chips");
  const kundaliChips = tm<string[]>("homepage.heroCards.kundali.chips");

  const trustIcons = [Sparkles, BarChart3, ShieldCheck, Zap, UserCheck, Compass];

  return (
    <>
      <main id="home" className="min-w-0 pb-16 sm:pb-20">
        <section className="starlight-field border-b border-border/70">
          <div className="container grid gap-8 py-12 sm:gap-10 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div className="min-w-0 space-y-5 sm:space-y-6">
              <p className="inline-flex rounded-full border border-border/80 bg-card/70 px-3 py-1 text-xs uppercase tracking-[0.24em] text-primary">
                {t("homepage.badge")}
              </p>
              <h1 className="max-w-3xl text-3xl font-semibold leading-[1.1] sm:text-4xl md:text-5xl md:leading-[1.08] lg:text-6xl">
                {t("homepage.title")}
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">{t("homepage.subtitle")}</p>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild variant="hero" size="lg" className="w-full sm:w-auto">
                  <Link to="/palm" onClick={() => handleHeroCta("hero_scan_palm")}>{t("common.actions.scanPalm")}</Link>
                </Button>
                <Button asChild variant="mystic" size="lg" className="w-full sm:w-auto">
                  <Link to="/kundali" onClick={() => handleHeroCta("hero_kundali")}>{t("common.actions.getHoroscopeReading")}</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full border-primary/40 text-primary hover:bg-primary/10 sm:w-auto"
                >
                  <Link to="/kundali-matching" onClick={() => handleHeroCta("hero_kundali_matching")}>{t("common.actions.tryKundaliMatching")}</Link>
                </Button>
                <Button asChild variant="link" className="text-primary sm:w-auto">
                  <Link to="/horoscope">{t("homepage.dailyWhatsappLink")}</Link>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">{t("homepage.quickLine")}</p>
              <p className="text-sm text-muted-foreground">{t("homepage.trustLine")}</p>
            </div>

            <div className="grid gap-4">
              <article className="mystic-glass rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("homepage.heroCards.palm.label")}</p>
                <h2 className="mt-2 text-2xl font-semibold font-display tracking-tight">{t("homepage.heroCards.palm.title")}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t("homepage.heroCards.palm.description")}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {palmChips.map((chip) => (
                    <span key={chip} className="rounded-md border border-border/70 bg-background/40 px-2 py-1">
                      {chip}
                    </span>
                  ))}
                </div>
              </article>

              <article className="mystic-glass rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("homepage.heroCards.horoscope.label")}</p>
                <h2 className="mt-2 text-2xl font-semibold font-display tracking-tight">{t("homepage.heroCards.horoscope.title")}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t("homepage.heroCards.horoscope.description")}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {horoscopeChips.map((chip) => (
                    <span key={chip} className="rounded-md border border-border/70 bg-background/40 px-2 py-1">
                      {chip}
                    </span>
                  ))}
                </div>
              </article>

              <article className="mystic-glass rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("homepage.heroCards.kundali.label")}</p>
                <h2 className="mt-2 text-2xl font-semibold font-display tracking-tight">{t("homepage.heroCards.kundali.title")}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t("homepage.heroCards.kundali.description")}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {kundaliChips.map((chip) => (
                    <span key={chip} className="rounded-md border border-border/70 bg-background/40 px-2 py-1">
                      {chip}
                    </span>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-anchor border-b border-border/70 py-12 sm:py-16">
          <div className="container space-y-8">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("homepage.featureSection.label")}</p>
              <h2 className="text-3xl font-semibold font-display tracking-tight md:text-4xl">{t("homepage.featureSection.title")}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="mystic-glass rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-mystic">
                <Camera className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="mt-4 text-2xl font-semibold">{t("homepage.featureSection.cards.palm.title")}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t("homepage.featureSection.cards.palm.description")}</p>
                <Button className="mt-5" variant="hero" onClick={() => handleHeroCta("feature_palm_card", onStartPalm)}>
                  {t("homepage.featureSection.cards.palm.cta")}
                </Button>
              </article>

              <article className="mystic-glass rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-mystic">
                <MoonStar className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="mt-4 text-2xl font-semibold">{t("homepage.featureSection.cards.astro.title")}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t("homepage.featureSection.cards.astro.description")}</p>
                <Button asChild className="mt-5" variant="mystic">
                  <Link to="/kundali">{t("homepage.featureSection.cards.astro.cta")}</Link>
                </Button>
              </article>

              <article className="mystic-glass rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-mystic">
                <Sun className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="mt-4 text-2xl font-semibold">{t("homepage.featureSection.cards.daily.title")}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t("homepage.featureSection.cards.daily.description")}</p>
                <Button asChild className="mt-5" variant="mystic">
                  <Link to="/horoscope">{t("homepage.featureSection.cards.daily.cta")}</Link>
                </Button>
              </article>

              <article className="mystic-glass rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-mystic">
                <Heart className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="mt-4 text-2xl font-semibold">{t("homepage.featureSection.cards.kundali.title")}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t("homepage.featureSection.cards.kundali.description")}</p>
                <Button asChild className="mt-5" variant="mystic">
                  <Link to="/kundali-matching" onClick={() => handleHeroCta("feature_kundali_card")}>{t("homepage.featureSection.cards.kundali.cta")}</Link>
                </Button>
              </article>
            </div>
          </div>
        </section>

        <section id="auth-section" className="scroll-anchor border-b border-border/70 py-12 sm:py-14">
          {conversionSection}
        </section>

        <section id="how-it-works" className="scroll-anchor border-b border-border/70 py-12 sm:py-16">
          <div className="container space-y-8">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("homepage.howItWorks.label")}</p>
              <h2 className="text-3xl font-semibold font-display tracking-tight md:text-4xl">{t("homepage.howItWorks.title")}</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <article className="mystic-glass rounded-2xl p-6">
                <h3 className="text-2xl font-semibold">{t("homepage.howItWorks.palmTitle")}</h3>
                <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Upload className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    {t("homepage.howItWorks.palmSteps.0")}
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    {t("homepage.howItWorks.palmSteps.1")}
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    {t("homepage.howItWorks.palmSteps.2")}
                  </li>
                </ol>
              </article>

              <article className="mystic-glass rounded-2xl p-6">
                <h3 className="text-2xl font-semibold">{t("homepage.howItWorks.astroTitle")}</h3>
                <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <UserCheck className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    {t("homepage.howItWorks.astroSteps.0")}
                  </li>
                  <li className="flex items-start gap-2">
                    <MoonStar className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    {t("homepage.howItWorks.astroSteps.1")}
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    {t("homepage.howItWorks.astroSteps.2")}
                  </li>
                </ol>
              </article>

              <article className="mystic-glass rounded-2xl p-6">
                <h3 className="text-2xl font-semibold">{t("homepage.howItWorks.kundaliTitle")}</h3>
                <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <UserCheck className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    {t("homepage.howItWorks.kundaliSteps.0")}
                  </li>
                  <li className="flex items-start gap-2">
                    <Heart className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    {t("homepage.howItWorks.kundaliSteps.1")}
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    {t("homepage.howItWorks.kundaliSteps.2")}
                  </li>
                </ol>
              </article>
            </div>
          </div>
        </section>

        <section id="services" className="scroll-anchor border-b border-border/70 py-12 sm:py-16">
          <div className="container grid gap-4 lg:grid-cols-3">
            <article className="mystic-glass rounded-2xl p-7">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("homepage.services.palmLabel")}</p>
              <h2 className="mt-3 text-3xl font-semibold font-display tracking-tight">{t("homepage.services.palmTitle")}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{t("homepage.services.palmDescription")}</p>
              <Button className="mt-6" variant="hero" onClick={() => handleHeroCta("services_palm", onStartPalm)}>
                {t("homepage.services.palmCta")}
              </Button>
            </article>

            <article className="mystic-glass rounded-2xl p-7">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("homepage.services.astroLabel")}</p>
              <h2 className="mt-3 text-3xl font-semibold font-display tracking-tight">{t("homepage.services.astroTitle")}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{t("homepage.services.astroDescription")}</p>
              <Button asChild className="mt-6" variant="mystic">
                <Link to="/kundali">{t("homepage.services.astroCta")}</Link>
              </Button>
            </article>

            <article className="mystic-glass rounded-2xl p-7">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("homepage.services.kundaliLabel")}</p>
              <h2 className="mt-3 text-3xl font-semibold font-display tracking-tight">{t("homepage.services.kundaliTitle")}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{t("homepage.services.kundaliDescription")}</p>
              <Button asChild className="mt-6" variant="mystic">
                <Link to="/kundali-matching" onClick={() => handleHeroCta("services_kundali")}>{t("homepage.services.kundaliCta")}</Link>
              </Button>
            </article>
          </div>
        </section>

        <section id="trust" className="scroll-anchor border-b border-border/70 py-12 sm:py-16">
          <div className="container space-y-8">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("homepage.trust.label")}</p>
              <h2 className="text-3xl font-semibold font-display tracking-tight md:text-4xl">{t("homepage.trust.title")}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {trustPoints.map((item, index) => {
                const Icon = trustIcons[index] ?? Sparkles;
                return (
                  <article key={item.title} className="mystic-glass rounded-xl p-5">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h3 className="mt-3 text-xl font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="daily-whatsapp" className="scroll-anchor border-b border-border/70 py-12 sm:py-16">
          <div className="container">
            <article className="mystic-glass rounded-3xl p-5 sm:p-8 md:p-10">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("homepage.whatsapp.label")}</p>
              <h2 className="mt-3 text-3xl font-semibold font-display tracking-tight md:text-4xl">{t("homepage.whatsapp.title")}</h2>
              <p className="mt-3 max-w-3xl text-sm text-muted-foreground md:text-base">{t("homepage.whatsapp.description")}</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild variant="hero" className="w-full sm:w-auto">
                  <Link to="/horoscope" onClick={handleWhatsappCta}>
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    {t("common.actions.joinWhatsappUpdates")}
                  </Link>
                </Button>
                <Button asChild variant="mystic" className="w-full sm:w-auto">
                  <Link to="/horoscope">{t("common.actions.viewDailyHoroscope")}</Link>
                </Button>
              </div>
            </article>
          </div>
        </section>

        <section id="reviews" className="scroll-anchor border-b border-border/70 py-12 sm:py-16">
          <div className="container space-y-8">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("homepage.reviews.label")}</p>
              <h2 className="text-3xl font-semibold font-display tracking-tight md:text-4xl">{t("homepage.reviews.title")}</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {testimonials.map((item) => (
                <article key={item.name} className="mystic-glass rounded-xl p-6">
                  <p className="text-sm text-muted-foreground">“{item.quote}”</p>
                  <p className="mt-4 text-base font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.role}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <article className="mystic-glass rounded-lg p-4">
                <p className="text-2xl font-semibold">26,400+</p>
                <p className="text-sm text-muted-foreground">{t("homepage.reviews.stats.generated")}</p>
              </article>
              <article className="mystic-glass rounded-lg p-4">
                <p className="text-2xl font-semibold">8,700+</p>
                <p className="text-sm text-muted-foreground">{t("homepage.reviews.stats.returning")}</p>
              </article>
              <article className="mystic-glass rounded-lg p-4">
                <p className="text-2xl font-semibold">3,200+</p>
                <p className="text-sm text-muted-foreground">{t("homepage.reviews.stats.subscribers")}</p>
              </article>
            </div>
          </div>
        </section>

        <section id="blog" className="scroll-anchor border-b border-border/70 py-12 sm:py-16">
          <div className="container space-y-8">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("homepage.blog.label")}</p>
              <h2 className="text-3xl font-semibold font-display tracking-tight md:text-4xl">{t("homepage.blog.title")}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {blogPosts.map((post) => (
                <article key={post.title} className="mystic-glass overflow-hidden rounded-xl">
                  <div className="h-36 bg-gradient-to-br from-primary/20 via-accent/25 to-secondary/30" role="img" aria-label={`Featured visual for ${post.title}`} />
                  <div className="space-y-3 p-5">
                    <p className="text-xs uppercase tracking-[0.15em] text-primary">{post.category}</p>
                    <h3 className="text-xl font-semibold leading-tight">{post.title}</h3>
                    <p className="text-sm text-muted-foreground">{post.excerpt}</p>
                    <a href="#" className="inline-flex text-sm text-primary hover:underline">
                      {t("common.actions.readMore")}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-anchor border-b border-border/70 py-12 sm:py-16">
          <div className="container grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("homepage.faq.label")}</p>
              <h2 className="text-3xl font-semibold font-display tracking-tight md:text-4xl">{t("homepage.faq.title")}</h2>
            </div>
            <div className="mystic-glass rounded-2xl p-6">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((item) => (
                  <AccordionItem key={item.question} value={item.question}>
                    <AccordionTrigger className="text-left text-base">{item.question}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        <section id="final-cta" className="py-12 sm:py-16">
          <div className="container">
            <article className="mystic-glass rounded-3xl p-6 text-center sm:p-8 md:p-12">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">{t("homepage.finalCta.label")}</p>
              <h2 className="mt-3 text-3xl font-semibold font-display tracking-tight md:text-5xl">{t("homepage.finalCta.title")}</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">{t("homepage.finalCta.description")}</p>
              <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button variant="hero" size="lg" className="w-full sm:w-auto" onClick={onStartPalm}>
                  {t("common.actions.scanPalm")}
                </Button>
                <Button asChild variant="mystic" size="lg" className="w-full sm:w-auto">
                  <Link to="/kundali">{t("common.actions.generateHoroscope")}</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full border-primary/40 text-primary hover:bg-primary/10 sm:w-auto"
                >
                  <Link to="/kundali-matching" onClick={() => handleHeroCta("final_cta_kundali")}>{t("common.actions.tryKundaliMatching")}</Link>
                </Button>
              </div>
            </article>
          </div>
        </section>

        <section aria-label="SEO summary" className="pb-8">
          <div className="container">
            <article className="mystic-glass rounded-2xl p-6">
              <h2 className="text-2xl font-semibold font-display tracking-tight">{t("homepage.seo.title")}</h2>
              <p className="mt-3 text-sm text-muted-foreground md:text-base">{t("homepage.seo.description")}</p>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}

export const MarketingHomepage = memo(MarketingHomepageComponent);
