import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type TrustSection = {
  title: string;
  body: string[];
};

type TrustPageLayoutProps = {
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdated: string;
  sections: TrustSection[];
};

export const TrustPageLayout = ({ eyebrow, title, intro, lastUpdated, sections }: TrustPageLayoutProps) => {
  return (
    <main className="container flex min-h-0 min-w-0 flex-1 flex-col pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] py-10 md:py-14">
      <article className="mystic-glass min-w-0 rounded-3xl p-5 sm:p-6 md:p-10">
        <div className="flex flex-col gap-3 border-b border-border/70 pb-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <Button asChild variant="mystic" size="sm" className="w-full sm:w-auto">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>

        <header className="mt-6 space-y-3">
          <h1 className="text-3xl font-semibold md:text-5xl">{title}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground md:text-base">{intro}</p>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Last updated: {lastUpdated}</p>
        </header>

        <div className="mt-8 space-y-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-border/70 bg-card/50 p-5 md:p-6">
              <h2 className="text-2xl font-semibold">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <nav className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 md:grid-cols-4" aria-label="Trust pages">
          <Link to="/privacy" className="rounded-md px-2 py-1 hover:bg-accent/20 hover:text-foreground">Privacy Policy</Link>
          <Link to="/terms" className="rounded-md px-2 py-1 hover:bg-accent/20 hover:text-foreground">Terms of Service</Link>
          <Link to="/contact" className="rounded-md px-2 py-1 hover:bg-accent/20 hover:text-foreground">Contact</Link>
          <Link to="/guidance-disclaimer" className="rounded-md px-2 py-1 hover:bg-accent/20 hover:text-foreground">Guidance Disclaimer</Link>
        </nav>
      </article>
    </main>
  );
};