import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/ThemeToggle";

type NavLinkItem = { label: string; href: string };

function normalizeHref(pathname: string, href: string) {
  if (href.startsWith("#")) {
    return pathname === "/" ? href : `/${href}`;
  }
  return href;
}

function isActivePath(pathname: string, href: string) {
  if (href.startsWith("#")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const { t, tm } = useLanguage();
  const { pathname } = useLocation();

  const navLinks = tm<NavLinkItem[]>("homepage.navLinks");

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl dark:bg-background/80">
      <div className="container flex h-16 min-h-16 items-center gap-2 sm:gap-4">
        <Link
          to="/"
          className="inline-flex min-w-0 shrink items-center gap-1.5 rounded-md px-1 py-1 font-display text-base font-semibold sm:gap-2 sm:text-lg"
        >
          <img src="/favicon.svg" alt={t("common.brand")} className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
          <span className="truncate">{t("common.brand")}</span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-4 lg:flex xl:gap-5" aria-label="Primary navigation">
          {navLinks.map((link) => {
            const to = normalizeHref(pathname, link.href);
            const active = isActivePath(pathname, link.href);
            const classes = active
              ? "rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[13px] text-foreground"
              : "rounded-full px-2.5 py-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground";

            return link.href.startsWith("#") ? (
              <a key={link.label} href={to} className={classes}>
                {link.label}
              </a>
            ) : (
              <Link key={link.label} to={to} className={classes}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <div className="hidden items-center gap-2 lg:flex">
            <Button asChild variant="mystic" size="sm">
              <Link to="/kundali">{t("common.actions.generateHoroscope")}</Link>
            </Button>
            <Button asChild variant="hero" size="sm">
              <Link to="/palm">{t("common.actions.startReading")}</Link>
            </Button>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="mystic" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="border-border bg-card/95">
              <nav className="mt-10 grid gap-2" aria-label="Mobile navigation">
                {navLinks.map((link) => {
                  const to = normalizeHref(pathname, link.href);
                  return (
                    <SheetClose asChild key={link.label}>
                      {link.href.startsWith("#") ? (
                        <a href={to} className="rounded-md px-3 py-2 text-foreground hover:bg-accent/40">
                          {link.label}
                        </a>
                      ) : (
                        <Link to={to} className="rounded-md px-3 py-2 text-foreground hover:bg-accent/40">
                          {link.label}
                        </Link>
                      )}
                    </SheetClose>
                  );
                })}

                <div className="mt-4 grid gap-2 border-t border-border/70 pt-4">
                  <SheetClose asChild>
                    <Button asChild variant="hero">
                      <Link to="/palm">{t("common.actions.startReading")}</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild variant="mystic">
                      <Link to="/kundali">{t("common.actions.generateHoroscope")}</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="border-primary/40 text-primary">
                      <Link to="/kundali-matching">{t("common.actions.tryKundaliMatching")}</Link>
                    </Button>
                  </SheetClose>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

