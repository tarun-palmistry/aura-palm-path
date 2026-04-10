import { Link, useLocation } from "react-router-dom";
import { Stars } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

function normalizeHref(pathname: string, href: string) {
  if (href.startsWith("#")) {
    return pathname === "/" ? href : `/${href}`;
  }
  return href;
}

export function SiteFooter() {
  const { t } = useLanguage();
  const { pathname } = useLocation();

  return (
    <footer className="border-t border-border/70 py-10">
      <div className="container grid gap-8 md:grid-cols-[1fr_auto]">
        <div>
          <p className="inline-flex items-center gap-2 font-display text-xl font-semibold">
            <Stars className="h-5 w-5 text-primary" aria-hidden="true" /> {t("common.brand")}
          </p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("homepage.footer.description")}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            © {new Date().getFullYear()} {t("common.brand")}. {t("homepage.footer.rights")}
          </p>
        </div>

        <nav className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-muted-foreground md:grid-cols-3" aria-label="Footer navigation">
          <a href={normalizeHref(pathname, "#features")} className="hover:text-foreground">
            {t("homepage.footer.links.palmistry")}
          </a>
          <a href={normalizeHref(pathname, "#services")} className="hover:text-foreground">
            {t("homepage.footer.links.horoscope")}
          </a>
          <Link to="/kundali-matching" className="hover:text-foreground">
            {t("homepage.footer.links.kundali")}
          </Link>
          <a href={normalizeHref(pathname, "#daily-whatsapp")} className="hover:text-foreground">
            {t("homepage.footer.links.daily")}
          </a>
          <a href={normalizeHref(pathname, "#blog")} className="hover:text-foreground">
            {t("homepage.footer.links.blog")}
          </a>
          <a href={normalizeHref(pathname, "#faq")} className="hover:text-foreground">
            {t("homepage.footer.links.faq")}
          </a>
          <Link to="/privacy" className="hover:text-foreground">
            {t("homepage.footer.links.privacy")}
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            {t("homepage.footer.links.terms")}
          </Link>
          <Link to="/contact" className="hover:text-foreground">
            {t("homepage.footer.links.contact")}
          </Link>
          <Link to="/guidance-disclaimer" className="hover:text-foreground">
            {t("homepage.footer.links.disclaimer")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}

