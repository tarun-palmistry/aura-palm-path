import { Link } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Camera,
  CheckCircle2,
  Compass,
  Lock,
  Menu,
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
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type MarketingHomepageProps = {
  conversionSection: ReactNode;
  isAdmin: boolean;
  onSignOut: () => void;
  onStartPalm: () => void;
  session: Session | null;
};

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "Palmistry", href: "#features" },
  { label: "Horoscope", href: "#services" },
  { label: "Daily Horoscope", href: "#daily-whatsapp" },
  { label: "Blog", href: "#blog" },
  { label: "FAQ", href: "#faq" },
];

const featureEntries = [
  {
    title: "Palmistry Reading",
    description:
      "Upload or scan your palm to get insights about your personality, relationships, and future direction.",
    cta: "Scan My Palm",
    icon: Camera,
  },
  {
    title: "Horoscope & Astrology",
    description:
      "Enter your birth details to generate your complete astrology profile and life insights.",
    cta: "Create Birth Chart",
    icon: MoonStar,
  },
  {
    title: "Daily Horoscope",
    description:
      "Get your daily zodiac guidance with lucky numbers, colors, and personalized advice.",
    cta: "View Horoscope",
    icon: Sun,
  },
];

const trustPoints = [
  {
    title: "Palmistry + Astrology in one place",
    detail: "One refined platform for AI palm reading, astrology birth chart insights, and daily zodiac guidance.",
    icon: Sparkles,
  },
  {
    title: "Structured analysis before interpretation",
    detail: "We process visible palm and chart signals first, then generate guidance for consistency and credibility.",
    icon: BarChart3,
  },
  {
    title: "Private report history",
    detail: "Your readings are account-linked and easy to revisit whenever you want to track your journey.",
    icon: ShieldCheck,
  },
  {
    title: "Fast and mobile-ready",
    detail: "From upload or camera capture to full reading in minutes, with a smooth flow across devices.",
    icon: Zap,
  },
  {
    title: "Built for returning members",
    detail: "Come back anytime to review saved reports and continue with fresh daily guidance.",
    icon: UserCheck,
  },
  {
    title: "Premium yet effortless",
    detail: "An elegant experience that feels premium while staying clear, calm, and easy to use.",
    icon: Compass,
  },
];

const testimonials = [
  {
    quote:
      "The palm reading flow felt effortless, and the report was beautifully structured. It gave me practical clarity on relationships and work decisions.",
    name: "Rhea M.",
    role: "Product Designer",
  },
  {
    quote:
      "I used both the birth chart and palmistry tools in one session. Everything felt private, polished, and genuinely trustworthy.",
    name: "Aarav K.",
    role: "Founder",
  },
  {
    quote:
      "Daily horoscope is now part of my morning routine. The guidance is concise, grounded, and easy to apply during the day.",
    name: "Naina S.",
    role: "Marketing Lead",
  },
];

const blogPosts = [
  {
    category: "Palmistry",
    title: "How Palm Reading Works From an Uploaded Image",
    excerpt:
      "See how a clear hand photo becomes structured palm data and a premium palmistry reading online in minutes.",
  },
  {
    category: "Astrology",
    title: "Birth Chart Basics: Sun, Moon, and Rising Signs",
    excerpt:
      "Understand the core pillars behind horoscope reading and astrology birth chart interpretation.",
  },
  {
    category: "Palm Insights",
    title: "Left Palm vs Right Palm in Palmistry",
    excerpt:
      "Learn what each hand may reveal in AI palm reading and how analysts interpret line differences.",
  },
  {
    category: "Daily Guidance",
    title: "Daily Horoscope: What Your Zodiac Energy Means Today",
    excerpt:
      "Turn your daily horoscope into clear, practical choices for relationships, focus, and personal momentum.",
  },
];

const faqs = [
  {
    question: "How does online palm reading work?",
    answer:
      "You upload or capture a clear palm image. We first extract visible line and shape features, then generate your report from that structured analysis.",
  },
  {
    question: "Can I upload a hand image from my phone?",
    answer:
      "Yes. You can upload a hand photo from your gallery or capture one live with your phone camera in a mobile-friendly flow.",
  },
  {
    question: "Do I need exact birth time for horoscope readings?",
    answer:
      "Exact birth time improves rising-sign precision. If you don’t have it, you can still receive meaningful horoscope guidance based on available details.",
  },
  {
    question: "Can I use both palmistry and horoscope features?",
    answer:
      "Absolutely. Many users combine palmistry and astrology to get a fuller view of personality, patterns, and timing.",
  },
  {
    question: "Are my palm images and birth details private?",
    answer:
      "Yes. Your data is private by default and scoped to your account, so your images, birth details, and reports stay protected.",
  },
  {
    question: "Can I receive daily horoscope notifications on WhatsApp?",
    answer:
      "Yes. You can subscribe to WhatsApp updates for daily zodiac guidance, lucky number, lucky color, and short spiritual advice.",
  },
  {
    question: "Will my reports be saved to my account?",
    answer:
      "Yes. Your palmistry and astrology reports are saved to your account so you can revisit them anytime.",
  },
];

export const MarketingHomepage = ({ conversionSection, isAdmin, onSignOut, onStartPalm, session }: MarketingHomepageProps) => {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <a href="#home" className="inline-flex items-center gap-2 rounded-md px-1 py-1 font-display text-lg font-semibold">
            <Stars className="h-5 w-5 text-primary" aria-hidden="true" />
            <span>AstraPalm</span>
          </a>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary navigation">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {session && (
              <Button asChild variant="mystic" size="sm">
                <Link to="/astrology">Astrology</Link>
              </Button>
            )}
            {isAdmin && (
              <Button asChild variant="mystic" size="sm">
                <Link to="/admin">Admin Panel</Link>
              </Button>
            )}
            {session && (
              <Button variant="mystic" size="sm" onClick={onSignOut}>
                Sign out
              </Button>
            )}
            <Button variant="hero" size="sm" onClick={onStartPalm}>
              Start Your Reading
            </Button>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="mystic" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="border-border bg-card/95">
              <nav className="mt-10 grid gap-2" aria-label="Mobile navigation">
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.label}>
                    <a href={link.href} className="rounded-md px-3 py-2 text-foreground hover:bg-accent/40">
                      {link.label}
                    </a>
                  </SheetClose>
                ))}
                <div className="mt-4 grid gap-2 border-t border-border/70 pt-4">
                  <SheetClose asChild>
                    <Button variant="hero" onClick={onStartPalm}>
                      Scan My Palm
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild variant="mystic">
                      <Link to="/astrology">Generate My Horoscope</Link>
                    </Button>
                  </SheetClose>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main id="home" className="pb-20">
        <section className="starlight-field border-b border-border/70">
          <div className="container grid gap-10 py-16 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div className="space-y-6">
              <p className="inline-flex rounded-full border border-border/80 bg-card/70 px-3 py-1 text-xs uppercase tracking-[0.24em] text-primary">
                Premium AI Guidance Platform
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] md:text-6xl">
                Unlock Your Future with Palmistry &amp; Astrology
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                Scan your palm or generate your birth chart to discover personalized insights into your love life, career,
                and future — all in one place.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button variant="hero" size="lg" onClick={onStartPalm}>
                  Scan My Palm
                </Button>
                <Button asChild variant="mystic" size="lg">
                  <Link to="/astrology">Get Horoscope Reading</Link>
                </Button>
                <Button asChild variant="link" className="text-primary">
                  <Link to="/astrology#daily">Get Daily Horoscope on WhatsApp</Link>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">Takes less than 60 seconds</p>

              <p className="text-sm text-muted-foreground">Private. Instant. Saved to your account.</p>
            </div>

            <div className="grid gap-4">
              <article className="mystic-glass rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Palmistry Preview</p>
                <h2 className="mt-2 text-2xl font-semibold">AI palm reading from image</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Structured palm features first, then personalized insight for relationships, career, and life direction.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md border border-border/70 bg-background/40 px-2 py-1">Life line: strong</span>
                  <span className="rounded-md border border-border/70 bg-background/40 px-2 py-1">Heart line: deep</span>
                  <span className="rounded-md border border-border/70 bg-background/40 px-2 py-1">Head line: clear</span>
                  <span className="rounded-md border border-border/70 bg-background/40 px-2 py-1">Palm shape: earth</span>
                </div>
              </article>

              <article className="mystic-glass rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Horoscope Preview</p>
                <h2 className="mt-2 text-2xl font-semibold">Personal astrology birth chart</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Zodiac sign, moon sign, rising sign, and chart patterns translated into premium practical guidance.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md border border-border/70 bg-background/40 px-2 py-1">Sun: Leo</span>
                  <span className="rounded-md border border-border/70 bg-background/40 px-2 py-1">Moon: Taurus</span>
                  <span className="rounded-md border border-border/70 bg-background/40 px-2 py-1">Rising: Libra</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-28 border-b border-border/70 py-16">
          <div className="container space-y-8">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Choose your starting point</p>
              <h2 className="text-3xl font-semibold md:text-4xl">Start With Palmistry, Horoscope, or Daily Guidance</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {featureEntries.map((entry) => (
                <article
                  key={entry.title}
                  className="mystic-glass rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-mystic"
                >
                  <entry.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 text-2xl font-semibold">{entry.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{entry.description}</p>
                  {entry.title === "Palmistry Reading" ? (
                    <Button className="mt-5" variant="hero" onClick={onStartPalm}>
                      {entry.cta}
                    </Button>
                  ) : entry.title === "Horoscope & Astrology" ? (
                    <Button asChild className="mt-5" variant="mystic">
                      <Link to="/astrology">{entry.cta}</Link>
                    </Button>
                  ) : (
                    <Button asChild className="mt-5" variant="mystic">
                      <Link to="/astrology#daily">{entry.cta}</Link>
                    </Button>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="auth-section" className="scroll-mt-28 border-b border-border/70 py-14">
          {conversionSection}
        </section>

        <section id="how-it-works" className="scroll-mt-28 border-b border-border/70 py-16">
          <div className="container space-y-8">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">How it works</p>
              <h2 className="text-3xl font-semibold md:text-4xl">Two Clear Paths, One Premium Experience</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="mystic-glass rounded-2xl p-6">
                <h3 className="text-2xl font-semibold">Palmistry Flow</h3>
                <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Upload className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    Upload or capture your palm image.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    AI extracts line and shape features into structured data.
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    Receive your full reading with personality, love, and future guidance.
                  </li>
                </ol>
              </article>

              <article className="mystic-glass rounded-2xl p-6">
                <h3 className="text-2xl font-semibold">Horoscope Flow</h3>
                <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <UserCheck className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    Enter your date, time, and place of birth.
                  </li>
                  <li className="flex items-start gap-2">
                    <MoonStar className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    Generate zodiac profile, moon/rising signals, and chart structure.
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    Unlock daily and long-form guidance for love, career, and yearly direction.
                  </li>
                </ol>
              </article>
            </div>
          </div>
        </section>

        <section id="services" className="scroll-mt-28 border-b border-border/70 py-16">
          <div className="container grid gap-4 lg:grid-cols-2">
            <article className="mystic-glass rounded-2xl p-7">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Palmistry pillar</p>
              <h2 className="mt-3 text-3xl font-semibold">Premium AI Palm Reading</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Explore life line clarity, heart line emotion patterns, head line decision style, and overall personality arc with palmistry
                reading online designed for practical reflection.
              </p>
              <Button className="mt-6" variant="hero" onClick={onStartPalm}>
                Explore Palmistry
              </Button>
            </article>

            <article className="mystic-glass rounded-2xl p-7">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Astrology pillar</p>
              <h2 className="mt-3 text-3xl font-semibold">Personal Horoscope &amp; Birth Chart</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Decode your zodiac sign, moon sign, rising sign, and chart tendencies to get focused guidance for love, career, finances,
                and yearly movement.
              </p>
              <Button asChild className="mt-6" variant="mystic">
                <Link to="/astrology">Explore Horoscope</Link>
              </Button>
            </article>
          </div>
        </section>

        <section id="trust" className="scroll-mt-28 border-b border-border/70 py-16">
          <div className="container space-y-8">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Why users trust this platform</p>
              <h2 className="text-3xl font-semibold md:text-4xl">Trusted for Clarity, Privacy, and Consistency</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {trustPoints.map((item) => (
                <article key={item.title} className="mystic-glass rounded-xl p-5">
                  <item.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-3 text-xl font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="daily-whatsapp" className="scroll-mt-28 border-b border-border/70 py-16">
          <div className="container">
            <article className="mystic-glass rounded-3xl p-8 md:p-10">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Daily conversion offer</p>
              <h2 className="mt-3 text-3xl font-semibold md:text-4xl">Get Your Daily Horoscope on WhatsApp</h2>
              <p className="mt-3 max-w-3xl text-sm text-muted-foreground md:text-base">
                Receive your daily zodiac insights, lucky numbers, and guidance directly on WhatsApp.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild variant="hero">
                  <Link to="/astrology#daily">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Join WhatsApp Updates
                  </Link>
                </Button>
                <Button asChild variant="mystic">
                  <Link to="/astrology#daily">View Daily Horoscope</Link>
                </Button>
              </div>
            </article>
          </div>
        </section>

        <section id="reviews" className="scroll-mt-28 border-b border-border/70 py-16">
          <div className="container space-y-8">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Social proof</p>
              <h2 className="text-3xl font-semibold md:text-4xl">Loved by Users Seeking Meaningful Guidance</h2>
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
                <p className="text-sm text-muted-foreground">Readings generated</p>
              </article>
              <article className="mystic-glass rounded-lg p-4">
                <p className="text-2xl font-semibold">8,700+</p>
                <p className="text-sm text-muted-foreground">Returning users</p>
              </article>
              <article className="mystic-glass rounded-lg p-4">
                <p className="text-2xl font-semibold">3,200+</p>
                <p className="text-sm text-muted-foreground">Daily horoscope subscribers</p>
              </article>
            </div>
          </div>
        </section>

        <section id="blog" className="scroll-mt-28 border-b border-border/70 py-16">
          <div className="container space-y-8">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">SEO blog preview</p>
              <h2 className="text-3xl font-semibold md:text-4xl">Explore Practical Guides on Palmistry and Astrology</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {blogPosts.map((post) => (
                <article key={post.title} className="mystic-glass overflow-hidden rounded-xl">
                  <div
                    className="h-36 bg-gradient-to-br from-primary/20 via-accent/25 to-secondary/30"
                    role="img"
                    aria-label={`Featured visual for ${post.title}`}
                  />
                  <div className="space-y-3 p-5">
                    <p className="text-xs uppercase tracking-[0.15em] text-primary">{post.category}</p>
                    <h3 className="text-xl font-semibold leading-tight">{post.title}</h3>
                    <p className="text-sm text-muted-foreground">{post.excerpt}</p>
                    <a href="#" className="inline-flex text-sm text-primary hover:underline">
                      Read More
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-28 border-b border-border/70 py-16">
          <div className="container grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">FAQ</p>
              <h2 className="text-3xl font-semibold md:text-4xl">Clear Answers Before You Begin</h2>
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

        <section id="final-cta" className="py-16">
          <div className="container">
            <article className="mystic-glass rounded-3xl p-8 text-center md:p-12">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Final invitation</p>
              <h2 className="mt-3 text-3xl font-semibold md:text-5xl">Begin Your Reading Today</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
                Choose palmistry, horoscope, or daily guidance and discover a more personal way to explore your path.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button variant="hero" size="lg" onClick={onStartPalm}>
                  Scan My Palm
                </Button>
                <Button asChild variant="mystic" size="lg">
                  <Link to="/astrology">Generate My Horoscope</Link>
                </Button>
              </div>
            </article>
          </div>
        </section>

        <section aria-label="SEO summary" className="pb-8">
          <div className="container">
            <article className="mystic-glass rounded-2xl p-6">
              <h2 className="text-2xl font-semibold">Palmistry and Astrology, Together in One Platform</h2>
              <p className="mt-3 text-sm text-muted-foreground md:text-base">
                Our platform combines AI palm reading and astrology insights to deliver personalized guidance. Upload your palm
                image or generate your birth chart to explore insights about love, career, and life direction. Get daily
                horoscope updates and stay aligned with your zodiac energy.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 py-10">
        <div className="container grid gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <p className="inline-flex items-center gap-2 font-display text-xl font-semibold">
              <Stars className="h-5 w-5 text-primary" aria-hidden="true" /> AstraPalm
            </p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Premium AI palmistry and astrology guidance for users who want clarity, privacy, and meaningful daily direction.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">© {new Date().getFullYear()} AstraPalm. All rights reserved.</p>
          </div>

          <nav className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-muted-foreground" aria-label="Footer navigation">
            <a href="#features" className="hover:text-foreground">Palmistry</a>
            <a href="#services" className="hover:text-foreground">Horoscope</a>
            <a href="#daily-whatsapp" className="hover:text-foreground">Daily Horoscope</a>
            <a href="#blog" className="hover:text-foreground">Blog</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
            <a href="#" className="hover:text-foreground">Privacy Policy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Social</a>
          </nav>
        </div>
      </footer>
    </>
  );
};